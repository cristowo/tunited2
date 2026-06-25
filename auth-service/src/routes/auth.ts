import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateSecret as generateTotpSecret, generateURI as generateTotpUri, verify as verifyTotp } from 'otplib';
import QRCode from 'qrcode';
import { withRole } from '../db/client';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
  refreshTokenExpiresAt,
} from '../middleware/jwt';
import { loginLimiter, refreshLimiter } from '../middleware/rateLimiter';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,128}$/;
const PASSWORD_RULES =
  'La contraseña debe tener entre 12 y 128 caracteres e incluir mayúscula, minúscula, número y carácter especial';

// Hash bcrypt "dummy" (de la cadena "invalid") usado para igualar el tiempo de
// respuesta cuando el email no existe, evitando enumeración de usuarios por timing.
const DUMMY_HASH = '$2b$12$/23yE4SQc3ZZg6lJ9OwEdO9RYb1xutsnNSUeb/R5R6roFE3bJr2yy';

/**
 * Los refresh tokens se guardan hasheados (SHA-256) en la BD: si la base se
 * filtra, los hashes no son utilizables como tokens. El JWT completo solo
 * existe en el cliente.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password, totp_code } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email y contraseña requeridos' });
    return;
  }

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ message: 'Formato de email inválido' });
    return;
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    res.status(400).json({ message: 'Credenciales inválidas' });
    return;
  }

  try {
    // Fetch user bajo rol 'service' (RLS permite SELECT en users)
    const user = await withRole('service', async (client) => {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase().trim()]
      );
      return result.rows[0] ?? null;
    });

    // Respuesta idéntica para usuario no encontrado y contraseña incorrecta
    // (evita enumerar qué emails existen). Cuando el usuario no existe se
    // compara igualmente contra un hash dummy para igualar el tiempo de cómputo
    // y no filtrar la existencia del email por timing.
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password)
      : (await bcrypt.compare(password, DUMMY_HASH), false);

    if (!user || !passwordMatches) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    // Segundo factor: si está activo, exigir el código antes de emitir tokens.
    // Se responde 200 (no 401) porque las credenciales ya fueron válidas.
    if (user.totp_enabled) {
      if (!totp_code || typeof totp_code !== 'string') {
        res.json({ requires2fa: true });
        return;
      }
      const { valid } = await verifyTotp({ token: totp_code, secret: user.totp_secret });
      if (!valid) {
        res.status(401).json({ message: 'Código de verificación inválido' });
        return;
      }
    }

    const accessToken  = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt    = refreshTokenExpiresAt();

    // Guardar el hash del refresh token en BD para poder invalidarlo en logout
    await withRole('service', async (client) => {
      await client.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, hashToken(refreshToken), expiresAt]
      );
    });

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error('Login error:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────
router.post('/refresh', refreshLimiter, async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(400).json({ message: 'Refresh token requerido' });
    return;
  }

  try {
    // Verificar firma y expiración del JWT
    const { userId } = verifyRefreshToken(refreshToken);

    // Verificar que el token existe en BD (por su hash) y no está expirado
    const tokenHash = hashToken(refreshToken);
    const row = await withRole('service', async (client) => {
      const result = await client.query(
        `SELECT rt.id, u.id AS user_id, u.role, u.is_active
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token = $1 AND rt.expires_at > NOW()`,
        [tokenHash]
      );
      return result.rows[0] ?? null;
    });

    if (!row || row.user_id !== userId || !row.is_active) {
      res.status(401).json({ message: 'Refresh token inválido o revocado' });
      return;
    }

    // Rotar: eliminar el token usado y emitir uno nuevo
    const newRefreshToken = generateRefreshToken(userId);
    const expiresAt       = refreshTokenExpiresAt();

    await withRole('service', async (client) => {
      await client.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
      await client.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, hashToken(newRefreshToken), expiresAt]
      );
    });

    const accessToken = generateAccessToken(userId, row.role);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ message: 'Refresh token inválido o expirado' });
  }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken && typeof refreshToken === 'string') {
    try {
      await withRole('service', async (client) => {
        await client.query('DELETE FROM refresh_tokens WHERE token = $1', [hashToken(refreshToken)]);
      });
    } catch (err) {
      console.error('Error al revocar token:', (err as Error).message);
    }
  }

  res.json({ message: 'Sesión cerrada' });
});

// ── POST /auth/change-password ────────────────────────────────────────────────
// Requiere access token válido + contraseña actual. Al cambiar, se revocan
// todos los refresh tokens del usuario (cierra las demás sesiones).
router.post('/change-password', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  let userId: string;
  try {
    ({ userId } = verifyAccessToken(header.split(' ')[1]));
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
    return;
  }

  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || typeof currentPassword !== 'string' || !newPassword || typeof newPassword !== 'string') {
    res.status(400).json({ message: 'Contraseña actual y nueva requeridas' });
    return;
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    res.status(400).json({ message: PASSWORD_RULES });
    return;
  }

  try {
    const user = await withRole('service', async (client) => {
      const result = await client.query(
        'SELECT id, password FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );
      return result.rows[0] ?? null;
    });

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      res.status(401).json({ message: 'Contraseña actual incorrecta' });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await withRole('admin', async (client) => {
      await client.query('UPDATE users SET password = $1 WHERE id = $2', [hash, userId]);
      // Revocar todas las sesiones existentes del usuario
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    });

    res.json({ message: 'Contraseña actualizada. Vuelve a iniciar sesión.' });
  } catch (err) {
    console.error('Error en change-password:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── POST /auth/register ───────────────────────────────────────────────────────
// Crear un nuevo administrador. Solo accesible para un admin autenticado
// (el primer admin se crea por CLI con npm run create-admin).
router.post('/register', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  let role: string;
  try {
    ({ role } = verifyAccessToken(header.split(' ')[1]));
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
    return;
  }

  if (role !== 'admin') {
    res.status(403).json({ message: 'Solo un administrador puede crear usuarios' });
    return;
  }

  const { email, password } = req.body ?? {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
    res.status(400).json({ message: 'Formato de email inválido' });
    return;
  }

  if (!password || typeof password !== 'string' || !PASSWORD_REGEX.test(password)) {
    res.status(400).json({ message: PASSWORD_RULES });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    const created = await withRole('admin', async (client) => {
      const result = await client.query(
        `INSERT INTO users (email, password, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, role, created_at`,
        [email.toLowerCase().trim(), hash]
      );
      return result.rows[0] ?? null;
    });

    if (!created) {
      res.status(409).json({ message: 'Ya existe un usuario con ese email' });
      return;
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Error en register:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  try {
    const { userId } = verifyAccessToken(header.split(' ')[1]);

    const user = await withRole('service', async (client) => {
      const result = await client.query(
        'SELECT id, email, role, created_at, totp_enabled FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );
      return result.rows[0] ?? null;
    });

    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
});

// ── POST /auth/2fa/setup ──────────────────────────────────────────────────────
// Genera un secreto TOTP nuevo (aún no activo) y el QR para escanearlo con una
// app de autenticación. Queda activo recién al confirmarse en /auth/2fa/enable.
router.post('/2fa/setup', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  let userId: string;
  try {
    ({ userId } = verifyAccessToken(header.split(' ')[1]));
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
    return;
  }

  try {
    const user = await withRole('service', async (client) => {
      const result = await client.query(
        'SELECT email FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );
      return result.rows[0] ?? null;
    });

    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado' });
      return;
    }

    const secret = generateTotpSecret();
    const otpauthUrl = generateTotpUri({ issuer: 'United Mudanzas', label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await withRole('admin', async (client) => {
      await client.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, userId]);
    });

    res.json({ secret, qrCodeDataUrl });
  } catch (err) {
    console.error('Error en 2fa/setup:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── POST /auth/2fa/enable ─────────────────────────────────────────────────────
// Confirma el enrolamiento: requiere un código válido generado con el secret
// guardado en /2fa/setup para activar el segundo factor.
router.post('/2fa/enable', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  let userId: string;
  try {
    ({ userId } = verifyAccessToken(header.split(' ')[1]));
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
    return;
  }

  const { code } = req.body ?? {};
  if (!code || typeof code !== 'string') {
    res.status(400).json({ message: 'Código requerido' });
    return;
  }

  try {
    const user = await withRole('service', async (client) => {
      const result = await client.query(
        'SELECT totp_secret FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );
      return result.rows[0] ?? null;
    });

    const validCode = user?.totp_secret
      ? (await verifyTotp({ token: code, secret: user.totp_secret })).valid
      : false;

    if (!validCode) {
      res.status(401).json({ message: 'Código inválido' });
      return;
    }

    await withRole('admin', async (client) => {
      await client.query('UPDATE users SET totp_enabled = true WHERE id = $1', [userId]);
    });

    res.json({ message: '2FA activado correctamente' });
  } catch (err) {
    console.error('Error en 2fa/enable:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── POST /auth/2fa/disable ────────────────────────────────────────────────────
// Requiere la contraseña actual para desactivar — evita que una sesión robada
// por XSS pueda apagar el segundo factor sin conocer la contraseña.
router.post('/2fa/disable', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  let userId: string;
  try {
    ({ userId } = verifyAccessToken(header.split(' ')[1]));
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
    return;
  }

  const { password } = req.body ?? {};
  if (!password || typeof password !== 'string') {
    res.status(400).json({ message: 'Contraseña requerida' });
    return;
  }

  try {
    const user = await withRole('service', async (client) => {
      const result = await client.query(
        'SELECT password FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );
      return result.rows[0] ?? null;
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: 'Contraseña incorrecta' });
      return;
    }

    await withRole('admin', async (client) => {
      await client.query(
        'UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE id = $1',
        [userId]
      );
    });

    res.json({ message: '2FA desactivado' });
  } catch (err) {
    console.error('Error en 2fa/disable:', (err as Error).message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
