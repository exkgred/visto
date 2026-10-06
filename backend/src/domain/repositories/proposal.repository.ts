import type {
  Proposal,
  ProposalItem,
  ProposalStatus,
} from '../entities/proposal.entity';

export const PROPOSAL_REPOSITORY = Symbol('PROPOSAL_REPOSITORY');

export interface NewProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateProposalData {
  number?: string;
  clientName: string;
  clientEmail: string;
  message?: string | null;
  status?: ProposalStatus;
  validUntil: Date;
  publicToken?: string | null;
  contentHash?: string | null;
  viewedAt?: Date | null;
  viewCount?: number;
  acceptedAt?: Date | null;
  declinedAt?: Date | null;
  declineReason?: string | null;
  ownerId: string;
  sourceApp?: string;
  sourceOpportunityId?: string | null;
  correlationId?: string | null;
  snapshot?: Record<string, unknown> | null;
  items: NewProposalItem[];
}

export interface ProposalRepository {
  nextNumber(): Promise<string>;
  findById(id: string): Promise<Proposal | null>;
  findByToken(token: string): Promise<Proposal | null>;
  list(filters?: {
    status?: ProposalStatus;
    ownerId?: string;
  }): Promise<Proposal[]>;
  create(data: CreateProposalData): Promise<Proposal>;
  update(
    id: string,
    data: Partial<
      Omit<Proposal, 'id' | 'items' | 'createdAt'> & { items?: ProposalItem[] }
    >,
  ): Promise<Proposal>;
}
