# BlockProof — Data Dictionary

PostgreSQL, 16 tables. Types shown as declared via Prisma. PK = primary key,
FK = foreign key, UK = unique. Every table has surrogate integer PK.

## roles
| Column | Type | Constraints | Notes |
|---|---|---|---|
| role_id | serial | PK | |
| name | varchar(32) | NOT NULL, UK | `HEAD` \| `INVESTIGATOR` \| `COMMON_USER` |
| description | varchar(255) | | |

## permissions
| Column | Type | Constraints | Notes |
|---|---|---|---|
| permission_id | serial | PK | |
| code | varchar(64) | NOT NULL, UK | e.g. `blockchain:read` |
| description | varchar(255) | | |

## role_permissions
| Column | Type | Constraints | Notes |
|---|---|---|---|
| role_id | int | PK, FK → roles | ON DELETE CASCADE |
| permission_id | int | PK, FK → permissions | ON DELETE CASCADE |

Composite PK. Resolves the many-to-many between roles and permissions.

## users
| Column | Type | Constraints | Notes |
|---|---|---|---|
| user_id | serial | PK | |
| role_id | int | NOT NULL, FK → roles | indexed |
| email | varchar(160) | NOT NULL, UK | login identity |
| password_hash | varchar(255) | NOT NULL | Argon2id |
| full_name | varchar(120) | NOT NULL | |
| phone | varchar(20) | | |
| badge_number | varchar(32) | UK (nullable) | staff only; null for common users |
| is_active | bool | NOT NULL, DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | auto | |

## crime_reports
| Column | Type | Constraints | Notes |
|---|---|---|---|
| report_id | serial | PK | |
| tracking_code | varchar(20) | NOT NULL, UK | public reference (`BP-2026-0001`) |
| reporter_id | int | NOT NULL, FK → users | indexed |
| crime_type | varchar(60) | NOT NULL | indexed |
| title | varchar(160) | NOT NULL | |
| description | text | NOT NULL | |
| incident_at | timestamptz | NOT NULL | CHECK ≤ created_at + 1 day |
| incident_location | varchar(255) | NOT NULL | |
| status | varchar(20) | NOT NULL, DEFAULT `SUBMITTED`, CHECK | `SUBMITTED\|UNDER_REVIEW\|ESCALATED\|REJECTED\|CLOSED` |
| created_at / updated_at | timestamptz | | indexed on created_at |

## cases
| Column | Type | Constraints | Notes |
|---|---|---|---|
| case_id | serial | PK | |
| case_number | varchar(24) | NOT NULL, UK | `CASE-2026-001` |
| report_id | int | NOT NULL, UK, FK → crime_reports | one case per report |
| lead_head_id | int | NOT NULL, FK → users | the Head who owns it |
| title | varchar(160) | NOT NULL | |
| priority | varchar(12) | NOT NULL, DEFAULT `MEDIUM`, CHECK | `LOW\|MEDIUM\|HIGH\|CRITICAL` |
| status | varchar(12) | NOT NULL, DEFAULT `OPEN`, CHECK | `OPEN\|IN_PROGRESS\|CLOSED\|REOPENED` |
| opened_at | timestamptz | DEFAULT now() | |
| closed_at | timestamptz | CHECK: set iff status=CLOSED | |
| created_at / updated_at | timestamptz | | |

## case_assignments
| Column | Type | Constraints | Notes |
|---|---|---|---|
| assignment_id | serial | PK | |
| case_id | int | NOT NULL, FK → cases (CASCADE) | |
| investigator_id | int | NOT NULL, FK → users | |
| assigned_by | int | NOT NULL, FK → users | the Head |
| is_active | bool | NOT NULL, DEFAULT true | partial UNIQUE(case_id) WHERE is_active |
| assigned_at | timestamptz | DEFAULT now() | |
| unassigned_at | timestamptz | | set when reassigned |

## evidence_types
| Column | Type | Constraints | Notes |
|---|---|---|---|
| evidence_type_id | serial | PK | |
| name | varchar(32) | NOT NULL, UK | `IMAGE\|VIDEO\|AUDIO\|DOCUMENT\|DEVICE_IMAGE\|OTHER` |
| description | varchar(255) | | |

## evidence
| Column | Type | Constraints | Notes |
|---|---|---|---|
| evidence_id | serial | PK | |
| evidence_code | varchar(20) | NOT NULL, UK | `EV-1001` |
| report_id | int | NOT NULL, FK → crime_reports | indexed |
| case_id | int | NULL, FK → cases | null until report is escalated; indexed |
| evidence_type_id | int | NOT NULL, FK → evidence_types | |
| submitted_by | int | NOT NULL, FK → users | |
| original_filename | varchar(255) | NOT NULL | |
| mime_type | varchar(120) | NOT NULL | |
| size_bytes | bigint | NOT NULL, CHECK > 0 | |
| sha256_hash | char(64) | NOT NULL, CHECK hex regex | fingerprint of original bytes; indexed |
| storage_key | varchar(255) | NOT NULL | pointer to AES-GCM ciphertext blob |
| enc_iv | varchar(48) | NOT NULL | AES-GCM IV (base64) |
| enc_auth_tag | varchar(48) | NOT NULL | AES-GCM auth tag (base64) |
| integrity_status | varchar(12) | NOT NULL, DEFAULT `PENDING`, CHECK | `PENDING\|VERIFIED\|TAMPERED`; indexed |
| last_verified_at | timestamptz | | |
| created_at / updated_at | timestamptz | | |

