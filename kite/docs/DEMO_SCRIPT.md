# Three-minute demo script (draft)

## 0:00–0:25 — Problem and user
"A solo designer can finish work for a client in another country and still wait days for a bank transfer, lose money to opaque FX and invoice manually. Kite turns the payment request into the shortest part of the job."

## 0:25–0:55 — Passkey onboarding
Create or sign in with a Mera passkey. Show the Monad testnet wallet address and explain that the EOA is derived client-side; the app never handles a recovery phrase or custody backend.

## 0:55–1:35 — Make an invoice
Type a short brief. Use the configured Kimi provider to draft an invoice title/description; optionally use Qwen to localize recipient-facing copy. Edit the amount manually. Explain that the structured amount and connected wallet are not attached automatically and the model has no signing tools; user-entered free text is sent as-is, so avoid secrets or payment data.

## 1:35–2:05 — Share and verify
Sign the request with EIP-712, show the QR/link, open it in a private window, and show the verified signature, exact amount, recipient and expiry.

## 2:05–2:35 — Settle AUSD
Use a funded Monad testnet passkey account to pay the request. Show a real AUSD transfer hash and the testnet explorer receipt. Do not use a screenshot or seeded fake hash as live proof.

## 2:35–2:55 — Data and privacy
Show the Activity page reading the event through Envio HyperIndex, then show the encrypted contact-book payload contains only ciphertext. Mention Alchemy as the server-side Monad RPC provider if that key is configured.

## 2:55–3:00 — Close
"Kite makes cross-border AUSD settlement feel like sending an invoice, not learning a blockchain. The payment is on Monad; custody stays with the people doing the work."

## Recording checklist

- Use a real phone viewport or installed PWA and disclose whether the build is a PWA vs native app.
- Keep the QR, payment link, wallet address, transaction hash and explorer visible long enough to verify.
- Show testnet labels and say test assets have no monetary value.
- Record no secrets, account tokens, environment files or API keys.
- If an integration is not live, call it out; do not narrate a planned integration as shipped.
