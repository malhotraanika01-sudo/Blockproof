// Generates fabric/organizations/connection-cloud.json — a static (discovery
// disabled) connection profile pointing peer0.org1, peer0.org2 and the
// orderer at their public ngrok TCP tunnel addresses instead of localhost.
//
// Usage:
//   node fabric/build-cloud-profile.cjs <peer1-host:port> <peer2-host:port> <orderer-host:port>
//
// Example (ngrok TCP tunnel addresses, no scheme/prefix):
//   node fabric/build-cloud-profile.cjs 0.tcp.ngrok.io:12345 0.tcp.ngrok.io:12346 0.tcp.ngrok.io:12347

const fs = require('fs');
const path = require('path');

const [peer1Addr, peer2Addr, ordererAddr] = process.argv.slice(2);
if (!peer1Addr || !peer2Addr || !ordererAddr) {
  console.error('Usage: node build-cloud-profile.cjs <peer0.org1 host:port> <peer0.org2 host:port> <orderer host:port>');
  process.exit(1);
}

const ORG_DIR = path.join(__dirname, 'organizations');
const pem = (p) => fs.readFileSync(path.join(ORG_DIR, p), 'utf8');

const profile = {
  name: 'blockproof-cloud',
  version: '1.0.0',
  client: {
    organization: 'Org1',
    connection: { timeout: { peer: { endorser: '300' } } },
  },
  organizations: {
    Org1: {
      mspid: 'Org1MSP',
      peers: ['peer0.org1.example.com'],
      certificateAuthorities: ['ca.org1.example.com'],
    },
    Org2: {
      mspid: 'Org2MSP',
      peers: ['peer0.org2.example.com'],
    },
  },
  peers: {
    'peer0.org1.example.com': {
      url: `grpcs://${peer1Addr}`,
      tlsCACerts: { pem: pem('peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem') },
      grpcOptions: {
        'ssl-target-name-override': 'peer0.org1.example.com',
        hostnameOverride: 'peer0.org1.example.com',
      },
    },
    'peer0.org2.example.com': {
      url: `grpcs://${peer2Addr}`,
      tlsCACerts: { pem: pem('peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem') },
      grpcOptions: {
        'ssl-target-name-override': 'peer0.org2.example.com',
        hostnameOverride: 'peer0.org2.example.com',
      },
    },
  },
  orderers: {
    'orderer.example.com': {
      url: `grpcs://${ordererAddr}`,
      tlsCACerts: { pem: pem('ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem') },
      grpcOptions: {
        'ssl-target-name-override': 'orderer.example.com',
        hostnameOverride: 'orderer.example.com',
      },
    },
  },
  channels: {
    blockproofchannel: {
      orderers: ['orderer.example.com'],
      peers: {
        'peer0.org1.example.com': { endorsingPeer: true, chaincodeQuery: true, ledgerQuery: true, eventSource: true },
        'peer0.org2.example.com': { endorsingPeer: true, chaincodeQuery: true, ledgerQuery: true, eventSource: true },
      },
    },
  },
  certificateAuthorities: {
    'ca.org1.example.com': {
      url: 'https://localhost:7054',
      caName: 'ca-org1',
      tlsCACerts: { pem: [pem('peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem')] },
      httpOptions: { verify: false },
    },
  },
};

const outPath = path.join(ORG_DIR, 'connection-cloud.json');
fs.writeFileSync(outPath, JSON.stringify(profile, null, 2));
console.log(`Wrote ${outPath}`);
