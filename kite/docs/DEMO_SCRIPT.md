# Demo script

> The shot-by-shot version with timings, pre-recording checklist and failure handling lives in
> [`SUBMISSION_RUNBOOK.md`](SUBMISSION_RUNBOOK.md) §3. This file is the narration skeleton.
>
> **Rule:** never narrate an integration that is not live. The last health check reported `envio: false` and all AI providers `false`; `rpcProvider: alchemy` is only a configuration signal. A live `eth_chainId` proxy error has since been reported, and the source fix is pending deployment/production retest. Do not narrate a healthy RPC/Alchemy path until the no-params smoke test succeeds; cut Envio and Kimi/Qwen until configured and exercised.

## 0:00–0:20 — Problem and user
"A solo designer can finish work for a client in another country and still wait days for a bank
transfer, lose money to opaque FX, and invoice manually. Kite turns the payment request into the
shortest part of the job."

## 0:20–0:50 — Passkey onboarding
Create or sign in with a Mera passkey. Show the Monad testnet address and explain that the EOA is
derived client-side from PRF output. No extension, no recovery phrase, no custody backend. Say
"passkey with PRF" explicitly — a plain WebAuthn credential is not the same thing.

## 0:50–1:05 — Where the chain access goes
Show Settings plus the successful `/api/rpc` smoke-test response. Every browser read and signed broadcast goes through the same-origin proxy: Alchemy is preferred, then chain-ID-checked configured/public Monad testnet backups. `/api/health` reports configuration only; use the response headers to show the node used for the smoke test, never any key.

## 1:05–1:35 — Make an invoice
Type a short brief and an amount. Sign it. Explain that Kite signs invoice terms with EIP-712, and
that in a payment plan each installment is its own signature bound to plan ID, index, count and due
date. If Kimi/Qwen are configured, show the model drafting or translating copy and then show a human
editing it — and say plainly that only user-entered prose is sent, never the amount or the wallet.

## 1:35–1:50 — Share and verify
Show the QR/link, open it in a private window, and show the **Verified** badge with the exact amount,
recipient, token and expiry. Mention that altering any signed field or letting it expire disables the
payment button.

## 1:50–2:15 — Settle AUSD
Use a funded Monad testnet passkey account to pay. Show pending → confirmed and let the real elapsed
time stand; do not cut it to look faster.

## 2:15–2:30 — On-chain proof
Open `https://testnet.monadscan.com/tx/<hash>`. Hold on Success and on the `Transfer` event's
from / to / value long enough to read. Never substitute a screenshot or a seeded hash.

## 2:30–2:45 — One passkey, many keys
Open DevTools and show that `kite:encrypted-address-book:v1` in `localStorage` is ciphertext only.
Lock, re-authenticate with the same passkey, and show the contacts decrypt. Then show the Activity
page and name its source honestly — "indexed by Envio" only if the hosted indexer is configured,
otherwise "direct Monad RPC logs".

## 2:45–2:55 — Close
"This is a Monad testnet prototype; test assets have no monetary value and there is no fiat
off-ramp. Kite makes cross-border AUSD settlement feel like sending an invoice, not learning a
blockchain. The payment is on Monad; custody stays with the people doing the work."

## Recording checklist

- Record on a real phone viewport or an installed PWA, and disclose that it is a PWA rather than a
  native binary.
- Warm the service up first: the Render free plan sleeps after 15 idle minutes and cold-starts in
  30–60 seconds.
- Keep the QR, payment link, wallet address, transaction hash and explorer receipt on screen long
  enough to verify.
- Show the testnet labels and say the test assets have no monetary value.
- Record no secrets: private keys, mnemonics, PRF output, `.env` files, API keys, provider
  dashboards showing a key.
- Publish the video where an unauthenticated reviewer can open it, and test that in a private window.
- If an integration is not live, cut the beat. Do not narrate a planned integration as shipped.
