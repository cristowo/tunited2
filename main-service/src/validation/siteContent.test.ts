import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSiteContent } from './siteContent';

function validPayload(overrides: Record<string, any> = {}) {
  return {
    hero: { title: 'Brindamos el mejor servicio' },
    about: {
      intro: 'Somos una empresa de mudanzas.',
      features: [{ icon: '🏷️', title: 'Presupuesto sin costo', text: 'Texto' }],
      whyUsTitle: '¿Por qué elegirnos?',
      whyUsText1: 'Porque sí',
      whyUsText2: 'Porque también',
      motto: 'Por una mudanza sin estrés',
    },
    services: [{ icon: '💰', title: 'Mejor precio', text: 'Texto' }],
    portfolio: [{ url: '/api/uploads/foo.jpg', alt: 'Foto' }],
    footerValues: ['Excelencia operacional'],
    contact: {
      address: 'Los Tuliperos 2197, Macúl',
      addressFull: 'Los Tuliperos 2197, Macúl, Santiago, RM Chile',
      email: 'ventas@tunited.cl',
      phone: '2 228 355 81',
      phoneHref: 'tel:+56222835581',
      facebook: 'https://www.facebook.com/example',
      mapEmbedUrl: '',
    },
    whatsappNumber: '56912345678',
    ...overrides,
  };
}

function expectError(payload: any, fragment: string) {
  const result = validateSiteContent(payload);
  assert.ok('error' in result, `esperaba error que contenga "${fragment}"`);
  assert.match((result as { error: string }).error, new RegExp(fragment, 'i'));
}

test('acepta un payload válido y normaliza los datos', () => {
  const result = validateSiteContent(validPayload());
  assert.ok('data' in result);
  const data = (result as any).data;
  assert.equal(data.hero.title, 'Brindamos el mejor servicio');
  assert.equal(data.contact.email, 'ventas@tunited.cl');
});

test('acepta mapEmbedUrl y email vacíos', () => {
  const result = validateSiteContent(
    validPayload({ contact: { ...validPayload().contact, email: '', mapEmbedUrl: '' } })
  );
  assert.ok('data' in result);
});

test('rechaza hero.title vacío', () => {
  expectError(validPayload({ hero: { title: '' } }), 'hero');
});

test('rechaza email con formato inválido', () => {
  expectError(
    validPayload({ contact: { ...validPayload().contact, email: 'no-es-email' } }),
    'email'
  );
});

test('rechaza whatsappNumber con caracteres no numéricos', () => {
  expectError(validPayload({ whatsappNumber: '+569-1234' }), 'whatsappNumber');
});

test('rechaza demasiados servicios', () => {
  const services = Array.from({ length: 21 }, () => ({ icon: '📦', title: 'X', text: 'Y' }));
  expectError(validPayload({ services }), 'services');
});

test('rechaza un elemento de portfolio sin url', () => {
  expectError(validPayload({ portfolio: [{ url: '', alt: 'Foto' }] }), 'portfolio');
});
