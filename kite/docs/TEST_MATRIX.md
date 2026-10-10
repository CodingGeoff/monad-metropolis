# Test matrix

| Surface | Automated coverage | Manual live check still needed |
|---|---|---|
| AUSD amount parsing | Positive six-decimal amounts; zero, negative, exponent, comma and over-precision rejected | Compare displayed value to actual token balance on Monad testnet |
| Signed invoices | EIP-712 request signs/verifies; serializes/decodes; tampered amount invalidates signature; changed copy hash rejected; expiry and payload cap enforced | Share link across two browser sessions; verify from the payer session |
| Mera derivation/session | Deterministic account derivation for same PRF bytes; separate output gives a different address; signing session copies its key and refuses signing after `end()` | Create and restore with supported passkey devices; confirm stable address after browser reload |
| Contact encryption | AES-GCM roundtrip; no plaintext in ciphertext; nonce changes; wrong key and tamper rejected; malformed/oversized data rejected | Add a real contact, lock, re-authenticate and decrypt on the same synced credential |
| Envio handler | `createTestIndexer()` simulates a `Transfer` and asserts chain/block/log identity, normalized addresses, timestamp, hash and exact integer value | Deploy the indexer; verify a new AUSD transfer appears through the hosted GraphQL endpoint |
| API boundary | malformed RPC rejected; non-allowlisted method blocked; caller cannot choose arbitrary Envio endpoint; AI payload validated before provider use | Configure Alchemy, Envio, Kimi/Qwen credentials and verify the live status/output |
| UI | Typecheck + Vite production build | Test at 390px and desktop; passkey flow on iOS Safari/Android Chrome; real testnet send/faucet |
| Smart contracts | No custom custody or settlement contract in the initial path; direct transfer uses Agora AUSD ERC-20 | Sponsor review and audit before any mainnet usage |

Run root tests with `npm test`. For Envio, from `indexer/` run `npm ci`, `npm run codegen`, `npm run typecheck`, then `npm test`. Passing local tests establish local behavior only; they are not a security audit or prize eligibility proof.
