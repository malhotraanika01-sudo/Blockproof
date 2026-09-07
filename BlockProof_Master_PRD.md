# BlockProof — Master PRD & Project Source of Truth

**Version:** 3.0
**Project:** BlockProof — Blockchain-Based Digital Crime Reporting, Evidence Integrity & Investigation Management System
**Academic Context:** Third-year B.Tech CSE DBMS project

> This document consolidates the current BlockProof project decisions, product requirements, architecture, database plan, security model, blockchain workflow, three frontend interfaces, animation/UI system, development order, testing/deployment requirements, and viva positioning.

---

## Master Decisions

- Exactly **3 distinct frontend interfaces**: Common User, Investigator, Head of Investigation.
- **Blockchain History is Head-only.**
- Investigators can verify evidence integrity but cannot inspect the underlying blockchain ledger/history.
- Common users can report crimes, upload evidence, receive a tracking ID, and track their own report status.
- All users belong to one `Users` table and are connected to roles through `RoleID`.
- PostgreSQL is the primary relational database.
- Prisma is the ORM.
- Core application stack: React + Express + PostgreSQL + Prisma + JWT.
- AES-256-GCM protects evidence confidentiality.
- SHA-256 creates evidence fingerprints for integrity verification.
- Hyperledger Fabric records compact integrity/custody events on a permissioned ledger.
- Actual evidence files are not stored directly on blockchain.
- Framer Motion is the primary frontend animation library.
- Lucide React is the icon library.
- Tailwind CSS is the main styling system.
- Recharts is recommended for Head analytics.
- Use fictional demonstration data only.

---

# Part I — Existing Project Resume / Core PRD

# BlockProof — Project Resume / Context for New Chat

## IMPORTANT
This file is the compact source of truth for continuing the BlockProof project in a different ChatGPT chat. Use this context before proposing architecture, code, database schema, UI, or documentation changes.

## Project
**Title:** BlockProof — Blockchain-Based Digital Crime Reporting, Evidence Integrity & Investigation Management System

**Purpose:** Third-year B.Tech CSE DBMS project. The project must satisfy the professor's DBMS/project rubric while adding meaningful blockchain and cryptographic security.

## Core Product Idea
BlockProof is a digital crime reporting + forensic investigation platform with **three completely different frontend interfaces**:

1. **Common User — Public Crime Reporting Portal**
   - Reports any kind of crime.
   - Can submit description/text plus proofs/evidence: screenshots, images, videos, audio, PDFs/documents and other supported files.
   - Does NOT see blockchain history or investigator information.
   - Receives a report/tracking ID and can track their own report.

2. **Investigator — Investigation Workspace**
   - Sees only cases assigned to them.
   - Can view authorized evidence.
   - Can add investigation updates, notes, findings and requests.
   - Can transfer evidence to authorized people/locations.
   - Can verify evidence integrity.
   - **CANNOT view blockchain history/ledger.**

3. **Head of Investigation — Investigation Command Center**
   - Full system access.
   - Sees all reports, cases, evidence, investigators, transfers, analysis, users and analytics.
   - Assigns/reassigns investigators.
   - Manages users/roles.
   - Views audit logs and tampering alerts.
   - **ONLY role allowed to view Blockchain History.**
   - Can close/reopen cases and generate system-wide reports.

## Critical Security Concept
Do NOT say "blockchain encrypts evidence." The technically correct separation is:

- **AES-256-GCM** = encrypts the actual evidence and protects confidentiality.
- **SHA-256** = creates a fingerprint/hash of the evidence for integrity checking.
- **Hyperledger Fabric** = stores the evidence fingerprint and critical custody/event records immutably on a permissioned ledger.
- **PostgreSQL** = stores relational metadata and maps application records to blockchain transaction IDs.
- Actual evidence files are **NOT stored directly on blockchain**.

