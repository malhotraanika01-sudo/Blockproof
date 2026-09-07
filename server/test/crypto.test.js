import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.EVIDENCE_ENC_KEY =
  process.env.EVIDENCE_ENC_KEY && /^[0-9a-f]{64}$/.test(process.env.EVIDENCE_ENC_KEY)
    ? process.env.EVIDENCE_ENC_KEY
    : crypto.randomBytes(32).toString('hex');

const { sha256, encryptEvidence, decryptEvidence, verifyIntegrity } = await import(
  '../src/services/crypto.js'
);

test('sha256 is a stable 64-char hex digest', () => {
  const h = sha256(Buffer.from('evidence bytes'));
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, sha256(Buffer.from('evidence bytes')));
});

test('AES-256-GCM round-trips the original bytes', () => {
  const plain = Buffer.from('CCTV frame 0x00 ff fe binary-ish payload');
  const { ciphertext, iv, authTag } = encryptEvidence(plain);
  assert.notDeepEqual(ciphertext, plain);
  const back = decryptEvidence(ciphertext, iv, authTag);
  assert.deepEqual(back, plain);
});

test('verifyIntegrity passes for an untouched blob', () => {
  const plain = Buffer.from('bank statement pdf bytes');
  const digest = sha256(plain);
  const { ciphertext, iv, authTag } = encryptEvidence(plain);
  const res = verifyIntegrity(ciphertext, iv, authTag, digest);
  assert.equal(res.ok, true);
  assert.equal(res.computedHash, digest);
});

test('verifyIntegrity detects a flipped ciphertext byte (GCM auth fails)', () => {
  const plain = Buffer.from('chat export');
  const digest = sha256(plain);
  const { ciphertext, iv, authTag } = encryptEvidence(plain);
  const tampered = Buffer.from(ciphertext);
  tampered[0] ^= 0xff;
  const res = verifyIntegrity(tampered, iv, authTag, digest);
  assert.equal(res.ok, false);
  assert.equal(res.computedHash, null);
});

test('verifyIntegrity detects a swapped-but-valid blob (hash mismatch)', () => {
  const original = Buffer.from('original evidence');
  const digest = sha256(original);
  const other = encryptEvidence(Buffer.from('substituted evidence'));
  const res = verifyIntegrity(other.ciphertext, other.iv, other.authTag, digest);
  assert.equal(res.ok, false);
  assert.notEqual(res.computedHash, digest);
});
