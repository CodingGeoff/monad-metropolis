# Kite 完整操作手册（Metropolis 参赛版）

> 版本日期：2026-10-11（UTC 核对）。本手册含有历史 `main` 状态；RPC 回归与当前修复/生产部署状态以 [SUBMISSION_RUNBOOK.md](SUBMISSION_RUNBOOK.md) 为准。本工作分支已增加 RPC failover 和 53 项自动化测试。
>
> **⚠️ 距离截止不到 48 小时，请直接按 [SUBMISSION_RUNBOOK.md](SUBMISSION_RUNBOOK.md) 执行。** 本手册是背景参考和详细操作说明，不是冲刺清单。
>
> **已上线：** <https://kite-monad-payments.onrender.com/>。历史 `/api/health` 报告 `rpcProvider: "alchemy"`、`chainId: 10143`（仅为配置概览，不代表上游可用）；当前 `eth_chainId` 错误报告与待部署修复以 [SUBMISSION_RUNBOOK.md](SUBMISSION_RUNBOOK.md) 为准。`envio` 与三项 AI provider 上次检查为 `false`。
>
> **定位声明：** Kite 是 Monad **测试网**上的原型，未经审计，不得用于真实资金。测试网 AUSD 与 MON 没有货币价值。

---

## 目录

1. [产品与赛道映射](#1-产品与赛道映射)
2. [系统架构](#2-系统架构)
3. [环境准备](#3-环境准备)
4. [本地运行](#4-本地运行)
5. [环境变量参考](#5-环境变量参考)
6. [测试与质量门禁](#6-测试与质量门禁)
7. [终端用户完整流程](#7-终端用户完整流程)
8. [分期付款（工资流）操作](#8-分期付款工资流操作)
9. [测试网实操：拿到真实交易哈希](#9-测试网实操拿到真实交易哈希)
10. [部署上线（Render）](#10-部署上线render)
11. [赞助商集成的开通步骤](#11-赞助商集成的开通步骤)
12. [证据收集清单](#12-证据收集清单)
13. [Metropolis 提交清单与时间表](#13-metropolis-提交清单与时间表)
14. [故障排查](#14-故障排查)
15. [安全、隐私与合规注意事项](#15-安全隐私与合规注意事项)
16. [已知限制（诚实清单）](#16-已知限制诚实清单)

---

## 1. 产品与赛道映射

**Kite：** 面向自由职业者与小型工作室的 AUSD 收款工具。商家用 Mera passkey 签名一张付款请求（EIP-712），付款人核验签名后，直接从自己的 passkey 账户向商家转 AUSD。本地加密通讯录。

| 官方奖项（monad.xyz 官网列表） | 金额 | Kite 当前状态 | 需要你完成 |
|---|---|---|---|
| Consumer Products & Payments 主赛道 | $30,000 / 3 队平分 | 产品方向匹配；分期付款（工资流方向）已实现 | 提交门户、视频、测试网交易证据 |
| Agora — Best Cross-Border Payments App | $10,000 | AUSD 跨境付款、Mera 开户、即时结算 | 确认 PWA 是否算 mobile app；两端实测 |
| Mera — Best Mera-Powered UX | $2,500 | Mera 作为唯一账户层；无扩展、无助记词 | 真机 passkey 创建/恢复实测 |
| Mera — One Passkey, Many Keys | $2,500 | PRF 派生第二密钥加密通讯录 | 证明存储只有密文，并完成锁定后解密 |
| Envio — Best Use of Envio | $1,000 | HyperIndex 索引 AUSD Transfer；Activity 页优先读取 Envio | Envio Cloud 部署并设置 `ENVIO_GRAPHQL_URL` |
| Alchemy — Best Projects using Alchemy | $1,000 credits | 服务端 RPC 代理优先尝试 Alchemy；health 只反映配置，不证明请求由 Alchemy 成功处理 | 部署修复后用响应头确认实际 provider 未 fallback，并提供 Alchemy 控制台 usage 证据 |
| Kimi — Best Builds Powered by KIMI | $3,000 credits | 发票文案生成（可选，非核心） | 真实 key 与真实调用记录 |
| Alibaba Cloud — Best Builds with Qwen 3.8 Max | $5,000 credits | 发票译文（可选） | 真实 key 与真实调用记录 |

未覆盖的奖项及原因见 [`BOUNTY_MAP.md`](BOUNTY_MAP.md)；Privy / Dynamic 叠加的分析见 [`AUTH_STACKING_ANALYSIS.md`](AUTH_STACKING_ANALYSIS.md)。

---

## 2. 系统架构

```
浏览器 (React + Vite PWA)
  ├─ Mera passkey (WebAuthn PRF) → 派生 secp256k1 密钥（仅内存，锁定即清零）
  ├─ EIP-712 签名付款请求 / 分期计划（本地完成）
  ├─ 通讯录：HKDF(PRF) → AES-GCM 密文 → localStorage
  └─ 所有链上读写 → 同源 /api/*
            │
Express API（server/app.ts）
  ├─ /api/health        仅返回布尔与 provider 名称，绝不回显密钥
  ├─ /api/rpc           JSON-RPC 白名单代理（Alchemy → 配置备份 → 公共 RPC，逐节点校验 chain ID）
  ├─ /api/envio/transfers  Envio GraphQL（HTTPS 且服务端固定地址）
  └─ /api/ai            Kimi / Qwen / Hunyuan（服务端密钥，严格 JSON 结构校验）
            │
Monad Testnet (chainId 10143)  ·  AUSD 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC（6 位小数）
Envio HyperIndex（indexer/）：索引 AUSD Transfer 事件
```

关键设计：付款请求是**链下签名的数据**，付款本身是**链上 ERC-20 transfer**。Kite 不托管资金，没有自建合约。

---

## 3. 环境准备

| 项目 | 要求 |
|---|---|
| Node.js | **24.x**（`package.json` 的 `engines` 为 `>=24 <25`；低版本 `npm ci` 会被拒绝） |
| npm | 随 Node 24 提供 |
| Git | 任意近期版本 |
| 浏览器 | 支持 WebAuthn PRF 的 Chrome / Safari / Edge 最新版（需由真机验证） |
| 安全上下文 | `localhost` 或 HTTPS。passkey 在 HTTP 公网地址上无法工作 |
| 测试网资金 | Monad 测试网 MON（付 gas）；AUSD 用应用内 faucet 领取 |

在沙箱或其他机器上确认版本：

```bash
node -v   # 必须是 v24.x
npm -v
```

如果系统默认 Node 不是 24，可以用 nvm 或 `npm i node@24.21.0` 在独立目录安装后放到 PATH 前面。

---

## 4. 本地运行

```bash
git clone <你的仓库地址>
cd monad-metropolis/kite

cp .env.example .env      # 首次运行可以保持所有 key 为空
npm ci
npm run dev
```

- 打开 `http://localhost:4173`。
- 开发模式下 Vite（4173）把 `/api` 代理到 API（4174）。浏览器端不会直接访问 localhost 以外的服务。
- 没有任何 key 时，应用处于“预览模式”：可以浏览界面，但不会发送任何交易。预览数据会明确标注。

生产模式本地验证：

```bash
npm run build
NODE_ENV=production PORT=4174 npm start
# 打开 http://localhost:4174
```

---

## 5. 环境变量参考

所有 key 仅在服务端使用，**不要**加 `VITE_` 前缀，**不要**提交 `.env`。

| 变量 | 是否必需 | 作用 |
|---|---|---|
| `VITE_MERA_RP_ID` | 生产必需 | WebAuthn RP ID，应设为最终域名（如 `kite-monad-payments.onrender.com`）。**构建前设置**，上线后不要更改，否则已有 passkey 失效 |
| `PORT` | 否 | API 端口，默认 4174 |
| `ALCHEMY_API_KEY` | Alchemy 赛道需要 | 首选 Alchemy Monad 测试网；`/api/health` 报告首选 provider 和备用节点数量（不代表已探测在线） |
| `MONAD_RPC_URL` | 否 | 可配置的第二 RPC；生产环境必须 HTTPS |
| `MONAD_RPC_FALLBACK_URLS` | 否 | 逗号分隔的备用 RPC URL，最多考虑 3 个；调用前逐个验证 chain ID 为 `10143`；最后仍有内置官方公共 RPC |
| `ENVIO_GRAPHQL_URL` | Envio 赛道需要 | Envio 托管端点，必须 HTTPS，以 `/graphql` 结尾 |
| `KIMI_API_KEY`、`KIMI_BASE_URL`、`KIMI_MODEL` | Kimi 赛道需要 | 默认模型 `kimi-k3`；base URL 必须为纯 HTTPS |
| `QWEN_API_KEY`、`QWEN_BASE_URL`、`QWEN_MODEL` | Qwen 赛道需要 | 按阿里云百炼的地域/工作区填写正确的 base URL |
| `HUNYUAN_API_KEY`、`HUNYUAN_BASE_URL`、`HUNYUAN_MODEL` | 可选 | OpenAI 兼容接口 |

注意：`DASHSCOPE_API_KEY`、`MOONSHOT_API_KEY`、`TOKENHUB_API_KEY` 是等价别名，代码都会识别。

---

## 6. 测试与质量门禁

在 `kite/` 目录（Node 24）执行：

```bash
npx tsc --noEmit      # 类型检查（含 tests/）
npm test              # 7 个文件 · 53 项测试（只扫描 tests/）
npm run build         # tsc + vite 生产构建
npm audit --omit=dev  # 应显示 0 vulnerabilities
```

Envio indexer（独立包）：

```bash
cd indexer
npm ci
npm run codegen
npm run typecheck
npm test              # 1 项：Transfer 事件处理
```

测试覆盖一览（详细矩阵见 [`TEST_MATRIX.md`](TEST_MATRIX.md)）：

| 文件 | 覆盖内容 |
|---|---|
| `invoices.test.ts` | AUSD 精确金额解析、EIP-712 签名与验签、篡改与过期拒绝 |
| `payment-schedule.test.ts` | 分期拆分精确求和、到期日间隔、篡改期数/到期日被拒、单张发票哈希向后兼容（12 项） |
| `contact-crypto.test.ts` | AES-GCM 往返、随机 IV、错误密钥与密文篡改拒绝 |
| `account-derivation.test.ts` | 同一 PRF 输出得到稳定地址，会话结束后清零 |
| `server-api.test.ts` | 健康检查不泄密、Alchemy 路由、RPC 白名单与故障切换、真实 viem 写交易路径（faucet `requestFunds` + AUSD `transfer` 经代理广播，覆盖写路径需要的 `eth_getBlockByNumber`）、Envio 端点校验、Kimi/Qwen/Hunyuan 请求形态（桩上游，22 项） |
| `api.test.ts` | 启动真实服务进程的冒烟测试 |
| `ai-schema.test.ts` | AI 输入上限与禁止金额/地址字段 |

**测试通过 ≠ 审计通过 ≠ 比赛资格。** 测试中的上游全部是桩，不能作为赞助商真实调用的证据。

### RPC 发布后 smoke test

先在部署完成后验证标准的 `eth_chainId` 请求（特意不传 `params`，这正是 viem 的正常形式）：

```bash
curl -i -sS https://kite-monad-payments.onrender.com/api/rpc \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}'
```

期望 HTTP `200`、JSON `result: "0x279f"`（十进制 `10143`），且响应头给出 `x-kite-rpc-provider` / `x-kite-rpc-fallback-used`。`/api/health` 的 provider 字段只表示**优先配置**，不代表上游已连通。若这里返回 502，应用已尝试所有可用的测试网节点；稍后重试并检查 Render 日志/服务状态，不要把 `eth_chainId` 错误误判成 faucet、金额或 passkey 错误。

再验证写交易路径需要的区块读取——用户点 **Test AUSD** 报 `The method "eth_getBlockByNumber" does not exist / is not available.` 就是这个请求被拒的直接证据：

```bash
curl -i -sS https://kite-monad-payments.onrender.com/api/rpc \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":2,"method":"eth_getBlockByNumber","params":["latest",false]}'
```

期望 HTTP `200` 且 `result` 里有区块字段。若返回 `403` + `{"code":-32601,"message":"RPC method not enabled."}`，说明线上仍是缺该方法的旧 allowlist：部署本分支后用应用内 **Test AUSD** 复核。同时用 `{"method":"eth_accounts","params":[]}` 确认钱包级方法仍返回 `403`——allowlist 是补全而不是放开。

---

## 7. 终端用户完整流程

以下步骤基于应用当前界面。按钮文字以实际界面为准。

### 7.1 开户：创建 Mera passkey 账户

1. 打开应用，点击右上角 **Connect passkey**（或设置页的 **Create or sign in**）。
2. 弹窗标题为 “A wallet that feels like you.”。在 **Name shown in your authenticator** 输入显示名称，点击 **Create passkey**；已有账户则点击 **Sign in**。
3. 浏览器弹出系统 passkey 对话框（Face ID / Touch ID / Windows Hello / 安全密钥）。完成验证。
4. 应用由 PRF 输出派生出钱包地址并显示在侧边栏。
5. **不会出现助记词，也不需要浏览器插件。**

> 同一个 passkey 在同一域名下才能恢复。换域名（比如从 `localhost` 换到 Render 域名）会得到**不同的账户**。

### 7.2 登录与锁定

- 再次进入：选择**登录（signin）**，用同一 passkey 验证。
- 锁定：点击右上角的 **Lock wallet** 图标，或设置页的 **Lock now**。锁定会清零内存中的签名密钥与 PRF 根。
- 15 分钟无操作自动锁定。
- 设置页的 **Forget this browser hint** 只清除本浏览器里的凭证提示，不会删除你 passkey 里的凭证。

### 7.3 领取测试 MON（付 gas）

1. 复制钱包地址（侧边栏）。
2. 打开 `https://faucet.monad.xyz/`，选择 Monad Testnet，粘贴地址领取。
3. 回到应用，余额里 MON 会显示（设置页可见）。

### 7.4 领取测试 AUSD

1. 在概览页或付款页点击 **Get test AUSD**（Agora 测试网 faucet）。
2. 应用会先验证 faucet 合约的 `token()` 确实指向 AUSD 测试网地址，再发起交易。验证失败会直接中止，不发交易。
3. 等待确认。若提示“仍在等待”，**不要重复点击**，用同一笔交易哈希查询即可。

### 7.5 发送 AUSD（付给某人）

1. 付款页点击 **Send AUSD**，或在通讯录里选择联系人。
2. 填入收款地址（0x 开头 40 位十六进制）与金额（最多 6 位小数，上限 1,000,000）。
3. 确认弹窗中的收款人与金额，再用 passkey 签名。
4. 成功后弹出成功提示并显示交易哈希前后缀；可在 Monad 测试网浏览器查看：`https://testnet.monadscan.com/tx/<hash>`。

限制：不能给自己付款；余额不足会在发送前拦截；应用固定只允许 Monad 测试网 AUSD。

### 7.6 创建单张付款请求（签名链接）

1. 进入**概览**页，点击右上角的 **New invoice** 按钮（弹窗标题为 **Request payment**；这个弹窗的金额初值是 `150`）。侧边栏 **Invoices** 是另一编辑页，金额初值为 `250`。
2. 输入/确认金额（AUSD）、标题、备注；若从 **Invoices** 页创建 150 AUSD，请把金额框从 `250` 改为 `150`。可用“AI invoice copy”让 Kimi 或 Qwen 起草文案；未配置模型时会显示“本地预览，不计为赞助商模型调用”。
3. 付款计划选择 **Single payment**（也可选 2 / 3 / 6 / 12 期）。
4. 点击 **Sign & create payment link**，passkey 签名（EIP-712）。
5. 生成链接与二维码，复制给付款人。

**金额示例：**单张 `150` AUSD 会在本机生成一条金额为 `150,000,000` 个最小单位（AUSD 6 位小数）的 EIP-712 签名请求，默认 7 天到期。创建链接本身不发链上交易、不扣款、不预留余额，也不会自动从水龙头领取 AUSD；收款方余额可以是 0。付款人打开后验签，必须用**不同于收款方**的钱包主动确认，并至少持有 150 AUSD 与少量 MON gas，之后才会发出 AUSD `transfer`。比如付款人已领到 10,000 测试 AUSD，余额层面足够付 150；测试资产没有真实价值。

如果选择 3 期、总额 150 AUSD，则会签 3 条独立链接，每期 50 AUSD；不会自动扣款。当前没有链上发票合约或全局“已支付”登记：同一条仍有效的链接被重新打开时，不能保证自动识别此前已付，付款人应先查 MonadScan / 收款人到账记录，避免重复支付。不要把一张链接当成链上一次性票据。

> 侧边栏 **Invoices** 页是另一个发票编辑器，带有 AI 与 Qwen 翻译，同样提供 **Payment plan**（1 / 2 / 3 / 6 / 12 期）与间隔（7 / 14 / 30 天）选择。概览弹窗与 Invoices 页共用同一套分期签名逻辑。

### 7.7 付款人如何支付

1. 付款人打开链接（`/pay?r=...`）。应用会**自动验证签名**：签名者地址、链（10143）、代币（AUSD）、金额、备注哈希、过期时间。分期请求会显示 **Installment N of M, due YYYY-MM-DD (UTC)**，付款人可据此看到第几期与到期日。
2. 验签失败会显示“Invoice signature did not match. Do not send funds”，此时不要付款。
3. 验签通过后，付款人连接自己的 passkey 账户（没有则创建），点击支付。
4. 应用发送 AUSD `transfer`，显示交易哈希；确认后当前页面显示成功。
5. 同一浏览器会话会用 sessionStorage 记住“处理中”的哈希，防止刷新后重复提交同一笔 pending 交易。但此项目没有链上一次性发票状态：重新打开仍有效的链接或换设备后，不能保证阻止另一笔相同金额的转账。付款前应对账，避免重复付款。

### 7.8 查看活动与对账

- **Activity** 页：优先读取 Envio 端点（`integrations.envio=true` 时，来源标签显示 Envio）；否则回退到最近 15,000 个区块的 `eth_getLogs`，来源标签显示 RPC。
- 两种来源都是真实链上数据；只有来源为 Envio 时才能用于 Envio 赛道的证据。

### 7.9 通讯录（Mera One Passkey, Many Keys）

1. 进入 **Private contacts**，点击 **Add contact**，填写姓名、地址、国家、币种。
2. 保存后数据只以密文写入 localStorage：AES-256-GCM，密钥由 PRF 经 HKDF-SHA-256 派生（带独立 salt/info）。
3. 验证方法：打开浏览器开发者工具 → Application → Local Storage，`kite:encrypted-address-book:v1` 的值只能看到版本号、算法名、iv 和 ciphertext，看不到姓名或地址。
4. 锁定后再次用同一 passkey 登录，通讯录能解密显示，即证明“一把 passkey，多个用途密钥”。

---

## 8. 分期付款（工资流）操作

分期付款是本轮新增功能，面向“每月/每周固定付款”的场景，例如月度顾问费、周薪、分段交付款。

### 8.1 商家（收款方）操作

1. 概览页 → **New invoice**（弹窗标题 **Request payment**），或侧边栏 **Invoices** 页。
2. 输入**总金额**（例如 `300` AUSD）。
3. 付款计划选择 **3 installments**，间隔选择 **30 days**。
4. 弹窗底部会预览：`3 signed links · 100 AUSD each … due every 30 days`。
5. 标题与备注会自动编号，例如 `Monthly retainer (1/3)`。
6. 点击 **Sign 3 installment links**。passkey 连续签名 3 次。
7. 应用生成付款计划卡片（**Payment plan · 3 installments**），每期有标题、金额、到期时间和**复制**按钮，每期有标题、金额、到期时间和**复制**按钮。
8. 把 3 条链接分别发给付款人（或放到同一条消息里分次说明）。

### 8.2 付款人操作

1. 每期链接独立打开，独立验签。
2. 第 1 期应在到期日当天或之前支付。每一期的有效期 = 到期日 + 7 天。
3. 付款人每次都需要确认金额并签名一笔 AUSD 转账，**应用不会自动扣款**。

### 8.3 规则与边界

| 规则 | 数值 |
|---|---|
| 期数 | 2–12（选择 1 即为单张） |
| 间隔 | 7 / 14 / 30 天 |
| 金额拆分 | 精确到 6 位小数，尾差计入最后一期，各期加总等于总额 |
| 每期有效期 | 到期日 + 7 天 |
| 分期计划最长窗口 | 400 天（单张发票仍为 30 天） |
| 篡改检测 | 期数、序号、到期日都被签名摘要覆盖，改动会被拒绝 |

### 8.4 不做什么（要诚实说明）

- 这不是链上工资流合约。没有“按秒流动”的资金，付款每次都要付款人主动签名。
- 没有自动扣款、没有逾期罚金、没有托管。
- 付款计划中的每一期互相独立：付款人可以只付其中一期。

---

## 9. 测试网实操：拿到真实交易哈希

这是 Agora、Mera、Envio 等 bounty 的核心证据，必须由你本人完成。

**准备：**
- 两个 passkey 账户（商家 A、付款人 B）。可以用两台设备，或同一设备两个不同浏览器 profile。**注意：Kite 在 `localStorage` 里只保存一个 credential 提示（`kite:mera-credential:v1`），同一 profile 里新建第二个 passkey 会覆盖它，之后"登录"只会回到最新那个账户——所以两个账户必须放在两个 profile 或两台设备上。**
- A、B 各领取测试 MON（付 gas，[faucet.monad.xyz](https://faucet.monad.xyz/)）。
- **A、B 各自在应用内点一次 `Test AUSD`**。Agora 水龙头 `requestFunds` 每次固定发 **10,000 AUSD**，手续费约 0.013 MON，两个账户互不影响，不需要 A 转给 B。

**步骤：**
1. 在 A 上创建一张 `1` AUSD 的单张请求，复制链接。
2. 在 B 上打开链接，确认验签通过。
3. B 点击支付，记录交易哈希。
4. 在 `https://testnet.monadscan.com/tx/<hash>` 确认状态为 Success，`Transfer` 事件的 from / to / value 与请求一致。
5. 在 A 的 Activity 页确认该笔出现（若已部署 Envio，来源应为 Envio）。
6. 再做一次分期：A 创建 2 期计划，B 分别支付第 1 期和第 2 期，记录两笔哈希。

**证据保存：** 每笔交易的哈希、explorer 截图、两端页面截图、时间戳。把这些放进 `docs/evidence/`（注意不要提交私钥、passkey 数据或 `.env`）。

---

## 10. 部署上线（Render）

**当前状态：** <https://kite-monad-payments.onrender.com/> 已在线；Blueprint 跟踪 `main`，本 Arena 分支的两项 RPC 修复（可选 `params`、写交易路径的 `eth_getBlockByNumber`）尚未部署。更新现有服务时不要创建重复 Blueprint；按仓库发布流程部署后，先用第 6 节无 `params` `eth_chainId` smoke test 确认 `0x279f`、再用 `eth_getBlockByNumber` 与 **Test AUSD** 确认写路径不再返回 `-32601`，然后做真机/链上验证。

仓库根目录的 `kite/render.yaml` 是 Render Blueprint：Node 24.21.0、新加坡区域、免费套餐、健康检查 `/api/health`。以下只适用于新建或重建 service：

**新建 service 步骤：**
1. 确认代码已推送到你自己的 GitHub 公开仓库（Metropolis 要求提供代码链接，具体可见性以门户规则为准）。
2. 登录 `https://render.com` → **New → Blueprint** → 连接仓库 → 选择 `kite/render.yaml`（如果仓库根不是 kite，需在 Blueprint 中指定子目录）。
3. 在 Render 的 Environment 中添加服务端变量（见第 5 节）。**不要**把 key 写进 `render.yaml`。
4. 设置 `VITE_MERA_RP_ID` 为最终域名（例如 `kite-monad-payments.onrender.com`），然后触发部署。它是构建期变量，改动后需要重新构建。
5. 部署完成后验证：
   - `https://<域名>/api/health` 返回 `status: ok`（仅服务/配置检查）；
   - 按本指南第 6 节 RPC smoke test 用**省略 `params`** 的 `eth_chainId` 检查返回 `0x279f` 和 provider 响应头，并用 `eth_getBlockByNumber` 确认写交易路径所需方法不再被 `-32601` 拒绝；
   - `https://<域名>/` 能打开，控制台没有 CSP 报错；
   - 在手机 Safari / Chrome 上完成一次 passkey 创建。

**注意：**
- 免费实例会在空闲后休眠，首次访问较慢。录视频前先访问一次。
- 上线后不要更改 `VITE_MERA_RP_ID`，否则所有已有 passkey 对应的账户会“消失”。
- `npm start` 使用 `tsx`，所以 Blueprint 中的 `npm ci --include=dev` 不能去掉。

---

## 11. 赞助商集成的开通步骤

每一项都需要你自己的账号。下面给出最短路径，不要把 key 放进聊天或仓库。

### 11.1 Alchemy（Best Projects using Alchemy）

1. 在 Alchemy 控制台创建 **Monad Testnet** 应用，复制 API key。
2. 在 Render 环境变量中设置 `ALCHEMY_API_KEY`，重启服务。
3. `/api/health` 的 `rpcProvider: alchemy` 仅证明配置；再用第 6 节的无 `params` `eth_chainId` curl 检查 `0x279f` 和 `x-kite-rpc-provider` 响应头，并跑第二个 `eth_getBlockByNumber` curl 确认写路径方法可用。
4. 证据：Alchemy 控制台真实请求统计截图 + 应用内一次余额读取；若 `x-kite-rpc-fallback-used: true`，该请求实际上由备用节点完成，不能把它算作 Alchemy 使用证据。

### 11.2 Envio（Best Use of Envio）

1. 进入 `indexer/`，执行 `npm ci && npm run codegen`（需要 Docker 时按 Envio 文档准备）。
2. 把 `indexer/` 所在仓库连接到 Envio Cloud（需要 GitHub App 授权），选择 Monad Testnet，部署索引器，等待同步到最新区块。
3. 复制托管 GraphQL 端点，设置 `ENVIO_GRAPHQL_URL`（必须 HTTPS，以 `/graphql` 结尾）。
4. 验证：`/api/health` 中 `integrations.envio` 为 `true`；做一笔新的 AUSD 转账后，Activity 页来源标签显示 Envio。
5. 注意：Envio 赛道要求“真实功能支持”，只跑本地测试不算。

### 11.3 Kimi（Best Builds Powered by KIMI）

1. 在 Moonshot 开放平台创建 API key，确认 base URL 与模型名（默认 `kimi-k3`，以平台当前文档为准）。
2. 设置 `KIMI_API_KEY`（以及必要时的 `KIMI_BASE_URL`、`KIMI_MODEL`）。
3. 在概览页或 Request 弹窗选择 Kimi，点击 Draft。界面不再显示“本地预览”，而是 `Generated by KIMI`。
4. 证据：平台用量页面截图与应用内生成结果。

> 赛道要求 KIMI “真正驱动项目核心功能”。目前 Kimi 只生成文案，属于辅助功能。若要争取该奖，需要在评审材料中如实说明，或另行扩展。

### 11.4 Qwen（Best Builds with Qwen 3.8 Max）

1. 在阿里云百炼（Model Studio）开通服务，选择与你的账号一致的地域，获取 API key。
2. 设置 `QWEN_API_KEY` 与对应地域的 `QWEN_BASE_URL`（国际版默认 `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`），`QWEN_MODEL` 按控制台确认的模型名。
3. 在发票页点击 **Translate with Qwen**，确认译文出现，并保存平台用量证据。

### 11.5 Hunyuan（Kepler Plan, Tencent）

- 目前代码只有 OpenAI 兼容的文本接口。Kepler Plan 的评审要求是多模态或交互式体验，**仅做文本翻译不足以申报**。
- 如需申报，需额外实现多模态或交互功能，并使用 Tencent TokenHub 的真实 key。当前不建议作为主要目标。

---

## 12. 证据收集清单

| 赛道/奖项 | 必须保存的证据 |
|---|---|
| 主赛道 Consumer Payments | 3 分钟演示视频；两端付款页面；分期付款截图；公开仓库链接；可访问的部署地址 |
| Agora Cross-Border | 测试网 AUSD 跨境付款（两地不同设备）的交易哈希与 explorer 截图；PWA 安装截图（如果规则接受） |
| Mera UX | 真机 passkey 创建与恢复视频；无扩展、无助记词的界面截图 |
| Mera One Passkey, Many Keys | localStorage 密文截图；锁定后用同一 passkey 解密通讯录的视频 |
| Envio | Envio Cloud 部署页面；`/api/health` 显示 `envio: true`；Activity 来源为 Envio 的截图 |
| Alchemy | 修复版成功请求的响应头指向 Alchemy 且未 fallback；Alchemy 控制台 usage 记录（health 配置字段不算证据） |
| Kimi / Qwen | 平台用量记录；应用内真实生成结果（注意：不得是本地预览） |

**演示视频注意：** 不要把预览数据当成真实交易；不要录入 `.env`、API key、passkey 数据；说明测试网资产没有价值。

---

## 13. Metropolis 提交清单与时间表

**关键日期（两处来源不一致，必须以提交门户为准）：**
- 官方 Metropolis 页面：提交截止 **2026 年 10 月 13 日**，未标注具体时刻与时区。
- 第三方 RiseIn 页面：标注 **2026 年 10 月 12 日**。
- 操作：登录提交门户，核对倒计时与截止时间（含时区）。门户显示的时间优先于本文档。
- 评审 10 月 14–27 日；获奖公布 11 月 3 日。

**建议内部截止：10 月 12 日（HKT）**，留出一天处理链接与视频问题。

| 日期 | 任务 |
|---|---|
| 10 月 11 日（今天） | 按 runbook 部署 RPC hotfix，做省略 `params` 的 `eth_chainId` smoke test；真机 passkey 测试；领 MON 与 AUSD |
| 10 月 11 日晚 | 完成一笔单张与一组分期的测试网交易，保存证据；只有核心付款稳定后再接 Envio / AI |
| 10 月 12 日 | 录制视频（3 分钟）；更新 README 与门户项目描述；提交 |
| 10 月 13 日 | 只做检查，不做新功能；确认门户状态为 Submitted |

**门户提交前检查：**
- [ ] 项目名称、一句话介绍、长描述已填写，与实际功能一致；
- [ ] 公开代码仓库可在未登录状态打开；README 说明如何运行；
- [ ] 部署地址可在手机浏览器打开；
- [ ] 视频已上传到门户要求的平台，长度符合要求；
- [ ] 每个申报的 bounty 都有对应证据，未实现的不要勾选；
- [ ] 团队与联系人信息正确；
- [ ] 点击提交后确认状态不是 Draft。

---

## 14. 故障排查

| 现象 | 原因与处理 |
|---|---|
| `npm ci` 报 `EBADENGINE` | Node 版本不是 24。用 Node 24 重装 |
| 开发页打开但接口 502 | API 没启动。确认 `npm run dev` 同时启动了 api 与 web，或直接看 `tsx` 日志 |
| passkey 创建失败 / 无提示 | 不在安全上下文（非 localhost 或 HTTPS），或设备不支持 PRF。换 Chrome/Safari 最新版，在真机测试 |
| 登录后地址与之前不一样 | 域名变了，或 `VITE_MERA_RP_ID` 改过。passkey 与域名绑定，无法跨域恢复 |
| `/api/rpc` 返回 `Invalid JSON-RPC request`，body 显示 `eth_chainId` | 老部署把可选的 JSON-RPC `params` 当成必填。部署包含代理修复的版本后，用无 `params` smoke test 验证；不是 AUSD/faucet 错误 |
| 点 **Test AUSD** 弹 `The method "eth_getBlockByNumber" does not exist / is not available.`（`-32601`） | 老部署的 method allowlist 没有放行 viem 写交易前必须的区块读取（`prepareTransactionRequest` 用它判断交易类型、估算 EIP-1559 费用），所以签名前就被本机代理拒绝，链上无交易。部署含 `eth_getBlockByNumber` 的版本，用第 6 节第二个 curl 确认返回 200，再点按钮；不要重领 MON 或怀疑 passkey |
| 余额显示 `—` / `/api/rpc` 502 | 查看 `x-kite-rpc-attempts` 与 Render 日志。本分支修复版会依次尝试 Alchemy、配置备份和 Monad 公共节点并校验 chain ID；仅在该版本部署后线上才具备此行为。检查部署版本/环境变量，或稍后刷新。若刚签名广播，先查链上状态再重发 |
| 交易显示 insufficient funds | 没有 MON 付 gas，去 faucet.monad.xyz 领取 |
| 发送后提示“仍在等待” | 交易未确认。不要重复发送，用同一哈希在 explorer 查询 |
| 付款链接显示签名不匹配 | 链接被改动（标题、金额、备注被修改）。让商家重新签名 |
| 分期链接显示“expires before it is due” | 旧版本或手改链接。重新生成 |
| `/api/ai` 返回 503 | 对应 provider 没有配置 key。界面会提示“本地预览，不计为赞助商模型调用” |
| `/api/envio/transfers` 返回 502 | Envio 端点不可达或返回错误。应用会自动回退到 RPC 日志 |
| 测试 `api.test.ts` 失败 | 端口 4188 被占用，或 Node 版本不对。关闭占用进程后重跑 |

---

## 15. 安全、隐私与合规注意事项

- **密钥：** 签名密钥只存在于浏览器内存。服务端没有任何用户私钥。锁定或退出时清零。
- **server-only 密钥：** Alchemy、Envio（若有凭证）、Kimi、Qwen、Hunyuan 的 key 只放在服务端环境变量里。
- **AI 输入：** 用户填写的自由文本会发送给所选模型提供方。不要输入密码、私钥、身份证件号或银行信息。
- **通讯录：** 只在本机加密存储；不上传服务端。清除浏览器数据会导致通讯录丢失，无法从服务器恢复。
- **链上公开性：** AUSD 转账记录是公开的。付款人与收款人地址、金额都会上链。
- **地域与合规：** 应用没有 KYC、没有法币出入金、没有制裁筛查。它是测试网原型。若要用于真实跨境支付，必须另外取得合规支持。
- **门户规则：** 第三方仓库曾转述 Metropolis 规则（如开源要求、bounty 互斥），这些说法未经官方核实。以门户登录后显示的规则为准。
- **隐私政策：** 若在公网部署并收集任何邮箱或手机号（包括将来接入 Privy/Dynamic 的情况），需要提供隐私政策。当前版本不收集这些数据。

---

## 16. 已知限制（诚实清单）

1. **分期入口已统一。** 概览弹窗（New invoice）与 Invoices 页都提供 Payment plan 与间隔选择，并共用同一个 `handlePlanCreated` 流程。付款人端显示第几期与到期日。注意：本次修改未在真实浏览器中完成端到端测试（见第 17 节）。
2. **分期不是链上工资流合约。** 每期需要付款人手动签名。
3. **没有可编程礼物（需要托管合约）**、没有 Chainlink CRE、没有 Nansen、没有 Cleanverse、没有 Privy 或 Dynamic。
4. **Hunyuan** 只有文本接口，不满足 Kepler Plan 的多模态要求。
5. **Kimi** 目前只是可选的文案生成，不是核心功能。
6. **PWA 不是原生 App。** Agora 是否接受 PWA 作为 mobile app 未确认。
7. **赞助商服务未在沙箱内验证。** 所有 AI、Alchemy、Envio 的测试都使用桩上游。真实调用需要你的账号。
8. **界面未做真机验证。** 分期 UI 目前只通过了构建与类型检查。
9. **速率限制是内存级别的演示护栏**，不适合生产环境。
10. **审计：** 本项目没有安全审计，不得用于真实资金。

---

## 17. 浏览器验证记录（本次）

- **已验证：** 生产构建下首页可渲染，控制台无报错；按钮文字与弹窗文字与本文档一致（见第 7 节）。
- **未验证：** passkey 注册（Create passkey）在沙箱的 headless Chromium 中会导致标签页崩溃，因此无法端到端测试：开户、分期签名、付款人支付、Invoices 页的分期选择。这些只通过了 `tsc --noEmit`、单元测试（53 项）与生产构建。
- **下一步：** 在真实设备（Chrome 或 Safari，支持 PRF 的 passkey）上按第 7、8 节走一遍，并记录结果。
- **提示：** WebAuthn 不接受 IP 地址作为 RP ID，本地测试请使用 `http://localhost:4180`，不要使用 `127.0.0.1`。
