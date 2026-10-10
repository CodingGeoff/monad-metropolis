import { z } from 'zod';

export const aiRequestSchema = z.discriminatedUnion('task', [
  z.object({
    task: z.literal('draft'),
    provider: z.enum(['kimi', 'qwen', 'hunyuan']).default('kimi'),
    text: z.string().trim().min(4).max(1400),
    locale: z.string().trim().max(40).optional(),
  }).strict(),
  z.object({
    task: z.literal('translate'),
    provider: z.enum(['kimi', 'qwen', 'hunyuan']).default('qwen'),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(600),
    targetLanguage: z.string().trim().min(2).max(40),
  }).strict(),
]);

export type AIRequest = z.infer<typeof aiRequestSchema>;

const providerConfig = {
  kimi: {
    key: () => process.env.KIMI_API_KEY?.trim() || process.env.MOONSHOT_API_KEY?.trim(),
    baseUrl: () => process.env.KIMI_BASE_URL?.trim() || 'https://api.moonshot.ai/v1',
    model: () => process.env.KIMI_MODEL?.trim() || 'kimi-k3',
  },
  qwen: {
    key: () => process.env.QWEN_API_KEY?.trim() || process.env.DASHSCOPE_API_KEY?.trim(),
    baseUrl: () => process.env.QWEN_BASE_URL?.trim() || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    model: () => process.env.QWEN_MODEL?.trim() || 'qwen3.8-max',
  },
  hunyuan: {
    key: () => process.env.HUNYUAN_API_KEY?.trim() || process.env.TOKENHUB_API_KEY?.trim(),
    baseUrl: () => process.env.HUNYUAN_BASE_URL?.trim() || 'https://tokenhub-intl.tencentcloudmaas.com/v1',
    model: () => process.env.HUNYUAN_MODEL?.trim() || 'hy4-preview',
  },
} as const;

export function aiProviderStatus() {
  return Object.fromEntries(
    Object.entries(providerConfig).map(([name, config]) => [name, Boolean(config.key())]),
  ) as Record<keyof typeof providerConfig, boolean>;
}

function requireSafeBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('AI provider URL must be a plain HTTPS base URL.');
  }
  return url;
}

function parseJsonFromModel(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('The model did not return a valid structured draft. Please try again.');
  }
}

async function callChat(provider: keyof typeof providerConfig, system: string, user: string) {
  const config = providerConfig[provider];
  const key = config.key();
  if (!key) {
    const err = new Error(`${provider} is not configured on the server.`) as Error & { status?: number };
    err.status = 503;
    throw err;
  }

  const base = requireSafeBaseUrl(config.baseUrl()).toString().replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22_000);
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model(),
        temperature: 0.2,
        max_tokens: 420,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const err = new Error(`AI provider returned HTTP ${response.status}.`) as Error & { status?: number };
      err.status = response.status === 429 ? 429 : 502;
      throw err;
    }
    const body = await response.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    const text = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((part) => part.text ?? '').join('')
        : '';
    if (!text) throw new Error('AI provider returned an empty response.');
    return parseJsonFromModel(text);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI request timed out. Please retry.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const draftResultSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(4).max(400),
}).strict();

const translationResultSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(600),
}).strict();

export async function runAI(request: AIRequest) {
  if (request.task === 'draft') {
    const system = [
      'You write concise, professional payment-invoice copy for a cross-border freelancer product.',
      'Return JSON only with exactly two string fields: title and description.',
      'Do not invent, change, or calculate any amount, currency, wallet address, payment status, deadline, exchange rate, or legal/tax claim.',
      'Do not imply that a payment has been sent. Keep title under 80 characters and description under 400 characters.',
      'The user will review and edit the copy before a separately signed transaction.',
    ].join(' ');
    const user = `Write a clear invoice title and recipient-facing description from this brief. Preserve factual details; if an important detail is absent, do not invent it. Preferred language: ${request.locale ?? 'English'}.\n\nBrief:\n${request.text}`;
    const result = draftResultSchema.safeParse(await callChat(request.provider, system, user));
    if (!result.success) throw new Error('The model response did not pass draft validation. Please try again.');
    return { provider: request.provider, result: result.data };
  }

  const system = [
    'You translate payment invoice copy faithfully for a consumer payment app.',
    `Return JSON only with exactly two string fields: title and description, translated into ${request.targetLanguage}.`,
    'Do not add or modify amounts, currencies, addresses, due dates, payment status, guarantees, or legal claims.',
    'Keep identifiers and proper nouns unchanged. Preserve the meaning and tone.',
  ].join(' ');
  const user = JSON.stringify({ title: request.title, description: request.description });
  const result = translationResultSchema.safeParse(await callChat(request.provider, system, user));
  if (!result.success) throw new Error('The model response did not pass translation validation. Please try again.');
  return { provider: request.provider, result: result.data };
}
