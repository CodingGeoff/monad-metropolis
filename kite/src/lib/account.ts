import {
  createPasskeyWithPrfOutput,
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
  type PasskeyCredentialMetadata,
  type Secp256k1SigningSession,
} from '@category-labs/mera';
import { toViemAccount } from '@category-labs/mera/viem';
import { HDKey } from '@scure/bip32';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { createWalletClient, http, type LocalAccount } from 'viem';
import { getEvmAddress } from '@category-labs/mera';
import { monadTestnet } from './config';

const DERIVATION_PATH = "m/44'/60'/0'/0/0";
const META_KEY = 'kite:mera-credential:v1';

function relyingParty() {
  const id = import.meta.env.VITE_MERA_RP_ID || window.location.hostname;
  return { id, name: 'Kite Payments' };
}

export type KiteAccount = {
  address: `0x${string}`;
  credential: PasskeyCredentialMetadata;
  account: LocalAccount<'mera'>;
  signingSession: Secp256k1SigningSession;
  /** Kept only in memory; zeroed when lock() is called. */
  prfRoot: Uint8Array;
  lock: () => void;
};

function deriveSigningSession(prfOutput: Uint8Array): { session: Secp256k1SigningSession; account: LocalAccount<'mera'>; address: `0x${string}` } {
  if (prfOutput.length !== 32) throw new Error('The passkey did not return the expected 32-byte PRF output.');
  const entropy = new Uint8Array(prfOutput);
  let mnemonic = '';
  let seed: Uint8Array | undefined;
  let privateKey: Uint8Array | undefined;
  let hdKey: HDKey | undefined;
  try {
    mnemonic = entropyToMnemonic(entropy, wordlist);
    seed = mnemonicToSeedSync(mnemonic);
    hdKey = HDKey.fromMasterSeed(seed).derive(DERIVATION_PATH);
    if (!hdKey.privateKey) throw new Error('Passkey account derivation failed.');
    privateKey = new Uint8Array(hdKey.privateKey);
    const session = createSecp256k1SigningSession({ privateKey });
    try {
      const account = toViemAccount(session);
      const address = getEvmAddress(session.publicKey) as `0x${string}`;
      return { session, account, address };
    } catch (error) {
      session.end();
      throw error;
    }
  } finally {
    entropy.fill(0);
    seed?.fill(0);
    privateKey?.fill(0);
    if (hdKey?.privateKey) hdKey.privateKey.fill(0);
    mnemonic = '';
  }
}

function saveCredential(credential: PasskeyCredentialMetadata) {
  // Credential metadata is an optional hint, not a secret or a dependency for account derivation.
  try { localStorage.setItem(META_KEY, JSON.stringify(credential)); } catch { /* passkey discovery may still work without local storage */ }
}

function loadCredential(): PasskeyCredentialMetadata | undefined {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<PasskeyCredentialMetadata>;
    if (typeof parsed.credentialId !== 'string' || parsed.credentialId.length < 8 || parsed.credentialId.length > 2048) return undefined;
    const transports = Array.isArray(parsed.transports) ? parsed.transports.filter((item): item is string => typeof item === 'string' && item.length < 40) : undefined;
    return { credentialId: parsed.credentialId, ...(transports ? { transports } : {}) };
  } catch {
    return undefined;
  }
}

function toKiteAccount(prfOutput: Uint8Array, credential: PasskeyCredentialMetadata): KiteAccount {
  const prfRoot = new Uint8Array(prfOutput);
  let derivation: ReturnType<typeof deriveSigningSession>;
  try {
    derivation = deriveSigningSession(prfRoot);
  } catch (error) {
    prfRoot.fill(0);
    throw error;
  } finally {
    prfOutput.fill(0);
  }
  let locked = false;
  return {
    ...derivation,
    credential,
    prfRoot,
    get address() { return derivation.address; },
    get account() { return derivation.account; },
    get signingSession() { return derivation.session; },
    lock() {
      if (locked) return;
      locked = true;
      derivation.session.end();
      prfRoot.fill(0);
    },
  };
}

export async function createPasskeyAccount(displayName: string): Promise<KiteAccount> {
  const name = displayName.trim().slice(0, 64) || 'Kite user';
  const result = await createPasskeyWithPrfOutput({
    rp: relyingParty(),
    user: { name, displayName: name },
  });
  const credential: PasskeyCredentialMetadata = {
    credentialId: result.credentialId,
    ...(result.transports ? { transports: result.transports } : {}),
  };
  const account = toKiteAccount(result.prfOutput, credential);
  saveCredential(credential);
  return account;
}

export async function signInWithPasskey(): Promise<KiteAccount> {
  const credential = loadCredential();
  const result = await getPasskeyPrfOutput({
    rpId: relyingParty().id,
    ...(credential ? { credential } : {}),
  });
  const selectedCredential = { credentialId: result.credentialId, ...(credential?.transports ? { transports: credential.transports } : {}) };
  const account = toKiteAccount(result.prfOutput, selectedCredential);
  saveCredential(selectedCredential);
  return account;
}

export function createKiteWalletClient(kiteAccount: KiteAccount) {
  return createWalletClient({
    account: kiteAccount.account,
    chain: monadTestnet,
    // The server retries across testnet endpoints; keep viem from resending an
    // ambiguous write while still allowing the proxy's same-byte broadcast fallback.
    transport: http(`${window.location.origin}/api/rpc`, { timeout: 45_000, retryCount: 0 }),
  });
}

export function forgetCredential() {
  try { localStorage.removeItem(META_KEY); } catch { /* nothing is stored when local storage is unavailable */ }
}
