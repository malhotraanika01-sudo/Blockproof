// FabricLedger — talks to the deployed `blockproof` chaincode over a Fabric
// Gateway connection. Same method surface as MockLedger.
//
// Requires: `fabric-network` (optional dependency) + a connection profile and a
// wallet identity produced by fabric/enroll.js. If the package or the wallet is
// missing the constructor throws a clear message and the app should fall back to
// LEDGER_DRIVER=mock.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from '../../config/index.js';

export class FabricLedger {
  driver = 'fabric';

  constructor() {
    this.gateway = null;
    this.contract = null;
  }

  async connect() {
    let Wallets, Gateway;
    try {
      ({ Wallets, Gateway } = await import('fabric-network'));
    } catch {
      throw new Error(
        "LEDGER_DRIVER=fabric but 'fabric-network' is not installed. " +
          'Run: npm install fabric-network fabric-ca-client --workspace server',
      );
    }

    const ccp = JSON.parse(await readFile(resolve(config.ledger.connectionProfile), 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(resolve(config.ledger.walletDir));
    const identity = await wallet.get(config.ledger.identity);
    if (!identity) {
      throw new Error(
        `Fabric identity "${config.ledger.identity}" not in wallet ${config.ledger.walletDir}. ` +
          'Run: node fabric/enroll.js',
      );
    }

    this.gateway = new Gateway();
    await this.gateway.connect(ccp, {
      wallet,
      identity: config.ledger.identity,
      discovery: { enabled: true, asLocalhost: true },
    });
    const network = await this.gateway.getNetwork(config.ledger.channel);
    this.contract = network.getContract(config.ledger.chaincode);
  }

  async disconnect() {
    if (this.gateway) await this.gateway.disconnect();
  }

  #assert() {
    if (!this.contract) throw new Error('FabricLedger not connected — call connect() first');
  }

  async #submit(fn, ...args) {
    this.#assert();
    const tx = this.contract.createTransaction(fn);
    const result = await tx.submit(...args);
    return {
      fabricTxId: tx.getTransactionId(),
      result: result?.length ? JSON.parse(result.toString()) : null,
    };
  }

  async #evaluate(fn, ...args) {
    this.#assert();
    const result = await this.contract.evaluateTransaction(fn, ...args);
    return result?.length ? JSON.parse(result.toString()) : null;
  }

  async createEvidence({ evidenceCode, sha256, submittedBy, filename }) {
    const { fabricTxId, result } = await this.#submit(
      'CreateEvidence',
      evidenceCode,
      sha256,
      String(submittedBy),
      filename,
    );
    return {
      eventType: 'EVIDENCE_CREATED',
      fabricTxId,
      blockReference: result?.blockReference ?? null,
      recordedHash: sha256,
      payload: { submittedBy, filename },
      timestamp: new Date().toISOString(),
    };
  }

  async recordEvent({ evidenceCode, sha256, eventType, payload = {} }) {
    const { fabricTxId, result } = await this.#submit(
      'RecordEvent',
      evidenceCode,
      eventType,
      sha256,
      JSON.stringify(payload),
    );
    return {
      eventType,
      fabricTxId,
      blockReference: result?.blockReference ?? null,
      recordedHash: sha256,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  async transferEvidence({ evidenceCode, sha256, from, to, by }) {
    const { fabricTxId, result } = await this.#submit(
      'TransferEvidence',
      evidenceCode,
      String(from),
      String(to),
      String(by),
    );
    return {
      eventType: 'TRANSFERRED',
      fabricTxId,
      blockReference: result?.blockReference ?? null,
      recordedHash: sha256,
      payload: { from, to, by },
      timestamp: new Date().toISOString(),
    };
  }

  async verifyEvidence({ evidenceCode, sha256 }) {
    const onChain = await this.#evaluate('GetEvidence', evidenceCode);
    if (!onChain) return { found: false, onChainHash: null, matches: false };
    return {
      found: true,
      onChainHash: onChain.sha256 ?? onChain.hash,
      matches: (onChain.sha256 ?? onChain.hash) === sha256,
      anchoredAt: onChain.createdAt ?? null,
    };
  }

  async getEvidenceHistory(evidenceCode) {
    const history = await this.#evaluate('GetEvidenceHistory', evidenceCode);
    return (history ?? []).map((e) => ({
      eventType: e.eventType,
      fabricTxId: e.txId,
      blockReference: e.blockReference ?? null,
      recordedHash: e.sha256 ?? e.hash,
      payload: e.payload ?? {},
      timestamp: e.timestamp,
    }));
  }
}
