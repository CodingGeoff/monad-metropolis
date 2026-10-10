export type AIProvider = 'kimi' | 'qwen' | 'hunyuan';
export type AITask = 'draft' | 'translate';

export async function runAIAssist<T>(payload: Record<string, unknown>): Promise<{ provider: AIProvider; result: T }> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as { provider?: AIProvider; result?: T; error?: string };
  if (!response.ok || !body.result || !body.provider) throw new Error(body.error ?? 'AI assistant is not available.');
  return { provider: body.provider, result: body.result };
}

export function localDraftPreview(brief: string) {
  const compact = brief.trim().replace(/\s+/g, ' ');
  const title = compact.length > 56 ? `${compact.slice(0, 53)}…` : compact || 'Freelance services';
  const draft = `Payment request for ${compact || 'professional services'}. Please review the invoice details and settle in AUSD.`;
  const description = draft.length > 400 ? `${draft.slice(0, 399).trimEnd()}…` : draft;
  return { title, description };
}