### Security flow
```text
Common User uploads evidence
        ↓
Backend validation
        ↓
SHA-256 hash of original bytes
        ↓
AES-256-GCM encryption
        ↓
Encrypted evidence stored in controlled file storage
        ↓
Evidence metadata stored in PostgreSQL
        ↓
Hash + evidence ID + event + timestamp + custody reference
        ↓
Hyperledger Fabric transaction
        ↓
Blockchain transaction ID saved in PostgreSQL
```

### Verification flow
```text
Authorized Investigator or Head clicks Verify
        ↓
Current evidence accessed/decrypted as authorized
        ↓
SHA-256 calculated again
        ↓
Compare with original blockchain-associated hash
        ↓
Same → VERIFIED
Different → TAMPERING DETECTED
        ↓
Verification event recorded in Audit_Log
```

## Blockchain Rules
- Use **Hyperledger Fabric**, not a custom blockchain.
- Use JavaScript chaincode/smart contracts.
- Suggested chaincode functions:
  - `CreateEvidence()`
  - `TransferEvidence()`
  - `VerifyEvidence()`
  - `GetEvidence()`
  - `GetEvidenceHistory()`
- Blockchain events:
  - Evidence Created
  - Assigned to Investigator
  - Transferred
  - Received by Lab
  - Analysis Completed
  - Submitted to Court
  - Other approved custody events
- **Blockchain History UI/API is Head-only.**
- Investigators can get a verification result but cannot inspect underlying blockchain history.

## Exact Recommended Tech Stack
- **Frontend:** React.js
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Password hashing:** Argon2 or bcrypt
- **Evidence encryption:** AES-256-GCM
- **Integrity:** SHA-256
- **Blockchain:** Hyperledger Fabric
- **Smart contracts:** JavaScript Chaincode
- **File upload:** Multer
- **API:** REST
- **Testing:** Postman
- **Containers:** Docker
- **Version control:** Git + GitHub
- **Deployment target:** Vercel for frontend, Render for backend, PostgreSQL service such as Supabase/Railway; keep Fabric in Docker/demo environment unless a practical deployment path is established.

## Why This Stack
The professor's permitted/recommended combination supports **React + Express.js + PostgreSQL + Prisma + JWT**. PostgreSQL is preferred because this is a relational DBMS project requiring normalization, PK/FK relationships, constraints, transactions, joins, aggregates, views, procedures, triggers and indexes. MongoDB/Firebase are not the preferred direction for this rubric. JWT is simpler than adding OAuth for this academic RBAC system. Hyperledger Fabric fits a permissioned forensic workflow better than a public cryptocurrency blockchain. Do not build a blockchain from scratch.

## Proposed Database Tables
Target approximately **14 normalized tables**:

1. `Users`
2. `Roles`
3. `Permissions`
4. `Crime_Reports`
5. `Cases`
6. `Evidence`
7. `Evidence_Types`
8. `Evidence_Transfers`
9. `Investigation_Updates`
10. `Forensic_Analysis`
11. `Court_Submissions`
12. `Evidence_Locations`
13. `Blockchain_Transactions`
14. `Audit_Logs`

### Main relationships
```text
Users → Roles
Roles → Permissions

Common User → Crime_Reports
Crime_Reports → Cases
Cases → Evidence
Cases → Investigator/User assignment
Evidence → Evidence_Transfers
Evidence → Forensic_Analysis
Evidence → Court_Submissions
Evidence → Evidence_Locations
Evidence → Blockchain_Transactions
Users → Investigation_Updates
Users → Audit_Logs
```

## Role Matrix
| Feature | Head | Investigator | Common User |
|---|---|---|---|
| Report Crime | ❌ | ❌ | ✅ |
| Upload Evidence | ✅ | ✅ | ✅ |
| View All Cases | ✅ | ❌ | ❌ |
| View Assigned Cases | ✅ | ✅ | ❌ |
| Add Case Updates | ✅ | ✅ | ❌ |
| Transfer Evidence | ✅ | ✅ | ❌ |
| Verify Evidence | ✅ | ✅ | ❌ |
| **View Blockchain History** | **✅** | **❌** | **❌** |
| Audit Logs | ✅ | ❌ | ❌ |
| Manage Users/Roles | ✅ | ❌ | ❌ |
| Analytics | ✅ | Limited | ❌ |
| Close/Reopen Cases | ✅ | ❌ | ❌ |

