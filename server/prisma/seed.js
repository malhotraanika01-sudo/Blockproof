// BlockProof — database seed (fictional demonstration data only)
// Run: npm run seed   (after `prisma migrate` + `db:apply-sql`)
//
// Creates: RBAC (roles/permissions), lookup tables, 1 Head + 3 Investigators +
// 4 Common Users, crime reports with genuinely encrypted evidence blobs,
// two escalated cases with assignments, and mirrored ledger events.
//
// All demo accounts use password:  Password123!

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import 'dotenv/config';
import { sha256, encryptEvidence } from '../src/services/crypto.js';
import { putBlob, ensureStorage } from '../src/services/storage.js';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password123!';

const PERMISSIONS = [
  ['report:create', 'File a crime report and upload evidence'],
  ['report:read:own', 'Track own submitted reports'],
  ['report:read:all', 'Review every incoming report'],
  ['case:create', 'Escalate a report into a case'],
  ['case:read:assigned', 'View cases assigned to the investigator'],
  ['case:read:all', 'View every case'],
  ['case:assign', 'Assign / reassign investigators'],
  ['case:close', 'Close or reopen a case'],
  ['evidence:upload', 'Attach evidence to a report/case'],
  ['evidence:read:authorized', 'View evidence for authorized cases'],
  ['evidence:transfer', 'Move evidence between custody locations'],
  ['evidence:verify', 'Run an integrity verification'],
  ['update:create', 'Add investigation updates / notes'],
  ['analytics:read', 'View system analytics'],
  ['audit:read', 'View audit logs'],
  ['blockchain:read', 'View the raw blockchain custody history'],
  ['user:manage', 'Manage users and roles'],
];

const ROLE_PERMS = {
  COMMON_USER: ['report:create', 'report:read:own', 'evidence:upload'],
  INVESTIGATOR: [
    'case:read:assigned', 'evidence:read:authorized', 'evidence:upload',
    'evidence:transfer', 'evidence:verify', 'update:create', 'analytics:read',
  ],
  HEAD: PERMISSIONS.map(([code]) => code), // full access
};

const EVIDENCE_TYPES = [
  ['IMAGE', 'Photographs and screenshots'],
  ['VIDEO', 'CCTV and recorded video'],
  ['AUDIO', 'Call and voice recordings'],
  ['DOCUMENT', 'PDFs, statements, chat exports'],
  ['DEVICE_IMAGE', 'Forensic disk / device images'],
  ['OTHER', 'Anything not otherwise classified'],
];

const LOCATIONS = [
  ['Central Evidence Intake', 'INTAKE', '1 Precinct Plaza'],
  ['Digital Forensics Lab', 'LAB', '4th Floor, Forensics Wing'],
  ['Secure Evidence Locker A', 'LOCKER', 'Basement Level 2'],
  ['District Court Registry', 'COURT', '200 Justice Avenue'],
  ['Field Collection Unit', 'FIELD', 'Mobile'],
];

