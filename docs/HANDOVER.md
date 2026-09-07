# BlockProof — Handover

**Date:** 2026-09-07
**State:** MVP complete and running. 6 commits on `main` (last: `4c28c45`). 102 files.
**Not a production system** — academic DBMS + blockchain demonstration (3rd-year B.Tech CSE).

---

## 1. TL;DR — where things stand

| Area | State |
|---|---|
| Database (PostgreSQL + Prisma) | ✅ Done — 16 tables, ER diagram, data dictionary, constraints, indexes, 3 views, 2 stored functions, 4 triggers, seed |
| Backend API (Express, JS/ESM) | ✅ Done — JWT + Argon2id, table-driven RBAC, ~30 endpoints, SHA-256 + AES-256-GCM, ledger abstraction |
| Frontend (React + Vite) | ✅ Done — 3 route-isolated shells, all MVP screens, browser-verified |
| Chaincode (JS) | ✅ Written — `chaincode/blockproof/` |
| Hyperledger Fabric network | ⚠️ **Not running** — scripts ready, app runs on `MockLedger` |
| Tests | ✅ 10 passing (crypto + RBAC) |
| Deployment | ❌ Not done |

The whole app **works and demos end-to-end right now** on the mock ledger, which
faithfully mirrors the chaincode contract.

---

## 2. Run it

**Prereqs:** Node ≥ 20, Docker Desktop (WSL2 backend). `psql` is *not* on PATH — use the container.

```bash
# repo root
npm install
cp server/.env.example server/.env
#   -> set JWT_SECRET and EVIDENCE_ENC_KEY, e.g.:
#   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('base64'))"
#   node -e "console.log('EVIDENCE_ENC_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

npm run db:up                                   # Postgres in Docker — HOST PORT 5433
npm run --workspace server prisma:migrate
npm run --workspace server db:apply-sql          # constraints / views / functions / triggers
npm run db:seed                                  # fictional demo data

npm run dev                                      # API :4000, web :5173
npm run --workspace server test                  # 10 unit tests
```

Open **http://localhost:5173**. Adminer (DB GUI) at http://localhost:8080
(system *PostgreSQL*, server `postgres`, user/pass/db all `blockproof`).

### Demo accounts (all password `Password123!`)

| Role | Email | Lands on |
|---|---|---|
| Head of Investigation | `head@blockproof.demo` | `/head` |
| Investigator | `rmalone@blockproof.demo` | `/investigator` |
| Investigator | `skhan@blockproof.demo` | `/investigator` |
| Common User | `asha.reddy@example.com` | `/` |

Seed also creates `tobrien@blockproof.demo` (investigator) and 3 more citizens.
Seeded data: 5 crime reports, 2 escalated cases (`CASE-2026-001` → Ravi Malone,
`CASE-2026-002` → Serena Khan), 11 evidence items, transfers, ~18 ledger events.

---

## 3. Architecture

```
web/ (one Vite React app, three route-isolated shells)
  /              -> Common User   (civic-blue public site)
  /investigator  -> Investigator  (light forensic workspace)
  /head          -> Head          (dark command center)
        │  HTTPS + Bearer JWT, /api proxied to :4000
        ▼
server/ (Express, ESM)
  verifyJWT ──► RBAC middleware (roles + permissions tables) ──► controllers
        │                                                         │
        │                                    ┌────────────────────┤
        ▼                                    ▼                    ▼
  Prisma ──► PostgreSQL              crypto service         ledger service
  (16 tables)                    SHA-256 + AES-256-GCM   MockLedger | FabricLedger
        │                                    │                    │
        │                             storage/*.enc        chaincode/blockproof
        │                             (ciphertext only)    (Hyperledger Fabric)
        └─ blockchain_transactions  ◄─── every ledger event mirrored here
```

**Evidence flow:** upload → validate → SHA-256(original bytes) → AES-256-GCM encrypt
→ ciphertext to `server/storage/` + metadata row → `LedgerService.createEvidence()`
→ Fabric/mock tx id mirrored into `blockchain_transactions`.

**Verify flow:** decrypt (authorized) → recompute SHA-256 → compare to ledger anchor
→ VERIFIED / TAMPERED → trigger writes `audit_logs` row. Investigator sees pass/fail
only; Head can open the full ledger history.

**The one hard security rule:** Blockchain History is Head-only. Enforced twice in
`server/src/routes/blockchain.js`: `requireRole('HEAD')` + `requirePermission('blockchain:read')`.
Investigator and Common User get **403**. Verified in-browser and by unit test.

---

## 4. Repository map

