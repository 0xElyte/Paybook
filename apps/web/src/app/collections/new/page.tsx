import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CollectionForm } from '@/components/collections/collection-form'

export const metadata: Metadata = { title: 'New collection' }

export default function NewCollectionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">New collection</h1>
          <p className="text-gray-500 text-sm mb-6">
            Set up a payment collection — we&apos;ll create a dedicated bank account for it.
          </p>
          <CollectionForm />
        </div>
      </div>
    </div>
  )
}
