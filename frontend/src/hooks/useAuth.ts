import { useState } from 'react';
import { login as loginService, logout as logoutService } from '../services/auth';

interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem('accessToken')
  );
  const [user, setUser] = useState<AdminUser | null>(null);

  async function login(email: string, password: string, totpCode?: string) {
    const result = await loginService(email, password, totpCode);
    if ('requires2fa' in result) {
      return { requires2fa: true as const };
    }
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    setIsAuthenticated(true);
    return { requires2fa: false as const };
  }

  async function logout() {
    await logoutService();
    setUser(null);
    setIsAuthenticated(false);
  }

  return { isAuthenticated, user, login, logout };
}
