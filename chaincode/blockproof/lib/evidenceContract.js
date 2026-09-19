'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * BlockProof evidence chaincode.
 *
 * Stores ONLY: the SHA-256 fingerprint of the original evidence bytes plus
 * compact custody/integrity events. The evidence file itself is never put on
 * the ledger — it lives encrypted (AES-256-GCM) in off-chain storage.
 *
 * World-state key layout:
 *   EVIDENCE_<code>              -> current evidence record
 *   EVENT_<code>_<paddedIndex>   -> one immutable custody/integrity event
 */
class EvidenceContract extends Contract {
  constructor() {
    super('EvidenceContract');
  }

  _evidenceKey(code) {
    return `EVIDENCE_${code}`;
  }

  _eventKey(code, index) {
    return `EVENT_${code}_${String(index).padStart(6, '0')}`;
  }

  async _txMeta(ctx) {
    return {
      txId: ctx.stub.getTxID(),
      timestamp: new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString(),
    };
  }

  async _appendEvent(ctx, code, eventType, sha256, payload) {
    const evBytes = await ctx.stub.getState(this._evidenceKey(code));
    if (!evBytes || evBytes.length === 0) {
      throw new Error(`Evidence ${code} does not exist`);
    }
    const evidence = JSON.parse(evBytes.toString());
    return this._appendEventToRecord(ctx, evidence, eventType, sha256, payload);
  }

  // Same as _appendEvent, but for a record already held in memory (e.g. one
  // just written earlier in this same transaction) — avoids a getState
  // immediately after the putState that created it, which is not guaranteed
  // to observe the pending write during simulation.
  async _appendEventToRecord(ctx, evidence, eventType, sha256, payload) {
    const code = evidence.evidenceCode;
    const index = evidence.eventCount;
    const { txId, timestamp } = await this._txMeta(ctx);

    const event = {
      docType: 'evidenceEvent',
      evidenceCode: code,
      index,
      eventType,
      sha256,
      payload: payload || {},
      txId,
      blockReference: null, // set by an off-chain indexer if needed
      timestamp,
    };
    await ctx.stub.putState(this._eventKey(code, index), Buffer.from(JSON.stringify(event)));

    evidence.eventCount = index + 1;
    evidence.lastEventType = eventType;
    evidence.lastEventAt = timestamp;
    await ctx.stub.putState(this._evidenceKey(code), Buffer.from(JSON.stringify(evidence)));

    ctx.stub.setEvent(eventType, Buffer.from(JSON.stringify({ evidenceCode: code, txId })));
    return event;
  }

  /** CreateEvidence(code, sha256, submittedBy, filename) */
  async CreateEvidence(ctx, code, sha256, submittedBy, filename) {
    const key = this._evidenceKey(code);
    const existing = await ctx.stub.getState(key);
    if (existing && existing.length > 0) {
      throw new Error(`Evidence ${code} already exists`);
    }
    if (!/^[0-9a-f]{64}$/.test(sha256)) {
      throw new Error('sha256 must be 64 lowercase hex characters');
    }
    const { txId, timestamp } = await this._txMeta(ctx);

    const evidence = {
      docType: 'evidence',
      evidenceCode: code,
      sha256,
      submittedBy,
      filename,
      createdAt: timestamp,
      createdTxId: txId,
      eventCount: 0,
      lastEventType: null,
      lastEventAt: null,
    };
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(evidence)));
    const event = await this._appendEventToRecord(ctx, evidence, 'EVIDENCE_CREATED', sha256, { submittedBy, filename });
    return JSON.stringify({ blockReference: event.blockReference, txId: event.txId });
  }

  /** RecordEvent(code, eventType, sha256, payloadJson) */
  async RecordEvent(ctx, code, eventType, sha256, payloadJson) {
    const allowed = [
      'ASSIGNED', 'RECEIVED_BY_LAB', 'ANALYSIS_COMPLETED', 'SUBMITTED_TO_COURT',
      'VERIFIED', 'TAMPER_DETECTED',
    ];
    if (!allowed.includes(eventType)) throw new Error(`eventType ${eventType} not allowed here`);
    let payload = {};
    try {
      payload = payloadJson ? JSON.parse(payloadJson) : {};
    } catch {
      throw new Error('payloadJson is not valid JSON');
    }
    const event = await this._appendEvent(ctx, code, eventType, sha256, payload);
    return JSON.stringify({ blockReference: event.blockReference, txId: event.txId });
  }

  /** TransferEvidence(code, fromLocationId, toLocationId, byUserId) */
  async TransferEvidence(ctx, code, fromLocationId, toLocationId, byUserId) {
    const evBytes = await ctx.stub.getState(this._evidenceKey(code));
    if (!evBytes || evBytes.length === 0) throw new Error(`Evidence ${code} does not exist`);
    const evidence = JSON.parse(evBytes.toString());
    const event = await this._appendEvent(ctx, code, 'TRANSFERRED', evidence.sha256, {
      from: fromLocationId,
      to: toLocationId,
      by: byUserId,
    });
    return JSON.stringify({ blockReference: event.blockReference, txId: event.txId });
  }

  /** VerifyEvidence(code, candidateSha256) — read-only comparison. */
  async VerifyEvidence(ctx, code, candidateSha256) {
    const evBytes = await ctx.stub.getState(this._evidenceKey(code));
    if (!evBytes || evBytes.length === 0) throw new Error(`Evidence ${code} does not exist`);
    const evidence = JSON.parse(evBytes.toString());
    return JSON.stringify({
      evidenceCode: code,
      matches: evidence.sha256 === candidateSha256,
      onChainHash: evidence.sha256,
      anchoredAt: evidence.createdAt,
    });
  }

  /** GetEvidence(code) */
  async GetEvidence(ctx, code) {
    const evBytes = await ctx.stub.getState(this._evidenceKey(code));
    if (!evBytes || evBytes.length === 0) throw new Error(`Evidence ${code} does not exist`);
    return evBytes.toString();
  }

  /** GetEvidenceHistory(code) — the full ordered custody chain. */
  async GetEvidenceHistory(ctx, code) {
    const results = [];
    const iterator = await ctx.stub.getStateByRange(
      this._eventKey(code, 0),
      this._eventKey(code, 999999),
    );
    let res = await iterator.next();
    while (!res.done) {
      if (res.value && res.value.value.length > 0) {
        results.push(JSON.parse(res.value.value.toString()));
      }
      res = await iterator.next();
    }
    await iterator.close();
    results.sort((a, b) => a.index - b.index);
    return JSON.stringify(results);
  }

  /** GetEvidenceLedgerHistory(code) — Fabric's own key-history for the record. */
  async GetEvidenceLedgerHistory(ctx, code) {
    const iterator = await ctx.stub.getHistoryForKey(this._evidenceKey(code));
    const out = [];
    let res = await iterator.next();
    while (!res.done) {
      out.push({
        txId: res.value.txId,
        timestamp: new Date(res.value.timestamp.seconds.low * 1000).toISOString(),
        isDelete: res.value.isDelete,
        value: res.value.value.length ? JSON.parse(res.value.value.toString()) : null,
      });
      res = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(out);
  }
}

module.exports = { EvidenceContract };
