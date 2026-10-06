import { randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '../../../domain/entities/domain-event.entity';
import type { Proposal } from '../../../domain/entities/proposal.entity';
import { proposalTotal } from '../../../domain/entities/proposal.entity';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '../../../domain/errors/domain-error';
import { EVENT_BUS, type EventBus } from '../../../domain/ports/event-bus';
import {
  buildCanonicalPayload,
  hashCanonical,
  type CanonicalProposal,
} from '../../../domain/ports/proposal-hash';
import {
  effectiveStatus,
  isOpenForDecision,
} from '../../../domain/ports/proposal-status';
import {
  EVENT_REPOSITORY,
  type EventRepository,
} from '../../../domain/repositories/event.repository';
import {
  PROPOSAL_REPOSITORY,
  type NewProposalItem,
  type ProposalRepository,
} from '../../../domain/repositories/proposal.repository';

export function opaqueToken(): string {
  return randomBytes(24).toString('hex');
}

function canonicalOf(proposal: Proposal): CanonicalProposal {
  const source =
    proposal.snapshot && isCanonical(proposal.snapshot)
      ? proposal.snapshot
      : buildCanonicalPayload({
          number: proposal.number,
          clientName: proposal.clientName,
          clientEmail: proposal.clientEmail,
          items: proposal.items,
          validUntil: proposal.validUntil,
        });
  return source;
}

function isCanonical(
  value: Record<string, unknown>,
): value is CanonicalProposal {
  return (
    typeof value.number === 'string' &&
    typeof value.clientName === 'string' &&
    typeof value.clientEmail === 'string' &&
    typeof value.total === 'number' &&
    typeof value.validUntil === 'string' &&
    Array.isArray(value.items)
  );
}

function requireItems(items: NewProposalItem[]): void {
  if (items.length === 0) {
    throw new ValidationError('A proposta precisa de ao menos um item');
  }
  for (const item of items) {
    if (!item.description.trim()) {
      throw new ValidationError('Descrição do item é obrigatória');
    }
    if (item.quantity <= 0 || item.unitPrice < 0) {
      throw new ValidationError('Quantidade e preço devem ser válidos');
    }
  }
}

async function expireIfNeeded(
  repo: ProposalRepository,
  proposal: Proposal,
  now: Date,
): Promise<Proposal> {
  if (
    effectiveStatus(proposal, now) !== 'EXPIRED' ||
    proposal.status === 'EXPIRED'
  ) {
    return proposal;
  }
  return repo.update(proposal.id, { status: 'EXPIRED' });
}

@Injectable()
export class CreateProposalUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
    @Inject(EVENT_BUS)
    private readonly bus: EventBus,
  ) {}

  async execute(input: {
    clientName: string;
    clientEmail: string;
    message?: string;
    validUntil: Date;
    items: NewProposalItem[];
    ownerId: string;
  }): Promise<Proposal> {
    requireItems(input.items);
    if (input.validUntil.getTime() <= Date.now()) {
      throw new ValidationError('A validade precisa ser uma data futura');
    }
    const number = await this.proposals.nextNumber();
    const created = await this.proposals.create({
      number,
      clientName: input.clientName.trim(),
      clientEmail: input.clientEmail.trim().toLowerCase(),
      message: input.message?.trim() || null,
      validUntil: input.validUntil,
      ownerId: input.ownerId,
      items: input.items,
    });
    await this.bus.publish({
      type: 'PropostaCriada',
      sourceApp: 'visto',
      aggregateType: 'proposal',
      aggregateId: created.id,
      correlationId: created.id,
      idempotencyKey: `proposta-criada-${created.id}`,
      payload: {
        number: created.number,
        total: proposalTotal(created.items),
        actorId: input.ownerId,
      },
    });
    return created;
  }
}

