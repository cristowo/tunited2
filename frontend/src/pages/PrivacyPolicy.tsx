import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-sky-400 text-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight hover:text-sky-100">
            Mudanzas United
          </Link>
          <Link to="/" className="text-sm underline hover:text-sky-100">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 prose-sm text-gray-700 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Política de Privacidad</h1>
          <p className="text-sm text-gray-400">
            Conforme a la Ley 21.719 de Protección de Datos Personales de Chile
          </p>
        </div>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">1. Responsable del tratamiento</h2>
          <p>
            Transportes United (en adelante, "Mudanzas United"), con domicilio en Los Tuliperos
            2197, Macúl, Santiago, Región Metropolitana, Chile, es responsable del tratamiento de
            los datos personales recolectados a través de este sitio web. Contacto:{' '}
            <a href="mailto:ventas@tunited.cl" className="text-sky-600 hover:underline">
              ventas@tunited.cl
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">2. Datos que recolectamos</h2>
          <p>Al solicitar una cotización recolectamos únicamente los datos necesarios para gestionarla:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nombre completo</li>
            <li>Correo electrónico</li>
            <li>Número de teléfono</li>
            <li>Direcciones de origen y destino de la mudanza</li>
            <li>Detalle de los bienes a trasladar y fecha estimada</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">3. Finalidad del tratamiento</h2>
          <p>
            Los datos se utilizan <strong>exclusivamente</strong> para gestionar la cotización
            solicitada: evaluar el servicio, preparar el presupuesto y comunicarnos contigo durante
            el proceso. No utilizamos tus datos con fines publicitarios ni los compartimos con
            terceros, salvo obligación legal.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">4. Plazo de conservación</h2>
          <p>
            Conservamos los datos solo mientras sean necesarios para la gestión de tu cotización y
            del servicio contratado. Las cotizaciones canceladas se eliminan periódicamente de
            nuestros sistemas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">5. Tus derechos</h2>
          <p>La Ley 21.719 te reconoce los derechos de acceso, rectificación, supresión, oposición y portabilidad. Puedes ejercerlos en cualquier momento:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Acceso:</strong> conocer qué datos tuyos almacenamos.
            </li>
            <li>
              <strong>Rectificación:</strong> corregir datos inexactos.
            </li>
            <li>
              <strong>Supresión:</strong> solicitar la eliminación completa de tus datos.
            </li>
          </ul>
          <p className="mt-2">
            Para ejercer cualquiera de estos derechos escríbenos a{' '}
            <a href="mailto:ventas@tunited.cl" className="text-sky-600 hover:underline">
              ventas@tunited.cl
            </a>{' '}
            indicando tu nombre y el correo con que solicitaste la cotización. Responderemos dentro
            de los plazos legales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">6. Seguridad</h2>
          <p>
            Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado de las
            comunicaciones (HTTPS), control de acceso restringido al personal autorizado y
            almacenamiento en infraestructura protegida.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">7. Cambios a esta política</h2>
          <p>
            Cualquier cambio a esta política será publicado en esta misma página. Última
            actualización: junio de 2026.
          </p>
        </section>
      </main>

      <footer className="bg-sky-400 text-white text-center text-sm py-6">
        © {new Date().getFullYear()} Mudanzas United · Todos los derechos reservados
      </footer>
    </div>
  );
}
