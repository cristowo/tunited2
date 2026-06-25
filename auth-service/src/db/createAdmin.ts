/**
 * Script para crear el primer usuario admin.
 * Uso: npm run create-admin -- admin@empresa.com MiPassword123!
 */
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// El bootstrap se conecta como superuser (POSTGRES_USER), que bypasea RLS.
// Así la política users_insert puede exigir rol admin sin bloquear la creación
// del primer administrador (problema del huevo y la gallina).
const pool = new Pool({
  host:     process.env.POSTGRES_HOST || 'localhost',
  port:     Number(process.env.POSTGRES_PORT) || 5432,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_AUTH_DB,
});

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function createAdmin() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error('Uso: npm run create-admin -- <email> <password>');
    process.exit(1);
  }

  if (!EMAIL_REGEX.test(email)) {
    console.error('Formato de email inválido');
    process.exit(1);
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    console.error(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
    process.exit(1);
  }

  if (!PASSWORD_REGEX.test(password)) {
    console.error('La contraseña debe contener al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role`,
      [email.toLowerCase().trim(), hash]
    );

    if (result.rowCount === 0) {
      console.log(`El usuario ${email} ya existe.`);
    } else {
      console.log(`Admin creado: ${result.rows[0].email} (id: ${result.rows[0].id})`);
    }
  } catch (err) {
    console.error('Error:', (err as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();
