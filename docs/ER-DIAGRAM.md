# BlockProof — ER Diagram

Entities are derived first (per the professor's requirement that evaluated tables come from the ER model).
14 entities, 3NF or higher. Mermaid source below renders on GitHub.

```mermaid
erDiagram
    ROLES ||--o{ USERS : "assigned to"
    ROLES ||--o{ ROLE_PERMISSIONS : has
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "granted by"

    USERS ||--o{ CRIME_REPORTS : files
    USERS ||--o{ CASES : "leads (head)"
    USERS ||--o{ CASE_ASSIGNMENTS : "assigned as investigator"
    USERS ||--o{ INVESTIGATION_UPDATES : writes
    USERS ||--o{ EVIDENCE_TRANSFERS : initiates
    USERS ||--o{ FORENSIC_ANALYSIS : performs
    USERS ||--o{ AUDIT_LOGS : "acts in"

    CRIME_REPORTS ||--o| CASES : "escalated into"
    CRIME_REPORTS ||--o{ EVIDENCE : "submitted with"

    CASES ||--o{ CASE_ASSIGNMENTS : has
    CASES ||--o{ EVIDENCE : contains
    CASES ||--o{ INVESTIGATION_UPDATES : has
    CASES ||--o{ COURT_SUBMISSIONS : "produces"

    EVIDENCE_TYPES ||--o{ EVIDENCE : classifies
    EVIDENCE ||--o{ EVIDENCE_TRANSFERS : "moves via"
    EVIDENCE ||--o{ FORENSIC_ANALYSIS : "examined in"
    EVIDENCE ||--o{ COURT_SUBMISSIONS : "included in"
    EVIDENCE ||--o{ BLOCKCHAIN_TRANSACTIONS : "anchored by"
    EVIDENCE_LOCATIONS ||--o{ EVIDENCE_TRANSFERS : "source/destination"

    ROLES {
        int role_id PK
        string name UK "HEAD | INVESTIGATOR | COMMON_USER"
        string description
    }
    PERMISSIONS {
        int permission_id PK
        string code UK "e.g. blockchain:read"
        string description
    }
    ROLE_PERMISSIONS {
        int role_id PK,FK
        int permission_id PK,FK
    }
    USERS {
        int user_id PK
        int role_id FK
        string email UK
        string password_hash
        string full_name
        string phone
        string badge_number UK "null for common users"
        bool is_active
        datetime created_at
        datetime updated_at
    }
    CRIME_REPORTS {
        int report_id PK
        string tracking_code UK
        int reporter_id FK
        string crime_type
        string title
        string description
        datetime incident_at
        string incident_location
        string status "SUBMITTED|UNDER_REVIEW|ESCALATED|REJECTED|CLOSED"
        datetime created_at
        datetime updated_at
    }
    CASES {
        int case_id PK
        string case_number UK
        int report_id FK
        int lead_head_id FK
        string title
        string priority "LOW|MEDIUM|HIGH|CRITICAL"
        string status "OPEN|IN_PROGRESS|CLOSED|REOPENED"
        datetime opened_at
        datetime closed_at
        datetime created_at
        datetime updated_at
    }
    CASE_ASSIGNMENTS {
        int assignment_id PK
        int case_id FK
        int investigator_id FK
        int assigned_by FK
        bool is_active
        datetime assigned_at
        datetime unassigned_at
    }
    EVIDENCE_TYPES {
        int evidence_type_id PK
        string name UK "IMAGE|VIDEO|AUDIO|DOCUMENT|DEVICE_IMAGE|OTHER"
        string description
    }
    EVIDENCE {
        int evidence_id PK
        string evidence_code UK
        int report_id FK
        int case_id FK "nullable until escalated"
        int evidence_type_id FK
        int submitted_by FK
        string original_filename
        string mime_type
        bigint size_bytes
        string sha256_hash "hex, 64 chars"
        string storage_key "pointer to ciphertext blob"
        string enc_iv "AES-GCM IV, base64"
        string enc_auth_tag "AES-GCM auth tag, base64"
        string integrity_status "PENDING|VERIFIED|TAMPERED"
        datetime last_verified_at
        datetime created_at
        datetime updated_at
    }
    EVIDENCE_LOCATIONS {
        int location_id PK
        string name UK
        string kind "INTAKE|LAB|LOCKER|COURT|FIELD"
        string address
        int custodian_id FK
    }
    EVIDENCE_TRANSFERS {
        int transfer_id PK
        int evidence_id FK
        int from_location_id FK
        int to_location_id FK
        int transferred_by FK
        int received_by FK "nullable until acknowledged"
        string reason
        string status "PENDING|COMPLETED|REJECTED"
        string blockchain_tx_id "nullable"
        datetime initiated_at
        datetime completed_at
    }
    INVESTIGATION_UPDATES {
        int update_id PK
        int case_id FK
        int author_id FK
        string update_type "NOTE|FINDING|REQUEST|STATUS_CHANGE"
        string body
        datetime created_at
    }
    FORENSIC_ANALYSIS {
        int analysis_id PK
        int evidence_id FK
        int analyst_id FK
        string method
        string summary
        string result
        datetime started_at
        datetime completed_at
    }
    COURT_SUBMISSIONS {
        int submission_id PK
        int case_id FK
        int evidence_id FK
        int submitted_by FK
        string court_reference
        string status "DRAFT|SUBMITTED|ACCEPTED|RETURNED"
        datetime submitted_at
    }
    BLOCKCHAIN_TRANSACTIONS {
        int tx_id PK
        int evidence_id FK
        string event_type "EVIDENCE_CREATED|ASSIGNED|TRANSFERRED|RECEIVED_BY_LAB|ANALYSIS_COMPLETED|SUBMITTED_TO_COURT|VERIFIED|TAMPER_DETECTED"
        string fabric_tx_id
        string block_reference
        string recorded_hash
        json payload
        datetime recorded_at
    }
    AUDIT_LOGS {
        int audit_id PK
        int actor_id FK "nullable for system events"
        string action
        string entity_type
        int entity_id
        string detail
        string ip_address
        datetime created_at
    }
```

## Cardinality notes

- `USERS.role_id` → every user has exactly one role; a role has many users.
- `CRIME_REPORTS` 1—0..1 `CASES`: a report may be escalated into at most one case; a case originates from exactly one report.
- `CASES` 1—* `CASE_ASSIGNMENTS`: reassignment keeps history; only one row per case has `is_active = true`.
- `EVIDENCE.case_id` is nullable — evidence exists from the moment of the report, before a case is opened.
- `BLOCKCHAIN_TRANSACTIONS` is an append-only mirror of ledger events; PostgreSQL never mutates existing rows.
- `AUDIT_LOGS` is written by triggers, not by application code, for tamper-relevant actions.

## Normalization

- All non-key attributes depend on the whole PK and only the PK (2NF/3NF).
- Repeating groups (permissions per role, assignments per case, transfers per evidence) are separate tables.
- Lookup values that are shared and describable (`EVIDENCE_TYPES`, `EVIDENCE_LOCATIONS`, `ROLES`, `PERMISSIONS`) are their own entities rather than free-text columns.
- Enumerations that are purely status labels with no extra attributes are kept as `CHECK`-constrained columns (documented in the data dictionary) rather than lookup tables, to keep joins readable — a deliberate 3NF-compatible choice.