## Frontend Identity

### Common User
Should look like a **public safety/reporting website**, not an admin dashboard.
Navigation:
- Home
- Report Crime
- My Reports
- Track Report
- Help

Main page:
- Crime type
- Date/time
- Location
- Description
- Upload images/videos/audio/documents/screenshots
- Submit Report

After submission:
- Report ID/tracking ID
- Submission status
- Message that evidence is cryptographically protected
- Do NOT expose blockchain details.

### Investigator
Should look like a **professional investigation workspace**.
Navigation:
- Dashboard
- My Cases
- Evidence
- Investigation Updates
- Transfers
- Verification
- Profile

Main features:
- Assigned case cards
- Evidence viewer
- Add update
- Transfer evidence
- Verify evidence
- Human-readable custody timeline

Do NOT show Blockchain History.

### Head
Should look like a **command center / investigation control room**.
Navigation:
- Command Center
- Crime Reports
- All Cases
- All Evidence
- Investigators
- Analytics
- Audit Logs
- Blockchain History
- Users / Settings

Dashboard:
- Total cases
- Active cases
- Pending reports
- Evidence count
- Verified evidence
- Tampering alerts
- Investigator workload
- Case distribution

Blockchain page:
- Evidence ID
- Event type
- Timestamp
- Transaction ID
- Block/ledger reference where available
- Hash/fingerprint
- Human-readable custody sequence

## DBMS Requirements to Preserve
The professor's project requirements must remain satisfied:
- ER diagram first; evaluated tables must come from ER model.
- Minimum 8–10 related tables; target ~14.
- 3NF or higher.
- PK/FK, NOT NULL, UNIQUE, CHECK, DEFAULT constraints.
- CRUD.
- INNER JOIN, LEFT JOIN and multi-table joins.
- Aggregates: COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING.
- Views.
- Transactions.
- Stored procedure/function.
- Trigger.
- Indexes.
- Search/filtering/pagination.
- Validation and exception handling.
- Authentication + RBAC.
- Backup/restore with PostgreSQL tools.
- Git/GitHub with meaningful commits/branches and secrets excluded.
- Docker/containerization and deployment where practical.

## Suggested Views / Procedures / Triggers
Views:
- `active_case_evidence`
- `investigator_case_summary`
- `evidence_custody_summary`

Stored procedures/functions:
- `transfer_evidence()`
- possibly `assign_case()`

Triggers:
- automatic `Audit_Log` entry on sensitive actions
- audit evidence transfer
- optionally update timestamps/status consistency

Indexes:
- `case_number`
- `evidence_id`
- `user_id`
- `sha256_hash`
- report status/date where useful

## Key End-to-End Story
```text
COMMON USER
    ↓
Crime Report + Text/Images/Video/Audio/Documents
    ↓
AES-256-GCM encryption + SHA-256 hash
    ↓
Encrypted file + metadata in PostgreSQL/storage
    ↓
Hash + evidence event on Hyperledger Fabric
    ↓
HEAD REVIEWS REPORT
    ↓
HEAD ASSIGNS INVESTIGATOR
    ↓
INVESTIGATOR WORKS ASSIGNED CASE
    ↓
Evidence review + investigation updates + custody transfers
    ↓
Integrity verification
    ↓
Head can inspect complete Blockchain History
```

