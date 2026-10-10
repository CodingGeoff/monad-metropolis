/**
 * Copies text to the clipboard. Uses the async Clipboard API when available (secure contexts)
 * and falls back to a hidden textarea + execCommand for older or restricted browsers.
 * Always resolves or rejects; never throws synchronously.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!text) throw new Error('Nothing to copy.');
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the textarea fallback below.
  }
  if (typeof document === 'undefined') throw new Error('Clipboard is unavailable.');
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    area.remove();
  }
  if (!copied) throw new Error('Clipboard is unavailable.');
}
