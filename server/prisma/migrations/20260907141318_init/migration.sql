-- CreateTable
CREATE TABLE "roles" (
    "role_id" SERIAL NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "permission_id" SERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20),
    "badge_number" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "crime_reports" (
    "report_id" SERIAL NOT NULL,
    "tracking_code" VARCHAR(20) NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "crime_type" VARCHAR(60) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "incident_at" TIMESTAMP(3) NOT NULL,
    "incident_location" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crime_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "cases" (
    "case_id" SERIAL NOT NULL,
    "case_number" VARCHAR(24) NOT NULL,
    "report_id" INTEGER NOT NULL,
    "lead_head_id" INTEGER NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "priority" VARCHAR(12) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(12) NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("case_id")
);

-- CreateTable
CREATE TABLE "case_assignments" (
    "assignment_id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "investigator_id" INTEGER NOT NULL,
    "assigned_by" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "evidence_types" (
    "evidence_type_id" SERIAL NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "evidence_types_pkey" PRIMARY KEY ("evidence_type_id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "evidence_id" SERIAL NOT NULL,
    "evidence_code" VARCHAR(20) NOT NULL,
    "report_id" INTEGER NOT NULL,
    "case_id" INTEGER,
    "evidence_type_id" INTEGER NOT NULL,
    "submitted_by" INTEGER NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "sha256_hash" CHAR(64) NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "enc_iv" VARCHAR(48) NOT NULL,
    "enc_auth_tag" VARCHAR(48) NOT NULL,
    "integrity_status" VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("evidence_id")
);

-- CreateTable
CREATE TABLE "evidence_locations" (
    "location_id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "kind" VARCHAR(12) NOT NULL,
    "address" VARCHAR(255),
    "custodian_id" INTEGER,

    CONSTRAINT "evidence_locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "evidence_transfers" (
    "transfer_id" SERIAL NOT NULL,
    "evidence_id" INTEGER NOT NULL,
    "from_location_id" INTEGER NOT NULL,
    "to_location_id" INTEGER NOT NULL,
    "transferred_by" INTEGER NOT NULL,
    "received_by" INTEGER,
    "reason" VARCHAR(255) NOT NULL,
    "status" VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    "blockchain_tx_id" VARCHAR(120),
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "evidence_transfers_pkey" PRIMARY KEY ("transfer_id")
);

-- CreateTable
CREATE TABLE "investigation_updates" (
    "update_id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "update_type" VARCHAR(16) NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigation_updates_pkey" PRIMARY KEY ("update_id")
);

-- CreateTable
CREATE TABLE "forensic_analysis" (
    "analysis_id" SERIAL NOT NULL,
    "evidence_id" INTEGER NOT NULL,
    "analyst_id" INTEGER NOT NULL,
    "method" VARCHAR(120) NOT NULL,
    "summary" TEXT NOT NULL,
    "result" VARCHAR(40) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "forensic_analysis_pkey" PRIMARY KEY ("analysis_id")
);

-- CreateTable
CREATE TABLE "court_submissions" (
    "submission_id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "evidence_id" INTEGER NOT NULL,
    "submitted_by" INTEGER NOT NULL,
    "court_reference" VARCHAR(60) NOT NULL,
    "status" VARCHAR(12) NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_submissions_pkey" PRIMARY KEY ("submission_id")
);

-- CreateTable
CREATE TABLE "blockchain_transactions" (
    "tx_id" SERIAL NOT NULL,
    "evidence_id" INTEGER NOT NULL,
    "event_type" VARCHAR(32) NOT NULL,
    "fabric_tx_id" VARCHAR(120) NOT NULL,
    "block_reference" VARCHAR(60),
    "recorded_hash" CHAR(64) NOT NULL,
    "payload" JSONB,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("tx_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_id" SERIAL NOT NULL,
    "actor_id" INTEGER,
    "action" VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" INTEGER,
    "detail" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_badge_number_key" ON "users"("badge_number");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "crime_reports_tracking_code_key" ON "crime_reports"("tracking_code");

-- CreateIndex
CREATE INDEX "crime_reports_reporter_id_idx" ON "crime_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "crime_reports_status_idx" ON "crime_reports"("status");

-- CreateIndex
CREATE INDEX "crime_reports_crime_type_idx" ON "crime_reports"("crime_type");

-- CreateIndex
CREATE UNIQUE INDEX "cases_case_number_key" ON "cases"("case_number");

-- CreateIndex
CREATE UNIQUE INDEX "cases_report_id_key" ON "cases"("report_id");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_lead_head_id_idx" ON "cases"("lead_head_id");

-- CreateIndex
CREATE INDEX "case_assignments_case_id_idx" ON "case_assignments"("case_id");

-- CreateIndex
CREATE INDEX "case_assignments_investigator_id_idx" ON "case_assignments"("investigator_id");

-- CreateIndex
CREATE INDEX "case_assignments_case_id_is_active_idx" ON "case_assignments"("case_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_types_name_key" ON "evidence_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_evidence_code_key" ON "evidence"("evidence_code");

-- CreateIndex
CREATE INDEX "evidence_report_id_idx" ON "evidence"("report_id");

-- CreateIndex
CREATE INDEX "evidence_case_id_idx" ON "evidence"("case_id");

-- CreateIndex
CREATE INDEX "evidence_sha256_hash_idx" ON "evidence"("sha256_hash");

-- CreateIndex
CREATE INDEX "evidence_integrity_status_idx" ON "evidence"("integrity_status");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_locations_name_key" ON "evidence_locations"("name");

-- CreateIndex
CREATE INDEX "evidence_transfers_evidence_id_idx" ON "evidence_transfers"("evidence_id");

-- CreateIndex
CREATE INDEX "evidence_transfers_status_idx" ON "evidence_transfers"("status");

-- CreateIndex
CREATE INDEX "investigation_updates_case_id_idx" ON "investigation_updates"("case_id");

-- CreateIndex
CREATE INDEX "forensic_analysis_evidence_id_idx" ON "forensic_analysis"("evidence_id");

-- CreateIndex
CREATE INDEX "court_submissions_case_id_idx" ON "court_submissions"("case_id");

-- CreateIndex
CREATE INDEX "court_submissions_evidence_id_idx" ON "court_submissions"("evidence_id");

-- CreateIndex
CREATE INDEX "blockchain_transactions_evidence_id_idx" ON "blockchain_transactions"("evidence_id");

-- CreateIndex
CREATE INDEX "blockchain_transactions_event_type_idx" ON "blockchain_transactions"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crime_reports" ADD CONSTRAINT "crime_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "crime_reports"("report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_lead_head_id_fkey" FOREIGN KEY ("lead_head_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_investigator_id_fkey" FOREIGN KEY ("investigator_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "crime_reports"("report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_evidence_type_id_fkey" FOREIGN KEY ("evidence_type_id") REFERENCES "evidence_types"("evidence_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_locations" ADD CONSTRAINT "evidence_locations_custodian_id_fkey" FOREIGN KEY ("custodian_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_transfers" ADD CONSTRAINT "evidence_transfers_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_transfers" ADD CONSTRAINT "evidence_transfers_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "evidence_locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_transfers" ADD CONSTRAINT "evidence_transfers_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "evidence_locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_transfers" ADD CONSTRAINT "evidence_transfers_transferred_by_fkey" FOREIGN KEY ("transferred_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_transfers" ADD CONSTRAINT "evidence_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_updates" ADD CONSTRAINT "investigation_updates_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_updates" ADD CONSTRAINT "investigation_updates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forensic_analysis" ADD CONSTRAINT "forensic_analysis_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forensic_analysis" ADD CONSTRAINT "forensic_analysis_analyst_id_fkey" FOREIGN KEY ("analyst_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_submissions" ADD CONSTRAINT "court_submissions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_submissions" ADD CONSTRAINT "court_submissions_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_submissions" ADD CONSTRAINT "court_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
