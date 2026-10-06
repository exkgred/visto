import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { isDemo } from './demo-mode'
import { demoAdapter } from './mock-adapter'
import type { Envelope } from './types'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  ...(isDemo ? { adapter: demoAdapter } : {}),
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['x-ingest-secret'] =
    import.meta.env.VITE_INGEST_SECRET ?? 'visto-ingest-dev'
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!isDemo && axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

export function unwrap<T>(payload: Envelope<T>): T {
  if (!payload.success) {
    throw new Error(payload.error?.message ?? 'Erro na API')
  }
  return payload.data
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Envelope<unknown> | undefined
    return data?.error?.message ?? error.message
  }
  if (error instanceof Error) return error.message
  return 'Erro inesperado'
}
