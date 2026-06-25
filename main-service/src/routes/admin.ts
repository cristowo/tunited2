import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import { withRole } from '../db/client';
import { publishEvent } from '../messaging/publisher';
import {
  VALID_STATUSES,
  isValidStatus,
  canTransition,
  allowedTransitions,
  QuoteStatus,
} from '../validation/statusTransitions';
import { validateSiteContent } from '../validation/siteContent';
import { UPLOADS_DIR } from '../uploads';

const router = Router();

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// El Content-Type del multipart lo declara el cliente — no es prueba de que
// el archivo realmente sea una imagen. Se guarda en memoria (no en disco) y
// se valida/reescribe con sharp, que decodifica los píxeles reales: si no es
// una imagen válida, falla. Re-codificar además descarta cualquier byte que
// no sea parte de la imagen (ej. un payload HTML/JS pegado al final del archivo).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new Error('Solo se permiten imágenes JPEG, PNG o WEBP'));
      return;
    }
    cb(null, true);
  },
});

const FORMAT_EXT: Record<string, string> = { jpeg: '.jpg', png: '.png', webp: '.webp' };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida que el parámetro :id sea un UUID — evita 500 por errores de tipo en pg */
function validateUuidParam(req: Request, res: Response, next: NextFunction) {
  if (!UUID_REGEX.test(req.params.id)) {
    res.status(400).json({ message: 'ID con formato inválido' });
    return;
  }
  next();
}

/**
 * Defensa en profundidad: aunque el gateway ya exige rol admin, el main-service
 * no debe confiar ciegamente en ser inalcanzable. El gateway inyecta x-user-role
 * a partir del JWT verificado y firma esos headers con INTERNAL_AUTH_SECRET
 * (ver api-gateway/src/middleware/auth.ts signInternalHeaders); aquí se
 * verifica esa firma — un x-user-role: admin sin la firma correcta (ej. de
 * quien alcance este servicio directo, sin pasar por el gateway) se rechaza.
 */
const INTERNAL_AUTH_SECRET = process.env.INTERNAL_AUTH_SECRET as string;

router.use((req: Request, res: Response, next: NextFunction) => {
  const role = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];
  const signature = req.headers['x-internal-signature'];

  if (role !== 'admin' || typeof userId !== 'string' || typeof signature !== 'string') {
    res.status(403).json({ message: 'Acceso denegado' });
    return;
  }

  const expected = crypto.createHmac('sha256', INTERNAL_AUTH_SECRET).update(`${userId}:${role}`).digest();
  const given = Buffer.from(signature, 'hex');

  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    res.status(403).json({ message: 'Acceso denegado' });
    return;
  }

  next();
});

/** Devuelve el id del admin autenticado (header inyectado por el gateway), o null */
function adminId(req: Request): string | null {
  const id = req.headers['x-user-id'];
  return typeof id === 'string' && UUID_REGEX.test(id) ? id : null;
}

