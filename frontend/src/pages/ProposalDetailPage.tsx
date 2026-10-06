import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Copy, Send } from 'lucide-react'
import { api, errorMessage, unwrap } from '@/lib/api'
import {
  APP_LABEL,
  EVENT_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  formatDate,
  money,
  proposalTotal,
  timeAgo,
} from '@/lib/brand'
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

  if (error && !detail) return <p className="text-seal">{error}</p>
  if (!detail) return <p className="text-ink-muted">Carregando…</p>

  const { proposal, timeline } = detail
  const publicUrl = proposal.publicToken ? `${window.location.origin}/p/${proposal.publicToken}` : null

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="sheet space-y-6 p-6 sm:p-8">
        <header>
          <p className="text-xs uppercase tracking-[0.22em] text-seal">{proposal.number}</p>
          <h1 className="mt-2 font-serif text-3xl font-medium text-ink">{proposal.clientName}</h1>
          <p className="mt-1 text-sm text-ink-muted">{proposal.clientEmail}</p>
          <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs ${STATUS_TONE[proposal.status]}`}>
            {STATUS_LABEL[proposal.status]}
          </span>
        </header>

        <table className="w-full text-sm">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Qtd</th>
              <th className="pb-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((item) => (
              <tr key={item.id} className="border-t border-divider">
                <td className="py-2">{item.description}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2 text-right">{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right font-serif text-2xl text-ink">{money(proposalTotal(proposal.items))}</p>
        <p className="text-sm text-ink-muted">Válida até {formatDate(proposal.validUntil)}</p>
        {proposal.message && (
          <p className="rounded-xl border border-divider bg-canvas/60 p-4 text-sm">{proposal.message}</p>
        )}
        {proposal.contentHash && (
          <p className="break-all font-mono text-[11px] text-ink-faint">hash {proposal.contentHash}</p>
        )}
      </div>

      <aside className="space-y-4 pb-8">
        {proposal.status === 'DRAFT' && (
          <button type="button" disabled={busy} onClick={() => void send()} className="btn-seal w-full">
            <Send size={16} /> {busy ? 'Enviando…' : 'Enviar e gerar link'}
          </button>
        )}
        {publicUrl && (
          <div className="sheet p-5">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Link público</p>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block break-all text-sm text-ink underline-offset-2 hover:underline"
            >
              {publicUrl}
            </a>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => {
                  void navigator.clipboard.writeText(publicUrl)
                  setCopied(true)
                }}
              >
                <Copy size={12} /> {copied ? 'Copiado' : 'Copiar'}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Abrir como cliente
              </a>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              {proposal.viewCount} abertura{proposal.viewCount === 1 ? '' : 's'}
            </p>
          </div>
        )}
        {error && <p className="text-sm text-seal">{error}</p>}
        <div className="sheet p-5">
          <h2 className="mb-3 font-serif text-lg text-ink">Linha do tempo</h2>
          <ul className="space-y-3 text-sm">
            {timeline.map((item) => (
              <li key={item.id}>
                <p className="text-ink">{EVENT_LABEL[item.type]}</p>
                <p className="text-xs text-ink-muted">
                  {APP_LABEL[item.sourceApp] ?? item.sourceApp} · {timeAgo(item.occurredAt)}
                </p>
              </li>
            ))}
            {timeline.length === 0 && <li className="text-xs text-ink-faint">Sem eventos ainda</li>}
          </ul>
        </div>
      </aside>
    </div>
  )
}
