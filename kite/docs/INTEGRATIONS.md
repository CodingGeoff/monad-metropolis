# Integration setup notes

## Agora AUSD on Monad Testnet

The public Monad testnet RPC was read-only checked during development: chain ID `10143`, AUSD contract code present, `symbol()` returned `AUSD`, `decimals()` returned `6`, and the Agora faucet's `token()` returned the same AUSD contract address. The faucet proxy's verified implementation ABI exposes `requestFunds(address)` and `token()`; Kite checks the chain, faucet code and faucet token before offering a request. No faucet transaction or user-to-user payment was sent during this verification.

- [Agora's deployment list](https://docs.agora.finance/developer/contract-deployments)
- [MonadScan AUSD testnet deployment transaction](https://testnet.monadscan.com/tx/0x66a93ef0a839d84b05a9768c842e38bec0fbd1345cb415a6893881108c07cd10) — proxy creation block `5726771`, used as the Envio start block.
- [MonadScan verified faucet proxy / ABI](https://testnet.monadscan.com/address/0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C#code)

The read check is not a substitute for a successful testnet faucet request and AUSD transfer in the demo.

## Alchemy Monad Testnet RPC

1. Create a Monad Testnet app in Alchemy.
2. Set `ALCHEMY_API_KEY` only in the server's environment.
3. Restart the API, then verify `GET /api/health` returns `rpcProvider: "alchemy"`.
4. Create a passkey account and exercise a balance read, faucet call, and AUSD send; all use the same-origin `/api/rpc` proxy.

The browser never receives the Alchemy key. The proxy only allows read methods and signed raw transaction submission; it does not accept an arbitrary chain URL or private RPC target.

## Envio HyperIndex

1. From `indexer/`, install dependencies and run `npm run codegen`.
2. Connect the indexer to Envio Cloud, deploy the Monad Testnet indexer, and wait for it to sync.
3. Set `ENVIO_GRAPHQL_URL` to the deployed GraphQL endpoint on the Kite API service.
4. Open `/api/health`, confirm `integrations.envio` is true, make a test AUSD transfer and inspect the Activity page's `Indexed by Envio` source tag.

Until this is done, the Activity page falls back to `eth_getLogs` over the last 15,000 blocks and labels the source as RPC.

## Kimi / Qwen / Hunyuan

All three use the server-side OpenAI-compatible chat-completions protocol. Model names and base URLs can be changed in the server's `.env`. A real sponsor bounty demo must call the sponsor's actual model with an event key and retain the provider/model record for evidence. The local copy fallback is deliberately not described as AI.

- Kimi: `https://api.moonshot.ai/v1`, currently default `kimi-k3`.
- Qwen: region/workspace-specific Alibaba Model Studio compatibility URL; default is `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`, model `qwen3.8-max`.
- Hunyuan: Tencent TokenHub compatible URL, default `https://tokenhub-intl.tencentcloudmaas.com/v1`, model `hy4-preview`.

Check each provider's live API docs for the current event model identifier, endpoint and limits before submission.
