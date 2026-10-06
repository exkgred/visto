import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '../../../domain/entities/domain-event.entity';
import {
  EVENT_REPOSITORY,
  type EventListFilters,
  type EventRepository,
} from '../../../domain/repositories/event.repository';

@Injectable()
export class ListEventsUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly events: EventRepository,
  ) {}

  async execute(filters?: EventListFilters): Promise<DomainEvent[]> {
    return this.events.list(filters);
  }
}
