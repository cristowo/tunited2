import { useState } from 'react';
import { QuoteFormData } from '../../types';

interface Props {
  data: QuoteFormData;
  onChange: (fields: Partial<QuoteFormData>) => void;
  onNext: () => void;
}

// Formato chileno: +56 9 1234 5678 → almacenamos como +56912345678
const PHONE_REGEX = /^\+56[2-9]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function formatPhoneDisplay(raw: string): string {
  // Formatea para mostrar: +56 9 1234 5678
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 2) return '+' + digits;
  if (digits.length <= 3) return '+' + digits.slice(0, 2) + ' ' + digits.slice(2);
  if (digits.length <= 7) return '+' + digits.slice(0, 2) + ' ' + digits.slice(2, 3) + ' ' + digits.slice(3);
  return '+' + digits.slice(0, 2) + ' ' + digits.slice(2, 3) + ' ' + digits.slice(3, 7) + ' ' + digits.slice(7, 11);
}

function cleanPhone(display: string): string {
  // Extrae solo +56XXXXXXXXX
  const digits = display.replace(/\D/g, '');
  return digits ? '+' + digits : '';
}

export default function Step1Personal({ data, onChange, onNext }: Props) {
  const [phoneDisplay, setPhoneDisplay] = useState(() => formatPhoneDisplay(data.client_phone || '+56'));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!data.client_name.trim() || data.client_name.trim().length < 3) {
      errs.name = 'El nombre debe tener al menos 3 caracteres';
    }
    if (data.client_name.length > 100) {
      errs.name = 'El nombre no puede superar 100 caracteres';
    }

    if (!EMAIL_REGEX.test(data.client_email)) {
      errs.email = 'Ingresa un correo electrónico válido';
    }

    const phone = cleanPhone(phoneDisplay);
    if (!PHONE_REGEX.test(phone)) {
      errs.phone = 'Ingresa un número chileno válido (+56 X XXXX XXXX)';
    }

    if (!data.consent_accepted) {
      errs.consent = 'Debes aceptar el tratamiento de datos';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handlePhoneChange(value: string) {
    // Solo permitir dígitos y +
    let digits = value.replace(/[^\d]/g, '');

    // Siempre empieza con 56
    if (!digits.startsWith('56')) {
      digits = '56' + digits.replace(/^56?/, '');
    }

    // Máximo 11 dígitos (56 + 9 dígitos)
    digits = digits.slice(0, 11);

    const formatted = formatPhoneDisplay('+' + digits);
    setPhoneDisplay(formatted);
    onChange({ client_phone: '+' + digits });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onNext();
  }

  const canContinue =
    data.client_name.trim().length >= 3 &&
    EMAIL_REGEX.test(data.client_email) &&
    PHONE_REGEX.test(cleanPhone(phoneDisplay)) &&
    data.consent_accepted;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre completo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.client_name}
          onChange={(e) => {
            if (e.target.value.length <= 100) {
              onChange({ client_name: e.target.value });
            }
          }}
          placeholder="Juan Pérez"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
            errors.name ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correo electrónico <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={data.client_email}
          onChange={(e) => {
            if (e.target.value.length <= 255) {
              onChange({ client_email: e.target.value });
            }
          }}
          placeholder="juan@correo.com"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
            errors.email ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teléfono <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={phoneDisplay}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="+56 9 1234 5678"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
            errors.phone ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <p className="text-xs text-gray-400 mt-1">Formato: +56 9 1234 5678</p>
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>

      <div className="flex items-start gap-3">
        <input
          id="consent"
          type="checkbox"
          checked={data.consent_accepted}
          onChange={(e) => onChange({ consent_accepted: e.target.checked })}
          className="mt-1 h-4 w-4 accent-sky-400"
        />
        <label htmlFor="consent" className="text-sm text-gray-600">
          Acepto que mis datos personales (nombre, correo y teléfono) sean almacenados
          únicamente para gestionar esta solicitud de cotización, conforme a la{' '}
          <span className="font-medium">Ley 21.719</span> de Protección de Datos Personales de
          Chile. Ver{' '}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 underline hover:text-sky-700"
          >
            Política de Privacidad
          </a>.
        </label>
      </div>
      {errors.consent && <p className="text-red-500 text-xs">{errors.consent}</p>}

      <button
        type="submit"
        disabled={!canContinue}
        className="w-full bg-sky-400 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
      >
        Continuar →
      </button>
    </form>
  );
}
