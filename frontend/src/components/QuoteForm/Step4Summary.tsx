import { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { QuoteFormData, SelectedCatalogItem, SelectedCustomItem } from '../../types';
import { createQuote } from '../../services/quotes';
import { trackFunnelEvent } from '../../services/funnel';

interface Props {
  data: QuoteFormData;
  onBack: () => void;
  onSuccess: () => void;
  funnelSessionId: string;
}

const TRUCK_DISTANCE_LABELS: Record<number, string> = {
  0: 'Puerta directa',
  10: 'Hasta 10 metros',
  20: 'Hasta 20 metros',
  50: 'Hasta 50 metros',
  99: 'Más de 50 metros',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium text-right max-w-xs">{value}</span>
    </div>
  );
}

function LocationSummary({ label, prefix, data }: { label: string; prefix: 'origin' | 'dest'; data: QuoteFormData }) {
  const address = data[`${prefix}_address`] as string;
  const isApartment = data[`${prefix}_is_apartment`] as boolean;
  const floor = data[`${prefix}_floor`] as number;
  const elevator = data[`${prefix}_elevator`] as boolean;
  const distance = data[`${prefix}_truck_distance_m`] as number;

  return (
    <div>
      <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">{label}</p>
      <Row label="Dirección" value={address} />
      <Row label="Distancia al camión" value={TRUCK_DISTANCE_LABELS[distance] ?? `${distance} m`} />
      {isApartment && (
        <>
          <Row label="Piso" value={floor || '—'} />
          <Row label="Ascensor" value={elevator ? 'Sí' : 'No'} />
        </>
      )}
      {!isApartment && <Row label="Tipo" value="Casa" />}
    </div>
  );
}

