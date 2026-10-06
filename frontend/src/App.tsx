import { useEffect } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { FileStack, LogOut, Plus } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { NewProposalModal } from '@/components/NewProposalModal'
import { initials, ROLE_LABEL } from '@/lib/brand'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import LoginPage from '@/pages/LoginPage'
import InboxPage from '@/pages/InboxPage'
import ProposalDetailPage from '@/pages/ProposalDetailPage'
import PublicProposalPage from '@/pages/PublicProposalPage'

function OpenNewProposal() {
  const openNewProposal = useUiStore((s) => s.openNewProposal)
  useEffect(() => {
    openNewProposal()
  }, [openNewProposal])
  return <Navigate to="/" replace />
}

function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const newProposalOpen = useUiStore((s) => s.newProposalOpen)
  const openNewProposal = useUiStore((s) => s.openNewProposal)
  const closeNewProposal = useUiStore((s) => s.closeNewProposal)

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-divider/80 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex shrink-0 items-center text-ink">
            <BrandMark size={32} />
          </NavLink>
          <nav className="hidden items-center gap-1 text-sm text-ink-muted md:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 ${isActive && !newProposalOpen ? 'bg-seal-soft text-seal' : 'hover:bg-canvas hover:text-ink'}`
              }
            >
              Caixa
            </NavLink>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 ${newProposalOpen ? 'bg-seal-soft text-seal' : 'hover:bg-canvas hover:text-ink'}`}
              onClick={openNewProposal}
            >
              Nova
            </button>
            {user && (
              <div className="ml-3 flex items-center gap-2 rounded-full border border-divider bg-white py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-seal text-[11px] font-semibold text-white">
                  {initials(user.name)}
                </span>
                <span className="hidden text-ink lg:inline">{user.name.split(' ')[0]}</span>
                <span className="rounded-full bg-seal-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-seal">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            )}
            <button
              type="button"
              className="ml-1 rounded-lg px-3 py-2 hover:bg-canvas hover:text-ink"
              onClick={() => {
                closeNewProposal()
                logout()
                navigate('/')
              }}
            >
              Sair
            </button>
          </nav>
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-sm md:hidden"
            onClick={() => {
              closeNewProposal()
              logout()
              navigate('/')
            }}
          >
            <span className="inline-flex items-center gap-2">
              <LogOut size={14} /> Sair
            </span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] ${isActive && !newProposalOpen ? 'text-seal' : 'text-ink-muted'}`
            }
          >
            <FileStack size={18} />
            Caixa
          </NavLink>
          <button
            type="button"
            className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] ${newProposalOpen ? 'text-seal' : 'text-ink-muted'}`}
            onClick={openNewProposal}
          >
            <Plus size={18} />
            Nova
          </button>
        </div>
      </nav>
      <NewProposalModal />
    </div>
  )
}

function Private({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <LoginPage />
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
      <Route path="/propostas/nova" element={<Private><OpenNewProposal /></Private>} />
      <Route path="/propostas/:id" element={<Private><ProposalDetailPage /></Private>} />
    </Routes>
  )
}
