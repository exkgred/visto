import type {
  DomainEvent,
  EventType,
  NewDomainEvent,
} from '../entities/domain-event.entity';

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');

export interface EventListFilters {
  type?: EventType;
  sourceApp?: string;
  aggregateId?: string;
  correlationId?: string;
}

export interface EventRepository {
  append(event: NewDomainEvent): Promise<DomainEvent>;
  findByIdempotencyKey(key: string): Promise<DomainEvent | null>;
  list(filters?: EventListFilters): Promise<DomainEvent[]>;
  markStatus(
    id: string,
    status: DomainEvent['status'],
    publishedAt?: Date | null,
  ): Promise<DomainEvent>;
}
