-- BlockProof — Reference analytics queries (documentation / viva)
-- These are NOT applied to the DB. They are the exact aggregate queries the
-- Head "Analytics" API runs, kept here so the DBMS rubric (COUNT/SUM/AVG/MIN/MAX,
-- GROUP BY, HAVING, joins) is easy to point at during evaluation.

-- Cases by status
SELECT status, COUNT(*) AS total
FROM cases
GROUP BY status
ORDER BY total DESC;

-- Cases by crime type (join to originating report)
SELECT r.crime_type, COUNT(*) AS total
FROM cases c
INNER JOIN crime_reports r ON r.report_id = c.report_id
GROUP BY r.crime_type
ORDER BY total DESC;

-- Evidence by type with average file size
SELECT et.name AS evidence_type,
       COUNT(e.evidence_id)          AS items,
       ROUND(AVG(e.size_bytes))      AS avg_bytes,
       MIN(e.size_bytes)             AS min_bytes,
       MAX(e.size_bytes)             AS max_bytes,
       SUM(e.size_bytes)             AS total_bytes
FROM evidence_types et
LEFT JOIN evidence e ON e.evidence_type_id = et.evidence_type_id
GROUP BY et.name
ORDER BY items DESC;

-- Investigator workload — only those carrying 2+ active cases (HAVING)
SELECT u.full_name,
       COUNT(ca.case_id) AS active_cases
FROM users u
INNER JOIN roles ro           ON ro.role_id = u.role_id AND ro.name = 'INVESTIGATOR'
LEFT JOIN case_assignments ca ON ca.investigator_id = u.user_id AND ca.is_active
GROUP BY u.user_id, u.full_name
HAVING COUNT(ca.case_id) >= 2
ORDER BY active_cases DESC;

-- Verification outcomes over the last 30 days
SELECT event_type, COUNT(*) AS events
FROM blockchain_transactions
WHERE event_type IN ('VERIFIED','TAMPER_DETECTED')
  AND recorded_at >= now() - INTERVAL '30 days'
GROUP BY event_type;

-- Monthly report intake
SELECT date_trunc('month', created_at) AS month,
       COUNT(*)                        AS reports
FROM crime_reports
GROUP BY 1
ORDER BY 1;

-- Tampering alerts: evidence currently flagged TAMPERED with case + investigator
SELECT e.evidence_code, e.original_filename, c.case_number,
       inv.full_name AS investigator, e.last_verified_at
FROM evidence e
LEFT JOIN cases c              ON c.case_id = e.case_id
LEFT JOIN case_assignments ca  ON ca.case_id = c.case_id AND ca.is_active
LEFT JOIN users inv            ON inv.user_id = ca.investigator_id
WHERE e.integrity_status = 'TAMPERED'
ORDER BY e.last_verified_at DESC NULLS LAST;
