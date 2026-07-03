import type { Metadata } from 'next'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Paybook',
    template: '%s | Paybook',
  },
  description:
    'Collect smarter — structured payment collection for landlords, cooperatives, and installment sellers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  )
}
