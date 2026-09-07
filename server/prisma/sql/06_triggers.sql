-- BlockProof — Triggers
-- Rubric: triggers (audit-on-change + derived-state maintenance).

-- ── 1. Audit sensitive evidence changes ──────────────────────────────
CREATE OR REPLACE FUNCTION trg_evidence_audit() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.integrity_status IS DISTINCT FROM OLD.integrity_status THEN
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
      VALUES (NULL, 'EVIDENCE_INTEGRITY_CHANGED', 'Evidence', NEW.evidence_id,
              format('%s -> %s', OLD.integrity_status, NEW.integrity_status));
    END IF;
    IF NEW.case_id IS DISTINCT FROM OLD.case_id THEN
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
      VALUES (NULL, 'EVIDENCE_LINKED_TO_CASE', 'Evidence', NEW.evidence_id,
              format('case %s -> %s', OLD.case_id, NEW.case_id));
    END IF;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
    VALUES (NEW.submitted_by, 'EVIDENCE_CREATED', 'Evidence', NEW.evidence_id,
            format('%s (%s bytes)', NEW.original_filename, NEW.size_bytes));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evidence_audit ON evidence;
CREATE TRIGGER evidence_audit
  AFTER INSERT OR UPDATE ON evidence
  FOR EACH ROW EXECUTE FUNCTION trg_evidence_audit();

-- ── 2. Audit + complete evidence transfers ───────────────────────────
CREATE OR REPLACE FUNCTION trg_transfer_state() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status = 'COMPLETED' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
    VALUES (COALESCE(NEW.received_by, NEW.transferred_by),
            'EVIDENCE_TRANSFER_' || NEW.status, 'EvidenceTransfer', NEW.transfer_id,
            format('evidence %s: %s -> %s', NEW.evidence_id, OLD.status, NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transfer_state ON evidence_transfers;
CREATE TRIGGER transfer_state
  BEFORE UPDATE ON evidence_transfers
  FOR EACH ROW EXECUTE FUNCTION trg_transfer_state();

-- ── 3. Audit case status changes ─────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_case_status_audit() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
    VALUES (NEW.lead_head_id, 'CASE_STATUS_CHANGED', 'Case', NEW.case_id,
            format('%s -> %s', OLD.status, NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS case_status_audit ON cases;
CREATE TRIGGER case_status_audit
  AFTER UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION trg_case_status_audit();

-- ── 4. Append-only guard on the ledger mirror ────────────────────────
-- blockchain_transactions mirrors an immutable ledger; forbid UPDATE/DELETE.
CREATE OR REPLACE FUNCTION trg_btx_append_only() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'blockchain_transactions is append-only (attempted %)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS btx_append_only ON blockchain_transactions;
CREATE TRIGGER btx_append_only
  BEFORE UPDATE OR DELETE ON blockchain_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_btx_append_only();
