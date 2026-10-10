# Alchemy API 选型指南（Kite × Monad 测试网）

> 更新日期：2026-10-11。依据 Alchemy 官方文档（docs / Monad 页面 / 定价页）整理。
> Alchemy 的产品会调整，**上线前请以官方页面与 Dashboard 的 Chains 表为准**。

## 1. 先给结论：你只需要选 "Node API（RPC）"，网络选 Monad Testnet

| 你要做的事 | 选什么 | 说明 |
|---|---|---|
| 让 Kite 的同步、余额、发送、水龙头、收款都能工作 | **Node API → Monad Testnet（chain ID 10143）** | 这是唯一必需的产品。Kite 现有代码全部是标准 `eth_*` 方法。 |
| 以后想让交易历史更完整（不再受 15,000 个区块窗口限制） | 可选：**Transfers API** | 需要代码改动，见第 4.2 节。 |
| 其它（NFT、Portfolio、Prices、Smart Wallets、Gas Manager 等） | **暂不选** | Kite 不需要，详见第 4 节。 |

创建步骤（只做一次）：
1. 打开 https://dashboard.alchemy.com/signup 注册（免费）。
2. 左侧 **Apps → Create new app**，名称随意（如 `kite-monad-testnet`）。
3. **Network 选 Monad Testnet**（如果列表里找不到，去 Chains 页确认是否可用）。
4. 进入 app 详情页，右上角复制 **API Key**，填到 Render 的 `ALCHEMY_API_KEY`。

Endpoint 格式（Kite 服务端已经按这个格式拼接，不需要改）：
```
https://monad-testnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>
```

## 2. Alchemy 的产品分类（官方口径）

官方文档把产品分为四大类。“DeFi”“Gaming”等只是**使用场景**描述（例如 "DeFi dashboards" "Blockchain games"），在官方产品线里**没有独立的 DeFi / Gaming 产品**，它们分别依赖下面的某几个 API。

| 大类 | 包含的 API | 作用 |
|---|---|---|
| **Chain APIs**（链上原始接口） | Node API（标准 JSON-RPC）、WebSockets、Trace API、Debug API | 直接读写链上数据，与普通以太坊节点一致 |
| **Data APIs**（结构化数据） | Token API、Transfers API、Portfolio API、Prices API、NFT API、Webhooks（Notify）、Simulation API、Utility API | 预索引好的数据（余额、转账历史、NFT、价格、事件推送） |
| **Wallet APIs**（账户抽象） | Smart Wallets、Bundler API、Gas Manager（Paymaster）、Transaction APIs | 智能合约账户、代付 gas |
| **Rollups / Scale** | Rollups、Dedicated clusters、Validators | 自建 L2、企业专用节点（与本项目无关） |

## 3. Monad 测试网上各产品的支持情况

依据官方 Monad API 页面（"Related APIs"）：

| 产品 | Monad 测试网 | 备注 |
|---|---|---|
| Node API（全部标准 `eth_*`，含 `eth_getLogs`、`eth_sendRawTransaction`、`eth_getBlockByNumber`、`eth_feeHistory` 等） | ✅ 支持 | 官方 Monad 方法表 |
| WebSockets（`eth_subscribe`） | ✅ 方法表中列出 | 本项目暂不需要 |
| Trace / Debug API | ✅ 官方列为 Monad 相关 API | 仅调试用，免费计划通常不含 |
| Token API（`alchemy_getTokenBalances` 等） | ✅ 官方列为 Monad 相关 API | 可选替代 `balanceOf` 读取 |
| Transfers API（`alchemy_getAssetTransfers`） | ✅ 官方列为 Monad 相关 API | 可选，用于交易历史 |
| Bundler / Gas Manager | ✅ 官方列为 Monad 相关 API | Kite 用自托管 EOA，不需要 |
| NFT API | ✅ 官方列为 Monad 相关 API | Kite 不做 NFT |
| Webhooks（Notify） | ⚠️ 官方 Monad 页未列出 | 使用前在 Dashboard 的 Chains 表确认 |
| Portfolio API / Prices API | ⚠️ 官方 Monad 页未列出 | Kite 不需要 |
| Simulation API | ⚠️ 官方 Monad 页未列出 | 标准 `eth_simulateV1` 在 Monad 方法表中，可直接用 |

> Monad 官方页说明：Alchemy 目前**只支持 Monad 测试网**，不要选主网。

