import { formatUnits, isAddress, type Address, type Hex, type LocalAccount } from 'viem';
import { MAX_SCHEDULE_INSTALLMENTS, normalizeInvoiceCopy, parseAUSDAmount, signPaymentRequest, type PaymentRequest } from './invoices';

export const MIN_INSTALLMENTS = 2;
export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 31;
/** Each installment stays payable for this long after its due date. */
export const INSTALLMENT_GRACE_SECONDS = 7 * 24 * 60 * 60;
const DAY = 24 * 60 * 60;

export type InstallmentPlanInput = {
  payee: Address;
  totalAmountText: string;
  count: number;
  intervalDays: number;
  title: string;
  description: string;
  firstDueAt?: number;
  now?: number;
};

export type InstallmentDraft = {
  index: number;
  count: number;
  dueAt: number;
  expiresAt: number;
  amountText: string;
  title: string;
  description: string;
};

/**
 * Splits a total into `count` exact six-decimal parts. Any remainder goes to the final
 * installment, so the parts always sum to the total with no floating-point rounding.
 */
export function splitInstallments(totalUnits: bigint, count: number): bigint[] {
  if (!Number.isSafeInteger(count) || count < MIN_INSTALLMENTS || count > MAX_SCHEDULE_INSTALLMENTS) {
    throw new Error(`A payment plan has ${MIN_INSTALLMENTS}–${MAX_SCHEDULE_INSTALLMENTS} installments.`);
  }
  if (totalUnits < BigInt(count)) throw new Error('The total is too small to split into that many installments.');
  const base = totalUnits / BigInt(count);
  const remainder = totalUnits - base * BigInt(count);
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? base + remainder : base));
}

function titleFor(title: string, index: number, count: number) {
  const suffix = ` (${index + 1}/${count})`;
  const base = title.trim().replace(/\s+/g, ' ').slice(0, 80 - suffix.length).trimEnd();
  return `${base}${suffix}`;
}

/** Deterministic plan, independent of signing. Used for previews and tests. */
export function planInstallments(input: InstallmentPlanInput): InstallmentDraft[] {
  if (!Number.isSafeInteger(input.intervalDays) || input.intervalDays < MIN_INTERVAL_DAYS || input.intervalDays > MAX_INTERVAL_DAYS) {
    throw new Error(`Installments must be ${MIN_INTERVAL_DAYS}–${MAX_INTERVAL_DAYS} days apart.`);
  }
  const total = parseAUSDAmount(input.totalAmountText);
  const parts = splitInstallments(total, input.count);
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const firstDueAt = input.firstDueAt ?? now;
  if (!Number.isSafeInteger(firstDueAt) || firstDueAt < now) throw new Error('The first installment cannot be due in the past.');
  normalizeInvoiceCopy(input.title, input.description);
  return parts.map((part, index) => {
    const dueAt = firstDueAt + index * input.intervalDays * DAY;
    return {
      index,
      count: input.count,
      dueAt,
      expiresAt: dueAt + INSTALLMENT_GRACE_SECONDS,
      amountText: formatUnits(part, 6),
      title: titleFor(input.title, index, input.count),
      description: input.description,
    };
  });
}

/** Opaque, random plan identifier. It is not derived from the payee or amount. */
export function newScheduleId(): Hex {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

export async function signInstallmentPlan(account: LocalAccount, input: InstallmentPlanInput): Promise<PaymentRequest[]> {
  if (!isAddress(input.payee)) throw new Error('Enter a valid EVM wallet address.');
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const drafts = planInstallments({ ...input, now });
  const scheduleId = newScheduleId();
  const requests: PaymentRequest[] = [];
  for (const draft of drafts) {
    requests.push(await signPaymentRequest({
      account,
      payee: input.payee,
      amountText: draft.amountText,
      title: draft.title,
      description: draft.description,
      expiresAt: draft.expiresAt,
      now,
      schedule: { id: scheduleId, index: draft.index, count: draft.count, dueAt: draft.dueAt },
    }));
  }
  return requests;
}