/** Escapa caracteres especiales de LIKE/ILIKE para evitar búsquedas wildcard */
function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// GET /admin/quotes — listar con filtros y paginación
router.get('/quotes', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20', search } = req.query;
  const pageNum = Math.max(1, Math.floor(Number(page)) || 1);
  const limitNum = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      if (!isValidStatus(status)) {
        res.status(400).json({ message: 'Estado inválido' });
        return;
      }
      params.push(status);
      conditions.push(`q.status = $${params.length}`);
    }

    if (search && typeof search === 'string') {
      const sanitized = escapeLike(search.slice(0, 100));
      params.push(`%${sanitized}%`);
      conditions.push(
        `(q.client_name ILIKE $${params.length} OR q.client_email ILIKE $${params.length})`
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await withRole('admin', async (client) => {
      const result = await client.query(
        `SELECT q.*, COUNT(*) OVER() AS total
         FROM quotes q ${where}
         ORDER BY q.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset]
      );
      return result.rows;
    });

    const total = Number(rows[0]?.total ?? 0);

    res.json({
      data: rows.map(({ total: _, ...row }) => row),
      meta: { page: pageNum, limit: limitNum, total },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar cotizaciones' });
  }
});

// GET /admin/quotes/metrics — conteos por estado
router.get('/quotes/metrics', async (_req: Request, res: Response) => {
  try {
    const rows = await withRole('admin', async (client) => {
      const result = await client.query(
        `SELECT status, COUNT(*) AS count FROM quotes GROUP BY status`
      );
      return result.rows;
    });

    const metrics: Record<string, number> = {
      pending: 0, reviewed: 0, quoted: 0, confirmed: 0, cancelled: 0,
    };

    for (const row of rows) {
      metrics[row.status] = Number(row.count);
    }

    metrics.total = Object.values(metrics).reduce((a, b) => a + b, 0);

    res.json(metrics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener métricas' });
  }
});

// GET /admin/funnel — sesiones distintas que llegaron a cada paso del
// cotizador y cuántas terminaron enviando, para medir dónde abandona la gente
router.get('/funnel', async (_req: Request, res: Response) => {
  try {
    const rows = await withRole('admin', async (client) => {
      const result = await client.query(
        `SELECT step, event, COUNT(DISTINCT session_id) AS sessions
         FROM funnel_events
         GROUP BY step, event`
      );
      return result.rows;
    });

    const steps: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let submitted = 0;

    for (const row of rows) {
      const count = Number(row.sessions);
      if (row.event === 'step_viewed') {
        steps[Number(row.step)] = count;
      } else if (row.event === 'submitted') {
        submitted += count;
      }
    }

    res.json({ steps, submitted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener el embudo' });
  }
});

// PUT /admin/content — guarda el contenido editable del landing
router.put('/content', async (req: Request, res: Response) => {
  const result = validateSiteContent(req.body);
  if ('error' in result) {
    res.status(400).json({ message: result.error });
    return;
  }

  try {
    await withRole('admin', async (client) => {
      await client.query(
        `UPDATE site_content SET content = $1, updated_at = NOW() WHERE id = 1`,
        [JSON.stringify(result.data)]
      );
    });
    res.json(result.data);
  } catch (err) {
    console.error('Error al guardar contenido del landing:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /admin/content/upload — sube una imagen (ej. para el portafolio) y
// devuelve la ruta pública servida por este mismo servicio en /uploads
router.post('/content/upload', (req: Request, res: Response) => {
  upload.single('image')(req, res, async (err: unknown) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? (err.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar 5 MB' : err.message)
        : (err as Error).message || 'Error al subir la imagen';
      res.status(400).json({ message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: 'No se recibió ninguna imagen' });
      return;
    }

    try {
      const image = sharp(req.file.buffer);
      const metadata = await image.metadata();
      const ext = metadata.format ? FORMAT_EXT[metadata.format] : undefined;

      if (!ext) {
        res.status(400).json({ message: 'El archivo no es una imagen JPEG, PNG o WEBP válida' });
        return;
      }

      const filename = `${crypto.randomUUID()}${ext}`;
      // toFile() decodifica y vuelve a codificar los píxeles — el archivo
      // resultante nunca contiene los bytes originales del cliente
      await image.toFile(path.join(UPLOADS_DIR, filename));

      res.json({ url: `/uploads/${filename}` });
    } catch {
      res.status(400).json({ message: 'El archivo no es una imagen válida' });
    }
  });
});

// GET /admin/quotes/:id — detalle completo
router.get('/quotes/:id', validateUuidParam, async (req: Request, res: Response) => {
  try {
    const data = await withRole('admin', async (client) => {
      const quoteResult = await client.query(
        'SELECT * FROM quotes WHERE id = $1',
        [req.params.id]
      );

      if (!quoteResult.rows[0]) return null;

      const itemsResult = await client.query(
        `SELECT
           qi.id, qi.quantity, qi.is_fragile, qi.notes,
           qi.item_id, qi.custom_name, qi.custom_m3,
           i.name, i.category, i.dimensions
         FROM quote_items qi
         LEFT JOIN items i ON qi.item_id = i.id
         WHERE qi.quote_id = $1
         ORDER BY i.category, i.name, qi.custom_name`,
        [req.params.id]
      );

      const logResult = await client.query(
        `SELECT * FROM quote_status_log WHERE quote_id = $1 ORDER BY changed_at DESC`,
        [req.params.id]
      );

      return {
        quote: quoteResult.rows[0],
        items: itemsResult.rows,
        log: logResult.rows,
      };
    });

    if (!data) {
      res.status(404).json({ message: 'Cotización no encontrada' });
      return;
    }

    res.json({
      ...data.quote,
      items: data.items.map((row) => ({
        ...row,
        name: row.name ?? row.custom_name,
        category: row.category ?? 'Personalizado',
      })),
      status_log: data.log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener cotización' });
  }
});

// PATCH /admin/quotes/:id/status
router.patch('/quotes/:id/status', validateUuidParam, async (req: Request, res: Response) => {
  const { status } = req.body;

  if (!isValidStatus(status)) {
    res.status(400).json({ message: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  try {
    const result = await withRole('admin', async (client) => {
      const current = await client.query(
        'SELECT status, client_email, client_name FROM quotes WHERE id = $1',
        [req.params.id]
      );

      if (!current.rows[0]) return null;

      const { status: oldStatus, client_email, client_name } = current.rows[0];

      if (oldStatus === status) {
        return { unchanged: true, oldStatus, newStatus: status, client_email, client_name };
      }

      // Solo transiciones válidas de la máquina de estados
      if (!canTransition(oldStatus as QuoteStatus, status)) {
        const allowed = allowedTransitions(oldStatus as QuoteStatus);
        throw Object.assign(
          new Error(
            allowed.length
              ? `Transición inválida: de '${oldStatus}' solo se puede pasar a: ${allowed.join(', ')}`
              : `'${oldStatus}' es un estado terminal, no admite cambios`
          ),
          { httpStatus: 400 }
        );
      }

      await client.query(
        'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, req.params.id]
      );

      await client.query(
        'INSERT INTO quote_status_log (quote_id, old_status, new_status, changed_by) VALUES ($1, $2, $3, $4)',
        [req.params.id, oldStatus, status, adminId(req)]
      );

      return { unchanged: false, oldStatus, newStatus: status, client_email, client_name };
    });

    if (!result) {
      res.status(404).json({ message: 'Cotización no encontrada' });
      return;
    }

    if (result.unchanged) {
      res.json({ message: 'El estado ya es el mismo, no se realizaron cambios' });
      return;
    }

    publishEvent('quote.status_changed', {
      quoteId: req.params.id,
      clientEmail: result.client_email,
      clientName: result.client_name,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
    });

    res.json({ message: 'Estado actualizado', oldStatus: result.oldStatus, newStatus: result.newStatus });
  } catch (err: any) {
    if (err.httpStatus) {
      res.status(err.httpStatus).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
});

// PATCH /admin/quotes/:id/price
router.patch('/quotes/:id/price', validateUuidParam, async (req: Request, res: Response) => {
  const { estimated_price } = req.body;
  const price = Number(estimated_price);

  if (isNaN(price) || price <= 0) {
    res.status(400).json({ message: 'El precio debe ser un número positivo' });
    return;
  }

  if (price > 99999999.99) {
    res.status(400).json({ message: 'El precio excede el máximo permitido' });
    return;
  }

  // Redondear a 2 decimales
  const roundedPrice = Math.round(price * 100) / 100;

  try {
    const row = await withRole('admin', async (client) => {
      const result = await client.query(
        `UPDATE quotes
         SET estimated_price = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [roundedPrice, req.params.id]
      );
      return result.rows[0] ?? null;
    });

    if (!row) {
      res.status(404).json({ message: 'Cotización no encontrada' });
      return;
    }

    publishEvent('quote.price_set', {
      quoteId: req.params.id,
      clientEmail: row.client_email,
      clientName: row.client_name,
      estimatedPrice: roundedPrice,
    });

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al asignar precio' });
  }
});

