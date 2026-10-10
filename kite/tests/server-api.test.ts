import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../server/app';

// Upstream providers (RPC, Envio, Kimi/Qwen/Hunyuan) are stubbed; only the local test server is real.
const realFetch = globalThis.fetch;
const ENV_KEYS = [
  'ALCHEMY_API_KEY', 'MONAD_RPC_URL', 'ENVIO_GRAPHQL_URL',
  'KIMI_API_KEY', 'KIMI_BASE_URL', 'KIMI_MODEL', 'MOONSHOT_API_KEY',
  'QWEN_API_KEY', 'QWEN_BASE_URL', 'QWEN_MODEL', 'DASHSCOPE_API_KEY',
  'HUNYUAN_API_KEY', 'HUNYUAN_BASE_URL', 'HUNYUAN_MODEL', 'TOKENHUB_API_KEY',
] as const;
const savedEnv: Partial<Record<string, string | undefined>> = {};

type Upstream = { url: string; init?: RequestInit };
let upstreamCalls: Upstream[] = [];
let upstreamHandler: (url: string, init?: RequestInit) => Response | Promise<Response> = () => new Response('{}', { status: 500 });

let server: Server;
let base: string;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function post(path: string, body: unknown) {
  return realFetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

beforeAll(async () => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith('http://127.0.0.1')) return realFetch(input, init);
    upstreamCalls.push({ url, init });
    return Promise.resolve(upstreamHandler(url, init));
  }) as typeof fetch;
  server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  upstreamCalls = [];
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('health endpoint', () => {
  it('reports public RPC and disabled integrations when nothing is configured', async () => {
    const body = await (await realFetch(`${base}/api/health`)).json() as Record<string, unknown>;
    expect(body).toEqual({
      status: 'ok',
      chainId: 10143,
      rpcProvider: 'public',
      integrations: { envio: false, ai: { kimi: false, qwen: false, hunyuan: false } },
    });
  });

  it('reports Alchemy and configured providers without ever echoing a key', async () => {
    process.env.ALCHEMY_API_KEY = 'alchemy-secret-123456';
    process.env.KIMI_API_KEY = 'sk-kimi-secret-987654';
    process.env.ENVIO_GRAPHQL_URL = 'https://indexer.example/v1/graphql';
    const res = await realFetch(`${base}/api/health`);
    const text = await res.text();
    const body = JSON.parse(text) as { rpcProvider: string; integrations: { envio: boolean; ai: Record<string, boolean> } };
    expect(body.rpcProvider).toBe('alchemy');
    expect(body.integrations).toEqual({ envio: true, ai: { kimi: true, qwen: false, hunyuan: false } });
    expect(text).not.toContain('alchemy-secret');
    expect(text).not.toContain('sk-kimi-secret');
  });
});