## Development Order
1. Finalize requirements.
2. Finalize three interface wireframes.
3. Create ER diagram.
4. Create normalized PostgreSQL schema.
5. Add sample/dummy data.
6. Add DBMS requirements: CRUD, joins, aggregates, views, procedures, triggers, indexes, transactions.
7. Configure Prisma.
8. Build Express REST API.
9. Build JWT authentication + RBAC.
10. Build Common User portal.
11. Implement file uploads.
12. Implement AES-256-GCM encryption.
13. Implement SHA-256 hashing.
14. Build Investigator workspace.
15. Build Head command center.
16. Set up Hyperledger Fabric test network.
17. Write/deploy JavaScript chaincode.
18. Integrate evidence creation and custody transactions.
19. Implement integrity verification.
20. Implement Head-only blockchain history.
21. Add audit logs, analytics, search, filtering, pagination and reports.
22. Test with Postman and UI tests.
23. Dockerize.
24. GitHub workflow/branches/commits.
25. Backup/restore.
26. Deployment.
27. Documentation, PPT, diagrams and viva preparation.

## Dummy Data
Use fictional data only.
Example crime types:
- Cyber Fraud
- Identity Theft
- Phishing
- Financial Fraud
- Harassment
- Data Theft

Example evidence:
- CCTV video
- Screenshot
- Chat export PDF
- Audio recording
- Bank statement
- Device image
- Email export

All names, locations, case numbers, hashes and blockchain transaction IDs should be made up for demonstration.

## Important Design Decisions Already Made
- There are exactly **3 distinct interfaces**.
- Head has **full access**.
- Investigator sees assigned cases and can update/verify/transfer but **cannot view blockchain history**.
- Common user reports crimes and uploads evidence.
- **Blockchain history is Head-only.**
- Blockchain is not used to store actual evidence files.
- AES-256-GCM protects evidence confidentiality.
- SHA-256 + blockchain provide integrity/immutable custody proof.
- PostgreSQL is the primary relational DB.
- Prisma is the ORM.
- React + Express + PostgreSQL + Prisma + JWT is the core application stack.


---

# Part II — Frontend Plugins, Animation & UI Specification

BLOCKPROOF — FRONTEND PLUGINS, ANIMATION & UI SETUP
=========================================================

Project:
BlockProof: A Blockchain-Based Digital Evidence Chain-of-Custody and Integrity Management System

Recommended Frontend Stack:
- React.js
- Tailwind CSS
- Framer Motion
- Lucide React
- Recharts
- React Router (for multiple pages/interfaces)

---------------------------------------------------------
1. RECOMMENDED ANIMATION/UI TOOLS
---------------------------------------------------------

Main recommendation:

Framer Motion
- Best for React UI animations and transitions.
- Use for page transitions, cards, modals, dashboards, timelines, hover effects, upload states and verification states.

Lucide React
- Icon library for React.
- Use instead of manually downloading icon images.
- Good for shields, uploads, files, searches, users, locks, blockchain, alerts, etc.

Tailwind CSS
- Main styling system.
- Use for spacing, colors, typography, borders, shadows, responsive layouts, grids, buttons and cards.

Recharts
- Recommended for analytics and charts in the Head of Investigation interface.

Optional:
Lottie
- Use only for special animated illustrations or important success states.
- Example: Evidence uploaded → encrypted → blockchain record created → verified.

GSAP
- Powerful for complex/cinematic animations.
- Not necessary for the first version of BlockProof.
- Framer Motion is simpler and better suited to normal React UI animation.

React Spring
- Good for physics-based animations.
- Not necessary for this project initially.

AOS
- Good for basic scroll-in animations.
- Not necessary when Framer Motion is already being used.

---------------------------------------------------------
2. WHY FRAMER MOTION
---------------------------------------------------------

Framer Motion integrates naturally with React and is relatively easy to use.

Example:

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
  <EvidenceCard />
</motion.div>

Useful animation properties:
- initial
- animate
- exit
- transition
- whileHover
- whileTap
- variants

Important:
Do NOT animate everything.

BlockProof is a forensic/investigation system. Excessive animation can make it look like a gaming website.

Use subtle, professional animations.

---------------------------------------------------------
3. INSTALLATION
---------------------------------------------------------

If the React/Vite project already exists:

npm install framer-motion lucide-react recharts

If starting from zero:

npm create vite@latest blockproof -- --template react

cd blockproof

npm install

npm install framer-motion lucide-react recharts

npm run dev

