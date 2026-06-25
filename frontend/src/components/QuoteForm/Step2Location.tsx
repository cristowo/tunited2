import { useState } from 'react';
import { QuoteFormData } from '../../types';

interface Props {
  data: QuoteFormData;
  onChange: (fields: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const TRUCK_DISTANCES = [
  { label: 'Puerta directa (0 m)', value: 0 },
  { label: 'Hasta 10 metros', value: 10 },
  { label: 'Hasta 20 metros', value: 20 },
  { label: 'Hasta 50 metros', value: 50 },
  { label: 'Más de 50 metros', value: 99 },
];

const MAX_FLOOR = 50;
const MAX_ADDRESS_LENGTH = 300;
const MAX_NOTES_LENGTH = 500;

// Máximo 6 meses en el futuro
function getMaxDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
}

interface LocationBlockProps {
  label: string;
  prefix: 'origin' | 'dest';
  data: QuoteFormData;
  onChange: (fields: Partial<QuoteFormData>) => void;
  errors: Record<string, string>;
}

function LocationBlock({ label, prefix, data, onChange, errors }: LocationBlockProps) {
  const address = data[`${prefix}_address`] as string;
  const isApartment = data[`${prefix}_is_apartment`] as boolean;
  const floor = data[`${prefix}_floor`] as number;
  const elevator = data[`${prefix}_elevator`] as boolean;
  const truckDistance = data[`${prefix}_truck_distance_m`] as number;

  return (
    <div className="bg-sky-50 border border-sky-100 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-sky-700">{label}</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => {
            if (e.target.value.length <= MAX_ADDRESS_LENGTH) {
              onChange({ [`${prefix}_address`]: e.target.value });
            }
          }}
          placeholder="Calle, número, ciudad"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white ${
            errors[`${prefix}_address`] ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors[`${prefix}_address`] ? (
            <p className="text-red-500 text-xs">{errors[`${prefix}_address`]}</p>
          ) : <span />}
          <p className="text-xs text-gray-400">{address.length}/{MAX_ADDRESS_LENGTH}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Distancia aproximada de la entrada al camión
        </label>
        <select
          value={truckDistance}
          onChange={(e) => onChange({ [`${prefix}_truck_distance_m`]: Number(e.target.value) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          {TRUCK_DISTANCES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange({ [`${prefix}_is_apartment`]: !isApartment })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isApartment ? 'bg-sky-400' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isApartment ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-700">Es departamento</span>
      </div>

      {isApartment && (
        <div className="grid grid-cols-2 gap-4 pl-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Piso</label>
            <input
              type="number"
              min={1}
              max={MAX_FLOOR}
              value={floor || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0 && val <= MAX_FLOOR) {
                  onChange({ [`${prefix}_floor`]: val });
                }
              }}
              placeholder="Ej: 3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div className="flex items-end pb-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange({ [`${prefix}_elevator`]: !elevator })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  elevator ? 'bg-sky-400' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    elevator ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">Hay ascensor</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Step2Location({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!data.move_date) {
      errs.move_date = 'Selecciona una fecha de mudanza';
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (data.move_date < today) {
        errs.move_date = 'La fecha no puede ser en el pasado';
      }
      if (data.move_date > getMaxDate()) {
        errs.move_date = 'La fecha no puede ser mayor a 6 meses en el futuro';
      }
    }

    if (!data.origin_address.trim() || data.origin_address.trim().length < 5) {
      errs.origin_address = 'La dirección de origen debe tener al menos 5 caracteres';
    }
    if (!data.dest_address.trim() || data.dest_address.trim().length < 5) {
      errs.dest_address = 'La dirección de destino debe tener al menos 5 caracteres';
    }

    if (data.origin_is_apartment && (data.origin_floor < 1 || data.origin_floor > MAX_FLOOR)) {
      errs.origin_floor = 'Ingresa un piso válido (1-50)';
    }
    if (data.dest_is_apartment && (data.dest_floor < 1 || data.dest_floor > MAX_FLOOR)) {
      errs.dest_floor = 'Ingresa un piso válido (1-50)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const canContinue =
    data.move_date &&
    data.origin_address.trim().length >= 5 &&
    data.dest_address.trim().length >= 5;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha deseada de mudanza <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={data.move_date}
          onChange={(e) => onChange({ move_date: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
          max={getMaxDate()}
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
            errors.move_date ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.move_date && <p className="text-red-500 text-xs mt-1">{errors.move_date}</p>}
      </div>

      <LocationBlock label="Origen (desde dónde te mudas)" prefix="origin" data={data} onChange={onChange} errors={errors} />
      <LocationBlock label="Destino (hacia dónde te mudas)" prefix="dest" data={data} onChange={onChange} errors={errors} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comentarios adicionales
        </label>
        <textarea
          value={data.notes}
          onChange={(e) => {
            if (e.target.value.length <= MAX_NOTES_LENGTH) {
              onChange({ notes: e.target.value });
            }
          }}
          rows={3}
          placeholder="Acceso difícil, horario preferido, etc."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-1">{data.notes.length}/{MAX_NOTES_LENGTH}</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-lg transition"
        >
          ← Atrás
        </button>
        <button
          type="submit"
          disabled={!canContinue}
          className="flex-1 bg-sky-400 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
        >
          Continuar →
        </button>
      </div>
    </form>
  );
}
