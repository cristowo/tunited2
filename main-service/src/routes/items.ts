import { Router, Request, Response } from 'express';
import { withRole } from '../db/client';

const router = Router();

// GET /items — catálogo agrupado por categoría
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await withRole('service', async (client) => {
      const result = await client.query(
        'SELECT * FROM items WHERE is_active = true ORDER BY category, name'
      );
      return result.rows;
    });

    const grouped = rows.reduce((acc: Record<string, any[]>, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json(grouped);
  } catch {
    res.status(500).json({ message: 'Error al obtener ítems' });
  }
});

export default router;
