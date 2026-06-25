import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

export interface AccessTokenPayload {
  userId: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
}

function getSecret(key: string): string {
  const secret = process.env[key];
  if (!secret) {
    throw new Error(`Variable de entorno ${key} no configurada`);
  }
  return secret;
}

export function generateAccessToken(userId: string, role: string): string {
  const options: SignOptions = { expiresIn: parseDuration(process.env.JWT_EXPIRES_IN || '15m') / 1000 };
  return jwt.sign(
    { userId, role } as AccessTokenPayload,
    getSecret('JWT_SECRET'),
    options
  );
}

export function generateRefreshToken(userId: string): string {
  const options: SignOptions = { expiresIn: parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || '7d') / 1000 };
  // jti aleatorio: sin esto, dos tokens emitidos para el mismo usuario dentro
  // del mismo segundo son JWT idénticos (mismo payload+iat+exp), lo que choca
  // con la restricción UNIQUE de refresh_tokens.token.
  return jwt.sign(
    { userId, jti: crypto.randomUUID() } as RefreshTokenPayload,
    getSecret('JWT_REFRESH_SECRET'),
    options
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getSecret('JWT_SECRET')) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as RefreshTokenPayload;
}

/** Calcula la fecha de expiración del refresh token para guardarla en BD */
export function refreshTokenExpiresAt(): Date {
  const duration = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const ms = parseDuration(duration);
  return new Date(Date.now() + ms);
}

function parseDuration(str: string): number {
  const units: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86_400_000; // fallback 7d
  return parseInt(match[1]) * units[match[2]];
}
