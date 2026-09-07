import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  evidence: {
    storageDir: process.env.EVIDENCE_STORAGE_DIR || './storage',
    maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024,
    allowedMime: (process.env.ALLOWED_MIME ||
      'image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,audio/wav,application/pdf,text/plain'
    ).split(','),
  },

  ledger: {
    driver: process.env.LEDGER_DRIVER || 'mock', // 'mock' | 'fabric'
    channel: process.env.FABRIC_CHANNEL || 'blockproofchannel',
    chaincode: process.env.FABRIC_CHAINCODE || 'blockproof',
    connectionProfile: process.env.FABRIC_CONNECTION_PROFILE,
    walletDir: process.env.FABRIC_WALLET_DIR,
    identity: process.env.FABRIC_IDENTITY || 'appUser',
    mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
  },

  isProd() {
    return this.env === 'production';
  },
};
