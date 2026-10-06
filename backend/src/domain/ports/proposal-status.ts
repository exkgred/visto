import type { Proposal, ProposalStatus } from '../entities/proposal.entity';

export function isTerminal(status: ProposalStatus): boolean {
  return status === 'ACCEPTED' || status === 'DECLINED' || status === 'EXPIRED';
}

export function isOpenForDecision(status: ProposalStatus): boolean {
  return status === 'SENT' || status === 'VIEWED';
}

export function effectiveStatus(
  proposal: Pick<Proposal, 'status' | 'validUntil'>,
  now: Date = new Date(),
): ProposalStatus {
  if (
    (proposal.status === 'SENT' || proposal.status === 'VIEWED') &&
    proposal.validUntil.getTime() < now.getTime()
  ) {
    return 'EXPIRED';
  }
  return proposal.status;
}