describe('JSON-RPC proxy', () => {
  it('routes allowed reads through Alchemy when the server key is set, keeping the key out of the response', async () => {
    process.env.ALCHEMY_API_KEY = 'alchemy-secret-123456';
    upstreamHandler = () => json({ jsonrpc: '2.0', id: 7, result: '0x279f' });
    const res = await post('/api/rpc', { jsonrpc: '2.0', id: 7, method: 'eth_chainId', params: [] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x279f' });
    expect(upstreamCalls).toHaveLength(1);
    expect(upstreamCalls[0].url).toBe('https://monad-testnet.g.alchemy.com/v2/alchemy-secret-123456');
    expect(upstreamCalls[0].init?.body).toBe(JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'eth_chainId', params: [] }));
  });

  it('falls back to MONAD_RPC_URL, and rejects non-HTTP(S) fallbacks', async () => {
    upstreamHandler = () => json({ jsonrpc: '2.0', id: 1, result: '0x1' });
    process.env.MONAD_RPC_URL = 'https://rpc.example.test/monad';
    await post('/api/rpc', { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });
    expect(upstreamCalls.at(-1)?.url).toBe('https://rpc.example.test/monad');

    process.env.MONAD_RPC_URL = 'file:///etc/passwd';
    const bad = await post('/api/rpc', { jsonrpc: '2.0', id: 2, method: 'eth_blockNumber', params: [] });
    expect(bad.status).toBe(502);
  });

  it('blocks wallet-level and unknown methods and malformed payloads', async () => {
    const blocked = await post('/api/rpc', { jsonrpc: '2.0', id: 3, method: 'eth_accounts', params: [] });
    expect(blocked.status).toBe(403);
    const unknown = await post('/api/rpc', { jsonrpc: '2.0', id: 4, method: 'debug_traceTransaction', params: [] });
    expect(unknown.status).toBe(403);
    const notArray = await post('/api/rpc', { jsonrpc: '2.0', id: 5, method: 'eth_chainId', params: {} });
    expect(notArray.status).toBe(400);
    const oversized = await post('/api/rpc', { jsonrpc: '2.0', id: 6, method: 'eth_sendRawTransaction', params: ['0x' + 'a'.repeat(250_001)] });
    expect(oversized.status).toBe(400);
    expect(upstreamCalls).toHaveLength(0);
  });

  it('accepts viem-style requests that omit params (e.g. eth_blockNumber) and normalizes them', async () => {
    upstreamHandler = () => json({ jsonrpc: '2.0', id: 9, result: '0x10' });
    const res = await post('/api/rpc', { jsonrpc: '2.0', id: 9, method: 'eth_blockNumber' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ jsonrpc: '2.0', id: 9, result: '0x10' });
    expect(upstreamCalls.at(-1)?.init?.body).toBe(JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'eth_blockNumber', params: [] }));
  });

  it('allows block reads that viem uses for EIP-1559 fee estimation and transaction waiting', async () => {
    upstreamHandler = () => json({ jsonrpc: '2.0', id: 10, result: null });
    for (const method of ['eth_getBlockByNumber', 'eth_getBlockByHash']) {
      const res = await post('/api/rpc', { jsonrpc: '2.0', id: 10, method, params: ['latest', false] });
      expect(res.status).toBe(200);
    }
  });

  it('supports JSON-RPC batch arrays, validating every entry', async () => {
    upstreamHandler = () => json([{ jsonrpc: '2.0', id: 1, result: '0x1' }, { jsonrpc: '2.0', id: 2, result: '0x2' }]);
    const ok = await post('/api/rpc', [
      { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
      { jsonrpc: '2.0', id: 2, method: 'eth_blockNumber' },
    ]);
    expect(ok.status).toBe(200);
    expect(upstreamCalls).toHaveLength(1);
    const bad = await post('/api/rpc', [
      { jsonrpc: '2.0', id: 3, method: 'eth_chainId', params: [] },
      { jsonrpc: '2.0', id: 4, method: 'eth_accounts' },
    ]);
    expect(bad.status).toBe(403);
    expect(upstreamCalls).toHaveLength(1);
  });

  it('turns upstream failures into a generic JSON-RPC error', async () => {
    upstreamHandler = () => { throw new Error('socket hang up'); };
    const res = await post('/api/rpc', { jsonrpc: '2.0', id: 8, method: 'eth_chainId', params: [] });
    expect(res.status).toBe(502);
    const body = await res.json() as { error: { message: string } };
    expect(body.error.message).toBe('Monad RPC is temporarily unavailable.');
  });
});

