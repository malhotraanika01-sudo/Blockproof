// BlockProof — evidence cryptography
//
// Separation of concerns (do NOT conflate these):
//   SHA-256        -> integrity fingerprint of the ORIGINAL bytes
//   AES-256-GCM    -> confidentiality of the stored file
//   Hyperledger    -> immutable record of the fingerprint + custody events
//
// The AES master key comes from EVIDENCE_ENC_KEY (32 bytes hex). Each file gets
// a fresh random 12-byte IV. GCM auth tag is stored alongside for verification.

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

function masterKey() {
  const hex = process.env.EVIDENCE_ENC_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'EVIDENCE_ENC_KEY must be 64 hex chars (32 bytes). Generate with: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

/** SHA-256 hex digest of a buffer. */
export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Encrypt original bytes with AES-256-GCM.
 * @returns {{ ciphertext: Buffer, iv: string, authTag: string }} iv/authTag base64
 */
export function encryptEvidence(plaintext) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt an evidence blob. Throws if the auth tag fails (ciphertext tampered).
 * @param {Buffer} ciphertext
 * @param {string} ivB64
 * @param {string} authTagB64
 * @returns {Buffer} original bytes
 */
export function decryptEvidence(ciphertext, ivB64, authTagB64) {
  const decipher = crypto.createDecipheriv(ALGO, masterKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Verify integrity: decrypt, recompute SHA-256, compare to the hash on record.
 * @returns {{ ok: boolean, computedHash: string, expectedHash: string }}
 */
export function verifyIntegrity(ciphertext, ivB64, authTagB64, expectedHash) {
  let computedHash = null;
  try {
    const plain = decryptEvidence(ciphertext, ivB64, authTagB64);
    computedHash = sha256(plain);
  } catch {
    // GCM auth failure => the stored ciphertext itself was altered
    return { ok: false, computedHash: null, expectedHash };
  }
  return { ok: computedHash === expectedHash, computedHash, expectedHash };
}
