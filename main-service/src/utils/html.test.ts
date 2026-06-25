import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from './html';

test('escapa los caracteres HTML peligrosos', () => {
  assert.equal(
    escapeHtml('<img src=x onerror=alert(1)>'),
    '&lt;img src=x onerror=alert(1)&gt;'
  );
});

test('escapa comillas, ampersand y apóstrofes', () => {
  assert.equal(escapeHtml(`& " '`), '&amp; &quot; &#39;');
});

test('neutraliza un intento de inyección de <script>', () => {
  const out = escapeHtml('<script>steal()</script>');
  assert.ok(!out.includes('<script>'));
  assert.equal(out, '&lt;script&gt;steal()&lt;/script&gt;');
});

test('deja intacto un nombre normal', () => {
  assert.equal(escapeHtml('María José Pérez'), 'María José Pérez');
});

test('maneja null/undefined como cadena vacía', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});
