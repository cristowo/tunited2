import axios from 'axios';
import { AuthTokens } from '../types';

// NOTA DE SEGURIDAD: los tokens se guardan en localStorage por simplicidad.
// Esto los hace accesibles a JavaScript y, por tanto, robables vía XSS.
// La CSP del frontend y el escaping por defecto de React mitigan el riesgo,
// pero para máxima seguridad conviene migrar el refresh token a una cookie
// httpOnly + SameSite=Strict gestionada por el gateway/auth-service.

export type LoginResult = AuthTokens | { requires2fa: true };

export async function login(email: string, password: string, totpCode?: string): Promise<LoginResult> {
  const res = await axios.post<LoginResult>('/auth/login', {
    email,
    password,
    ...(totpCode ? { totp_code: totpCode } : {}),
  });
  return res.data;
}

export interface MeResponse {
  id: string;
  email: string;
  role: string;
  created_at: string;
  totp_enabled: boolean;
}

export async function getMe(): Promise<MeResponse> {
  const token = localStorage.getItem('accessToken');
  const res = await axios.get<MeResponse>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function setup2fa(): Promise<{ secret: string; qrCodeDataUrl: string }> {
  const token = localStorage.getItem('accessToken');
  const res = await axios.post<{ secret: string; qrCodeDataUrl: string }>(
    '/auth/2fa/setup',
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function enable2fa(code: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  await axios.post(
    '/auth/2fa/enable',
    { code },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function disable2fa(password: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  await axios.post(
    '/auth/2fa/disable',
    { password },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  await axios.post('/auth/logout', { refreshToken }).catch(() => {});
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  await axios.post(
    '/auth/change-password',
    { currentPassword, newPassword },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function registerAdmin(email: string, password: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  await axios.post(
    '/auth/register',
    { email, password },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const res = await axios.post<{ accessToken: string; refreshToken: string }>(
    '/auth/refresh',
    { refreshToken }
  );

  localStorage.setItem('accessToken', res.data.accessToken);
  localStorage.setItem('refreshToken', res.data.refreshToken);

  return res.data.accessToken;
}
