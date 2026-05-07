-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" TEXT NOT NULL,
    "role" VARCHAR(30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "partners" (
    "partner_id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(50),
    "contact_person" VARCHAR(100),
    "mobile" VARCHAR(15),
    "email" VARCHAR(150),
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("partner_id")
);

-- CreateTable
CREATE TABLE "leads" (
    "lead_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "email" VARCHAR(150),
    "city" VARCHAR(100),
    "education" VARCHAR(50),
    "current_status" VARCHAR(30),
    "preferred_role" VARCHAR(100),
    "salary_expectation" VARCHAR(50),
    "source" VARCHAR(50),
    "partner_id" TEXT,
    "counselor_id" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("lead_id")
);

-- CreateTable
CREATE TABLE "assessment_scores" (
    "assessment_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "comm_score" DECIMAL(5,2) NOT NULL,
    "bfsi_score" DECIMAL(5,2) NOT NULL,
    "discipline_score" DECIMAL(5,2) NOT NULL,
    "agility_score" DECIMAL(5,2) NOT NULL,
    "professionalism_score" DECIMAL(5,2) NOT NULL,
    "confidence_score" DECIMAL(5,2) NOT NULL,
    "overall_cri" DECIMAL(5,2) NOT NULL,
    "band" VARCHAR(30) NOT NULL,
    "scorecard_pdf_url" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_scores_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "cohort_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("cohort_id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "enrollment_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "cohort_id" TEXT,
    "commitment_accepted" BOOLEAN NOT NULL DEFAULT false,
    "commitment_accepted_at" TIMESTAMP(3),
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lms_access_created" BOOLEAN NOT NULL DEFAULT false,
    "lms_access_created_at" TIMESTAMP(3),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("enrollment_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "fee_plan" VARCHAR(20) NOT NULL,
    "total_fee" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "due_date" DATE,
    "payment_mode" VARCHAR(20) NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "payer_name" VARCHAR(100) NOT NULL,
    "receipt_pdf_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "partner_payouts" (
    "payout_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "fee_collected" DECIMAL(10,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "payout_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "payment_reference" VARCHAR(100),
    "processed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("payout_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leads_mobile_key" ON "leads"("mobile");

-- CreateIndex
CREATE INDEX "idx_leads_mobile" ON "leads"("mobile");

-- CreateIndex
CREATE INDEX "idx_leads_status" ON "leads"("status");

-- CreateIndex
CREATE INDEX "idx_leads_counselor" ON "leads"("counselor_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_scores_lead_id_key" ON "assessment_scores"("lead_id");

-- CreateIndex
CREATE INDEX "idx_assessment_lead" ON "assessment_scores"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_lead_id_key" ON "enrollments"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE INDEX "idx_payments_enrollment" ON "payments"("enrollment_id");

-- CreateIndex
CREATE INDEX "idx_payout_partner" ON "partner_payouts"("partner_id");

-- CreateIndex
CREATE INDEX "idx_payout_status" ON "partner_payouts"("payout_status");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("partner_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_counselor_id_fkey" FOREIGN KEY ("counselor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("lead_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("lead_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("cohort_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("enrollment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("enrollment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("partner_id") ON DELETE CASCADE ON UPDATE CASCADE;
