import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { api, unwrap } from '@/lib/api'
import {
  APP_LABEL,
  EVENT_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  formatDate,
  money,
  proposalTotal,
  timeAgo,
} from '@/lib/brand'
import type { DashboardKpis, Envelope, Proposal } from '@/lib/types'
import { useUiStore } from '@/stores/ui'

export default function InboxPage() {
  const openNewProposal = useUiStore((s) => s.openNewProposal)
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<Envelope<DashboardKpis>>('/dashboard').then(({ data }) => unwrap(data)),
      api.get<Envelope<Proposal[]>>('/proposals').then(({ data }) => unwrap(data)),
    ])
      .then(([dash, items]) => {
        setKpis(dash)
        setProposals(items)
      })
      .catch(() => setError('Não foi possível carregar a caixa'))
  }, [])

  if (error) return <p className="text-seal">{error}</p>
  if (!kpis) return <p className="text-ink-muted">Carregando caixa…</p>

  const cards = [
    { label: 'Aguardando aceite', value: money(kpis.pendingAmount), hint: 'enviadas + vistas' },
    { label: 'Aceitas', value: money(kpis.acceptedAmount), hint: `${kpis.acceptedCount} handoffs ao VendaCore` },
    {
      label: 'Rascunhos',
      value: String(kpis.byStatus.DRAFT?.count ?? 0),
      hint: 'ainda sem token público',
    },
  ]

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-seal">Caixa</p>
          <h1 className="mt-1 font-serif text-3xl font-medium text-ink">Propostas por estado</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            O Nexo manda. O cliente abre o link. O aceite trava o hash e aponta para o VendaCore.
          </p>
        </div>
        <button type="button" className="btn-seal" onClick={openNewProposal}>
          <Plus size={16} /> Nova proposta
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="sheet p-5">
            <p className="text-xs uppercase tracking-wide text-ink-muted">{card.label}</p>
            <p className="mt-2 font-serif text-2xl text-ink">{card.value}</p>
            <p className="mt-1 text-xs text-ink-faint">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {STATUS_ORDER.map((status) => {
          const bucket = proposals.filter((item) => item.status === status)
          return (
            <section key={status} className="sheet p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-ink">{STATUS_LABEL[status]}</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_TONE[status]}`}>
                  {bucket.length}
                </span>
              </div>
              <ul className="space-y-2">
                {bucket.length === 0 && <li className="text-xs text-ink-faint">Nenhuma</li>}
                {bucket.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/propostas/${item.id}`}
                      className="block rounded-xl border border-divider bg-white px-3 py-2.5 transition hover:border-seal/30 hover:shadow-card"
                    >
                      <p className="text-sm font-medium text-ink">{item.clientName}</p>
                      <p className="mt-1 flex items-center justify-between text-xs text-ink-muted">
                        <span>{item.number}</span>
                        <span>{money(proposalTotal(item.items))}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-ink-faint">até {formatDate(item.validUntil)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <section className="sheet p-5">
        <h2 className="mb-4 font-serif text-lg text-ink">Últimos eventos</h2>
        <ul className="space-y-3">
          {kpis.recentEvents.slice(0, 8).map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="text-ink">{EVENT_LABEL[item.type]}</p>
                <p className="text-xs text-ink-muted">
                  {APP_LABEL[item.sourceApp] ?? item.sourceApp} · {item.status.toLowerCase()}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-faint">
                {timeAgo(item.occurredAt)} <ArrowRight size={12} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
