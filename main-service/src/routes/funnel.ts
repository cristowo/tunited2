import { Router, Request, Response } from 'express';
import { withRole } from '../db/client';
import { validateFunnelEvent } from '../validation/funnel';

const router = Router();

// POST /funnel/events — registra un evento del embudo del cotizador público.
// Sin autenticación; nunca debe bloquear ni reflejar errores al usuario final.
router.post('/events', async (req: Request, res: Response) => {
  const result = validateFunnelEvent(req.body);
  if ('error' in result) {
    res.status(400).json({ message: result.error });
    return;
  }

  try {
    await withRole('service', async (client) => {
      await client.query(
        'INSERT INTO funnel_events (session_id, step, event) VALUES ($1, $2, $3)',
        [result.data.session_id, result.data.step, result.data.event]
      );
    });
    res.status(204).end();
  } catch (err) {
    console.error('Error al registrar evento de embudo:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
