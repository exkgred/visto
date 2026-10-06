export type ProposalStatus =
  'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface ProposalItem {
  id: string;
  proposalId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Proposal {
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
  snapshot: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  items: ProposalItem[];
}

export function proposalTotal(items: Pick<ProposalItem, 'amount'>[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function publicLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/p/${token}`;
}