If Tailwind CSS has already been configured, no additional Tailwind installation is needed.

---------------------------------------------------------
4. LUCIDE REACT
---------------------------------------------------------

Import icons:

import { ShieldCheck, Upload, FileText, Search } from "lucide-react";

Use them:

<ShieldCheck size={24} />
<Upload size={24} />
<FileText size={24} />
<Search size={24} />

With Tailwind:

<ShieldCheck className="w-6 h-6 text-green-600" />

Useful BlockProof icons:
- ShieldCheck
- ShieldAlert
- Upload
- FileText
- Image
- Video
- FileAudio
- Search
- Lock
- Unlock
- User
- Users
- UserCheck
- Database
- Link
- Blocks
- Activity
- AlertTriangle
- CheckCircle
- Clock
- MapPin
- Calendar
- Eye
- Download
- ArrowRightLeft
- ClipboardCheck

---------------------------------------------------------
5. TAILWIND CSS
---------------------------------------------------------

Tailwind is responsible for the visual design.

Example evidence card:

<div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
    <h2 className="text-xl font-semibold">
        Digital Evidence
    </h2>

    <p className="text-gray-500 mt-2">
        Evidence ID: EV-1024
    </p>
</div>

Tailwind handles:
- spacing
- colors
- fonts
- borders
- shadows
- grids
- responsive design
- buttons
- cards
- layout

---------------------------------------------------------
6. FRAMER MOTION + TAILWIND + LUCIDE EXAMPLE
---------------------------------------------------------

Example Evidence Card:

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

function EvidenceCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-md border border-gray-200"
        >
            <ShieldCheck className="w-8 h-8 text-green-600" />

            <h2 className="text-xl font-semibold mt-4">
                Evidence Verified
            </h2>

            <p className="text-gray-500 mt-2">
                SHA-256 integrity check successful.
            </p>
        </motion.div>
    );
}

export default EvidenceCard;

What each technology does:
- Tailwind → makes the card look good.
- Lucide → provides the shield icon.
- Framer Motion → animates the card.

---------------------------------------------------------
7. BLOCKPROOF FRONTEND STRUCTURE
---------------------------------------------------------

Recommended structure:

src/
│
├── components/
│   ├── Button.jsx
│   ├── EvidenceCard.jsx
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   ├── StatusBadge.jsx
│   └── Timeline.jsx
│
├── pages/
│   │
│   ├── common/
│   │   ├── Home.jsx
│   │   ├── ReportCrime.jsx
│   │   ├── MyReports.jsx
│   │   └── TrackReport.jsx
│   │
│   ├── investigator/
│   │   ├── Dashboard.jsx
│   │   ├── MyCases.jsx
│   │   ├── Evidence.jsx
│   │   ├── Transfers.jsx
│   │   └── Verification.jsx
│   │
│   └── head/
│       ├── CommandCenter.jsx
│       ├── AllCases.jsx
│       ├── Analytics.jsx
│       ├── AuditLogs.jsx
│       └── BlockchainHistory.jsx
│
├── animations/
│   └── variants.js
│
└── App.jsx

---------------------------------------------------------
8. REUSABLE ANIMATION VARIANTS
---------------------------------------------------------

Create:

src/animations/variants.js

Code:

export const fadeUp = {
    hidden: {
        opacity: 0,
        y: 20
    },

    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4
        }
    }
};

Use it:

import { motion } from "framer-motion";
import { fadeUp } from "../animations/variants";

<motion.div
    variants={fadeUp}
    initial="hidden"
    animate="visible"
>
    Your content
</motion.div>

This keeps animations consistent throughout the project.

---------------------------------------------------------
9. THREE COMPLETELY DIFFERENT FRONTEND INTERFACES
---------------------------------------------------------

BLOCKPROOF has three distinct interfaces.

A. COMMON USER — PUBLIC CRIME REPORTING PORTAL
------------------------------------------------

This should NOT look like an admin dashboard.

Visual identity:
- Clean
- Public-safety focused
- Friendly
- Simple
- Trustworthy

