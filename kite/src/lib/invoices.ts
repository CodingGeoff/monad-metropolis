import { isAddress, keccak256, parseUnits, stringToHex, verifyTypedData, type Address, type Hex, type LocalAccount } from 'viem';
import { AUSD_TESTNET, MONAD_TESTNET_ID } from './config';
import { base64UrlToBytes, bytesToBase64Url } from './crypto';

export const MAX_AUSD = 1_000_000n * 1_000_000n;
export const MAX_INVOICE_AGE_SECONDS = 30 * 24 * 60 * 60;
export const PAYMENT_REQUEST_DOMAIN = {
  name: 'Kite Invoice',
  version: '1',
  chainId: MONAD_TESTNET_ID,
  verifyingContract: AUSD_TESTNET,
} as const;

export const paymentRequestTypes = {
  PaymentRequest: [
    { name: 'invoiceId', type: 'bytes32' },
    { name: 'payee', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'detailsHash', type: 'bytes32' },
    { name: 'expiresAt', type: 'uint64' },
  ],
} as const;

export type PaymentRequest = {
  version: 1;
  chainId: 10143;
  token: Address;
  invoiceId: Hex;
  payee: Address;
  amount: string;
  title: string;
  description: string;
  detailsHash: Hex;
  expiresAt: number;
  signature: Hex;
};

export function parseAUSDAmount(input: string): bigint {
  const value = input.trim();
  if (!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,6})?$/.test(value)) throw new Error('Enter an amount from 0.000001 to 1,000,000 AUSD, with up to 6 decimal places.');
  const amount = parseUnits(value, 6);
  if (amount <= 0n || amount > MAX_AUSD) throw new Error('Amount must be greater than zero and no more than 1,000,000 AUSD.');
  return amount;
}

export function normalizeInvoiceCopy(title: string, description: string) {
  const cleanTitle = title.trim().replace(/\s+/g, ' ');
  const cleanDescription = description.trim().replace(/\s+/g, ' ');
  if (cleanTitle.length < 2 || cleanTitle.length > 80) throw new Error('Invoice title must be 2–80 characters.');
  if (cleanDescription.length < 4 || cleanDescription.length > 400) throw new Error('Invoice note must be 4–400 characters.');
  return { title: cleanTitle, description: cleanDescription };
}

function hashDetails(title: string, description: string): Hex {
  const copy = normalizeInvoiceCopy(title, description);
  // Fixed property order makes the signature hash reproducible across clients.
  return keccak256(stringToHex(JSON.stringify({ title: copy.title, description: copy.description })));
}

export async function signPaymentRequest(input: {
  account: LocalAccount;
  payee: Address;
  amountText: string;
  title: string;
  description: string;
  expiresAt?: number;
  now?: number;
}): Promise<PaymentRequest> {
  if (!isAddress(input.payee)) throw new Error('Enter a valid EVM wallet address.');
  const amount = parseAUSDAmount(input.amountText);
  const copy = normalizeInvoiceCopy(input.title, input.description);
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const expiresAt = input.expiresAt ?? now + 7 * 24 * 60 * 60;
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now + 60 || expiresAt > now + MAX_INVOICE_AGE_SECONDS) {
    throw new Error('Invoice expiry must be between 1 minute and 30 days from now.');
  }
  const invoiceId = `0x${Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')}` as Hex;
  const detailsHash = hashDetails(copy.title, copy.description);
  const message = { invoiceId, payee: input.payee, amount, detailsHash, expiresAt: BigInt(expiresAt) };
  const signature = await input.account.signTypedData({
    domain: PAYMENT_REQUEST_DOMAIN,
    types: paymentRequestTypes,
    primaryType: 'PaymentRequest',
    message,
  });
  return {
    version: 1,
    chainId: MONAD_TESTNET_ID,
    token: AUSD_TESTNET,
    invoiceId,
    payee: input.payee,
    amount: amount.toString(),
    title: copy.title,
    description: copy.description,
    detailsHash,
    expiresAt,
    signature,
  };
}

