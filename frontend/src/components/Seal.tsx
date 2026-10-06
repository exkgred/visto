interface SealProps {
  className?: string
  label?: string
}

export function Seal({ className, label = 'Aceita' }: SealProps) {
  return (
    <div className={['flex flex-col items-center gap-1', className].filter(Boolean).join(' ')}>
      <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true" className="-rotate-6">
        <circle cx="46" cy="46" r="38" fill="#7c2430" />
        <circle cx="46" cy="46" r="31" fill="none" stroke="#f3efe8" strokeWidth="1.2" strokeDasharray="2.5 3.5" />
        <path
          d="M33 47.2l8.4 8.6 17.2-18"
          fill="none"
          stroke="#f8f1e8"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-serif text-sm tracking-wide text-seal">{label}</span>
    </div>
  )
}
