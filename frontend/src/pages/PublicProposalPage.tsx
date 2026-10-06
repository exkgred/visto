import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { Seal } from '@/components/Seal'
import { api, errorMessage, unwrap } from '@/lib/api'
import { formatDate, money, proposalTotal } from '@/lib/brand'
import type { Envelope, Proposal } from '@/lib/types'

export default function PublicProposalPage() {
  const { token } = useParams()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)

  useEffect(() => {
    document.body.classList.add('paper-root')
    return () => document.body.classList.remove('paper-root')
  }, [])

  useEffect(() => {
    if (!token) return
    api
      .get<Envelope<Proposal>>(`/p/${token}`)
      .then(({ data }) => setProposal(unwrap(data)))
      .catch((err) => setError(errorMessage(err)))
  }, [token])

  async function decide(path: 'accept' | 'decline') {
    if (!token) return
    setBusy(path)
    setError('')
    try {
      const { data } = await api.post<Envelope<Proposal>>(
        `/p/${token}/${path}`,
        path === 'decline' ? { reason: 'Recusada pelo cliente' } : {},
      )
      setProposal(unwrap(data))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  if (error && !proposal) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <BrandMark size={36} className="justify-center" />
        <p className="mt-8 font-serif text-3xl text-ink">Proposta indisponível</p>
        <p className="mt-2 text-sm text-ink-muted">{error}</p>
      </div>
    )
  }
  if (!proposal) {
    return <p className="px-4 py-20 text-center text-ink-muted">Abrindo a proposta…</p>
  }

  const open = proposal.status === 'SENT' || proposal.status === 'VIEWED'
  const accepted = proposal.status === 'ACCEPTED'

  return (
    <div className="min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between no-print">
        <BrandMark size={28} />
        <p className="text-xs uppercase tracking-[0.18em] text-ink-faint">documento público</p>
      </div>
      <article className="print-sheet sheet mx-auto max-w-2xl p-7 sm:p-12">
        <div className="rule mb-8" />
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-ink-faint">Proposta {proposal.number}</p>
            <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">
              {proposal.clientName}
            </h1>
            <p className="mt-3 text-sm text-ink-muted">Válida até {formatDate(proposal.validUntil)}</p>
          </div>
          {accepted && <Seal />}
        </header>

        {proposal.message && (
          <p className="mt-8 font-serif text-lg leading-relaxed text-ink">{proposal.message}</p>
        )}

        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-ink-muted">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Qtd</th>
              <th className="pb-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((item) => (
              <tr key={item.id} className="border-b border-divider/70">
                <td className="py-3">{item.description}</td>
                <td className="py-3">{item.quantity}</td>
                <td className="py-3 text-right">{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-right font-serif text-3xl text-ink">{money(proposalTotal(proposal.items))}</p>

        {accepted && proposal.contentHash && (
          <p className="mt-6 break-all font-mono text-[11px] text-ink-faint">
            conteúdo travado · {proposal.contentHash}
          </p>
        )}
        {proposal.status === 'DECLINED' && (
          <p className="mt-6 text-sm text-ink-muted">Esta proposta foi recusada.</p>
        )}
        {proposal.status === 'EXPIRED' && (
          <p className="mt-6 text-sm text-ink-muted">Esta proposta expirou.</p>
        )}

        {error && <p className="no-print mt-4 text-sm text-seal">{error}</p>}

        <div className="no-print mt-10 flex flex-wrap gap-3">
          {open && (
            <>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void decide('accept')}
                className="btn-seal px-5"
              >
                {busy === 'accept' ? 'Lacrando…' : 'Aceitar e lacrar'}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void decide('decline')}
                className="btn-ghost"
              >
                {busy === 'decline' ? 'Recusando…' : 'Recusar'}
              </button>
            </>
          )}
          <button type="button" onClick={() => window.print()} className="btn-ghost">
            <Printer size={14} /> Imprimir / salvar PDF
          </button>
        </div>
      </article>
    </div>
  )
}
