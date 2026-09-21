# BlockProof — Cloud Deployment (real Fabric, tunneled)

This deploys the frontend to **Vercel**, the API to **Render**, the database
to **Supabase**, and tunnels this machine's real Hyperledger Fabric network
out to the internet via **ngrok** so the cloud-hosted API can talk to it.

**Important caveat:** the Fabric network only exists on this PC. As long as
this machine is on, Docker Desktop is running, and the ngrok tunnels are up,
the cloud app has full real-blockchain functionality. If any of those stop,
the API's ledger calls will fail (the app does **not** silently fall back to
mock once `LEDGER_DRIVER=fabric` is set and Fabric was reachable at startup —
it only falls back if Fabric was unreachable at *connect* time). This is a
demo setup, not a production architecture.

## 0. One-time accounts

- [Vercel](https://vercel.com) — sign up with GitHub (recommended, makes step 2 one click)
- [Render](https://render.com) — sign up with GitHub
- [Supabase](https://supabase.com) — sign up
- [ngrok](https://ngrok.com) — sign up, then grab your authtoken from the dashboard

## 1. Database — Supabase

1. Create a new Supabase project.
2. Project Settings → Database → copy the **connection string** (use the
   "Transaction" pooler URI, port 6543, for serverless-friendly pooling —
   or the direct 5432 URI, either works for Render since it's a long-lived
   process). Note it down as `DATABASE_URL`.
3. From this machine, apply the schema + rubric SQL + seed data against Supabase:
   ```bash
   cd server
   DATABASE_URL="<your supabase URL>" npx prisma migrate deploy
   DATABASE_URL="<your supabase URL>" node prisma/apply-sql.js
   DATABASE_URL="<your supabase URL>" node prisma/seed.js
   ```
   (or run all three via `npm run db:setup --workspace server` with
   `DATABASE_URL` exported first.)

## 2. Fabric tunnels — ngrok

Install ngrok and authenticate (one-time):
```bash
# winget install ngrok.ngrok   (or download from ngrok.com)
ngrok config add-authtoken <your authtoken>
```

Make sure the Fabric network is up (`docker ps` on the native WSL engine
should show `peer0.org1`, `peer0.org2`, `orderer.example.com`), then start
three TCP tunnels — one per port, in three terminals (or one `ngrok.yml`
with multiple tunnels defined):
```bash
ngrok tcp 7051   # peer0.org1
ngrok tcp 9051   # peer0.org2
ngrok tcp 7050   # orderer
```
Each prints a `Forwarding` line like `tcp://0.tcp.ngrok.io:12345 -> localhost:7051`.
Note the three `host:port` pairs (without the `tcp://` prefix).

**These addresses change every time you restart ngrok** (free tier). Whenever
that happens, redo step 3 and re-upload the regenerated file to Render (step 4).

## 3. Build the cloud connection profile

```bash
node fabric/build-cloud-profile.cjs <peer0.org1 host:port> <peer0.org2 host:port> <orderer host:port>
```
This writes `fabric/organizations/connection-cloud.json` — a static profile
(no discovery) with the three ngrok addresses baked in and the same TLS certs
already on this machine.

## 4. Backend — Render

1. New Web Service → connect the `Blockproof` GitHub repo (root of the repo,
   `render.yaml` at the root will be picked up if you use "Blueprint",
   otherwise configure manually):
   - **Build command:** `npm install && npm run --workspace server prisma:generate`
   - **Start command:** `npm run --workspace server start`
2. Environment variables (see `render.yaml` for the full list) — the ones
   marked `sync: false` there must be set manually in the dashboard:
   - `DATABASE_URL` — from step 1
   - `JWT_SECRET`, `EVIDENCE_ENC_KEY` — generate with
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     for the key, and `...randomBytes(48).toString('base64')` for the secret
   - `CORS_ORIGIN` — your Vercel URL (set after step 5, update and redeploy)
3. **Secret Files** (Render dashboard → your service → Environment → Secret
   Files) — add these two, so they land at the exact paths the app expects
   relative to the repo root:
   - Path `fabric/wallet/appUser.id` → paste the contents of your local
     `fabric/wallet/appUser.id`
   - Path `fabric/organizations/connection-cloud.json` → paste the contents
     generated in step 3
4. Deploy. Check `https://<your-render-app>.onrender.com/api/health` — should
   show `"ledger":"fabric","ready":true`.

## 5. Frontend — Vercel

1. New Project → import the same GitHub repo.
2. **Root Directory:** `web`
3. Framework preset: Vite (auto-detected)
4. Environment variable: `VITE_API_URL` = `https://<your-render-app>.onrender.com/api`
5. Deploy. Then go back to Render and set `CORS_ORIGIN` to this Vercel URL,
   redeploy the API.

## 6. Verify

- Visit the Vercel URL, log in with a demo account, confirm data loads.
- Submit a report with evidence as the Common User.
- Check Render logs for `Ledger driver: fabric (connected)` and a successful
  `CreateEvidence` call.
- Log in as Head → Blockchain History → confirm the new evidence shows a real
  Fabric tx ID.

## Keeping it running

Every time this PC restarts, Docker Desktop restarts, or ngrok restarts:
1. `docker start ca_orderer ca_org1 ca_org2 orderer.example.com peer0.org1.example.com peer0.org2.example.com` (on the native WSL engine)
2. Restart the three ngrok tunnels
3. Re-run `node fabric/build-cloud-profile.cjs ...` with the new addresses
4. Re-upload `connection-cloud.json` to Render's Secret Files, redeploy
