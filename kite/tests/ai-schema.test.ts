import { describe, expect, it } from 'vitest';
import { aiRequestSchema } from '../server/ai';
import { localDraftPreview } from '../src/lib/ai';

describe('AI request guardrails', () => {
  it('accepts bounded draft and translation requests', () => {
    expect(aiRequestSchema.safeParse({ task: 'draft', provider: 'kimi', text: 'Write a clear invoice note for a design sprint.' }).success).toBe(true);
    expect(aiRequestSchema.safeParse({ task: 'translate', provider: 'qwen', title: 'Design sprint', description: 'Three days of work.', targetLanguage: 'Japanese' }).success).toBe(true);
  });

  it('rejects unknown providers, blank prompts, and excessive input', () => {
    expect(aiRequestSchema.safeParse({ task: 'draft', provider: 'unknown', text: 'some brief' }).success).toBe(false);
    expect(aiRequestSchema.safeParse({ task: 'draft', provider: 'kimi', text: 'x' }).success).toBe(false);
    expect(aiRequestSchema.safeParse({ task: 'draft', provider: 'kimi', text: 'a'.repeat(1401) }).success).toBe(false);
  });

  it('rejects structured payment and wallet metadata at the AI boundary', () => {
    expect(aiRequestSchema.safeParse({
      task: 'draft', provider: 'kimi', text: 'Write a clear invoice note for this design sprint.',
      amount: '250', payee: '0x0000000000000000000000000000000000000001', signingKey: 'never-forward',
    }).success).toBe(false);
  });

  it('keeps local fallback invoice copy inside signing limits', () => {
    const copy = localDraftPreview('brief '.repeat(300));
    expect(copy.title.length).toBeLessThanOrEqual(80);
    expect(copy.description.length).toBeLessThanOrEqual(400);
  });
});
