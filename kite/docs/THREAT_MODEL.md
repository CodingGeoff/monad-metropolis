# Security notes and threat model

Kite is a hackathon prototype for Monad testnet. It is not audited and must not be used with real funds.

## Assets and trust boundaries

- **Signing key:** derived from Mera WebAuthn PRF output in the browser; a Mera signing session holds a private-key copy in memory until lock/logout. It is never sent to Kite's API and is zeroed by `session.end()` on lock.
- **PRF root:** retained in memory only for the current session so the app can derive the contact-book key. It is zeroed on lock.
- **Address book:** encrypted client-side with an HKDF-SHA-256-derived, non-extractable AES-256-GCM key. Browser storage contains only versioned ciphertext, nonce and algorithm metadata.
- **Payment details:** link requests are EIP-712 signed. The signer, token, chain, amount, invoice ID, invoice copy hash and expiry are verified before the payment UI enables a transfer.
- **AI provider:** only the user-entered brief or invoice prose is sent to a configured model API; structured payment amount, connected wallet and signing data are not attached automatically. Free-text fields are forwarded to the provider, so users must not enter secrets or unnecessary personal/payment data. Model output is untrusted copy and must be reviewed.
- **RPC proxy:** the API accepts only an allowlisted JSON-RPC method and server-controlled provider URLs. Omitted JSON-RPC `params` are normalized to `[]`; every candidate must answer Monad testnet chain ID `10143` before use. The server tries Alchemy first, configured backups next and the public Monad RPC last; it does not reveal keys or endpoint URLs.

## User-facing safeguards

- All financial actions are constrained to Monad testnet (10143) and the configured testnet AUSD token.
- The direct ERC-20 transfer is shown with the exact recipient and amount before signing.
- Self-payments, malformed addresses, zero/negative/over-precision amounts, oversize invoices, expired requests, and signature mismatches are rejected.
- The Agora AUSD faucet is explicitly testnet-only and rate-limited by the faucet contract.
- Demo fixtures are visibly labeled and never produce fake transaction hashes or write to the chain.
- A 15-minute inactivity timeout ends the Mera session.

## Known limitations

- Mera is a preview-stage SDK and WebAuthn PRF support varies by browser/authenticator. No custodial fallback is silently substituted.
- A signed request is an off-chain invoice. The AUSD `Transfer` event records the actual payment but does not carry Kite's invoice ID; there is no global on-chain paid/replay state, so reopening a valid link cannot guarantee a duplicate payment is blocked. The payer must check the wallet history / explorer before paying again.
- Invoice URLs contain their displayed title and note, and are intended to be shared with the payer. Do not put secrets in the invoice copy.
- Contact encryption protects stored data at rest in the browser, not a compromised device, malicious browser extension, or active XSS.
- The RPC and AI rate limiters are in-memory demo guardrails, not production-grade distributed controls.
- Local FX values are illustrative estimates; settlement is always in AUSD. No conversion or off-ramp is implemented.
