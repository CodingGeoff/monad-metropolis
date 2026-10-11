# Pitch video 1 — product walkthrough (DRAFT, not submission-ready)

Status: **draft cut only.** The recorded walkthrough uses the local preview build with sample data.
It does **not** include an on-chain AUSD transfer, a MonadScan transaction, or a real-device passkey sign-in.
Do not submit this cut as the final video: the Monad Metropolis rules require a working product on Monad
testnet or mainnet, and that segment is still missing.

Build artifacts (video, deck, narration audio) live outside Git in the sandbox workspace.

## Narration (English, voice-00, ~2:29 total)

| Scene | On screen | Narration |
|---|---|---|
| 1 Title | Kite title card, then home | This is Kite: passkey-signed AUSD invoices on Monad. Here is a walkthrough of the product. |
| 2 Problem | Problem card | A freelancer who invoices a client abroad can wait days for a bank transfer, and lose part of the payment to opaque exchange rates. Kite turns the payment request into the shortest step in the job. |
| 3 Passkey onboarding | Preview banner → passkey sheet | Kite signs in with a Mera passkey. The passkey's PRF output derives a Monad signing key inside the browser. There is no extension, no recovery phrase, and no custody server. This build runs in interactive preview mode, so the numbers on screen are sample data, and nothing is on-chain yet. |
| 4 Overview | Overview, scroll | The overview shows the balance, send, request and test-token actions, recent activity, and quick-pay contacts. The settlement card names the network and the asset: Monad, and AUSD with six decimals. |
| 5 Invoices | Request payment, 3 installments | To request money, you create an invoice. Choose a single payment, or a plan of two to twelve installments. Each installment is its own EIP-712 signature, bound to its plan, its number, and its due date. |
| 6 Verify | Sample invoice `/pay?r=…` → Verified | The payer opens the link, and Kite verifies the signature before showing anything. The recipient, amount, token, chain, description, and expiry are all covered. This sample invoice for 150 AUSD shows Verified. Changing any signed field, or letting the invoice expire, disables the pay button. |
| 7 Contacts | Private contacts (sample) | Repeat payees live in a private address book. Contacts are encrypted with AES-GCM, using a key separate from the account key. Only ciphertext is written to local storage, and the server never receives contact data. |
| 8 Settings | Security & settings | Chain access goes through a same-origin API. Alchemy is preferred, with fallback Monad testnet nodes that must report chain ID 10143. The browser never receives an API key. |
| 9 Close | Status card | This walkthrough used the local preview build with sample data. Kite is a Monad testnet prototype. Test AUSD and test MON have no monetary value, and there is no fiat off-ramp. |

## Still required before this can be submitted

1. Record the on-chain segment on the live site or a deployed build: passkey sign-in on a real device,
   AUSD faucet claim, a 150 AUSD payment, and the MonadScan transaction page (Success, Transfer value).
2. Replace scene 3's "nothing is on-chain yet" line and scene 9's status card with the real result.
3. Confirm the RPC smoke test (`eth_chainId` returns `0x279f`) on the deployed build before recording.
4. Upload as public or unlisted, and check it in a private window.
