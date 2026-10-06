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
        <p className="text-xs uppercase tracking-widest text-accent">Rascunho</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-300">Nova proposta</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-ink-500">
          Cliente
          <input
            required
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-accent"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </label>
        <label className="text-sm text-ink-500">
          E-mail
          <input
            required
            type="email"
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-accent"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
        </label>
      </div>
      <label className="block text-sm text-ink-500">
        Validade
        <input
          required
          type="date"
          className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-accent"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
        />
      </label>
      <label className="block text-sm text-ink-500">
        Mensagem
        <textarea
          rows={3}
          className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-accent"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-300">Itens</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-accent"
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
              className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300 outline-none focus:border-accent"
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
              className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300 outline-none focus:border-accent"
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
              className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-300 outline-none focus:border-accent"
              value={item.unitPrice}
              onChange={(e) =>
                setItems((current) =>
                  current.map((row, i) => (i === index ? { ...row, unitPrice: e.target.value } : row)),
                )
              }
            />
            <button
              type="button"
              className="rounded-lg border border-white/10 px-2 text-ink-500 hover:text-red-400"
              onClick={() => setItems((current) => current.filter((_, i) => i !== index || current.length === 1))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-ink-950 hover:bg-accent-hover disabled:opacity-60"
      >
        {busy ? 'Salvando…' : 'Salvar rascunho'}
      </button>
    </form>
  )
}
