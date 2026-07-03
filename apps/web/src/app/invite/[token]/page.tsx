import { notFound } from 'next/navigation'
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-700">Paybook</h1>
          <p className="text-gray-500 text-sm mt-1">Collect smarter</p>
        </div>

        {!valid ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">This invite link has expired</h2>
            <p className="text-gray-500 text-sm">
              Invite links are valid for 24 hours. Ask the collection owner to generate a new one.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
