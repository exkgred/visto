interface BrandMarkProps {
  size?: number
  className?: string
  wordmark?: boolean
}

export function BrandMark({ size = 32, className, wordmark = true }: BrandMarkProps) {
  return (
    <span className={['inline-flex items-center gap-2 font-semibold tracking-tight', className].filter(Boolean).join(' ')}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0"
        style={{ width: size, height: size }}
      >
        <rect width="32" height="32" rx="8" fill="#d4a017" />
        <circle cx="16" cy="16" r="9" fill="#7a4a12" />
        <path
          d="M11.5 16.2l3 3.1 6-6.4"
          fill="none"
          stroke="#f4efe6"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {wordmark ? <span>Visto</span> : null}
    </span>
  )
}
