import type { AxiosAdapter } from 'axios'
import { buildCanonicalPayload, hashCanonical } from './hash'
import type {
  DashboardKpis,
  DomainEvent,
  Envelope,
  EventType,
  Proposal,
  ProposalItem,
  ProposalStatus,
  PublicUser,
} from './types'

const STORAGE_KEY = 'visto-demo-v1'
const NORTE_UNTIL = '2026-12-01T00:00:00.000Z'

interface DemoUser extends PublicUser {
  password: string
}

interface DemoState {
  users: DemoUser[]
  proposals: Proposal[]
  events: DomainEvent[]
  currentUserId: string | null
  seq: number
}

const nowIso = () => new Date().toISOString()
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

function item(proposalId: string, description: string, unitPrice: number, quantity = 1): ProposalItem {
  return {
    id: uid('item'),
    proposalId,
    description,
    quantity,
    unitPrice,
    amount: quantity * unitPrice,
  }
}

function seed(): DemoState {
  const users: DemoUser[] = [
    { id: 'user-admin', name: 'Admin Visto', email: 'admin@visto.dev', role: 'ADMIN', password: 'password123' },
    { id: 'user-marina', name: 'Marina Comercial', email: 'marina@visto.dev', role: 'SELLER', password: 'password123' },
  ]

  const acmeUntil = daysFromNow(12)
  const acmeItems = [item('prop-sent', 'ERP + assistência', 18500)]
  const norteItems = [item('prop-accepted', 'VendaCore anual', 42000)]
  const draftItems = [item('prop-draft', 'Assistência na forja', 2800)]

  const proposals: Proposal[] = [
    {
      id: 'prop-draft',
      number: 'VST-0001',
      clientName: 'Oficina Brasa',
      clientEmail: 'forja@brasa.test',
      message: 'Rascunho da assistência na forja.',
      status: 'DRAFT',
      validUntil: daysFromNow(20),
      publicToken: null,
      contentHash: null,
      viewedAt: null,
      viewCount: 0,
      acceptedAt: null,
      declinedAt: null,
      declineReason: null,
      ownerId: 'user-marina',
      sourceApp: 'visto',
      sourceOpportunityId: null,
      correlationId: null,
      snapshot: null,
      createdAt: hoursAgo(4),
      updatedAt: hoursAgo(1),
      items: draftItems,
    },
    {
      id: 'prop-sent',
      number: 'VST-0002',
      clientName: 'ACME Ltda',
      clientEmail: 'carla@acme.test',
      message: 'Proposta do funil Nexo. Abra o lacre quando estiver pronta.',
      status: 'SENT',
      validUntil: acmeUntil,
      publicToken: 'demo-sent-acme',
      contentHash: null,
      viewedAt: null,
      viewCount: 0,
      acceptedAt: null,
      declinedAt: null,
      declineReason: null,
      ownerId: 'user-marina',
      sourceApp: 'nexo',
      sourceOpportunityId: 'opp-acme',
      correlationId: 'lead-carla',
      snapshot: buildCanonicalPayload({
        number: 'VST-0002',
        clientName: 'ACME Ltda',
        clientEmail: 'carla@acme.test',
        items: acmeItems,
        validUntil: acmeUntil,
      }),
      createdAt: hoursAgo(30),
      updatedAt: hoursAgo(6),
      items: acmeItems,
    },
    {
      id: 'prop-accepted',
      number: 'VST-0003',
      clientName: 'Loja Norte',
      clientEmail: 'compras@lojanorte.test',
      message: 'Aceita. Handoff pronto para o VendaCore.',
      status: 'ACCEPTED',
      validUntil: NORTE_UNTIL,
      publicToken: 'demo-accepted-norte',
      contentHash: 'ea0a5e3a9892409f81042a2a668a08ccc7130036e551a6eaba3768c5a1ee5856',
      viewedAt: hoursAgo(10),
      viewCount: 3,
      acceptedAt: hoursAgo(8),
      declinedAt: null,
      declineReason: null,
      ownerId: 'user-marina',
      sourceApp: 'visto',
      sourceOpportunityId: null,
      correlationId: 'prop-accepted',
      snapshot: buildCanonicalPayload({
        number: 'VST-0003',
        clientName: 'Loja Norte',
        clientEmail: 'compras@lojanorte.test',
        items: norteItems,
        validUntil: NORTE_UNTIL,
      }),
      createdAt: hoursAgo(90),
      updatedAt: hoursAgo(8),
      items: norteItems,
    },
  ]

  const events: DomainEvent[] = [
    event('PropostaCriada', 'visto', 'prop-draft', 'prop-draft', hoursAgo(4), { number: 'VST-0001', total: 2800 }),
    event('PropostaEnviada', 'nexo', 'prop-sent', 'lead-carla', hoursAgo(6), {
      number: 'VST-0002',
      amount: 18500,
      token: 'demo-sent-acme',
    }),
    event('PropostaAceita', 'visto', 'prop-accepted', 'prop-accepted', hoursAgo(8), {
      number: 'VST-0003',
      amount: 42000,
      handoff: { system: 'vendacore', action: 'criarClienteEOrcamento' },
    }),
  ]

  return { users, proposals, events, currentUserId: null, seq: 3 }
}

