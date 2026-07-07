import { prisma } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'
import { envNombaCredentials, type NombaCredentials } from '@/lib/nomba'

// Resolve the Nomba credentials to use for an owner's Collections: their own
// bound account (production model — funds land with THEM), falling back to the
// platform env credentials (hackathon demo account / pre-binding era rows).
export async function credentialsForOwner(ownerId: string): Promise<NombaCredentials> {
  const connection = await prisma.nombaConnection.findUnique({ where: { ownerId } })
  if (!connection) return envNombaCredentials()
  return {
    accountId: connection.accountId,
    clientId: connection.clientId,
    clientSecret: decryptSecret(connection.clientSecretEnc),
    subAccountId: connection.subAccountId,
  }
}
