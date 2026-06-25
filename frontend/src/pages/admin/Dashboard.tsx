import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminQuotes, useMetrics, useFunnelMetrics } from '../../hooks/useQuotes';
import { QuoteStatus } from '../../types';
import AdminHeader from '../../components/AdminHeader';

const FUNNEL_LABELS = ['Datos personales', 'Detalles de mudanza', 'Ítems', 'Resumen'];

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

const METRIC_ORDER: QuoteStatus[] = ['pending', 'reviewed', 'quoted', 'confirmed', 'cancelled'];

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminQuotes({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
  });

  const { data: metrics } = useMetrics();
  const { data: funnel } = useFunnelMetrics();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleFilterStatus(s: string) {
    setStatusFilter(s);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Panel de Administración" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Métricas */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl shadow p-4 text-center col-span-2 sm:col-span-1 lg:col-span-1">
              <p className="text-3xl font-bold text-sky-500">{metrics.total ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total</p>
            </div>
            {METRIC_ORDER.map((s) => (
              <div key={s} className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-3xl font-bold text-gray-800">{metrics[s] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{STATUS_LABELS[s]}</p>
              </div>
            ))}
          </div>
        )}

        {/* Embudo del cotizador */}
        {funnel && (
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Embudo del cotizador
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {FUNNEL_LABELS.map((label, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-bold text-sky-500">{funnel.steps[i] ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{funnel.submitted}</p>
                <p className="text-xs text-gray-500 mt-1">Enviado</p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-wrap gap-2">
            {(['', ...METRIC_ORDER] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  statusFilter === s
                    ? 'bg-sky-400 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:border-sky-400'
                }`}
              >
                {s ? STATUS_LABELS[s] : 'Todas'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 w-56"
            />
            <button
              type="submit"
              className="bg-sky-400 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-sm"
            >
              Buscar
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* Tabla */}
        {isLoading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Origen → Destino</th>
                  <th className="px-4 py-3 text-left">Fecha mudanza</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Precio est.</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No se encontraron cotizaciones
                    </td>
                  </tr>
                )}
                {data?.data.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{q.client_name}</div>
                      <div className="text-gray-400 text-xs">{q.client_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                      {q.origin_address} → {q.dest_address}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{q.move_date ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[q.status]}`}>
                        {STATUS_LABELS[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {q.estimated_price
                        ? `$${Number(q.estimated_price).toLocaleString('es-CL')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/quotes/${q.id}`}
                        className="text-sky-500 hover:underline font-medium"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {data && data.meta.total > data.meta.limit && (
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Mostrando {(page - 1) * data.meta.limit + 1}–
              {Math.min(page * data.meta.limit, data.meta.total)} de {data.meta.total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <button
                disabled={page * data.meta.limit >= data.meta.total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
