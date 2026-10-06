import { randomUUID } from 'crypto';
import type { EventBus } from '../../domain/ports/event-bus';
import type {
  DomainEvent,
  NewDomainEvent,
} from '../../domain/entities/domain-event.entity';
import type { EventRepository } from '../../domain/repositories/event.repository';

export class OutboxEventBus implements EventBus {
  constructor(private readonly events: EventRepository) {}

  async publish(event: NewDomainEvent): Promise<DomainEvent> {
    const stored = await this.events.append({
      ...event,
      idempotencyKey: event.idempotencyKey || randomUUID(),
    });
    return this.events.markStatus(stored.id, 'PUBLISHED', new Date());
  }
}
