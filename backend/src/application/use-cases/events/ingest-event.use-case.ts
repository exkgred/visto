import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '../../../domain/entities/domain-event.entity';
import type { EventType } from '../../../domain/entities/domain-event.entity';
import {
  EVENT_REPOSITORY,
  type EventRepository,
} from '../../../domain/repositories/event.repository';
import {
  PROPOSAL_REPOSITORY,
  type NewProposalItem,
  type ProposalRepository,
} from '../../../domain/repositories/proposal.repository';
import { opaqueToken } from '../proposals/proposals.use-case';
import { buildCanonicalPayload } from '../../../domain/ports/proposal-hash';

export interface IngestEventInput {
  type: EventType;
  sourceApp: string;
  aggregateType?: string;
  aggregateId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
  defaultOwnerId: string;
}

@Injectable()
export class IngestEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly events: EventRepository,
    @Inject(PROPOSAL_REPOSITORY)
    private readonly proposals: ProposalRepository,
  ) {}

  async execute(input: IngestEventInput): Promise<DomainEvent> {
    const idempotencyKey = input.idempotencyKey ?? randomUUID();
    const existing = await this.events.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return existing;
    }

    const stored = await this.events.append({
      type: input.type,
      sourceApp: input.sourceApp,
      aggregateType: input.aggregateType ?? 'proposal',
      aggregateId: input.aggregateId ?? randomUUID(),
      correlationId: input.correlationId ?? randomUUID(),
      idempotencyKey,
      payload: input.payload,
    });

    try {
      if (input.type === 'PropostaEnviada') {
        await this.openFromNexo(stored, input.defaultOwnerId);
      }
      return this.events.markStatus(stored.id, 'PROCESSED');
    } catch {
      return this.events.markStatus(stored.id, 'FAILED');
    }
  }

  private async openFromNexo(
    event: DomainEvent,
    defaultOwnerId: string,
  ): Promise<void> {
    const payload = event.payload;
    const items = parseItems(payload);
    const clientName =
      stringValue(payload.clientName) ?? stringValue(payload.name) ?? 'Cliente';
    const clientEmail =
      stringValue(payload.clientEmail) ??
      stringValue(payload.email) ??
      'cliente@nexo.dev';
    const validUntil = parseDate(payload.validUntil) ?? daysFromNow(7);
    const number = await this.proposals.nextNumber();
    const snapshot = buildCanonicalPayload({
      number,
      clientName,
      clientEmail,
      items,
      validUntil,
    });
    await this.proposals.create({
      number,
      clientName,
      clientEmail,
      message: stringValue(payload.message) ?? 'Enviada pelo Nexo',
      status: 'SENT',
      validUntil,
      publicToken: stringValue(payload.token) ?? opaqueToken(),
      ownerId: stringValue(payload.ownerId) ?? defaultOwnerId,
      sourceApp: event.sourceApp || 'nexo',
      sourceOpportunityId: event.aggregateId,
      correlationId: event.correlationId,
      snapshot,
      items,
    });
  }
}

function parseItems(payload: Record<string, unknown>): NewProposalItem[] {
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    return payload.items.map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const quantity = numberValue(item.quantity) ?? 1;
      const unitPrice =
        numberValue(item.unitPrice) ?? numberValue(item.amount) ?? 0;
      return {
        description: stringValue(item.description) ?? 'Item',
        quantity,
        unitPrice,
      };
    });
  }
  const amount = numberValue(payload.amount) ?? 0;
  return [
    {
      description: stringValue(payload.title) ?? 'Proposta Nexo',
      quantity: 1,
      unitPrice: amount,
    },
  ];
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' && !(value instanceof Date)) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
