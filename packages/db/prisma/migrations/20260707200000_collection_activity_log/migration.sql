-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('payment_matched', 'payment_unmatched', 'payment_claimed', 'transfer_matched_manually', 'transfer_accepted', 'transfer_refunded', 'payer_joined', 'exit_requested', 'exit_revoked', 'exit_finalized', 'broadcast_sent');

-- CreateTable
CREATE TABLE "CollectionActivity" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionActivity_collectionId_createdAt_idx" ON "CollectionActivity"("collectionId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CollectionActivity" ADD CONSTRAINT "CollectionActivity_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

