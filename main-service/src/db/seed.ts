import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { SiteContentData } from '../validation/siteContent';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// El seed es una operación de bootstrap: se conecta como superuser (POSTGRES_USER),
// que bypasea RLS. La política items_insert exige contexto admin, por lo que el
// usuario app_service no puede sembrar el catálogo.
const pool = new Pool({
  host:     process.env.POSTGRES_HOST || 'localhost',
  port:     Number(process.env.POSTGRES_PORT) || 5432,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_MAIN_DB,
});

interface SeedItem {
  category: string;
  name: string;
  dimensions?: string;
  description?: string;
}

const items: SeedItem[] = [
  // Dormitorio
  { category: 'Dormitorio', name: 'Cama 1 plaza',      dimensions: '0.90 × 1.90 m' },
  { category: 'Dormitorio', name: 'Cama 2 plazas',     dimensions: '1.40 × 1.90 m' },
  { category: 'Dormitorio', name: 'Cama Queen',        dimensions: '1.60 × 2.00 m' },
  { category: 'Dormitorio', name: 'Cama King',         dimensions: '2.00 × 2.00 m' },
  { category: 'Dormitorio', name: 'Velador',           dimensions: '0.50 × 0.45 m' },
  { category: 'Dormitorio', name: 'Cómoda',            dimensions: '1.00 × 0.50 m' },
  { category: 'Dormitorio', name: 'Guardarropa 2 puertas', dimensions: '1.20 × 0.60 m' },
  { category: 'Dormitorio', name: 'Guardarropa 3 puertas', dimensions: '1.80 × 0.60 m' },
  { category: 'Dormitorio', name: 'Escritorio',        dimensions: '1.20 × 0.60 m' },
  { category: 'Dormitorio', name: 'Silla de escritorio' },

  // Living
  { category: 'Living', name: 'Sofá 2 cuerpos',        dimensions: '1.60 × 0.85 m' },
  { category: 'Living', name: 'Sofá 3 cuerpos',        dimensions: '2.10 × 0.85 m' },
  { category: 'Living', name: 'Sofá esquinero',        dimensions: '2.50 × 2.00 m' },
  { category: 'Living', name: 'Sillón individual',     dimensions: '0.90 × 0.85 m' },
  { category: 'Living', name: 'Mesa de centro',        dimensions: '1.10 × 0.60 m' },
  { category: 'Living', name: 'Rack / mueble TV',      dimensions: '1.50 × 0.45 m' },
  { category: 'Living', name: 'Televisor hasta 50"',   dimensions: '1.15 × 0.70 m' },
  { category: 'Living', name: 'Televisor 55" o más',   dimensions: '1.30 × 0.80 m' },
  { category: 'Living', name: 'Biblioteca / estantería', dimensions: '0.80 × 1.80 m' },

  // Comedor
  { category: 'Comedor', name: 'Mesa comedor 4 personas', dimensions: '1.20 × 0.80 m' },
  { category: 'Comedor', name: 'Mesa comedor 6 personas', dimensions: '1.60 × 0.90 m' },
  { category: 'Comedor', name: 'Mesa comedor 8 personas', dimensions: '2.00 × 1.00 m' },
  { category: 'Comedor', name: 'Silla de comedor' },
  { category: 'Comedor', name: 'Vitrina / vajillero',  dimensions: '1.00 × 0.40 m' },
  { category: 'Comedor', name: 'Aparador / buffet',    dimensions: '1.20 × 0.45 m' },

  // Cocina
  { category: 'Cocina', name: 'Refrigerador 1 puerta', dimensions: '0.60 × 0.65 m' },
  { category: 'Cocina', name: 'Refrigerador 2 puertas', dimensions: '0.70 × 0.75 m' },
  { category: 'Cocina', name: 'Lavadora',              dimensions: '0.60 × 0.60 m' },
  { category: 'Cocina', name: 'Secadora',              dimensions: '0.60 × 0.60 m' },
  { category: 'Cocina', name: 'Lavavajillas',          dimensions: '0.60 × 0.60 m' },
  { category: 'Cocina', name: 'Microondas' },
  { category: 'Cocina', name: 'Horno eléctrico de mesón' },

  // Oficina
  { category: 'Oficina', name: 'Escritorio grande',    dimensions: '1.60 × 0.80 m' },
  { category: 'Oficina', name: 'Silla ergonómica' },
  { category: 'Oficina', name: 'Archivador metálico',  dimensions: '0.47 × 0.62 m' },
  { category: 'Oficina', name: 'Impresora de escritorio' },

  // Otros
  { category: 'Otros', name: 'Bicicleta' },
  { category: 'Otros', name: 'Bicicleta estática / cinta' },
  { category: 'Otros', name: 'Colchón 1 plaza',        dimensions: '0.90 × 1.90 m', description: 'Sin base' },
  { category: 'Otros', name: 'Colchón 2 plazas',       dimensions: '1.40 × 1.90 m', description: 'Sin base' },
  { category: 'Otros', name: 'Planta grande (macetero)' },
  { category: 'Otros', name: 'Caja mediana',           dimensions: '0.40 × 0.30 × 0.30 m' },
  { category: 'Otros', name: 'Caja grande',            dimensions: '0.60 × 0.40 × 0.40 m' },
  { category: 'Otros', name: 'Maleta de viaje' },
];

