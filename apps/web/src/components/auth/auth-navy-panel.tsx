'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const testimonials = [
  { quote: 'I stopped chasing tenants for rent screenshots. It just shows up matched.', name: 'Emeka N.', initial: 'E' },
  { quote: 'Our cooperative dues used to take a spreadsheet and a WhatsApp group. Not anymore.', name: 'Amaka O.', initial: 'A' },
  { quote: 'Every payer gets one account number, forever. No more re-explaining transfers.', name: 'Tunde A.', initial: 'T' },
]

export function AuthNavyPanel({
  heading,
  body,
  showTestimonials = false,
}: {
  heading: string
  body: string
  showTestimonials?: boolean
}) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!showTestimonials) return
    const t = setInterval(() => setIdx((i) => (i + 1) % testimonials.length), 3600)
    return () => clearInterval(t)
  }, [showTestimonials])

  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-navy px-[52px] py-14 text-white">
      <svg
        viewBox="0 0 500 700"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-[0.16]"
      >
        <defs>
          <radialGradient id="ng" cx="30%" cy="20%" r="90%">
            <stop offset="0%" stopColor="#00D97E" />
            <stop offset="100%" stopColor="#0F1C3F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="500" height="700" fill="url(#ng)" />
        <g stroke="#7FF0C0" strokeWidth="1" fill="none" opacity="0.5">
          <path d="M-20 120 L180 40 L360 160 L520 90" />
          <path d="M-20 320 L140 240 L320 360 L520 300" />
          <path d="M-20 540 L200 470 L340 580 L520 520" />
        </g>
        <g fill="#00D97E">
          <circle cx="180" cy="40" r="5" />
          <circle cx="360" cy="160" r="5" />
          <circle cx="140" cy="240" r="5" />
          <circle cx="320" cy="360" r="5" />
          <circle cx="200" cy="470" r="5" />
          <circle cx="340" cy="580" r="5" />
        </g>
      </svg>

      <div className="relative flex items-center gap-2.5">
        <Image
          src="/paybook-mark.png"
          alt="Paybook"
          width={40}
          height={40}
          className="brightness-0 invert"
        />
        <span className="text-[22px] font-extrabold tracking-tight">Paybook</span>
      </div>

      <div className="relative">
        <h1 className="mb-3.5 max-w-[12ch] text-[40px] leading-[1.12] font-extrabold tracking-tight">{heading}</h1>
        <p className="mb-8 max-w-[34ch] text-base leading-relaxed text-text-faint">{body}</p>

        {showTestimonials && (
          <div className="relative h-[108px]">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-all duration-600"
                style={{ opacity: i === idx ? 1 : 0, transform: i === idx ? 'translateY(0)' : 'translateY(6px)' }}
              >
                <p className="mb-2.5 text-[15px] leading-snug text-[#EAF0FB]">{t.quote}</p>
                <div className="flex items-center gap-2.5">
                  <div className="grid h-[26px] w-[26px] place-items-center rounded-full bg-green text-xs font-bold text-navy">
                    {t.initial}
                  </div>
                  <span className="text-[13px] font-medium text-text-faint">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative text-[13px] leading-relaxed text-[#8494B8]">
        Trusted by landlords, cooperative coordinators, and subscription managers.
      </div>
    </div>
  )
}
