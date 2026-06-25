import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     Number(process.env.POSTGRES_PORT) || 5432,
  user:     process.env.POSTGRES_APP_SERVICE_USER     || process.env.POSTGRES_USER,
  password: process.env.POSTGRES_APP_SERVICE_PASSWORD || process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_MAIN_DB,
});

type AppRole = 'admin' | 'service';

/**
 * Ejecuta `fn` dentro de una transacción con el contexto de RLS correcto.
 * Usa SET LOCAL (local a la transacción) para que el pool de conexiones
 * no filtre el rol entre requests.
 */
export async function withRole<T>(
  role: AppRole,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_role', role]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
