import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'navy' | 'green' | 'ghost' | 'outline'

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-bold transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100'

const variants: Record<Variant, string> = {
  navy: 'bg-navy text-white shadow-navy-cta hover:shadow-[0_12px_28px_rgba(15,28,63,0.28)]',
  green: 'bg-green text-navy shadow-green-cta hover:shadow-[0_12px_28px_rgba(0,217,126,0.45)]',
  ghost: 'text-text-2 hover:bg-fill',
  outline: 'bg-card border-[1.5px] border-border text-navy hover:shadow-[0_8px_20px_rgba(15,28,63,0.08)]',
}

export function Button({
  variant = 'navy',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(base, variants[variant], 'h-[50px] px-6 text-[15px]', className)}
      {...props}
    />
  )
}
