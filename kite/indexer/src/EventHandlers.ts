import { indexer, type Transfer } from 'envio';

indexer.onEvent(
  {
    contract: 'AUSD',
    event: 'Transfer',
  },
  async ({ event, context }) => {
    const transfer: Transfer = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from.toLowerCase(),
      to: event.params.to.toLowerCase(),
      value: event.params.value,
      chainId: event.chainId,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash.toLowerCase(),
    };
    context.Transfer.set(transfer);
  },
);
