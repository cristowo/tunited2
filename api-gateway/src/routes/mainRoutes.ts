import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyToken, requireAdmin, signInternalHeaders } from '../middleware/auth';
import { Limiters } from '../middleware/rateLimiter';

// En Docker usa el nombre de servicio; en local usa localhost
const MAIN_TARGET =
  process.env.MAIN_SERVICE_URL ||
  `http://localhost:${process.env.MAIN_PORT || 3002}`;

export default function mainRoutes(limiters: Pick<Limiters, 'quoteLimiter' | 'funnelLimiter'>) {
  const router = Router();

  const proxy = createProxyMiddleware({
    target: MAIN_TARGET,
    changeOrigin: true,
    xfwd: true, // propaga X-Forwarded-For para que el servicio vea la IP real
    pathRewrite: { '^/api': '' },
    onError: (_err: any, _req: any, res: any) => {
      res.status(502).json({ message: 'Servicio principal no disponible' });
    },
  });

  // ── Rutas públicas ──────────────────────────────────────────────────────────
  // Solo GET es público en el catálogo; cualquier otro método se rechaza con 405.
  router.get('/items', proxy);
  router.post('/quotes', limiters.quoteLimiter, proxy);
  router.post('/funnel/events', limiters.funnelLimiter, proxy);
  router.get('/content', proxy);
  router.use('/uploads', proxy); // lectura pública de imágenes subidas (ej. portafolio)

  // ── Rutas protegidas ────────────────────────────────────────────────────────
  // verifyToken valida la firma del JWT; requireAdmin exige rol 'admin'.
  router.use('/admin', verifyToken, requireAdmin, signInternalHeaders, proxy);

  return router;
}
