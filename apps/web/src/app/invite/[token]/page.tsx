import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import { isLinkValid } from '@/lib/invite-link'
import { InviteLandingClient } from '@/components/payer/invite-landing-client'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const link = await prisma.inviteLink.findUnique({
    where: { token },
    include: {
      collection: {
        include: {
          owner: { select: { fullName: true } },
          installments: { orderBy: { sequenceIndex: 'asc' } },
        },
      },
    },
  })

  if (!link) notFound()

  const valid = isLinkValid(link)

  return (
    <div className="animate-route-in relative flex min-h-screen flex-col items-center overflow-hidden bg-surface px-6 py-10">
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-5"
      >
        <g stroke="#0F1C3F" strokeWidth="1.5" fill="none">
          <path d="M0 200 L300 120 L600 240 L900 130 L1200 220" />
          <path d="M0 460 L280 380 L560 480 L840 360 L1200 440" />
        </g>
        <g fill="#00D97E">
          <circle cx="300" cy="120" r="6" />
          <circle cx="600" cy="240" r="6" />
          <circle cx="900" cy="130" r="6" />
          <circle cx="280" cy="380" r="6" />
          <circle cx="560" cy="480" r="6" />
        </g>
      </svg>

      <div className="relative mt-5 mb-[34px] flex items-center gap-2.5">
        <Image src="/paybook-mark.png" alt="Paybook" width={34} height={34} />
        <span className="text-[19px] font-extrabold text-text">Paybook</span>
      </div>

      <div className="relative w-full max-w-[440px]">
        {!valid ? (
          <div className="rounded-[22px] bg-card p-8 text-center shadow-[0_1px_3px_rgba(15,28,63,0.05),0_24px_60px_rgba(15,28,63,0.12)]">
            <div className="mb-4 text-4xl">⏰</div>
            <h2 className="mb-2 text-xl font-extrabold">This invite link has expired</h2>
            <p className="text-sm text-text-muted">
              Invite links are valid for 24 hours. Ask the collection owner to generate a new one.
            </p>
          </div>
        ) : (
          <Suspense>
          <InviteLandingClient
            link={{
              id: link.id,
              token: link.token,
              expiresAt: link.expiresAt.toISOString(),
            }}
            collection={{
              id: link.collection.id,
              name: link.collection.name,
              description: link.collection.description,
              chargeAmount: Number(link.collection.chargeAmount),
              repaymentType: link.collection.repaymentType,
              durationValue: link.collection.durationValue,
              durationUnit: link.collection.durationUnit,
              nombaAccountNo: link.collection.nombaAccountNo,
              nombaBankName: link.collection.nombaBankName,
              ownerName: link.collection.owner.fullName,
              installments: link.collection.installments.map((i) => ({
                sequenceIndex: i.sequenceIndex,
                percentage: Number(i.percentage),
                dueAfterValue: i.dueAfterValue,
                dueAfterUnit: i.dueAfterUnit,
              })),
            }}
          />
          </Suspense>
        )}
      </div>
    </div>
  )
}
