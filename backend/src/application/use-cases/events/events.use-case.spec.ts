import { IngestEventUseCase } from './ingest-event.use-case';
import { ListEventsUseCase } from './list-events.use-case';
import {
  InMemoryEventRepository,
  InMemoryProposalRepository,
} from '../__tests__/memory';

describe('events use cases', () => {
  it('PropostaEnviada do Nexo vira proposta SENT', async () => {
    const events = new InMemoryEventRepository();
    const proposals = new InMemoryProposalRepository();
    const ingest = new IngestEventUseCase(events, proposals);

    const stored = await ingest.execute({
      type: 'PropostaEnviada',
      sourceApp: 'nexo',
      aggregateId: 'opp-acme',
      correlationId: 'lead-carla',
      idempotencyKey: 'proposta-opp-acme',
      payload: {
        amount: 18500,
        clientName: 'ACME Ltda',
        email: 'carla@acme.test',
      },
      defaultOwnerId: 'user-marina',
    });

    expect(stored.status).toBe('PROCESSED');
    expect(proposals.items).toHaveLength(1);
    expect(proposals.items[0].status).toBe('SENT');
    expect(proposals.items[0].items[0].amount).toBe(18500);
    expect(proposals.items[0].sourceOpportunityId).toBe('opp-acme');

    const again = await ingest.execute({
      type: 'PropostaEnviada',
      sourceApp: 'nexo',
      idempotencyKey: 'proposta-opp-acme',
      payload: { amount: 18500 },
      defaultOwnerId: 'user-marina',
    });
    expect(again.id).toBe(stored.id);
    expect(proposals.items).toHaveLength(1);
  });

  it('ingest com itens no payload e listagem', async () => {
    const events = new InMemoryEventRepository();
    const proposals = new InMemoryProposalRepository();
    const ingest = new IngestEventUseCase(events, proposals);

    await ingest.execute({
      type: 'PropostaEnviada',
      sourceApp: 'nexo',
      payload: {
        clientName: 'Loja Norte',
        clientEmail: 'compras@norte.test',
        items: [{ description: 'Licença', quantity: 2, unitPrice: 21000 }],
      },
      defaultOwnerId: 'user-marina',
    });
    expect(proposals.items[0].items[0].amount).toBe(42000);

    await ingest.execute({
      type: 'PropostaEnviada',
      sourceApp: 'nexo',
      payload: {
        name: 'Carla',
        title: 'ERP ACME',
        amount: 18500,
        token: 'tok-nexo',
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
      defaultOwnerId: 'user-marina',
    });
    expect(proposals.items[0].publicToken).toBe('tok-nexo');

    const listed = await new ListEventsUseCase(events).execute();
    expect(listed).toHaveLength(2);
  });

  it('evento que não abre proposta só registra', async () => {
    const events = new InMemoryEventRepository();
    const proposals = new InMemoryProposalRepository();
    const stored = await new IngestEventUseCase(events, proposals).execute({
      type: 'PropostaVista',
      sourceApp: 'visto',
      payload: {},
      defaultOwnerId: 'user-marina',
    });
    expect(stored.status).toBe('PROCESSED');
    expect(proposals.items).toHaveLength(0);
  });

  it('falha ao abrir proposta marca FAILED', async () => {
    const events = new InMemoryEventRepository();
    const proposals = new InMemoryProposalRepository();
    proposals.nextNumber = async () => {
      throw new Error('boom');
    };
    const stored = await new IngestEventUseCase(events, proposals).execute({
      type: 'PropostaEnviada',
      sourceApp: 'nexo',
      payload: { amount: 10 },
      defaultOwnerId: 'user-marina',
    });
    expect(stored.status).toBe('FAILED');
  });
});
