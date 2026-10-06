interface SealProps {
  className?: string
  label?: string
}

export function Seal({ className, label = 'Aceita' }: SealProps) {
  return (
    <div className={['flex flex-col items-center gap-1', className].filter(Boolean).join(' ')}>
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r="36" fill="#9a3412" />
        <circle cx="44" cy="44" r="30" fill="#c2410c" />
        <circle cx="44" cy="44" r="24" fill="none" stroke="#fed7aa" strokeWidth="1.4" strokeDasharray="3 4" />
        <path
          d="M32 45.2l8.2 8.4 16.4-17.2"
          fill="none"
          stroke="#fff7ed"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-serif text-sm tracking-wide text-orange-900">{label}</span>
    </div>
  )
}
