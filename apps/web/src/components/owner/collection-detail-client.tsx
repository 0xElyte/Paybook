'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatNGN, formatDate } from '@/lib/utils'

interface InviteLink {
  id: string
  token: string
  maxUses: number | null
  usedCount: number
  expiresAt: string
  isActive: boolean
  createdAt: string
}

interface NextInstallment {
  dueAt: string
  amountDue: number
  amountPaid: number
  status: string
}

interface Enrollment {
  id: string
  payerName: string
  payerEmail: string
  bankAccount: string
  joinedAt: string
  totalPaid: number
  creditBalance: number
  transactionCount: number
  nextInstallment: NextInstallment | null
}

interface Transaction {
  id: string
  amount: number
  senderName: string
  senderAccountNumber: string
  senderBank: string
  narration: string | null
  paidAt: string
  matchStatus: string
  payerName: string | null
}

interface Props {
  collection: {
    id: string
    name: string
    description: string | null
    chargeAmount: number
    durationValue: number
    durationUnit: string
    repaymentType: string
    status: string
    nombaAccountNo: string | null
    nombaBankName: string | null
  }
  inviteLinks: InviteLink[]
  enrollments: Enrollment[]
  transactions: Transaction[]
}

type Tab = 'payers' | 'transactions' | 'invite'

export function CollectionDetailClient({ collection, inviteLinks, enrollments, transactions }: Props) {
  const [tab, setTab] = useState<Tab>('invite')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [localLinks, setLocalLinks] = useState<InviteLink[]>(inviteLinks)
  const [maxUsesInput, setMaxUsesInput] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const totalCollected = transactions
    .filter((tx) => tx.matchStatus === 'matched')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const unmatchedCount = transactions.filter((tx) => tx.matchStatus === 'unmatched').length

  async function generateInviteLink() {
    setGeneratingLink(true)
    setLinkError(null)

    const maxUses = maxUsesInput.trim() === '' ? null : parseInt(maxUsesInput)

    const res = await fetch(`/api/collections/${collection.id}/invite-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxUses }),
    })

    setGeneratingLink(false)

    if (!res.ok) {
      const data = (await res.json()) as { error: string }
      setLinkError(data.error ?? 'Failed to generate link')
      return
    }

    const data = (await res.json()) as { link: InviteLink }
    setLocalLinks([data.link, ...localLinks])
    setMaxUsesInput('')
  }

  async function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isLinkValid = (link: InviteLink) => {
    if (!link.isActive) return false
    if (new Date() > new Date(link.expiresAt)) return false
    if (link.maxUses !== null && link.usedCount >= link.maxUses) return false
    return true
  }

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
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Collections
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">{collection.name}</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
            {collection.description && <p className="text-gray-500 text-sm mt-0.5">{collection.description}</p>}
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full mt-1 ${
              collection.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {collection.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Charge', value: formatNGN(collection.chargeAmount) },
            { label: 'Active payers', value: enrollments.length.toString() },
            { label: 'Total collected', value: formatNGN(totalCollected) },
            { label: 'Unmatched', value: unmatchedCount.toString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-lg font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {collection.nombaAccountNo && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Collection account — payers transfer here</p>
              <p className="text-xl font-mono font-bold text-green-700 mt-0.5">{collection.nombaAccountNo}</p>
              <p className="text-sm text-gray-600">{collection.nombaBankName}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(collection.nombaAccountNo!)}
              className="text-xs text-green-600 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
            >
              Copy
            </button>
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
          {(['payers', 'transactions', 'invite'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'payers'
                ? `Payers (${enrollments.length})`
                : t === 'transactions'
                  ? `Transactions (${transactions.length})`
                  : 'Invite links'}
            </button>
          ))}
        </div>

        {tab === 'payers' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {enrollments.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-sm">No payers yet. Generate an invite link to get started.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {['Payer', 'Bank account', 'Joined', 'Total paid', 'Next installment'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{e.payerName}</p>
                        <p className="text-gray-400 text-xs">{e.payerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{e.bankAccount}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(e.joinedAt)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatNGN(e.totalPaid)}</td>
                      <td className="px-4 py-3">
                        {e.nextInstallment ? (
                          <div>
                            <span
                              className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                e.nextInstallment.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : e.nextInstallment.status === 'overdue'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {e.nextInstallment.status}
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatNGN(e.nextInstallment.amountPaid)} / {formatNGN(e.nextInstallment.amountDue)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'transactions' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-3xl mb-2">💸</p>
                <p className="text-sm">No transactions yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {['Amount', 'Sender', 'Payer matched', 'Date', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatNGN(tx.amount)}</td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{tx.senderName}</p>
                        <p className="text-xs text-gray-400">
                          {tx.senderBank} — {tx.senderAccountNumber}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{tx.payerName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(tx.paidAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            tx.matchStatus === 'matched'
                              ? 'bg-green-100 text-green-700'
                              : tx.matchStatus === 'unmatched'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {tx.matchStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'invite' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Generate new invite link</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Max payers (leave blank for unlimited)</label>
                  <input
                    type="number"
                    min={1}
                    value={maxUsesInput}
                    onChange={(e) => setMaxUsesInput(e.target.value)}
                    placeholder="Any"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <button
                  onClick={generateInviteLink}
                  disabled={generatingLink}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {generatingLink ? 'Generating…' : 'Generate link'}
                </button>
              </div>
              {linkError && <p className="text-red-600 text-sm mt-2">{linkError}</p>}
              <p className="text-xs text-gray-400 mt-2">Links always expire after 24 hours.</p>
            </div>

            {localLinks.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      {['Link', 'Capacity', 'Used', 'Expires', 'Status', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {localLinks.map((link) => {
                      const valid = isLinkValid(link)
                      return (
                        <tr key={link.id}>
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">{link.token.slice(0, 12)}…</td>
                          <td className="px-4 py-3 text-gray-600">{link.maxUses ?? 'Any'}</td>
                          <td className="px-4 py-3 text-gray-600">{link.usedCount}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(link.expiresAt)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                valid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {valid ? 'active' : 'expired'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {valid && (
                              <button
                                onClick={() => copyLink(link.token, link.id)}
                                className="text-xs text-green-600 hover:text-green-800 font-medium"
                              >
                                {copiedId === link.id ? 'Copied!' : 'Copy link'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
