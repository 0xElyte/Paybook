'use client'

import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type FloatingInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  containerClassName?: string
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, id, className, containerClassName, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    return (
      <div className={cn('relative', containerClassName)}>
        <input
          ref={ref}
          id={inputId}
          placeholder=" "
          className={cn(
            'peer h-14 w-full rounded-control border-[1.5px] border-border bg-card px-4 pt-[22px] pb-2 text-[15px] text-text outline-none transition-colors focus:border-green',
            error && 'border-red',
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-4 top-[9px] text-xs text-text-muted transition-all peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[15px] peer-focus:top-[9px] peer-focus:text-xs"
        >
          {label}
        </label>
        {error && (
          <p className="animate-shake mt-1.5 flex items-center gap-1.5 text-[13px] text-red">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="2" />
              <path d="M12 7v6M12 16.5v.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  }
)
FloatingInput.displayName = 'FloatingInput'

type FloatingTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  containerClassName?: string
}

export const FloatingTextarea = forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ label, id, className, containerClassName, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    return (
      <div className={cn('relative', containerClassName)}>
        <textarea
          ref={ref}
          id={inputId}
          placeholder=" "
          className={cn(
            'peer min-h-[84px] w-full resize-y rounded-control border-[1.5px] border-border bg-card px-4 pt-6 pb-2 text-[15px] text-text outline-none transition-colors focus:border-green',
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-4 top-2 text-xs text-text-muted transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[15px] peer-focus:top-2 peer-focus:text-xs"
        >
          {label}
        </label>
      </div>
    )
  }
)
FloatingTextarea.displayName = 'FloatingTextarea'
