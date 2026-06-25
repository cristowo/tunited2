import { Router, Request, Response } from 'express';
import { withRole } from '../db/client';

const router = Router();

// GET /content — contenido editable del landing público (hero, servicios,
// portafolio, contacto, etc.). Sin autenticación: lo lee el landing anónimo.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const row = await withRole('service', async (client) => {
      const result = await client.query('SELECT content FROM site_content WHERE id = 1');
      return result.rows[0] ?? null;
    });

    if (!row) {
      res.status(404).json({ message: 'Contenido no inicializado' });
      return;
    }

    res.json(row.content);
  } catch (err) {
    console.error('Error al obtener contenido del landing:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
