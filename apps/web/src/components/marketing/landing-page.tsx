import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Banknote,
  BellRing,
  CalendarClock,
  Landmark,
  Link2,
  PiggyBank,
  Radar,
  ShieldCheck,
  Sparkles,
  Users2,
  Wallet,
} from 'lucide-react'
import { Reveal } from './reveal'

// Signed-out '/' — the front door. Everything here is hand-drawn in brand
// colors (no stock imagery): the hero is a live-feeling product vignette, and
// every section reveals on scroll via the Reveal wrapper.
export function LandingPage({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div className="relative overflow-x-clip bg-surface text-text">
      <SiteNav authenticated={authenticated} />
      <Hero authenticated={authenticated} />
      <HowItWorks />
      <Features />
      <Personas />
      <CtaBand authenticated={authenticated} />
      <SiteFooter />
    </div>
  )
}

/* ─── Nav ──────────────────────────────────────────────────────────────────── */

function SiteNav({ authenticated }: { authenticated: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-surface/80 backdrop-blur-[12px]">
      <div className="mx-auto flex h-[68px] max-w-[1180px] items-center gap-8 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/paybook-mark.png" alt="Paybook" width={32} height={32} />
          <span className="text-lg font-extrabold tracking-tight">Paybook</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#how-it-works" className="rounded-[9px] px-3.5 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-fill hover:text-text">
            How it works
          </a>
          <a href="#features" className="rounded-[9px] px-3.5 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-fill hover:text-text">
            Features
          </a>
          <a href="#who-its-for" className="rounded-[9px] px-3.5 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-fill hover:text-text">
            Who it&apos;s for
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {authenticated ? (
            <Link
              href="/dashboard"
              className="shadow-green-cta flex h-10 items-center gap-1.5 rounded-control bg-green px-4 text-sm font-extrabold text-navy transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              Go to dashboard
              <ArrowRight size={15} strokeWidth={2.6} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-control px-4 py-2.5 text-sm font-bold text-text-2 transition-colors hover:bg-fill">
                Sign in
              </Link>
              <Link
                href="/register"
                className="shadow-green-cta flex h-10 items-center gap-1.5 rounded-control bg-green px-4 text-sm font-extrabold text-navy transition-all hover:scale-[1.03] active:scale-[0.97]"
              >
                Get started
                <ArrowRight size={15} strokeWidth={2.6} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/* ─── Hero ─────────────────────────────────────────────────────────────────── */

function Hero({ authenticated }: { authenticated: boolean }) {
  return (
    <section className="landing-grid-bg relative">
      {/* ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full opacity-60 blur-[90px]"
        style={{ background: 'radial-gradient(circle, rgba(0,217,126,0.35), transparent 65%)', animation: 'orbDrift 16s ease-in-out infinite' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -right-32 h-[480px] w-[480px] rounded-full opacity-50 blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(15,28,63,0.22), transparent 65%)', animation: 'orbDrift 20s ease-in-out infinite reverse' }}
      />

      <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-6 pt-16 pb-24 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
        <div>
          <Reveal>
            <div className="mb-5 flex w-fit items-center gap-2 rounded-pill border border-green/30 bg-green/[0.08] px-3.5 py-1.5 text-[12.5px] font-bold text-green-text">
              <Sparkles size={13} />
              Built on Nomba Virtual Accounts
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mb-5 text-[42px] leading-[1.06] font-extrabold tracking-[-0.02em] sm:text-[56px]">
              One account number.
              <br />
              Every payment,{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">accounted for.</span>
                <span aria-hidden className="absolute inset-x-0 bottom-1 z-0 h-[0.38em] rounded-[4px] bg-green/40" />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mb-8 max-w-[520px] text-[17px] leading-relaxed text-text-muted">
              Rent, dues, installments, subscriptions — Paybook gives every collection a permanent bank account,
              matches every transfer to the right person automatically, and keeps a ledger both sides can trust.
              No spreadsheets. No &ldquo;did you get it?&rdquo;
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={authenticated ? '/dashboard' : '/register'}
                className="shadow-green-cta group flex h-[54px] items-center gap-2 rounded-[14px] bg-green px-7 text-[15.5px] font-extrabold text-navy transition-all hover:scale-[1.03] hover:shadow-[0_16px_36px_rgba(0,217,126,0.45)] active:scale-[0.97]"
              >
                {authenticated ? 'Go to your dashboard' : 'Start collecting — it\u2019s free'}
                <ArrowRight size={18} strokeWidth={2.6} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="flex h-[54px] items-center gap-2 rounded-[14px] border-[1.5px] border-border bg-card px-6 text-[15px] font-bold text-navy transition-all hover:border-navy/30 hover:shadow-card"
              >
                See how it works
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-[13px] font-semibold text-text-muted">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-green-text-2" /> Verified bank webhooks
              </span>
              <span className="flex items-center gap-1.5">
                <Radar size={15} className="text-green-text-2" /> Automatic matching
              </span>
              <span className="flex items-center gap-1.5">
                <BellRing size={15} className="text-green-text-2" /> Real-time updates
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal direction="scale" delay={180}>
          <HeroVignette />
        </Reveal>
      </div>
    </section>
  )
}

// A hand-built product vignette: navy virtual-account card, a collection
// progress card, and a loop of arriving-payment toasts.
function HeroVignette() {
  const toasts = [
    { name: 'Chidinma O.', amount: '₦120,000', note: 'Rent · matched', delay: '0s' },
    { name: 'Ibrahim S.', amount: '₦45,000', note: 'Instalment 2 of 3 · matched', delay: '2.6s' },
    { name: 'Amaka N.', amount: '₦25,500', note: 'Co-op dues · matched', delay: '5.2s' },
  ]

  return (
    <div className="relative mx-auto h-[460px] w-full max-w-[470px]" aria-hidden>
      {/* glow */}
      <div
        className="absolute inset-x-6 top-10 bottom-6 rounded-[36px]"
        style={{ background: 'radial-gradient(closest-side, rgba(0,217,126,0.18), transparent)', animation: 'heroGlow 5s ease-in-out infinite' }}
      />

      {/* virtual account card */}
      <div
        className="absolute top-0 left-1/2 w-[330px] -translate-x-1/2 rounded-[22px] bg-gradient-to-br from-navy-tint to-navy p-6 text-white shadow-[0_28px_70px_rgba(15,28,63,0.4)]"
        style={{ animation: 'floatY 7s ease-in-out infinite' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="text-[10.5px] font-bold tracking-[0.14em] text-text-faint uppercase">Virtual account</span>
          <span className="flex items-center gap-1.5 rounded-pill bg-green/15 px-2.5 py-1 text-[10.5px] font-extrabold text-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
            LIVE
          </span>
        </div>
        <div className="mb-1 font-mono text-[26px] font-bold tracking-[0.14em]">8008 6307 77</div>
        <div className="flex items-center justify-between text-[12px] text-text-faint">
          <span>Harmony Court · Rent 2026</span>
          <span>Nombank MFB</span>
        </div>
        {/* animated route line */}
        <svg className="mt-5" width="100%" height="26" viewBox="0 0 280 26" fill="none">
          <path
            d="M2 13 H278"
            stroke="rgba(0,217,126,0.7)"
            strokeWidth="2"
            strokeDasharray="6 10"
            strokeLinecap="round"
            style={{ animation: 'dashFlow 1.4s linear infinite' }}
          />
          <circle cx="6" cy="13" r="4" fill="#00D97E" />
          <circle cx="274" cy="13" r="4" fill="#00D97E" />
        </svg>
        <div className="mt-1.5 flex justify-between text-[10px] font-bold tracking-wide text-text-faint uppercase">
          <span>Any bank transfer</span>
          <span>Your ledger</span>
        </div>
      </div>

      {/* collection progress card */}
      <div
        className="absolute bottom-4 left-0 w-[250px] rounded-[18px] bg-card p-5 shadow-[0_20px_50px_rgba(15,28,63,0.16)]"
        style={{ animation: 'floatYSm 6s ease-in-out 0.8s infinite' }}
      >
        <div className="mb-1 text-[11px] font-bold text-text-muted">Harmony Court · 3 payers</div>
        <div className="mb-3 text-[22px] font-extrabold tracking-tight">
          ₦310,500 <span className="text-[12px] font-bold text-text-faint">/ ₦360,000</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-pill bg-fill-2">
          <div className="h-full w-[86%] rounded-pill bg-gradient-to-r from-green-deep to-green" />
        </div>
        <div className="flex gap-1.5">
          {['C', 'I', 'A'].map((ch, i) => (
            <span
              key={ch}
              className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-extrabold ${
                i < 2 ? 'bg-green text-navy' : 'bg-fill-2 text-text-muted'
              }`}
            >
              {ch}
            </span>
          ))}
          <span className="ml-auto self-center rounded-pill bg-green/[0.12] px-2 py-0.5 text-[10.5px] font-extrabold text-green-text">
            2 of 3 paid
          </span>
        </div>
      </div>

      {/* arriving payment toasts — looping */}
      <div className="absolute right-0 bottom-10 flex w-[240px] flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.name}
            className="flex items-center gap-3 rounded-[15px] border border-border bg-card/95 px-4 py-3 opacity-0 shadow-[0_14px_36px_rgba(15,28,63,0.14)] backdrop-blur"
            style={{ animation: `tickerRise 7.8s ease-in-out ${t.delay} infinite` }}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green/[0.14]">
              <Banknote size={17} className="text-green-text-2" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-extrabold">
                {t.amount} <span className="font-bold text-text-muted">· {t.name}</span>
              </div>
              <div className="truncate text-[11px] font-semibold text-green-text">{t.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── How it works ─────────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      icon: Landmark,
      step: '01',
      title: 'Create a Collection',
      body: 'Name it, set the amount and schedule — one-time, part-payment, or installments. It instantly gets its own permanent bank account number via Nomba.',
    },
    {
      icon: Link2,
      step: '02',
      title: 'Share one invite link',
      body: 'Payers tap the link, create an account, and they’re in — automatically. The link expires in 24 hours and can cap how many people join.',
    },
    {
      icon: Radar,
      step: '03',
      title: 'Payments match themselves',
      body: 'Everyone transfers to the same account number, from any bank app. Paybook recognizes who sent what and updates both dashboards in real time.',
    },
  ]

  return (
    <section id="how-it-works" className="relative bg-card py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <p className="mb-2 text-center text-[13px] font-extrabold tracking-[0.14em] text-green-text uppercase">How it works</p>
          <h2 className="mx-auto mb-14 max-w-[560px] text-center text-[34px] leading-tight font-extrabold tracking-tight">
            From &ldquo;send it to my account&rdquo; to a system, in three steps
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.step} delay={i * 130}>
                <div className="group relative h-full rounded-card border border-border bg-card-subtle p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-green/40 hover:shadow-card-hover">
                  <span className="absolute top-6 right-7 font-mono text-[38px] font-bold text-fill-2 transition-colors group-hover:text-green/20">
                    {s.step}
                  </span>
                  <span className="mb-5 grid h-12 w-12 place-items-center rounded-[14px] bg-navy shadow-navy-cta">
                    <Icon size={22} className="text-green" />
                  </span>
                  <h3 className="mb-2 text-[19px] font-extrabold">{s.title}</h3>
                  <p className="text-[14.5px] leading-relaxed text-text-muted">{s.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── Features ─────────────────────────────────────────────────────────────── */

function Features() {
  const features = [
    {
      icon: CalendarClock,
      title: 'Installments that run themselves',
      body: 'Split any amount into a percentage schedule. Each payer’s clock starts the day they join — due dates, partials and overdues tracked per person.',
    },
    {
      icon: PiggyBank,
      title: 'Overpayments roll forward',
      body: 'Paid too much? It cascades into the next installment automatically — and anything left over shows as a visible credit, never silently absorbed.',
    },
    {
      icon: Radar,
      title: 'Nothing slips through',
      body: 'A transfer from an unknown account isn’t lost — it lands in a review queue where the payer can claim it or the owner assigns it in one tap.',
    },
    {
      icon: Wallet,
      title: 'Banks link themselves',
      body: 'No bank forms. The first confirmed payment binds the sender’s account automatically — every transfer after that matches instantly.',
    },
    {
      icon: BellRing,
      title: 'Both sides see the same truth',
      body: 'Owner and payer each get a live dashboard and notifications. Every naira has a timestamp, a sender, and a place in the ledger.',
    },
    {
      icon: ShieldCheck,
      title: 'Bank-grade verification',
      body: 'Every webhook is HMAC-verified and processed exactly once. Payment records are append-only — the ledger can’t quietly change.',
    },
  ]

  return (
    <section id="features" className="landing-grid-bg relative py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <p className="mb-2 text-center text-[13px] font-extrabold tracking-[0.14em] text-green-text uppercase">Features</p>
          <h2 className="mx-auto mb-14 max-w-[620px] text-center text-[34px] leading-tight font-extrabold tracking-tight">
            A real ledger, not another group chat promise
          </h2>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal key={f.title} delay={(i % 3) * 110}>
                <div className="h-full rounded-card bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                  <span className="mb-4 grid h-11 w-11 place-items-center rounded-[12px] bg-green/[0.12]">
                    <Icon size={20} className="text-green-text-2" />
                  </span>
                  <h3 className="mb-1.5 text-[16.5px] font-extrabold">{f.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-text-muted">{f.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── Personas ─────────────────────────────────────────────────────────────── */

function Personas() {
  const personas = [
    {
      icon: Landmark,
      title: 'Landlords & property managers',
      body: 'Three tenants, one account number, rent that reconciles itself — including part-payments.',
      accent: 'Rent, tracked to the kobo',
    },
    {
      icon: Users2,
      title: 'Cooperatives & associations',
      body: 'Monthly dues from dozens of members without chasing screenshots or matching narrations by hand.',
      accent: 'Every member, visible',
    },
    {
      icon: Banknote,
      title: 'Installment sellers & clubs',
      body: 'Sell on a payment plan with due dates per customer, automatic overdue flags, and rollover credit.',
      accent: 'Plans that enforce themselves',
    },
  ]

  return (
    <section id="who-its-for" className="bg-card py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <p className="mb-2 text-center text-[13px] font-extrabold tracking-[0.14em] text-green-text uppercase">Who it&apos;s for</p>
          <h2 className="mx-auto mb-14 max-w-[520px] text-center text-[34px] leading-tight font-extrabold tracking-tight">
            Anyone who collects from more than one person
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {personas.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.title} direction={i === 0 ? 'left' : i === 2 ? 'right' : 'up'} delay={i * 120}>
                <div className="flex h-full flex-col rounded-card border border-border bg-card-subtle p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover">
                  <span className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-navy">
                    <Icon size={21} className="text-green" />
                  </span>
                  <h3 className="mb-2 text-[18px] font-extrabold">{p.title}</h3>
                  <p className="mb-5 flex-1 text-[14px] leading-relaxed text-text-muted">{p.body}</p>
                  <span className="w-fit rounded-pill bg-green/[0.12] px-3 py-1 text-[12px] font-extrabold text-green-text">
                    {p.accent}
                  </span>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── CTA band ─────────────────────────────────────────────────────────────── */

function CtaBand({ authenticated }: { authenticated: boolean }) {
  return (
    <section className="relative px-6 py-24">
      <Reveal direction="scale">
        <div className="landing-grid-bg-dark relative mx-auto max-w-[1080px] overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-tint to-navy px-8 py-16 text-center text-white shadow-[0_36px_90px_rgba(15,28,63,0.45)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-[340px] w-[620px] -translate-x-1/2 rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(0,217,126,0.35), transparent 70%)' }}
          />
          <div className="relative">
            <h2 className="mx-auto mb-4 max-w-[560px] text-[34px] leading-tight font-extrabold tracking-tight sm:text-[40px]">
              Stop confirming payments by memory
            </h2>
            <p className="mx-auto mb-9 max-w-[440px] text-[15.5px] leading-relaxed text-white/70">
              Create your first Collection in under two minutes. Your dedicated account number is ready before you
              finish reading this sentence.
            </p>
            <Link
              href={authenticated ? '/dashboard' : '/register'}
              className="shadow-green-cta group inline-flex h-[56px] items-center gap-2 rounded-[14px] bg-green px-8 text-[16px] font-extrabold text-navy transition-all hover:scale-[1.04] hover:shadow-[0_18px_44px_rgba(0,217,126,0.5)] active:scale-[0.97]"
            >
              {authenticated ? 'Open your dashboard' : 'Create your free account'}
              <ArrowRight size={18} strokeWidth={2.6} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="mt-5 font-mono text-[12px] tracking-[0.18em] text-white/40">COLLECT SMARTER</p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ─── Footer ───────────────────────────────────────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-8">
        <div className="flex items-center gap-2.5">
          <Image src="/paybook-mark.png" alt="Paybook" width={26} height={26} />
          <span className="text-[15px] font-extrabold">Paybook</span>
          <span className="ml-2 text-[12.5px] text-text-faint">Collect smarter.</span>
        </div>
        <div className="flex items-center gap-6 text-[12.5px] font-semibold text-text-muted">
          <span>
            Payments infrastructure by{' '}
            <a href="https://nomba.com" target="_blank" rel="noreferrer" className="font-bold text-text-2 hover:underline">
              Nomba
            </a>
          </span>
          <span className="text-text-faint">© {new Date().getFullYear()} Paybook</span>
        </div>
      </div>
    </footer>
  )
}
