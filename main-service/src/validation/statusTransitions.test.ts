import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, allowedTransitions, isValidStatus } from './statusTransitions';

test('flujo normal: pending → reviewed → quoted → confirmed', () => {
  assert.ok(canTransition('pending', 'reviewed'));
  assert.ok(canTransition('reviewed', 'quoted'));
  assert.ok(canTransition('quoted', 'confirmed'));
});

test('se puede cancelar desde cualquier estado no terminal', () => {
  assert.ok(canTransition('pending', 'cancelled'));
  assert.ok(canTransition('reviewed', 'cancelled'));
  assert.ok(canTransition('quoted', 'cancelled'));
  assert.ok(canTransition('confirmed', 'cancelled'));
});

test('no se permite retroceder', () => {
  assert.ok(!canTransition('quoted', 'pending'));
  assert.ok(!canTransition('confirmed', 'reviewed'));
});

test('no se permite saltarse la cotización: reviewed no pasa directo a confirmed', () => {
  assert.ok(!canTransition('reviewed', 'confirmed'));
  assert.ok(!canTransition('pending', 'confirmed'));
});

test('cancelled es terminal', () => {
  assert.deepEqual(allowedTransitions('cancelled'), []);
  assert.ok(!canTransition('cancelled', 'pending'));
});

test('isValidStatus distingue estados válidos', () => {
  assert.ok(isValidStatus('pending'));
  assert.ok(!isValidStatus('archived'));
  assert.ok(!isValidStatus(null));
  assert.ok(!isValidStatus(42));
});
