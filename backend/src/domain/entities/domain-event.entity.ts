export type EventType =
  | 'PropostaCriada'
  | 'PropostaEnviada'
  | 'PropostaVista'
  | 'PropostaAceita'
  | 'PropostaRecusada';

export type EventStatus = 'RECEIVED' | 'PROCESSED' | 'PUBLISHED' | 'FAILED';

export type EventPayload = Record<string, unknown>;

export interface DomainEvent {
  id: string;
  type: EventType;
  sourceApp: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  idempotencyKey: string;
  payload: EventPayload;
  status: EventStatus;
  occurredAt: Date;
  publishedAt: Date | null;
}

export interface NewDomainEvent {
  type: EventType;
  sourceApp: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  idempotencyKey: string;
  payload: EventPayload;
  occurredAt?: Date;
}
