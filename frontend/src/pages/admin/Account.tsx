import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  changePassword,
  registerAdmin,
  logout,
  getMe,
  setup2fa,
  enable2fa,
  disable2fa,
} from '../../services/auth';
import AdminHeader from '../../components/AdminHeader';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,128}$/;
const PASSWORD_HINT =
  'Mínimo 12 caracteres, con mayúscula, minúscula, número y carácter especial';

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400';

export default function Account() {
  const navigate = useNavigate();

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Nuevo admin
  const [newEmail, setNewEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // 2FA
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [twoFaError, setTwoFaError] = useState('');
  const [twoFaSuccess, setTwoFaSuccess] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  useEffect(() => {
    getMe().then((me) => setTotpEnabled(me.totp_enabled)).catch(() => {});
  }, []);

  async function handleStartSetup() {
    setTwoFaError('');
    setTwoFaLoading(true);
    try {
      const data = await setup2fa();
      setSetupData(data);
    } catch {
      setTwoFaError('No se pudo iniciar la activación de 2FA');
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleEnable2fa(e: FormEvent) {
    e.preventDefault();
    setTwoFaError('');
    setTwoFaLoading(true);
    try {
      await enable2fa(enableCode);
      setTotpEnabled(true);
      setSetupData(null);
      setEnableCode('');
      setTwoFaSuccess('Autenticación en dos pasos activada');
    } catch (err: any) {
      setTwoFaError(err.response?.data?.message ?? 'Código inválido');
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleDisable2fa(e: FormEvent) {
    e.preventDefault();
    setTwoFaError('');
    setTwoFaLoading(true);
    try {
      await disable2fa(disablePassword);
      setTotpEnabled(false);
      setShowDisableForm(false);
      setDisablePassword('');
      setTwoFaSuccess('Autenticación en dos pasos desactivada');
    } catch (err: any) {
      setTwoFaError(err.response?.data?.message ?? 'No se pudo desactivar');
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwdError('');

    if (newPassword !== confirmPassword) {
      setPwdError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setPwdError(PASSWORD_HINT);
      return;
    }

    setPwdLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      // El backend revoca todas las sesiones: cerrar y volver a login
      await logout();
      navigate('/login');
    } catch (err: any) {
      setPwdError(err.response?.data?.message ?? 'Error al cambiar la contraseña');
    } finally {
      setPwdLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!PASSWORD_REGEX.test(newAdminPassword)) {
      setRegError(PASSWORD_HINT);
      return;
    }

    setRegLoading(true);
    try {
      await registerAdmin(newEmail, newAdminPassword);
      setRegSuccess(`Administrador ${newEmail} creado correctamente`);
      setNewEmail('');
      setNewAdminPassword('');
    } catch (err: any) {
      setRegError(err.response?.data?.message ?? 'Error al crear el administrador');
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Mi cuenta" />

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Cambiar contraseña */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Cambiar contraseña</h2>
          <p className="text-xs text-gray-400 mb-4">
            Al cambiarla se cierran todas tus sesiones y deberás iniciar sesión nuevamente.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">{PASSWORD_HINT}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            {pwdError && <p className="text-red-500 text-sm">{pwdError}</p>}

            <button
              type="submit"
              disabled={pwdLoading || !currentPassword || !newPassword || !confirmPassword}
              className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
            >
              {pwdLoading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>

        {/* Autenticación en dos pasos */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Autenticación en dos pasos</h2>
          <p className="text-xs text-gray-400 mb-4">
            Agrega una capa extra de seguridad: además de tu contraseña, se pedirá un código
            de tu app de autenticación (Google Authenticator, Authy, etc.) al iniciar sesión.
          </p>

          {twoFaSuccess && <p className="text-green-600 text-sm mb-3">{twoFaSuccess}</p>}

          {totpEnabled === true && !showDisableForm && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700 font-medium">✓ Activada</span>
              <button
                type="button"
                onClick={() => { setShowDisableForm(true); setTwoFaError(''); }}
                className="text-sm text-red-500 hover:underline"
              >
                Desactivar
              </button>
            </div>
          )}

          {totpEnabled === true && showDisableForm && (
            <form onSubmit={handleDisable2fa} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirma tu contraseña para desactivar
                </label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              {twoFaError && <p className="text-red-500 text-sm">{twoFaError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={twoFaLoading || !disablePassword}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  {twoFaLoading ? 'Desactivando...' : 'Confirmar desactivación'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDisableForm(false); setDisablePassword(''); setTwoFaError(''); }}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {totpEnabled === false && !setupData && (
            <button
              type="button"
              onClick={handleStartSetup}
              disabled={twoFaLoading}
              className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
            >
              {twoFaLoading ? 'Generando...' : 'Activar 2FA'}
            </button>
          )}

          {setupData && (
            <form onSubmit={handleEnable2fa} className="space-y-4">
              <p className="text-sm text-gray-600">
                Escanea este código QR con tu app de autenticación:
              </p>
              <img
                src={setupData.qrCodeDataUrl}
                alt="Código QR para configurar 2FA"
                className="border border-gray-200 rounded-lg"
                width={180}
                height={180}
              />
              <p className="text-xs text-gray-400">
                ¿No puedes escanear? Ingresa este código manualmente:{' '}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">{setupData.secret}</code>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de verificación
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={enableCode}
                  onChange={(e) => setEnableCode(e.target.value)}
                  required
                  maxLength={8}
                  className={`${inputClass} max-w-[160px] text-center tracking-widest`}
                />
              </div>

              {twoFaError && <p className="text-red-500 text-sm">{twoFaError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={twoFaLoading || !enableCode}
                  className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
                >
                  {twoFaLoading ? 'Confirmando...' : 'Confirmar y activar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSetupData(null); setEnableCode(''); setTwoFaError(''); }}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Crear nuevo admin */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Crear nuevo administrador</h2>
          <p className="text-xs text-gray-400 mb-4">
            La nueva cuenta tendrá acceso completo al panel.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="nuevo@tunited.cl"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                required
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">{PASSWORD_HINT}</p>
            </div>

            {regError && <p className="text-red-500 text-sm">{regError}</p>}
            {regSuccess && <p className="text-green-600 text-sm">{regSuccess}</p>}

            <button
              type="submit"
              disabled={regLoading || !newEmail || !newAdminPassword}
              className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
            >
              {regLoading ? 'Creando...' : 'Crear administrador'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