```
docs/
  PLAN.md                 implementation plan + DBMS-rubric-to-file map
  ER-DIAGRAM.md           Mermaid ER diagram (16 entities)
  DATA-DICTIONARY.md      every column, type, constraint
  HANDOVER.md             this file
  BlockProof.postman_collection.json

server/
  prisma/
    schema.prisma         16 models
    sql/01..06            constraints, indexes, views, analytics ref, functions, triggers
    apply-sql.js          runs the above after `prisma migrate`
    seed.js               fictional data — anchors evidence through the ledger driver
  src/
    config/               env loading
    middleware/           auth.js (verifyJWT, signToken), rbac.js, error.js
    services/
      crypto.js           sha256 / encryptEvidence / decryptEvidence / verifyIntegrity
      storage.js          ciphertext blob store
      evidence.js         ingest + verify orchestration (transactional)
      audit.js            app-level audit writes
      ledger/
        index.js          LedgerService factory + DB mirroring
        mock.js           MockLedger (JSON-file, no Docker) — mirrors the chaincode
        fabric.js         FabricLedger (Gateway SDK)
    routes/               auth, reports, cases, evidence, transfers, blockchain, analytics, admin
    app.js / index.js
  test/                   crypto.test.js, rbac.test.js  (node:test)
  Dockerfile

web/
  src/
    lib/
      api.js              axios instance + interceptors
      auth.jsx            AuthProvider / useAuth (token in localStorage)
      toast.jsx           toast system
      hooks.js            useAsync (keeps data during refetch), useDebounced
      motion.jsx          *** CSS-animation shim replacing framer-motion *** (see gotchas)
    components/           ui.jsx, dark.jsx, VerifyButton.jsx, TransferModal.jsx, CountUp.jsx
    shells/               CommonShell, InvestigatorShell, HeadShell
    pages/
      Login.jsx, Register.jsx
      common/     Home, ReportCrime, MyReports, TrackReport
      investigator/  Dashboard, Cases, CaseDetail, EvidenceDetail
      head/       CommandCenter, Reports, Cases, CaseDetail, Evidence,
                  BlockchainHistory, AuditLogs, Users
    App.jsx               router + role guards

chaincode/blockproof/    EvidenceContract (CreateEvidence, RecordEvent, TransferEvidence,
                         VerifyEvidence, GetEvidence, GetEvidenceHistory, ...)
fabric/
  network.sh             fabric-samples + test-network + deployCC
  enroll.js              admin + appUser into the wallet
  README.md              mock ↔ fabric switch

scripts/backup.sh, scripts/restore.sh   pg_dump / pg_restore via the container
docker-compose.yml       postgres (5433), adminer (8080), + app profile
```

---

## 5. DBMS rubric — where each requirement lives

| Requirement | Location |
|---|---|
| ER diagram, data dictionary | `docs/ER-DIAGRAM.md`, `docs/DATA-DICTIONARY.md` |
| ≥ 8–10 tables, 3NF, PK/FK | `server/prisma/schema.prisma` (16 tables) |
| CHECK / NOT NULL / UNIQUE / DEFAULT | schema + `prisma/sql/01_constraints.sql` |
| Indexes | schema `@@index` + `sql/02_indexes.sql` (incl. partial unique) |
| CRUD | `server/src/routes/*` |
| INNER/LEFT/multi-table joins | services + `sql/03_views.sql` |
| Aggregates (COUNT/SUM/AVG/MIN/MAX, GROUP BY, HAVING) | `routes/analytics.js`, `sql/04_analytics_queries.sql` |
| Views (3) | `sql/03_views.sql` — `active_case_evidence`, `investigator_case_summary`, `evidence_custody_summary` |
| Stored function (2) | `sql/05_functions.sql` — `assign_case()`, `transfer_evidence()` |
| Trigger (4) | `sql/06_triggers.sql` — evidence audit, transfer state, case-status audit, append-only ledger |
| Transactions | `prisma.$transaction` in `services/evidence.js`, `routes/cases.js` |
| Search / filter / pagination | `server/src/utils/query.js` + every list route |
| Validation + exception handling | Zod schemas + `middleware/error.js` (maps Zod/Prisma/Postgres-RAISE/Multer) |
| Auth + RBAC | `middleware/auth.js`, `middleware/rbac.js`, `roles`/`permissions`/`role_permissions` |
| Backup / restore | `scripts/backup.sh`, `scripts/restore.sh` |
| Docker | `docker-compose.yml`, `server/Dockerfile` |

---

## 6. Verified working

**In-browser (Chrome automation):**
- Login for all 3 roles; role-based redirect and route guards
- Common User: Home, report submission (tracking codes issued), success screen exposes only "encrypted + fingerprinted" — no ledger detail
- Investigator: dashboard, case list (assigned-only), case detail, evidence detail, **Verify integrity → VERIFIED**, and **→ TAMPERED** after a blob byte was flipped on disk
- Custody timeline shows events but **hides fabric tx-ids / block refs** from the investigator
- Head: Command Center (Recharts KPIs + 4 charts), Blockchain History (feed + per-evidence trace with tx/block/hash), case detail
- **`/api/blockchain/*` → 403 for Investigator and Common User, 200 for Head**

**API / backend:**
- All endpoints; `assign_case()` reassign (old investigator then gets 403 on the case)
- Triggers fire: `EVIDENCE_INTEGRITY_CHANGED VERIFIED → TAMPERED`, `CASE_ASSIGNED`, `BLOCKCHAIN_HISTORY_VIEWED`
- Fresh `migrate reset` → `apply-sql` → `seed` → `test` all clean
- 10/10 unit tests pass

