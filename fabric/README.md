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
Open an Ubuntu (WSL) shell in the repo root.

### Windows / Docker Desktop gotcha: use a native Docker Engine inside WSL, not Docker Desktop's

On Docker Desktop for Windows, a WSL-integrated container that bind-mounts
`/var/run/docker.sock` (which is exactly what the Fabric peer does to build the
chaincode image) goes through Docker Desktop's WSL2 socket-relay
(`/run/desktop/mnt/host/wsl/docker-desktop-bind-mounts/...`). That relay does
**not** reliably support the streamed `docker build` API call the peer makes —
`peer lifecycle chaincode install` fails immediately with
`docker image build failed: write unix @->/var/run/docker.sock: write: broken pipe`,
consistently, not as a transient flake. Docker Desktop's own containers (this
project's `postgres`/`adminer` via `docker compose`) are unaffected — only
container-initiated nested builds through the relay break.

The fix is a native Docker Engine installed directly inside the WSL Ubuntu
distro (separate from Docker Desktop), listening on its own socket so it
doesn't collide with Docker Desktop's forwarded `/var/run/docker.sock`:

```bash
# one-time, inside an Ubuntu (WSL) shell — installs Docker Engine from the
# official apt repo and points it at /var/run/docker-native.sock instead of
# the default /var/run/docker.sock (left alone for Docker Desktop's own use)
sudo apt-get update -qq
sudo apt-get install -y -qq ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -qq
sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo systemctl stop docker.socket docker.service 2>/dev/null
sudo systemctl disable docker.socket 2>/dev/null
sudo mkdir -p /etc/docker
echo '{"hosts": ["unix:///var/run/docker-native.sock"]}' | sudo tee /etc/docker/daemon.json > /dev/null
sudo mkdir -p /etc/systemd/system/docker.service.d
cat <<'EOF' | sudo tee /etc/systemd/system/docker.service.d/override.conf > /dev/null
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd --containerd=/run/containerd/containerd.sock
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now docker.service
sudo usermod -aG docker $USER
# close and reopen the Ubuntu terminal so the group change applies
```

`jq` is also required by fabric-samples' scripts: `sudo apt-get install -y jq`.

Every `network.sh`/`docker` command against the Fabric network must then target
that native engine, either by exporting `DOCKER_HOST` for the session or
prefixing each command:

```bash
export DOCKER_HOST=unix:///var/run/docker-native.sock

# one-time: download fabric-samples + binaries, start the network, create the channel
bash fabric/network.sh up

# package + install + approve + commit the blockproof chaincode
bash fabric/network.sh deploy

# enrol an application identity into the wallet the API reads (this step is
# plain network I/O to the CA's exposed port, so it works fine from Windows
# Node too — WSL2 auto-forwards listening ports to Windows localhost)
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

Tear down with `DOCKER_HOST=unix:///var/run/docker-native.sock bash fabric/network.sh down`.

### The network doesn't survive a reboot / Docker Desktop restart

The native engine's containers aren't started automatically. After a reboot
(or after Docker Desktop restarts, which does **not** touch the native WSL
engine but does stop being reachable itself for a bit), bring the containers
back with:

```bash
export DOCKER_HOST=unix:///var/run/docker-native.sock
docker start ca_orderer ca_org1 ca_org2 orderer.example.com peer0.org1.example.com peer0.org2.example.com
```

If that fails (containers gone, not just stopped), redo `network.sh up` +
`network.sh deploy` — takes a couple of minutes since images are already
cached.

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
