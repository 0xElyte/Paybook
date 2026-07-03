import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatNGN, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Payments' }

export default async function PayerCollectionsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const enrollments = await prisma.enrollment.findMany({
    where: { payerId: userId, status: { in: ['active', 'exit_pending'] } },
    include: {
      collection: {
        select: {
          id: true,
          name: true,
          description: true,
          chargeAmount: true,
          repaymentType: true,
          nombaAccountNo: true,
          nombaBankName: true,
          owner: { select: { fullName: true } },
        },
      },
      payerInstallments: {
        where: { status: { in: ['pending', 'partial', 'overdue'] } },
        orderBy: { dueAt: 'asc' },
        take: 1,
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-700">
            Paybook
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your collections</h1>
          <p className="text-gray-500 text-sm mt-0.5">Collections you&apos;re enrolled in</p>
        </div>

        {enrollments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No active collections</h2>
            <p className="text-gray-500 text-sm">
              You haven&apos;t joined any collections yet. Ask your collection owner for an invite link.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {enrollments.map((e) => {
              const nextDue = e.payerInstallments[0]
              return (
                <Link key={e.id} href={`/payer/collections/${e.collection.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{e.collection.name}</h3>
                        <p className="text-sm text-gray-500">by {e.collection.owner.fullName}</p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {e.status}
                      </span>
                    </div>

                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Total charge</p>
                        <p className="font-semibold">{formatNGN(Number(e.collection.chargeAmount))}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Paid</p>
                        <p className="font-semibold">{formatNGN(Number(e.totalPaid))}</p>
                      </div>
                      {e.collection.nombaAccountNo && (
                        <div>
                          <p className="text-gray-400 text-xs">Pay to</p>
                          <p className="font-semibold font-mono">{e.collection.nombaAccountNo}</p>
                        </div>
                      )}
                      {nextDue && (
                        <div>
                          <p className="text-gray-400 text-xs">Next due</p>
                          <p
                            className={`font-semibold text-xs ${
                              nextDue.status === 'overdue' ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            {formatDate(nextDue.dueAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
