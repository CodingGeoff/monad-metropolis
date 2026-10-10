import { describe, expect, it } from 'vitest';
import { createTestIndexer } from 'envio';
import '../src/EventHandlers';

const sender = '0x00000000000000000000000000000000000000a1' as const;
const recipient = '0x00000000000000000000000000000000000000b2' as const;
const token = '0xa9012a055bd4e0edfF8ce09f960291c09d5322dc' as const;
const txHash = `0x${'ab'.repeat(32)}` as const;
const deploymentBlock = 5_726_771;

describe('Envio AUSD Transfer handler', () => {
  it('normalizes addresses and stores each event with chain, block and transaction identity', async () => {
    const testIndexer = createTestIndexer();
    await testIndexer.process({
      chains: {
        10143: {
          startBlock: deploymentBlock,
          endBlock: deploymentBlock,
          simulate: [{
            contract: 'AUSD',
            event: 'Transfer',
            srcAddress: token,
            logIndex: 7,
            block: { number: deploymentBlock, timestamp: 1_800_000_000 },
            transaction: { hash: txHash },
            params: { from: sender, to: recipient, value: 25_500_000n },
          }],
        },
      },
    });

    const transfers = await testIndexer.Transfer.getAll();
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toEqual({
      id: `10143_${deploymentBlock}_7`,
      from: sender,
      to: recipient,
      value: 25_500_000n,
      chainId: 10143,
      blockNumber: deploymentBlock,
      timestamp: 1_800_000_000,
      transactionHash: txHash,
    });
  });
});