export default function Step4Summary({ data, onBack, onSuccess, funnelSessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  async function downloadExcel() {
    // Import dinámico: xlsx pesa ~400 KB y solo se necesita si el usuario descarga
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Hoja 1: datos del cliente
    const clientRows = [
      ['Nombre', data.client_name],
      ['Email', data.client_email],
      ['Teléfono', data.client_phone],
      ['Fecha de mudanza', data.move_date],
      [''],
      ['ORIGEN'],
      ['Dirección', data.origin_address],
      ['Tipo', data.origin_is_apartment ? 'Departamento' : 'Casa'],
      ...(data.origin_is_apartment
        ? [
            ['Piso', data.origin_floor],
            ['Ascensor', data.origin_elevator ? 'Sí' : 'No'],
          ]
        : []),
      ['Distancia al camión', TRUCK_DISTANCE_LABELS[data.origin_truck_distance_m] ?? `${data.origin_truck_distance_m} m`],
      [''],
      ['DESTINO'],
      ['Dirección', data.dest_address],
      ['Tipo', data.dest_is_apartment ? 'Departamento' : 'Casa'],
      ...(data.dest_is_apartment
        ? [
            ['Piso', data.dest_floor],
            ['Ascensor', data.dest_elevator ? 'Sí' : 'No'],
          ]
        : []),
      ['Distancia al camión', TRUCK_DISTANCE_LABELS[data.dest_truck_distance_m] ?? `${data.dest_truck_distance_m} m`],
      ...(data.notes ? [[''], ['Notas', data.notes]] : []),
    ];

    const wsClient = XLSX.utils.aoa_to_sheet(clientRows);
    XLSX.utils.book_append_sheet(wb, wsClient, 'Datos');

    // Hoja 2: ítems
    const itemRows: (string | number)[][] = [
      ['Ítem', 'Categoría', 'Cantidad', 'Frágil'],
    ];

    for (const item of data.items) {
      if (item.type === 'catalog') {
        const ci = item as SelectedCatalogItem;
        itemRows.push([ci.name, ci.category, ci.quantity, ci.is_fragile ? 'Sí' : 'No']);
      } else {
        const ci = item as SelectedCustomItem;
        itemRows.push([ci.custom_name, 'Personalizado', ci.quantity, ci.is_fragile ? 'Sí' : 'No']);
      }
    }

    const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Ítems');

    XLSX.writeFile(wb, `cotizacion_${data.client_name.replace(/\s+/g, '_')}.xlsx`);
  }

  async function handleSubmit() {
    if (!captchaToken || loading) return;
    setError('');
    setLoading(true);

    try {
      const payload = {
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        move_date: data.move_date,
        origin_address: data.origin_address,
        origin_is_apartment: data.origin_is_apartment,
        origin_floor: data.origin_floor,
        origin_elevator: data.origin_elevator,
        origin_truck_distance_m: data.origin_truck_distance_m,
        dest_address: data.dest_address,
        dest_is_apartment: data.dest_is_apartment,
        dest_floor: data.dest_floor,
        dest_elevator: data.dest_elevator,
        dest_truck_distance_m: data.dest_truck_distance_m,
        notes: data.notes,
        consent_accepted: data.consent_accepted,
        consent_text: 'Acepto que mis datos sean almacenados para gestionar esta cotización.',
        captcha_token: captchaToken,
        items: data.items.map((item) => {
          if (item.type === 'catalog') {
            return {
              item_id: item.item_id,
              quantity: item.quantity,
              is_fragile: item.is_fragile,
            };
          } else {
            return {
              custom_name: item.custom_name,
              custom_m3: item.custom_m3,
              quantity: item.quantity,
              is_fragile: item.is_fragile,
              notes: item.notes,
            };
          }
        }),
      };

      await createQuote(payload);
      sessionStorage.removeItem('quoteFormDraft');
      trackFunnelEvent(funnelSessionId, 3, 'submitted');
      onSuccess();
    } catch {
      setError('Ocurrió un error al enviar la cotización. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Datos personales */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-1">
        <h3 className="font-semibold text-gray-800 mb-3">Datos personales</h3>
        <Row label="Nombre" value={data.client_name} />
        <Row label="Email" value={data.client_email} />
        <Row label="Teléfono" value={data.client_phone} />
        <Row label="Fecha de mudanza" value={data.move_date || '—'} />
      </section>

      {/* Ubicaciones */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Ubicaciones</h3>
        <LocationSummary label="Origen" prefix="origin" data={data} />
        <LocationSummary label="Destino" prefix="dest" data={data} />
        {data.notes && <Row label="Notas" value={data.notes} />}
      </section>

      {/* Ítems */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3">
          Ítems a mover ({data.items.reduce((s, i) => s + i.quantity, 0)} en total)
        </h3>
        <div className="space-y-1">
          {data.items.map((item, i) => {
            if (item.type === 'catalog') {
              const ci = item as SelectedCatalogItem;
              return (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-800">{ci.name} <span className="text-gray-400">({ci.category})</span></span>
                  <span className="text-gray-600">
                    x{ci.quantity}{ci.is_fragile && <span className="ml-2 text-amber-600 text-xs">Frágil</span>}
                  </span>
                </div>
              );
            } else {
              const ci = item as SelectedCustomItem;
              return (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-800">{ci.custom_name} <span className="text-gray-400">(Personalizado)</span></span>
                  <span className="text-gray-600">
                    x{ci.quantity}{ci.is_fragile && <span className="ml-2 text-amber-600 text-xs">Frágil</span>}
                  </span>
                </div>
              );
            }
          })}
        </div>
      </section>

      {/* CAPTCHA */}
      <div className="flex justify-center">
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
          onChange={setCaptchaToken}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="button"
        onClick={downloadExcel}
        className="w-full border border-sky-400 text-sky-600 hover:bg-sky-50 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        Descargar resumen en Excel
      </button>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-lg transition"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !captchaToken}
          className="flex-1 bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
        >
          {loading ? 'Enviando...' : 'Enviar cotización'}
        </button>
      </div>
    </div>
  );
}
