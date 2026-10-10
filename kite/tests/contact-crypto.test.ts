import { describe, expect, it } from 'vitest';
import { decryptContactBook, encryptContactBook, type ContactRecord } from '../src/lib/crypto';

const root = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const contacts: ContactRecord[] = [{
  id: 'local-1',
  name: 'Mika Chen',
  address: '0x0000000000000000000000000000000000000001',
  country: 'Japan',
  currency: 'JPY',
  createdAt: 1_800_000_000,
}];

describe('Mera-derived contact-book encryption', () => {
  it('round-trips locally encrypted contacts without exposing plaintext in ciphertext', async () => {
    const vault = await encryptContactBook(root, contacts);
    expect(JSON.stringify(vault)).not.toContain('Mika Chen');
    expect(await decryptContactBook(root, vault)).toEqual(contacts);
  });

  it('uses a fresh nonce for every write', async () => {
    const one = await encryptContactBook(root, contacts);
    const two = await encryptContactBook(root, contacts);
    expect(one.iv).not.toBe(two.iv);
    expect(one.ciphertext).not.toBe(two.ciphertext);
  });

  it('rejects wrong keys and tampered ciphertext', async () => {
    const vault = await encryptContactBook(root, contacts);
    const wrongRoot = root.map((byte) => byte ^ 0xff);
    await expect(decryptContactBook(wrongRoot, vault)).rejects.toThrow(/unlock/i);
    const tampered = { ...vault, ciphertext: `${vault.ciphertext.slice(0, -1)}A` };
    await expect(decryptContactBook(root, tampered)).rejects.toThrow();
  });

  it('rejects malformed vaults and over-large contact lists', async () => {
    await expect(decryptContactBook(root, { version: 2 })).rejects.toThrow();
    await expect(encryptContactBook(root, Array.from({ length: 51 }, (_, i) => ({ ...contacts[0], id: String(i) })))).rejects.toThrow(/50/);
  });
});
