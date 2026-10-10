import { describe, expect, it } from 'vitest';
import { keccak256, stringToHex, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  MAX_INVOICE_AGE_SECONDS, MAX_SCHEDULE_WINDOW_SECONDS, decodePaymentRequest, encodePaymentRequest,
  signPaymentRequest, validatePaymentRequest, verifyPaymentRequest,
} from '../src/lib/invoices';
import { INSTALLMENT_GRACE_SECONDS, planInstallments, signInstallmentPlan, splitInstallments } from '../src/lib/schedule';

const payer = privateKeyToAccount(`0x${'2'.repeat(64)}`);
const payee = payer.address;
const NOW = 1_800_000_000;
const DAY = 86_400;

describe('installment splitting', () => {
  it('always sums exactly to the total, with the remainder on the last installment', () => {
    const total = 100_000_000n; // 100 AUSD
    const parts = splitInstallments(total, 3);
    expect(parts).toEqual([33_333_333n, 33_333_333n, 33_333_334n]);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(total);
  });

  it('keeps exact sums across many totals and counts', () => {
    for (let count = 2; count <= 12; count += 1) {
      for (const total of [BigInt(count), 1_000_001n, 999_999_999n, 1_000_000_000_000n]) {
        const parts = splitInstallments(total, count);
        expect(parts).toHaveLength(count);
        expect(parts.reduce((a, b) => a + b, 0n)).toBe(total);
        expect(parts.every((part) => part > 0n)).toBe(true);
      }
    }
  });

  it('rejects plans that are too small, too large or too short', () => {
    expect(() => splitInstallments(100n, 1)).toThrow();
    expect(() => splitInstallments(100n, 13)).toThrow();
    expect(() => splitInstallments(1n, 2)).toThrow(/too small/);
  });
});

describe('installment plan drafts', () => {
  const base = { payee, totalAmountText: '300', count: 3, intervalDays: 30, title: 'Monthly retainer', description: 'Monthly design retainer.', now: NOW };

  it('spaces due dates by the interval and gives each installment its own grace window', () => {
    const drafts = planInstallments(base);
    expect(drafts.map((d) => d.dueAt)).toEqual([NOW, NOW + 30 * DAY, NOW + 60 * DAY]);
    expect(drafts.map((d) => d.expiresAt - d.dueAt)).toEqual([INSTALLMENT_GRACE_SECONDS, INSTALLMENT_GRACE_SECONDS, INSTALLMENT_GRACE_SECONDS]);
    expect(drafts.map((d) => d.amountText)).toEqual(['100', '100', '100']);
  });

  it('numbers titles and keeps them within the 80-character invoice limit', () => {
    const drafts = planInstallments({ ...base, title: 'x'.repeat(79) });
    expect(drafts[0].title.endsWith(' (1/3)')).toBe(true);
    expect(drafts.every((d) => d.title.length <= 80)).toBe(true);
    expect(drafts[2].title.length).toBeLessThanOrEqual(80);
    // The base invoice title itself is still capped by the existing 80-character rule.
    expect(() => planInstallments({ ...base, title: 'x'.repeat(81) })).toThrow(/2–80/);
  });

  it('rejects an out-of-range interval, a past start, and bad amounts', () => {
    expect(() => planInstallments({ ...base, intervalDays: 0 })).toThrow();
    expect(() => planInstallments({ ...base, intervalDays: 32 })).toThrow();
    expect(() => planInstallments({ ...base, firstDueAt: NOW - 1 })).toThrow(/past/);
    expect(() => planInstallments({ ...base, totalAmountText: '1.0000001' })).toThrow();
  });
});

