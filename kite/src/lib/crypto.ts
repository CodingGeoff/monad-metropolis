const encoder = new TextEncoder();
const CONTACTBOOK_SALT = encoder.encode('kite.mera.contactbook.salt.v1');
const CONTACTBOOK_INFO = encoder.encode('kite.mera.contactbook.aes-gcm.v1');
const CONTACTBOOK_AAD = encoder.encode('kite:contacts:v1');

export type ContactRecord = {
  id: string;
  name: string;
  address: `0x${string}`;
  country: string;
  currency: string;
  createdAt: number;
};

export type EncryptedContactBook = {
  version: 1;
  algorithm: 'AES-GCM-256/HKDF-SHA-256';
  iv: string;
  ciphertext: string;
};

function requireWebCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw new Error('Secure browser cryptography is unavailable.');
  return globalThis.crypto;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length > 100_000) throw new Error('Invalid encoded data.');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveContactKey(prfRoot: Uint8Array): Promise<CryptoKey> {
  if (prfRoot.length !== 32) throw new Error('Invalid passkey-derived key material.');
  const crypto = requireWebCrypto();
  const material = await crypto.subtle.importKey('raw', prfRoot, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: CONTACTBOOK_SALT, info: CONTACTBOOK_INFO },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptContactBook(prfRoot: Uint8Array, contacts: ContactRecord[]): Promise<EncryptedContactBook> {
  if (!Array.isArray(contacts) || contacts.length > 50) throw new Error('A contact book can contain at most 50 contacts.');
  const crypto = requireWebCrypto();
  const key = await deriveContactKey(prfRoot);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(contacts));
  try {
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: CONTACTBOOK_AAD }, key, plaintext);
    return {
      version: 1,
      algorithm: 'AES-GCM-256/HKDF-SHA-256',
      iv: bytesToBase64Url(iv),
      ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
    };
  } finally {
    plaintext.fill(0);
  }
}

export async function decryptContactBook(prfRoot: Uint8Array, value: unknown): Promise<ContactRecord[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Encrypted contact book is malformed.');
  const vault = value as Partial<EncryptedContactBook>;
  if (vault.version !== 1 || vault.algorithm !== 'AES-GCM-256/HKDF-SHA-256' || typeof vault.iv !== 'string' || typeof vault.ciphertext !== 'string') {
    throw new Error('Unsupported encrypted contact-book format.');
  }
  const iv = base64UrlToBytes(vault.iv);
  const ciphertext = base64UrlToBytes(vault.ciphertext);
  if (iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > 150_000) throw new Error('Encrypted contact book is invalid.');
  const crypto = requireWebCrypto();
  const key = await deriveContactKey(prfRoot);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: CONTACTBOOK_AAD }, key, ciphertext);
  } catch {
    throw new Error('Could not unlock these contacts with this passkey.');
  }
  const plaintext = new Uint8Array(plain);
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (!Array.isArray(parsed) || parsed.length > 50) throw new Error('Contact data is invalid.');
    return parsed.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('Contact data is invalid.');
      const c = item as Partial<ContactRecord>;
      if (typeof c.id !== 'string' || typeof c.name !== 'string' || typeof c.address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(c.address) || typeof c.country !== 'string' || typeof c.currency !== 'string' || typeof c.createdAt !== 'number') {
        throw new Error('Contact data is invalid.');
      }
      return { id: c.id, name: c.name.slice(0, 70), address: c.address as `0x${string}`, country: c.country.slice(0, 60), currency: c.currency.slice(0, 8), createdAt: c.createdAt };
    });
  } finally {
    plaintext.fill(0);
  }
}
