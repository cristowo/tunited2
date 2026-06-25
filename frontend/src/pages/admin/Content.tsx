import { useEffect, useState } from 'react';
import { useSiteContent, useUpdateSiteContent, useUploadContentImage } from '../../hooks/useSiteContent';
import { AboutFeature, PortfolioImage, ServiceItem, SiteContent } from '../../types';
import AdminHeader from '../../components/AdminHeader';

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400';
const textareaClass = `${inputClass} resize-y`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

// Editor genérico para listas de { icon, title, text } — usado en
// "Quiénes somos → features" y en "Servicios"
function FeatureListEditor({
  items,
  onChange,
  max,
}: {
  items: AboutFeature[] | ServiceItem[];
  onChange: (items: AboutFeature[]) => void;
  max: number;
}) {
  function update(i: number, fields: Partial<AboutFeature>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...fields } : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    if (items.length >= max) return;
    onChange([...items, { icon: '✨', title: '', text: '' }]);
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 grid sm:grid-cols-[80px_1fr] gap-3">
          <input
            value={item.icon}
            onChange={(e) => update(i, { icon: e.target.value.slice(0, 20) })}
            className={`${inputClass} text-center text-lg`}
            placeholder="🙂"
          />
          <div className="space-y-2">
            <input
              value={item.title}
              onChange={(e) => update(i, { title: e.target.value.slice(0, 100) })}
              className={inputClass}
              placeholder="Título"
            />
            <textarea
              value={item.text}
              onChange={(e) => update(i, { text: e.target.value.slice(0, 500) })}
              className={textareaClass}
              rows={2}
              placeholder="Texto"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-red-500 hover:underline"
            >
              Quitar
            </button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={add}
          className="text-sm text-sky-600 hover:underline font-medium"
        >
          + Agregar
        </button>
      )}
    </div>
  );
}

