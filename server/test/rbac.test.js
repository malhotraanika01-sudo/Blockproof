import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRole, requirePermission } from '../src/middleware/rbac.js';

function runMiddleware(mw, auth) {
  return new Promise((resolve) => {
    const req = { auth };
    mw(req, {}, (err) => resolve(err));
  });
}

const head = { role: 'HEAD', permissions: new Set(['blockchain:read', 'user:manage']) };
const investigator = { role: 'INVESTIGATOR', permissions: new Set(['evidence:verify']) };
const common = { role: 'COMMON_USER', permissions: new Set(['report:create']) };

test('requireRole allows the listed role', async () => {
  assert.equal(await runMiddleware(requireRole('HEAD'), head), undefined);
});

test('requireRole rejects other roles with 403', async () => {
  const err = await runMiddleware(requireRole('HEAD'), investigator);
  assert.equal(err.status, 403);
});

test('requireRole 401s when unauthenticated', async () => {
  const err = await runMiddleware(requireRole('HEAD'), undefined);
  assert.equal(err.status, 401);
});

test('blockchain:read — Head passes, Investigator and Common User are forbidden', async () => {
  assert.equal(await runMiddleware(requirePermission('blockchain:read'), head), undefined);

  const invErr = await runMiddleware(requirePermission('blockchain:read'), investigator);
  assert.equal(invErr.status, 403);
  assert.match(invErr.message, /blockchain:read/);

  const commonErr = await runMiddleware(requirePermission('blockchain:read'), common);
  assert.equal(commonErr.status, 403);
});

test('requirePermission accepts multiple codes only when all are held', async () => {
  assert.equal(
    await runMiddleware(requirePermission('blockchain:read', 'user:manage'), head),
    undefined,
  );
  const err = await runMiddleware(requirePermission('blockchain:read', 'nonexistent'), head);
  assert.equal(err.status, 403);
});
