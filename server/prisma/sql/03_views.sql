-- BlockProof — Views
-- Rubric: views + INNER/LEFT joins + multi-table joins + aggregates.

-- 1. active_case_evidence — every open case with its active investigator and evidence counts.
CREATE OR REPLACE VIEW active_case_evidence AS
SELECT
  c.case_id,
  c.case_number,
  c.title            AS case_title,
  c.priority,
  c.status           AS case_status,
  r.crime_type,
  r.tracking_code,
  inv.user_id        AS investigator_id,
  inv.full_name      AS investigator_name,
  COUNT(e.evidence_id)                                            AS evidence_count,
  COUNT(e.evidence_id) FILTER (WHERE e.integrity_status = 'VERIFIED')  AS verified_count,
  COUNT(e.evidence_id) FILTER (WHERE e.integrity_status = 'TAMPERED')  AS tampered_count
FROM cases c
INNER JOIN crime_reports r        ON r.report_id = c.report_id
LEFT JOIN case_assignments ca     ON ca.case_id = c.case_id AND ca.is_active
LEFT JOIN users inv               ON inv.user_id = ca.investigator_id
LEFT JOIN evidence e              ON e.case_id = c.case_id
WHERE c.status IN ('OPEN','IN_PROGRESS','REOPENED')
GROUP BY c.case_id, c.case_number, c.title, c.priority, c.status,
         r.crime_type, r.tracking_code, inv.user_id, inv.full_name;

-- 2. investigator_case_summary — workload per investigator (GROUP BY + HAVING-friendly).
CREATE OR REPLACE VIEW investigator_case_summary AS
SELECT
  u.user_id           AS investigator_id,
  u.full_name         AS investigator_name,
  u.badge_number,
  COUNT(DISTINCT ca.case_id)                                              AS assigned_cases,
  COUNT(DISTINCT ca.case_id) FILTER (WHERE c.status = 'IN_PROGRESS')      AS in_progress_cases,
  COUNT(DISTINCT ca.case_id) FILTER (WHERE c.status = 'CLOSED')           AS closed_cases,
  COUNT(DISTINCT e.evidence_id)                                           AS evidence_in_scope,
  MAX(iu.created_at)                                                      AS last_update_at
FROM users u
INNER JOIN roles ro               ON ro.role_id = u.role_id AND ro.name = 'INVESTIGATOR'
LEFT JOIN case_assignments ca     ON ca.investigator_id = u.user_id AND ca.is_active
LEFT JOIN cases c                 ON c.case_id = ca.case_id
LEFT JOIN evidence e              ON e.case_id = c.case_id
LEFT JOIN investigation_updates iu ON iu.case_id = c.case_id AND iu.author_id = u.user_id
GROUP BY u.user_id, u.full_name, u.badge_number;

-- 3. evidence_custody_summary — human-readable chain of custody per evidence item.
CREATE OR REPLACE VIEW evidence_custody_summary AS
SELECT
  e.evidence_id,
  e.evidence_code,
  e.original_filename,
  et.name              AS evidence_type,
  e.integrity_status,
  e.last_verified_at,
  r.tracking_code,
  c.case_number,
  COUNT(t.transfer_id)                                            AS transfer_count,
  COUNT(t.transfer_id) FILTER (WHERE t.status = 'COMPLETED')      AS completed_transfers,
  COUNT(btx.tx_id)                                                AS ledger_event_count,
  MIN(btx.recorded_at)                                            AS first_anchored_at,
  MAX(btx.recorded_at)                                            AS last_anchored_at
FROM evidence e
INNER JOIN evidence_types et      ON et.evidence_type_id = e.evidence_type_id
INNER JOIN crime_reports r        ON r.report_id = e.report_id
LEFT JOIN cases c                 ON c.case_id = e.case_id
LEFT JOIN evidence_transfers t    ON t.evidence_id = e.evidence_id
LEFT JOIN blockchain_transactions btx ON btx.evidence_id = e.evidence_id
GROUP BY e.evidence_id, e.evidence_code, e.original_filename, et.name,
         e.integrity_status, e.last_verified_at, r.tracking_code, c.case_number;
