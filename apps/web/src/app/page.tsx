import { auth } from '@/lib/auth'
import { LandingPage } from '@/components/marketing/landing-page'

// '/' is always the marketing landing page — for signed-in users too (the nav
// and CTAs swap to "Go to dashboard"). The dashboard lives at /dashboard, and
// the in-app logo intentionally links back here.
export default async function HomePage() {
  const session = await auth()
  return <LandingPage authenticated={!!session?.user?.id} />
}