Navigation:
- Home
- Report Crime
- My Reports
- Track Report
- Help

Core actions:
- Report any crime
- Enter crime type
- Enter date/time
- Enter location
- Enter description
- Add additional information
- Upload images
- Upload videos
- Upload audio
- Upload PDFs/documents
- Receive report/tracking ID
- Track report status

Suggested animations:
- Smooth page transitions
- Form sections appearing progressively
- Upload-area animation
- Drag-and-drop feedback
- Submit button loading state
- Successful submission animation
- Animated tracking timeline

Suggested flow:

Home
  ↓
Report Crime
  ↓
Upload Evidence
  ↓
Encryption
  ↓
Blockchain Record
  ↓
Report Submitted
  ↓
Tracking ID

Do NOT expose blockchain history or investigator information to the common user.

---------------------------------------------------------
B. INVESTIGATOR — INVESTIGATION WORKSPACE
---------------------------------------------------------

Visual identity:
- Professional
- Forensic
- Work-focused
- Information dense but organized

Navigation:
- Dashboard
- My Cases
- Evidence
- Investigation Updates
- Transfers
- Verification
- Profile

Investigator can:
- See assigned cases only
- View authorized evidence
- Add investigation updates
- Add notes/findings
- Request actions
- Transfer evidence when authorized
- Verify evidence integrity
- View human-readable chain-of-custody timeline

Investigator CANNOT:
- View underlying blockchain history/ledger
- Manage users/roles
- View all system cases unless assigned/authorized

Suggested animations:
- Evidence cards entering the screen
- Smooth filtering
- Timeline transitions
- Expand/collapse evidence details
- Transfer modal animation
- Verification status animation

Verification flow:

VERIFY EVIDENCE

Checking file...
      ↓
Computing SHA-256...
      ↓
Comparing fingerprint...
      ↓
✓ INTEGRITY VERIFIED

If the hash differs:

⚠ TAMPERING DETECTED

The investigator sees the verification result, but not the underlying blockchain history.

---------------------------------------------------------
C. HEAD OF INVESTIGATION — COMMAND CENTER
---------------------------------------------------------

Visual identity:
- Mission-control / command-center style
- Professional
- High information density
- Strong visual hierarchy

Navigation:
- Command Center
- Crime Reports
- All Cases
- All Evidence
- Investigators
- Analytics
- Audit Logs
- Blockchain History
- Users / Settings

Head can:
- Review all reports
- Convert reports into official cases
- Assign/reassign investigators
- View all evidence
- View all investigators
- View audit logs
- View tampering alerts
- Manage users and roles
- Close/reopen cases
- Generate reports
- View analytics
- View blockchain history

ONLY THE HEAD OF INVESTIGATION CAN SEE:
- Blockchain History
- Ledger details
- Blockchain transaction details

Suggested dashboard cards:

TOTAL CASES       247
ACTIVE CASES       84
EVIDENCE         1,284
TAMPER ALERTS       3

The numbers can animate from 0 to their actual values.

---------------------------------------------------------
10. BLOCKCHAIN HISTORY PAGE
---------------------------------------------------------

This page is Head-only.

Show information such as:

Evidence ID
Event Type
Timestamp
Transaction ID
Block/Ledger Reference
SHA-256 Fingerprint
Custody Event

Example visual timeline:

Evidence Created
      │
      ▼
Block #18291
      │
      ▼
Transferred
      │
      ▼
Block #18292
      │
      ▼
Verified
      │
      ▼
Block #18293

Keep blockchain animations subtle and professional.

Do not make the blockchain constantly spin or use excessive effects.

---------------------------------------------------------
11. RECOMMENDED BLOCKCHAIN UI
---------------------------------------------------------

For Head:

- Animated transaction timeline
- Block cards
- Transaction status badges
- Hash/fingerprint display
- Timestamp
- Evidence ID
- Event type
- Transfer history
- Verification status

Example:

BLOCK #18293

Evidence:
EV-1024

Event:
EVIDENCE VERIFIED

