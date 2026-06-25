import { useItems } from '../../hooks/useQuotes';
import { QuoteFormData, SelectedItem } from '../../types';
import ItemSelector from '../ItemSelector';

interface Props {
  data: QuoteFormData;
  onChange: (fields: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Items({ data, onChange, onNext, onBack }: Props) {
  const { data: catalog, isLoading } = useItems();

  const totalItems = data.items.reduce((sum, s) => sum + s.quantity, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (totalItems > 0) onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-gray-500">
        Selecciona los muebles e ítems que necesitas mover. Abre cada categoría para ver las opciones.
      </p>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Cargando catálogo...</div>
      ) : catalog ? (
        <ItemSelector
          catalog={catalog}
          selected={data.items}
          onChange={(items: SelectedItem[]) => onChange({ items })}
        />
      ) : (
        <p className="text-red-500 text-sm">No se pudo cargar el catálogo. Intenta recargar la página.</p>
      )}

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
          disabled={totalItems === 0}
          className="flex-1 bg-sky-400 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
        >
          Ver resumen →
        </button>
      </div>
    </form>
  );
}
