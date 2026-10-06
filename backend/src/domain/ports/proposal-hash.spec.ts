import {
  buildCanonicalPayload,
  canonicalJson,
  hashCanonical,
} from './proposal-hash';
import {
  effectiveStatus,
  isOpenForDecision,
  isTerminal,
} from './proposal-status';

describe('proposal-hash', () => {
  const validUntil = new Date('2026-12-01T00:00:00.000Z');

  it('JSON canônico estável independente da ordem dos itens', () => {
    const left = buildCanonicalPayload({
      number: 'VST-0001',
      clientName: 'ACME',
      clientEmail: 'carla@acme.test',
      validUntil,
      items: [
        { description: 'ERP', quantity: 1, unitPrice: 10000 },
        { description: 'Suporte', quantity: 2, unitPrice: 500 },
      ],
    });
    const right = buildCanonicalPayload({
      number: 'VST-0001',
      clientName: 'ACME',
      clientEmail: 'carla@acme.test',
      validUntil: validUntil.toISOString(),
      items: [
        { description: 'Suporte', quantity: 2, unitPrice: 500 },
        { description: 'ERP', quantity: 1, unitPrice: 10000 },
      ],
    });
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    const equal = buildCanonicalPayload({
      number: 'VST-0002',
      clientName: 'ACME',
      clientEmail: 'carla@acme.test',
      validUntil,
      items: [
        { description: 'ERP', quantity: 2, unitPrice: 10 },
        { description: 'ERP', quantity: 1, unitPrice: 10 },
      ],
    });
    expect(equal.items[0].quantity).toBe(1);
    expect(hashCanonical(left)).toBe(hashCanonical(right));
    expect(left.total).toBe(11000);
  });
});

describe('proposal-status', () => {
  it('SENT vencida → EXPIRED; aceita não expira', () => {
    const past = new Date('2020-01-01T00:00:00.000Z');
    expect(effectiveStatus({ status: 'SENT', validUntil: past })).toBe(
      'EXPIRED',
    );
    expect(effectiveStatus({ status: 'ACCEPTED', validUntil: past })).toBe(
      'ACCEPTED',
    );
    expect(effectiveStatus({ status: 'DRAFT', validUntil: past })).toBe(
      'DRAFT',
    );
    expect(isOpenForDecision('VIEWED')).toBe(true);
    expect(isTerminal('DECLINED')).toBe(true);
    expect(isTerminal('ACCEPTED')).toBe(true);
    expect(isTerminal('EXPIRED')).toBe(true);
    expect(isTerminal('SENT')).toBe(false);
  });
});
