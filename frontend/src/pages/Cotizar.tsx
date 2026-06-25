import { Link } from 'react-router-dom';
import QuoteForm from '../components/QuoteForm';

export default function Cotizar() {
  return (
    <div className="min-h-screen bg-sky-50">
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/img/logo-229-58.png" alt="Mudanzas United" className="h-9 w-auto" />
            <span className="text-xl font-bold text-sky-600 tracking-tight">
              Mudanzas United
            </span>
          </Link>
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-sky-500 transition">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <section className="py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 inline-block relative">
              Cotiza tu mudanza
              <span className="block h-1 w-16 bg-sky-400 rounded-full mx-auto mt-3" />
            </h1>
            <p className="text-gray-500 mt-4">
              Completa el formulario y te contactamos a la brevedad con un presupuesto
              personalizado.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
            <QuoteForm />
          </div>
        </div>
      </section>
    </div>
  );
}
