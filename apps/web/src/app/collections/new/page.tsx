import type { Metadata } from 'next'
import { CollectionForm } from '@/components/collections/collection-form'

export const metadata: Metadata = { title: 'New collection' }

export default function NewCollectionPage() {
  return (
    <div className="min-h-screen bg-surface">
      <CollectionForm />
    </div>
  )
}
