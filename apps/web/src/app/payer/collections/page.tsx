import { redirect } from 'next/navigation'

// The separate payer dashboard was merged into the unified dashboard at '/'
// (the "Collections I'm in" tab). Old links and bookmarks land here.
export default function PayerCollectionsPage() {
  redirect('/dashboard')
}
