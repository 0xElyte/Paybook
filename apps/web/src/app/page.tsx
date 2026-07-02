import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatNGN } from '@/lib/utils'

export default async function HomePage() {
  const session = await auth()

  const collections = session?.user?.id
    ? await prisma.collection.findMany({
        where: { ownerId: session.user.id },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-green-700">Paybook</h1>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Your collections</h2>
            <p className="text-gray-500 text-sm mt-1">
              Welcome back, {session?.user?.name ?? 'there'}.
            </p>
          </div>
          <Link
            href="/collections/new"
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
          >
            + New collection
          </Link>
        </div>

        {collections.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-sm">You haven&apos;t created any collections yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{collection.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatNGN(collection.chargeAmount.toString())} · {collection.repaymentType.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right">
                  {collection.nombaAccountNo ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">
                        {collection.nombaAccountNo}
                      </p>
                      <p className="text-xs text-gray-500">{collection.nombaBankName}</p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-600">No virtual account</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