Timestamp:
2026-09-05 02:41:18

Transaction:
TX-8F21A9...

Hash:
a91c...72bf

Status:
VERIFIED

---------------------------------------------------------
12. ANIMATIONS TO USE
---------------------------------------------------------

Good animations for BlockProof:

Page:
- fade
- slide-up
- slide-right

Cards:
- fade-in
- slight upward movement
- subtle hover elevation

Buttons:
- hover scale around 1.01–1.03
- pressed state
- loading spinner

Forms:
- field focus transitions
- validation feedback
- section transitions

Evidence:
- upload progress
- file preview appearance
- verification state transition

Timeline:
- events appearing sequentially
- connecting line animation

Dashboard:
- number counters
- chart entrance animation
- alert pulse only when necessary

Modal:
- fade + slight scale
- backdrop fade

---------------------------------------------------------
13. ANIMATIONS TO AVOID
---------------------------------------------------------

Avoid:
- excessive spinning
- huge bouncing elements
- constant pulsing
- long page transitions
- distracting particle effects
- animations on every single element
- gaming-style UI effects

The project should look like a serious forensic/investigation application.

---------------------------------------------------------
14. RECOMMENDED EXTRA PACKAGE
---------------------------------------------------------

Install:

npm install recharts

Use Recharts in the Head Command Center for:
- Cases by status
- Cases by crime type
- Evidence by type
- Investigator workload
- Monthly reports
- Verification results
- Tampering incidents

Example dashboard:

Cases by Status
  Active
  Under Investigation
  Closed
  Pending

Investigator Workload
  Investigator A — 12
  Investigator B — 8
  Investigator C — 15

---------------------------------------------------------
15. FINAL FRONTEND STACK
---------------------------------------------------------

React
│
├── Tailwind CSS
│     → UI / styling
│
├── Framer Motion
│     → animations
│
├── Lucide React
│     → icons
│
└── Recharts
      → analytics / charts

Recommended additional frontend utility:
- React Router → routing between pages
- Axios or fetch → backend API communication
- React Hook Form → complex form handling (optional)
- Zod → validation (optional)

---------------------------------------------------------
16. BLOCKPROOF DESIGN PRINCIPLE
---------------------------------------------------------

Three interfaces should feel like three different products:

COMMON USER
Public safety website
Simple and trustworthy
Minimal technical details

INVESTIGATOR
Professional forensic workspace
Evidence and case focused
Efficient workflows

HEAD OF INVESTIGATION
Command center
Analytics and system oversight
Full blockchain/audit visibility

The frontend should not simply hide/show buttons on one dashboard.

---------------------------------------------------------
17. RECOMMENDED DEVELOPMENT ORDER
---------------------------------------------------------

1. Create React/Vite project
2. Configure Tailwind CSS
3. Install Framer Motion
4. Install Lucide React
5. Install Recharts
6. Configure React Router
7. Create global layout/components
8. Build Common User interface
9. Build Investigator interface
10. Build Head Command Center
11. Add animations
12. Add responsive/mobile behavior
13. Connect frontend to Express REST APIs
14. Add JWT authentication
15. Add RBAC route protection
16. Connect evidence upload
17. Connect verification
18. Connect analytics
19. Connect Head-only blockchain history
20. Test all three interfaces

---------------------------------------------------------
18. IMPORTANT SECURITY/UI RULE
---------------------------------------------------------

Frontend role restrictions are NOT enough.

Even if a page or menu item is hidden from an Investigator, the backend API must also reject unauthorized requests.

For example:

Common User:
NO blockchain history API access

Investigator:
NO blockchain history API access

Head:
YES blockchain history API access

The backend must enforce this with JWT + RBAC.

---------------------------------------------------------
19. CORE BLOCKPROOF EVIDENCE FLOW
---------------------------------------------------------

COMMON USER

Upload evidence
      ↓
Backend validates file
      ↓
SHA-256 hash created
      ↓
AES-256-GCM encryption
      ↓
Encrypted evidence stored securely
      ↓
