import amqp from 'amqplib';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { escapeHtml } from '../utils/html';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE = 'quotes';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  reviewed: 'En revisión',
  quoted: 'Cotizada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP no configurado — los emails no se enviarán');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const transporter = createTransporter();

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.warn(`Email no enviado (SMTP no configurado): ${subject} → ${to}`);
    return;
  }

  await transporter.sendMail({
    from: `"United Mudanzas" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

async function handleQuoteCreated(data: { quoteId: string; clientEmail: string; clientName: string }) {
  const clientName = escapeHtml(data.clientName);

  // Confirmación al cliente
  await sendEmail(
    data.clientEmail,
    'Tu cotización fue recibida — United Mudanzas',
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">¡Hola ${clientName}!</h2>
      <p>Hemos recibido tu solicitud de cotización de mudanza.</p>
      <p>Nuestro equipo la revisará y te contactaremos a la brevedad con un presupuesto.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">United Mudanzas — Este es un mensaje automático.</p>
    </div>`
  );

  // Aviso al equipo: sin esto las cotizaciones quedan esperando a que
  // alguien abra el panel
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail(
      adminEmail,
      `Nueva cotización de ${data.clientName}`,
      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Nueva cotización recibida</h2>
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.clientEmail)}</p>
        <p>Revísala en el panel de administración:</p>
        <p><a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:5173'}/admin/quotes/${escapeHtml(data.quoteId)}"
              style="color: #0ea5e9;">Ver cotización</a></p>
      </div>`
    );
  } else {
    console.warn('ADMIN_EMAIL no configurado — no se avisa al equipo de la nueva cotización');
  }
}

function handleStatusChanged(data: { clientEmail: string; clientName: string; oldStatus: string; newStatus: string }) {
  const statusLabel = escapeHtml(STATUS_LABELS[data.newStatus] || data.newStatus);
  const clientName = escapeHtml(data.clientName);

  return sendEmail(
    data.clientEmail,
    `Actualización de tu cotización — ${statusLabel}`,
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Hola ${clientName}</h2>
      <p>El estado de tu cotización ha sido actualizado a: <strong>${statusLabel}</strong></p>
      ${data.newStatus === 'quoted' ? '<p>Pronto recibirás el detalle del presupuesto.</p>' : ''}
      ${data.newStatus === 'confirmed' ? '<p>¡Tu mudanza está confirmada! Nos pondremos en contacto para coordinar los detalles.</p>' : ''}
      ${data.newStatus === 'cancelled' ? '<p>Si tienes alguna consulta, no dudes en contactarnos.</p>' : ''}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">United Mudanzas — Este es un mensaje automático.</p>
    </div>`
  );
}

function handlePriceSet(data: { clientEmail: string; clientName: string; estimatedPrice: number }) {
  const formattedPrice = escapeHtml(new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(data.estimatedPrice));
  const clientName = escapeHtml(data.clientName);

  return sendEmail(
    data.clientEmail,
    'Presupuesto de tu mudanza — United Mudanzas',
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Hola ${clientName}</h2>
      <p>Hemos estimado el costo de tu mudanza:</p>
      <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
        <p style="font-size: 28px; font-weight: bold; color: #0ea5e9; margin: 0;">${formattedPrice}</p>
        <p style="color: #64748b; margin: 4px 0 0;">Precio estimado</p>
      </div>
      <p>Si tienes dudas o deseas confirmar, responde a este correo o contáctanos directamente.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">United Mudanzas — Este es un mensaje automático.</p>
    </div>`
  );
}

async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    const q = await channel.assertQueue('email_worker', { durable: true });

    await channel.bindQueue(q.queue, EXCHANGE, 'quote.created');
    await channel.bindQueue(q.queue, EXCHANGE, 'quote.status_changed');
    await channel.bindQueue(q.queue, EXCHANGE, 'quote.price_set');

    // Procesar un mensaje a la vez
    channel.prefetch(1);

    console.log('Email Worker escuchando eventos...');

    channel.consume(q.queue, async (msg) => {
      if (!msg) return;

      const event = msg.fields.routingKey;
      let data: any;

      try {
        data = JSON.parse(msg.content.toString());
      } catch {
        console.error('Email Worker: mensaje con formato inválido, descartando');
        channel.ack(msg);
        return;
      }

      try {
        if (event === 'quote.created') {
          await handleQuoteCreated(data);
        } else if (event === 'quote.status_changed') {
          await handleStatusChanged(data);
        } else if (event === 'quote.price_set') {
          await handlePriceSet(data);
        }

        channel.ack(msg);
      } catch (err) {
        console.error(`Error procesando ${event}:`, (err as Error).message);

        // Reintentar hasta 3 veces, luego descartar
        const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) as number;
        if (retryCount < MAX_RETRIES) {
          // Reencolar con contador incrementado
          channel.ack(msg);
          channel.publish(EXCHANGE, event, msg.content, {
            persistent: true,
            headers: { 'x-retry-count': retryCount + 1 },
          });
        } else {
          console.error(`Máximo de reintentos alcanzado para ${event}, descartando mensaje`);
          channel.ack(msg);
        }
      }
    });

    conn.on('close', () => {
      console.warn('Email Worker: conexión cerrada, reconectando...');
      setTimeout(() => connectWithRetry(1), RETRY_DELAY_MS);
    });

    conn.on('error', (err) => {
      console.error('Email Worker error:', err.message);
    });

  } catch (err) {
    console.error(`Email Worker: intento ${attempt} fallido:`, (err as Error).message);
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * attempt;
      console.log(`Reintentando en ${delay / 1000}s...`);
      setTimeout(() => connectWithRetry(attempt + 1), delay);
    } else {
      console.error('Email Worker: no se pudo conectar después de múltiples intentos');
      process.exit(1);
    }
  }
}

connectWithRetry();
