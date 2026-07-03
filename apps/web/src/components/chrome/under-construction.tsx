import Image from 'next/image'
import { TopNav } from './top-nav'

export function UnderConstruction({
  variant,
  userName,
  activeHref,
}: {
  variant: 'owner' | 'payer'
  userName: string
  activeHref?: string
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <TopNav variant={variant} userName={userName} activeHref={activeHref} />

      <Image
        src="/paybook-logo-full.png"
        alt=""
        aria-hidden="true"
        width={480}
        height={200}
        className="pointer-events-none fixed top-1/2 left-1/2 z-0 w-[480px] max-w-[62vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      />

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-20">
        <p className="text-lg font-bold text-text-muted">Page under construction</p>
      </main>

      <footer className="relative z-10 border-t border-border px-8 py-6 text-center text-xs text-text-faint">
        Paybook — Collect smarter
      </footer>
    </div>
  )
}
