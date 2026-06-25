import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import { generalLimiter } from './middleware/rateLimiter';

// El .env vive en la raíz del monorepo (en Docker las vars llegan por env_file)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Validar variables de entorno críticas al inicio
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Variable de entorno requerida no configurada: ${key}`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET === 'tu_secreto_seguro' || process.env.JWT_REFRESH_SECRET === 'otro_secreto_seguro') {
  console.error('CRÍTICO: Cambia los JWT_SECRET por valores seguros antes de usar en producción');
  process.exit(1);
}

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// Cadena de proxies: cliente → nginx (frontend) → gateway → este servicio.
// Confiar en 2 saltos hace que req.ip sea la IP real del cliente, de modo que
// los rate limiters (login) no agrupen a todos los usuarios bajo la IP del gateway.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 2));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// Permissions-Policy — deshabilitar APIs de navegador innecesarias
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

// Los tokens y credenciales nunca deben cachearse
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// CORS restrictivo: solo permitir tráfico interno (desde el gateway)
app.use(cors({
  origin: false, // Servicio interno, no acepta requests de navegadores directamente
}));

app.use(express.json({ limit: '50kb' }));
app.use(generalLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.use('/auth', authRoutes);

// ── 404 y error handler centralizado ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Auth service error:', err.message);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// Limpiar refresh tokens expirados cada hora
setInterval(async () => {
  try {
    const { pool } = await import('./db/client');
    const result = await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    if (result.rowCount && result.rowCount > 0) {
      console.log(`Limpieza: ${result.rowCount} refresh tokens expirados eliminados`);
    }
  } catch (err) {
    console.error('Error en limpieza de tokens:', err);
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Auth Service corriendo en puerto ${PORT}`);
});
