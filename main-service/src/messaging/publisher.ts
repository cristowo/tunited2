import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE = 'quotes';

let channelPromise: Promise<amqp.Channel> | null = null;

function getChannel(): Promise<amqp.Channel> {
  if (channelPromise) return channelPromise;

  channelPromise = (async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

    conn.on('close', () => {
      channelPromise = null;
      console.warn('RabbitMQ: conexión cerrada, se reconectará en próximo uso');
    });

    conn.on('error', (err) => {
      console.error('RabbitMQ connection error:', (err as Error).message);
      channelPromise = null;
    });

    return ch;
  })();

  // Si la conexión falla, limpiar para que reintente
  channelPromise.catch(() => {
    channelPromise = null;
  });

  return channelPromise;
}

export async function publishEvent(event: string, data: object): Promise<void> {
  try {
    const ch = await getChannel();
    const published = ch.publish(
      EXCHANGE,
      event,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    if (!published) {
      console.warn(`RabbitMQ: buffer lleno al publicar ${event}, esperando drain`);
      await new Promise<void>((resolve) => ch.once('drain', resolve));
    }
  } catch (err) {
    channelPromise = null;
    console.error(`Error publicando evento ${event}:`, (err as Error).message);
  }
}
