import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatNGN, formatDate } from '@/lib/utils'
import { CopyButton } from '@/components/ui/copy-button'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const col = await prisma.collection.findUnique({ where: { id }, select: { name: true } })
  return { title: col ? col.name : 'Collection' }
}

export default async function PayerCollectionDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const enrollment = await prisma.enrollment.findUnique({
    where: { collectionId_payerId: { collectionId: id, payerId: userId } },
    include: {
      collection: {
        include: { owner: { select: { fullName: true } } },
      },
      bankAccount: true,
      payerInstallments: {
        include: { installment: true },
        orderBy: { dueAt: 'asc' },
      },
      transactions: {
        orderBy: { paidAt: 'desc' },
        take: 30,
      },
    },
  })

  if (!enrollment) notFound()

  const { collection } = enrollment

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
        <div className="flex items-center gap-2 mb-1">
          <Link href="/payer/collections" className="text-sm text-gray-500 hover:text-gray-700">
            My collections
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">{collection.name}</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
          <p className="text-gray-500 text-sm">by {collection.owner.fullName}</p>
        </div>

        {collection.nombaAccountNo && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Transfer your payment to this account</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-mono font-bold text-green-700">{collection.nombaAccountNo}</p>
                <p className="text-sm text-gray-600">{collection.nombaBankName}</p>
              </div>
              <CopyButton
                text={collection.nombaAccountNo}
                className="text-xs text-green-600 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 mb-1">Total charge</p>
            <p className="text-lg font-semibold">{formatNGN(Number(collection.chargeAmount))}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 mb-1">Total paid</p>
            <p className="text-lg font-semibold text-green-600">{formatNGN(Number(enrollment.totalPaid))}</p>
          </div>
          {Number(enrollment.creditBalance) > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-1">Credit balance</p>
              <p className="text-lg font-semibold text-blue-600">{formatNGN(Number(enrollment.creditBalance))}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <p className="text-xs text-gray-400 mb-1">Your registered sending account</p>
          <p className="text-sm font-medium text-gray-900">
            {enrollment.bankAccount.bankName} — {enrollment.bankAccount.accountNumber}
          </p>
          <p className="text-xs text-gray-500">{enrollment.bankAccount.accountName}</p>
        </div>

        {enrollment.payerInstallments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Payment schedule</h2>
            <div className="space-y-2">
              {enrollment.payerInstallments.map((pi) => (
                <div
                  key={pi.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Installment {pi.installment.sequenceIndex} — {Number(pi.installment.percentage)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Due {formatDate(pi.dueAt)}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        pi.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : pi.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : pi.status === 'partial'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {pi.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatNGN(Number(pi.amountPaid))} / {formatNGN(Number(pi.amountDue))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Transaction history</h2>
          {enrollment.transactions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              No transactions yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {['Amount', 'Narration', 'Date', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {enrollment.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatNGN(Number(tx.amount))}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{tx.narration ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(tx.paidAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            tx.matchStatus === 'matched'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {tx.matchStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
