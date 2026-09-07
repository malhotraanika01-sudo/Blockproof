# BlockProof — notes for Claude

Academic DBMS + blockchain project. Full context: `BlockProof_Master_PRD.md`, `docs/PLAN.md`.

## Run it (Windows)

Docker (Postgres) + Node ≥ 20. `psql` is not on PATH — use the container.

```bash
# from repo root
npm install
cp server/.env.example server/.env          # then set JWT_SECRET + EVIDENCE_ENC_KEY (see README)
docker compose up -d postgres               # host port 5433 (local PG uses 5432)
npm run --workspace server prisma:migrate
npm run --workspace server db:apply-sql      # constraints, views, functions, triggers
npm run db:seed
npm run dev                                  # API :4000, web :5173
```

Shells: `/` (Common User), `/investigator/*`, `/head/*`. Demo logins in README, all `Password123!`.

## Gotchas learned this project

- **Postgres is on host port 5433**, not 5432 (a local PostgreSQL 18 install already holds 5432). `DATABASE_URL` and `docker-compose.yml` reflect this.
- **The web app does NOT use framer-motion.** `web/src/lib/motion.jsx` is a CSS-animation shim with the same `motion.*` / `AnimatePresence` API — the real library's rAF animations froze the renderer here. Keep using the shim; don't reintroduce `framer-motion` imports.
- Vite HMR churns hard when shared modules (`lib/`, `components/ui.jsx`) change — if the browser seems stuck mid-dev, hard-reload or restart vite; it's not a code bug.
- `web/src/lib/hooks.js` `useAsync` keeps previous `data` during refetch; list/detail pages guard full-page spinners with `loading && !data`.
- Running vite from a subshell: `( cd web && node node_modules/vite/bin/vite.js ... )` — it must run with `web/` as cwd or it serves the wrong root.

## Ledger

`server/src/services/ledger/` — `LedgerService` with `mock` (default, JSON-file, no Docker/Fabric) and `fabric` drivers, chosen by `LEDGER_DRIVER`. `MockLedger` faithfully mirrors `chaincode/blockproof`. Real Fabric: `fabric/README.md` (needs WSL2 + Docker).

## DBMS rubric

Every requirement is mapped in `docs/PLAN.md` → "DBMS rubric coverage". SQL artifacts: `server/prisma/sql/`. Data dictionary: `docs/DATA-DICTIONARY.md`.

## Tests

`npm run --workspace server test` — crypto round-trip / tamper detection, RBAC blockchain gating.
