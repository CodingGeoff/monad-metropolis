import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

let server: ChildProcessWithoutNullStreams;
const port = 4188;
const base = `http://127.0.0.1:${port}`;

async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch { /* starting */ }
    await delay(100);
  }
  throw new Error('Test API did not start.');
}

describe('Kite API hardening', () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'test',
        ALCHEMY_API_KEY: '',
        ENVIO_GRAPHQL_URL: '',
        KIMI_API_KEY: '', MOONSHOT_API_KEY: '',
        QWEN_API_KEY: '', DASHSCOPE_API_KEY: '',
        HUNYUAN_API_KEY: '', TOKENHUB_API_KEY: '',
      },
      stdio: 'pipe',
    });
    await waitForServer();
  }, 10_000);

  afterAll(() => {
    server?.kill('SIGTERM');
  });

  it('reports only public integration status, never secrets', async () => {
    const response = await fetch(`${base}/api/health`);
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.chainId).toBe(10143);
    expect(body.rpcProvider).toBe('public');
    expect(body.integrations).toEqual({ envio: false, ai: { kimi: false, qwen: false, hunyuan: false } });
    expect(JSON.stringify(body)).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
  });

  it('rejects malformed JSON-RPC and blocks arbitrary RPC methods', async () => {
    const malformed = await fetch(`${base}/api/rpc`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'eth_chainId' }),
    });
    expect(malformed.status).toBe(400);
    const blocked = await fetch(`${base}/api/rpc`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'personal_sendTransaction', params: [] }),
    });
    expect(blocked.status).toBe(403);
  });

  it('does not let callers choose arbitrary Envio URLs', async () => {
    const response = await fetch(`${base}/api/envio/transfers?address=0x0000000000000000000000000000000000000001`);
    expect([502, 503]).toContain(response.status);
  });

  it('validates AI input before it reaches any provider', async () => {
    const response = await fetch(`${base}/api/ai`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task: 'draft', provider: 'kimi', text: 'x' }),
    });
    expect(response.status).toBe(400);
  });
});