Metadata stored in PostgreSQL
      ↓
Hash + event recorded on Hyperledger Fabric
      ↓
Blockchain transaction ID stored in PostgreSQL
      ↓
Head reviews report
      ↓
Head assigns investigator
      ↓
Investigator works on case
      ↓
Evidence transferred when authorized
      ↓
Blockchain transfer event recorded
      ↓
Investigator/Head verifies integrity
      ↓
Head can inspect complete blockchain history

IMPORTANT:
Do NOT say that blockchain encrypts the evidence.

AES-256-GCM:
Protects confidentiality of the actual evidence.

SHA-256:
Creates an integrity fingerprint/hash.

Hyperledger Fabric:
Stores hash/fingerprint and critical custody/event records in a permissioned immutable ledger.

PostgreSQL:
Stores relational metadata, users, cases, evidence metadata, encrypted-file references and blockchain transaction mappings.

Actual evidence files:
Should NOT be stored directly on the blockchain.

---------------------------------------------------------
20. FINAL RECOMMENDATION
---------------------------------------------------------

Use:

React
+ Tailwind CSS
+ Framer Motion
+ Lucide React
+ Recharts
+ React Router

For BlockProof, Framer Motion should be the primary animation library.

Use Lottie only for special moments.

Do not add GSAP unless the project later needs complex timeline/cinematic animations.

Keep the animation style subtle, fast and professional.

The goal is:
"High-tech forensic system"
NOT
"over-animated gaming website."


---

# Part III — Final Implementation Checklist

## Requirements
- [ ] Problem statement finalized
- [ ] Objectives finalized
- [ ] Scope finalized
- [ ] Three interfaces finalized
- [ ] Role matrix finalized

## Database
- [ ] ER diagram
- [ ] Relational schema
- [ ] Data dictionary
- [ ] 3NF normalization
- [ ] 8–10+ related tables
- [ ] PKs and FKs
- [ ] Constraints
- [ ] Indexes
- [ ] CRUD
- [ ] Joins
- [ ] Aggregates
- [ ] Views
- [ ] Stored procedure/function
- [ ] Trigger
- [ ] Transactions

## Backend
- [ ] Express server
- [ ] Prisma
- [ ] REST APIs
- [ ] Validation
- [ ] Error handling
- [ ] Transactions
- [ ] File upload

## Security
- [ ] JWT
- [ ] Argon2/bcrypt
- [ ] RBAC
- [ ] AES-256-GCM
- [ ] SHA-256
- [ ] Secure key handling
- [ ] Audit logs
- [ ] Tampering detection

## Blockchain
- [ ] Hyperledger Fabric test network
- [ ] JavaScript chaincode
- [ ] CreateEvidence
- [ ] TransferEvidence
- [ ] VerifyEvidence
- [ ] GetEvidence
- [ ] GetEvidenceHistory
- [ ] Evidence creation event
- [ ] Custody transfer event
- [ ] Verification event
- [ ] Head-only blockchain history

## Frontend
- [ ] Common User portal
- [ ] Investigator workspace
- [ ] Head command center
- [ ] Tailwind CSS
- [ ] Framer Motion
- [ ] Lucide React
- [ ] Recharts
- [ ] React Router
- [ ] Responsive design
- [ ] Search
- [ ] Filtering
- [ ] Pagination
- [ ] Loading/error states

## Professional Practice
- [ ] Private GitHub repository
- [ ] Main branch
- [ ] Dev branch
- [ ] Meaningful commits
- [ ] README
- [ ] `.gitignore`
- [ ] No secrets in source control
- [ ] Docker
- [ ] Backup/restore
- [ ] Testing
- [ ] Deployment/live URL where practical
- [ ] Documentation
- [ ] PPT
- [ ] Viva preparation

---

# Final Product Positioning

BlockProof should be presented as an **academic forensic evidence workflow** demonstrating relational database management, cryptographic evidence protection, controlled investigation access, and immutable blockchain-based custody/integrity verification. It is not a production police or court system.
