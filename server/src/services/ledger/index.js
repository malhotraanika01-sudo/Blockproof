// LedgerService factory + a thin wrapper that also mirrors every ledger event
// into the PostgreSQL `blockchain_transactions` table (the relational mirror the
// PRD/architecture call for). Feature code depends only on `ledger`.

import { config } from '../../config/index.js';
import { prisma } from '../../db/prisma.js';
import { MockLedger } from './mock.js';
import { FabricLedger } from './fabric.js';

function makeDriver() {
  if (config.ledger.driver === 'fabric') return new FabricLedger();
  return new MockLedger();
}

class LedgerService {
  constructor() {
    this.impl = makeDriver();
    this.ready = false;
  }

  async init() {
    try {
      await this.impl.connect();
      this.ready = true;
      console.log(`Ledger driver: ${this.impl.driver} (connected)`);
    } catch (err) {
      if (config.ledger.driver === 'fabric') {
        console.error(`Fabric ledger unavailable: ${err.message}`);
        console.error('Falling back to MockLedger. Fix Fabric, then restart with LEDGER_DRIVER=fabric.');
        this.impl = new MockLedger();
        await this.impl.connect();
      } else {
        throw err;
      }
      this.ready = true;
    }
  }

  async shutdown() {
    if (this.impl?.disconnect) await this.impl.disconnect();
  }

  get driver() {
    return this.impl.driver;
  }

  /** Persist a ledger event into the relational mirror. */
  async #mirror(evidenceId, event) {
    return prisma.blockchainTransaction.create({
      data: {
        evidenceId,
        eventType: event.eventType,
        fabricTxId: event.fabricTxId,
        blockReference: event.blockReference ?? null,
        recordedHash: event.recordedHash,
        payload: event.payload ?? {},
      },
    });
  }

  async createEvidence(evidence, submittedBy) {
    const event = await this.impl.createEvidence({
      evidenceCode: evidence.evidenceCode,
      sha256: evidence.sha256Hash,
      submittedBy,
      filename: evidence.originalFilename,
    });
    const row = await this.#mirror(evidence.evidenceId, event);
    return { event, mirrorTxId: row.txId };
  }

  async recordEvent(evidence, eventType, payload) {
    const event = await this.impl.recordEvent({
      evidenceCode: evidence.evidenceCode,
      sha256: evidence.sha256Hash,
      eventType,
      payload,
    });
    await this.#mirror(evidence.evidenceId, event);
    return event;
  }

  async transferEvidence(evidence, { fromLocationId, toLocationId, byUserId }) {
    const event = await this.impl.transferEvidence({
      evidenceCode: evidence.evidenceCode,
      sha256: evidence.sha256Hash,
      from: fromLocationId,
      to: toLocationId,
      by: byUserId,
    });
    await this.#mirror(evidence.evidenceId, event);
    return event;
  }

  async verifyEvidence(evidence, freshHash) {
    return this.impl.verifyEvidence({ evidenceCode: evidence.evidenceCode, sha256: freshHash });
  }

  async getEvidenceHistory(evidence) {
    return this.impl.getEvidenceHistory(evidence.evidenceCode);
  }
}

export const ledger = new LedgerService();
