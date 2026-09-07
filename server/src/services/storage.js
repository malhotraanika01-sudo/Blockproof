// BlockProof — encrypted-blob storage
// Ciphertext blobs are written to EVIDENCE_STORAGE_DIR under an opaque key.
// Only the AES-256-GCM ciphertext ever touches disk here — never plaintext,
// never the blockchain.

import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import crypto from 'node:crypto';

function baseDir() {
  return resolve(process.env.EVIDENCE_STORAGE_DIR || './storage');
}

export async function ensureStorage() {
  const dir = baseDir();
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  return dir;
}

/** @param {Buffer} ciphertext @returns {Promise<string>} storage key */
export async function putBlob(ciphertext) {
  const dir = await ensureStorage();
  const key = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.enc`;
  await writeFile(join(dir, key), ciphertext);
  return key;
}

/** @param {string} key @returns {Promise<Buffer>} */
export function getBlob(key) {
  return readFile(join(baseDir(), key));
}

export async function deleteBlob(key) {
  try {
    await unlink(join(baseDir(), key));
  } catch {
    /* already gone */
  }
}
