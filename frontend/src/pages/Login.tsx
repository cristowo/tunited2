import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, needsTotp ? totpCode : undefined);
      if (result.requires2fa) {
        setNeedsTotp(true);
        return;
      }
      navigate('/admin');
    } catch {
      setError(needsTotp ? 'Código de verificación incorrecto' : 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-sky-600 mb-6 text-center">
          United Mudanzas — Admin
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!needsTotp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </>
          )}

          {needsTotp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de verificación
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Ingresa el código de 6 dígitos de tu app de autenticación.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                maxLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? 'Ingresando...' : needsTotp ? 'Verificar' : 'Ingresar'}
          </button>

          {needsTotp && (
            <button
              type="button"
              onClick={() => { setNeedsTotp(false); setTotpCode(''); setError(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← Volver
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
