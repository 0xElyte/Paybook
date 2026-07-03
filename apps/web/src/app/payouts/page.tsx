import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { UnderConstruction } from '@/components/chrome/under-construction'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Payouts' }

export default async function PayoutsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return <UnderConstruction variant="owner" userName={session.user.name ?? 'there'} activeHref="/payouts" />
}
