# Kite — passkey AUSD invoices on Monad

**Kite** turns a payment request into a passkey-signed link, then settles a direct Agora **AUSD**
transfer on **Monad**. No wallet extension, no seed phrase, no custodial backend.

Built for **Monad Metropolis** · track: **Consumer Products & Payments**.

| | |
|---|---|
| **Live demo** | <https://kite-monad-payments.onrender.com/> |
| **Health / integrations** | <https://kite-monad-payments.onrender.com/api/health> |
| **Network** | Monad Testnet, chain ID `10143` |
| **Token** | Agora AUSD `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` (6 decimals) |
| **Explorer** | <https://testnet.monadscan.com/> |
| **License** | MIT |

> **Testnet prototype.** Test AUSD and test MON have no monetary value. No fiat off-ramp.
> Not audited. Do not point this at mainnet funds.

---

## What it does

1. **Onboard with a passkey.** A [Mera](https://mera.category.xyz/) WebAuthn passkey derives the
   secp256k1 signing key entirely in the browser via PRF. The app never sees a recovery phrase and
   there is no custody server. The signing session is memory-only and is zeroed on lock/logout
   (15-minute inactivity lock).
2. **Create an AUSD payment request** — a single invoice, or a payroll-style plan of 2–12
   installments. Every installment is its own EIP-712 signature bound to plan ID, index, count and
   due date, so a payer can prove exactly which installment they were shown.
3. **The payer verifies before paying.** Recipient, amount, token, chain, description and expiry are
   all covered by the signature; tampering or expiry blocks the payment button.
4. **Settle directly.** The payer signs an ERC-20 `transfer` from their own passkey account. Kite
   holds nothing and deploys no contract.
5. **One passkey, many keys.** A second key is HKDF-domain-separated from the same Mera PRF output
   and encrypts the repeat-payee address book with AES-256-GCM before it touches `localStorage`.
   Only ciphertext is ever stored; the server never receives contact names or addresses.

## Repository layout

| Path | What it is |
|---|---|
| [`kite/`](kite/) | The application: React + Vite + TypeScript PWA and the same-origin Express API. **Start here** — see [`kite/README.md`](kite/README.md). |
| [`kite/server/`](kite/server/) | Express API: Alchemy-first, chain-ID-checked Monad RPC failover with a method allowlist, Envio GraphQL reader, optional Kimi/Qwen/Hunyuan endpoints. Server-only secrets; `/api/health` reports provider preference and backup count without echoing URLs or keys. |
| [`kite/indexer/`](kite/indexer/) | Envio **HyperIndex** config, GraphQL schema and handler for the real Agora AUSD `Transfer` event on Monad testnet. |
| [`kite/docs/`](kite/docs/) | [Submission runbook](kite/docs/SUBMISSION_RUNBOOK.md) · [demo script](kite/docs/DEMO_SCRIPT.md) · [bounty map](kite/docs/BOUNTY_MAP.md) · [threat model](kite/docs/THREAT_MODEL.md) · [test matrix](kite/docs/TEST_MATRIX.md) |

Mera is consumed as the published npm dependency `@category-labs/mera@0.2.0` (© Category Labs,
MIT OR Apache-2.0) — there is no vendored copy in this repository.

## Run it locally

Requires **Node.js 24.x** (`package.json` pins `>=24 <25`; `.npmrc` sets `engine-strict=true`).

```bash
cd kite
cp .env.example .env     # all keys may be left empty
npm ci
npm run dev              # Vite on :4173, API on :4174
```

Open <http://localhost:4173>. Without keys the app runs in a clearly labelled preview mode and
never sends a transaction.

```bash
npm test          # 52 tests, 7 files
npm run build     # tsc --noEmit && vite build
npm audit         # 0 vulnerabilities
```

## Deployment

[`kite/render.yaml`](kite/render.yaml) is the Render Blueprint that produced the live service:
Node `24.21.0`, Singapore region, `rootDir: kite`, `/api/health` health check, auto-deploy on
commits to `main`. The API and the built SPA are served from the **same origin**, so browser code
only ever calls relative `/api/*` paths — nothing calls `localhost` from the browser.

Do not deploy `dist/` as a static site: the app needs the same-origin Express API.

## Integrations

| Integration | Status on the live service |
|---|---|
| **Alchemy** — Monad testnet RPC | Key is configured on Render. A live `eth_chainId` proxy error was reported; this branch fixes optional JSON-RPC params and adds chain-checked provider failover. Production redeploy and live retest are still required. |
| **Mera** — passkey PRF and signing | **Integrated.** The only account layer. Requires a real device/authenticator to demonstrate. |
| **Agora AUSD** — settlement | **Integrated.** Real testnet contract; faucet claim is built into the app (10,000 test AUSD per call). |
| **Envio** — HyperIndex activity feed | **Code complete, not deployed.** Indexer is local-tested; without `ENVIO_GRAPHQL_URL` the Activity page falls back to bounded RPC logs and labels itself as such. |
| **Kimi / Qwen / Hunyuan** — invoice copy | **Code complete, keys not configured.** Without a real key the UI offers a clearly labelled *local* preview, which is **not** sponsor-model usage. |

## Honest limitations

- **Installable PWA, not a native iOS/Android binary.** Whether that satisfies a "mobile app"
  criterion is for the organiser to decide; do not claim otherwise.
- **No fiat on/off-ramp, no FX execution, no bank payout.** Local-currency figures are static
  reference estimates, labelled as such.
- **No gas sponsorship, no relayer, no escrow contract.** The payer pays their own MON gas.
- **Contacts live only in the encrypting browser.** Clearing site data is not recoverable; there is
  no cloud backup and that is deliberate.
- **Automated tests are not a security audit.**

## Status log

Only evidence-backed claims. Verified 2026-10-11 (UTC).

- [x] Public repository
- [x] Public HTTPS deployment serving the SPA **and** the API
- [x] `/api/health` reports chain ID `10143` and configured provider preference without exposing keys; it is a configuration check, not an upstream RPC probe
- [x] Alchemy key configured server-side on Render
- [!] **RPC regression reported on the current Render build:** `eth_chainId` returned `Invalid JSON-RPC request` because the proxy required a `params` array even though JSON-RPC permits `params` to be omitted. This branch normalizes omitted params and adds chain-checked Alchemy → configured backup(s) → public RPC failover; deployment and production verification are pending.
- [x] EIP-712 invoice links sign, round-trip and verify on the deployed build (`/pay?r=…` → **Verified**)
- [x] Demo wallet `0xba7cd500C6CbE528eEBA123583de0B09B8f109dB` funded with 10 test MON
- [ ] **Test AUSD balance — last observed as 0.** Re-check after the RPC fix is deployed; if still empty, claim through the in-app faucet. A real on-chain payment remains unverified.
- [ ] A real AUSD transfer with a public explorer receipt
- [ ] Envio Cloud endpoint
- [ ] Metropolis portal submission and demo video

The step-by-step path from here is [`kite/docs/SUBMISSION_RUNBOOK.md`](kite/docs/SUBMISSION_RUNBOOK.md).
