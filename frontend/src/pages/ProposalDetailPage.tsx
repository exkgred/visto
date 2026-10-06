import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Copy, Send } from 'lucide-react'
import { api, errorMessage, unwrap } from '@/lib/api'
import { APP_LABEL, EVENT_LABEL, STATUS_LABEL, formatDate, money, proposalTotal, timeAgo } from '@/lib/brand'
import type { Envelope, Proposal, ProposalDetail } from '@/lib/types'

export default function ProposalDetailPage() {
  const { id } = useParams()
  const [detail, setDetail] = useState<ProposalDetail | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  function load() {
    if (!id) return
    api
      .get<Envelope<ProposalDetail>>(`/proposals/${id}`)
      .then(({ data }) => setDetail(unwrap(data)))
      .catch(() => setError('Proposta não encontrada'))
  }

  useEffect(load, [id])

  async function send() {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post<Envelope<Proposal>>(`/proposals/${id}/send`)
      unwrap(data)
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (error && !detail) return <p className="text-red-400">{error}</p>
  if (!detail) return <p className="text-ink-500">Carregando…</p>

  const { proposal, timeline } = detail
  const publicUrl = proposal.publicToken ? `${window.location.origin}/p/${proposal.publicToken}` : null

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-widest text-accent">{proposal.number}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-300">{proposal.clientName}</h1>
          <p className="mt-1 text-sm text-ink-500">{proposal.clientEmail}</p>
          <span className="mt-3 inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
            {STATUS_LABEL[proposal.status]}
          </span>
        </header>

        <table className="w-full text-sm">
          <thead className="text-left text-ink-500">
            <tr>
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Qtd</th>
              <th className="pb-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="py-2">{item.description}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2 text-right">{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right text-lg font-semibold text-ink-300">{money(proposalTotal(proposal.items))}</p>
        <p className="text-sm text-ink-500">Válida até {formatDate(proposal.validUntil)}</p>
        {proposal.message && <p className="rounded-xl border border-white/10 bg-ink-900/50 p-4 text-sm">{proposal.message}</p>}
        {proposal.contentHash && (
          <p className="break-all font-mono text-[11px] text-ink-500">hash {proposal.contentHash}</p>
        )}
      </div>

      <aside className="space-y-4">
        {proposal.status === 'DRAFT' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void send()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink-950 hover:bg-accent-hover disabled:opacity-60"
          >
            <Send size={16} /> {busy ? 'Enviando…' : 'Enviar e gerar link'}
          </button>
        )}
        {publicUrl && (
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
            <p className="text-xs text-ink-500">Link público</p>
            <p className="mt-2 break-all text-sm text-ink-300">{publicUrl}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
                onClick={() => {
                  void navigator.clipboard.writeText(publicUrl)
                  setCopied(true)
                }}
              >
                <Copy size={12} /> {copied ? 'Copiado' : 'Copiar'}
              </button>
              <Link to={`/p/${proposal.publicToken}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                Abrir como cliente
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink-500">
              {proposal.viewCount} abertura{proposal.viewCount === 1 ? '' : 's'}
            </p>
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="rounded-2xl border border-white/10 bg-ink-900/40 p-4">
          <h2 className="mb-3 text-sm font-medium text-ink-300">Linha do tempo</h2>
          <ul className="space-y-3 text-sm">
            {timeline.map((item) => (
              <li key={item.id}>
                <p className="text-ink-300">{EVENT_LABEL[item.type]}</p>
                <p className="text-xs text-ink-500">
                  {APP_LABEL[item.sourceApp] ?? item.sourceApp} · {timeAgo(item.occurredAt)}
                </p>
              </li>
            ))}
            {timeline.length === 0 && <li className="text-xs text-ink-500">Sem eventos ainda</li>}
          </ul>
        </div>
      </aside>
    </div>
  )
}