// Editor genérico para listas de strings — usado en "Valores del footer"
function StringListEditor({
  items,
  onChange,
  max,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  max: number;
  placeholder?: string;
}) {
  function update(i: number, value: string) {
    onChange(items.map((it, idx) => (idx === i ? value : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    if (items.length >= max) return;
    onChange([...items, '']);
  }

  return (
    <div className="space-y-2">
      {items.map((value, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={value}
            onChange={(e) => update(i, e.target.value.slice(0, 150))}
            className={inputClass}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-xs text-red-500 hover:underline shrink-0"
          >
            Quitar
          </button>
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={add}
          className="text-sm text-sky-600 hover:underline font-medium"
        >
          + Agregar
        </button>
      )}
    </div>
  );
}

function PortfolioEditor({
  items,
  onChange,
  max,
}: {
  items: PortfolioImage[];
  onChange: (items: PortfolioImage[]) => void;
  max: number;
}) {
  const uploadImage = useUploadContentImage();
  const [error, setError] = useState('');

  function update(i: number, fields: Partial<PortfolioImage>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...fields } : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || items.length >= max) return;
    setError('');
    try {
      const url = await uploadImage.mutateAsync(file);
      onChange([...items, { url, alt: '' }]);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al subir la imagen');
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((img, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-2 space-y-2">
            <img src={img.url} alt={img.alt} className="w-full h-32 object-cover rounded" />
            <input
              value={img.alt}
              onChange={(e) => update(i, { alt: e.target.value.slice(0, 200) })}
              className={`${inputClass} text-xs`}
              placeholder="Texto alternativo"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-red-500 hover:underline"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {items.length < max && (
        <label className="inline-block text-sm text-sky-600 hover:underline font-medium cursor-pointer">
          {uploadImage.isPending ? 'Subiendo...' : '+ Subir imagen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={uploadImage.isPending}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

export default function Content() {
  const { data, isLoading } = useSiteContent();
  const updateContent = useUpdateSiteContent();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (data && !content) setContent(data);
  }, [data, content]);

  async function handleSave() {
    if (!content) return;
    setError('');
    setSuccess('');
    try {
      await updateContent.mutateAsync(content);
      setSuccess('Cambios guardados');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al guardar los cambios');
    }
  }

  if (isLoading || !content) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Contenido del landing" />
        <p className="text-gray-500 p-8">Cargando contenido...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Contenido del landing" />

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <p className="text-sm text-gray-500">
          Edita el texto e imágenes que se muestran en{' '}
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
            la página de inicio
          </a>
          . Los cambios se publican al guardar.
        </p>

        {/* Hero */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Hero</h2>
          <Field label="Título principal">
            <input
              value={content.hero.title}
              onChange={(e) => setContent({ ...content, hero: { title: e.target.value.slice(0, 200) } })}
              className={inputClass}
            />
          </Field>
        </section>

        {/* Quiénes somos */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Quiénes somos</h2>
          <Field label="Introducción">
            <textarea
              value={content.about.intro}
              onChange={(e) => setContent({ ...content, about: { ...content.about, intro: e.target.value.slice(0, 3000) } })}
              className={textareaClass}
              rows={4}
            />
          </Field>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Características destacadas</p>
            <FeatureListEditor
              items={content.about.features}
              max={10}
              onChange={(features) => setContent({ ...content, about: { ...content.about, features } })}
            />
          </div>

          <Field label="Título “¿por qué elegirnos?”">
            <input
              value={content.about.whyUsTitle}
              onChange={(e) => setContent({ ...content, about: { ...content.about, whyUsTitle: e.target.value.slice(0, 200) } })}
              className={inputClass}
            />
          </Field>
          <Field label="Texto 1">
            <textarea
              value={content.about.whyUsText1}
              onChange={(e) => setContent({ ...content, about: { ...content.about, whyUsText1: e.target.value.slice(0, 2000) } })}
              className={textareaClass}
              rows={3}
            />
          </Field>
          <Field label="Texto 2">
            <textarea
              value={content.about.whyUsText2}
              onChange={(e) => setContent({ ...content, about: { ...content.about, whyUsText2: e.target.value.slice(0, 2000) } })}
              className={textareaClass}
              rows={2}
            />
          </Field>
          <Field label="Lema">
            <input
              value={content.about.motto}
              onChange={(e) => setContent({ ...content, about: { ...content.about, motto: e.target.value.slice(0, 200) } })}
              className={inputClass}
            />
          </Field>
        </section>

        {/* Servicios */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Servicios</h2>
          <FeatureListEditor
            items={content.services}
            max={20}
            onChange={(services) => setContent({ ...content, services: services as ServiceItem[] })}
          />
        </section>

        {/* Portafolio */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Portafolio</h2>
          <PortfolioEditor
            items={content.portfolio}
            max={30}
            onChange={(portfolio) => setContent({ ...content, portfolio })}
          />
        </section>

        {/* Footer */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Valores del footer</h2>
          <StringListEditor
            items={content.footerValues}
            max={15}
            placeholder="Ej: Excelencia operacional"
            onChange={(footerValues) => setContent({ ...content, footerValues })}
          />
        </section>

        {/* Contacto */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Contacto</h2>
          <Field label="Dirección (corta, para la tarjeta)">
            <input
              value={content.contact.address}
              onChange={(e) => setContent({ ...content, contact: { ...content.contact, address: e.target.value.slice(0, 300) } })}
              className={inputClass}
            />
          </Field>
          <Field label="Dirección completa (footer)">
            <input
              value={content.contact.addressFull}
              onChange={(e) => setContent({ ...content, contact: { ...content.contact, addressFull: e.target.value.slice(0, 400) } })}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={content.contact.email}
              onChange={(e) => setContent({ ...content, contact: { ...content.contact, email: e.target.value.slice(0, 255) } })}
              className={inputClass}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Teléfono (texto a mostrar)">
              <input
                value={content.contact.phone}
                onChange={(e) => setContent({ ...content, contact: { ...content.contact, phone: e.target.value.slice(0, 30) } })}
                className={inputClass}
              />
            </Field>
            <Field label="Teléfono (enlace, ej: tel:+56221234567)">
              <input
                value={content.contact.phoneHref}
                onChange={(e) => setContent({ ...content, contact: { ...content.contact, phoneHref: e.target.value.slice(0, 60) } })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Facebook (URL)">
            <input
              value={content.contact.facebook}
              onChange={(e) => setContent({ ...content, contact: { ...content.contact, facebook: e.target.value.slice(0, 400) } })}
              className={inputClass}
            />
          </Field>
          <Field label="WhatsApp (solo dígitos con código de país, ej: 56912345678 — vacío oculta el botón)">
            <input
              value={content.whatsappNumber}
              onChange={(e) => setContent({ ...content, whatsappNumber: e.target.value.replace(/\D/g, '').slice(0, 20) })}
              className={inputClass}
            />
          </Field>
          <Field label="Mapa — URL del iframe de Google Maps (Compartir → Insertar un mapa → copiar solo el src)">
            <input
              value={content.contact.mapEmbedUrl}
              onChange={(e) => setContent({ ...content, contact: { ...content.contact, mapEmbedUrl: e.target.value.slice(0, 2000) } })}
              className={inputClass}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
          </Field>
          {content.contact.mapEmbedUrl && (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <iframe
                src={content.contact.mapEmbedUrl}
                title="Vista previa del mapa"
                width="100%"
                height="250"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
          )}
        </section>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={updateContent.isPending}
          className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          {updateContent.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </main>
    </div>
  );
}
