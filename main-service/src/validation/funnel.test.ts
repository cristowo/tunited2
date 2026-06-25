import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFunnelEvent, MAX_STEP } from './funnel';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

function validPayload(overrides: Record<string, any> = {}) {
  return {
    session_id: VALID_UUID,
    step: 0,
    event: 'step_viewed',
    ...overrides,
  };
}

function expectError(payload: any, fragment: string) {
  const result = validateFunnelEvent(payload);
  assert.ok('error' in result, `esperaba error que contenga "${fragment}"`);
  assert.match((result as { error: string }).error, new RegExp(fragment, 'i'));
}

test('acepta un payload válido', () => {
  const result = validateFunnelEvent(validPayload());
  assert.ok('data' in result);
  const data = (result as any).data;
  assert.equal(data.session_id, VALID_UUID);
  assert.equal(data.step, 0);
  assert.equal(data.event, 'step_viewed');
});

test('acepta event "submitted" en el último paso', () => {
  const result = validateFunnelEvent(validPayload({ step: MAX_STEP, event: 'submitted' }));
  assert.ok('data' in result);
});

test('rechaza session_id que no es UUID', () => {
  expectError(validPayload({ session_id: 'no-es-uuid' }), 'session_id');
});

test('rechaza step fuera de rango', () => {
  expectError(validPayload({ step: MAX_STEP + 1 }), 'step');
});

test('rechaza step no entero', () => {
  expectError(validPayload({ step: 1.5 }), 'step');
});

test('rechaza event desconocido', () => {
  expectError(validPayload({ event: 'algo_raro' }), 'event');
});
