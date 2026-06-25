import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  role: string;
}

/**
 * Valida el JWT y adjunta el payload al request.
 * Además inyecta X-User-Id y X-User-Role como headers
 * para que los servicios downstream puedan leerlos.
 */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;

    // Propagar identidad al servicio downstream via headers internos.
    // Se sobreescriben siempre para que un cliente no pueda inyectarlos manualmente.
    req.headers['x-user-id']   = payload.userId;
    req.headers['x-user-role'] = payload.role;

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expirado' });
    } else {
      res.status(401).json({ message: 'Token inválido' });
    }
  }
}

/**
 * Exige que el token validado tenga rol 'admin'.
 * Debe usarse SIEMPRE después de verifyToken.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-user-role'] !== 'admin') {
    res.status(403).json({ message: 'Acceso denegado: se requiere rol de administrador' });
    return;
  }
  next();
}

/**
 * Firma x-user-id/x-user-role con un secreto compartido antes de proxear a
 * main-service. Sin esto, main-service solo podía confiar en que el gateway
 * fuera el único camino de entrada (ver comentario en admin.ts) — cualquiera
 * que alcanzara main-service directo (red interna comprometida, mala config
 * de puertos, etc.) podía declararse admin con un simple header. La firma
 * hace que ese header sea inútil sin conocer INTERNAL_AUTH_SECRET.
 * Debe usarse SIEMPRE después de verifyToken + requireAdmin.
 */
export function signInternalHeaders(req: Request, _res: Response, next: NextFunction) {
  const secret = process.env.INTERNAL_AUTH_SECRET as string;
  const userId = req.headers['x-user-id'] as string;
  const role = req.headers['x-user-role'] as string;
  req.headers['x-internal-signature'] = crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${role}`)
    .digest('hex');
  next();
}
