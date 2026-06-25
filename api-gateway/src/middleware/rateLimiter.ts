import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { createClient } from 'redis';
import { RedisStore } from 'rate-limit-redis';

export interface Limiters {
  generalLimiter: RateLimitRequestHandler;
  quoteLimiter: RateLimitRequestHandler;
  loginLimiter: RateLimitRequestHandler;
  refreshLimiter: RateLimitRequestHandler;
  funnelLimiter: RateLimitRequestHandler;
}

/**
 * Crea los rate limiters del gateway. Si REDIS_URL está configurada y Redis
 * responde, los contadores se guardan ahí: sobreviven reinicios y se comparten
 * entre instancias. Si no, se usa memoria local (válido para una sola instancia).
 *
 * Los límites se aplican por IP real del cliente — requiere `trust proxy`
 * configurado en el app (ver index.ts).
 */
export async function createLimiters(): Promise<Limiters> {
  let makeStore: ((prefix: string) => RedisStore) | undefined;

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const client = createClient({ url: redisUrl });
      client.on('error', (err) => console.error('Redis error:', (err as Error).message));
      await client.connect();
      makeStore = (prefix) =>
        new RedisStore({
          prefix,
          sendCommand: (...args: string[]) => client.sendCommand(args),
        });
      console.log('Rate limiting: usando Redis (compartido y persistente)');
    } catch (err) {
      console.warn(
        'Rate limiting: Redis no disponible, usando memoria local —',
        (err as Error).message
      );
    }
  } else {
    console.warn('Rate limiting: REDIS_URL no configurada, usando memoria local');
  }

  const base = { standardHeaders: true as const, legacyHeaders: false };

  return {
    generalLimiter: rateLimit({
      ...base,
      windowMs: 15 * 60 * 1000,
      limit: 200,
      store: makeStore?.('rl:general:'),
      message: { message: 'Demasiadas solicitudes, intenta más tarde' },
    }),

    /** Creación de cotizaciones (endpoint público) */
    quoteLimiter: rateLimit({
      ...base,
      windowMs: 60 * 60 * 1000,
      limit: 10,
      store: makeStore?.('rl:quotes:'),
      message: { message: 'Límite de cotizaciones alcanzado, intenta en una hora' },
    }),

    /** Login — protege contra fuerza bruta, por IP de cliente */
    loginLimiter: rateLimit({
      ...base,
      windowMs: 15 * 60 * 1000,
      limit: 10,
      store: makeStore?.('rl:login:'),
      message: { message: 'Demasiados intentos de inicio de sesión, intenta en 15 minutos' },
    }),

    /** Renovación de tokens */
    refreshLimiter: rateLimit({
      ...base,
      windowMs: 15 * 60 * 1000,
      limit: 30,
      store: makeStore?.('rl:refresh:'),
      message: { message: 'Demasiadas solicitudes de renovación de token' },
    }),

    /** Eventos de embudo del cotizador — más generoso que quoteLimiter, ya que
     *  una sola sesión dispara varios eventos solo por navegar entre pasos */
    funnelLimiter: rateLimit({
      ...base,
      windowMs: 60 * 60 * 1000,
      limit: 60,
      store: makeStore?.('rl:funnel:'),
      message: { message: 'Demasiadas solicitudes, intenta más tarde' },
    }),
  };
}
