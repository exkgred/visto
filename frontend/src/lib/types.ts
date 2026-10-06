export type UserRole = 'ADMIN' | 'MANAGER' | 'SELLER'
export type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
export type EventType =
  | 'PropostaCriada'
  | 'PropostaEnviada'
  | 'PropostaVista'
  | 'PropostaAceita'
  | 'PropostaRecusada'
export type EventStatus = 'RECEIVED' | 'PROCESSED' | 'PUBLISHED' | 'FAILED'

export interface PublicUser {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt?: string
  updatedAt?: string
}

export interface ProposalItem {
  id: string
  proposalId: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface Proposal {
  id: string
  number: string
  clientName: string
  clientEmail: string
  message: string | null
  status: ProposalStatus
  validUntil: string
  publicToken: string | null
  contentHash: string | null
  viewedAt: string | null
  viewCount: number
  acceptedAt: string | null
  declinedAt: string | null
  declineReason: string | null
  ownerId: string
  sourceApp: string
  sourceOpportunityId: string | null
  correlationId: string | null
  snapshot: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  items: ProposalItem[]
}

export interface DomainEvent {
  id: string
  type: EventType
  sourceApp: string
  aggregateType: string
  aggregateId: string
  correlationId: string
  idempotencyKey: string
  payload: Record<string, unknown>
  status: EventStatus
  occurredAt: string
  publishedAt: string | null
}

export interface ProposalDetail {
  proposal: Proposal
  timeline: DomainEvent[]
}

export interface DashboardKpis {
  byStatus: Record<string, { count: number; amount: number }>
  pendingAmount: number
  acceptedAmount: number
  acceptedCount: number
  recentEvents: DomainEvent[]
}

export interface Envelope<T> {
  success: boolean
  data: T
  meta?: {
    timestamp?: string
    page?: number
    perPage?: number
    total?: number
    lastPage?: number
  }
  error?: { code: string; message: string }
}
