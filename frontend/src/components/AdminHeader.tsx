import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LINKS = [
  { to: '/admin', label: 'Cotizaciones' },
  { to: '/admin/catalogo', label: 'Catálogo' },
  { to: '/admin/contenido', label: 'Contenido' },
  { to: '/admin/cuenta', label: 'Cuenta' },
];

export default function AdminHeader({ title }: { title?: string }) {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="bg-sky-400 text-white shadow px-6 py-4 flex flex-wrap items-center gap-4">
      <h1 className="text-xl font-bold">{title ?? 'Panel de Administración'}</h1>
      <nav className="flex gap-4 ml-auto items-center text-sm">
        {LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`hover:text-sky-100 transition ${
              pathname === link.to ? 'font-bold underline' : ''
            }`}
          >
            {link.label}
          </Link>
        ))}
        <button onClick={logout} className="underline hover:text-sky-100">
          Cerrar sesión
        </button>
      </nav>
    </header>
  );
}
