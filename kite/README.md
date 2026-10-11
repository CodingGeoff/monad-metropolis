# Kite — cross-border AUSD payments for independent work

**Kite** is a mobile-first installable web app for freelancers and small studios. It turns a payment request into a passkey-signed link, then settles a direct Agora AUSD transfer on Monad. A separate Mera PRF-derived key encrypts the repeat-payee address book locally.

> **Prototype / testnet only.** No real money. No security audit. Do not use for mainnet funds.

**Live:** <https://kite-monad-payments.onrender.com/> · **Health:** [`/api/health`](https://kite-monad-payments.onrender.com/api/health) reports the configured RPC preference and backup count (it does not itself probe the upstream nodes).

For the current submission status and the remaining steps, read [`docs/SUBMISSION_RUNBOOK.md`](docs/SUBMISSION_RUNBOOK.md).

## Product flow

1. Create or restore a wallet with a **Mera** WebAuthn passkey; no wallet extension, seed phrase prompt or custody server.
2. Create a payment request in AUSD, either as a single invoice or as a payroll-style plan of 2–12 installments. Each installment is a separately signed link. Invoice copy can be drafted with Kimi and translated with Qwen when server keys are configured. Only the user-entered prose field is sent; structured payment amount, connected wallet, and signing data are not attached automatically. Review text before sending and do not enter secrets into the prompt.
3. Sign the request as typed data (EIP-712). The payer verifies the signature, chain, token, payee, amount, request text and expiry.
4. The payer reviews and signs a direct Agora AUSD transfer from their own passkey-derived account.
5. View AUSD transfers through **Envio HyperIndex** when configured, or recent Monad RPC logs as a bounded fallback.

## Stack

- React + Vite + TypeScript
- Express same-origin API with Alchemy-first, chain-ID-checked Monad RPC failover, Envio GraphQL and optional OpenAI-compatible Kimi/Qwen/Hunyuan endpoints
- Mera `@category-labs/mera` for passkey PRF and signing sessions
- viem for EVM RPC, EIP-712 and AUSD transfers
- Envio HyperIndex for AUSD Transfer history
- Vite preview uses relative `/api/*` URLs and proxies them to the local API; browser code does not call localhost.

## Run locally

Requires Node.js 24.x and npm. The pinned Mera passkey package declares Node.js 24 or newer.

```bash
cp .env.example .env
npm ci
npm run dev
```

Open `http://localhost:4173`. The app starts in a clearly marked preview mode. No fake transaction is ever sent.

### Passkeys

WebAuthn requires a secure context (HTTPS, or `localhost`). For a stable production passkey origin, set `VITE_MERA_RP_ID` to the final domain before building. Do not change the RP ID after real users have created credentials.

### Live testnet wallet

