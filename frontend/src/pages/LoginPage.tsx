import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { api, unwrap } from '@/lib/api'
import type { Envelope, PublicUser } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

const PERSONAS = [
  { email: 'marina@visto.dev', label: 'Marina', hint: 'Vendedora — emite o lacre' },
  { email: 'admin@visto.dev', label: 'Admin', hint: 'Tudo liberado' },
] as const

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('marina@visto.dev')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post<
        Envelope<{ user: PublicUser; tokens: { accessToken: string; refreshToken: string } }>
      >('/auth/login', { email, password })
      const session = unwrap(data)
      setSession(session.user, session.tokens.accessToken, session.tokens.refreshToken)
      navigate('/')
    } catch {
      setError('Credenciais inválidas')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_0.9fr]">
      <aside className="visto-grid relative hidden flex-col justify-between overflow-hidden border-r border-white/10 px-12 py-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.16),transparent_42%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-500">
            <BrandMark size={18} wordmark={false} />
            Proposta pública com aceite
          </div>
          <h1 className="mt-8 max-w-md text-4xl font-semibold tracking-tight text-ink-300">
            Nexo envia.
            <span className="block text-accent">O cliente lacra. VendaCore fatura.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-500">
            O elo que faltava: um link sem login, um hash que trava o conteúdo, e o handoff para o
            ERP.
          </p>
        </div>
        <ol className="relative grid gap-3 text-sm text-ink-500">
          <li className="rounded-xl border border-white/10 bg-ink-900/50 px-4 py-3">1. Nexo publica PropostaEnviada</li>
          <li className="rounded-xl border border-white/10 bg-ink-900/50 px-4 py-3">2. Cliente abre /p/token e aceita</li>
          <li className="rounded-xl border border-white/10 bg-ink-900/50 px-4 py-3">3. Handoff para o VendaCore</li>
        </ol>
      </aside>

      <div className="flex items-center justify-center px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-ink-900/80 p-8 shadow-glow backdrop-blur"
        >
          <div className="text-center lg:text-left">
            <div className="mb-4 flex justify-center lg:justify-start">
              <BrandMark size={40} />
            </div>
            <h2 className="text-2xl font-semibold text-ink-300">Entrar no Visto</h2>
            <p className="mt-1 text-sm text-ink-500">Escolha um crachá. A senha já vem preenchida.</p>
          </div>
          <label className="block text-sm font-medium text-ink-500">
            E-mail
            <input
              className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-accent"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-ink-500">
            Senha
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-accent"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-ink-950 hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? 'Abrindo a caixa…' : 'Entrar'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            {PERSONAS.map((persona) => (
              <button
                key={persona.email}
                type="button"
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  email === persona.email
                    ? 'border-accent/40 bg-accent/15 text-accent'
                    : 'border-white/5 bg-ink-800 text-ink-300 hover:border-white/10'
                }`}
                onClick={() => setEmail(persona.email)}
              >
                <span className="block text-sm font-medium">{persona.label}</span>
                <span className="text-[11px] text-ink-500">{persona.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-ink-500">senha: password123</p>
        </form>
      </div>
    </div>
  )
}
