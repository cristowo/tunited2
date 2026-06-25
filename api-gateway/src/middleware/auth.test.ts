import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { verifyToken, requireAdmin } from './auth';

const SECRET = 'secreto-de-test-no-usar-en-produccion';
process.env.JWT_SECRET = SECRET;

function mockRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
}

function mockReq(headers: Record<string, string> = {}) {
  return { headers } as any;
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

// ── verifyToken ────────────────────────────────────────────────────────────────

test('verifyToken: sin header Authorization → 401', () => {
  const res = mockRes();
  let nextCalled = false;
  verifyToken(mockReq(), res as any, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('verifyToken: token con firma inválida → 401', () => {
  const forged = jwt.sign({ userId: 'u1', role: 'admin' }, 'otro-secreto');
  const res = mockRes();
  let nextCalled = false;
  verifyToken(mockReq({ authorization: `Bearer ${forged}` }), res as any, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('verifyToken: token expirado → 401 con mensaje específico', () => {
  const expired = jwt.sign({ userId: 'u1', role: 'admin' }, SECRET, { expiresIn: -10 });
  const res = mockRes();
  verifyToken(mockReq({ authorization: `Bearer ${expired}` }), res as any, () => {});
  assert.equal(res.statusCode, 401);
  assert.match((res.body as any).message, /expirado/i);
});

test('verifyToken: token válido → next() y propaga identidad en headers internos', () => {
  const token = jwt.sign({ userId: 'u1', role: 'admin' }, SECRET, { expiresIn: '5m' });
  const req = mockReq({ authorization: `Bearer ${token}` });
  let nextCalled = false;
  verifyToken(req, mockRes() as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.headers['x-user-id'], 'u1');
  assert.equal(req.headers['x-user-role'], 'admin');
});

test('verifyToken: sobreescribe headers x-user-* inyectados por el cliente', () => {
  const token = jwt.sign({ userId: 'u1', role: 'viewer' }, SECRET, { expiresIn: '5m' });
  const req = mockReq({
    authorization: `Bearer ${token}`,
    'x-user-id': 'atacante',
    'x-user-role': 'admin',
  });
  verifyToken(req, mockRes() as any, () => {});
  assert.equal(req.headers['x-user-id'], 'u1');
  assert.equal(req.headers['x-user-role'], 'viewer');
});

// ── requireAdmin ───────────────────────────────────────────────────────────────

test('requireAdmin: rol admin → next()', () => {
  let nextCalled = false;
  requireAdmin(mockReq({ 'x-user-role': 'admin' }), mockRes() as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('requireAdmin: rol distinto → 403', () => {
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(mockReq({ 'x-user-role': 'viewer' }), res as any, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('requireAdmin: sin rol → 403', () => {
  const res = mockRes();
  requireAdmin(mockReq(), res as any, () => {});
  assert.equal(res.statusCode, 403);
});
