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
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-canvas px-12 py-14 lg:flex">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-seal" />
        <div>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-ink-muted">
            <BrandMark size={22} wordmark={false} />
            Proposta pública
          </p>
          <h1 className="mt-10 max-w-md font-serif text-5xl font-medium leading-[1.08] text-ink">
            O documento que o cliente assina.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-muted">
            Um link sem login. Um lacre bordô. O hash trava o conteúdo e o handoff aponta para o
            VendaCore.
          </p>
        </div>

        <div className="relative mt-12 max-w-md">
          <div className="sheet relative overflow-hidden p-7">
            <div className="rule mb-5" />
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">VST-0002</p>
            <p className="mt-2 font-serif text-2xl text-ink">Acme Indústria</p>
            <p className="mt-4 text-sm text-ink-muted">Implantação comercial · válida até 20 out 2026</p>
            <p className="mt-6 font-serif text-3xl text-ink">R$ 18.500</p>
            <div className="absolute -right-3 -top-2 rotate-[8deg]">
              <svg width="72" height="72" viewBox="0 0 92 92" aria-hidden="true">
                <circle cx="46" cy="46" r="38" fill="#7c2430" />
                <path
                  d="M33 47.2l8.4 8.6 17.2-18"
                  fill="none"
                  stroke="#f8f1e8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <ol className="mt-8 space-y-2 text-sm text-ink-muted">
            <li>1. Nexo publica PropostaEnviada</li>
            <li>2. Cliente abre /p/token e aceita</li>
            <li>3. Handoff para o VendaCore</li>
          </ol>
        </div>
      </aside>

      <section className="flex items-center justify-center bg-surface px-4 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-5">
          <div className="lg:hidden">
            <BrandMark size={36} />
          </div>
          <div>
            <h2 className="font-serif text-3xl font-medium text-ink">Entrar no Visto</h2>
            <p className="mt-1.5 text-sm text-ink-muted">Escolha um crachá. A senha já vem preenchida.</p>
          </div>
          <label className="block text-sm font-medium text-ink-muted">
            E-mail
            <input
              className="field"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-ink-muted">
            Senha
            <input
              type="password"
              className="field"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-seal">{error}</p>}
          <button type="submit" disabled={busy} className="btn-seal w-full py-3">
            {busy ? 'Abrindo a caixa…' : 'Entrar'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            {PERSONAS.map((persona) => (
              <button
                key={persona.email}
                type="button"
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  email === persona.email
                    ? 'border-seal/30 bg-seal-soft text-seal'
                    : 'border-line bg-white text-ink hover:border-seal/20'
                }`}
                onClick={() => setEmail(persona.email)}
              >
                <span className="block text-sm font-medium">{persona.label}</span>
                <span className="text-[11px] opacity-70">{persona.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-ink-faint">senha: password123</p>
        </form>
      </section>
    </div>
  )
}
