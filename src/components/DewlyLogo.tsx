/** The Dewly mark (dew drop with leaf veins) and the lowercase wordmark. */
export function DewlyLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="56" height="56" viewBox="0 0 48 48" role="img" aria-label="Dewly">
        <rect width="48" height="48" rx="14" className="fill-primary" />
        <path
          d="M24 7C15.5 15 11.5 22.5 11.5 29a12.5 12.5 0 0 0 25 0C36.5 22.5 32.5 15 24 7z"
          className="fill-logo-light"
        />
        <path
          d="M24 39.5V21M24 30l-5.5-4.5M24 25.5l5.5-4.5M24 35l5-4"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="stroke-primary"
        />
      </svg>
      <span aria-hidden="true" className="text-wordmark text-primary">
        dewly
      </span>
    </div>
  )
}
