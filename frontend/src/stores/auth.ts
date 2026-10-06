import { create } from 'zustand'
import type { PublicUser } from '@/lib/types'

interface AuthState {
  user: PublicUser | null
  accessToken: string | null
  refreshToken: string | null
  setSession: (user: PublicUser, accessToken: string, refreshToken: string) => void
  setUser: (user: PublicUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readJson('visto.user'),
  accessToken: localStorage.getItem('visto.access'),
  refreshToken: localStorage.getItem('visto.refresh'),
  setSession: (user, accessToken, refreshToken) => {
    localStorage.setItem('visto.user', JSON.stringify(user))
    localStorage.setItem('visto.access', accessToken)
    localStorage.setItem('visto.refresh', refreshToken)
    set({ user, accessToken, refreshToken })
  },
  setUser: (user) => {
    localStorage.setItem('visto.user', JSON.stringify(user))
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('visto.user')
    localStorage.removeItem('visto.access')
    localStorage.removeItem('visto.refresh')
    set({ user: null, accessToken: null, refreshToken: null })
  },
}))

function readJson(key: string): PublicUser | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicUser
  } catch {
    return null
  }
}
