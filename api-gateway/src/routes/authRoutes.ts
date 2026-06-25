import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Limiters } from '../middleware/rateLimiter';

// En Docker usa el nombre de servicio; en local usa localhost
const AUTH_TARGET =
  process.env.AUTH_SERVICE_URL ||
  `http://localhost:${process.env.AUTH_PORT || 3001}`;

export default function authRoutes(limiters: Pick<Limiters, 'loginLimiter' | 'refreshLimiter'>) {
  const router = Router();

  const proxy = createProxyMiddleware({
    target: AUTH_TARGET,
    changeOrigin: true,
    xfwd: true, // propaga X-Forwarded-For para que el servicio vea la IP real
    onError: (_err: any, _req: any, res: any) => {
      res.status(502).json({ message: 'Auth service no disponible' });
    },
  });

  // Límites por IP de cliente en los endpoints sensibles, antes de proxear
  router.post('/login', limiters.loginLimiter, proxy);
  router.post('/refresh', limiters.refreshLimiter, proxy);
  router.use('/', proxy);

  return router;
}
