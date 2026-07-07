import type { PrismaClient, Prisma, ActivityType } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

// Append one entry to a collection's activity feed (the owner's "Log" tab).
// Callable with either the root client or a transaction client so writers can
// keep the log entry atomic with the action it records.
export async function logActivity(
  db: Db,
  entry: {
    collectionId: string
    type: ActivityType
    message: string
    actorId?: string | null
    referenceId?: string | null
  }
): Promise<void> {
  await db.collectionActivity.create({ data: entry })
}
