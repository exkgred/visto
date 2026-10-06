import { useEffect, useId, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { api, unwrap } from '@/lib/api'
import { filterClients, type Client } from '@/lib/clients'
import type { Envelope } from '@/lib/types'

interface ClientSearchProps {
  selected: Client | null
  onSelect: (client: Client | null) => void
}

async function searchClients(query: string): Promise<Client[]> {
  try {
    const { data } = await api.get<Envelope<Client[]>>('/clients', { params: { q: query } })
    return unwrap(data)
  } catch {
    return filterClients(query)
  }
}

export function ClientSearch({ selected, onSelect }: ClientSearchProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (selected) return
    let cancelled = false
    const handle = window.setTimeout(() => {
      setBusy(true)
      void searchClients(query).then((items) => {
        if (cancelled) return
        setResults(items)
        setBusy(false)
      })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, selected])

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !open) return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  if (selected) {
    return (
      <div data-client-search className="space-y-1">
        <p className="text-sm text-ink-muted">Cliente</p>
        <div className="flex items-start justify-between gap-3 rounded-xl border border-divider bg-white px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{selected.name}</p>
            <p className="truncate text-xs text-ink-muted">{selected.email}</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              {selected.document} · {selected.city}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost shrink-0 px-2 py-1 text-ink-muted"
            onClick={() => {
              onSelect(null)
              setQuery('')
              setOpen(true)
            }}
            aria-label="Trocar cliente"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} data-client-search className="relative space-y-1">
      <label className="block text-sm text-ink-muted">
        Cliente
        <span className="relative mt-1 block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            required
            autoFocus
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="Buscar por nome, e-mail ou CNPJ"
            className="field mt-0 pl-9"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
          />
        </span>
      </label>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-divider bg-white py-1 shadow-card"
        >
          {busy && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-ink-faint">Buscando…</li>
          )}
          {!busy && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-ink-faint">Nenhum cliente encontrado</li>
          )}
          {results.map((client) => (
            <li key={client.id} role="option" aria-selected="false">
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-seal-soft"
                onClick={() => {
                  onSelect(client)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="text-sm font-medium text-ink">{client.name}</span>
                <span className="text-[11px] text-ink-muted">
                  {client.email} · {client.city}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
