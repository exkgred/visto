import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { api, unwrap } from '@/lib/api'
import { APP_LABEL, EVENT_LABEL, STATUS_LABEL, STATUS_ORDER, formatDate, money, proposalTotal, timeAgo } from '@/lib/brand'
import type { DashboardKpis, Envelope, Proposal } from '@/lib/types'

export default function InboxPage() {
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

  if (error) return <p className="text-red-400">{error}</p>
  if (!kpis) return <p className="text-ink-500">Carregando caixa…</p>

  const cards = [
    { label: 'Aguardando lacre', value: money(kpis.pendingAmount), hint: 'enviadas + vistas' },
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
          <p className="text-xs uppercase tracking-widest text-accent">Caixa</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-300">Propostas por estado</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            O Nexo manda. O cliente abre o link. O aceite trava o hash e aponta para o VendaCore.
          </p>
        </div>
        <Link
          to="/propostas/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 hover:bg-accent-hover"
        >
          <Plus size={16} /> Nova proposta
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
            <p className="text-xs text-ink-500">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-ink-300">{card.value}</p>
            <p className="mt-1 text-xs text-ink-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {STATUS_ORDER.map((status) => {
          const bucket = proposals.filter((item) => item.status === status)
          return (
            <section key={status} className="rounded-2xl border border-white/10 bg-ink-900/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-ink-300">{STATUS_LABEL[status]}</h2>
                <span className="text-xs text-ink-500">{bucket.length}</span>
              </div>
              <ul className="space-y-2">
                {bucket.length === 0 && <li className="text-xs text-ink-500">Nenhuma</li>}
                {bucket.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/propostas/${item.id}`}
                      className="block rounded-xl border border-white/5 bg-ink-950/40 px-3 py-2.5 hover:border-accent/30"
                    >
                      <p className="text-sm text-ink-300">{item.clientName}</p>
                      <p className="mt-1 flex items-center justify-between text-xs text-ink-500">
                        <span>{item.number}</span>
                        <span>{money(proposalTotal(item.items))}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-ink-500">até {formatDate(item.validUntil)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <section className="rounded-2xl border border-white/10 bg-ink-900/50 p-5">
        <h2 className="mb-4 font-medium text-ink-300">Últimos eventos</h2>
        <ul className="space-y-3">
          {kpis.recentEvents.slice(0, 8).map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="text-ink-300">{EVENT_LABEL[item.type]}</p>
                <p className="text-xs text-ink-500">
                  {APP_LABEL[item.sourceApp] ?? item.sourceApp} · {item.status.toLowerCase()}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-500">
                {timeAgo(item.occurredAt)} <ArrowRight size={12} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