function event(
  type: EventType,
  sourceApp: string,
  aggregateId: string,
  correlationId: string,
  occurredAt: string,
  payload: Record<string, unknown>,
): DomainEvent {
  return {
    id: uid('evt'),
    type,
    sourceApp,
    aggregateType: 'proposal',
    aggregateId,
    correlationId,
    idempotencyKey: `${type}-${aggregateId}-${occurredAt}`,
    payload,
    status: sourceApp === 'visto' ? 'PUBLISHED' : 'PROCESSED',
    occurredAt,
    publishedAt: sourceApp === 'visto' ? occurredAt : null,
  }
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DemoState
  } catch {
    /* seed */
  }
  const state = seed()
  save(state)
  return state
}

function save(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function ok<T>(data: T): Envelope<T> {
  return { success: true, data, meta: { timestamp: nowIso() } }
}

function fail(status: number, message: string, code: string) {
  const error = Object.assign(new Error(message), {
    response: {
      status,
      data: {
        success: false,
        error: { code, message },
        meta: { timestamp: nowIso() },
      },
    },
  })
  return Promise.reject(error)
}

function publicUser(user: DemoUser): PublicUser {
  const { password: _password, ...rest } = user
  return rest
}

function publish(
  state: DemoState,
  partial: Omit<DomainEvent, 'id' | 'status' | 'occurredAt' | 'publishedAt' | 'idempotencyKey'> & {
    idempotencyKey?: string
  },
): DomainEvent {
  const stored: DomainEvent = {
    ...partial,
    id: uid('evt'),
    idempotencyKey: partial.idempotencyKey ?? uid('key'),
    status: 'PUBLISHED',
    occurredAt: nowIso(),
    publishedAt: nowIso(),
  }
  state.events.unshift(stored)
  return stored
}

function totalOf(proposal: Proposal): number {
  return proposal.items.reduce((sum, row) => sum + row.amount, 0)
}

function effectiveStatus(proposal: Proposal): ProposalStatus {
  if (
    (proposal.status === 'SENT' || proposal.status === 'VIEWED') &&
    new Date(proposal.validUntil).getTime() < Date.now()
  ) {
    return 'EXPIRED'
  }
  return proposal.status
}

function expire(proposal: Proposal): Proposal {
  const status = effectiveStatus(proposal)
  if (status === 'EXPIRED' && proposal.status !== 'EXPIRED') {
    proposal.status = 'EXPIRED'
    proposal.updatedAt = nowIso()
  }
  return proposal
}

function dashboardOf(state: DemoState): DashboardKpis {
  const byStatus: DashboardKpis['byStatus'] = {}
  for (const proposal of state.proposals) {
    const status = effectiveStatus(proposal)
    const bucket = byStatus[status] ?? { count: 0, amount: 0 }
    bucket.count += 1
    bucket.amount += totalOf(proposal)
    byStatus[status] = bucket
  }
  return {
    byStatus,
    pendingAmount: (byStatus.SENT?.amount ?? 0) + (byStatus.VIEWED?.amount ?? 0),
    acceptedAmount: byStatus.ACCEPTED?.amount ?? 0,
    acceptedCount: byStatus.ACCEPTED?.count ?? 0,
    recentEvents: state.events.slice(0, 12),
  }
}

function nextNumber(state: DemoState): string {
  state.seq += 1
  return `VST-${String(state.seq).padStart(4, '0')}`
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export const demoAdapter: AxiosAdapter = async (config) => {
  const state = load()
  const method = (config.method ?? 'get').toLowerCase()
  const url = (config.url ?? '').replace(config.baseURL ?? '', '')
  const [path, queryString] = url.split('?')
  const params = new URLSearchParams(queryString ?? '')
  const tokenHeader = config.headers.Authorization
  const token =
    typeof tokenHeader === 'string' && tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7) : null
  if (token) {
    const owner = state.users.find((user) => user.id === token)
    if (owner) state.currentUserId = owner.id
  }
  const json = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}
  const respond = (payload: unknown, status = 200) => ({
    data: payload,
    status,
    statusText: 'OK',
    headers: {},
    config,
  })

  if (method === 'get' && path.endsWith('/health')) {
    return respond(ok({ status: 'ok' }))
  }

  if (method === 'post' && path.endsWith('/auth/login')) {
    const user = state.users.find((item) => item.email === json.email && item.password === json.password)
    if (!user) return fail(401, 'Credenciais inválidas', 'UNAUTHORIZED')
    state.currentUserId = user.id
    save(state)
    return respond(
      ok({ user: publicUser(user), tokens: { accessToken: user.id, refreshToken: `refresh-${user.id}` } }),
    )
  }

  if (method === 'post' && path.endsWith('/auth/refresh')) {
    const userId = String(json.refreshToken ?? '').replace('refresh-', '')
    const user = state.users.find((item) => item.id === userId)
    if (!user) return fail(401, 'Refresh token inválido', 'UNAUTHORIZED')
    return respond(ok({ accessToken: user.id, refreshToken: `refresh-${user.id}` }))
  }

  if (method === 'post' && path.endsWith('/auth/logout')) {
    state.currentUserId = null
    save(state)
    return respond(ok({ ok: true }))
  }

  const publicMatch = path.match(/\/p\/([^/]+)(?:\/(accept|decline))?$/)
  if (publicMatch) {
    const proposal = state.proposals.find((item) => item.publicToken === publicMatch[1])
    if (!proposal) return fail(404, 'Proposal not found', 'RESOURCE_NOT_FOUND')
    expire(proposal)
    const action = publicMatch[2]

    if (method === 'get' && !action) {
      if (proposal.status === 'DRAFT') return fail(404, 'Proposal not found', 'RESOURCE_NOT_FOUND')
      if (proposal.status === 'SENT' || proposal.status === 'VIEWED') {
        const first = proposal.status === 'SENT'
        proposal.status = 'VIEWED'
        proposal.viewedAt = proposal.viewedAt ?? nowIso()
        proposal.viewCount += 1
        proposal.updatedAt = nowIso()
        if (first) {
          publish(state, {
            type: 'PropostaVista',
            sourceApp: 'visto',
            aggregateType: 'proposal',
            aggregateId: proposal.id,
            correlationId: proposal.correlationId ?? proposal.id,
            payload: { viewCount: proposal.viewCount },
            idempotencyKey: `proposta-vista-${proposal.id}`,
          })
        }
        save(state)
      }
      return respond(ok(proposal))
    }

    if (method === 'post' && (action === 'accept' || action === 'decline')) {
      if (proposal.status === 'ACCEPTED') return fail(422, 'Esta proposta já foi aceita', 'BUSINESS_RULE_VIOLATION')
      if (proposal.status === 'DECLINED') return fail(422, 'Esta proposta já foi recusada', 'BUSINESS_RULE_VIOLATION')
      if (proposal.status === 'EXPIRED') return fail(422, 'Esta proposta expirou', 'BUSINESS_RULE_VIOLATION')
      if (proposal.status !== 'SENT' && proposal.status !== 'VIEWED') {
        return fail(422, 'Esta proposta não pode ser decidida', 'BUSINESS_RULE_VIOLATION')
      }
      if (action === 'accept') {
        const canonical = buildCanonicalPayload({
          number: proposal.number,
          clientName: proposal.clientName,
          clientEmail: proposal.clientEmail,
          items: proposal.items,
          validUntil: proposal.validUntil,
        })
        const contentHash = await hashCanonical(canonical)
        proposal.status = 'ACCEPTED'
        proposal.contentHash = contentHash
        proposal.acceptedAt = nowIso()
        proposal.snapshot = canonical
        proposal.updatedAt = nowIso()
        publish(state, {
          type: 'PropostaAceita',
          sourceApp: 'visto',
          aggregateType: 'proposal',
          aggregateId: proposal.id,
          correlationId: proposal.correlationId ?? proposal.id,
          payload: {
            number: proposal.number,
            amount: canonical.total,
            contentHash,
            handoff: { system: 'vendacore', action: 'criarClienteEOrcamento' },
          },
          idempotencyKey: `proposta-aceita-${proposal.id}`,
        })
      } else {
        proposal.status = 'DECLINED'
        proposal.declinedAt = nowIso()
        proposal.declineReason = stringValue(json.reason) ?? null
        proposal.updatedAt = nowIso()
        publish(state, {
          type: 'PropostaRecusada',
          sourceApp: 'visto',
          aggregateType: 'proposal',
          aggregateId: proposal.id,
          correlationId: proposal.correlationId ?? proposal.id,
          payload: { reason: proposal.declineReason },
          idempotencyKey: `proposta-recusada-${proposal.id}`,
        })
      }
      save(state)
      return respond(ok(proposal))
    }
  }

  if (method === 'post' && path.endsWith('/events/ingest')) {
    const existing = state.events.find((item) => item.idempotencyKey === json.idempotencyKey)
    if (existing) return respond(ok(existing))
    const ingest: DomainEvent = {
      id: uid('evt'),
      type: json.type,
      sourceApp: json.sourceApp,
      aggregateType: json.aggregateType ?? 'proposal',
      aggregateId: json.aggregateId ?? uid('agg'),
      correlationId: json.correlationId ?? uid('corr'),
      idempotencyKey: json.idempotencyKey ?? uid('key'),
      payload: json.payload ?? {},
      status: 'PROCESSED',
      occurredAt: nowIso(),
      publishedAt: null,
    }
    state.events.unshift(ingest)
    if (json.type === 'PropostaEnviada') {
      const payload = (json.payload ?? {}) as Record<string, unknown>
      const number = nextNumber(state)
      const validUntil = stringValue(payload.validUntil) ?? daysFromNow(7)
      const rawItems = Array.isArray(payload.items) ? payload.items : null
      const itemsSource = rawItems?.length
        ? rawItems.map((raw) => {
            const row = (raw ?? {}) as Record<string, unknown>
            return {
              description: stringValue(row.description) ?? 'Item',
              quantity: numberValue(row.quantity) ?? 1,
              unitPrice: numberValue(row.unitPrice) ?? numberValue(row.amount) ?? 0,
            }
          })
        : [
            {
              description: stringValue(payload.title) ?? 'Proposta Nexo',
              quantity: 1,
              unitPrice: numberValue(payload.amount) ?? 0,
            },
          ]
      const proposalId = uid('prop')
      const items = itemsSource.map((row) => item(proposalId, row.description, row.unitPrice, row.quantity))
      const clientName = stringValue(payload.clientName) ?? stringValue(payload.name) ?? 'Cliente'
      const clientEmail = stringValue(payload.clientEmail) ?? stringValue(payload.email) ?? 'cliente@nexo.dev'
      const created: Proposal = {
        id: proposalId,
        number,
        clientName,
        clientEmail,
        message: stringValue(payload.message) ?? 'Enviada pelo Nexo',
        status: 'SENT',
        validUntil,
        publicToken: stringValue(payload.token) ?? uid('tok'),
        contentHash: null,
        viewedAt: null,
        viewCount: 0,
        acceptedAt: null,
        declinedAt: null,
        declineReason: null,
        ownerId: state.currentUserId ?? 'user-marina',
        sourceApp: json.sourceApp || 'nexo',
        sourceOpportunityId: ingest.aggregateId,
        correlationId: ingest.correlationId,
        snapshot: buildCanonicalPayload({
          number,
          clientName,
          clientEmail,
          items,
          validUntil,
        }),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        items,
      }
      state.proposals.unshift(created)
    }
    save(state)
    return respond(ok(ingest))
  }

  const actor = state.users.find((user) => user.id === state.currentUserId)
  if (!actor) return fail(401, 'Unauthorized', 'UNAUTHORIZED')

  if (method === 'get' && path.endsWith('/auth/me')) {
    return respond(ok(publicUser(actor)))
  }

  if (method === 'get' && path.endsWith('/dashboard')) {
    return respond(ok(dashboardOf(state)))
  }

  if (method === 'get' && path.endsWith('/proposals')) {
    const status = params.get('status')
    const items = state.proposals
      .map((proposal) => ({ ...proposal, status: effectiveStatus(proposal) }))
      .filter((proposal) => !status || proposal.status === status)
    return respond(ok(items))
  }

  if (method === 'post' && path.endsWith('/proposals')) {
    const rows = (json.items ?? []) as Array<{ description: string; quantity: number; unitPrice: number }>
    if (!rows.length) return fail(400, 'A proposta precisa de ao menos um item', 'VALIDATION_ERROR')
    if (new Date(json.validUntil).getTime() <= Date.now()) {
      return fail(400, 'A validade precisa ser uma data futura', 'VALIDATION_ERROR')
    }
    const proposalId = uid('prop')
    const number = nextNumber(state)
    const created: Proposal = {
      id: proposalId,
      number,
      clientName: json.clientName,
      clientEmail: String(json.clientEmail).toLowerCase(),
      message: json.message ?? null,
      status: 'DRAFT',
      validUntil: json.validUntil,
      publicToken: null,
      contentHash: null,
      viewedAt: null,
      viewCount: 0,
      acceptedAt: null,
      declinedAt: null,
      declineReason: null,
      ownerId: actor.id,
      sourceApp: 'visto',
      sourceOpportunityId: null,
      correlationId: null,
      snapshot: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      items: rows.map((row) => item(proposalId, row.description, row.unitPrice, row.quantity)),
    }
    state.proposals.unshift(created)
    publish(state, {
      type: 'PropostaCriada',
      sourceApp: 'visto',
      aggregateType: 'proposal',
      aggregateId: created.id,
      correlationId: created.id,
      payload: { number: created.number, total: totalOf(created), actorId: actor.id },
      idempotencyKey: `proposta-criada-${created.id}`,
    })
    save(state)
    return respond(ok(created))
  }

  const sendMatch = path.match(/\/proposals\/([^/]+)\/send$/)
  if (method === 'post' && sendMatch) {
    const proposal = state.proposals.find((item) => item.id === sendMatch[1])
    if (!proposal) return fail(404, 'Proposal not found', 'RESOURCE_NOT_FOUND')
    if (proposal.status !== 'DRAFT') return fail(422, 'Só o rascunho pode ser enviado', 'BUSINESS_RULE_VIOLATION')
    if (!proposal.items.length) return fail(400, 'A proposta precisa de ao menos um item', 'VALIDATION_ERROR')
    if (new Date(proposal.validUntil).getTime() <= Date.now()) {
      return fail(422, 'A validade precisa ser uma data futura', 'BUSINESS_RULE_VIOLATION')
    }
    const snapshot = buildCanonicalPayload({
      number: proposal.number,
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      items: proposal.items,
      validUntil: proposal.validUntil,
    })
    const publicToken = uid('tok')
    proposal.status = 'SENT'
    proposal.publicToken = publicToken
    proposal.snapshot = snapshot
    proposal.updatedAt = nowIso()
    publish(state, {
      type: 'PropostaEnviada',
      sourceApp: 'visto',
      aggregateType: 'proposal',
      aggregateId: proposal.id,
      correlationId: proposal.correlationId ?? proposal.id,
      payload: { number: proposal.number, amount: snapshot.total, token: publicToken, actorId: actor.id },
      idempotencyKey: `proposta-enviada-${proposal.id}`,
    })
    save(state)
    return respond(ok(proposal))
  }

  const detailMatch = path.match(/\/proposals\/([^/]+)$/)
  if (method === 'get' && detailMatch) {
    const proposal = state.proposals.find((item) => item.id === detailMatch[1])
    if (!proposal) return fail(404, 'Proposal not found', 'RESOURCE_NOT_FOUND')
    expire(proposal)
    save(state)
    const timeline = state.events.filter((item) => item.aggregateId === proposal.id)
    return respond(ok({ proposal, timeline }))
  }

  if (method === 'get' && path.endsWith('/events')) {
    const type = params.get('type')
    const sourceApp = params.get('sourceApp')
    const items = state.events.filter((item) => {
      if (type && item.type !== type) return false
      if (sourceApp && item.sourceApp !== sourceApp) return false
      return true
    })
    return respond(ok(items))
  }

  return fail(404, `Rota demo não mapeada: ${method.toUpperCase()} ${path}`, 'RESOURCE_NOT_FOUND')
}
