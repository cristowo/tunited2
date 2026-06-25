import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/authRoutes';
import mainRoutes from './routes/mainRoutes';
import { createLimiters } from './middleware/rateLimiter';

// El .env vive en la raíz del monorepo (en Docker las vars llegan por env_file)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Validar configuración crítica al inicio — el gateway no puede validar JWT sin esto
if (!process.env.JWT_SECRET) {
  console.error('Variable de entorno requerida no configurada: JWT_SECRET');
  process.exit(1);
}
if (process.env.JWT_SECRET === 'tu_secreto_seguro') {
  console.error('CRÍTICO: Cambia JWT_SECRET por un valor seguro antes de usar en producción');
  process.exit(1);
}
// Secreto compartido con main-service para firmar x-user-id/x-user-role
// (ver middleware/auth.ts signInternalHeaders) — sin esto, main-service no
// tendría forma de distinguir un header genuino del gateway de uno forjado
// por quien lo alcance directo.
if (!process.env.INTERNAL_AUTH_SECRET) {
  console.error('Variable de entorno requerida no configurada: INTERNAL_AUTH_SECRET');
  process.exit(1);
}

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// El gateway corre detrás del nginx del frontend, que setea X-Forwarded-For.
// Confiar en 1 salto hace que req.ip sea la IP real del cliente (clave para
// el rate limiting). Ajustable si hay más proxies delante (CDN, balanceador).
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

// ── Seguridad ──────────────────────────────────────────────────────────────────
app.use(helmet({
  // API JSON pura: no carga scripts, estilos, imágenes ni recursos externos
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],
      frameAncestors: ["'none'"],  // equivalente a X-Frame-Options: DENY en CSP nivel 3
    },
  },
  // No puede ser embebida en iframes por ningún origen
  frameguard: { action: 'deny' },
  // HSTS: fuerza HTTPS por 1 año en todos los subdominios (activar preload en producción)
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// Permissions-Policy — deshabilitar APIs de navegador que una API REST no necesita
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    [
      'camera=()',
      'display-capture=()',
      'fullscreen=()',
      'geolocation=()',
      'microphone=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'usb=()',
      'web-share=()',
    ].join(', ')
  );
  next();
});

// Cache-Control: no-store en rutas de autenticación — los tokens nunca deben cachearse
app.use('/auth', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// CORS_ORIGIN puede ser un origen único o una lista separada por comas.
// Ejemplo: CORS_ORIGIN=https://unitedmudanzas.cl,https://www.unitedmudanzas.cl
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

if (allowedOrigins.size === 0) {
  console.error('CORS_ORIGIN no está configurado. El gateway rechazará todas las peticiones del navegador.');
}

app.use(cors({
  origin: (origin, callback) => {
    // Sin origen: peticiones server-to-server o herramientas CLI (no pasan CORS del navegador)
    if (!origin) {
      callback(null, false);
      return;
    }
    if (allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: origen rechazado → ${origin}`);
      callback(new Error('Origen no permitido'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

// ── Sanitización de headers internos ─────────────────────────────────────────────
// Los headers x-user-* son de confianza interna: solo verifyToken debe poder fijarlos.
// Se eliminan los que vengan del cliente para que no puedan suplantar identidad/rol.
app.use((req, _res, next) => {
  delete req.headers['x-user-id'];
  delete req.headers['x-user-role'];
  next();
});

// ── Logging ───────────────────────────────────────────────────────────────────
// El gateway es un proxy puro: nunca lee req.body, así que NO debe parsearlo.
// Si se llamara aquí a express.json(), consumiría el stream del request antes
// de que http-proxy-middleware pudiera reenviarlo, dejando el body vacío pero
// con el Content-Length original — el servicio destino se queda esperando esos
// bytes para siempre y la request se cuelga sin error visible.
app.use(morgan('[:date[clf]] :method :url :status :response-time ms'));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', ts: new Date().toISOString() });
});

// El arranque es asíncrono porque los rate limiters intentan conectar a Redis
async function start() {
  const limiters = await createLimiters();

  // ── Rate limit global ────────────────────────────────────────────────────────
  app.use(limiters.generalLimiter);

  // ── Rutas ───────────────────────────────────────────────────────────────────
  app.use('/auth', authRoutes(limiters));
  app.use('/api',  mainRoutes(limiters));

  // ── 404 ─────────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
  });

  // ── Error handler global ─────────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Origen no permitido por CORS → 403, no 500
    if (err.message === 'Origen no permitido') {
      res.status(403).json({ message: 'Origen no permitido' });
      return;
    }
    console.error('Gateway error:', err.message);
    res.status(500).json({ message: 'Error interno del gateway' });
  });

  app.listen(PORT, () => {
    console.log(`API Gateway corriendo en puerto ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Error fatal al iniciar el gateway:', err);
  process.exit(1);
});
