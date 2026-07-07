-- Distinct notification type for payments that arrive from an unrecognized
-- sender account (surfaced to the owner via the Unmatched Transfers modal).
ALTER TYPE "NotificationType" ADD VALUE 'payment_unmatched' BEFORE 'payment_due';
