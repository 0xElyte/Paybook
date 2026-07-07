CREATE TABLE "NombaConnection" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NombaConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NombaConnection_ownerId_key" ON "NombaConnection"("ownerId");
ALTER TABLE "NombaConnection" ADD CONSTRAINT "NombaConnection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD COLUMN "nombaSubAccountId" TEXT;
