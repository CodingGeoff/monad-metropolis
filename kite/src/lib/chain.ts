import { createMonadPublicClient, AUSD_TESTNET, AUSD_FAUCET_TESTNET, MONAD_TESTNET_ID, ausdFaucetAbi, erc20Abi } from './config';
import { formatAUSD } from './invoices';
import { isAddress, parseUnits, type Address, type Hex } from 'viem';
import type { KiteAccount } from './account';

export type ChainSnapshot = {
  chainId: number;
  balance: bigint;
  monBalance: bigint;
  blockNumber: bigint;
  decimals: number;
  symbol: string;
};

export async function readWalletSnapshot(address: Address): Promise<ChainSnapshot> {
  const client = createMonadPublicClient();
  const [chainId, blockNumber, tokenCode, decimals, symbol, balance, monBalance] = await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getCode({ address: AUSD_TESTNET }),
    client.readContract({ address: AUSD_TESTNET, abi: erc20Abi, functionName: 'decimals' }),
    client.readContract({ address: AUSD_TESTNET, abi: erc20Abi, functionName: 'symbol' }),
    client.readContract({ address: AUSD_TESTNET, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    client.getBalance({ address }),
  ]);
  if (chainId !== MONAD_TESTNET_ID) throw new Error(`Wrong network: expected Monad Testnet (${MONAD_TESTNET_ID}), received ${chainId}.`);
  if (!tokenCode || tokenCode === '0x') throw new Error('Agora AUSD was not found at the configured Monad testnet address.');
  if (decimals !== 6 || symbol !== 'AUSD') throw new Error(`Unexpected token metadata (${symbol}, ${decimals} decimals).`);
  return { chainId, blockNumber, balance, monBalance, decimals, symbol };
}

export async function sendAUSD(account: KiteAccount, recipient: string, amountText: string): Promise<Hex> {
  if (!isAddress(recipient)) throw new Error('Enter a valid EVM address.');
  if (recipient.toLowerCase() === account.address.toLowerCase()) throw new Error('Choose a different recipient address.');
  const amount = parseUnits(amountText.trim(), 6);
  if (amount <= 0n || amount > 1_000_000n * 1_000_000n) throw new Error('Amount must be between 0.000001 and 1,000,000 AUSD.');
  const client = createMonadPublicClient();
  const chainId = await client.getChainId();
  if (chainId !== MONAD_TESTNET_ID) throw new Error('Refusing to send: the RPC is not connected to Monad testnet.');
  const balance = await client.readContract({ address: AUSD_TESTNET, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
  if (amount > balance) throw new Error(`Insufficient AUSD balance. Current balance: ${formatAUSD(balance)} AUSD.`);
  const { createKiteWalletClient } = await import('./account');
  const wallet = createKiteWalletClient(account);
  return wallet.writeContract({ address: AUSD_TESTNET, abi: erc20Abi, functionName: 'transfer', args: [recipient as Address, amount] });
}

export async function requestTestAUSD(account: KiteAccount): Promise<Hex> {
  const client = createMonadPublicClient();
  const chainId = await client.getChainId();
  if (chainId !== MONAD_TESTNET_ID) throw new Error('The Agora faucet is available only on Monad testnet.');
  const [faucetCode, faucetToken] = await Promise.all([
    client.getCode({ address: AUSD_FAUCET_TESTNET }),
    client.readContract({ address: AUSD_FAUCET_TESTNET, abi: ausdFaucetAbi, functionName: 'token' }),
  ]);
  if (!faucetCode || faucetCode === '0x' || faucetToken.toLowerCase() !== AUSD_TESTNET.toLowerCase()) {
    throw new Error('Agora faucet verification failed; no transaction was sent.');
  }
  const { createKiteWalletClient } = await import('./account');
  const wallet = createKiteWalletClient(account);
  return wallet.writeContract({ address: AUSD_FAUCET_TESTNET, abi: ausdFaucetAbi, functionName: 'requestFunds', args: [account.address] });
}

export async function getAUSDTransfers(address: Address, maxResults = 25) {
  try {
    const response = await fetch(`/api/envio/transfers?address=${encodeURIComponent(address)}`);
    if (response.ok) {
      const body = await response.json() as { source: 'envio'; transfers: Array<Record<string, unknown>> };
      const rows = body.transfers.map((item) => ({
        id: String(item.id),
        from: String(item.from) as Address,
        to: String(item.to) as Address,
        value: BigInt(String(item.value)),
        blockNumber: BigInt(String(item.blockNumber)),
        timestamp: Number(item.timestamp),
        hash: String(item.transactionHash) as Hex,
        source: 'envio' as const,
      }));
      return { source: 'envio' as const, transfers: rows.slice(0, maxResults) };
    }
  } catch {
    // A malformed or unavailable indexer response must not prevent the direct RPC fallback.
  }

  const client = createMonadPublicClient();
  const [head, fromBlock] = await client.getBlockNumber().then((block) => [block, block > 15_000n ? block - 15_000n : 0n] as const);
  const event = { type: 'event', name: 'Transfer', inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }] } as const;
  const [sent, received] = await Promise.all([
    client.getLogs({ address: AUSD_TESTNET, event, args: { from: address }, fromBlock, toBlock: head }),
    client.getLogs({ address: AUSD_TESTNET, event, args: { to: address }, fromBlock, toBlock: head }),
  ]);
  const rows = new Map<string, { id: string; from: Address; to: Address; value: bigint; blockNumber: bigint; timestamp?: number; hash: Hex; source: 'rpc' }>();
  for (const log of [...sent, ...received]) {
    if (!log.transactionHash || !log.args.from || !log.args.to || log.args.value === undefined) continue;
    const id = `${log.transactionHash}:${log.logIndex}`;
    rows.set(id, { id, from: log.args.from, to: log.args.to, value: log.args.value, blockNumber: log.blockNumber ?? 0n, hash: log.transactionHash, source: 'rpc' });
  }
  return { source: 'rpc' as const, transfers: [...rows.values()].sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1)).slice(0, maxResults) };
}