@Injectable()
export class ListProposalsUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
  ) {}

  async execute(filters?: {
    status?: Proposal['status'];
    ownerId?: string;
  }): Promise<Proposal[]> {
    const now = new Date();
    const items = await this.proposals.list(filters);
    return items.map((item) => ({
      ...item,
      status: effectiveStatus(item, now),
    }));
  }
}

@Injectable()
export class GetProposalUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly events: EventRepository,
  ) {}

  async execute(input: { proposalId: string }): Promise<{
    proposal: Proposal;
    timeline: DomainEvent[];
  }> {
    const found = await this.proposals.findById(input.proposalId);
    if (!found) {
      throw new NotFoundError('Proposal');
    }
    const proposal = await expireIfNeeded(this.proposals, found, new Date());
    const timeline = await this.events.list({ aggregateId: proposal.id });
    return { proposal, timeline };
  }
}

@Injectable()
export class SendProposalUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
    @Inject(EVENT_BUS)
    private readonly bus: EventBus,
  ) {}

  async execute(input: {
    proposalId: string;
    actorId: string;
    publicAppUrl?: string;
  }): Promise<Proposal> {
    const current = await this.proposals.findById(input.proposalId);
    if (!current) {
      throw new NotFoundError('Proposal');
    }
    if (current.status !== 'DRAFT') {
      throw new BusinessRuleError('Só o rascunho pode ser enviado');
    }
    requireItems(current.items);
    const now = new Date();
    if (current.validUntil.getTime() <= now.getTime()) {
      throw new BusinessRuleError('A validade precisa ser uma data futura');
    }
    const snapshot = buildCanonicalPayload(current);
    const token = opaqueToken();
    const sent = await this.proposals.update(current.id, {
      status: 'SENT',
      publicToken: token,
      snapshot,
    });
    await this.bus.publish({
      type: 'PropostaEnviada',
      sourceApp: 'visto',
      aggregateType: 'proposal',
      aggregateId: sent.id,
      correlationId: sent.correlationId ?? sent.id,
      idempotencyKey: `proposta-enviada-${sent.id}`,
      payload: {
        number: sent.number,
        amount: snapshot.total,
        token,
        publicUrl: input.publicAppUrl
          ? `${input.publicAppUrl.replace(/\/$/, '')}/p/${token}`
          : `/p/${token}`,
        actorId: input.actorId,
      },
    });
    return sent;
  }
}

@Injectable()
export class ViewPublicProposalUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
    @Inject(EVENT_BUS)
    private readonly bus: EventBus,
  ) {}

  async execute(input: { token: string }): Promise<Proposal> {
    const found = await this.proposals.findByToken(input.token);
    if (!found) {
      throw new NotFoundError('Proposal');
    }
    const now = new Date();
    const expired = await expireIfNeeded(this.proposals, found, now);
    if (expired.status === 'EXPIRED') {
      return expired;
    }
    if (expired.status === 'DRAFT') {
      throw new NotFoundError('Proposal');
    }
    if (!isOpenForDecision(expired.status)) {
      return expired;
    }
    const firstView = expired.status === 'SENT';
    const viewed = await this.proposals.update(expired.id, {
      status: 'VIEWED',
      viewedAt: expired.viewedAt ?? now,
      viewCount: expired.viewCount + 1,
    });
    if (firstView) {
      await this.bus.publish({
        type: 'PropostaVista',
        sourceApp: 'visto',
        aggregateType: 'proposal',
        aggregateId: viewed.id,
        correlationId: viewed.correlationId ?? viewed.id,
        idempotencyKey: `proposta-vista-${viewed.id}`,
        payload: { viewCount: viewed.viewCount },
      });
    }
    return viewed;
  }
}

