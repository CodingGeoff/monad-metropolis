import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { isAddress } from 'viem';
import { aiProviderStatus, aiRequestSchema, runAI } from './ai.js';
import { createMonadRpcForwarder, getRpcProviderStatus, normalizeRpcRequest } from './rpc.js';

export type AppOptions = {
  /** Directory of the built SPA; only used when NODE_ENV=production. */
  staticDir?: string;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  // Read-only surface this app's viem client actually needs. Wallet-level calls
  // (`eth_accounts`, `eth_signTransaction`, `personal_*`, `wallet_*`) and node
  // management (`debug_*`, `admin_*`, `txpool_*`) stay blocked.
  //
  // `eth_getBlockByNumber` must remain listed: viem's write path (writeContract ->
  // sendTransaction -> prepareTransactionRequest) reads the latest block to infer
  // the transaction type and to estimate EIP-1559 fees. Without it every signed
  // action — the "Test AUSD" faucet claim, "Send AUSD" and invoice settlement —
  // fails in the browser with a -32601 `MethodNotFoundRpcError` that looks like a
  // wallet problem even though the signature never left the page.
  const allowedRpcMethods = new Set([
    'eth_chainId', 'eth_blockNumber', 'eth_getBalance', 'eth_call', 'eth_estimateGas',
    'eth_sendRawTransaction', 'eth_getTransactionCount', 'eth_gasPrice', 'eth_maxPriorityFeePerGas',
    'eth_getTransactionReceipt', 'eth_getTransactionByHash', 'eth_getLogs', 'eth_getCode',
    'eth_feeHistory', 'eth_getBlockByNumber', 'eth_getBlockByHash', 'web3_clientVersion', 'net_version',
  ]);
  const forwardRpc = createMonadRpcForwarder();
  let generatedRpcId = 0;

  // Small process-local limits are a guardrail for the hackathon demo; use a shared store at scale.
  const rateBuckets = new Map<string, { count: number; expiresAt: number }>();
  function rateLimit(maxRequests: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const now = Date.now();
      const key = `${req.path}:${req.ip ?? 'unknown'}`;
      let bucket = rateBuckets.get(key);
      if (!bucket || bucket.expiresAt <= now) {
        bucket = { count: 0, expiresAt: now + windowMs };
        rateBuckets.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count > maxRequests) {
        res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
        return;
      }
      if (rateBuckets.size > 5000) {
        for (const [bucketKey, entry] of rateBuckets) if (entry.expiresAt <= now) rateBuckets.delete(bucketKey);
      }
      next();
    };
  }

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('x-frame-options', 'DENY');
      res.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    }
    next();
  });
  app.use('/api', rateLimit(180, 60_000));
  app.use(express.json({ limit: '512kb', strict: true }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      chainId: 10143,
      ...getRpcProviderStatus(),
      integrations: {
        envio: Boolean(process.env.ENVIO_GRAPHQL_URL),
        ai: aiProviderStatus(),
      },
    });
  });

  app.post('/api/rpc', rateLimit(300, 60_000), async (req, res) => {
    const validation = normalizeRpcRequest(req.body, allowedRpcMethods, `kite-request-${++generatedRpcId}`);
    if (!validation.ok) {
      const forbidden = validation.code === -32601;
      res.status(forbidden ? 403 : 400).json({
        jsonrpc: '2.0',
        id: validation.id,
        error: { code: validation.code, message: validation.message },
      });
      return;
    }

    const { request } = validation;
    if (request.method === 'eth_sendRawTransaction'
      && (!Array.isArray(request.params) || typeof request.params[0] !== 'string' || !/^0x(?:[0-9a-fA-F]{2})+$/.test(request.params[0]) || request.params[0].length > 250_000)) {
      res.status(400).json({ jsonrpc: '2.0', id: request.id, error: { code: -32602, message: 'Invalid signed transaction.' } });
      return;
    }

    const result = await forwardRpc(request);
    res.setHeader('x-kite-rpc-attempts', String(result.attempts));
    if (!result.ok) {
      res.status(502).json({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32000,
          message: request.method === 'eth_sendRawTransaction'
            ? 'All Monad testnet RPC providers are temporarily unavailable. Transaction status may be uncertain; check MonadScan before retrying.'
            : 'All Monad testnet RPC providers are temporarily unavailable. Please retry shortly.',
        },
      });
      return;
    }

    res.setHeader('x-kite-rpc-provider', result.provider);
    res.setHeader('x-kite-rpc-fallback-used', result.fallbackUsed ? 'true' : 'false');
    res.status(result.status).json(result.body);
  });

  const transferSelection = `
    id from to value chainId blockNumber timestamp transactionHash
  `;
  app.get('/api/envio/transfers', async (req, res) => {
    const address = String(req.query.address ?? '');
    if (!isAddress(address)) {
      res.status(400).json({ error: 'A valid EVM address is required.' });
      return;
    }
    const endpoint = process.env.ENVIO_GRAPHQL_URL?.trim();
    if (!endpoint) {
      res.status(503).json({ error: 'Envio is not configured.' });
      return;
    }
    let target: URL;
    try {
      target = new URL(endpoint);
      if (target.protocol !== 'https:' && target.hostname !== 'localhost') throw new Error('HTTPS required');
    } catch {
      res.status(500).json({ error: 'The configured Envio URL is invalid.' });
      return;
    }
    const query = `query KiteTransfers($from: String!, $to: String!, $chainId: Int!) {
      sent: Transfer(where: {from: {_eq: $from}, chainId: {_eq: $chainId}}, order_by: {blockNumber: desc}, limit: 25) { ${transferSelection} }
      received: Transfer(where: {to: {_eq: $to}, chainId: {_eq: $chainId}}, order_by: {blockNumber: desc}, limit: 25) { ${transferSelection} }
    }`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const upstream = await fetch(target, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables: { from: address.toLowerCase(), to: address.toLowerCase(), chainId: 10143 } }),
        signal: controller.signal,
      });
      if (!upstream.ok) throw new Error(`Envio returned HTTP ${upstream.status}`);
      const body = await upstream.json() as { data?: { sent?: unknown[]; received?: unknown[] }; errors?: unknown[] };
      if (body.errors?.length || !body.data) throw new Error('Envio GraphQL query failed.');
      const rows = [...(body.data.sent ?? []), ...(body.data.received ?? [])] as Array<Record<string, unknown>>;
      const unique = new Map<string, Record<string, unknown>>();
      for (const row of rows) {
        if (typeof row.id === 'string' && typeof row.from === 'string' && typeof row.to === 'string' && typeof row.value === 'string' && typeof row.transactionHash === 'string') {
          unique.set(row.id, row);
        }
      }
      const transfers = [...unique.values()].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)).slice(0, 25);
      res.json({ source: 'envio', transfers });
    } catch {
      res.status(502).json({ error: 'Could not read the Envio indexer. The app will fall back to direct Monad logs.' });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.post('/api/ai', rateLimit(12, 60_000), async (req, res) => {
    const parsed = aiRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid AI request. Check the text and try again.' });
      return;
    }
    try {
      const output = await runAI(parsed.data);
      res.json(output);
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 502;
      const message = error instanceof Error ? error.message : 'AI service is unavailable.';
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production' && options.staticDir) {
    const dist = options.staticDir;
    app.use(express.static(dist, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  return app;
}