// PATCH /admin/quotes/:id/notes
router.patch('/quotes/:id/notes', validateUuidParam, async (req: Request, res: Response) => {
  const { admin_notes } = req.body;

  if (admin_notes && (typeof admin_notes !== 'string' || admin_notes.length > 2000)) {
    res.status(400).json({ message: 'Las notas no pueden superar 2000 caracteres' });
    return;
  }

  try {
    const row = await withRole('admin', async (client) => {
      const result = await client.query(
        `UPDATE quotes SET admin_notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [admin_notes, req.params.id]
      );
      return result.rows[0] ?? null;
    });

    if (!row) {
      res.status(404).json({ message: 'Cotización no encontrada' });
      return;
    }

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar notas' });
  }
});

// DELETE /admin/quotes/:id — eliminación de datos del cliente (Ley 21.719)
// Borrado físico: quote_items y quote_status_log caen por ON DELETE CASCADE.
router.delete('/quotes/:id', validateUuidParam, async (req: Request, res: Response) => {
  try {
    const deleted = await withRole('admin', async (client) => {
      const result = await client.query('DELETE FROM quotes WHERE id = $1 RETURNING id', [
        req.params.id,
      ]);
      return result.rows[0] ?? null;
    });

    if (!deleted) {
      res.status(404).json({ message: 'Cotización no encontrada' });
      return;
    }

    console.log(`Cotización ${req.params.id} eliminada por admin ${adminId(req) ?? 'desconocido'}`);
    res.json({ message: 'Cotización y datos del cliente eliminados' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar la cotización' });
  }
});

// ── Catálogo de ítems ─────────────────────────────────────────────────────────

const MAX_NAME = 255;
const MAX_CATEGORY = 100;
const MAX_DIMENSIONS = 100;
const MAX_DESCRIPTION = 1000;

function validateItemFields(body: any, partial: boolean): string | null {
  const { name, category, dimensions, description } = body ?? {};

  if (!partial || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > MAX_NAME) {
      return `El nombre debe tener entre 2 y ${MAX_NAME} caracteres`;
    }
  }
  if (!partial || category !== undefined) {
    if (!category || typeof category !== 'string' || category.trim().length < 2 || category.trim().length > MAX_CATEGORY) {
      return `La categoría debe tener entre 2 y ${MAX_CATEGORY} caracteres`;
    }
  }
  if (dimensions !== undefined && dimensions !== null && dimensions !== '') {
    if (typeof dimensions !== 'string' || dimensions.length > MAX_DIMENSIONS) {
      return `Las dimensiones no pueden superar ${MAX_DIMENSIONS} caracteres`;
    }
  }
  if (description !== undefined && description !== null && description !== '') {
    if (typeof description !== 'string' || description.length > MAX_DESCRIPTION) {
      return `La descripción no puede superar ${MAX_DESCRIPTION} caracteres`;
    }
  }
  return null;
}

// GET /admin/items — catálogo completo, incluyendo ítems inactivos
router.get('/items', async (_req: Request, res: Response) => {
  try {
    const rows = await withRole('admin', async (client) => {
      const result = await client.query('SELECT * FROM items ORDER BY category, name');
      return result.rows;
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener el catálogo' });
  }
});

// POST /admin/items — crear ítem del catálogo
router.post('/items', async (req: Request, res: Response) => {
  const error = validateItemFields(req.body, false);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const { name, category, dimensions, description } = req.body;

  try {
    const row = await withRole('admin', async (client) => {
      const result = await client.query(
        `INSERT INTO items (name, category, dimensions, description)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name.trim(), category.trim(), dimensions?.trim() || null, description?.trim() || null]
      );
      return result.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear el ítem' });
  }
});

// PATCH /admin/items/:id — editar ítem (incluye activar/desactivar vía is_active)
// No hay DELETE físico: los ítems pueden estar referenciados por cotizaciones
// históricas, así que se desactivan (dejan de aparecer en el formulario público).
router.patch('/items/:id', validateUuidParam, async (req: Request, res: Response) => {
  const error = validateItemFields(req.body, true);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const { name, category, dimensions, description, is_active } = req.body ?? {};
  if (is_active !== undefined && typeof is_active !== 'boolean') {
    res.status(400).json({ message: 'is_active debe ser booleano' });
    return;
  }

  const sets: string[] = [];
  const params: any[] = [];
  const push = (column: string, value: any) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (name !== undefined) push('name', name.trim());
  if (category !== undefined) push('category', category.trim());
  if (dimensions !== undefined) push('dimensions', dimensions?.trim() || null);
  if (description !== undefined) push('description', description?.trim() || null);
  if (is_active !== undefined) push('is_active', is_active);

  if (sets.length === 0) {
    res.status(400).json({ message: 'Nada que actualizar' });
    return;
  }

  params.push(req.params.id);

  try {
    const row = await withRole('admin', async (client) => {
      const result = await client.query(
        `UPDATE items SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      return result.rows[0] ?? null;
    });

    if (!row) {
      res.status(404).json({ message: 'Ítem no encontrado' });
      return;
    }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el ítem' });
  }
});

export default router;
