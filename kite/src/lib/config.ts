import { defineChain, http, createPublicClient } from 'viem';

export const MONAD_TESTNET_ID = 10143;
export const MONAD_TESTNET_RPC = 'https://testnet-rpc.monad.xyz';
export const TESTNET_EXPLORER = 'https://testnet.monadscan.com';
export const AUSD_TESTNET = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC' as const;
export const AUSD_FAUCET_TESTNET = '0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C' as const;

export const monadTestnet = defineChain({
  id: MONAD_TESTNET_ID,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET_RPC] } },
  blockExplorers: { default: { name: 'Monadscan', url: TESTNET_EXPLORER } },
  testnet: true,
});

export const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'event', name: 'Transfer', anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }] },
] as const;

export const ausdFaucetAbi = [
  { type: 'function', name: 'token', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'requestFunds', stateMutability: 'nonpayable', inputs: [{ name: '_receiver', type: 'address' }], outputs: [] },
] as const;

export function createMonadPublicClient() {
  // The same-origin API performs provider failover server-side. Disable nested viem
  // retries so one logical read does not multiply the proxy's bounded attempts.
  const rpc = typeof window === 'undefined' ? MONAD_TESTNET_RPC : `${window.location.origin}/api/rpc`;
  return createPublicClient({
    chain: monadTestnet,
    transport: http(rpc, { timeout: 45_000, retryCount: 0 }),
  });
}
