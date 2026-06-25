import { Router, Request, Response } from 'express';
import { withRole } from '../db/client';
import { publishEvent } from '../messaging/publisher';
import { validateQuotePayload } from '../validation/quote';

const router = Router();

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** Error con HTTP status code para propagar desde withRole */
class RequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** Verifica el token reCAPTCHA con Google */
async function verifyCaptcha(token: string): Promise<boolean> {
  if (!RECAPTCHA_SECRET) {
    // En producción nunca se omite el CAPTCHA: si falta el secreto, se rechaza.
    if (IS_PRODUCTION) {
      console.error('RECAPTCHA_SECRET_KEY no configurada en producción — se rechaza la solicitud');
      return false;
    }
    console.warn('RECAPTCHA_SECRET_KEY no configurada (modo desarrollo) — se omite verificación de CAPTCHA');
    return true;
  }

  try {
    const params = new URLSearchParams({
      secret: RECAPTCHA_SECRET,
      response: token,
    });

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const result = (await res.json()) as { success?: boolean };
    return result.success === true;
  } catch (err) {
    console.error('Error verificando CAPTCHA:', (err as Error).message);
    return false;
  }
}

// POST /quotes — crear cotización con ítems
router.post('/', async (req: Request, res: Response) => {
  // --- CAPTCHA ---
  const { captcha_token } = req.body ?? {};
  if (!captcha_token || typeof captcha_token !== 'string') {
    res.status(400).json({ message: 'Verificación CAPTCHA requerida' });
    return;
  }

  const captchaValid = await verifyCaptcha(captcha_token);
  if (!captchaValid) {
    res.status(403).json({ message: 'Verificación CAPTCHA fallida. Intenta nuevamente.' });
    return;
  }

  // --- Validación del payload (pura, ver src/validation/quote.ts) ---
  const result = validateQuotePayload(req.body);
  if ('error' in result) {
    res.status(400).json({ message: result.error });
    return;
  }
  const q = result.data;

  try {
    const quote = await withRole('service', async (client) => {
      // Validar que los item_ids existan en la BD (dentro del mismo withRole para usar RLS)
      if (q.catalogItemIds.length > 0) {
        const placeholders = q.catalogItemIds.map((_, i) => `$${i + 1}`).join(',');
        const existCheck = await client.query(
          `SELECT id FROM items WHERE id IN (${placeholders}) AND is_active = true`,
          q.catalogItemIds
        );
        if (existCheck.rows.length !== new Set(q.catalogItemIds).size) {
          throw new RequestError(400, 'Uno o más ítems del catálogo no existen o están inactivos');
        }
      }

      const quoteResult = await client.query(
        `INSERT INTO quotes (
          client_name, client_email, client_phone,
          move_date,
          origin_address, origin_is_apartment, origin_floor, origin_elevator, origin_truck_distance_m,
          dest_address,   dest_is_apartment,   dest_floor,   dest_elevator,   dest_truck_distance_m,
          notes,
          consent_accepted, consent_text, consent_accepted_at
        ) VALUES (
          $1,  $2,  $3,
          $4,
          $5,  $6,  $7,  $8,  $9,
          $10, $11, $12, $13, $14,
          $15,
          $16, $17, NOW()
        ) RETURNING *`,
        [
          q.client_name, q.client_email, q.client_phone,
          q.move_date,
          q.origin_address, q.origin_is_apartment, q.origin_floor, q.origin_elevator, q.origin_truck_distance_m,
          q.dest_address,   q.dest_is_apartment,   q.dest_floor,   q.dest_elevator,   q.dest_truck_distance_m,
          q.notes,
          true, q.consent_text,
        ]
      );

      const newQuote = quoteResult.rows[0];

      for (const item of q.items) {
        await client.query(
          `INSERT INTO quote_items (quote_id, item_id, custom_name, custom_m3, quantity, is_fragile, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newQuote.id, item.item_id, item.custom_name, item.custom_m3, item.quantity, item.is_fragile, item.notes]
        );
      }

      return newQuote;
    });

    // Publicar evento (no bloquea la respuesta al cliente)
    publishEvent('quote.created', {
      quoteId: quote.id,
      clientEmail: q.client_email,
      clientName: q.client_name,
    }).catch((err) => {
      console.error('Error publicando evento quote.created:', (err as Error).message);
    });

    res.status(201).json({ id: quote.id, status: quote.status, created_at: quote.created_at });
  } catch (err) {
    if (err instanceof RequestError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    console.error('Error creando cotización:', (err as Error).message);
    res.status(500).json({ message: 'Error interno al crear la cotización' });
  }
});

export default router;