- Create or restore a passkey in a supported browser/authenticator.
- Get free test MON at the [Monad testnet faucet](https://faucet.monad.xyz/); MON pays testnet gas.
- In Kite, request test AUSD from Agora's testnet faucet (rate-limited). The testnet AUSD has no monetary value.
- AUSD on Monad Testnet: `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` (6 decimals).
- Agora testnet AUSD faucet: `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C`.
- Testnet chain ID: `10143`; RPC: `https://testnet-rpc.monad.xyz`; explorer: `https://testnet.monadscan.com`.

Network/token/faucet values are cross-referenced to [Monad testnet docs](https://docs.monad.xyz/developer-essentials/testnet) and [Agora contract deployments](https://docs.agora.finance/developer/contract-deployments). Recheck addresses against the official sources before any demo deployment.

## Optional integrations

The API loads the root `.env` with Node.js's native env-file loader; values already provided by the deployment environment take precedence. All keys below are **server-only**. Never add a secret to a `VITE_` variable or commit `.env`.

| Environment variable | Purpose |
|---|---|
| `ALCHEMY_API_KEY` | Preferred same-origin Monad testnet RPC. On provider failure, the server tries configured backups and then the official public testnet RPC; no key or endpoint URL is returned to the browser. |
| `MONAD_RPC_URL` | Optional operator-configured secondary RPC URL. HTTPS is required in production. |
| `MONAD_RPC_FALLBACK_URLS` | Optional comma-separated backup URLs (up to three are considered); every endpoint is checked for chain ID `10143` before use. The official public endpoint remains the final built-in fallback. |
| `ENVIO_GRAPHQL_URL` | Hosted HyperIndex GraphQL endpoint used by the Activity page. |
| `KIMI_API_KEY`, `KIMI_BASE_URL`, `KIMI_MODEL` | Kimi invoice-copy drafting. Default model: `kimi-k3`. |
| `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL` | Qwen invoice translation. Set the exact endpoint for your Alibaba Model Studio region/workspace. |
| `HUNYUAN_API_KEY`, `HUNYUAN_BASE_URL`, `HUNYUAN_MODEL` | Optional Hunyuan-compatible text provider; default endpoint/model are documented in `.env.example`. |

If a model key is missing, the UI can insert a clearly labeled local copy preview. That is not a call to Kimi/Qwen and does not qualify as sponsor-model usage.

## Monad RPC reliability

All browser chain traffic stays on the same-origin `/api/rpc` route. JSON-RPC 2.0 allows `params` to be omitted for methods with no arguments; the proxy normalizes that form to `params: []` (the viem `eth_chainId` case that previously failed). Provider order is Alchemy, configured backup URLs, then Monad's public testnet endpoint. Each endpoint must answer chain ID `10143` before it receives reads or signed broadcasts. Transient transport/provider failures fall through; a definitive EVM error such as a contract revert is returned as-is. Failed providers enter a short cooldown but are still retried if every endpoint is cooling down. Responses include non-secret `x-kite-rpc-provider`, `x-kite-rpc-fallback-used`, and `x-kite-rpc-attempts` diagnostics.

This improves availability but cannot guarantee service if every configured endpoint or the network is down. After an ambiguous signed-broadcast timeout, check the transaction on MonadScan before trying again.

## Envio indexer

`indexer/` contains a HyperIndex config, schema and handler for the actual Agora AUSD `Transfer` event on Monad testnet. From that directory:

```bash
npm ci
npm run codegen
npm run typecheck
npm test
npm run dev
```

Local HyperIndex development needs Docker and the Envio setup described in the [Envio docs](https://docs.envio.dev/docs/HyperIndex/quickstart). For a hosted deployment, publish the indexer to a repository, connect the Envio GitHub App, deploy it, then set the hosted GraphQL endpoint as `ENVIO_GRAPHQL_URL`. Without it, Kite uses a bounded RPC-log fallback. The fallback is not represented as Envio usage.

## Tests

```bash
npm test
```

Coverage includes signed installment plans (exact splitting, tamper-bound schedule fields), deterministic Mera account derivation and signing-session zeroization, HKDF/AES-GCM contact encryption and tamper rejection, exact AUSD amount parsing, EIP-712 link integrity/expiry, API input validation, RPC method allowlisting, real viem `eth_chainId` routing with omitted params, the real viem signed write path (faucet claim and AUSD transfer) including the block read fee estimation needs, chain-ID-checked RPC failover and in-process server routing for Alchemy, Envio and Kimi/Qwen/Hunyuan using stubbed upstreams. The separate Envio package has its own handler-simulation test, typecheck and zero-vulnerability npm audit. Passing local tests do not equal an audit or prize eligibility proof.

## Security and privacy

- The signing session and PRF root exist only in browser memory and are zeroed on lock/logout; the inactivity lock is 15 minutes.
- Contact records are encrypted in the browser with AES-256-GCM and a separately labeled HKDF key derived from the Mera PRF output. The server receives no contact names or addresses.
- AI can only write invoice prose or translate it. It cannot sign, choose a recipient or initiate a transaction.
- Payment links are signed typed data. The app rejects altered/expired requests before enabling payment.
- All app writes are hard-pinned to Monad testnet AUSD and require an explicit user action.
- Read the full [threat model](docs/THREAT_MODEL.md) and [test matrix](docs/TEST_MATRIX.md).

## Metropolis notes

- **Chosen track:** Consumer Products & Payments (including payroll-style installment plans).
- **Deployment:** `render.yaml` is the Render Blueprint behind the live service at <https://kite-monad-payments.onrender.com/> — Node `24.21.0`, Singapore, `rootDir: kite`, `/api/health` health check, auto-deploy on commits to `main`. Netlify is possible through Functions, but needs an API adapter/rewrite. See the [full Metropolis playbook](docs/METROPOLIS_PLAYBOOK.md) for domain, HTTPS, phone and passkey steps.
- **Target bounties:** Agora cross-border payments, both Mera bounties, Envio, Alchemy credits, Kimi credits; Qwen credits if a real API key is configured and shown. Only Alchemy currently has live server-side configuration; see the [submission runbook](docs/SUBMISSION_RUNBOOK.md) for what is still unproven.
- **PWA/native:** the current build is an installable PWA, not a native iOS/Android binary. Ask Agora whether its final mobile-app criterion accepts a PWA.
- **No guarantees:** code alone cannot guarantee an award. Live sponsor service use, testnet transactions, a public demo/repo, video and portal submission must be completed by the participant.
- The platform, exact prize values, rule wording, eligibility and deadline timezone are authoritative. Check the [Metropolis portal](https://hackathon.monad.xyz/) before submitting.
- Short demo outline: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md); bounty matrix and gap list: [docs/BOUNTY_MAP.md](docs/BOUNTY_MAP.md).
- 完整操作手册（本地运行、用户流程、分期付款、测试网实操、部署、赞助商开通、提交清单）：[docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md)。
- 叠加 Privy / Dynamic 的完整分析与风险：[docs/AUTH_STACKING_ANALYSIS.md](docs/AUTH_STACKING_ANALYSIS.md)。
- Metropolis 参赛完整中文操作手册（当前进度、奖金台账、portal/GitHub/部署/链上测试/集成/提交步骤）：[docs/METROPOLIS_PLAYBOOK.md](docs/METROPOLIS_PLAYBOOK.md)。

## License

MIT. Third-party packages retain their own licenses; Mera is used under MIT OR Apache-2.0.