@Injectable()
export class AcceptProposalUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
    @Inject(EVENT_BUS)
    private readonly bus: EventBus,
  ) {}

  async execute(input: { token: string }): Promise<Proposal> {
    const found = await this.proposals.findByToken(input.token);
    if (!found) {
      throw new NotFoundError('Proposal');
    }
    const now = new Date();
    const current = await expireIfNeeded(this.proposals, found, now);
    if (current.status === 'ACCEPTED') {
      throw new BusinessRuleError('Esta proposta já foi aceita');
    }
    if (current.status === 'DECLINED') {
      throw new BusinessRuleError('Esta proposta já foi recusada');
    }
    if (current.status === 'EXPIRED') {
      throw new BusinessRuleError('Esta proposta expirou');
    }
    if (!isOpenForDecision(current.status)) {
      throw new BusinessRuleError('Esta proposta não pode ser aceita');
    }
    const canonical = canonicalOf(current);
    const contentHash = hashCanonical(canonical);
    const accepted = await this.proposals.update(current.id, {
      status: 'ACCEPTED',
      contentHash,
      acceptedAt: now,
      snapshot: canonical,
    });
    await this.bus.publish({
      type: 'PropostaAceita',
      sourceApp: 'visto',
      aggregateType: 'proposal',
      aggregateId: accepted.id,
      correlationId: accepted.correlationId ?? accepted.id,
      idempotencyKey: `proposta-aceita-${accepted.id}`,
      payload: {
        number: accepted.number,
        amount: canonical.total,
        contentHash,
        handoff: {
          system: 'vendacore',
          action: 'criarClienteEOrcamento',
        },
      },
    });
    return accepted;
  }
}

@Injectable()
export class DeclineProposalUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
    @Inject(EVENT_BUS)
    private readonly bus: EventBus,
  ) {}

  async execute(input: { token: string; reason?: string }): Promise<Proposal> {
    const found = await this.proposals.findByToken(input.token);
    if (!found) {
      throw new NotFoundError('Proposal');
    }
    const now = new Date();
    const current = await expireIfNeeded(this.proposals, found, now);
    if (current.status === 'ACCEPTED') {
      throw new BusinessRuleError('Esta proposta já foi aceita');
    }
    if (current.status === 'DECLINED') {
      throw new BusinessRuleError('Esta proposta já foi recusada');
    }
    if (current.status === 'EXPIRED') {
      throw new BusinessRuleError('Esta proposta expirou');
    }
    if (!isOpenForDecision(current.status)) {
      throw new BusinessRuleError('Esta proposta não pode ser recusada');
    }
    const declined = await this.proposals.update(current.id, {
      status: 'DECLINED',
      declinedAt: now,
      declineReason: input.reason?.trim() || null,
    });
    await this.bus.publish({
      type: 'PropostaRecusada',
      sourceApp: 'visto',
      aggregateType: 'proposal',
      aggregateId: declined.id,
      correlationId: declined.correlationId ?? declined.id,
      idempotencyKey: `proposta-recusada-${declined.id}`,
      payload: { reason: declined.declineReason },
    });
    return declined;
  }
}

@Injectable()
export class GetDashboardUseCase {
  constructor(
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly events: EventRepository,
  ) {}

  async execute(): Promise<{
    byStatus: Record<string, { count: number; amount: number }>;
    pendingAmount: number;
    acceptedAmount: number;
    acceptedCount: number;
    recentEvents: DomainEvent[];
  }> {
    const now = new Date();
    const [items, events] = await Promise.all([
      this.proposals.list(),
      this.events.list(),
    ]);
    const byStatus: Record<string, { count: number; amount: number }> = {};
    for (const item of items) {
      const status = effectiveStatus(item, now);
      const bucket = byStatus[status] ?? { count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount += proposalTotal(item.items);
      byStatus[status] = bucket;
    }
    return {
      byStatus,
      pendingAmount:
        (byStatus.SENT?.amount ?? 0) + (byStatus.VIEWED?.amount ?? 0),
      acceptedAmount: byStatus.ACCEPTED?.amount ?? 0,
      acceptedCount: byStatus.ACCEPTED?.count ?? 0,
      recentEvents: events.slice(0, 12),
    };
  }
}
