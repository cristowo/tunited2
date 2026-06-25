import { useState } from 'react';
import { useAdminItems, useCreateItem, useUpdateItem } from '../../hooks/useQuotes';
import { Item } from '../../types';
import AdminHeader from '../../components/AdminHeader';

const EMPTY_FORM = { name: '', category: '', dimensions: '', description: '' };

function ItemForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: typeof EMPTY_FORM;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: typeof EMPTY_FORM) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const valid = values.name.trim().length >= 2 && values.category.trim().length >= 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(values);
      }}
      className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
    >
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
        <input
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value.slice(0, 255) })}
          placeholder="Cama King"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
        <input
          value={values.category}
          onChange={(e) => setValues({ ...values, category: e.target.value.slice(0, 100) })}
          placeholder="Dormitorio"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Dimensiones</label>
        <input
          value={values.dimensions}
          onChange={(e) => setValues({ ...values, dimensions: e.target.value.slice(0, 100) })}
          placeholder="2.00 × 1.80 m"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
        <input
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value.slice(0, 1000) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid || pending}
          className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {pending ? '...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export default function Catalog() {
  const { data: items, isLoading } = useAdminItems();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleCreate(values: typeof EMPTY_FORM) {
    setError('');
    try {
      await createItem.mutateAsync({
        name: values.name.trim(),
        category: values.category.trim(),
        dimensions: values.dimensions.trim() || undefined,
        description: values.description.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear el ítem');
    }
  }

  async function handleUpdate(item: Item, values: typeof EMPTY_FORM) {
    setError('');
    try {
      await updateItem.mutateAsync({
        id: item.id,
        data: {
          name: values.name.trim(),
          category: values.category.trim(),
          dimensions: values.dimensions.trim() || undefined,
          description: values.description.trim() || undefined,
        },
      });
      setEditingId(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al actualizar el ítem');
    }
  }

  async function toggleActive(item: Item) {
    setError('');
    try {
      await updateItem.mutateAsync({ id: item.id, data: { is_active: !item.is_active } });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al cambiar el estado del ítem');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Catálogo de ítems" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Crear */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Agregar ítem al catálogo</h2>
          <ItemForm
            initial={EMPTY_FORM}
            submitLabel="+ Agregar"
            pending={createItem.isPending}
            onSubmit={handleCreate}
          />
        </section>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Listado */}
        {isLoading ? (
          <p className="text-gray-500">Cargando catálogo...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left">Dimensiones</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items?.map((item) =>
                  editingId === item.id ? (
                    <tr key={item.id} className="bg-sky-50">
                      <td colSpan={5} className="px-4 py-4">
                        <ItemForm
                          initial={{
                            name: item.name,
                            category: item.category,
                            dimensions: item.dimensions ?? '',
                            description: item.description ?? '',
                          }}
                          submitLabel="Guardar"
                          pending={updateItem.isPending}
                          onSubmit={(values) => handleUpdate(item, values)}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id} className={`hover:bg-gray-50 ${!item.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-gray-500">{item.dimensions ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {item.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditingId(item.id)}
                          className="text-sky-500 hover:underline font-medium mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActive(item)}
                          className={`hover:underline font-medium ${
                            item.is_active ? 'text-red-400' : 'text-green-500'
                          }`}
                        >
                          {item.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Los ítems desactivados dejan de aparecer en el formulario público, pero se conservan
          porque pueden estar referenciados por cotizaciones históricas.
        </p>
      </main>
    </div>
  );
}
