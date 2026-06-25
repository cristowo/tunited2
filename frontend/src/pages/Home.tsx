import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../hooks/useSiteContent';

const NAV_LINKS = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Quienes Somos', href: '#quienes-somos' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Portafolio', href: '#portafolio' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: content, isLoading } = useSiteContent();

  if (isLoading || !content) {
    return <div className="min-h-screen bg-white" />;
  }

  const whatsappNumber = content.whatsappNumber.replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="#inicio" className="flex items-center gap-2">
            <img src="/img/logo-229-58.png" alt="Mudanzas United" className="h-9 w-auto" />
            <span className="text-xl font-bold text-sky-600 tracking-tight">
              Mudanzas United
            </span>
          </a>

          {/* Menú escritorio */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-sky-500 transition"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/cotizar"
              className="bg-sky-400 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Cotizar
            </Link>
          </nav>

          {/* Botón hamburguesa móvil */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-600 text-2xl"
            aria-label="Abrir menú"
          >
            ☰
          </button>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <nav className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-600 hover:text-sky-500"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/cotizar"
              onClick={() => setMenuOpen(false)}
              className="block bg-sky-400 text-white text-sm font-semibold px-4 py-2 rounded-lg text-center"
            >
              Cotizar
            </Link>
          </nav>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section id="inicio" className="bg-sky-50">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              {content.hero.title}
            </h1>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a
                href="#servicios"
                className="bg-sky-400 hover:bg-sky-500 text-white font-semibold px-8 py-3 rounded-lg transition"
              >
                Conoce nuestros Servicios
              </a>
              <Link
                to="/cotizar"
                className="border border-sky-400 text-sky-600 hover:bg-sky-100 font-semibold px-8 py-3 rounded-lg transition"
              >
                Cotiza online
              </Link>
            </div>
          </div>
          <img
            src="/img/7628.png"
            alt="Equipo de mudanza trasladando muebles y cajas"
            className="w-full max-w-lg mx-auto"
          />
        </div>
      </section>

      {/* ── Quienes Somos ──────────────────────────────────────── */}
      <section id="quienes-somos" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle>Quienes Somos</SectionTitle>

          <div className="grid md:grid-cols-2 gap-10 items-center mb-14">
            <img
              src="/img/about-img.jpg"
              alt="Mudanza con camión frente a una casa"
              loading="lazy"
              className="w-full rounded-2xl"
            />
            <div>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">{content.about.intro}</p>
              <div className="space-y-6">
                {content.about.features.map((f, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="text-3xl shrink-0">{f.icon}</div>
                    <div>
                      <h3 className="font-bold text-gray-800 mb-1">{f.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{f.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{content.about.whyUsTitle}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">{content.about.whyUsText1}</p>
              <p className="text-gray-600 leading-relaxed mb-4">{content.about.whyUsText2}</p>
              <p className="text-sky-600 font-bold text-lg">Nuestro lema: {content.about.motto}</p>
            </div>
            <img
              src="/img/about-extra-1.jpg"
              alt="Equipo de mudanza cargando cajas en el camión"
              loading="lazy"
              className="w-full rounded-2xl order-1 md:order-2"
            />
          </div>
        </div>
      </section>

      {/* ── Servicios ──────────────────────────────────────────── */}
      <section id="servicios" className="bg-sky-50 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle>Servicios</SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.services.map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portafolio ─────────────────────────────────────────── */}
      <section id="portafolio" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle>Portafolio</SectionTitle>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10 -mt-6">
            Así trabajamos: embalaje profesional, carga segura y entrega puntual.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {content.portfolio.map((img, i) => (
              <img
                key={i}
                src={img.url}
                alt={img.alt}
                loading="lazy"
                className="w-full h-48 object-cover rounded-xl hover:opacity-90 transition"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Contacto ───────────────────────────────────────────── */}
      <section id="contacto" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle>Contacto</SectionTitle>
          <div className="grid sm:grid-cols-3 gap-6 text-center mb-10">
            <div className="bg-sky-50 rounded-2xl p-8">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-bold text-gray-800 mb-1">Dirección</h3>
              <p className="text-gray-500 text-sm">{content.contact.address}</p>
            </div>
            <a href={`mailto:${content.contact.email}`} className="bg-sky-50 rounded-2xl p-8 hover:bg-sky-100 transition block">
              <div className="text-3xl mb-3">✉️</div>
              <h3 className="font-bold text-gray-800 mb-1">Email</h3>
              <p className="text-sky-600 text-sm font-medium">{content.contact.email}</p>
            </a>
            <a href={content.contact.phoneHref} className="bg-sky-50 rounded-2xl p-8 hover:bg-sky-100 transition block">
              <div className="text-3xl mb-3">📞</div>
              <h3 className="font-bold text-gray-800 mb-1">Teléfono</h3>
              <p className="text-sky-600 text-sm font-medium">{content.contact.phone}</p>
            </a>
          </div>

          {/* Ubicación */}
          {content.contact.mapEmbedUrl && (
            <div className="rounded-2xl overflow-hidden shadow-sm">
              <iframe
                src={content.contact.mapEmbedUrl}
                title="Ubicación"
                width="100%"
                height="350"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-10">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Mudanzas United</h3>
            <ul className="space-y-2 text-sm">
              {content.footerValues.map((v, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-sky-400">✓</span> {v}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Accesos rápidos</h3>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-sky-400 transition">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/cotizar" className="hover:text-sky-400 transition">
                  Cotizar online
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm">
              <li>📍 {content.contact.addressFull}</li>
              <li>
                📞{' '}
                <a href={content.contact.phoneHref} className="hover:text-sky-400 transition">
                  {content.contact.phone}
                </a>
              </li>
              <li>
                ✉️{' '}
                <a href={`mailto:${content.contact.email}`} className="hover:text-sky-400 transition">
                  {content.contact.email}
                </a>
              </li>
            </ul>
            <a
              href={content.contact.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 bg-gray-800 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              Facebook
            </a>
          </div>
        </div>

        <div className="border-t border-gray-800 text-center text-xs text-gray-500 py-4 px-6">
          © {new Date().getFullYear()} Mudanzas United · Todos los derechos reservados ·{' '}
          <a href="/privacidad" className="hover:text-sky-400 underline">
            Política de Privacidad
          </a>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp */}
      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, quiero cotizar una mudanza')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition hover:scale-105"
        >
          <svg viewBox="0 0 32 32" fill="currentColor" className="w-7 h-7" aria-hidden="true">
            <path d="M16 2.933c-7.218 0-13.067 5.85-13.067 13.067 0 2.307.6 4.557 1.745 6.541L2.933 29.6l7.218-1.893a13.01 13.01 0 0 0 5.85 1.39c7.217 0 13.066-5.85 13.066-13.067S23.217 2.933 16 2.933zm0 23.787c-1.952 0-3.866-.525-5.535-1.519l-.397-.236-4.114 1.079 1.098-4.011-.26-.412a10.64 10.64 0 0 1-1.633-5.688c0-5.892 4.795-10.687 10.688-10.687 5.892 0 10.687 4.795 10.687 10.687 0 5.893-4.795 10.688-10.687 10.688zm5.861-8.005c-.321-.16-1.901-.938-2.195-1.045-.295-.107-.51-.16-.724.16-.214.321-.83 1.045-1.018 1.26-.187.214-.375.24-.696.08-.32-.16-1.355-.5-2.581-1.593-.954-.85-1.598-1.901-1.785-2.222-.187-.32-.02-.494.14-.654.145-.144.321-.374.482-.561.16-.187.213-.32.32-.535.107-.214.054-.4-.026-.561-.08-.16-.724-1.745-.992-2.39-.26-.627-.526-.542-.723-.552l-.616-.01c-.214 0-.561.08-.856.4-.294.321-1.124 1.099-1.124 2.678 0 1.58 1.151 3.106 1.311 3.32.16.214 2.265 3.459 5.488 4.851.767.331 1.366.529 1.833.677.77.245 1.47.21 2.024.128.617-.092 1.901-.777 2.169-1.527.267-.75.267-1.392.187-1.526-.08-.134-.294-.214-.615-.375z" />
          </svg>
        </a>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl font-extrabold text-gray-900 inline-block relative">
        {children}
        <span className="block h-1 w-16 bg-sky-400 rounded-full mx-auto mt-3" />
      </h2>
    </div>
  );
}
