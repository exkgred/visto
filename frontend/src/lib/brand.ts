import type { EventType, ProposalStatus, UserRole } from './types'

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SELLER: 'Vendedora',
}

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviada',
  VIEWED: 'Vista',
  ACCEPTED: 'Aceita',
  DECLINED: 'Recusada',
  EXPIRED: 'Expirada',
}

export const STATUS_ORDER: ProposalStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED']

export const STATUS_TONE: Record<ProposalStatus, string> = {
  DRAFT: 'border-divider bg-canvas text-ink-muted',
  SENT: 'border-seal/20 bg-seal-soft text-seal',
  VIEWED: 'border-amber-200 bg-amber-50 text-amber-900',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  DECLINED: 'border-rose-200 bg-rose-50 text-rose-900',
  EXPIRED: 'border-stone-200 bg-stone-100 text-stone-600',
}

export const EVENT_LABEL: Record<EventType, string> = {
  PropostaCriada: 'Proposta criada',
  PropostaEnviada: 'Proposta enviada',
  PropostaVista: 'Cliente abriu',
  PropostaAceita: 'Aceite → VendaCore',
  PropostaRecusada: 'Recusada',
}

export const APP_LABEL: Record<string, string> = {
  visto: 'Visto',
  nexo: 'Nexo',
  vendacore: 'VendaCore',
}

export function money(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

export function timeAgo(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(1, Math.round(delta / 60_000))
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return `há ${days} d`
}

export function proposalTotal(items: Array<{ amount: number }>): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