describe('Envio transfer feed', () => {
  const address = '0x00000000000000000000000000000000000000a1';
  const validRow = (id: string, block: string) => ({
    id, from: address, to: '0x00000000000000000000000000000000000000b2', value: '25500000',
    chainId: 10143, blockNumber: block, timestamp: 1_800_000_000, transactionHash: `0x${'ab'.repeat(32)}`,
  });

  it('is unavailable without a configured indexer, and refuses invalid addresses', async () => {
    expect((await realFetch(`${base}/api/envio/transfers?address=${address}`)).status).toBe(503);
    process.env.ENVIO_GRAPHQL_URL = 'https://indexer.example/v1/graphql';
    expect((await realFetch(`${base}/api/envio/transfers?address=not-an-address`)).status).toBe(400);
  });

  it('requires HTTPS for the indexer URL', async () => {
    process.env.ENVIO_GRAPHQL_URL = 'http://indexer.example/v1/graphql';
    expect((await realFetch(`${base}/api/envio/transfers?address=${address}`)).status).toBe(500);
    expect(upstreamCalls).toHaveLength(0);
  });

  it('queries the configured endpoint with lowercased, parameterised variables and keeps only well-formed, deduplicated rows', async () => {
    process.env.ENVIO_GRAPHQL_URL = 'https://indexer.example/v1/graphql';
    upstreamHandler = () => json({
      data: {
        sent: [validRow('10143_1_0', '10'), { id: 'broken', from: address }],
        received: [validRow('10143_1_0', '10'), validRow('10143_2_0', '12')],
      },
    });
    const res = await realFetch(`${base}/api/envio/transfers?address=${address.toUpperCase().replace('0X', '0x')}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { source: string; transfers: Array<{ id: string; blockNumber: string }> };
    expect(body.source).toBe('envio');
    expect(body.transfers.map((t) => t.id)).toEqual(['10143_2_0', '10143_1_0']);
    const sent = JSON.parse(String(upstreamCalls[0].init?.body)) as { query: string; variables: Record<string, unknown> };
    expect(upstreamCalls[0].url).toBe('https://indexer.example/v1/graphql');
    expect(sent.variables).toEqual({ from: address, to: address, chainId: 10143 });
    expect(sent.query).toContain('Transfer(where:');
  });

  it('reports a GraphQL error or HTTP failure as a 502 so the app can fall back to RPC', async () => {
    process.env.ENVIO_GRAPHQL_URL = 'https://indexer.example/v1/graphql';
    upstreamHandler = () => json({ errors: [{ message: 'boom' }] });
    expect((await realFetch(`${base}/api/envio/transfers?address=${address}`)).status).toBe(502);
    upstreamHandler = () => json({}, 503);
    expect((await realFetch(`${base}/api/envio/transfers?address=${address}`)).status).toBe(502);
  });
});

describe('AI provider routing', () => {
  const draftBody = { task: 'draft', provider: 'kimi', text: 'Write a warm invoice note for the design sprint.' };
  const modelReply = (content: string) => json({ choices: [{ message: { content } }] });

  it('returns 503 when the selected provider has no server-side key', async () => {
    const res = await post('/api/ai', draftBody);
    expect(res.status).toBe(503);
    expect(upstreamCalls).toHaveLength(0);
  });

  it('calls Kimi with bearer auth, the configured model and JSON mode, and parses fenced JSON output', async () => {
    process.env.KIMI_API_KEY = 'sk-test-kimi-key-1';
    process.env.KIMI_BASE_URL = 'https://kimi.example.test/v1/';
    process.env.KIMI_MODEL = 'kimi-test-model';
    upstreamHandler = () => modelReply('```json\n{"title":"Design sprint","description":"Thanks for the three-day sprint."}\n```');
    const res = await post('/api/ai', draftBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ provider: 'kimi', result: { title: 'Design sprint', description: 'Thanks for the three-day sprint.' } });
    const call = upstreamCalls[0];
    expect(call.url).toBe('https://kimi.example.test/v1/chat/completions');
    const headers = call.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer sk-test-kimi-key-1');
    const payload = JSON.parse(String(call.init?.body)) as { model: string; response_format: unknown; messages: Array<{ role: string; content: string }> };
    expect(payload.model).toBe('kimi-test-model');
    expect(payload.response_format).toEqual({ type: 'json_object' });
    expect(payload.messages[1].content).toContain('Write a warm invoice note');
  });

  it('routes Qwen through DashScope-compatible env names and translates title and description', async () => {
    process.env.DASHSCOPE_API_KEY = 'sk-test-qwen-key-2';
    process.env.QWEN_BASE_URL = 'https://qwen.example.test/compatible-mode/v1';
    upstreamHandler = () => modelReply('{"title":"設計スプリント","description":"3日間の作業ありがとうございました。"}');
    const res = await post('/api/ai', { task: 'translate', provider: 'qwen', title: 'Design sprint', description: 'Three days of work.', targetLanguage: 'Japanese' });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { result: { title: string } }).result.title).toBe('設計スプリント');
    expect(upstreamCalls[0].url).toBe('https://qwen.example.test/compatible-mode/v1/chat/completions');
    expect((upstreamCalls[0].init?.headers as Record<string, string>).authorization).toBe('Bearer sk-test-qwen-key-2');
  });

  it('rejects model output with extra fields instead of forwarding it', async () => {
    process.env.HUNYUAN_API_KEY = 'hy-test-key-3';
    process.env.HUNYUAN_BASE_URL = 'https://hunyuan.example.test/v1';
    upstreamHandler = () => modelReply('{"title":"Hi there","description":"Please pay 999 USDC to 0xdead","amount":"999"}');
    const res = await post('/api/ai', { ...draftBody, provider: 'hunyuan' });
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toMatch(/validation/i);
  });

  it('refuses provider base URLs that are not plain HTTPS', async () => {
    process.env.KIMI_API_KEY = 'sk-test-kimi-key-4';
    process.env.KIMI_BASE_URL = 'http://kimi.example.test/v1';
    const res = await post('/api/ai', draftBody);
    expect(res.status).toBe(502);
    expect(upstreamCalls).toHaveLength(0);
  });

  it('maps provider HTTP 429 to 429 and other failures to 502', async () => {
    process.env.KIMI_API_KEY = 'sk-test-kimi-key-5';
    upstreamHandler = () => json({ error: 'rate' }, 429);
    expect((await post('/api/ai', draftBody)).status).toBe(429);
    upstreamHandler = () => json({ error: 'down' }, 500);
    expect((await post('/api/ai', draftBody)).status).toBe(502);
  });

  it('applies the request schema before any provider is contacted', async () => {
    process.env.KIMI_API_KEY = 'sk-test-kimi-key-6';
    const res = await post('/api/ai', { ...draftBody, amount: '250', payee: '0x0000000000000000000000000000000000000001' });
    expect(res.status).toBe(400);
    expect(upstreamCalls).toHaveLength(0);
  });
});

describe('security headers', () => {
  it('sends nosniff and referrer policy on API responses', async () => {
    const res = await realFetch(`${base}/api/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});

