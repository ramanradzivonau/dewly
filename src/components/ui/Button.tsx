import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary active:bg-primary-hover',
  secondary: 'border-[1.5px] border-border-strong bg-surface text-ink',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  loading?: boolean
}

/** Full-width pill button, 56px tall. One primary per screen. */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`flex min-h-14 w-full items-center justify-center gap-2.5 rounded-pill px-6 text-body-strong transition-colors disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}
