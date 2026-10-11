import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { decodePaymentRequest, encodePaymentRequest, parseAUSDAmount, signPaymentRequest, validatePaymentRequest, verifyPaymentRequest } from '../src/lib/invoices';

const seller = privateKeyToAccount(`0x${'1'.repeat(64)}`);
describe('AUSD amount and signed payment request', () => {
  it('parses exact six-decimal AUSD values and rejects ambiguous numeric input', () => {
    expect(parseAUSDAmount('123.456789')).toBe(123_456_789n);
    expect(() => parseAUSDAmount('0')).toThrow();
    expect(() => parseAUSDAmount('1.0000001')).toThrow();
    expect(() => parseAUSDAmount('1e3')).toThrow();
    expect(() => parseAUSDAmount('1,000')).toThrow();
    expect(() => parseAUSDAmount('-5')).toThrow();
  });

  it('signs, verifies, serializes and parses a request without floating-point amounts', async () => {
    const now = 1_800_000_000;
    const request = await signPaymentRequest({
      account: seller,
      payee: seller.address,
      amountText: '150',
      title: 'Design sprint',
      description: 'Three-day product design sprint.',
      now,
    });
    expect(request.amount).toBe('150000000');
    expect(await verifyPaymentRequest(request)).toBe(true);
    const decoded = decodePaymentRequest(encodePaymentRequest(request), now);
    expect(decoded.invoiceId).toBe(request.invoiceId);
    expect(await verifyPaymentRequest(decoded)).toBe(true);
  });

  it('rejects tampered invoice details and a different signature', async () => {
    const request = await signPaymentRequest({
      account: seller,
      payee: seller.address,
      amountText: '10',
      title: 'Translation',
      description: 'Translate a short report.',
      now: 1_800_000_000,
    });
    expect(() => validatePaymentRequest({ ...request, amount: '1000000000' }, 1_800_000_000)).not.toThrow();
    expect(await verifyPaymentRequest({ ...request, amount: '1000000000' })).toBe(false);
    expect(() => validatePaymentRequest({ ...request, description: 'A changed description.' }, 1_800_000_000)).toThrow(/changed/i);
  });

  it('rejects expired requests and oversized payloads', async () => {
    const request = await signPaymentRequest({ account: seller, payee: seller.address, amountText: '1', title: 'One hour', description: 'One hour of work.', now: 1_800_000_000 });
    expect(() => validatePaymentRequest(request, request.expiresAt + 1)).toThrow(/expired/i);
    expect(() => decodePaymentRequest('x'.repeat(6001))).toThrow(/long/i);
  });
});