describe('signed installment requests', () => {
  it('signs each installment, shares one plan ID, and every request verifies and decodes', async () => {
    const requests = await signInstallmentPlan(payer, { payee, totalAmountText: '75.5', count: 4, intervalDays: 7, title: 'Weekly stipend', description: 'Weekly contractor stipend.', now: NOW });
    expect(requests).toHaveLength(4);
    const planIds = new Set(requests.map((r) => r.schedule?.id));
    expect(planIds.size).toBe(1);
    expect(requests.map((r) => r.schedule?.index)).toEqual([0, 1, 2, 3]);
    expect(requests.every((r) => r.schedule?.count === 4)).toBe(true);
    const total = requests.reduce((sum, r) => sum + BigInt(r.amount), 0n);
    expect(total).toBe(75_500_000n);
    for (const request of requests) {
      expect(await verifyPaymentRequest(request)).toBe(true);
      const decoded = decodePaymentRequest(encodePaymentRequest(request), NOW);
      expect(decoded.schedule).toEqual(request.schedule);
    }
    expect(new Set(requests.map((r) => r.detailsHash)).size).toBe(4);
  });

  it('allows scheduled installments beyond the 30-day single-invoice window, but not beyond 400 days', async () => {
    const plan = await signInstallmentPlan(payer, { payee, totalAmountText: '60', count: 12, intervalDays: 31, title: 'Year of support', description: 'Yearly support plan.', now: NOW });
    const last = plan[11];
    expect(last.expiresAt - NOW).toBeGreaterThan(MAX_INVOICE_AGE_SECONDS);
    expect(last.expiresAt - NOW).toBeLessThanOrEqual(MAX_SCHEDULE_WINDOW_SECONDS);
    expect(() => validatePaymentRequest(last, NOW)).not.toThrow();

    // Stripping the schedule from a signed installment must not turn it into a valid 400-day single invoice.
    const stripped = { ...last, schedule: undefined };
    expect(() => validatePaymentRequest(stripped, NOW)).toThrow(/window|changed/i);

    const single = await signPaymentRequest({ account: payer, payee, amountText: '1', title: 'Single', description: 'One payment.', now: NOW, expiresAt: NOW + MAX_INVOICE_AGE_SECONDS });
    expect(single.schedule).toBeUndefined();
    expect(() => validatePaymentRequest({ ...single, expiresAt: NOW + MAX_INVOICE_AGE_SECONDS + 1 }, NOW)).toThrow();
  });

  it('refuses to sign an installment that expires before it is due', async () => {
    await expect(signPaymentRequest({
      account: payer, payee, amountText: '1', title: 'Late', description: 'Due later than expiry.', now: NOW,
      expiresAt: NOW + 2 * DAY,
      schedule: { id: `0x${'3'.repeat(64)}` as Hex, index: 0, count: 2, dueAt: NOW + 3 * DAY },
    })).rejects.toThrow(/before it is due/);
  });

  it('binds installment position and due date into the signed details', async () => {
    const [first, second] = await signInstallmentPlan(payer, { payee, totalAmountText: '20', count: 2, intervalDays: 1, title: 'Two parts', description: 'Two parts of work.', now: NOW });
    // Moving the second installment to position 0 must be rejected even though the signature is untouched.
    expect(() => validatePaymentRequest({ ...second, schedule: { ...second.schedule!, index: 0 } }, NOW)).toThrow(/changed/i);
    // Moving the due date must be rejected too.
    expect(() => validatePaymentRequest({ ...first, schedule: { ...first.schedule!, dueAt: first.schedule!.dueAt + DAY } }, NOW)).toThrow(/changed/i);
    // Swapping the amount must invalidate the signature.
    expect(await verifyPaymentRequest({ ...first, amount: '1000000' })).toBe(false);
  });

  it('rejects malformed schedules at the decode boundary', async () => {
    const [request] = await signInstallmentPlan(payer, { payee, totalAmountText: '10', count: 2, intervalDays: 2, title: 'Check', description: 'Shape checks.', now: NOW });
    const bad = [
      { ...request.schedule!, index: 2 },
      { ...request.schedule!, count: 13 },
      { ...request.schedule!, count: 0 },
      { ...request.schedule!, id: '0x1234' as Hex },
      { ...request.schedule!, dueAt: 0 },
    ];
    for (const schedule of bad) {
      expect(() => validatePaymentRequest({ ...request, schedule }, NOW)).toThrow();
    }
    expect(() => validatePaymentRequest({ ...request, schedule: 'x' }, NOW)).toThrow();
  });
});

describe('backward compatibility of single invoices', () => {
  it('keeps the original details encoding, so existing links still hash and verify', async () => {
    const request = await signPaymentRequest({ account: payer, payee, amountText: '12.5', title: 'Legacy link', description: 'Created before schedules.', now: NOW });
    const legacyHash = keccak256(stringToHex(JSON.stringify({ title: 'Legacy link', description: 'Created before schedules.' })));
    expect(request.detailsHash).toBe(legacyHash);
    expect(request.schedule).toBeUndefined();
    expect(await verifyPaymentRequest(request)).toBe(true);
  });
});
