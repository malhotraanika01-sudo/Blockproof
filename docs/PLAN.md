# BlockProof — Implementation Plan

> Working plan derived from `BlockProof_Master_PRD.md` and `BlockProof_Architecture (1).html`.
> Source of truth for the build. Update as phases complete.

## Locked decisions (this build)

| Area | Decision |
|---|---|
| Language | JavaScript (Node ESM on server, JSX on web). Matches PRD examples. |
| Repo | npm-workspaces monorepo: `server/`, `web/`, `chaincode/`, `fabric/`. |
| Frontend architecture | **One Vite + React app, three route-isolated shells** (`/` common, `/investigator/*`, `/head/*`). Each shell has its own layout, navigation, and design tokens so the three read as different products — not one dashboard with hidden buttons. |
| DB | PostgreSQL 16 (Docker), Prisma ORM. ~14 normalized tables, 3NF+. |
| Auth | JWT (access token, role claim) + Argon2id password hashing. |
| RBAC | Table-driven (`roles` + `permissions` + `role_permissions`), enforced in Express middleware on **every** protected route. |
| Evidence confidentiality | AES-256-GCM over the original file bytes. |
| Evidence integrity | SHA-256 fingerprint of original bytes. |
| Ledger | Hyperledger Fabric test-network in Docker, JavaScript chaincode. Accessed through a `LedgerService` interface with two implementations: `FabricLedger` (primary) and `MockLedger` (unit tests / when Fabric is down). |
| Blockchain history | **Head role only** — UI route + API route both reject Investigator and Common User (403). |
| Animation / UI libs | Tailwind CSS, Framer Motion, Lucide React, Recharts, React Router, Axios. |
| Design skills | `design-taste-frontend` (installed) for the Common User portal (trust-first read); `ui-craft-dense-dashboard` (registry) for Investigator + Head. Lucide React kept despite skill guidance — PRD mandates it. |
| First build pass | **MVP vertical slice** (see below), then analytics/polish/hardening. |

## Environment prerequisites

- Node >= 20 (have v24) ✅
- Git ✅
- **Docker Desktop for Windows (WSL2 backend)** — required for PostgreSQL container and Hyperledger Fabric. *Install in progress.*
- WSL2 Ubuntu ✅ (used by Fabric)

## MVP vertical slice (Phase target 1)

End-to-end path that exercises the full DBMS rubric + the crypto + the ledger:

1. **Auth** — register / login; 3 roles seeded (`HEAD`, `INVESTIGATOR`, `COMMON_USER`).
2. **Common User** — submit a crime report with 1+ evidence files:
   - backend validates → SHA-256 hash → AES-256-GCM encrypt → store ciphertext blob + metadata row → `LedgerService.createEvidence()` → store returned tx id in `blockchain_transactions`.
   - user receives a tracking ID and can view their report status.
3. **Head** — list incoming reports → open one → create `Case` → assign an Investigator (stored procedure `assign_case()` + audit trigger).
4. **Investigator** — see only assigned cases → open case → list evidence → **Verify** an evidence item (decrypt as authorized → recompute SHA-256 → `LedgerService.verifyEvidence()` → write `audit_logs` row via trigger) → sees VERIFIED / TAMPERING DETECTED, nothing else.
5. **Head** — open **Blockchain History** for an evidence item (`LedgerService.getEvidenceHistory()`), full custody timeline. Investigator/Common hitting `/api/blockchain/*` get 403.
6. Minimal but distinct UI for all three shells; loading / empty / error states on every list.

## DBMS rubric coverage (where each requirement lives)

| Requirement | Location |
|---|---|
| ER diagram | `docs/ER-DIAGRAM.md` (Mermaid) + `docs/DATA-DICTIONARY.md` |
| 14 normalized tables, 3NF | `server/prisma/schema.prisma` |
| PK / FK / NOT NULL / UNIQUE / CHECK / DEFAULT | Prisma schema + `server/prisma/sql/01_constraints.sql` |
| Indexes | Prisma `@@index` + `server/prisma/sql/02_indexes.sql` |
| CRUD | REST controllers under `server/src/controllers/` |
| INNER / LEFT / multi-table joins | `server/src/services/*` queries + `sql/03_views.sql` |
| Aggregates (COUNT/SUM/AVG/MIN/MAX/GROUP BY/HAVING) | Head analytics service + `sql/04_analytics_queries.sql` |
| Views | `sql/03_views.sql`: `active_case_evidence`, `investigator_case_summary`, `evidence_custody_summary` |
| Stored procedure / function | `sql/05_functions.sql`: `transfer_evidence()`, `assign_case()` |
| Trigger | `sql/06_triggers.sql`: audit-log on sensitive actions, evidence-transfer audit, `updated_at` maintenance |
| Transactions | `prisma.$transaction` in evidence upload + transfer + case assignment |
| Search / filter / pagination | shared query helper `server/src/utils/query.js` |
| Validation + exception handling | Zod schemas + centralized error middleware |
| Auth + RBAC | `server/src/middleware/auth.js`, `rbac.js` |
| Backup / restore | `scripts/backup.sh`, `scripts/restore.sh` (pg_dump / pg_restore) |
| Docker | `docker-compose.yml` |

## Phase checklist

- [ ] **P0** Repo scaffold, root config, docs, ER diagram, data dictionary
- [ ] **P1** Prisma schema (14 tables) + SQL rubric artifacts + seed
- [ ] **P2** Backend: config, Prisma client, auth (JWT+Argon2), RBAC, error handling, query helpers
- [ ] **P3** Backend: crypto service (SHA-256 + AES-256-GCM), storage service, LedgerService + MockLedger
- [ ] **P4** Backend: controllers/routes for auth, reports, evidence, cases, transfers, verification, blockchain, analytics, audit, users
- [ ] **P5** Web: Vite + Tailwind + Router scaffold, 3 shells, auth context, API client
- [ ] **P6** Web: Common User portal (report + upload + track)
- [ ] **P7** Web: Investigator workspace (cases + evidence + verify)
- [ ] **P8** Web: Head command center (reports + assign + analytics + blockchain history)
- [ ] **P9** Fabric: docker-compose Fabric test-network, JS chaincode, FabricLedger wiring, integration test
- [ ] **P10** Hardening: Postman collection, tests, backup/restore, deployment notes, viva pack

## Risks

- **Hyperledger Fabric on Windows** is the biggest risk. Mitigation: `LedgerService` interface + `MockLedger` — the whole app builds, runs, and demos without Fabric; Fabric is a swap-in via `LEDGER_DRIVER=fabric`.
- Scope is large for the timeframe. MVP slice is the guard against half-finished breadth.
