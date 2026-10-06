import { createHash } from 'crypto';

export interface CanonicalItem {
  amount: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CanonicalProposal {
  [key: string]: unknown;
  clientEmail: string;
  clientName: string;
  items: CanonicalItem[];
  number: string;
  total: number;
  validUntil: string;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildCanonicalPayload(input: {
  number: string;
  clientName: string;
  clientEmail: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  validUntil: Date | string;
}): CanonicalProposal {
  const items: CanonicalItem[] = input.items
    .map((item) => ({
      amount: roundMoney(item.quantity * item.unitPrice),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }))
    .sort(
      (left, right) =>
        left.description.localeCompare(right.description) ||
        left.quantity - right.quantity,
    );
  const validUntil =
    typeof input.validUntil === 'string'
      ? new Date(input.validUntil).toISOString()
      : input.validUntil.toISOString();
  return {
    clientEmail: input.clientEmail,
    clientName: input.clientName,
    items,
    number: input.number,
    total: roundMoney(items.reduce((sum, item) => sum + item.amount, 0)),
    validUntil,
  };
}

export function canonicalJson(payload: CanonicalProposal): string {
  return JSON.stringify(payload);
}

export function hashCanonical(payload: CanonicalProposal): string {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}
