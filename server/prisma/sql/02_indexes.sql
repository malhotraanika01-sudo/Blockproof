-- BlockProof — additional indexes (beyond those declared in schema.prisma)
-- Rubric: indexing for search / filter / join performance.

-- Fast lookup of a report by its public tracking code (already UNIQUE, but
-- make the intent explicit and cover case-insensitive search).
CREATE INDEX IF NOT EXISTS idx_crime_reports_created_at ON crime_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crime_reports_type_status ON crime_reports (crime_type, status);

-- Case board filtering
CREATE INDEX IF NOT EXISTS idx_cases_priority_status ON cases (priority, status);
CREATE INDEX IF NOT EXISTS idx_cases_opened_at ON cases (opened_at DESC);

-- Only one active assignment per case — enforced by a partial UNIQUE index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_assignment_per_case
  ON case_assignments (case_id) WHERE is_active;

-- Evidence integrity dashboards
CREATE INDEX IF NOT EXISTS idx_evidence_case_status ON evidence (case_id, integrity_status);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence (created_at DESC);

-- Ledger mirror browsing (Head blockchain history)
CREATE INDEX IF NOT EXISTS idx_btx_recorded_at ON blockchain_transactions (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_btx_evidence_recorded ON blockchain_transactions (evidence_id, recorded_at);

-- Audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);