---

## 7. Not done / known issues

### Not done
1. **Real Hyperledger Fabric network.** App runs on `LEDGER_DRIVER=mock`. `FabricLedger`,
   chaincode, `fabric/network.sh`, `fabric/enroll.js` are all written. Fabric's test
   network needs Docker **inside WSL2** — see `fabric/README.md`. Then set
   `LEDGER_DRIVER=fabric` in `server/.env`. `LedgerService` auto-falls back to mock if
   Fabric is unreachable, so this can't hard-break the app.
2. **Deployment** — no Vercel/Render/Supabase yet. Target topology in
   `BlockProof_Architecture (1).html`.
3. **UI buttons without wiring** — Investigator "Transfers" list page (endpoint exists:
   `GET/POST/PATCH /api/transfers`); Head close/reopen case is wired, but there's no
   Forensic Analysis or Court Submission UI (tables + relations exist).
4. `fabric-network` / `fabric-ca-client` are **not installed** (they're heavy). Install
   into `server` only when doing Fabric: `npm install fabric-network fabric-ca-client --workspace server`.

### Known minor issues
- **Verify success box flashes** then reverts to the "Verify integrity" button. The
  verification itself completes and persists (badge + timeline + `last_verified_at`
  update). Likely a re-render race between `VerifyButton` state and the parent
  `onDone` refetch. Cosmetic.
- **Seed evidence shows "0.1 KB"** — the demo file contents are short strings. Pad the
  `content:` fields in `seed.js` if larger sizes look better in a demo.
- **Head reassign via keyboard/automation** — `<select>` change didn't register through
  the test tool; a real user click works. Not reproduced as a real bug.

---

## 8. Gotchas (learned the hard way this session)

1. **Postgres is on host port `5433`, not 5432.** A local PostgreSQL 18 service already
   owns 5432 on this machine. `docker-compose.yml` maps `5433:5432` and `DATABASE_URL`
   uses 5433. If you move to a machine without a local PG, you can change it back.

2. **The web app does NOT use `framer-motion`.** `web/src/lib/motion.jsx` is a
   drop-in shim exposing the same `motion.*` and `AnimatePresence` API but backed by a
   single CSS `@keyframes` (`bp-anim-fade-up` in `index.css`, stagger via inline
   `animationDelay`). Framer Motion's rAF-driven staggered animations **froze the
   renderer** here — delayed items stuck at `opacity:0`, 30s screenshot timeouts.
   Do **not** reintroduce `framer-motion` imports; extend the shim if you need more.

3. **`React.StrictMode` was removed** from `main.jsx` (compounded the FM issue).

4. **Vite HMR churns hard** when a shared module (`lib/*`, `components/ui.jsx`) changes —
   it invalidates most of the tree. If the dev page seems wedged mid-editing, hard-reload
   or restart Vite; it's HMR state, not a code bug. Clean loads are fine.

5. **Running Vite from a script:** it must run with `web/` as cwd, e.g.
   `( cd web && node node_modules/vite/bin/vite.js --port 5173 )`. From the wrong cwd it
   serves the wrong root and 404s.

6. **`useAsync`** (`web/src/lib/hooks.js`) keeps the previous `data` during a refetch.
   Detail/list pages guard their full-page spinner with `loading && !data` so a refetch
   doesn't unmount child components (this is what broke `VerifyButton` before).

7. **Node/npm** are only on PATH inside `powershell` with a refreshed PATH, or via the
   Git Bash tool as `/c/Program Files/nodejs`. **Docker** is only in PowerShell (per-user
   install at `%LOCALAPPDATA%\Programs\DockerDesktop`).

8. **`prisma migrate` prints a Node "error"** in PowerShell that is actually just the
   update-available banner on stderr — the migration still succeeds.

---

## 9. Suggested next steps (in order)

1. **Stand up Fabric** (WSL2 Ubuntu shell): `bash fabric/network.sh up` →
   `bash fabric/network.sh deploy` → `npm i fabric-network fabric-ca-client --workspace server`
   → `node fabric/enroll.js` → `LEDGER_DRIVER=fabric` → restart API. Confirm
   `GET /api/health` shows `"ledger":"fabric"` and re-run a verify + a transfer.
2. **Fix the verify-box re-render** — give `VerifyButton` a stable `key`, or move the
   result into parent state so the `onDone` refetch doesn't race it.
3. **Investigator Transfers page** — list + acknowledge/reject (endpoints already exist).
4. **Deploy** — Supabase Postgres, Render for the Dockerized API, Vercel for the web build;
   keep Fabric in Docker/demo scope.
5. **Viva pack** — ER diagram export, slide deck, live-demo script (there's a natural
   end-to-end story: citizen reports → Head escalates + assigns → investigator verifies →
   Head inspects the ledger).

---

## 10. Source-of-truth documents

- `BlockProof_Master_PRD.md` — product decisions, role matrix, security model, dev order
- `BlockProof_Architecture (1).html` — layered architecture, request path, deployment topology
- `docs/PLAN.md` — this build's locked decisions + phase checklist
