import type {
  DomainEvent,
  NewDomainEvent,
} from '../entities/domain-event.entity';

export const EVENT_BUS = Symbol('EVENT_BUS');

export interface EventBus {
  publish(event: NewDomainEvent): Promise<DomainEvent>;
}
