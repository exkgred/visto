import { randomUUID } from 'crypto';
import type {
  DomainEvent,
  NewDomainEvent,
} from '../../../domain/entities/domain-event.entity';
import type { Proposal } from '../../../domain/entities/proposal.entity';
import { OutboxEventBus } from '../../../infrastructure/events/outbox-event-bus';
import type { EventRepository } from '../../../domain/repositories/event.repository';
import type {
  CreateProposalData,
  ProposalRepository,
} from '../../../domain/repositories/proposal.repository';

const now = () => new Date();

function withAmounts(data: CreateProposalData): Proposal['items'] {
  return data.items.map((item) => ({
    id: randomUUID(),
    proposalId: '',
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
  }));
}

export class InMemoryProposalRepository implements ProposalRepository {
  constructor(public items: Proposal[] = []) {}

  async nextNumber(): Promise<string> {
    const seq = this.items.length + 1;
    return `VST-${String(seq).padStart(4, '0')}`;
  }

  async findById(id: string): Promise<Proposal | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findByToken(token: string): Promise<Proposal | null> {
    return this.items.find((item) => item.publicToken === token) ?? null;
  }

  async list(filters?: {
    status?: Proposal['status'];
    ownerId?: string;
  }): Promise<Proposal[]> {
    return this.items.filter((item) => {
      if (filters?.status && item.status !== filters.status) return false;
      if (filters?.ownerId && item.ownerId !== filters.ownerId) return false;
      return true;
    });
  }

  async create(data: CreateProposalData): Promise<Proposal> {
    const id = randomUUID();
    const items = withAmounts(data).map((item) => ({
      ...item,
      proposalId: id,
    }));
    const proposal: Proposal = {
      id,
      number: data.number ?? (await this.nextNumber()),
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      message: data.message ?? null,
      status: data.status ?? 'DRAFT',
      validUntil: data.validUntil,
      publicToken: data.publicToken ?? null,
      contentHash: data.contentHash ?? null,
      viewedAt: data.viewedAt ?? null,
      viewCount: data.viewCount ?? 0,
      acceptedAt: data.acceptedAt ?? null,
      declinedAt: data.declinedAt ?? null,
      declineReason: data.declineReason ?? null,
      ownerId: data.ownerId,
      sourceApp: data.sourceApp ?? 'visto',
      sourceOpportunityId: data.sourceOpportunityId ?? null,
      correlationId: data.correlationId ?? null,
      snapshot: data.snapshot ?? null,
      createdAt: now(),
      updatedAt: now(),
      items,
    };
    this.items.unshift(proposal);
    return proposal;
  }

  async update(
    id: string,
    data: Partial<Omit<Proposal, 'id' | 'createdAt'>>,
  ): Promise<Proposal> {
    const index = this.items.findIndex((item) => item.id === id);
    const current = this.items[index];
    const updated: Proposal = {
      ...current,
      ...data,
      id: current.id,
      items: data.items ?? current.items,
      updatedAt: now(),
    };
    this.items[index] = updated;
    return updated;
  }
}

export class InMemoryEventRepository implements EventRepository {
  constructor(public items: DomainEvent[] = []) {}

  async append(event: NewDomainEvent): Promise<DomainEvent> {
    const stored: DomainEvent = {
      ...event,
      id: randomUUID(),
      status: 'RECEIVED',
      occurredAt: event.occurredAt ?? now(),
      publishedAt: null,
    };
    this.items.unshift(stored);
    return stored;
  }

  async findByIdempotencyKey(key: string): Promise<DomainEvent | null> {
    return this.items.find((item) => item.idempotencyKey === key) ?? null;
  }

  async list(filters?: {
    type?: DomainEvent['type'];
    sourceApp?: string;
    aggregateId?: string;
    correlationId?: string;
  }): Promise<DomainEvent[]> {
    return this.items.filter((item) => {
      if (filters?.type && item.type !== filters.type) return false;
      if (filters?.sourceApp && item.sourceApp !== filters.sourceApp)
        return false;
      if (filters?.aggregateId && item.aggregateId !== filters.aggregateId)
        return false;
      if (
        filters?.correlationId &&
        item.correlationId !== filters.correlationId
      )
        return false;
      return true;
    });
  }

  async markStatus(
    id: string,
    status: DomainEvent['status'],
    publishedAt?: Date | null,
  ): Promise<DomainEvent> {
    const item = this.items.find((row) => row.id === id);
    if (!item) throw new Error('event missing');
    item.status = status;
    if (publishedAt !== undefined) item.publishedAt = publishedAt;
    return item;
  }
}

export function memoryBus(events: InMemoryEventRepository): OutboxEventBus {
  return new OutboxEventBus(events);
}
