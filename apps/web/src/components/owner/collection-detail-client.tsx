'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus2 } from 'lucide-react'
import { formatNGN, formatDate } from '@/lib/utils'
import { TopNav } from '@/components/chrome/top-nav'
import { MonoAccountNumber } from '@/components/ui/mono-account-number'
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'

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
  ownerName: string
}

type Tab = 'payers' | 'transactions' | 'invite'

export function CollectionDetailClient({ collection, inviteLinks, enrollments, transactions, ownerName }: Props) {
  const [tab, setTab] = useState<Tab>('invite')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [localLinks, setLocalLinks] = useState<InviteLink[]>(inviteLinks)
  const [maxUsesInput, setMaxUsesInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const totalCollected = transactions.filter((tx) => tx.matchStatus === 'matched').reduce((sum, tx) => sum + tx.amount, 0)
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
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isLinkValid = (link: InviteLink) => {
    if (!link.isActive) return false
    if (new Date() > new Date(link.expiresAt)) return false
    if (link.maxUses !== null && link.usedCount >= link.maxUses) return false
    return true
  }

  const activeLink = localLinks.find(isLinkValid)
  const hoursLeftFor = (expiresAt: string) =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))

  return (
    <div className="relative min-h-screen">
      <TopNav variant="owner" userName={ownerName} />

      <main className="relative z-10 mx-auto max-w-[1040px] px-6 py-7 pb-20">
        <Link href="/" className="mb-[18px] flex w-fit items-center gap-1.5 text-sm font-bold text-text-2 hover:text-text">
          ← Back to dashboard
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-extrabold tracking-tight">{collection.name}</h1>
            <div className="flex items-center gap-2.5">
              {collection.nombaAccountNo && <MonoAccountNumber accountNumber={collection.nombaAccountNo} size="sm" />}
              <span className="text-xs text-text-faint">· {collection.nombaBankName}</span>
            </div>
          </div>
          <div className="rounded-[14px] bg-navy px-5 py-3.5 text-right text-white">
            <div className="mb-0.5 text-[11.5px] text-text-faint">Total collected</div>
            <div className="font-mono text-xl font-extrabold text-green">{formatNGN(totalCollected)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-5">
            <div className="rounded-card bg-card p-1 shadow-card">
              <div className="flex gap-1 px-4.5 pt-3">
                {(['payers', 'transactions'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`mr-4 border-b-2 px-1 py-2 text-sm font-bold capitalize transition-colors ${
                      tab === t ? 'border-green text-navy' : 'border-transparent text-text-muted'
                    }`}
                  >
                    {t === 'payers' ? `Payers (${enrollments.length})` : `Transactions (${transactions.length})`}
                  </button>
                ))}
              </div>

              <div className="p-4.5 pt-2">
                {tab === 'payers' &&
                  (enrollments.length === 0 ? (
                    <EmptyRow emoji="👥" text="No payers yet. Generate an invite link to get started." />
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="min-w-[560px]">
                        <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.8fr] border-b border-border px-2 py-2.5 text-xs font-bold text-text-muted">
                          <span>Payer</span>
                          <span>Status</span>
                          <span className="text-right">Paid</span>
                          <span className="text-right">Outstanding</span>
                        </div>
                        {enrollments.map((e) => {
                          const outstanding = collection.chargeAmount - e.totalPaid
                          const tone = e.nextInstallment
                            ? toneForStatus(e.nextInstallment.status).tone
                            : outstanding <= 0
                              ? 'green'
                              : 'gray'
                          const label = e.nextInstallment ? e.nextInstallment.status : outstanding <= 0 ? 'paid' : 'pending'
                          return (
                            <div key={e.id} className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.8fr] items-center border-b border-fill px-2 py-3.5 transition-colors hover:bg-card-subtle">
                              <div className="flex items-center gap-2.5">
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-fill text-xs font-bold text-text-2">
                                  {e.payerName.slice(0, 1).toUpperCase()}
                                </span>
                                <div>
                                  <div className="text-[13.5px] font-bold">{e.payerName}</div>
                                  <div className="text-[11.5px] text-text-faint">Joined {formatDate(e.joinedAt)}</div>
                                </div>
                              </div>
                              <span>
                                <StatusBadge label={label} tone={tone} pulse={label === 'overdue'} />
                              </span>
                              <span className="text-right font-mono text-[13px] font-bold">{formatNGN(e.totalPaid)}</span>
                              <span className="text-right font-mono text-[13px] font-bold text-text-muted">
                                {formatNGN(Math.max(0, outstanding))}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                {tab === 'transactions' &&
                  (transactions.length === 0 ? (
                    <EmptyRow emoji="💸" text="No transactions yet." />
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="min-w-[560px]">
                        <div className="grid grid-cols-[0.7fr_0.9fr_1fr_1fr_1fr] border-b border-border px-2 py-2.5 text-xs font-bold text-text-muted">
                          <span>Date</span>
                          <span className="text-right">Amount</span>
                          <span>Sender</span>
                          <span>Payer</span>
                          <span className="text-right">Match</span>
                        </div>
                        {transactions.map((tx) => (
                          <div key={tx.id} className="grid grid-cols-[0.7fr_0.9fr_1fr_1fr_1fr] items-center border-b border-fill px-2 py-3.5 text-[13px]">
                            <span className="text-text-2">{formatDate(tx.paidAt)}</span>
                            <span className="text-right font-mono font-bold text-green-text">{formatNGN(tx.amount)}</span>
                            <span className="truncate text-text-muted">{tx.senderName}</span>
                            <span className="truncate font-semibold">{tx.payerName ?? '—'}</span>
                            <span className="text-right">
                              <StatusBadge label={tx.matchStatus} tone={toneForStatus(tx.matchStatus).tone} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:sticky lg:top-5">
            <div className="rounded-card bg-card p-5 shadow-card">
              <div className="mb-3.5 flex items-center gap-2">
                <UserPlus2 size={18} />
                <h3 className="text-[15px] font-extrabold">Invite link</h3>
              </div>

              {activeLink ? (
                <>
                  <div className="mb-3 rounded-[11px] bg-surface p-3.5 font-mono text-[12.5px] break-all text-text-2">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${activeLink.token}`}
                  </div>
                  <div className="mb-3.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-amber-text">
                      ~{hoursLeftFor(activeLink.expiresAt)}h left
                    </span>
                    <span className="text-[12.5px] font-semibold text-text-muted">
                      {activeLink.usedCount} / {activeLink.maxUses ?? '∞'} joined
                    </span>
                  </div>
                  <Button variant="outline" onClick={() => copyLink(activeLink.token, activeLink.id)} className="h-11 w-full text-[13.5px]">
                    {copiedId === activeLink.id ? 'Copied!' : 'Copy link'}
                  </Button>
                </>
              ) : (
                <p className="mb-3 text-[13px] text-text-muted">No active invite link. Generate one below.</p>
              )}

              <div className="mt-4 border-t border-border pt-4">
                <label className="mb-1.5 block text-xs text-text-muted">Max payers (blank = unlimited)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={maxUsesInput}
                    onChange={(e) => setMaxUsesInput(e.target.value)}
                    placeholder="Any"
                    className="h-10 flex-1 rounded-[10px] border-[1.5px] border-border px-3 text-sm outline-none focus:border-green"
                  />
                  <Button variant="navy" onClick={generateInviteLink} disabled={generatingLink} className="h-10 px-4 text-[13px]">
                    {generatingLink ? '…' : 'Generate'}
                  </Button>
                </div>
                {linkError && <p className="mt-2 text-xs text-red-text">{linkError}</p>}
                <p className="mt-2 text-xs text-text-faint">Links always expire after 24 hours.</p>
              </div>
            </div>

            {unmatchedCount > 0 && (
              <div className="flex gap-2 rounded-[11px] border-l-[3px] border-amber bg-amber/[0.08] px-3.5 py-3.5">
                <span className="text-[12.5px] leading-snug text-text-2">
                  {unmatchedCount} unmatched transaction{unmatchedCount !== 1 ? 's' : ''} — check the Transactions tab.
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function EmptyRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="p-8 text-center text-text-faint">
      <p className="mb-2 text-3xl">{emoji}</p>
      <p className="text-sm">{text}</p>
    </div>
  )
}
