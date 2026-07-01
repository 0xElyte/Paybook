-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security for all tables
--
-- Design:
--   • All writes go through Prisma (postgres superuser) which bypasses RLS.
--   • SELECT policies protect Supabase Realtime subscriptions from the browser.
--   • Auth context: Auth.js issues a Supabase JWT with sub = User.id.
--     auth.uid() therefore equals our User.id (TEXT cast required).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Enable RLS on every table ───────────────────────────────────────────────

ALTER TABLE "User"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Collection"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Installment"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteLink"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayerInstallment"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnnouncementRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription"     ENABLE ROW LEVEL SECURITY;

-- ─── User ────────────────────────────────────────────────────────────────────
-- A user may only read their own row.

CREATE POLICY "users_select_own"
  ON "User" FOR SELECT TO authenticated
  USING (id = auth.uid()::text);

-- ─── BankAccount ─────────────────────────────────────────────────────────────
-- A user may only read their own bank accounts.

CREATE POLICY "bank_accounts_select_own"
  ON "BankAccount" FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

-- ─── Collection ──────────────────────────────────────────────────────────────
-- Owners see their own collections.
-- Active payers see collections they are enrolled in.

CREATE POLICY "collections_select_owner"
  ON "Collection" FOR SELECT TO authenticated
  USING ("ownerId" = auth.uid()::text);

CREATE POLICY "collections_select_enrolled"
  ON "Collection" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Enrollment"
      WHERE "Enrollment"."collectionId" = "Collection".id
        AND "Enrollment"."payerId" = auth.uid()::text
        AND "Enrollment".status NOT IN ('exited', 'removed')
    )
  );

-- ─── Installment ─────────────────────────────────────────────────────────────
-- Collection owners see the installment schedule they defined.
-- Enrolled payers see the schedule for collections they are in.

CREATE POLICY "installments_select_owner"
  ON "Installment" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Collection"
      WHERE "Collection".id = "Installment"."collectionId"
        AND "Collection"."ownerId" = auth.uid()::text
    )
  );

CREATE POLICY "installments_select_enrolled"
  ON "Installment" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Enrollment"
      WHERE "Enrollment"."collectionId" = "Installment"."collectionId"
        AND "Enrollment"."payerId" = auth.uid()::text
        AND "Enrollment".status NOT IN ('exited', 'removed')
    )
  );

-- ─── InviteLink ──────────────────────────────────────────────────────────────
-- Only the collection owner can see or manage invite links.

CREATE POLICY "invite_links_select_owner"
  ON "InviteLink" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Collection"
      WHERE "Collection".id = "InviteLink"."collectionId"
        AND "Collection"."ownerId" = auth.uid()::text
    )
  );

-- ─── Enrollment ──────────────────────────────────────────────────────────────
-- A payer sees their own enrollments (all statuses — they need to see exit state).
-- A collection owner sees all enrollments across their collections.

CREATE POLICY "enrollments_select_payer"
  ON "Enrollment" FOR SELECT TO authenticated
  USING ("payerId" = auth.uid()::text);

CREATE POLICY "enrollments_select_owner"
  ON "Enrollment" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Collection"
      WHERE "Collection".id = "Enrollment"."collectionId"
        AND "Collection"."ownerId" = auth.uid()::text
    )
  );

-- ─── PayerInstallment ────────────────────────────────────────────────────────
-- A payer sees their own installment rows.
-- A collection owner sees all payer installments across their collections.

CREATE POLICY "payer_installments_select_payer"
  ON "PayerInstallment" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Enrollment"
      WHERE "Enrollment".id = "PayerInstallment"."enrollmentId"
        AND "Enrollment"."payerId" = auth.uid()::text
    )
  );

CREATE POLICY "payer_installments_select_owner"
  ON "PayerInstallment" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Enrollment"
      JOIN "Collection" ON "Collection".id = "Enrollment"."collectionId"
      WHERE "Enrollment".id = "PayerInstallment"."enrollmentId"
        AND "Collection"."ownerId" = auth.uid()::text
    )
  );

-- ─── Transaction ─────────────────────────────────────────────────────────────
-- A payer sees transactions attributed to them (matched rows — payerId is set).
-- A collection owner sees all transactions in their collections, including unmatched.

CREATE POLICY "transactions_select_payer"
  ON "Transaction" FOR SELECT TO authenticated
  USING ("payerId" = auth.uid()::text);

CREATE POLICY "transactions_select_owner"
  ON "Transaction" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Collection"
      WHERE "Collection".id = "Transaction"."collectionId"
        AND "Collection"."ownerId" = auth.uid()::text
    )
  );

-- ─── Announcement ────────────────────────────────────────────────────────────
-- The owner sees announcements they created.
-- A payer sees announcements they are a recipient of.

CREATE POLICY "announcements_select_owner"
  ON "Announcement" FOR SELECT TO authenticated
  USING ("ownerId" = auth.uid()::text);

CREATE POLICY "announcements_select_recipient"
  ON "Announcement" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "AnnouncementRecipient"
      WHERE "AnnouncementRecipient"."announcementId" = "Announcement".id
        AND "AnnouncementRecipient"."payerId" = auth.uid()::text
    )
  );

-- ─── AnnouncementRecipient ───────────────────────────────────────────────────
-- A payer sees their own recipient rows.
-- The collection owner sees all recipient rows for their announcements.

CREATE POLICY "announcement_recipients_select_payer"
  ON "AnnouncementRecipient" FOR SELECT TO authenticated
  USING ("payerId" = auth.uid()::text);

CREATE POLICY "announcement_recipients_select_owner"
  ON "AnnouncementRecipient" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Announcement"
      WHERE "Announcement".id = "AnnouncementRecipient"."announcementId"
        AND "Announcement"."ownerId" = auth.uid()::text
    )
  );

-- ─── Notification ────────────────────────────────────────────────────────────
-- A user only sees their own notifications.

CREATE POLICY "notifications_select_own"
  ON "Notification" FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

-- ─── PushSubscription ────────────────────────────────────────────────────────
-- A user only sees their own push subscriptions.

CREATE POLICY "push_subscriptions_select_own"
  ON "PushSubscription" FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);
