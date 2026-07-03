import { Resend } from 'resend'

let _resend: Resend | null | undefined

function getResend(): Resend | null {
  if (_resend !== undefined) return _resend
  const key = process.env.RESEND_API_KEY
  _resend = key ? new Resend(key) : null
  return _resend
}

async function sendEmail(to: string, subject: string, html: string, devLink: string): Promise<void> {
  const resend = getResend()
  if (!resend) {
    // No Resend credentials configured yet — log the link so the flow is still
    // testable locally. Only ever logged in this unconfigured fallback path,
    // never alongside a real send.
    console.error(`email.send_skipped: RESEND_API_KEY not set — "${subject}" to ${to}. Link: ${devLink}`)
    return
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@paybook.app'
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) {
    console.error('email.send_failed', { to, subject, error })
  }
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const url = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`
  await sendEmail(
    to,
    'Verify your Paybook email',
    `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#0F1C3F;">Verify your email</h2>
      <p>Hi ${name},</p>
      <p>Confirm this is your email address to finish setting up your Paybook account.</p>
      <p><a href="${url}" style="display:inline-block;background:#00D97E;color:#0F1C3F;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Verify email</a></p>
      <p style="color:#6B7A99;font-size:13px;">This link expires in 24 hours. If you didn't create a Paybook account, you can ignore this email.</p>
    </div>`,
    url
  )
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const url = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  await sendEmail(
    to,
    'Reset your Paybook password',
    `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#0F1C3F;">Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your Paybook password. Click below to choose a new one.</p>
      <p><a href="${url}" style="display:inline-block;background:#0F1C3F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset password</a></p>
      <p style="color:#6B7A99;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.</p>
    </div>`,
    url
  )
}
