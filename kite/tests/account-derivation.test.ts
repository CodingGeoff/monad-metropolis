import { describe, expect, it } from 'vitest';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { createSecp256k1SigningSession, getEvmAddress } from '@category-labs/mera';

function deriveAddress(prf: Uint8Array) {
  const mnemonic = entropyToMnemonic(prf, wordlist);
  const seed = mnemonicToSeedSync(mnemonic);
  const node = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0");
  if (!node.privateKey) throw new Error('Missing test private key');
  const secret = new Uint8Array(node.privateKey);
  const session = createSecp256k1SigningSession({ privateKey: secret });
  const address = getEvmAddress(session.publicKey);
  session.end();
  secret.fill(0);
  seed.fill(0);
  node.privateKey.fill(0);
  return address;
}

describe('Mera passkey account derivation', () => {
  it('is deterministic for the same 32-byte PRF output and changes for another output', () => {
    const first = Uint8Array.from({ length: 32 }, (_, index) => index);
    const second = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    expect(deriveAddress(first)).toBe(deriveAddress(first));
    expect(deriveAddress(first)).not.toBe(deriveAddress(second));
  });

  it('owns an independent signing-key copy and refuses to sign after the session ends', async () => {
    const callerKey = new Uint8Array(32);
    callerKey[31] = 1;
    const session = createSecp256k1SigningSession({ privateKey: callerKey });
    callerKey.fill(0);

    const signature = await session.signDigest(new Uint8Array(32));
    expect(signature.compact).toHaveLength(64);
    expect([0, 1]).toContain(signature.recovery);
    session.end();
    await expect(session.signDigest(new Uint8Array(32))).rejects.toThrow(/ended/i);
  });
});
