import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useAdminQuote,
  useUpdateStatus,
  useUpdatePrice,
  useUpdateNotes,
  useDeleteQuote,
} from '../../hooks/useQuotes';
import { QuoteStatus } from '../../types';

// Espejo de la máquina de estados del backend (main-service/src/validation/statusTransitions.ts)
const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  pending:   ['reviewed', 'quoted', 'cancelled'],
  reviewed:  ['quoted', 'cancelled'],
  quoted:    ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: [],
};

const STATUS_LABELS: Record<QuoteStatus, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisada',
  quoted: 'Cotizada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  quoted: 'bg-purple-100 text-purple-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const TRUCK_DISTANCE_LABELS: Record<number, string> = {
  0: 'Puerta directa',
  10: 'Hasta 10 m',
  20: 'Hasta 20 m',
  50: 'Hasta 50 m',
  99: 'Más de 50 m',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useAdminQuote(id!);
  const updateStatus = useUpdateStatus();
  const updatePrice = useUpdatePrice();
  const updateNotes = useUpdateNotes();
  const deleteQuote = useDeleteQuote();

  const [newStatus, setNewStatus] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <div className="p-8 text-gray-500">Cargando...</div>;
  if (!quote) return <div className="p-8 text-red-500">Cotización no encontrada</div>;

  async function handleSaveNotes() {
    await updateNotes.mutateAsync({ id: quote!.id, notes: adminNotes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleDelete() {
    await deleteQuote.mutateAsync(quote!.id);
    navigate('/admin');
  }

  const statusOptions = ALLOWED_TRANSITIONS[quote.status] ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-sky-400 text-white shadow px-6 py-4 flex items-center gap-4">
        <Link to="/admin" className="hover:underline text-sm">← Volver</Link>
        <h1 className="text-xl font-bold">Detalle de Cotización</h1>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[quote.status]}`}>
          {STATUS_LABELS[quote.status]}
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Cliente */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Datos del cliente</h2>
          <Row label="Nombre" value={quote.client_name} />
          <Row label="Email" value={quote.client_email} />
          <Row label="Teléfono" value={quote.client_phone} />
          <Row label="Fecha de mudanza" value={quote.move_date} />
          <Row
            label="Creado"
            value={new Date(quote.created_at).toLocaleString('es-CL')}
          />
        </section>

        {/* Ubicaciones */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Ubicaciones</h2>

          <div>
            <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">Origen</p>
            <Row label="Dirección" value={quote.origin_address} />
            <Row label="Tipo" value={quote.origin_is_apartment ? 'Departamento' : 'Casa'} />
            {quote.origin_is_apartment && (
              <>
                <Row label="Piso" value={quote.origin_floor} />
                <Row label="Ascensor" value={quote.origin_elevator ? 'Sí' : 'No'} />
              </>
            )}
            <Row
              label="Distancia al camión"
              value={TRUCK_DISTANCE_LABELS[quote.origin_truck_distance_m] ?? `${quote.origin_truck_distance_m} m`}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">Destino</p>
            <Row label="Dirección" value={quote.dest_address} />
            <Row label="Tipo" value={quote.dest_is_apartment ? 'Departamento' : 'Casa'} />
            {quote.dest_is_apartment && (
              <>
                <Row label="Piso" value={quote.dest_floor} />
                <Row label="Ascensor" value={quote.dest_elevator ? 'Sí' : 'No'} />
              </>
            )}
            <Row
              label="Distancia al camión"
              value={TRUCK_DISTANCE_LABELS[quote.dest_truck_distance_m] ?? `${quote.dest_truck_distance_m} m`}
            />
          </div>

          {quote.notes && <Row label="Notas del cliente" value={quote.notes} />}
        </section>

        {/* Ítems */}
        {quote.items && quote.items.length > 0 && (
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Ítems a mover ({quote.items.reduce((s, i) => s + i.quantity, 0)} unidades)
            </h2>
            <div className="divide-y divide-gray-100">
              {quote.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-gray-400 ml-2">({item.category})</span>
                    {item.custom_m3 && (
                      <span className="text-gray-400 ml-2">{item.custom_m3} m³</span>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">“{item.notes}”</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {item.is_fragile && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Frágil
                      </span>
                    )}
                    <span className="text-gray-600 font-medium">x{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Acciones */}
        <section className="bg-white rounded-xl shadow p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Gestión</h2>

          {/* Cambiar estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cambiar estado</label>
            {statusOptions.length === 0 && (
              <p className="text-sm text-gray-400">
                Estado terminal: no admite más cambios.
              </p>
            )}
            {statusOptions.length > 0 && (
            <div className="flex gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">— Seleccionar nuevo estado —</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <button
                disabled={!newStatus || updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: quote.id, status: newStatus })}
                className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm"
              >
                {updateStatus.isPending ? '...' : 'Actualizar'}
              </button>
            </div>
            )}
          </div>

          {/* Precio estimado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio estimado (CLP)
              {quote.estimated_price && (
                <span className="ml-2 text-sky-600">
                  Actual: ${Number(quote.estimated_price).toLocaleString('es-CL')}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Ej: 150000"
                min={1}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                disabled={!newPrice || updatePrice.isPending}
                onClick={() => updatePrice.mutate({ id: quote.id, price: Number(newPrice) })}
                className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm"
              >
                {updatePrice.isPending ? '...' : 'Asignar'}
              </button>
            </div>
          </div>

          {/* Notas internas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas internas</label>
            <textarea
              value={adminNotes || quote.admin_notes || ''}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Notas visibles solo para el equipo..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
            <button
              onClick={handleSaveNotes}
              disabled={updateNotes.isPending}
              className="mt-2 bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm"
            >
              {notesSaved ? '✓ Guardado' : updateNotes.isPending ? '...' : 'Guardar notas'}
            </button>
          </div>
        </section>

        {/* Eliminación de datos (Ley 21.719) */}
        <section className="bg-white rounded-xl shadow p-6 border border-red-100">
          <h2 className="text-base font-semibold text-red-600 mb-1">Eliminar cotización</h2>
          <p className="text-xs text-gray-400 mb-4">
            Borra permanentemente la cotización y todos los datos personales del cliente
            (Ley 21.719 — derecho de supresión). Esta acción no se puede deshacer.
          </p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="border border-red-300 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Eliminar datos del cliente...
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">¿Confirmas la eliminación definitiva?</span>
              <button
                onClick={handleDelete}
                disabled={deleteQuote.isPending}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {deleteQuote.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </section>

        {/* Historial de estados */}
        {(quote as any).status_log?.length > 0 && (
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Historial de estados</h2>
            <div className="space-y-2">
              {(quote as any).status_log.map((log: any) => (
                <div key={log.id} className="flex justify-between text-sm text-gray-600">
                  <span>
                    <span className="font-medium">{STATUS_LABELS[log.old_status as QuoteStatus] ?? log.old_status}</span>
                    {' → '}
                    <span className="font-medium">{STATUS_LABELS[log.new_status as QuoteStatus] ?? log.new_status}</span>
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(log.changed_at).toLocaleString('es-CL')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
