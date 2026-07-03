/**
 * Single centralized invite link validity check.
 * Called at link open AND again at onboarding completion — do not duplicate this logic.
 */

interface InviteLinkShape {
  isActive: boolean
  expiresAt: Date
  maxUses: number | null
  usedCount: number
}

export function isLinkValid(link: InviteLinkShape): boolean {
  if (!link.isActive) return false
  if (new Date() > link.expiresAt) return false
  if (link.maxUses !== null && link.usedCount >= link.maxUses) return false
  return true
}
