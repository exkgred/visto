import { useEffect } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { FileStack, LogOut, Plus } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { initials, ROLE_LABEL } from '@/lib/brand'
import { useAuthStore } from '@/stores/auth'
import LoginPage from '@/pages/LoginPage'
import InboxPage from '@/pages/InboxPage'
import NewProposalPage from '@/pages/NewProposalPage'
import ProposalDetailPage from '@/pages/ProposalDetailPage'
import PublicProposalPage from '@/pages/PublicProposalPage'

const NAV = [
  { to: '/', label: 'Caixa', icon: FileStack },
  { to: '/propostas/nova', label: 'Nova', icon: Plus },
] as const

function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh pb-[4.5rem] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex shrink-0 items-center text-ink-300">
            <BrandMark size={32} />
          </NavLink>
          <nav className="hidden items-center gap-1 text-sm text-ink-500 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 ${isActive ? 'bg-accent/15 text-accent' : 'hover:bg-white/5 hover:text-ink-300'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <div className="ml-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-[11px] font-semibold text-accent">
                  {initials(user.name)}
                </span>
                <span className="hidden text-ink-300 lg:inline">{user.name.split(' ')[0]}</span>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            )}
            <button
              type="button"
              className="ml-1 rounded-md px-3 py-2 hover:bg-white/5 hover:text-ink-300"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Sair
            </button>
          </nav>
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm md:hidden"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <span className="inline-flex items-center gap-2">
              <LogOut size={14} /> Sair
            </span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 md:py-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-2 text-[11px] ${isActive ? 'text-accent' : 'text-ink-500'}`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function Private({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  useEffect(() => {
    document.title = 'Visto'
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/p/:token" element={<PublicProposalPage />} />
      <Route path="/" element={<Private><InboxPage /></Private>} />
      <Route path="/propostas/nova" element={<Private><NewProposalPage /></Private>} />
      <Route path="/propostas/:id" element={<Private><ProposalDetailPage /></Private>} />
    </Routes>
  )
}
