import { FormEvent, useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, X } from 'lucide-react'
import { ClientSearch } from '@/components/ClientSearch'
import { api, errorMessage, unwrap } from '@/lib/api'
import type { Client } from '@/lib/clients'
import type { Envelope, Proposal } from '@/lib/types'
import { useUiStore } from '@/stores/ui'

interface ItemDraft {
  description: string
  quantity: string
  unitPrice: string
}

const emptyItem = (): ItemDraft => ({ description: '', quantity: '1', unitPrice: '' })

function defaultValidUntil(): string {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().slice(0, 10)
}

export function NewProposalModal() {
  const navigate = useNavigate()
  const open = useUiStore((s) => s.newProposalOpen)
  const close = useUiStore((s) => s.closeNewProposal)
  const titleId = useId()
  const [client, setClient] = useState<Client | null>(null)
  const [message, setMessage] = useState('')
  const [validUntil, setValidUntil] = useState(defaultValidUntil)
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setClient(null)
    setMessage('')
    setValidUntil(defaultValidUntil())
    setItems([emptyItem()])
    setError('')
    setBusy(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, busy, close])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!client) {
      setError('Selecione um cliente da lista')
      return
    }
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post<Envelope<Proposal>>('/proposals', {
        clientName: client.name,
        clientEmail: client.email,
        message: message || undefined,
        validUntil: new Date(`${validUntil}T23:59:59`).toISOString(),
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      })
      const created = unwrap(data)
      close()
      navigate(`/propostas/${created.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-ink/40"
        disabled={busy}
        onClick={() => {
          if (!busy) close()
        }}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={onSubmit}
        className="sheet relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-seal">Rascunho</p>
            <h2 id={titleId} className="mt-1 font-serif text-2xl font-medium text-ink">
              Nova proposta
            </h2>
          </div>
          <button
            type="button"
            className="btn-ghost px-2 py-2"
            disabled={busy}
            onClick={close}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </header>

        <div className="relative z-10 px-5 pt-5 sm:px-6">
          <ClientSearch selected={client} onSelect={setClient} />
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-ink">Itens</h3>
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
        </div>

        <footer className="flex justify-end gap-2 border-t border-divider px-5 py-4 sm:px-6">
          <button type="button" className="btn-ghost" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="btn-seal px-5">
            {busy ? 'Salvando…' : 'Salvar rascunho'}
          </button>
        </footer>
      </form>
    </div>
  )
}
