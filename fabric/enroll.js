// Enrolls the CA admin and registers an application identity ("appUser") into a
// file-system wallet the API reads (FABRIC_WALLET_DIR). Run AFTER
// `bash fabric/network.sh up && bash fabric/network.sh deploy`.
//
//   node fabric/enroll.js
//
// Requires: npm install fabric-ca-client fabric-network --workspace server

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORG_DIR = resolve(__dirname, 'organizations/peerOrganizations/org1.example.com');
const CCP_PATH = join(ORG_DIR, 'connection-org1.json');
const WALLET_DIR = resolve(__dirname, 'wallet');
const MSP_ID = 'Org1MSP';

async function main() {
  if (!existsSync(CCP_PATH)) {
    throw new Error(`Connection profile not found at ${CCP_PATH}. Run: bash fabric/network.sh up`);
  }
  const { Wallets } = await import('fabric-network');
  const FabricCAServices = (await import('fabric-ca-client')).default;

  const ccp = JSON.parse(readFileSync(CCP_PATH, 'utf8'));
  const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
  const ca = new FabricCAServices(
    caInfo.url,
    { trustedRoots: caInfo.tlsCACerts.pem, verify: false },
    caInfo.caName,
  );

  const wallet = await Wallets.newFileSystemWallet(WALLET_DIR);

  // 1. admin
  if (!(await wallet.get('admin'))) {
    const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
    await wallet.put('admin', {
      credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
      mspId: MSP_ID,
      type: 'X.509',
    });
    console.log('Enrolled "admin".');
  }

  // 2. appUser
  if (!(await wallet.get('appUser'))) {
    const adminIdentity = await wallet.get('admin');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const secret = await ca.register(
      { affiliation: 'org1.department1', enrollmentID: 'appUser', role: 'client' },
      adminUser,
    );
    const enrollment = await ca.enroll({ enrollmentID: 'appUser', enrollmentSecret: secret });
    await wallet.put('appUser', {
      credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
      mspId: MSP_ID,
      type: 'X.509',
    });
    console.log('Registered + enrolled "appUser".');
  }

  console.log(`\nWallet ready at ${WALLET_DIR}`);
  console.log('Now set  LEDGER_DRIVER=fabric  in server/.env and restart the API.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