## 4. 各 API 详解：用途、用法、是否需要

### 4.1 Node API（JSON-RPC）— **必选**
- **用途**：读取区块、余额、合约状态，发送已签名交易，查询日志与回执。
- **Kite 用到的方法**（均已在服务端白名单中）：
  `eth_chainId`、`eth_blockNumber`、`eth_getBalance`、`eth_call`（读 AUSD 余额、decimals、symbol）、`eth_getCode`、`eth_getLogs`（交易历史回退）、`eth_estimateGas`、`eth_getTransactionCount`、`eth_gasPrice`、`eth_maxPriorityFeePerGas`、`eth_feeHistory`、`eth_getBlockByNumber`（viem 估算费用用）、`eth_sendRawTransaction`、`eth_getTransactionReceipt`。
- **用法示例**（可直接在终端测试，替换 KEY）：
  ```bash
  curl -s https://monad-testnet.g.alchemy.com/v2/$ALCHEMY_API_KEY \
    -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}'
  # 返回：{"jsonrpc":"2.0","id":1,"result":"0x..."}
  ```
- **计费**：每个方法消耗不同的 CU（Compute Units），按 CU 计费。`eth_getLogs` 通常比 `eth_blockNumber` 重得多，具体数值见官方 CU 文档。

### 4.2 Transfers API（`alchemy_getAssetTransfers`）— 可选，推荐以后升级
- **用途**：一次请求拿到某地址的历史转账（外部 ETH、ERC-20、ERC-721、ERC-1155、内部转账），自动分页。
- **为什么比现在好**：Kite 现在的回退方案是扫描最近 15,000 个区块的 `eth_getLogs`，窗口外的历史查不到；Transfers API 按地址直接查，没有这个限制。
- **用法示例**（查某地址发出的 ERC-20 转账，按时间倒序，最多 25 条）：
  ```bash
  curl -s https://monad-testnet.g.alchemy.com/v2/$ALCHEMY_API_KEY \
    -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"alchemy_getAssetTransfers","params":[{
          "fromBlock":"0x0","toBlock":"latest",
          "fromAddress":"0xYOUR_ADDRESS",
          "category":["erc20"],
          "withMetadata":true,
          "order":"desc",
          "maxCount":"0x19"}]}'
  ```
  - `withMetadata: true` 会返回时间戳；
  - 结果超过 `maxCount` 或 1000 条时会返回 `pageKey`，需在 **10 分钟内**带上 `pageKey` 继续请求；
  - `category` 可选 `external`、`internal`、`erc20`、`erc721`、`erc1155`、`specialnft`。
- **接入 Kite 需要的改动**：服务端 `server/app.ts` 的 `/api/rpc` 白名单只允许 `eth_*`、`web3_*`、`net_*`，`alchemy_getAssetTransfers` 会被 403。需要单独加一个只读的 `/api/alchemy/transfers` 路由并限制参数。**这是代码改动，本次不做，等你确认后再做。**

### 4.3 Token API（`alchemy_getTokenBalances` 等）— 可选
- **用途**：查询地址持有的 ERC-20 余额、token 元数据（名称、符号、decimals、logo）、授权额度。
- **用法示例**（只查 AUSD 余额）：
  ```bash
  curl -s https://monad-testnet.g.alchemy.com/v2/$ALCHEMY_API_KEY \
    -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"alchemy_getTokenBalances",
         "params":["0xYOUR_ADDRESS",["0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC"]]}'
  ```
- **Kite 现状**：余额已经用标准 `eth_call` 读取，功能正常，**不需要替换**。仅当你想要“列出钱包里所有代币”时才有价值。

### 4.4 Webhooks（Notify）— 暂不需要
- **用途**：链上事件（转账、交易确认、地址活动）发生时主动 POST 到你的服务器，免去轮询。
- **为什么暂不选**：Kite 目前每 30 秒刷新一次；Monad 官方页未列出 Webhooks 支持，需先在 Dashboard 确认。
- **何时考虑**：要做“收款到账即时提醒”时再用。注意其签名校验（`x-alchemy-signature`）要在服务端实现。

### 4.5 Portfolio API / Prices API / NFT API — 不需要
- **Portfolio**：多链资产总览，适合钱包首页的“总资产”；Kite 只看 AUSD，不需要。
- **Prices**：代币价格（USD）；Kite 的法币换算是本地估算（`src/lib/fx.ts`），且测试网 AUSD 无市场价格。
- **NFT**：NFT 所有权和元数据；Kite 不涉及 NFT。

