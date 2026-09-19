#!/usr/bin/env bash
# BlockProof — Hyperledger Fabric test network driver.
#
# Prereqs (run inside WSL2 Ubuntu, not Git Bash):
#   - Docker Desktop with WSL2 integration enabled
#   - curl, git, jq
#
# Usage:
#   bash fabric/network.sh up        # download fabric-samples + start test-network + create channel
#   bash fabric/network.sh deploy    # package/install/approve/commit the blockproof chaincode
#   bash fabric/network.sh down      # tear everything down
#
# After `deploy`, run  node fabric/enroll.js  then set LEDGER_DRIVER=fabric in server/.env
set -euo pipefail

FABRIC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAMPLES_DIR="${FABRIC_DIR}/fabric-samples"
CHANNEL="blockproofchannel"
CC_NAME="blockproof"
CC_SRC="${FABRIC_DIR}/../chaincode/blockproof"
FABRIC_VERSION="2.5.10"
CA_VERSION="1.5.13"

ensure_samples() {
  if [ ! -d "${SAMPLES_DIR}/test-network" ]; then
    echo "Downloading fabric-samples + binaries (${FABRIC_VERSION}) ..."
    cd "${FABRIC_DIR}"
    curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh -o install-fabric.sh
    chmod +x install-fabric.sh
    ./install-fabric.sh --fabric-version "${FABRIC_VERSION}" --ca-version "${CA_VERSION}" docker binary samples
  fi
}

case "${1:-}" in
  up)
    ensure_samples
    cd "${SAMPLES_DIR}/test-network"
    ./network.sh down || true
    ./network.sh up createChannel -c "${CHANNEL}" -ca
    # export the org1 connection profile where the API expects it
    mkdir -p "${FABRIC_DIR}/organizations/peerOrganizations/org1.example.com"
    cp organizations/peerOrganizations/org1.example.com/connection-org1.json \
       "${FABRIC_DIR}/organizations/peerOrganizations/org1.example.com/connection-org1.json"
    cp -r organizations "${FABRIC_DIR}/"
    echo "Network up. Channel '${CHANNEL}' created. Next: bash fabric/network.sh deploy"
    ;;
  deploy)
    cd "${SAMPLES_DIR}/test-network"
    ( cd "${CC_SRC}" && npm install --omit=dev )
    ./network.sh deployCC -c "${CHANNEL}" -ccn "${CC_NAME}" -ccp "${CC_SRC}" -ccl javascript
    echo "Chaincode '${CC_NAME}' committed on '${CHANNEL}'. Next: node fabric/enroll.js"
    ;;
  down)
    if [ -d "${SAMPLES_DIR}/test-network" ]; then
      cd "${SAMPLES_DIR}/test-network"
      ./network.sh down
    fi
    rm -rf "${FABRIC_DIR}/organizations" "${FABRIC_DIR}/wallet"
    echo "Network down."
    ;;
  *)
    echo "Usage: bash fabric/network.sh {up|deploy|down}"
    exit 1
    ;;
esac
