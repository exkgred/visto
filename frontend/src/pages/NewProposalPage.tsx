import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { api, errorMessage, unwrap } from '@/lib/api'
import type { Envelope, Proposal } from '@/lib/types'

interface ItemDraft {
  description: string
  quantity: string
  unitPrice: string
}

const emptyItem = (): ItemDraft => ({ description: '', quantity: '1', unitPrice: '' })

export default function NewProposalPage() {
  const navigate = useNavigate()
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 14)
    return date.toISOString().slice(0, 10)
  })
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post<Envelope<Proposal>>('/proposals', {
        clientName,
        clientEmail,
        message: message || undefined,
        validUntil: new Date(`${validUntil}T23:59:59`).toISOString(),
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      })
      const created = unwrap(data)
      navigate(`/propostas/${created.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-seal">Rascunho</p>
        <h1 className="mt-1 font-serif text-3xl font-medium text-ink">Nova proposta</h1>
      </header>

      <div className="sheet space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-ink-muted">
            Cliente
            <input required className="field" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </label>
          <label className="text-sm text-ink-muted">
            E-mail
            <input
              required
              type="email"
              className="field"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm text-ink-muted">
          Validade
          <input
            required
            type="date"
            className="field"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </label>
        <label className="block text-sm text-ink-muted">
          Mensagem
          <textarea
            rows={3}
            className="field"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
      </div>

      <div className="sheet space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">Itens</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-seal"
            onClick={() => setItems((current) => [...current, emptyItem()])}
          >
            <Plus size={14} /> linha
          </button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
            <input
              required
              placeholder="Descrição"
              className="field mt-0"
              value={item.description}
              onChange={(e) =>
                setItems((current) =>
                  current.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)),
                )
              }
            />
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className="field mt-0"
              value={item.quantity}
              onChange={(e) =>
                setItems((current) =>
                  current.map((row, i) => (i === index ? { ...row, quantity: e.target.value } : row)),
                )
              }
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço"
              className="field mt-0"
              value={item.unitPrice}
              onChange={(e) =>
                setItems((current) =>
                  current.map((row, i) => (i === index ? { ...row, unitPrice: e.target.value } : row)),
                )
              }
            />
            <button
              type="button"
              className="btn-ghost px-2 text-ink-muted hover:text-seal"
              onClick={() => setItems((current) => current.filter((_, i) => i !== index || current.length === 1))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-seal">{error}</p>}
      <button type="submit" disabled={busy} className="btn-seal px-5">
        {busy ? 'Salvando…' : 'Salvar rascunho'}
      </button>
    </form>
  )
}
