import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { isAddress } from 'viem';
import { aiProviderStatus, aiRequestSchema, runAI } from './ai.js';

export type AppOptions = {
  /** Directory of the built SPA; only used when NODE_ENV=production. */
  staticDir?: string;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  const allowedRpcMethods = new Set([
    'eth_chainId', 'eth_blockNumber', 'eth_getBalance', 'eth_call', 'eth_estimateGas',
    'eth_sendRawTransaction', 'eth_getTransactionCount', 'eth_gasPrice', 'eth_maxPriorityFeePerGas',
    'eth_getTransactionReceipt', 'eth_getTransactionByHash', 'eth_getLogs', 'eth_getCode',
    'eth_feeHistory', 'web3_clientVersion', 'net_version',
  ]);

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

  function rpcUrl() {
    const alchemyKey = process.env.ALCHEMY_API_KEY?.trim();
    if (alchemyKey) return `https://monad-testnet.g.alchemy.com/v2/${encodeURIComponent(alchemyKey)}`;
    const fallback = process.env.MONAD_RPC_URL?.trim() || 'https://testnet-rpc.monad.xyz';
    const parsed = new URL(fallback);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid RPC protocol.');
    return parsed.toString();
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      chainId: 10143,
      rpcProvider: process.env.ALCHEMY_API_KEY?.trim() ? 'alchemy' : 'public',
      integrations: {
        envio: Boolean(process.env.ENVIO_GRAPHQL_URL),
        ai: aiProviderStatus(),
      },
    });
  });

  app.post('/api/rpc', rateLimit(300, 60_000), async (req, res) => {
    const payload = req.body;
    if (!payload || Array.isArray(payload) || typeof payload !== 'object' || payload.jsonrpc !== '2.0' || typeof payload.method !== 'string' || !Array.isArray(payload.params)) {
      res.status(400).json({ jsonrpc: '2.0', id: payload?.id ?? null, error: { code: -32600, message: 'Invalid JSON-RPC request.' } });
      return;
    }
    if (!allowedRpcMethods.has(payload.method)) {
      res.status(403).json({ jsonrpc: '2.0', id: payload.id ?? null, error: { code: -32601, message: 'RPC method not enabled.' } });
      return;
    }
    if (payload.method === 'eth_sendRawTransaction' && (typeof payload.params[0] !== 'string' || payload.params[0].length > 250_000)) {
      res.status(400).json({ jsonrpc: '2.0', id: payload.id ?? null, error: { code: -32602, message: 'Invalid signed transaction.' } });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18_000);
    try {
      const upstream = await fetch(rpcUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await upstream.text();
      res.status(upstream.status).type('application/json').send(body);
    } catch {
      res.status(502).json({ jsonrpc: '2.0', id: payload.id ?? null, error: { code: -32000, message: 'Monad RPC is temporarily unavailable.' } });
    } finally {
      clearTimeout(timeout);
    }
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
