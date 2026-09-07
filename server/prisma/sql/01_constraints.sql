-- BlockProof — CHECK constraints
-- Applied after `prisma migrate`. Idempotent: drops then re-adds.
-- Demonstrates: CHECK, NOT NULL (in schema), UNIQUE (in schema), DEFAULT (in schema).

-- crime_reports.status
ALTER TABLE crime_reports DROP CONSTRAINT IF EXISTS chk_crime_reports_status;
ALTER TABLE crime_reports ADD CONSTRAINT chk_crime_reports_status
  CHECK (status IN ('SUBMITTED','UNDER_REVIEW','ESCALATED','REJECTED','CLOSED'));

ALTER TABLE crime_reports DROP CONSTRAINT IF EXISTS chk_crime_reports_incident_past;
ALTER TABLE crime_reports ADD CONSTRAINT chk_crime_reports_incident_past
  CHECK (incident_at <= created_at + INTERVAL '1 day');

-- cases
ALTER TABLE cases DROP CONSTRAINT IF EXISTS chk_cases_priority;
ALTER TABLE cases ADD CONSTRAINT chk_cases_priority
  CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL'));

ALTER TABLE cases DROP CONSTRAINT IF EXISTS chk_cases_status;
ALTER TABLE cases ADD CONSTRAINT chk_cases_status
  CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED','REOPENED'));

ALTER TABLE cases DROP CONSTRAINT IF EXISTS chk_cases_closed_consistency;
ALTER TABLE cases ADD CONSTRAINT chk_cases_closed_consistency
  CHECK ((status = 'CLOSED') = (closed_at IS NOT NULL));

-- evidence
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS chk_evidence_integrity_status;
ALTER TABLE evidence ADD CONSTRAINT chk_evidence_integrity_status
  CHECK (integrity_status IN ('PENDING','VERIFIED','TAMPERED'));

ALTER TABLE evidence DROP CONSTRAINT IF EXISTS chk_evidence_size_positive;
ALTER TABLE evidence ADD CONSTRAINT chk_evidence_size_positive
  CHECK (size_bytes > 0);

ALTER TABLE evidence DROP CONSTRAINT IF EXISTS chk_evidence_sha256_hex;
ALTER TABLE evidence ADD CONSTRAINT chk_evidence_sha256_hex
  CHECK (sha256_hash ~ '^[0-9a-f]{64}$');

-- evidence_transfers
ALTER TABLE evidence_transfers DROP CONSTRAINT IF EXISTS chk_transfers_status;
ALTER TABLE evidence_transfers ADD CONSTRAINT chk_transfers_status
  CHECK (status IN ('PENDING','COMPLETED','REJECTED'));

ALTER TABLE evidence_transfers DROP CONSTRAINT IF EXISTS chk_transfers_distinct_locations;
ALTER TABLE evidence_transfers ADD CONSTRAINT chk_transfers_distinct_locations
  CHECK (from_location_id <> to_location_id);

-- evidence_locations.kind
ALTER TABLE evidence_locations DROP CONSTRAINT IF EXISTS chk_locations_kind;
ALTER TABLE evidence_locations ADD CONSTRAINT chk_locations_kind
  CHECK (kind IN ('INTAKE','LAB','LOCKER','COURT','FIELD'));

-- investigation_updates.update_type
ALTER TABLE investigation_updates DROP CONSTRAINT IF EXISTS chk_updates_type;
ALTER TABLE investigation_updates ADD CONSTRAINT chk_updates_type
  CHECK (update_type IN ('NOTE','FINDING','REQUEST','STATUS_CHANGE'));

-- forensic_analysis.result
ALTER TABLE forensic_analysis DROP CONSTRAINT IF EXISTS chk_analysis_result;
ALTER TABLE forensic_analysis ADD CONSTRAINT chk_analysis_result
  CHECK (result IN ('INCONCLUSIVE','SUPPORTS','CONTRADICTS'));

-- court_submissions.status
ALTER TABLE court_submissions DROP CONSTRAINT IF EXISTS chk_court_status;
ALTER TABLE court_submissions ADD CONSTRAINT chk_court_status
  CHECK (status IN ('DRAFT','SUBMITTED','ACCEPTED','RETURNED'));

-- blockchain_transactions.event_type
ALTER TABLE blockchain_transactions DROP CONSTRAINT IF EXISTS chk_btx_event_type;
ALTER TABLE blockchain_transactions ADD CONSTRAINT chk_btx_event_type
  CHECK (event_type IN (
    'EVIDENCE_CREATED','ASSIGNED','TRANSFERRED','RECEIVED_BY_LAB',
    'ANALYSIS_COMPLETED','SUBMITTED_TO_COURT','VERIFIED','TAMPER_DETECTED'
  ));
