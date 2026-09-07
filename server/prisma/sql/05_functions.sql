-- BlockProof — Stored functions (PL/pgSQL)
-- Rubric: stored procedure/function + transaction control + exception handling.

-- assign_case(case_id, investigator_id, assigned_by)
-- Deactivates any current active assignment, creates a new one, moves the case
-- to IN_PROGRESS, and writes an audit row. Runs atomically.
CREATE OR REPLACE FUNCTION assign_case(
  p_case_id         INTEGER,
  p_investigator_id INTEGER,
  p_assigned_by     INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role         VARCHAR(32);
  v_assignment_id INTEGER;
BEGIN
  -- validate investigator role
  SELECT ro.name INTO v_role
  FROM users u JOIN roles ro ON ro.role_id = u.role_id
  WHERE u.user_id = p_investigator_id AND u.is_active;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User % is not an active user', p_investigator_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_role <> 'INVESTIGATOR' THEN
    RAISE EXCEPTION 'User % has role % (INVESTIGATOR required)', p_investigator_id, v_role
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cases WHERE case_id = p_case_id) THEN
    RAISE EXCEPTION 'Case % does not exist', p_case_id USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE case_assignments
     SET is_active = FALSE, unassigned_at = now()
   WHERE case_id = p_case_id AND is_active;

  INSERT INTO case_assignments (case_id, investigator_id, assigned_by, is_active, assigned_at)
  VALUES (p_case_id, p_investigator_id, p_assigned_by, TRUE, now())
  RETURNING assignment_id INTO v_assignment_id;

  UPDATE cases
     SET status = CASE WHEN status = 'OPEN' THEN 'IN_PROGRESS' ELSE status END,
         updated_at = now()
   WHERE case_id = p_case_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
  VALUES (p_assigned_by, 'CASE_ASSIGNED', 'Case', p_case_id,
          format('Investigator %s assigned (assignment %s)', p_investigator_id, v_assignment_id));

  RETURN v_assignment_id;
END;
$$;

-- transfer_evidence(evidence_id, from_location_id, to_location_id, transferred_by, reason)
-- Creates a PENDING transfer row. Blocks a second pending transfer for the same
-- evidence. Audit + trigger handle the rest.
CREATE OR REPLACE FUNCTION transfer_evidence(
  p_evidence_id      INTEGER,
  p_from_location_id INTEGER,
  p_to_location_id   INTEGER,
  p_transferred_by   INTEGER,
  p_reason           VARCHAR
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_transfer_id INTEGER;
BEGIN
  IF p_from_location_id = p_to_location_id THEN
    RAISE EXCEPTION 'Source and destination locations must differ'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM evidence_transfers
    WHERE evidence_id = p_evidence_id AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Evidence % already has a pending transfer', p_evidence_id
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO evidence_transfers
    (evidence_id, from_location_id, to_location_id, transferred_by, reason, status, initiated_at)
  VALUES
    (p_evidence_id, p_from_location_id, p_to_location_id, p_transferred_by, p_reason, 'PENDING', now())
  RETURNING transfer_id INTO v_transfer_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
  VALUES (p_transferred_by, 'EVIDENCE_TRANSFER_INITIATED', 'Evidence', p_evidence_id,
          format('Transfer %s: loc %s -> loc %s', v_transfer_id, p_from_location_id, p_to_location_id));

  RETURN v_transfer_id;
END;
$$;