// Contenido inicial del landing — mismo texto que estaba hardcodeado en
// Home.tsx antes de hacerlo editable desde el panel admin.
const INITIAL_SITE_CONTENT: SiteContentData = {
  hero: { title: '¡Brindamos el mejor servicio para realizar tu mudanza!' },
  about: {
    intro:
      'Transportes United es una entidad dedicada al transporte con más de 15 años de ' +
      'experiencia. Cuenta con dos divisiones United Cargo y United Movers, esta última ' +
      'dedicada al traslado de mudanzas dentro y fuera de la Región Metropolitana.',
    features: [
      { icon: '🏷️', title: 'Presupuesto sin Costo', text: 'Con una vasta experiencia en el rubro, Mudanzas United visita el hogar, empresa u oficina para hacer un presupuesto sin costo alguno.' },
      { icon: '👷', title: 'Personal Especializado', text: 'Nuestro equipo calificado se esfuerza por garantizar su satisfacción, al tiempo que ofrece los más altos niveles de servicio profesional.' },
      { icon: '🕐', title: 'Atención', text: 'Para entregar un mejor servicio, contamos con horario de atención las 24 horas del día de lunes a domingo.' },
    ],
    whyUsTitle: '¿Por qué elegirnos?',
    whyUsText1:
      'Porque somos una de las empresas líderes en el área Logística, Transporte y Mudanza, ' +
      'gracias a nuestra amplia experiencia en proyectos realizados a pequeñas, medianas y ' +
      'grandes empresas. Porque conocemos y sabemos las problemáticas que se generan en la ' +
      'operación, lo que nos hace mejorar sus procesos operacionales con eficiencia y calidad.',
    whyUsText2: 'Te ayudamos a que el proceso de tu mudanza sea transparente y fácil.',
    motto: '¡Por una mudanza sin estrés!',
  },
  services: [
    { icon: '💰', title: 'El mejor Precio', text: 'Contamos con el mejor servicio precio calidad del mercado. Un ejecutivo te visitará para entregar un precio acorde a tu bolsillo.' },
    { icon: '🛡️', title: 'Tu Carga Asegurada', text: 'Para avalar su trabajo United ofrece seguros de transporte para mudanzas y carga a cada cliente con el fin de proteger los bienes que traslada.' },
    { icon: '🚚', title: 'Conductores Calificados', text: 'Seguridad en la estibación de la carga y experiencia para un servicio más seguro y libre de riesgos.' },
    { icon: '📦', title: 'Eficiencia en Proceso de Carga', text: 'Contamos con camiones propios, completamente adecuados para entregar una gran experiencia a tu mudanza.' },
    { icon: '🗺️', title: 'Cobertura Nacional', text: 'Somos especialistas en Mudanzas y Fletes con servicio en todo el país, ofrecemos nuestro servicio desde Arica a Punta Arenas.' },
    { icon: '📋', title: 'Toma de Inventario', text: 'En cada una de nuestras mudanzas, realizamos un inventario completo para garantizar y evitar inconvenientes con tus enseres.' },
  ],
  portfolio: [
    { url: '/img/portfolio/app2.jpg', alt: 'Equipo cargando cajas en el camión de mudanza' },
    { url: '/img/portfolio/web3.jpg', alt: 'Traslado de muebles embalados' },
    { url: '/img/portfolio/card1.jpg', alt: 'Embalaje profesional de muebles con film protector' },
    { url: '/img/portfolio/web1.jpg', alt: 'Entrega de caja frágil a cliente' },
    { url: '/img/portfolio/card2.jpg', alt: 'Mudanza de oficina en proceso' },
    { url: '/img/portfolio/app3.jpg', alt: 'Clientes descansando tras su mudanza' },
    { url: '/img/portfolio/web2.jpg', alt: 'Traslado seguro de enseres' },
    { url: '/img/portfolio/card3.jpg', alt: 'Camión de mudanza con carga asegurada' },
  ],
  footerValues: [
    'Excelencia operacional',
    'Cuidado medioambiental',
    'Innovación y mejora continua',
    'Compromiso y confiabilidad',
    'Responsabilidad social',
  ],
  contact: {
    address: 'Los Tuliperos 2197, Macúl',
    addressFull: 'Los Tuliperos 2197, Macúl, Santiago, RM Chile',
    email: 'ventas@tunited.cl',
    phone: '2 228 355 81',
    phoneHref: 'tel:+56222835581',
    facebook: 'https://www.facebook.com/Mudanzas-United-963014497120289/',
    mapEmbedUrl: '',
  },
  whatsappNumber: '',
};

async function seedSiteContent() {
  const result = await pool.query(
    `INSERT INTO site_content (id, content) VALUES (1, $1)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [JSON.stringify(INITIAL_SITE_CONTENT)]
  );
  if (result.rowCount && result.rowCount > 0) {
    console.log('Contenido inicial del landing creado');
  } else {
    console.log('Contenido del landing ya existía, no se modificó');
  }
}

async function seed() {
  console.log('Iniciando seed de ítems...');

  let inserted = 0;

  for (const item of items) {
    const result = await pool.query(
      `INSERT INTO items (category, name, dimensions, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (category, name) DO NOTHING
       RETURNING id`,
      [item.category, item.name, item.dimensions ?? null, item.description ?? null]
    );
    if (result.rowCount && result.rowCount > 0) inserted++;
  }

  console.log(`Seed completado: ${inserted} ítems nuevos insertados (${items.length} en total)`);

  await seedSiteContent();

  await pool.end();
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
