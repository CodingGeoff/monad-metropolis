# Kite — Metropolis fit and evidence plan

> 奖项金额与来源、已获/潜在奖金区分，以及完整人工操作清单见：[METROPOLIS_PLAYBOOK.md](METROPOLIS_PLAYBOOK.md)（2026-10-10 核对）。portal 登录后才能看到的资格与 bounty 原文仍须参赛者本人确认。

**Chosen main track:** Consumer Products & Payments.

**Product thesis:** global freelancers and independent studios need a clear, low-friction way to request and receive dollar-denominated payment without handing custody to a payment processor. Kite issues passkey-signed invoice links, pays directly in Agora AUSD on Monad, shows local-currency estimates as estimates only, and encrypts a repeat-payee address book on the user's device.

## Bounties this build is designed to pursue

| Program | What Kite implements | What still must be true for a claim |
|---|---|---|
| Agora — Cross-Border Payments | Mobile-first installable PWA, Mera onboarding, real Agora AUSD on Monad testnet, direct onchain settlement, signed invoice links | Confirm that the sponsor accepts an installable PWA as a mobile app; prove a real AUSD transfer on the live testnet; check the final dashboard wording. |
| Monad Foundation — Mera-Powered UX | Mera is the only account layer; no browser-wallet extension, seed phrase or custodial backend; private key material stays in a short-lived browser session | Demonstrate passkey creation/recovery on a supported authenticator; do not add another embedded-wallet provider. |
| Monad Foundation — Mera: One Passkey, Many Keys | HKDF-SHA-256 domain-separates a second key from Mera PRF output; AES-256-GCM encrypts address-book data before browser storage | Show that storage contains ciphertext only, then lock/re-authenticate and decrypt with the same synced passkey. |
| Envio — Best Use of Envio | HyperIndex indexes Agora AUSD Transfer events; Kite's Activity page queries the GraphQL indexer and falls back to bounded RPC logs if it is unavailable | Deploy the indexer, set `ENVIO_GRAPHQL_URL`, and show a newly sent AUSD transfer appear from Envio. |
| Alchemy — Best Projects using Alchemy | All browser JSON-RPC reads and signed transaction broadcasts go through the server's same-origin RPC proxy; the proxy uses Alchemy Monad Testnet when `ALCHEMY_API_KEY` is configured | Create a Monad testnet app in Alchemy, set the server-only key, check `/api/health` reports `rpcProvider: alchemy`, and record the real call in the demo. |
| Kimi — Best Builds Powered by KIMI | Optional provider-backed invoice copy drafting; the model is denied amount, address and transaction capabilities | Add the event key, configure `KIMI_API_KEY`, and demo Kimi generating the invoice copy before a human reviews it. A local preview fallback is explicitly **not** sponsor-model usage. |
| Alibaba Cloud — Qwen 3.8 Max | Optional Qwen localization of recipient-facing invoice copy | Add the event key, configure the exact regional endpoint/key/model and show Qwen translating an invoice in the demo. |
| Metropolis Track 2 — Consumer Payments (payroll-style streams) | Signed payment plans: 2–12 installments every 7/14/30 days, each a separate passkey-signed EIP-712 link bound to plan ID, index and due date; payer pays each one directly in AUSD | Demo two installments end-to-end on Monad testnet with real passkeys; this is a discrete-installment flow, not a continuously streaming on-chain salary contract. |

## Deliberately not claimed

- Dynamic and Privy are not used: Mera is the chosen account layer, and stacking auth providers would contradict the Mera-only product/security story.
- Kuru, Perpl and MetaMask Agent Wallet are trading-specific; Kite does not add unrelated trading just to list more logos.
- Chainlink CRE, Cleanverse, Nansen, Hunyuan (Kepler Plan multimodal/interactive track), Perpl, Kuru, MetaMask Agent Wallet and campus-team bounties are not claimed. Each needs its own account, SDK/API key or a product that does not fit a consumer-payments app. Programmable gifts (escrow with claim conditions) are also not built: they need a deployed contract, which is out of scope for this testnet build.

## Important reality check

This repo contains the integration code and local tests. It does not by itself create a hackathon registration, sponsor API account/key, Envio hosted deployment, public domain, funded test wallet, transaction hash, or submission. Those require owner-controlled accounts and live proof. Do not list a bounty as achieved until its requirement has been demonstrated in the final environment.
