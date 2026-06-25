import { useCallback, useEffect, useState } from 'react';
import { QuoteFormData } from '../../types';
import { trackFunnelEvent } from '../../services/funnel';
import Step1Personal from './Step1Personal';
import Step2Location from './Step2Location';
import Step3Items from './Step3Items';
import Step4Summary from './Step4Summary';

const STEPS = ['Datos personales', 'Detalles de mudanza', 'Ítems', 'Resumen'];
const STORAGE_KEY = 'quoteFormDraft';
const FUNNEL_SESSION_KEY = 'quoteFunnelSession';

function getFunnelSessionId(): string {
  let id = sessionStorage.getItem(FUNNEL_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(FUNNEL_SESSION_KEY, id);
  }
  return id;
}

const INITIAL_DATA: QuoteFormData = {
  client_name: '',
  client_email: '',
  client_phone: '',
  consent_accepted: false,
  move_date: '',
  origin_address: '',
  origin_is_apartment: false,
  origin_floor: 0,
  origin_elevator: false,
  origin_truck_distance_m: 0,
  dest_address: '',
  dest_is_apartment: false,
  dest_floor: 0,
  dest_elevator: false,
  dest_truck_distance_m: 0,
  notes: '',
  items: [],
};

function loadDraft(): { step: number; data: QuoteFormData } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.step === 'number' && parsed.data) {
      return { step: parsed.step, data: { ...INITIAL_DATA, ...parsed.data } };
    }
  } catch { /* ignore corrupt data */ }
  return null;
}

export default function QuoteForm() {
  const draft = loadDraft();
  const [step, setStep] = useState(draft?.step ?? 0);
  const [data, setData] = useState<QuoteFormData>(draft?.data ?? INITIAL_DATA);
  const [submitted, setSubmitted] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(!!draft);
  const [funnelSessionId] = useState(getFunnelSessionId);

  useEffect(() => {
    trackFunnelEvent(funnelSessionId, step, 'step_viewed');
  }, [step, funnelSessionId]);

  const saveDraft = useCallback((currentStep: number, currentData: QuoteFormData) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step: currentStep, data: currentData }));
    } catch { /* storage full, ignore */ }
  }, []);

  // Persist on every change
  useEffect(() => {
    if (!submitted) {
      saveDraft(step, data);
    }
  }, [step, data, submitted, saveDraft]);

  function update(fields: Partial<QuoteFormData>) {
    setData((prev) => ({ ...prev, ...fields }));
  }

  function next() { setStep((s) => s + 1); }
  function back() { setStep((s) => s - 1); }

  function discardDraft() {
    sessionStorage.removeItem(STORAGE_KEY);
    setData(INITIAL_DATA);
    setStep(0);
    setShowDraftBanner(false);
  }

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-5xl">✅</div>
        <h3 className="text-2xl font-bold text-gray-800">¡Cotización enviada!</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Recibimos tu solicitud. Te contactaremos a <strong>{data.client_email}</strong> a la brevedad.
        </p>
        <button
          onClick={() => { setData(INITIAL_DATA); setStep(0); setSubmitted(false); sessionStorage.removeItem(STORAGE_KEY); }}
          className="mt-4 text-sky-500 hover:underline text-sm"
        >
          Enviar otra cotización
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Banner de borrador recuperado */}
      {showDraftBanner && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            Se recuperó un borrador guardado. ¿Deseas continuar donde lo dejaste?
          </p>
          <div className="flex gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowDraftBanner(false)}
              className="text-sm text-amber-700 hover:text-amber-900 font-medium"
            >
              Continuar
            </button>
            <button
              onClick={discardDraft}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Barra de progreso */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-colors ${
                  i < step
                    ? 'bg-sky-400 text-white'
                    : i === step
                    ? 'bg-sky-400 text-white ring-4 ring-sky-100'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:block text-center ${i === step ? 'text-sky-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="relative h-1 bg-gray-200 rounded-full mt-1">
          <div
            className="absolute h-1 bg-sky-400 rounded-full transition-all duration-300"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Título del paso actual */}
      <h3 className="text-xl font-bold text-gray-800 mb-6">{STEPS[step]}</h3>

      {step === 0 && (
        <Step1Personal
          data={data}
          onChange={update}
          onNext={next}
        />
      )}
      {step === 1 && (
        <Step2Location data={data} onChange={update} onNext={next} onBack={back} />
      )}
      {step === 2 && (
        <Step3Items data={data} onChange={update} onNext={next} onBack={back} />
      )}
      {step === 3 && (
        <Step4Summary
          data={data}
          onBack={back}
          onSuccess={() => setSubmitted(true)}
          funnelSessionId={funnelSessionId}
        />
      )}
    </div>
  );
}
