import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CollectionForm } from '@/components/collections/collection-form'

export const metadata: Metadata = { title: 'New collection' }

export default async function NewCollectionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/collections/new')

  // Creating a Collection requires the owner's own Nomba account to be bound
  // (that's whose account the virtual accounts settle into). The form shows a
  // one-time linking step first when it isn't.
  const connection = await prisma.nombaConnection.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })

  return (
    <div className="min-h-screen bg-surface">
      <CollectionForm nombaLinked={!!connection || process.env.NOMBA_REQUIRE_CONNECTION === 'false'} />
    </div>
  )
}
