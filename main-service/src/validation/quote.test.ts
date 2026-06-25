import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuotePayload, MAX_ITEMS } from './quote';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

function validPayload(overrides: Record<string, any> = {}) {
  return {
    client_name: '  María José Pérez  ',
    client_email: 'Maria@Correo.cl',
    client_phone: '+56912345678',
    origin_address: 'Av. Siempre Viva 742, Santiago',
    dest_address: 'Los Tuliperos 2197, Macúl',
    origin_truck_distance_m: 10,
    dest_truck_distance_m: 0,
    consent_accepted: true,
    items: [{ item_id: VALID_UUID, quantity: 2, is_fragile: false }],
    ...overrides,
  };
}

function expectError(payload: any, fragment: string) {
  const result = validateQuotePayload(payload);
  assert.ok('error' in result, `esperaba error que contenga "${fragment}"`);
  assert.match((result as { error: string }).error, new RegExp(fragment, 'i'));
}

test('acepta un payload válido y normaliza los datos', () => {
  const result = validateQuotePayload(validPayload());
  assert.ok('data' in result);
  const data = (result as any).data;
  assert.equal(data.client_name, 'María José Pérez');           // trim
  assert.equal(data.client_email, 'maria@correo.cl');           // lowercase
  assert.deepEqual(data.catalogItemIds, [VALID_UUID]);
  assert.equal(data.items[0].custom_name, null);
});

test('rechaza nombre muy corto', () => {
  expectError(validPayload({ client_name: 'Jo' }), 'nombre');
});

test('rechaza email inválido', () => {
  expectError(validPayload({ client_email: 'no-es-email' }), 'correo');
});

test('rechaza teléfono no chileno', () => {
  expectError(validPayload({ client_phone: '+1555123456' }), 'teléfono');
});

test('rechaza fecha en el pasado', () => {
  expectError(validPayload({ move_date: '2020-01-01' }), 'fecha');
});

test('rechaza distancia al camión fuera del selector', () => {
  expectError(validPayload({ origin_truck_distance_m: 33 }), 'distancia');
});

test('rechaza piso fuera de rango en departamento', () => {
  expectError(
    validPayload({ origin_is_apartment: true, origin_floor: 99 }),
    'piso'
  );
});

test('rechaza sin consentimiento', () => {
  expectError(validPayload({ consent_accepted: false }), 'consentimiento');
});

test('rechaza sin ítems', () => {
  expectError(validPayload({ items: [] }), 'ítem');
});

test('rechaza más del máximo de ítems', () => {
  const items = Array.from({ length: MAX_ITEMS + 1 }, () => ({
    item_id: VALID_UUID,
    quantity: 1,
  }));
  expectError(validPayload({ items }), `${MAX_ITEMS}`);
});

test('rechaza ítem con item_id y custom_name a la vez', () => {
  expectError(
    validPayload({ items: [{ item_id: VALID_UUID, custom_name: 'Caja', quantity: 1 }] }),
    'a la vez'
  );
});

test('rechaza item_id que no es UUID (previene inyección)', () => {
  expectError(
    validPayload({ items: [{ item_id: "1' OR '1'='1", quantity: 1 }] }),
    'formato inválido'
  );
});

test('rechaza custom_m3 no numérico o desproporcionado', () => {
  expectError(
    validPayload({ items: [{ custom_name: 'Piano', custom_m3: 'abc', quantity: 1 }] }),
    'm³'
  );
  expectError(
    validPayload({ items: [{ custom_name: 'Piano', custom_m3: 99999, quantity: 1 }] }),
    'm³'
  );
});

test('rechaza cantidad no entera o fuera de rango', () => {
  expectError(validPayload({ items: [{ item_id: VALID_UUID, quantity: 0 }] }), 'cantidad');
  expectError(validPayload({ items: [{ item_id: VALID_UUID, quantity: 2.5 }] }), 'cantidad');
  expectError(validPayload({ items: [{ item_id: VALID_UUID, quantity: 51 }] }), 'cantidad');
});

test('rechaza notas de ítem demasiado largas', () => {
  expectError(
    validPayload({ items: [{ custom_name: 'Caja', quantity: 1, notes: 'x'.repeat(201) }] }),
    'notas'
  );
});

test('acepta ítem personalizado con m3 y notas válidos', () => {
  const result = validateQuotePayload(
    validPayload({
      items: [{ custom_name: '  Piano de cola  ', custom_m3: 4.5, quantity: 1, is_fragile: true, notes: 'Muy pesado' }],
    })
  );
  assert.ok('data' in result);
  const item = (result as any).data.items[0];
  assert.equal(item.custom_name, 'Piano de cola');
  assert.equal(item.custom_m3, 4.5);
  assert.equal(item.is_fragile, true);
  assert.equal(item.notes, 'Muy pesado');
});
