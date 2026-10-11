# Kite — Metropolis fit and evidence plan

> **核对时间：2026-10-11 07:35 UTC。** 当前已验证/未验证的完整清单、证据和最后 48 小时执行顺序见
> [SUBMISSION_RUNBOOK.md](SUBMISSION_RUNBOOK.md)。奖项金额与来源、已获/潜在奖金区分见
> [METROPOLIS_PLAYBOOK.md](METROPOLIS_PLAYBOOK.md)。portal 登录后才能看到的资格与 bounty 原文仍须参赛者本人确认。
>
> **历史实测基线：** 07:35 UTC 线上 `/api/health` 显示 `rpcProvider: "alchemy"`、`chainId: 10143`、`envio: false`、Kimi/Qwen/Hunyuan 均 `false`。用户随后报告该 deployed build 的 `/api/rpc` `eth_chainId` 失败；本 Arena 分支已有源码修复但尚未部署。RPC 与 AUSD 实操状态以 [SUBMISSION_RUNBOOK.md](SUBMISSION_RUNBOOK.md) 为准。演示钱包上次检查有 10 MON、**0 AUSD**。

**Chosen main track:** Consumer Products & Payments.

**Product thesis:** global freelancers and independent studios need a clear, low-friction way to request and receive dollar-denominated payment without handing custody to a payment processor. Kite issues passkey-signed invoice links, pays directly in Agora AUSD on Monad, shows local-currency estimates as estimates only, and encrypts a repeat-payee address book on the user's device.

## Bounties this build is designed to pursue

| Program | What Kite implements | What still must be true for a claim |
|---|---|---|
| Agora — Cross-Border Payments | Mobile-first installable PWA, Mera onboarding, real Agora AUSD on Monad testnet, direct onchain settlement, signed invoice links | Confirm that the sponsor accepts an installable PWA as a mobile app; prove a real AUSD transfer on the live testnet; check the final dashboard wording. |
| Monad Foundation — Mera-Powered UX | Mera is the only account layer; no browser-wallet extension, seed phrase or custodial backend; private key material stays in a short-lived browser session | Demonstrate passkey creation/recovery on a supported authenticator; do not add another embedded-wallet provider. |
| Monad Foundation — Mera: One Passkey, Many Keys | HKDF-SHA-256 domain-separates a second key from Mera PRF output; AES-256-GCM encrypts address-book data before browser storage | Show that storage contains ciphertext only, then lock/re-authenticate and decrypt with the same synced passkey. |
| Envio — Best Use of Envio | HyperIndex indexes Agora AUSD Transfer events; Kite's Activity page queries the GraphQL indexer and falls back to bounded RPC logs if it is unavailable | Deploy the indexer, set `ENVIO_GRAPHQL_URL`, and show a newly sent AUSD transfer appear from Envio. |
| Alchemy — Best Projects using Alchemy | All browser JSON-RPC reads and signed transaction broadcasts go through the same-origin proxy; Alchemy is preferred, with chain-ID-checked testnet RPC failover | **Key is configured**, but `/api/health` is config-only and a live `eth_chainId` proxy error was reported. This branch fixes the request and adds failover; after deployment, prove a real Alchemy request in dashboard usage and show it in the demo before claiming the bounty. |
| Kimi — Best Builds Powered by KIMI | Optional provider-backed invoice copy drafting; the model is denied amount, address and transaction capabilities | Add the event key, configure `KIMI_API_KEY`, and demo Kimi generating the invoice copy before a human reviews it. A local preview fallback is explicitly **not** sponsor-model usage. |
| Alibaba Cloud — Qwen 3.8 Max | Optional Qwen localization of recipient-facing invoice copy | Add the event key, configure the exact regional endpoint/key/model and show Qwen translating an invoice in the demo. |
| Metropolis Track 2 — Consumer Payments (payroll-style streams) | Signed payment plans: 2–12 installments every 7/14/30 days, each a separate passkey-signed EIP-712 link bound to plan ID, index and due date; payer pays each one directly in AUSD | Demo two installments end-to-end on Monad testnet with real passkeys; this is a discrete-installment flow, not a continuously streaming on-chain salary contract. |

## Deliberately not claimed

- Dynamic and Privy are not used: Mera is the chosen account layer, and stacking auth providers would contradict the Mera-only product/security story.
- Kuru, Perpl and MetaMask Agent Wallet are trading-specific; Kite does not add unrelated trading just to list more logos.
- Chainlink CRE, Cleanverse, Nansen, Hunyuan (Kepler Plan multimodal/interactive track), Perpl, Kuru, MetaMask Agent Wallet and campus-team bounties are not claimed. Each needs its own account, SDK/API key or a product that does not fit a consumer-payments app. Programmable gifts (escrow with claim conditions) are also not built: they need a deployed contract, which is out of scope for this testnet build.

## Important reality check

This repo contains the integration code and local tests. It does not by itself create a hackathon registration, sponsor API account/key, Envio hosted deployment, public domain, funded test wallet, transaction hash, or submission. Those require owner-controlled accounts and live proof. Do not list a bounty as achieved until its requirement has been demonstrated in the final environment.
