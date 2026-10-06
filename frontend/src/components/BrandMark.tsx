interface BrandMarkProps {
  size?: number
  className?: string
  wordmark?: boolean
}

export function BrandMark({ size = 32, className, wordmark = true }: BrandMarkProps) {
  return (
    <span className={['inline-flex items-center gap-2.5 font-serif text-[1.15em] tracking-tight', className].filter(Boolean).join(' ')}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0"
        style={{ width: size, height: size }}
      >
        <rect width="32" height="32" rx="8" fill="#7c2430" />
        <path
          d="M9.5 16.4l4.2 4.3 8.8-9.4"
          fill="none"
          stroke="#f8f1e8"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {wordmark ? <span>Visto</span> : null}
    </span>
  )
}
