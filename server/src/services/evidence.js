// Evidence orchestration: the exact flow from the architecture doc.
//   validate -> SHA-256(original) -> AES-256-GCM encrypt -> store ciphertext
//   -> metadata row (PostgreSQL) -> ledger CreateEvidence -> mirror tx id
// All DB writes for one upload run inside a single transaction.

import { prisma } from '../db/prisma.js';
import { sha256, encryptEvidence, verifyIntegrity } from './crypto.js';
import { putBlob, getBlob } from './storage.js';
import { ledger } from './ledger/index.js';
import { BadRequest, NotFound } from '../utils/errors.js';
import { config } from '../config/index.js';

const MIME_TO_TYPE = {
  'image/jpeg': 'IMAGE',
  'image/png': 'IMAGE',
  'image/webp': 'IMAGE',
  'video/mp4': 'VIDEO',
  'audio/mpeg': 'AUDIO',
  'audio/wav': 'AUDIO',
  'application/pdf': 'DOCUMENT',
  'text/plain': 'DOCUMENT',
  'application/octet-stream': 'DEVICE_IMAGE',
};

let evidenceCounter = null;
async function nextEvidenceCode() {
  if (evidenceCounter === null) {
    const last = await prisma.evidence.findFirst({ orderBy: { evidenceId: 'desc' } });
    evidenceCounter = last ? parseInt(last.evidenceCode.replace(/\D/g, ''), 10) : 1000;
  }
  evidenceCounter += 1;
  return `EV-${evidenceCounter}`;
}

/**
 * Attach one uploaded file to a report.
 * @param {{ buffer:Buffer, originalname:string, mimetype:string, size:number }} file
 */
export async function ingestEvidence({ file, reportId, submittedById }) {
  if (!file) throw BadRequest('No file provided');
  if (!config.evidence.allowedMime.includes(file.mimetype)) {
    throw BadRequest(`Unsupported file type: ${file.mimetype}`);
  }
  if (file.size > config.evidence.maxUploadBytes) {
    throw BadRequest('File exceeds the size limit');
  }

  const report = await prisma.crimeReport.findUnique({ where: { reportId } });
  if (!report) throw NotFound('Crime report not found');

  // 1. fingerprint the ORIGINAL bytes
  const digest = sha256(file.buffer);
  // 2. encrypt for confidentiality
  const { ciphertext, iv, authTag } = encryptEvidence(file.buffer);
  // 3. store ciphertext only
  const storageKey = await putBlob(ciphertext);

  const typeName = MIME_TO_TYPE[file.mimetype] || 'OTHER';
  const evidenceType = await prisma.evidenceType.findUnique({ where: { name: typeName } });
  const evidenceCode = await nextEvidenceCode();

  // 4. metadata row + (5) ledger anchor, atomically for the DB side
  const evidence = await prisma.$transaction(async (tx) => {
    return tx.evidence.create({
      data: {
        evidenceCode,
        reportId,
        caseId: report ? null : undefined,
        evidenceTypeId: evidenceType.evidenceTypeId,
        submittedById,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        sha256Hash: digest,
        storageKey,
        encIv: iv,
        encAuthTag: authTag,
        integrityStatus: 'PENDING',
      },
    });
  });

  // 6. anchor on the ledger + mirror into blockchain_transactions
  await ledger.createEvidence(evidence, submittedById);

  return evidence;
}

/**
 * Verify integrity of one evidence item.
 * Decrypt (authorized) -> recompute SHA-256 -> compare with ledger anchor.
 * Records VERIFIED / TAMPER_DETECTED on the ledger and updates the row
 * (the DB trigger writes the audit entry).
 */
export async function verifyEvidence(evidenceId, actorId) {
  const evidence = await prisma.evidence.findUnique({ where: { evidenceId } });
  if (!evidence) throw NotFound('Evidence not found');

  let freshHash = null;
  let decryptOk = true;
  try {
    const blob = await getBlob(evidence.storageKey);
    const check = verifyIntegrity(blob, evidence.encIv, evidence.encAuthTag, evidence.sha256Hash);
    freshHash = check.computedHash;
    decryptOk = check.computedHash !== null;
  } catch {
    decryptOk = false;
  }

  const ledgerResult = await ledger.verifyEvidence(evidence, freshHash ?? 'unreadable');
  const matches = decryptOk && ledgerResult.found && ledgerResult.matches;
  const status = matches ? 'VERIFIED' : 'TAMPERED';

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.evidence.update({
      where: { evidenceId },
      data: { integrityStatus: status, lastVerifiedAt: new Date() },
    });
    return row;
  });

  await ledger.recordEvent(evidence, matches ? 'VERIFIED' : 'TAMPER_DETECTED', {
    by: actorId,
    computedHash: freshHash,
    anchoredHash: ledgerResult.onChainHash,
  });

  return {
    evidenceCode: evidence.evidenceCode,
    result: status, // VERIFIED | TAMPERED
    matches,
    computedHash: freshHash,
    anchoredHash: ledgerResult.onChainHash,
    verifiedAt: updated.lastVerifiedAt,
  };
}

/** Decrypt and return original bytes for an authorized viewer. */
export async function openEvidence(evidenceId) {
  const evidence = await prisma.evidence.findUnique({ where: { evidenceId } });
  if (!evidence) throw NotFound('Evidence not found');
  const blob = await getBlob(evidence.storageKey);
  const { decryptEvidence } = await import('./crypto.js');
  const plaintext = decryptEvidence(blob, evidence.encIv, evidence.encAuthTag);
  return { evidence, plaintext };
}