### 4.6 Smart Wallets / Bundler / Gas Manager — 不需要（但要知道区别）
- **Smart Wallets + Gas Manager** 的作用是“用智能合约账户 + 代付 gas”，让用户无需持有 MON。
- Kite 的设计是：**Mera passkey 派生的普通 EOA 账户**，用户自己持有测试 MON 付 gas。改用 Gas Manager 会改变整个账户模型，属于架构变更，不是 API 替换。
- 官方定价页显示 Gas sponsorship 为 **Testnet only**，且有 admin fee；这些都不是本项目需要的。

### 4.7 WebSockets / Trace / Debug / Simulation — 暂不需要
- **WebSockets**：可以把轮询改为 `eth_subscribe("newHeads")`，减少请求数。Kite 目前 30 秒轮询完全够用，升级收益低。
- **Trace / Debug**：排查复杂交易时用，免费计划通常不含。
- **Simulation**：发送前预览交易效果，有价值但不是必需；Monad 上可直接使用标准 `eth_simulateV1`。

### 4.8 Rollups / Solana / 其它链 — 与本项目无关
Kite 只在 Monad 测试网上运行，其它链和自建 Rollup 不需要。

## 5. 定价与 Free 计划（官方定价页）

| 项 | Free | Pay as You Go | Enterprise |
|---|---|---|---|
| 价格 | 免费 | 按量，$0.525 / 1M CU | 定制 |
| 每月额度 | **30M CU** | 超出部分按量计费 | 定制 |
| 请求速率 | 15 req/s（300 CU/s） | 起步 300 req/s | 起步 1000 req/s |
| Apps / Webhooks 数量 | 5 / 5 | 30 / 100 | 100 / 500 |
| 包含 | 全部主网与测试网、Node / Token / Transfers / NFT / Webhooks 等 | 加上 Premium endpoints | 加上 SLA、更大 `eth_getLogs` 范围 |

对 Kite 的判断：
- **一个免费 app 足够**。Kite 的后端代理统一使用同一个 key，只需一个 app（选 Monad Testnet）。
- 30M CU/月对演示和小规模测试通常足够，但具体消耗取决于方法（`eth_getLogs` 等较重）和访问量。上线前可以在 Dashboard 的 Usage 页面观察用量。
- Free 计划没有 Debug/Trace 和 Gas sponsorship，本项目也不需要。

## 6. 推荐的最终选择（逐项勾选）

- [x] **Node API → Monad Testnet**（必选，即 `ALCHEMY_API_KEY`）
- [ ] Transfers API（可选，建议在下一轮改造中接入，替代 15,000 区块的日志回退）
- [ ] Token API（可选，仅当需要“全部代币列表”）
- [ ] Webhooks（暂不，先确认 Monad 支持）
- [ ] NFT / Portfolio / Prices / Smart Wallets / Gas Manager / Simulation / Trace / Debug / Rollups（不选）

## 7. 常见问题

**Q：为什么 Dashboard 里我找不到 "DeFi" "Gaming" 分类？**
A：Alchemy 的产品按“链上 RPC / 数据 / 钱包 / Rollup”分类，DeFi、Gaming 只是使用场景。DeFi 项目通常选 Node + Transfers + Token + Prices，游戏项目通常选 Node + NFT + Webhooks。Kite 是支付应用，所以只需要 Node。

**Q：我可以不配 Alchemy 吗？**
A：可以。不配置 `ALCHEMY_API_KEY` 时，服务端会使用 `MONAD_RPC_URL`（默认公共测试网 RPC），功能完整，但公共节点可能限流，高峰时同步会变慢或失败。

**Q：Key 泄露了怎么办？**
A：在 Dashboard 的 app 设置里 **Regenerate / 删除** 该 key，然后更新 Render 的 `ALCHEMY_API_KEY`。该 key 只应放在服务端环境变量中，不能写入 `VITE_` 前缀变量或提交到 Git。

**Q：如何确认某个 API 在 Monad 上可用？**
A：打开 Dashboard → Chains（或 https://www.alchemy.com/docs/monad/monad-api-overview），查看 Monad 对应的产品是否勾选。以官方页面为准。
