# BlockProof

Blockchain-Based Digital Crime Reporting, Evidence Integrity & Investigation Management System.
Third-year B.Tech CSE DBMS project. Academic demonstration — not a production forensic/court system.

- **Product & architecture spec:** [`BlockProof_Master_PRD.md`](./BlockProof_Master_PRD.md), [`BlockProof_Architecture (1).html`](./BlockProof_Architecture%20(1).html)
- **Implementation plan:** [`docs/PLAN.md`](./docs/PLAN.md)
- **ER diagram:** [`docs/ER-DIAGRAM.md`](./docs/ER-DIAGRAM.md) · **Data dictionary:** [`docs/DATA-DICTIONARY.md`](./docs/DATA-DICTIONARY.md)

## Stack

| Layer | Tech |
|---|---|
| Database | PostgreSQL 16 + Prisma ORM (16 tables, 3NF+, views, functions, triggers) |
| API | Node.js + Express (JavaScript, ESM), JWT + Argon2id, table-driven RBAC |
| Crypto | SHA-256 (integrity) + AES-256-GCM (confidentiality) |
| Ledger | Hyperledger Fabric test-network, JavaScript chaincode — behind a `LedgerService` interface (`mock` / `fabric`) |
| Web | React + Vite, Tailwind CSS, Framer Motion, Lucide React, Recharts, React Router — one app, three route-isolated shells |

## Prerequisites

- Node.js ≥ 20
- **Docker Desktop** (WSL2 backend on Windows) — for PostgreSQL and Hyperledger Fabric
- Git

## Quick start

```bash
# 1. install workspaces
npm install

# 2. database  (Postgres runs in Docker on host port 5433 — 5432 is often taken
#    by a local PostgreSQL install)
cp server/.env.example server/.env      # then fill JWT_SECRET + EVIDENCE_ENC_KEY
npm run db:up                            # postgres in docker
npm run --workspace server prisma:migrate
npm run --workspace server db:apply-sql  # constraints, views, functions, triggers
npm run db:seed                          # fictional demo data

# 3. run API + web
npm run dev                              # server :4000, web :5173
```

Then open **http://localhost:5173**. Adminer (DB browser) is at http://localhost:8080
(system PostgreSQL, server `postgres`, user/pass/db `blockproof`).

### Test

```bash
npm run --workspace server test          # crypto + RBAC unit tests
```

### Generate the secrets `server/.env` needs

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log('EVIDENCE_ENC_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Demo accounts (after seed)

| Role | Email | Password |
|---|---|---|
| Head of Investigation | `head@blockproof.demo` | `Password123!` |
| Investigator | `rmalone@blockproof.demo` | `Password123!` |
| Investigator | `skhan@blockproof.demo` | `Password123!` |
| Common User | `asha.reddy@example.com` | `Password123!` |

## Hyperledger Fabric

```bash
npm run fabric:up        # bring up the test network (Docker)
npm run fabric:deploy    # package + install + commit the blockproof chaincode
# then set LEDGER_DRIVER=fabric in server/.env and restart the API
```

Until Fabric is running, the API uses `LEDGER_DRIVER=mock` — a deterministic in-process
ledger so the whole app builds, runs, and demos without the Fabric network.

## Repository layout

```
server/     Express API, Prisma schema + SQL artifacts + seed, crypto & ledger services
web/        React app: common / investigator / head shells
chaincode/  JavaScript Hyperledger Fabric chaincode (CreateEvidence, TransferEvidence, ...)
fabric/     Fabric test-network scripts and generated material (git-ignored)
docs/       Plan, ER diagram, data dictionary
scripts/    backup / restore helpers
```

## DBMS rubric map

See the table in [`docs/PLAN.md`](./docs/PLAN.md#dbms-rubric-coverage-where-each-requirement-lives).