export function validatePaymentRequest(value: unknown, now = Math.floor(Date.now() / 1000)): PaymentRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payment request is malformed.');
  const item = value as Partial<PaymentRequest>;
  if (item.version !== 1 || item.chainId !== MONAD_TESTNET_ID || item.token?.toLowerCase() !== AUSD_TESTNET.toLowerCase()) throw new Error('This link is not a Kite request for Monad testnet AUSD.');
  if (!item.invoiceId || !/^0x[0-9a-fA-F]{64}$/.test(item.invoiceId)) throw new Error('Payment request ID is invalid.');
  if (!item.payee || !isAddress(item.payee)) throw new Error('Payment recipient is invalid.');
  if (!item.amount || !/^\d{1,13}$/.test(item.amount) || BigInt(item.amount) <= 0n || BigInt(item.amount) > MAX_AUSD) throw new Error('Payment amount is invalid.');
  if (typeof item.expiresAt !== 'number' || !Number.isSafeInteger(item.expiresAt) || item.expiresAt <= now) throw new Error('This payment request has expired.');
  if (item.expiresAt > now + MAX_INVOICE_AGE_SECONDS) throw new Error('Payment request expiry is outside the allowed window.');
  if (typeof item.title !== 'string' || typeof item.description !== 'string') throw new Error('Payment request description is invalid.');
  const copy = normalizeInvoiceCopy(item.title, item.description);
  if (!item.detailsHash || !/^0x[0-9a-fA-F]{64}$/.test(item.detailsHash) || hashDetails(copy.title, copy.description).toLowerCase() !== item.detailsHash.toLowerCase()) {
    throw new Error('Invoice details have changed since they were signed.');
  }
  if (!item.signature || !/^0x[0-9a-fA-F]{130}$/.test(item.signature)) throw new Error('Invoice signature is invalid.');
  return { ...item, ...copy, token: AUSD_TESTNET, payee: item.payee, signature: item.signature as Hex } as PaymentRequest;
}

export async function verifyPaymentRequest(request: PaymentRequest): Promise<boolean> {
  try {
    return await verifyTypedData({
      address: request.payee,
      domain: PAYMENT_REQUEST_DOMAIN,
      types: paymentRequestTypes,
      primaryType: 'PaymentRequest',
      message: {
        invoiceId: request.invoiceId,
        payee: request.payee,
        amount: BigInt(request.amount),
        detailsHash: request.detailsHash,
        expiresAt: BigInt(request.expiresAt),
      },
      signature: request.signature,
    });
  } catch {
    return false;
  }
}

export function encodePaymentRequest(request: PaymentRequest): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(request)));
}

export function decodePaymentRequest(encoded: string, now = Math.floor(Date.now() / 1000)): PaymentRequest {
  if (!encoded || encoded.length > 6000) throw new Error('Payment link is too long or empty.');
  const bytes = base64UrlToBytes(encoded);
  if (bytes.length > 4000) throw new Error('Payment request is too large.');
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  return validatePaymentRequest(value, now);
}

export function createShareUrl(request: PaymentRequest, origin: string): string {
  const url = new URL('/pay', origin);
  url.searchParams.set('r', encodePaymentRequest(request));
  return url.toString();
}

export function formatAUSD(amount: bigint | string): string {
  const raw = typeof amount === 'bigint' ? amount : BigInt(amount);
  const dollars = raw / 1_000_000n;
  const fraction = (raw % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${dollars.toLocaleString('en-US')}.${fraction}` : dollars.toLocaleString('en-US');
}

export function amountToCurrencyMinor(amount: bigint, currency: string, usdPerUnit: number): string {
  if (!Number.isFinite(usdPerUnit) || usdPerUnit <= 0) throw new Error('Invalid reference exchange rate.');
  const usd = Number(amount) / 1_000_000;
  const value = usd / usdPerUnit;
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND', 'CLP']).has(currency.toUpperCase());
  return (value * (zeroDecimal ? 1 : 100)).toFixed(0);
}
