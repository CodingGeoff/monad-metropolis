export function shortAddress(address?: string, left = 6, right = 4) {
  if (!address || address.length < left + right + 3) return address ?? '—';
  return `${address.slice(0, left)}…${address.slice(-right)}`;
}

export function formatDate(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return 'Recent';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp * 1000));
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'K';
}

export function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  if (/user rejected|denied|cancelled|canceled/i.test(message)) return 'Passkey operation was cancelled. No payment was sent.';
  if (/insufficient funds/i.test(message)) return 'Not enough MON for testnet gas. Get free test MON from the Monad faucet, then retry.';
  if (/already requested|frequency|cooldown|too soon/i.test(message)) return 'The test AUSD faucet is rate limited. Try again in about a minute.';
  return message.slice(0, 240);
}
