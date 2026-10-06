import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Seal } from '@/components/Seal'
import { api, errorMessage, unwrap } from '@/lib/api'
import { formatDate, money, proposalTotal } from '@/lib/brand'
import type { Envelope, Proposal } from '@/lib/types'

export default function PublicProposalPage() {
  const { token } = useParams()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post<Envelope<Proposal>>(`/p/${token}/${path}`, path === 'decline' ? { reason: 'Recusada pelo cliente' } : {})
      setProposal(unwrap(data))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (error && !proposal) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-paper-ink">
        <p className="font-serif text-2xl">Proposta indisponível</p>
        <p className="mt-2 text-sm text-paper-muted">{error}</p>
      </div>
    )
  }
  if (!proposal) return <p className="px-4 py-16 text-center text-paper-muted">Abrindo a proposta…</p>

  const open = proposal.status === 'SENT' || proposal.status === 'VIEWED'
  const accepted = proposal.status === 'ACCEPTED'

  return (
    <div className="min-h-dvh bg-paper px-4 py-10 text-paper-ink">
      <div className="print-sheet mx-auto max-w-2xl rounded-sm border border-stone-300/80 bg-[#faf6ee] p-8 shadow-[0_20px_50px_rgba(80,50,20,0.08)] sm:p-12">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-paper-muted">Visto</p>
            <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">Proposta {proposal.number}</h1>
            <p className="mt-3 text-sm text-paper-muted">
              Para {proposal.clientName} · válida até {formatDate(proposal.validUntil)}
            </p>
          </div>
          {accepted && <Seal />}
        </header>

        {proposal.message && <p className="mt-8 font-serif text-lg leading-relaxed">{proposal.message}</p>}

        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left text-paper-muted">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Qtd</th>
              <th className="pb-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((item) => (
              <tr key={item.id} className="border-b border-stone-200">
                <td className="py-3">{item.description}</td>
                <td className="py-3">{item.quantity}</td>
                <td className="py-3 text-right">{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-right font-serif text-2xl">{money(proposalTotal(proposal.items))}</p>

        {accepted && proposal.contentHash && (
          <p className="mt-6 break-all font-mono text-[11px] text-paper-muted">conteúdo travado · {proposal.contentHash}</p>
        )}
        {proposal.status === 'DECLINED' && (
          <p className="mt-6 text-sm text-paper-muted">Esta proposta foi recusada.</p>
        )}
        {proposal.status === 'EXPIRED' && (
          <p className="mt-6 text-sm text-paper-muted">Esta proposta expirou.</p>
        )}

        {error && <p className="no-print mt-4 text-sm text-red-700">{error}</p>}

        <div className="no-print mt-10 flex flex-wrap gap-3">
          {open && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide('accept')}
                className="rounded-md bg-[#9a3412] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7c2d12] disabled:opacity-60"
              >
                {busy ? 'Lacrando…' : 'Aceitar e lacrar'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide('decline')}
                className="rounded-md border border-stone-400 px-5 py-2.5 text-sm text-paper-ink hover:bg-stone-100 disabled:opacity-60"
              >
                Recusar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-stone-400 px-4 py-2.5 text-sm hover:bg-stone-100"
          >
            <Printer size={14} /> Imprimir / salvar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
