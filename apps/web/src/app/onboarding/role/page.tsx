'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Role = 'owner' | 'payer'

export default function RoleSelectionPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Role | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function pick(role: Role) {
    if (submitting) return
    setSelected(role)
    setSubmitting(true)

    await fetch('/api/users/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })

    setTimeout(() => {
      router.push(role === 'owner' ? '/' : '/payer/collections')
    }, 350)
  }

  return (
    <div className="animate-route-in flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10 flex items-center gap-2.5">
        <Image src="/paybook-mark.png" alt="Paybook" width={36} height={36} />
        <span className="text-xl font-extrabold tracking-tight text-text">Paybook</span>
      </div>

      <h1 className="mb-2 text-center text-[34px] font-extrabold tracking-tight">How will you use Paybook?</h1>
      <p className="mb-10 text-center text-base text-text-muted">Pick the role that fits you best to get started.</p>

      <div className="grid w-full max-w-[720px] grid-cols-1 gap-6 sm:grid-cols-2">
        <RoleCard
          role="owner"
          selected={selected === 'owner'}
          onSelect={() => pick('owner')}
          title="Owner"
          description="I collect payments from others — rent, dues, subscriptions."
        >
          <svg width="150" height="120" viewBox="0 0 150 120" fill="none">
            <rect x="18" y="78" width="114" height="12" rx="3" fill="#0F1C3F" />
            <rect x="26" y="52" width="98" height="30" rx="4" fill="#E7ECF5" />
            <rect x="34" y="60" width="40" height="6" rx="3" fill="#B9C4DA" />
            <rect x="34" y="70" width="24" height="6" rx="3" fill="#B9C4DA" />
            <rect x="92" y="44" width="26" height="38" rx="3" fill="#00D97E" />
            <rect x="97" y="50" width="16" height="4" rx="2" fill="#0F1C3F" opacity="0.5" />
            <circle cx="75" cy="32" r="15" fill="#0F1C3F" />
            <path d="M56 54c0-10.5 8.5-19 19-19s19 8.5 19 19" fill="#2A3A63" />
          </svg>
        </RoleCard>

        <RoleCard
          role="payer"
          selected={selected === 'payer'}
          onSelect={() => pick('payer')}
          title="Payer"
          description="I pay into collections set up by someone else."
        >
          <svg width="150" height="120" viewBox="0 0 150 120" fill="none">
            <circle cx="75" cy="30" r="15" fill="#0F1C3F" />
            <path d="M52 62c0-12.7 10.3-23 23-23s23 10.3 23 23" fill="#2A3A63" />
            <rect x="86" y="52" width="34" height="52" rx="6" fill="#00D97E" />
            <rect x="91" y="59" width="24" height="34" rx="2" fill="#0F1C3F" opacity="0.85" />
            <path d="M97 76h12M103 70v12" stroke="#00D97E" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="103" cy="99" r="2.5" fill="#0F1C3F" opacity="0.4" />
          </svg>
        </RoleCard>
      </div>

      <p className="mt-6 text-[13.5px] text-text-faint">
        You can always do both — switch roles anytime from your profile.
      </p>
    </div>
  )
}

function RoleCard({
  role,
  selected,
  onSelect,
  title,
  description,
  children,
}: {
  role: Role
  selected: boolean
  onSelect: () => void
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-role={role}
      onClick={onSelect}
      className={`relative rounded-[20px] border-2 bg-card p-[30px] text-left transition-all duration-200 hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-[0_22px_50px_rgba(15,28,63,0.15)] ${
        selected ? 'border-green' : 'border-border'
      }`}
    >
      {selected && (
        <div className="animate-pop-in absolute top-[18px] right-[18px] grid h-[30px] w-[30px] place-items-center rounded-full bg-green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#0F1C3F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      <div className="mb-[18px]">{children}</div>
      <h3 className="mb-1.5 text-xl font-extrabold">{title}</h3>
      <p className="text-[14.5px] leading-snug text-text-muted">{description}</p>
    </button>
  )
}