## evidence_locations
| Column | Type | Constraints | Notes |
|---|---|---|---|
| location_id | serial | PK | |
| name | varchar(120) | NOT NULL, UK | |
| kind | varchar(12) | NOT NULL, CHECK | `INTAKE\|LAB\|LOCKER\|COURT\|FIELD` |
| address | varchar(255) | | |
| custodian_id | int | NULL, FK → users | |

## evidence_transfers
| Column | Type | Constraints | Notes |
|---|---|---|---|
| transfer_id | serial | PK | |
| evidence_id | int | NOT NULL, FK → evidence (CASCADE) | indexed |
| from_location_id | int | NOT NULL, FK → evidence_locations | CHECK ≠ to_location_id |
| to_location_id | int | NOT NULL, FK → evidence_locations | |
| transferred_by | int | NOT NULL, FK → users | |
| received_by | int | NULL, FK → users | set on acknowledgement |
| reason | varchar(255) | NOT NULL | |
| status | varchar(12) | NOT NULL, DEFAULT `PENDING`, CHECK | `PENDING\|COMPLETED\|REJECTED`; indexed |
| blockchain_tx_id | varchar(120) | | ledger reference once anchored |
| initiated_at | timestamptz | DEFAULT now() | |
| completed_at | timestamptz | | set by trigger on COMPLETED |

## investigation_updates
| Column | Type | Constraints | Notes |
|---|---|---|---|
| update_id | serial | PK | |
| case_id | int | NOT NULL, FK → cases (CASCADE) | indexed |
| author_id | int | NOT NULL, FK → users | |
| update_type | varchar(16) | NOT NULL, CHECK | `NOTE\|FINDING\|REQUEST\|STATUS_CHANGE` |
| body | text | NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |

## forensic_analysis
| Column | Type | Constraints | Notes |
|---|---|---|---|
| analysis_id | serial | PK | |
| evidence_id | int | NOT NULL, FK → evidence (CASCADE) | indexed |
| analyst_id | int | NOT NULL, FK → users | |
| method | varchar(120) | NOT NULL | |
| summary | text | NOT NULL | |
| result | varchar(40) | NOT NULL, CHECK | `INCONCLUSIVE\|SUPPORTS\|CONTRADICTS` |
| started_at | timestamptz | DEFAULT now() | |
| completed_at | timestamptz | | |

## court_submissions
| Column | Type | Constraints | Notes |
|---|---|---|---|
| submission_id | serial | PK | |
| case_id | int | NOT NULL, FK → cases (CASCADE) | indexed |
| evidence_id | int | NOT NULL, FK → evidence | indexed |
| submitted_by | int | NOT NULL, FK → users | |
| court_reference | varchar(60) | NOT NULL | |
| status | varchar(12) | NOT NULL, DEFAULT `DRAFT`, CHECK | `DRAFT\|SUBMITTED\|ACCEPTED\|RETURNED` |
| submitted_at | timestamptz | DEFAULT now() | |

## blockchain_transactions
Append-only mirror of Hyperledger Fabric events. UPDATE/DELETE blocked by trigger.
| Column | Type | Constraints | Notes |
|---|---|---|---|
| tx_id | serial | PK | |
| evidence_id | int | NOT NULL, FK → evidence (CASCADE) | indexed |
| event_type | varchar(32) | NOT NULL, CHECK | see ER diagram enum list |
| fabric_tx_id | varchar(120) | NOT NULL | transaction id returned by the ledger |
| block_reference | varchar(60) | | block number / ref where available |
| recorded_hash | char(64) | NOT NULL | hash anchored in that event |
| payload | jsonb | | human-readable event detail |
| recorded_at | timestamptz | DEFAULT now() | indexed |

## audit_logs
Written by triggers and the audit middleware — not by feature code directly.
| Column | Type | Constraints | Notes |
|---|---|---|---|
| audit_id | serial | PK | |
| actor_id | int | NULL, FK → users | null for system/trigger events |
| action | varchar(60) | NOT NULL | e.g. `CASE_ASSIGNED` |
| entity_type | varchar(40) | NOT NULL | e.g. `Evidence` |
| entity_id | int | | |
| detail | varchar(500) | | |
| ip_address | varchar(45) | | |
| created_at | timestamptz | DEFAULT now() | indexed |

## Views (see `server/prisma/sql/03_views.sql`)
| View | Purpose |
|---|---|
| `active_case_evidence` | Open cases + active investigator + evidence/verified/tampered counts |
| `investigator_case_summary` | Per-investigator workload (cases, evidence in scope, last update) |
| `evidence_custody_summary` | Per-evidence custody: transfers, ledger events, first/last anchor |

## Functions (see `sql/05_functions.sql`)
| Function | Purpose |
|---|---|
| `assign_case(case_id, investigator_id, assigned_by)` | Atomic reassign + status bump + audit; validates role |
| `transfer_evidence(evidence_id, from, to, by, reason)` | Create PENDING transfer, block duplicates, audit |

## Triggers (see `sql/06_triggers.sql`)
| Trigger | Table | Fires |
|---|---|---|
| `evidence_audit` | evidence | AFTER INSERT/UPDATE → audit_logs |
| `transfer_state` | evidence_transfers | BEFORE UPDATE → set completed_at + audit |
| `case_status_audit` | cases | AFTER UPDATE → audit_logs on status change |
| `btx_append_only` | blockchain_transactions | BEFORE UPDATE/DELETE → raise (immutable) |
