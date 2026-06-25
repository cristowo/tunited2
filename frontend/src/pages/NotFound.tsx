import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sky-50 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/img/logo-229-58.png" alt="Mudanzas United" className="h-9 w-auto" />
            <span className="text-xl font-bold text-sky-600 tracking-tight">
              Mudanzas United
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-md">
          <p className="text-6xl font-extrabold text-sky-400 mb-4">404</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Página no encontrada
          </h1>
          <p className="text-gray-500 mb-8">
            La página que buscas no existe o fue movida.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="bg-sky-400 hover:bg-sky-500 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              Volver al inicio
            </Link>
            <Link
              to="/cotizar"
              className="border border-sky-400 text-sky-600 hover:bg-sky-100 font-semibold px-6 py-3 rounded-lg transition"
            >
              Cotiza tu mudanza
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
