import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '../../../domain/errors/domain-error';
import {
  hashCanonical,
  buildCanonicalPayload,
} from '../../../domain/ports/proposal-hash';
import {
  AcceptProposalUseCase,
  CreateProposalUseCase,
  DeclineProposalUseCase,
  GetDashboardUseCase,
  GetProposalUseCase,
  ListProposalsUseCase,
  SendProposalUseCase,
  ViewPublicProposalUseCase,
} from './proposals.use-case';
import {
  InMemoryEventRepository,
  InMemoryProposalRepository,
  memoryBus,
} from '../__tests__/memory';

function future(days = 14): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function past(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

describe('ciclo da proposta', () => {
  it('criar → enviar → ver → aceitar grava hash e handoff VendaCore', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    const create = new CreateProposalUseCase(proposals, bus);
    const send = new SendProposalUseCase(proposals, bus);
    const view = new ViewPublicProposalUseCase(proposals, bus);
    const accept = new AcceptProposalUseCase(proposals, bus);

    const draft = await create.execute({
      clientName: 'ACME Ltda',
      clientEmail: 'carla@acme.test',
      validUntil: future(),
      ownerId: 'user-marina',
      items: [{ description: 'ERP', quantity: 1, unitPrice: 18500 }],
    });
    expect(draft.status).toBe('DRAFT');
    expect(draft.number).toBe('VST-0001');

    const sent = await send.execute({
      proposalId: draft.id,
      actorId: 'user-marina',
      publicAppUrl: 'http://localhost:5178',
    });
    expect(sent.status).toBe('SENT');
    expect(sent.publicToken).toBeTruthy();
    expect(events.items.map((item) => item.type)).toEqual(
      expect.arrayContaining(['PropostaCriada', 'PropostaEnviada']),
    );

    const viewed = await view.execute({ token: sent.publicToken as string });
    expect(viewed.status).toBe('VIEWED');
    expect(viewed.viewCount).toBe(1);

    const again = await view.execute({ token: sent.publicToken as string });
    expect(again.viewCount).toBe(2);
    expect(
      events.items.filter((item) => item.type === 'PropostaVista'),
    ).toHaveLength(1);

    const accepted = await accept.execute({
      token: sent.publicToken as string,
    });
    expect(accepted.status).toBe('ACCEPTED');
    const expected = hashCanonical(buildCanonicalPayload(draft));
    expect(accepted.contentHash).toBe(expected);
    const gained = events.items.find((item) => item.type === 'PropostaAceita');
    expect(gained?.payload.handoff).toEqual({
      system: 'vendacore',
      action: 'criarClienteEOrcamento',
    });
    expect(gained?.payload.contentHash).toBe(expected);

    await expect(
      accept.execute({ token: sent.publicToken as string }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('recusar e segunda decisão falham', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    const created = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'Loja Norte',
      clientEmail: 'compras@norte.test',
      validUntil: future(),
      ownerId: 'user-marina',
      items: [{ description: 'Licença', quantity: 1, unitPrice: 42000 }],
    });
    const sent = await new SendProposalUseCase(proposals, bus).execute({
      proposalId: created.id,
      actorId: 'user-marina',
    });
    const declined = await new DeclineProposalUseCase(proposals, bus).execute({
      token: sent.publicToken as string,
      reason: '  ',
    });
    expect(declined.status).toBe('DECLINED');
    await expect(
      new DeclineProposalUseCase(proposals, bus).execute({
        token: sent.publicToken as string,
      }),
    ).rejects.toThrow(BusinessRuleError);
    await expect(
      new AcceptProposalUseCase(proposals, bus).execute({
        token: sent.publicToken as string,
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('token expirado não aceita', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    const created = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'ACME',
      clientEmail: 'carla@acme.test',
      validUntil: future(1),
      ownerId: 'user-marina',
      items: [{ description: 'ERP', quantity: 1, unitPrice: 100 }],
    });
    const sent = await new SendProposalUseCase(proposals, bus).execute({
      proposalId: created.id,
      actorId: 'user-marina',
    });
    await proposals.update(sent.id, { validUntil: past() });

    await expect(
      new AcceptProposalUseCase(proposals, bus).execute({
        token: sent.publicToken as string,
      }),
    ).rejects.toThrow(BusinessRuleError);
    const listed = await new ListProposalsUseCase(proposals).execute();
    expect(listed[0].status).toBe('EXPIRED');
    const viewed = await new ViewPublicProposalUseCase(proposals, bus).execute({
      token: sent.publicToken as string,
    });
    expect(viewed.status).toBe('EXPIRED');
  });

  it('enviar rascunho sem item ou validade vencida → regra', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    await expect(
      new CreateProposalUseCase(proposals, bus).execute({
        clientName: 'X',
        clientEmail: 'x@test.com',
        validUntil: future(),
        ownerId: 'u',
        items: [],
      }),
    ).rejects.toThrow(ValidationError);

    await expect(
      new CreateProposalUseCase(proposals, bus).execute({
        clientName: 'X',
        clientEmail: 'x@test.com',
        validUntil: past(),
        ownerId: 'u',
        items: [{ description: 'A', quantity: 1, unitPrice: 1 }],
      }),
    ).rejects.toThrow(ValidationError);

    const ok = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'X',
      clientEmail: 'x@test.com',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'A', quantity: 1, unitPrice: 10 }],
    });
    await proposals.update(ok.id, { validUntil: past() });
    await expect(
      new SendProposalUseCase(proposals, bus).execute({
        proposalId: ok.id,
        actorId: 'u',
      }),
    ).rejects.toThrow(BusinessRuleError);
    await expect(
      new SendProposalUseCase(proposals, bus).execute({
        proposalId: ok.id,
        actorId: 'u',
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('enviar o que já saiu e token inexistente', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    const created = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'X',
      clientEmail: 'x@test.com',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'A', quantity: 1, unitPrice: 10 }],
    });
    await new SendProposalUseCase(proposals, bus).execute({
      proposalId: created.id,
      actorId: 'u',
    });
    await expect(
      new SendProposalUseCase(proposals, bus).execute({
        proposalId: created.id,
        actorId: 'u',
      }),
    ).rejects.toThrow(BusinessRuleError);
    await expect(
      new SendProposalUseCase(proposals, bus).execute({
        proposalId: 'missing',
        actorId: 'u',
      }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      new ViewPublicProposalUseCase(proposals, bus).execute({ token: 'nope' }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      new GetProposalUseCase(proposals, events).execute({
        proposalId: 'missing',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('dashboard agrupa por status', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'A',
      clientEmail: 'a@test.com',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'A', quantity: 1, unitPrice: 50 }],
    });
    const dash = await new GetDashboardUseCase(proposals, events).execute();
    expect(dash.byStatus.DRAFT.count).toBe(1);
    expect(dash.pendingAmount).toBe(0);
    const detail = await new GetProposalUseCase(proposals, events).execute({
      proposalId: proposals.items[0].id,
    });
    expect(detail.proposal.number).toBe('VST-0001');
  });

  it('aceitar direto de SENT, ver aceita, recusar expirada', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    const created = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'ACME',
      clientEmail: 'carla@acme.test',
      message: 'olá',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'ERP', quantity: 1, unitPrice: 100 }],
    });
    const sent = await new SendProposalUseCase(proposals, bus).execute({
      proposalId: created.id,
      actorId: 'u',
    });
    const accepted = await new AcceptProposalUseCase(proposals, bus).execute({
      token: sent.publicToken as string,
    });
    expect(accepted.status).toBe('ACCEPTED');
    const viewed = await new ViewPublicProposalUseCase(proposals, bus).execute({
      token: sent.publicToken as string,
    });
    expect(viewed.status).toBe('ACCEPTED');
    await expect(
      new DeclineProposalUseCase(proposals, bus).execute({
        token: sent.publicToken as string,
      }),
    ).rejects.toThrow(BusinessRuleError);

    const other = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'B',
      clientEmail: 'b@test.com',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'X', quantity: 1, unitPrice: 10 }],
    });
    const sentB = await new SendProposalUseCase(proposals, bus).execute({
      proposalId: other.id,
      actorId: 'u',
    });
    await proposals.update(sentB.id, { validUntil: past() });
    await expect(
      new DeclineProposalUseCase(proposals, bus).execute({
        token: sentB.publicToken as string,
      }),
    ).rejects.toThrow(BusinessRuleError);

    const listed = await new ListProposalsUseCase(proposals).execute({
      status: 'ACCEPTED',
    });
    expect(listed.length).toBeGreaterThanOrEqual(1);
    const dash = await new GetDashboardUseCase(proposals, events).execute();
    expect(dash.acceptedCount).toBeGreaterThanOrEqual(1);
  });

  it('rascunho com token não é público; aceite sem snapshot reconstrói o hash', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    const created = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'C',
      clientEmail: 'c@test.com',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'Y', quantity: 1, unitPrice: 20 }],
    });
    await proposals.update(created.id, { publicToken: 'draft-token' });
    await expect(
      new ViewPublicProposalUseCase(proposals, bus).execute({
        token: 'draft-token',
      }),
    ).rejects.toThrow(NotFoundError);

    const sent = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'D',
      clientEmail: 'd@test.com',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'Z', quantity: 1, unitPrice: 30 }],
    });
    const opened = await new SendProposalUseCase(proposals, bus).execute({
      proposalId: sent.id,
      actorId: 'u',
    });
    await proposals.update(opened.id, { snapshot: { foo: 1 } });
    const accepted = await new AcceptProposalUseCase(proposals, bus).execute({
      token: opened.publicToken as string,
    });
    expect(accepted.contentHash).toHaveLength(64);
    await expect(
      new AcceptProposalUseCase(proposals, bus).execute({ token: 'missing' }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      new DeclineProposalUseCase(proposals, bus).execute({ token: 'missing' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('item inválido na criação', async () => {
    const proposals = new InMemoryProposalRepository();
    const events = new InMemoryEventRepository();
    const bus = memoryBus(events);
    await expect(
      new CreateProposalUseCase(proposals, bus).execute({
        clientName: 'X',
        clientEmail: 'x@test.com',
        validUntil: future(),
        ownerId: 'u',
        items: [{ description: '   ', quantity: 1, unitPrice: 1 }],
      }),
    ).rejects.toThrow(ValidationError);
    await expect(
      new CreateProposalUseCase(proposals, bus).execute({
        clientName: 'X',
        clientEmail: 'x@test.com',
        validUntil: future(),
        ownerId: 'u',
        items: [{ description: 'A', quantity: 0, unitPrice: 1 }],
      }),
    ).rejects.toThrow(ValidationError);

    const draft = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'E',
      clientEmail: 'e@test.com',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'A', quantity: 1, unitPrice: 1 }],
    });
    await proposals.update(draft.id, { items: [], publicToken: 'draft-x' });
    await expect(
      new SendProposalUseCase(proposals, bus).execute({
        proposalId: draft.id,
        actorId: 'u',
      }),
    ).rejects.toThrow(ValidationError);
    await expect(
      new AcceptProposalUseCase(proposals, bus).execute({ token: 'draft-x' }),
    ).rejects.toThrow(BusinessRuleError);
    await expect(
      new DeclineProposalUseCase(proposals, bus).execute({ token: 'draft-x' }),
    ).rejects.toThrow(BusinessRuleError);

    const live = await new CreateProposalUseCase(proposals, bus).execute({
      clientName: 'F',
      clientEmail: 'f@test.com',
      validUntil: future(),
      ownerId: 'u',
      items: [{ description: 'B', quantity: 1, unitPrice: 5 }],
    });
    const sent = await new SendProposalUseCase(proposals, bus).execute({
      proposalId: live.id,
      actorId: 'u',
    });
    await proposals.update(sent.id, { validUntil: past() });
    const detail = await new GetProposalUseCase(proposals, events).execute({
      proposalId: sent.id,
    });
    expect(detail.proposal.status).toBe('EXPIRED');
  });
});
