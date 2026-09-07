// MockLedger — deterministic in-process stand-in for Hyperledger Fabric.
//
// Mirrors the chaincode contract (chaincode/blockproof) so the API behaves
// identically whether LEDGER_DRIVER=mock or =fabric. State is a JSON file under
// the storage dir — a store genuinely separate from PostgreSQL, the same way
// the real Fabric ledger is separate.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import crypto from 'node:crypto';
import { config } from '../../config/index.js';

const FILE = resolve(config.evidence.storageDir, 'mock-ledger.json');

async function load() {
  if (!existsSync(FILE)) return { evidence: {} };
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return { evidence: {} };
  }
}

async function save(state) {
  if (!existsSync(dirname(FILE))) await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(state, null, 2));
}

function fakeTxId(seed) {
  return crypto.createHash('sha256').update(seed + Date.now()).digest('hex').slice(0, 64);
}

let blockCounter = 18000;

export class MockLedger {
  driver = 'mock';

  async connect() {
    /* nothing to do */
  }

  async disconnect() {
    /* nothing to do */
  }

  async #append(evidenceCode, event) {
    const state = await load();
    const entry = state.evidence[evidenceCode] || { evidenceCode, events: [] };
    const record = {
      ...event,
      fabricTxId: fakeTxId(evidenceCode + event.eventType),
      blockReference: `blk-${++blockCounter}`,
      timestamp: new Date().toISOString(),
    };
    entry.events.push(record);
    state.evidence[evidenceCode] = entry;
    await save(state);
    return record;
  }

  async createEvidence({ evidenceCode, sha256, submittedBy, filename }) {
    return this.#append(evidenceCode, {
      eventType: 'EVIDENCE_CREATED',
      recordedHash: sha256,
      payload: { submittedBy, filename },
    });
  }

  async recordEvent({ evidenceCode, sha256, eventType, payload = {} }) {
    return this.#append(evidenceCode, { eventType, recordedHash: sha256, payload });
  }

  async transferEvidence({ evidenceCode, sha256, from, to, by }) {
    return this.#append(evidenceCode, {
      eventType: 'TRANSFERRED',
      recordedHash: sha256,
      payload: { from, to, by },
    });
  }

  /**
   * Verify: compare the caller's freshly-computed hash to the hash anchored at
   * creation. Returns the on-chain hash + match result; the caller records the
   * VERIFIED / TAMPER_DETECTED event.
   */
  async verifyEvidence({ evidenceCode, sha256 }) {
    const state = await load();
    const entry = state.evidence[evidenceCode];
    const creation = entry?.events.find((e) => e.eventType === 'EVIDENCE_CREATED');
    if (!creation) {
      return { found: false, onChainHash: null, matches: false };
    }
    return {
      found: true,
      onChainHash: creation.recordedHash,
      matches: creation.recordedHash === sha256,
      anchoredAt: creation.timestamp,
    };
  }

  async getEvidenceHistory(evidenceCode) {
    const state = await load();
    const entry = state.evidence[evidenceCode];
    return (entry?.events ?? []).map((e) => ({
      eventType: e.eventType,
      fabricTxId: e.fabricTxId,
      blockReference: e.blockReference,
      recordedHash: e.recordedHash,
      payload: e.payload,
      timestamp: e.timestamp,
    }));
  }
}
