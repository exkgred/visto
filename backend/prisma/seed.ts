import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const DAYS = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const HOURS = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

function hashCanonical(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.domainEvent.deleteMany();
  await prisma.proposalItem.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        id: 'user-admin',
        name: 'Admin Visto',
        email: 'admin@visto.dev',
        passwordHash,
        role: 'ADMIN',
      },
      {
        id: 'user-marina',
        name: 'Marina Comercial',
        email: 'marina@visto.dev',
        passwordHash,
        role: 'SELLER',
      },
    ],
  });

  const acmeValidUntil = DAYS(12);
  const norteValidUntil = new Date('2026-12-01T00:00:00.000Z');
  const norteSnapshot = {
    clientEmail: 'compras@lojanorte.test',
    clientName: 'Loja Norte',
    items: [
      {
        amount: 42000,
        description: 'VendaCore anual',
        quantity: 1,
        unitPrice: 42000,
      },
    ],
    number: 'VST-0003',
    total: 42000,
    validUntil: norteValidUntil.toISOString(),
  };

  await prisma.proposal.create({
    data: {
      id: 'prop-draft',
      number: 'VST-0001',
      clientName: 'Oficina Brasa',
      clientEmail: 'forja@brasa.test',
      message: 'Rascunho da assistência na forja.',
      status: 'DRAFT',
      validUntil: DAYS(20),
      ownerId: 'user-marina',
      createdAt: HOURS(4),
      updatedAt: HOURS(1),
      items: {
        create: [
          {
            description: 'Assistência na forja',
            quantity: 1,
            unitPrice: 2800,
            amount: 2800,
          },
        ],
      },
    },
  });

  const acmeSnapshot = {
    clientEmail: 'carla@acme.test',
    clientName: 'ACME Ltda',
    items: [
      {
        amount: 18500,
        description: 'ERP + assistência',
        quantity: 1,
        unitPrice: 18500,
      },
    ],
    number: 'VST-0002',
    total: 18500,
    validUntil: acmeValidUntil.toISOString(),
  };

  await prisma.proposal.create({
    data: {
      id: 'prop-sent',
      number: 'VST-0002',
      clientName: 'ACME Ltda',
      clientEmail: 'carla@acme.test',
      message: 'Proposta do funil Nexo. Abra o lacre quando estiver pronta.',
      status: 'SENT',
      validUntil: acmeValidUntil,
      publicToken: 'demo-sent-acme',
      ownerId: 'user-marina',
      sourceApp: 'nexo',
      sourceOpportunityId: 'opp-acme',
      correlationId: 'lead-carla',
      snapshot: acmeSnapshot,
      createdAt: HOURS(30),
      updatedAt: HOURS(6),
      items: {
        create: [
          {
            description: 'ERP + assistência',
            quantity: 1,
            unitPrice: 18500,
            amount: 18500,
          },
        ],
      },
    },
  });

  await prisma.proposal.create({
    data: {
      id: 'prop-accepted',
      number: 'VST-0003',
      clientName: 'Loja Norte',
      clientEmail: 'compras@lojanorte.test',
      message: 'Aceita. Handoff pronto para o VendaCore.',
      status: 'ACCEPTED',
      validUntil: norteValidUntil,
      publicToken: 'demo-accepted-norte',
      contentHash: hashCanonical(norteSnapshot),
      viewedAt: HOURS(10),
      viewCount: 3,
      acceptedAt: HOURS(8),
      ownerId: 'user-marina',
      sourceApp: 'visto',
      snapshot: norteSnapshot,
      createdAt: HOURS(90),
      updatedAt: HOURS(8),
      items: {
        create: [
          {
            description: 'VendaCore anual',
            quantity: 1,
            unitPrice: 42000,
            amount: 42000,
          },
        ],
      },
    },
  });

  await prisma.domainEvent.createMany({
    data: [
      {
        type: 'PropostaCriada',
        sourceApp: 'visto',
        aggregateType: 'proposal',
        aggregateId: 'prop-draft',
        correlationId: 'prop-draft',
        idempotencyKey: 'proposta-criada-prop-draft',
        payload: { number: 'VST-0001', total: 2800 },
        status: 'PUBLISHED',
        occurredAt: HOURS(4),
        publishedAt: HOURS(4),
      },
      {
        type: 'PropostaEnviada',
        sourceApp: 'nexo',
        aggregateType: 'proposal',
        aggregateId: 'prop-sent',
        correlationId: 'lead-carla',
        idempotencyKey: 'proposta-enviada-prop-sent',
        payload: { number: 'VST-0002', amount: 18500, token: 'demo-sent-acme' },
        status: 'PROCESSED',
        occurredAt: HOURS(6),
        publishedAt: null,
      },
      {
        type: 'PropostaAceita',
        sourceApp: 'visto',
        aggregateType: 'proposal',
        aggregateId: 'prop-accepted',
        correlationId: 'prop-accepted',
        idempotencyKey: 'proposta-aceita-prop-accepted',
        payload: {
          number: 'VST-0003',
          amount: 42000,
          contentHash: hashCanonical(norteSnapshot),
          handoff: { system: 'vendacore', action: 'criarClienteEOrcamento' },
        },
        status: 'PUBLISHED',
        occurredAt: HOURS(8),
        publishedAt: HOURS(8),
      },
    ],
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