async function main() {
  if ((await prisma.user.count()) > 0 && !process.argv.includes('--force')) {
    console.log('Database already seeded. Re-run with --force to reseed.');
    return;
  }
  await ensureStorage();

  // ── RBAC ────────────────────────────────────────────────
  const roles = {};
  for (const name of ['HEAD', 'INVESTIGATOR', 'COMMON_USER']) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
  }
  const perms = {};
  for (const [code, description] of PERMISSIONS) {
    perms[code] = await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    });
  }
  for (const [roleName, codes] of Object.entries(ROLE_PERMS)) {
    for (const code of codes) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roles[roleName].roleId, permissionId: perms[code].permissionId } },
        update: {},
        create: { roleId: roles[roleName].roleId, permissionId: perms[code].permissionId },
      });
    }
  }

  // ── Lookup tables ───────────────────────────────────────
  const types = {};
  for (const [name, description] of EVIDENCE_TYPES) {
    types[name] = await prisma.evidenceType.upsert({
      where: { name }, update: { description }, create: { name, description },
    });
  }

  // ── Users ───────────────────────────────────────────────
  const hash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  const mk = (roleName, email, fullName, extra = {}) =>
    prisma.user.create({
      data: { roleId: roles[roleName].roleId, email, passwordHash: hash, fullName, ...extra },
    });

  const head = await mk('HEAD', 'head@blockproof.demo', 'Commissioner Dana Whitfield', { badgeNumber: 'HQ-001', phone: '555-0100' });
  const inv1 = await mk('INVESTIGATOR', 'rmalone@blockproof.demo', 'Det. Ravi Malone', { badgeNumber: 'INV-2201', phone: '555-0201' });
  const inv2 = await mk('INVESTIGATOR', 'skhan@blockproof.demo', 'Det. Serena Khan', { badgeNumber: 'INV-2202', phone: '555-0202' });
  const inv3 = await mk('INVESTIGATOR', 'tobrien@blockproof.demo', 'Det. Theo O’Brien', { badgeNumber: 'INV-2203', phone: '555-0203' });
  const cu1 = await mk('COMMON_USER', 'asha.reddy@example.com', 'Asha Reddy', { phone: '555-0301' });
  const cu2 = await mk('COMMON_USER', 'marcus.lee@example.com', 'Marcus Lee', { phone: '555-0302' });
  const cu3 = await mk('COMMON_USER', 'nina.torres@example.com', 'Nina Torres', { phone: '555-0303' });
  const cu4 = await mk('COMMON_USER', 'omar.haddad@example.com', 'Omar Haddad', { phone: '555-0304' });

  // ── Locations (custodians point at real users) ──────────
  const loc = {};
  const custodians = [head.userId, inv2.userId, inv1.userId, head.userId, inv3.userId];
  for (let i = 0; i < LOCATIONS.length; i++) {
    const [name, kind, address] = LOCATIONS[i];
    loc[kind] = await prisma.evidenceLocation.upsert({
      where: { name }, update: {}, create: { name, kind, address, custodianId: custodians[i] },
    });
  }

  // ── Helper: create a report with encrypted evidence ─────
  let reportSeq = 0;
  let evidenceSeq = 1000;
  async function createReport({ reporter, crimeType, title, description, location, daysAgo, files }) {
    reportSeq += 1;
    const trackingCode = `BP-2026-${String(reportSeq).padStart(4, '0')}`;
    const incidentAt = new Date(Date.now() - daysAgo * 864e5);
    const report = await prisma.crimeReport.create({
      data: {
        trackingCode, reporterId: reporter.userId, crimeType, title, description,
        incidentAt, incidentLocation: location, status: 'SUBMITTED',
      },
    });
    const evidenceRows = [];
    for (const f of files) {
      evidenceSeq += 1;
      const plain = Buffer.from(f.content, 'utf8');
      const digest = sha256(plain);
      const { ciphertext, iv, authTag } = encryptEvidence(plain);
      const storageKey = await putBlob(ciphertext);
      const ev = await prisma.evidence.create({
        data: {
          evidenceCode: `EV-${evidenceSeq}`,
          reportId: report.reportId,
          evidenceTypeId: types[f.type].evidenceTypeId,
          submittedById: reporter.userId,
          originalFilename: f.filename,
          mimeType: f.mime,
          sizeBytes: BigInt(plain.length),
          sha256Hash: digest,
          storageKey, encIv: iv, encAuthTag: authTag,
          integrityStatus: 'PENDING',
        },
      });
      await prisma.blockchainTransaction.create({
        data: {
          evidenceId: ev.evidenceId,
          eventType: 'EVIDENCE_CREATED',
          fabricTxId: `mock:${digest.slice(0, 32)}`,
          blockReference: `blk-${1000 + evidenceSeq}`,
          recordedHash: digest,
          payload: { evidenceCode: ev.evidenceCode, filename: f.filename, event: 'EVIDENCE_CREATED' },
        },
      });
      evidenceRows.push(ev);
    }
    return { report, evidenceRows };
  }

  const r1 = await createReport({
    reporter: cu1, crimeType: 'Cyber Fraud',
    title: 'Unauthorized bank transfers after phishing email',
    description: 'Received an email posing as my bank, entered credentials, and three transfers totaling a large sum left my account within an hour.',
    location: 'Online / Riverside Branch', daysAgo: 6,
    files: [
      { type: 'DOCUMENT', filename: 'phishing-email.pdf', mime: 'application/pdf', content: 'FICTIONAL phishing email headers and body. Sender: security@bank-verify.example. Link: http://bank-verify.example/login' },
      { type: 'IMAGE', filename: 'transfer-screenshot.png', mime: 'image/png', content: 'FICTIONAL screenshot bytes: three outgoing transfers, timestamps 09:14, 09:31, 09:52.' },
      { type: 'DOCUMENT', filename: 'bank-statement.pdf', mime: 'application/pdf', content: 'FICTIONAL bank statement extract showing the three disputed debit lines.' },
    ],
  });

  const r2 = await createReport({
    reporter: cu2, crimeType: 'Identity Theft',
    title: 'Loan opened in my name',
    description: 'A lender contacted me about missed payments on a personal loan I never applied for. My address and ID number were used.',
    location: 'Northgate', daysAgo: 12,
    files: [
      { type: 'DOCUMENT', filename: 'loan-agreement.pdf', mime: 'application/pdf', content: 'FICTIONAL loan agreement with forged signature block.' },
      { type: 'AUDIO', filename: 'lender-call.mp3', mime: 'audio/mpeg', content: 'FICTIONAL audio transcript: lender confirms loan issued on a date the victim was abroad.' },
    ],
  });

  const r3 = await createReport({
    reporter: cu3, crimeType: 'Harassment',
    title: 'Repeated threatening messages',
    description: 'An anonymous account has sent escalating threats over two weeks across multiple platforms.',
    location: 'Social media', daysAgo: 3,
    files: [
      { type: 'IMAGE', filename: 'threats-1.png', mime: 'image/png', content: 'FICTIONAL screenshot of message thread, part 1.' },
      { type: 'IMAGE', filename: 'threats-2.png', mime: 'image/png', content: 'FICTIONAL screenshot of message thread, part 2.' },
      { type: 'DOCUMENT', filename: 'chat-export.pdf', mime: 'application/pdf', content: 'FICTIONAL full chat export with message IDs and timestamps.' },
    ],
  });

  const r4 = await createReport({
    reporter: cu4, crimeType: 'Data Theft',
    title: 'Company customer list found for sale',
    description: 'A former contractor appears to have exfiltrated a customer database now being advertised on a forum.',
    location: 'Corporate HQ', daysAgo: 20,
    files: [
      { type: 'DEVICE_IMAGE', filename: 'usb-image.dd', mime: 'application/octet-stream', content: 'FICTIONAL forensic image manifest: 1 partition, catalog of copied CSV files.' },
      { type: 'DOCUMENT', filename: 'forum-listing.pdf', mime: 'application/pdf', content: 'FICTIONAL forum post offering "500k customer records" with a sample.' },
    ],
  });

  // Small phishing report, left un-escalated to show a pending queue item.
  await createReport({
    reporter: cu1, crimeType: 'Phishing',
    title: 'Fake delivery SMS',
    description: 'Text message with a link asking for a small redelivery fee and card details.',
    location: 'Mobile', daysAgo: 1,
    files: [
      { type: 'IMAGE', filename: 'sms.png', mime: 'image/png', content: 'FICTIONAL SMS screenshot: "Your parcel is held, pay 2.99 at track-parcel.example".' },
    ],
  });

  // ── Escalate two reports into cases ─────────────────────
  async function escalate({ report, evidenceRows, investigator, priority, caseSeq, statusUpdates }) {
    const c = await prisma.case.create({
      data: {
        caseNumber: `CASE-2026-${String(caseSeq).padStart(3, '0')}`,
        reportId: report.reportId,
        leadHeadId: head.userId,
        title: report.title,
        priority,
        status: 'OPEN',
      },
    });
    await prisma.crimeReport.update({ where: { reportId: report.reportId }, data: { status: 'ESCALATED' } });
    await prisma.evidence.updateMany({ where: { reportId: report.reportId }, data: { caseId: c.caseId } });

    // assignment via the same shape assign_case() produces
    await prisma.caseAssignment.create({
      data: { caseId: c.caseId, investigatorId: investigator.userId, assignedBy: head.userId, isActive: true },
    });
    await prisma.case.update({ where: { caseId: c.caseId }, data: { status: 'IN_PROGRESS' } });
    for (const ev of evidenceRows) {
      await prisma.blockchainTransaction.create({
        data: {
          evidenceId: ev.evidenceId, eventType: 'ASSIGNED',
          fabricTxId: `mock:assign:${c.caseNumber}:${ev.evidenceCode}`,
          blockReference: `blk-assign-${ev.evidenceId}`,
          recordedHash: ev.sha256Hash,
          payload: { caseNumber: c.caseNumber, investigator: investigator.fullName },
        },
      });
    }
    for (const u of statusUpdates) {
      await prisma.investigationUpdate.create({
        data: { caseId: c.caseId, authorId: investigator.userId, updateType: u.type, body: u.body },
      });
    }
    return c;
  }

  const case1 = await escalate({
    report: r1.report, evidenceRows: r1.evidenceRows, investigator: inv1,
    priority: 'HIGH', caseSeq: 1,
    statusUpdates: [
      { type: 'NOTE', body: 'Opened case. Requested transaction logs from the receiving institution.' },
      { type: 'FINDING', body: 'Phishing domain registered 2 days before the incident; same host as two prior fraud reports.' },
    ],
  });

  const case2 = await escalate({
    report: r4.report, evidenceRows: r4.evidenceRows, investigator: inv2,
    priority: 'CRITICAL', caseSeq: 2,
    statusUpdates: [
      { type: 'NOTE', body: 'Device image received at the Digital Forensics Lab. Hashing in progress.' },
      { type: 'REQUEST', body: 'Requesting subpoena for the forum account registration details.' },
    ],
  });

  // ── One completed transfer + one verification per case ──
  const ev1 = r1.evidenceRows[0];
  const t1 = await prisma.evidenceTransfer.create({
    data: {
      evidenceId: ev1.evidenceId, fromLocationId: loc.INTAKE.locationId, toLocationId: loc.LAB.locationId,
      transferredById: inv1.userId, reason: 'Forensic examination of document metadata', status: 'PENDING',
    },
  });
  await prisma.evidenceTransfer.update({
    where: { transferId: t1.transferId },
    data: { status: 'COMPLETED', receivedById: inv2.userId, completedAt: new Date(), blockchainTxId: `mock:transfer:${ev1.evidenceCode}` },
  });
  await prisma.blockchainTransaction.create({
    data: {
      evidenceId: ev1.evidenceId, eventType: 'TRANSFERRED',
      fabricTxId: `mock:transfer:${ev1.evidenceCode}`, blockReference: `blk-xfer-${ev1.evidenceId}`,
      recordedHash: ev1.sha256Hash,
      payload: { from: 'Central Evidence Intake', to: 'Digital Forensics Lab' },
    },
  });

  // Verification event (VERIFIED) for case1 evidence
  await prisma.evidence.update({
    where: { evidenceId: ev1.evidenceId },
    data: { integrityStatus: 'VERIFIED', lastVerifiedAt: new Date() },
  });
  await prisma.blockchainTransaction.create({
    data: {
      evidenceId: ev1.evidenceId, eventType: 'VERIFIED',
      fabricTxId: `mock:verify:${ev1.evidenceCode}`, blockReference: `blk-verify-${ev1.evidenceId}`,
      recordedHash: ev1.sha256Hash, payload: { result: 'VERIFIED' },
    },
  });

  console.log('\nSeed complete.');
  console.table([
    { role: 'HEAD', email: head.email, password: DEMO_PASSWORD },
    { role: 'INVESTIGATOR', email: inv1.email, password: DEMO_PASSWORD },
    { role: 'INVESTIGATOR', email: inv2.email, password: DEMO_PASSWORD },
    { role: 'COMMON_USER', email: cu1.email, password: DEMO_PASSWORD },
  ]);
  console.log(`Reports: ${reportSeq}  Cases: 2  (CASE-2026-001 -> ${inv1.fullName}, CASE-2026-002 -> ${inv2.fullName})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
