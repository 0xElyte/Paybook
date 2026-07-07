ALTER TABLE "Enrollment" ADD COLUMN "nombaAccountRef" TEXT, ADD COLUMN "nombaAccountNo" TEXT, ADD COLUMN "nombaBankName" TEXT;
CREATE UNIQUE INDEX "Enrollment_nombaAccountRef_key" ON "Enrollment"("nombaAccountRef");
