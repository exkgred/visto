import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  DomainEvent,
  EventPayload,
  NewDomainEvent,
} from '../../domain/entities/domain-event.entity';
import type {
  EventListFilters,
  EventRepository,
} from '../../domain/repositories/event.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(event: NewDomainEvent): Promise<DomainEvent> {
    const row = await this.prisma.domainEvent.create({
      data: {
        type: event.type,
        sourceApp: event.sourceApp,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        idempotencyKey: event.idempotencyKey,
        payload: event.payload as Prisma.InputJsonValue,
        occurredAt: event.occurredAt ?? new Date(),
        status: 'RECEIVED',
      },
    });
    return this.toDomain(row);
  }

  async findByIdempotencyKey(key: string): Promise<DomainEvent | null> {
    const row = await this.prisma.domainEvent.findUnique({
      where: { idempotencyKey: key },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(filters?: EventListFilters): Promise<DomainEvent[]> {
    const rows = await this.prisma.domainEvent.findMany({
      where: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.sourceApp ? { sourceApp: filters.sourceApp } : {}),
        ...(filters?.aggregateId ? { aggregateId: filters.aggregateId } : {}),
        ...(filters?.correlationId
          ? { correlationId: filters.correlationId }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async markStatus(
    id: string,
    status: DomainEvent['status'],
    publishedAt?: Date | null,
  ): Promise<DomainEvent> {
    const row = await this.prisma.domainEvent.update({
      where: { id },
      data: {
        status,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
    });
    return this.toDomain(row);
  }

  private toDomain(row: {
    id: string;
    type: DomainEvent['type'];
    sourceApp: string;
    aggregateType: string;
    aggregateId: string;
    correlationId: string;
    idempotencyKey: string;
    payload: Prisma.JsonValue;
    status: DomainEvent['status'];
    occurredAt: Date;
    publishedAt: Date | null;
  }): DomainEvent {
    return {
      id: row.id,
      type: row.type,
      sourceApp: row.sourceApp,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      correlationId: row.correlationId,
      idempotencyKey: row.idempotencyKey,
      payload: (row.payload ?? {}) as EventPayload,
      status: row.status,
      occurredAt: row.occurredAt,
      publishedAt: row.publishedAt,
    };
  }
}
