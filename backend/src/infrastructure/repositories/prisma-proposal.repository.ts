import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  Proposal,
  ProposalItem,
  ProposalStatus,
} from '../../domain/entities/proposal.entity';
import type {
  CreateProposalData,
  ProposalRepository,
} from '../../domain/repositories/proposal.repository';
import { PrismaService } from '../database/prisma.service';

type ProposalRow = {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  message: string | null;
  status: ProposalStatus;
  validUntil: Date;
  publicToken: string | null;
  contentHash: string | null;
  viewedAt: Date | null;
  viewCount: number;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  declineReason: string | null;
  ownerId: string;
  sourceApp: string;
  sourceOpportunityId: string | null;
  correlationId: string | null;
  snapshot: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    proposalId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
};

@Injectable()
export class PrismaProposalRepository implements ProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextNumber(): Promise<string> {
    const count = await this.prisma.proposal.count();
    return `VST-${String(count + 1).padStart(4, '0')}`;
  }

  async findById(id: string): Promise<Proposal | null> {
    const row = await this.prisma.proposal.findUnique({
      where: { id },
      include: { items: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByToken(token: string): Promise<Proposal | null> {
    const row = await this.prisma.proposal.findUnique({
      where: { publicToken: token },
      include: { items: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(filters?: {
    status?: ProposalStatus;
    ownerId?: string;
  }): Promise<Proposal[]> {
    const rows = await this.prisma.proposal.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.ownerId ? { ownerId: filters.ownerId } : {}),
      },
      include: { items: true },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async create(data: CreateProposalData): Promise<Proposal> {
    const number = data.number ?? (await this.nextNumber());
    const row = await this.prisma.proposal.create({
      data: {
        number,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        message: data.message ?? null,
        status: data.status ?? 'DRAFT',
        validUntil: data.validUntil,
        publicToken: data.publicToken ?? null,
        contentHash: data.contentHash ?? null,
        viewedAt: data.viewedAt ?? null,
        viewCount: data.viewCount ?? 0,
        acceptedAt: data.acceptedAt ?? null,
        declinedAt: data.declinedAt ?? null,
        declineReason: data.declineReason ?? null,
        ownerId: data.ownerId,
        sourceApp: data.sourceApp ?? 'visto',
        sourceOpportunityId: data.sourceOpportunityId ?? null,
        correlationId: data.correlationId ?? null,
        snapshot: (data.snapshot ?? undefined) as
          Prisma.InputJsonValue | undefined,
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
          })),
        },
      },
      include: { items: true },
    });
    return this.toDomain(row);
  }

  async update(
    id: string,
    data: Partial<Omit<Proposal, 'id' | 'items' | 'createdAt'>> & {
      items?: ProposalItem[];
    },
  ): Promise<Proposal> {
    const row = await this.prisma.proposal.update({
      where: { id },
      data: {
        ...(data.number !== undefined ? { number: data.number } : {}),
        ...(data.clientName !== undefined
          ? { clientName: data.clientName }
          : {}),
        ...(data.clientEmail !== undefined
          ? { clientEmail: data.clientEmail }
          : {}),
        ...(data.message !== undefined ? { message: data.message } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.validUntil !== undefined
          ? { validUntil: data.validUntil }
          : {}),
        ...(data.publicToken !== undefined
          ? { publicToken: data.publicToken }
          : {}),
        ...(data.contentHash !== undefined
          ? { contentHash: data.contentHash }
          : {}),
        ...(data.viewedAt !== undefined ? { viewedAt: data.viewedAt } : {}),
        ...(data.viewCount !== undefined ? { viewCount: data.viewCount } : {}),
        ...(data.acceptedAt !== undefined
          ? { acceptedAt: data.acceptedAt }
          : {}),
        ...(data.declinedAt !== undefined
          ? { declinedAt: data.declinedAt }
          : {}),
        ...(data.declineReason !== undefined
          ? { declineReason: data.declineReason }
          : {}),
        ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
        ...(data.sourceApp !== undefined ? { sourceApp: data.sourceApp } : {}),
        ...(data.sourceOpportunityId !== undefined
          ? { sourceOpportunityId: data.sourceOpportunityId }
          : {}),
        ...(data.correlationId !== undefined
          ? { correlationId: data.correlationId }
          : {}),
        ...(data.snapshot !== undefined
          ? { snapshot: data.snapshot as Prisma.InputJsonValue }
          : {}),
      },
      include: { items: true },
    });
    return this.toDomain(row);
  }

  private toDomain(row: ProposalRow): Proposal {
    return {
      id: row.id,
      number: row.number,
      clientName: row.clientName,
      clientEmail: row.clientEmail,
      message: row.message,
      status: row.status,
      validUntil: row.validUntil,
      publicToken: row.publicToken,
      contentHash: row.contentHash,
      viewedAt: row.viewedAt,
      viewCount: row.viewCount,
      acceptedAt: row.acceptedAt,
      declinedAt: row.declinedAt,
      declineReason: row.declineReason,
      ownerId: row.ownerId,
      sourceApp: row.sourceApp,
      sourceOpportunityId: row.sourceOpportunityId,
      correlationId: row.correlationId,
      snapshot: (row.snapshot ?? null) as Record<string, unknown> | null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items: row.items.map((item) => ({
        id: item.id,
        proposalId: item.proposalId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
    };
  }
}
