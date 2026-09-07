# BlockProof — Hyperledger Fabric

The application talks to the ledger through `server/src/services/ledger/` which
has two interchangeable drivers:

| `LEDGER_DRIVER` | Behaviour |
|---|---|
| `mock` (default) | In-process ledger, JSON-file backed, **identical method surface + event model** to the chaincode. Everything runs and demos with no Fabric network. |
| `fabric` | Real Hyperledger Fabric test network via the Gateway SDK, running the `chaincode/blockproof` JavaScript contract. |

The chaincode contract (`chaincode/blockproof/lib/evidenceContract.js`) is the
same regardless — `MockLedger` is a faithful simulation of it.

## Bringing up the real network

Fabric's test network needs **Docker running in WSL2** (not Git Bash / PowerShell).
Open an Ubuntu (WSL) shell in the repo root:

```bash
# one-time: download fabric-samples + binaries, start the network, create the channel
bash fabric/network.sh up

# package + install + approve + commit the blockproof chaincode
bash fabric/network.sh deploy

# enrol an application identity into the wallet the API reads
node fabric/enroll.js
```

Then point the API at Fabric:

```bash
# server/.env
LEDGER_DRIVER=fabric
```

and restart the API. `GET /api/health` will report `"ledger":"fabric"`. If the
network is unreachable the API logs the error and falls back to `mock` so the
app never hard-fails.

Tear down with `bash fabric/network.sh down`.

## What is stored on-chain

Only the **SHA-256 fingerprint** of the original evidence bytes plus compact
custody/integrity events (created, assigned, transferred, verified, tamper
detected, …). The evidence file itself is never on the ledger — it lives
AES-256-GCM-encrypted in `server/storage/`, referenced by a key in the
`evidence` table. PostgreSQL's `blockchain_transactions` table mirrors every
ledger event for relational querying and for the Head's Blockchain History view.

## Chaincode functions

`CreateEvidence`, `RecordEvent`, `TransferEvidence`, `VerifyEvidence`,
`GetEvidence`, `GetEvidenceHistory`, `GetEvidenceLedgerHistory`.
