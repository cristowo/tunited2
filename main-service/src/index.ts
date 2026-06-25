import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import quotesRoutes from './routes/quotes';
import itemsRoutes from './routes/items';
import adminRoutes from './routes/admin';
import funnelRoutes from './routes/funnel';
import contentRoutes from './routes/content';
import { UPLOADS_DIR } from './uploads';

// El .env vive en la raíz del monorepo (en Docker las vars llegan por env_file)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Secreto compartido con api-gateway para verificar que x-user-role realmente
// viene firmado por él (ver routes/admin.ts) — sin esto, cualquiera que
// alcance este servicio directo podría declararse admin con un simple header.
if (!process.env.INTERNAL_AUTH_SECRET) {
  console.error('Variable de entorno requerida no configurada: INTERNAL_AUTH_SECRET');
  process.exit(1);
}

const app = express();
const PORT = process.env.MAIN_PORT || 3002;

// Cadena de proxies: cliente → nginx (frontend) → gateway → este servicio.
// Con 2 saltos de confianza req.ip es la IP real del cliente.
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

// CORS restrictivo: servicio interno, no acepta requests de navegadores directamente
app.use(cors({
  origin: false,
}));

app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'main-service' });
});

app.use('/quotes', quotesRoutes);
app.use('/items', itemsRoutes);
app.use('/admin', adminRoutes);
app.use('/funnel', funnelRoutes);
app.use('/content', contentRoutes);

// Imágenes subidas desde el panel admin (ej. portafolio) — lectura pública
app.use('/uploads', express.static(UPLOADS_DIR));

// ── 404 y error handler centralizado ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Main service error:', err.message);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ── Retención de datos (Ley 21.719) ───────────────────────────────────────────
// Si RETENTION_MONTHS está configurado (> 0), una vez al día se eliminan las
// cotizaciones canceladas que no se hayan tocado en ese período. Los datos
// personales no deben conservarse más allá de lo necesario para su fin.
const retentionMonths = Number(process.env.RETENTION_MONTHS) || 0;
if (retentionMonths > 0) {
  const purge = async () => {
    try {
      const { withRole } = await import('./db/client');
      const deleted = await withRole('admin', async (client) => {
        const result = await client.query(
          `DELETE FROM quotes
           WHERE status = 'cancelled'
             AND updated_at < NOW() - make_interval(months => $1)
           RETURNING id`,
          [retentionMonths]
        );
        return result.rowCount ?? 0;
      });
      if (deleted > 0) {
        console.log(`Retención: ${deleted} cotizaciones canceladas con más de ${retentionMonths} meses eliminadas`);
      }
    } catch (err) {
      console.error('Error en purga de retención:', (err as Error).message);
    }
  };
  purge();
  setInterval(purge, 24 * 60 * 60 * 1000);
  console.log(`Retención de datos activa: cotizaciones canceladas se purgan a los ${retentionMonths} meses`);
}

app.listen(PORT, () => {
  console.log(`Main Service corriendo en puerto ${PORT}`);
});
