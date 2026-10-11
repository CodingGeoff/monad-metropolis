export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_PUBLIC_RPC = 'https://testnet-rpc.monad.xyz/';

export type JsonRpcId = string | number | null;
export type JsonRpcParams = unknown[] | Record<string, unknown>;
export type NormalizedRpcRequest = {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: string;
  params: JsonRpcParams;
};

type RpcProviderName = 'alchemy' | 'configured' | 'public';
type RpcProvider = { name: RpcProviderName; url: string };
type RpcResponse = { jsonrpc: '2.0'; id: JsonRpcId; result?: unknown; error?: { code: number; message: string; data?: unknown } };
type RpcAttempt =
  | { kind: 'response'; status: number; body: RpcResponse }
  | { kind: 'retry' };

const RPC_TIMEOUT_MS = 3_500;
const PROVIDER_COOLDOWN_MS = 12_000;
const CHAIN_VALIDATION_TTL_MS = 60_000;
const MAX_RPC_PROVIDERS = 6;

function normalizedHttpUrl(raw: string, nodeEnv: string | undefined): string | null {
  if (raw.length > 2_048) return null;
  try {
    const url = new URL(raw);
    const isLocalHttp = nodeEnv !== 'production'
      && url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !isLocalHttp) return null;
    if (url.username || url.password || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Provider order is intentional: Alchemy, operator-configured backups, then Monad's
 * public testnet endpoint. Duplicate URLs are removed so a broken provider is not
 * needlessly retried under two labels.
 */
export function getMonadRpcProviders(env: NodeJS.ProcessEnv = process.env): RpcProvider[] {
  const candidates: RpcProvider[] = [];
  const add = (name: RpcProviderName, value: string | undefined) => {
    if (!value?.trim()) return;
    const url = normalizedHttpUrl(value.trim(), env.NODE_ENV);
    if (!url || candidates.some((provider) => provider.url === url)) return;
    candidates.push({ name, url });
  };

  const alchemyKey = env.ALCHEMY_API_KEY?.trim();
  if (alchemyKey) add('alchemy', `https://monad-testnet.g.alchemy.com/v2/${encodeURIComponent(alchemyKey)}`);

  const configuredRpc = env.MONAD_RPC_URL?.trim();
  const normalizedConfigured = configuredRpc ? normalizedHttpUrl(configuredRpc, env.NODE_ENV) : null;
  // The official endpoint is added last as the built-in fallback, not ahead of a
  // separately configured backup list.
  if (normalizedConfigured && normalizedConfigured !== MONAD_TESTNET_PUBLIC_RPC) {
    add('configured', normalizedConfigured);
  }

  for (const backup of (env.MONAD_RPC_FALLBACK_URLS ?? '').split(/[\n,]/).slice(0, 3)) add('configured', backup);
  add('public', MONAD_TESTNET_PUBLIC_RPC);
  if (candidates.length <= MAX_RPC_PROVIDERS) return candidates;
  const publicProvider = candidates.find((provider) => provider.url === MONAD_TESTNET_PUBLIC_RPC);
  const configuredProviders = candidates.filter((provider) => provider.url !== MONAD_TESTNET_PUBLIC_RPC).slice(0, MAX_RPC_PROVIDERS - 1);
  return publicProvider ? [...configuredProviders, publicProvider] : configuredProviders;
}

export function getRpcProviderStatus(env: NodeJS.ProcessEnv = process.env) {
  const providers = getMonadRpcProviders(env);
  return {
    rpcProvider: providers[0]?.name ?? 'public',
    rpcFallbacks: Math.max(0, providers.length - 1),
  };
}

export type RpcRequestValidation =
  | { ok: true; request: NormalizedRpcRequest }
  | { ok: false; id: JsonRpcId; code: number; message: string };

export function normalizeRpcRequest(
  value: unknown,
  allowedMethods: ReadonlySet<string>,
  generatedId: JsonRpcId,
): RpcRequestValidation {
  const invalid = (code: number, message: string): RpcRequestValidation => ({ ok: false, id: null, code, message });
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(-32600, 'Invalid JSON-RPC request.');
  const payload = value as Record<string, unknown>;
  if (payload.jsonrpc !== '2.0' || typeof payload.method !== 'string' || payload.method.length === 0) {
    return invalid(-32600, 'Invalid JSON-RPC request.');
  }

  // JSON-RPC 2.0 makes `params` optional. viem omits it when a method (such as
  // eth_chainId) has no arguments, so the proxy normalizes it to an empty array.
  const params: unknown = payload.params === undefined ? [] : payload.params;
  if (!Array.isArray(params) && (!params || typeof params !== 'object')) {
    return invalid(-32600, 'Invalid JSON-RPC params.');
  }

  const hasId = Object.prototype.hasOwnProperty.call(payload, 'id');
  const rawId = hasId ? payload.id : generatedId;
  if (!(rawId === null
    || (typeof rawId === 'string' && rawId.length <= 128)
    || (typeof rawId === 'number' && Number.isFinite(rawId)))) {
    return invalid(-32600, 'Invalid JSON-RPC id.');
  }

  if (!allowedMethods.has(payload.method)) return { ok: false, id: rawId as JsonRpcId, code: -32601, message: 'RPC method not enabled.' };
  return {
    ok: true,
    request: {
      jsonrpc: '2.0',
      id: rawId as JsonRpcId,
      method: payload.method,
      params: params as JsonRpcParams,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function matchesId(responseId: unknown, requestId: JsonRpcId): boolean {
  return responseId === requestId;
}

function parseRpcResponse(value: unknown, expectedId: JsonRpcId): RpcResponse | null {
  if (!isRecord(value) || value.jsonrpc !== '2.0' || !matchesId(value.id, expectedId)) return null;
  const hasResult = Object.prototype.hasOwnProperty.call(value, 'result');
  const error = value.error;
  const hasError = isRecord(error) && typeof error.code === 'number' && typeof error.message === 'string';
  if (hasResult === hasError) return null;
  if (hasError) {
    return {
      jsonrpc: '2.0',
      id: expectedId,
      error: {
        code: error.code as number,
        message: error.message as string,
        ...(Object.prototype.hasOwnProperty.call(error, 'data') ? { data: error.data } : {}),
      },
    };
  }
  return { jsonrpc: '2.0', id: expectedId, result: value.result };
}

function isTransientRpcError(error: { code: number; message: string } | undefined): boolean {
  if (!error) return false;
  if (error.code === -32005 || error.code === -32016) return true;
  return /rate.?limit|too many requests|temporarily unavailable|server busy|overload|timed? ?out|gateway|upstream error|try again|unauthori[sz]ed|invalid (?:api )?key|authentication|access denied|project not found/i.test(error.message);
}

function isMonadChainId(result: unknown): boolean {
  if (typeof result !== 'string' || !/^0x[0-9a-f]+$/i.test(result)) return false;
  try {
    return BigInt(result) === BigInt(MONAD_TESTNET_CHAIN_ID);
  } catch {
    return false;
  }
}

export type RpcForwardResult =
  | { ok: true; status: number; body: RpcResponse; provider: RpcProviderName; attempts: number; fallbackUsed: boolean }
  | { ok: false; attempts: number };

export type RpcForwarderOptions = {
  /** Uses the global fetch at call time by default, which also makes the proxy easy to test. */
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  cooldownMs?: number;
  chainValidationTtlMs?: number;
  now?: () => number;
  env?: NodeJS.ProcessEnv;
};

/**
 * Creates a per-Express-app forwarder with testnet-only provider failover.
 * Reads and broadcasts use exactly the same signed JSON-RPC payload at each target.
 * A broadcast can only be retried after a transport/provider failure; a definitive
 * JSON-RPC transaction error is returned immediately. Re-broadcasting identical raw
 * bytes has the same transaction hash/nonce and cannot execute that transfer twice.
 */
export function createMonadRpcForwarder(options: RpcForwarderOptions = {}) {
  const cooldowns = new Map<string, number>();
  const chainValidatedAt = new Map<string, number>();
  const chainChecks = new Map<string, Promise<boolean>>();
  let probeId = 0;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? RPC_TIMEOUT_MS;
  const cooldownMs = options.cooldownMs ?? PROVIDER_COOLDOWN_MS;
  const chainValidationTtlMs = options.chainValidationTtlMs ?? CHAIN_VALIDATION_TTL_MS;
  const fetchFn = options.fetchFn ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  const env = options.env ?? process.env;

  const perform = async (provider: RpcProvider, request: NormalizedRpcRequest): Promise<RpcAttempt> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const upstream = await fetchFn(provider.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      let raw: unknown;
      try {
        raw = await upstream.json();
      } catch {
        return { kind: 'retry' };
      }
      const body = parseRpcResponse(raw, request.id);
      if (!body) return { kind: 'retry' };
      if (body.error) {
        const providerRejected = [401, 403, 408, 425, 429].includes(upstream.status) || upstream.status >= 500;
        if (providerRejected || isTransientRpcError(body.error) || body.error.code === -32601) return { kind: 'retry' };
        return { kind: 'response', status: upstream.status, body };
      }
      if (!upstream.ok) return { kind: 'retry' };
      return { kind: 'response', status: upstream.status, body };
    } catch {
      return { kind: 'retry' };
    } finally {
      clearTimeout(timeout);
    }
  };

  const verifyProviderChain = async (provider: RpcProvider): Promise<boolean> => {
    const validatedAt = chainValidatedAt.get(provider.url);
    if (validatedAt !== undefined && now() - validatedAt < chainValidationTtlMs) return true;

    const pending = chainChecks.get(provider.url);
    if (pending) return pending;

    const check = (async () => {
      const request: NormalizedRpcRequest = {
        jsonrpc: '2.0',
        id: `kite-chain-check-${++probeId}`,
        method: 'eth_chainId',
        params: [],
      };
      const result = await perform(provider, request);
      const valid = result.kind === 'response'
        && result.status >= 200 && result.status < 300
        && !result.body.error
        && isMonadChainId(result.body.result);
      if (valid) {
        chainValidatedAt.set(provider.url, now());
        cooldowns.delete(provider.url);
      } else {
        chainValidatedAt.delete(provider.url);
        cooldowns.set(provider.url, now() + cooldownMs);
      }
      return valid;
    })();
    chainChecks.set(provider.url, check);
    try {
      return await check;
    } finally {
      if (chainChecks.get(provider.url) === check) chainChecks.delete(provider.url);
    }
  };

  return async function forward(request: NormalizedRpcRequest): Promise<RpcForwardResult> {
    const providers = getMonadRpcProviders(env);
    const currentTime = now();
    const ready = providers.filter((provider) => (cooldowns.get(provider.url) ?? 0) <= currentTime);
    const cooling = providers
      .filter((provider) => (cooldowns.get(provider.url) ?? 0) > currentTime)
      .sort((a, b) => (cooldowns.get(a.url) ?? 0) - (cooldowns.get(b.url) ?? 0));
    // Prefer endpoints not in cooldown, but never drop the last-resort providers: a
    // cooling endpoint may have recovered, and all layers should still be attempted.
    const candidates = [...ready, ...cooling];

    let attempts = 0;
    for (const provider of candidates) {
      attempts += 1;
      if (request.method !== 'eth_chainId' && !await verifyProviderChain(provider)) continue;

      const result = await perform(provider, request);
      if (result.kind === 'retry') {
        chainValidatedAt.delete(provider.url);
        cooldowns.set(provider.url, now() + cooldownMs);
        continue;
      }

      if (request.method === 'eth_chainId') {
        if (result.body.error || !isMonadChainId(result.body.result)) {
          chainValidatedAt.delete(provider.url);
          cooldowns.set(provider.url, now() + cooldownMs);
          continue;
        }
        chainValidatedAt.set(provider.url, now());
      }

      cooldowns.delete(provider.url);
      return {
        ok: true,
        status: result.status,
        body: result.body,
        provider: provider.name,
        attempts,
        fallbackUsed: provider.url !== providers[0]?.url,
      };
    }
    return { ok: false, attempts };
  };
}
