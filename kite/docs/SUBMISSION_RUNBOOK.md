# Kite — Metropolis 提交冲刺手册（最后 48 小时）

> **本轮更新时间：** 2026-10-11 08:25 UTC（= 北京/上海 16:25，东京 17:25）；历史线上检查时间为 07:35 UTC。
> **官方提交截止：** 2026-10-13（官方页面未公布精确时分；以登录 [portal](https://hackathon.monad.xyz/) 后的倒计时为准）。
> **重要更新：** 用户报告当前 Render 版本的 `/api/rpc` 在 `eth_chainId` 上返回 `Invalid JSON-RPC request`。本分支已修代码并通过本地桩测试/构建；尚未部署，也尚未对生产 RPC 做修复后的真实验证。历史线上检查不能证明 RPC 当前可用。下文严格区分“源码测试通过”和“生产已验证”。

---

## 0. 一句话结论

**还不能直接录制正式付款视频。** 目前至少有两个阻塞，必须按顺序解除：

1. **生产 RPC：** 用户报告当前 Render build 的 `/api/rpc` 对 `eth_chainId` 报 `Invalid JSON-RPC request`。根因是服务端把 JSON-RPC 可省略的 `params` 错当成必填数组。本分支已修复，并添加多节点、链 ID 校验的服务端 fallback；但 Render 自动部署绑定 `main`，所以必须先把改动部署到线上，再按第 2 节 smoke test。**源码通过不等于线上已修好。**
2. **AUSD 余额：** 上次线上地址检查记录演示钱包 `0xba7cd500C6CbE528eEBA123583de0B09B8f109dB` 有 10 MON、AUSD 为 0。RPC 确认正常后，再在真机上点一次应用内 **Test AUSD**（Agora 测试网水龙头每次固定发 **10,000 AUSD**，此前观测手续费约 0.013 MON）。

先验证 RPC，再领 AUSD、跑一笔小额真实转账、确认 explorer receipt，最后录制。不要在 RPC 仍报错时连续重复点 faucet 或付款；如果已签名/广播，先按哈希和 MonadScan 对账。

---

## 1. 已验证清单（附证据）

| # | 事项 | 状态 | 本次取得的证据 |
|---|---|---|---|
| 1 | 代码仓库公开 | ✅ | `GET api.github.com/repos/CodingGeoff/monad-metropolis` → `"private": false` |
| 2 | 线上 HTTPS 应用可访问 | ✅ | `https://kite-monad-payments.onrender.com/` 返回 SPA（标题 `Kite — payments that move at the speed of work`） |
| 3 | 同域 Express API 存活 | ✅（历史） | 07:35 UTC 的 `/api/health` 返回 `status: ok`；health 只报告服务/配置，不会探测 RPC 节点。用户随后报告 `/api/rpc` 的 `eth_chainId` 请求失败 |
| 4 | **Alchemy 已配置** | ✅（配置层） | `rpcProvider: "alchemy"` 只说明服务端有 `ALCHEMY_API_KEY`，不证明请求能成功，也不证明当前正在使用 Alchemy |
| 4a | **修复后的生产 RPC** | ⏳ 未验证 | 本分支支持缺省 `params`、Alchemy → 配置备份 → Monad 公共 RPC failover，并要求每个节点 chain ID 为 `10143`；待部署后做第 2 节 smoke test |
| 5 | health 配置的目标 chainId | ✅（配置） | `/api/health` 静态字段是 `10143`；实际 RPC chain ID 必须由第 2.1 节 smoke test 读取，在修复版生产验证前不能当作链路已通 |
| 6 | PWA service worker 已上线 | ✅ | `/sw.js` 返回 `kite-shell-v1`，与仓库 `public/sw.js` 一致 |
| 7 | **`/pay` 分享路由在生产可用** | ✅ | `GET /pay?r=…` 返回 SPA 并进入 Payments 页 |
| 8 | **EIP-712 发票链接在生产验签通过** | ✅ | 用仓库自带 `signPaymentRequest()` 真签一张 12.5 AUSD 发票（payee `0x5Fb31764b09F9717613DdC746867E633bcbB988b`，`detailsHash 0xdd7fb1c5…`），线上打开后页面显示 **Verified**、金额 `12.5 AUSD`、收款方 `0x5Fb317…bB988b`、到期 `10/18/2026` |
| 9 | 演示钱包有 gas | ✅ | MonadScan 地址页显示 **10 MON**，来源 `0x631a6A93…05F16d08e` 两笔各 5 MON |
| 10 | Agora 水龙头可用且金额已知 | ✅ | 水龙头合约 `0xd236c18D…65a73ee6C` 共 649 笔交易，最近一笔 8 分钟前成功；tx `0xc4ce2d3f…e516` 显示 `requestFunds` 转出 **10,000 AUSD**，手续费 0.0133212 MON，状态 Success |
| 11 | 自动化测试 | ✅ 本地 | 修复后 `npm test` → **7 个文件 / 52 项通过**（`server-api` 21、`payment-schedule` 13、`api` 4、`invoices` 4、`contact-crypto` 4、`account-derivation` 2、`ai-schema` 4）；上游用桩，不是生产链路证据 |
| 12 | 生产构建 | ✅ 本地 / ⏳ 线上 | 修复后通过 Node `24.21.0` 执行 `npm run build`（`tsc --noEmit` + Vite）；Render 部署/生产 smoke test 仍未验证 |
| 13 | 依赖安全 | ✅ | 根包与 `indexer/` 的 `npm audit` 均为 **0 vulnerabilities** |
| 14 | 官方截止时间 | ✅ | Monad 官方博客与第三方赛事页均记为 **10 月 13 日提交 / 10-14–27 评审 / 11-3 公布** |

### 未通过 / 未完成（不要对外声称已完成）

| 事项 | 状态 | 说明 |
|---|---|---|
| **修复后的生产 RPC / `eth_chainId`** | ⏳ | 当前 deployed build 有用户报告的 Invalid JSON-RPC error；本分支已改，未部署/线上重测 |
| **演示钱包 AUSD 余额** | ❌（上次检查）**0 AUSD** | 07:35 UTC 的 MonadScan 记录；RPC 修好后重新刷新余额确认 |
| 真实 AUSD 转账哈希 | ❌ | 仍待 AUSD 到账、付款人签名并由 explorer 确认 |
| Envio Cloud | ❌ | `/api/health` 的 `envio: false`；indexer 只有本地测试 |
| Kimi / Qwen / Hunyuan | ❌ | 三项均 `false`，无真实 provider 调用 |
| 真机 passkey / PRF | ❌ | 沙箱无 authenticator，无法验证；必须由你在真机完成 |
| Portal 注册与提交 | ❌ | 需要你的账号，无法代做 |
| 演示视频 | ❌ | — |

---

## 2. 先验证 RPC 修复，再领 AUSD（线上验证 + 真机约 10 分钟）

### 2.1 部署后的 RPC smoke test（先做；不需要 passkey）

Render Blueprint 当前配置为 `branch: main`；本 Arena 分支的修复要先合并/部署到线上。不要因为 `/api/health` 显示 `rpcProvider: "alchemy"` 就认定 RPC 已连通——它只报告首选配置，不探测节点。

部署后执行下面请求。**刻意不传 `params`**，用来复现 viem 的 `eth_chainId` 调用：

```bash
curl -i -sS https://kite-monad-payments.onrender.com/api/rpc \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}'
```

成功条件：HTTP `200`、JSON `result: "0x279f"`（十进制 `10143`），并能看到非秘密响应头 `x-kite-rpc-provider`、`x-kite-rpc-fallback-used`、`x-kite-rpc-attempts`。`fallback-used: true` 表示首选节点失败但备用节点成功，不是错误。不要把任何 RPC URL/API key 截进公开证据。

- 若仍返回 `400` + `Invalid JSON-RPC request`：线上仍是旧 build，或发布没完成；先确认部署 commit/等待完成，不要反复点 faucet。
- 若返回 `502` + `All Monad testnet RPC providers...`：应用已尝试候选节点仍未取得有效响应；看 Render 服务状态/日志，确认 Alchemy key 和 `MONAD_RPC_URL` / `MONAD_RPC_FALLBACK_URLS` 配置。链 ID 不为 10143 的节点会被拒绝，不会拿来读写。
- 若返回 `200` 但不是 `0x279f`：停止，不要签名或广播；这是错误网络响应。

### 2.2 登录、领水龙头 AUSD

**前提：** 演示地址 `0xba7cd500C6CbE528eEBA123583de0B09B8f109dB` 必须是你自己可用的 Mera passkey 地址。只有对应 passkey 持有人能授权转账。

1. 用支持 PRF 的浏览器打开 <https://kite-monad-payments.onrender.com/>（兼容表：<https://mera.category.xyz/authenticator-support/>；桌面 Chrome / Edge 新版通常最稳）。
2. **Connect passkey** → 用已有 passkey 登录，不要误建新钱包。
3. 核对右上角完整地址是否为 `0xba7cd500C6CbE528eEBA123583de0B09B8f109dB`；不同就停，不要向错误地址领币或付款。
4. 等余额卡刷新。上次记录是 `10 MON` gas、`0 AUSD`。这次若 AUSD 已变化，以当前链上余额为准。
5. 点 **Test AUSD**（Agora faucet），passkey 确认后发一笔 `requestFunds`；一次固定 **10,000 AUSD**，不是按 invoice 金额发币。
6. 确认后余额应增加 10,000 AUSD。若显示 pending，使用原有哈希查询；若广播后报网络错误，先在 MonadScan 查账户/交易，不要立刻重复签名。
7. 保存地址余额截图、Token Transfers 截图和 faucet tx hash：<https://testnet.monadscan.com/address/0xba7cd500C6CbE528eEBA123583de0B09B8f109dB>。

### 2.3 如果你要请求 150 AUSD

概览页的 `Request payment` 弹窗金额初值为 `150`；侧边栏 `Invoices` 编辑页初值为 `250`，若从该页创建，请在金额框输入 `150`。单张模式下，收款方用 passkey 在浏览器本地签出一条金额 `150,000,000` 个最小单位（AUSD 6 位小数）的 150 AUSD 链接/二维码，默认 7 天过期。EIP-712 签名绑定 Monad Testnet chain ID `10143`、AUSD 合约、收款地址、金额、随机 invoice ID、标题/备注哈希与过期时间（分期时还包括期数/序号/到期日）。**创建 invoice 不发链上交易、不扣款、不占用余额，也不调用 faucet**；RPC 错误更可能出现在登录后的余额刷新或付款读链步骤，不代表这张本地签名请求把钱转走了。

付款人必须打开并验签，用**不同于收款方**的钱包主动点支付，持有至少 150 AUSD 并有少量 MON 付 gas；同一个收款地址不能给自己付。领到 10,000 测试 AUSD 的付款人从余额上足够支付 150。若选 3 期，则是 3 条各 50 AUSD 的独立链接，不会自动扣款。

**复用风险：** Kite 没有链上 invoice 合约或全局已付登记，同一条仍有效的链接再次打开时不一定能识别之前已支付；付款人需先查 MonadScan/钱包历史，不能把链接当成链上一次性票据。测试 AUSD/MON 无真实价值。

---

## 3. 录制演示视频（约 2:40）

### 3.1 录前准备（30 分钟，别省）

| 项 | 做法 | 为什么 |
|---|---|---|
| **唤醒服务** | 录制前 5 分钟先打开一次站点，并在录制过程中保持有请求 | Render **free plan 闲置 15 分钟会休眠**，冷启动要 30–60 秒，会在视频里出现尴尬的白屏。预算允许就升级到 Starter。 |
| **两个账户** | 商家 A、付款人 B。用**两台设备**，或**同一台设备的两个不同浏览器 profile** | 同一 profile 里 Kite 只保存一个 credential 提示（`kite:mera-credential:v1`），新建第二个 passkey 会覆盖它，之后"登录"只会回到 B。用两个 profile 最干净。 |
| **两边都有钱** | A 和 B 各领一次 AUSD 水龙头（各 10,000），各有 MON gas | A 要能演示"也能付款"，B 必须能付 |
| **无痕窗口自检** | 用未登录 GitHub 的无痕窗口打开 repo；用无痕窗口打开站点和 `/api/health` | 评委是未登录状态 |
| **清屏** | 关掉邮箱、Telegram、其它标签；浏览器缩放 100% | 别把 PII 录进去 |
| **手机竖屏** | 用手机或 DevTools 手机视口录主流程 | 这是移动端优先产品；Agora 的 mobile 判断看这个 |
| **不要录** | 私钥、助记词、PRF、`.env`、任何 API key、Render 后台的密钥页 | — |

### 3.2 分镜（每段留够停留时间，别剪掉真实的等待）

| 时间 | 画面 | 说什么 |
|---|---|---|
| 0:00–0:20 | 首页（预览模式，明确标注 sample data） | "自由职业者给海外客户开票，要等几天银行到账、被不透明汇率吃掉一部分。Kite 把'收款'变成整个工作里最短的一步。" |
| 0:20–0:50 | 点 **Use my passkey** → 系统 passkey 弹窗 → 出现地址 | "没有插件、没有助记词、没有托管后端。Mera passkey 通过 PRF 在浏览器里直接派生 secp256k1 密钥。" **强调**：这是 passkey，不是普通 WebAuthn。 |
| 0:50–1:05 | Settings 页 + `/api/rpc` smoke-test 响应头 | "所有链上读写先走同域 `/api/rpc`：Alchemy 优先，异常时使用经过 chain ID 校验的备用节点。`/api/health` 只显示配置偏好；实际采用节点看 smoke test 响应头。" |
| 1:05–1:35 | A：New invoice → 填标题/说明/金额 → **Sign & create payment link** → 出现二维码和链接 | "Kite 用 EIP-712 签这张发票。分期计划里每一期都是独立签名，绑定了 plan ID、第几期、共几期、到期日。" |
| 1:35–1:50 | B：无痕窗口粘贴链接 → 页面显示 **Verified** | "付款人先验签。收款方、金额、代币、链、描述、有效期全在签名覆盖范围内；改一个字节或者过期，付款按钮就不会亮。" |
| 1:50–2:15 | B：passkey 确认 → pending → confirmed toast → 出现交易哈希 | **不要剪辑这段的真实时间。** "付款人从自己的 passkey 账户直接转 ERC-20。Kite 不托管、没有自建合约。" |
| 2:15–2:30 | 打开 `https://testnet.monadscan.com/tx/<hash>`，停在 Success 和 Transfer 的 from/to/value | "这是真实的 Monad 测试网交易。" 让哈希和 Success 状态在画面里停够 3 秒。 |
| 2:30–2:45 | Contacts 页 → DevTools 里展示 `localStorage` 的 `kite:encrypted-address-book:v1` 只有密文 → 锁屏 → 重新 passkey 登录 → 通讯录恢复 | "同一个 passkey，两把密钥：账户密钥之外，再用 HKDF 域分离出第二把，AES-256-GCM 加密通讯录。服务端从来没收到过联系人。" |
| 2:45–2:55 | 收尾字幕 | "这是 Monad 测试网原型，测试资产没有价值，没有法币出入金。代码 MIT 开源，链接在下方。" |

**如果 Envio / Kimi / Qwen 届时仍未接通，就不要在视频里提它们。** 说"未接入"比说"接了但没证据"安全得多。

### 3.3 视频技术检查

- 时长控制在 portal 上限以内；若上限 3 分钟，做到 **2:40–2:50**。
- 设为公开或"有链接可看"；**用无痕窗口验证评委能打开**。
- 加英文字幕（评审是国际的）。
- 上传后再完整看一遍，确认没有一闪而过的密钥或邮箱。

---

## 4. Portal 提交（必须你本人，约 40 分钟）

按顺序做，每项都要留证据：

1. 登录 <https://hackathon.monad.xyz/>，**用当初注册时的同一个 OAuth provider**。看不到项目多半是登录方式换了。
2. 确认：账号、solo team、主赛道 = **Consumer Products & Payments**、**精确截止时间和时区**。
3. 读一遍规则原文，特别确认：视频时长/格式、是否强制开源、AI 辅助开发披露、一个人能提交几个项目、主赛道奖与 sponsor bounty 能否叠加。
4. 填项目资料：
   - **名称：** `Kite — Passkey AUSD Invoices on Monad`
   - **短描述：** *Request, verify and settle AUSD invoices on Monad with Mera passkeys — without handing custody to a payment processor.*
   - **长描述**（把方括号换成真链接，**没做完的集成整句删掉**）：

     > Kite helps independent workers and small studios request and settle dollar-denominated invoices. A seller creates an EIP-712-signed payment link — a single invoice or a payroll-style plan of up to 12 installments; the payer verifies the recipient, amount, AUSD token, chain, description and expiry, then signs a direct ERC-20 transfer from a Mera passkey account on Monad. Accounts are derived in the browser from passkey PRF: no extension, no seed phrase, no custodial backend. Chain traffic goes through a same-origin API with Alchemy preferred and chain-ID-checked Monad testnet RPC failover. A second key, HKDF-domain-separated from the same PRF output, AES-256-GCM-encrypts the repeat-payee address book before it reaches localStorage; the server never sees contact data. This is a Monad **testnet** prototype: test AUSD and MON have no monetary value, there is no fiat off-ramp, and it is not for production funds.
     > Demo: <https://kite-monad-payments.onrender.com/> · Code: <https://github.com/CodingGeoff/monad-metropolis> · Test transaction: `[EXPLORER TX URL]`
5. 勾选 bounty 时，**每一项都要能当场指出代码位置 + demo 时间点**。当前只有 **Alchemy key 已配置**，但没有修复版成功请求或 dashboard usage 证明；**Mera 两项**和 **Agora** 依赖第 2、3 节的真机演示；**Envio / Kimi / Qwen 目前不要勾**。
6. Agora 那项如果没拿到"PWA 算不算 mobile app"的确认，就在描述里明说这是 installable PWA，别声称 native。
7. 点最终 **Submit**，确认状态变成 Submitted/Complete 而不是 Draft，**保存 submission ID 和截图**。
8. 提交后用无痕窗口把每条链接再点一遍。

---

## 5. RPC 修复说明、fallback 策略与生产发布

### 根因（不是 AUSD 合约、faucet 或 Alchemy key 本身）

viem 2.57.4 调用无参数的 `eth_chainId` 时，`params` 在 JSON-RPC 请求里是可选字段；viem 的 HTTP transport 会在发出时补上 `jsonrpc: "2.0"` 和 `id`，但不会凭空添加参数。错误文本里显示 `Request body: {"method":"eth_chainId"}` 是 viem 用来展示的调用 body（调用参数为 `undefined` 被 JSON 序列化省略），并不表示 Alchemy URL 就是坏的。旧 Express 代理强制要求 `params` 必须是数组，因而把合法的无参数调用回成 `-32600 Invalid JSON-RPC request`。

### 本分支的代码修复与分层恢复

- 代理现在接受标准的省略 `params`，并规范化为 `params: []`；仍校验 JSON-RPC 版本、method allowlist、参数形态与 raw transaction 长度/格式，不放开任意 RPC 方法。
- RPC 仍只从浏览器请求同源 `/api/rpc`，不把 Alchemy key 暴露到前端，也不依赖浏览器跨域直连。
- 服务端节点顺序：Alchemy（如配置）→ `MONAD_RPC_URL` → `MONAD_RPC_FALLBACK_URLS` 中最多 3 个 operator 配置节点 → 内置 Monad 官方公共测试网 RPC。HTTPS-only（生产）、URL 去重、最多 6 个候选。
- 每个候选在用于读写前都要实际返回 chain ID `10143`；不匹配就跳过。每个上游请求超时 `3.5s`，坏节点冷却 `12s`（不等待冷却结束，仍按备用顺序尝试），有效 chain ID 缓存 `60s`；JSON-RPC 响应 ID/结构也会校验。浏览器 viem transport 超时 `45s`、自动重试关闭；非 `eth_chainId` 读取每个节点可能先做 chain probe 再发业务请求，六个节点全超时时理论上约 `42s`。瞬时网络、限流、HTTP/provider 错误会走下一个节点；合约 revert 等明确 EVM 错误直接返回，不会伪装成网络重试。
- `eth_sendRawTransaction` 只有在 provider/transport 故障时才尝试下一个候选，且传递同一份已签名 raw bytes（同一 tx hash/nonce，不会执行两次）；明确的交易错误不重试。若所有节点都超时，客户端仍可能无法判断广播是否已被某节点接收，所以错误提示要求先查 MonadScan，不能盲目再次签名。
- 响应头 `x-kite-rpc-provider`、`x-kite-rpc-fallback-used`、`x-kite-rpc-attempts` 只暴露非秘密诊断信息；`/api/health` 的 `rpcProvider` / `rpcFallbacks` 是**配置概览，不是在线探测**。

### 本地验证与必须做的线上验证

本轮在 Node `24.21.0` 下 `npm run typecheck`、`npm test`（7 文件 / 52 项）和 `npm run build` 全通过；RPC 测试覆盖 viem 调用、缺省 `params`、多节点故障 fallback、错误 chain ID 与 EVM revert。上游是桩；这些结果不等于生产 RPC / passkey / 链上付款验证。

`render.yaml` 绑定 `branch: main`，此 Arena 工作分支的代码**不会因此自动上线**。合并/部署后，先照第 2.1 节用无 `params` 的 curl 检查 `0x279f` 与响应头；然后用真机 passkey 看余额、领 AUSD，最后做一笔小额的 payer→payee 真转账并核对 explorer。直到这些线上步骤成功，才把问题标为已修好；不要把本地测试当作 Agora 交易或 Alchemy bounty 的证明。

---

## 6. 出问题怎么办

| 症状 | 先查什么 |
|---|---|
| 页面白屏或转很久 | Render free plan 休眠。等 30–60 秒，刷新；录制前先预热。 |
| `/api/health` 打不开但首页能开 | 服务只发了静态 `dist/`，或者启动时找不到 `tsx`。检查 Render 的 start command 是 `npm start`、build command 带 `--include=dev`。 |
| passkey 能建但付款失败 / 报 PRF 不支持 | 普通 WebAuthn passkey ≠ 支持 PRF。换 Mera 兼容表里的 authenticator；确认是 HTTPS 且 RP ID 就是 `kite-monad-payments.onrender.com`。**不要临时换域名。** |
| `Invalid JSON-RPC request`，body 显示 `{"method":"eth_chainId"}` | 这是旧 build 的代理把可选 `params` 当必填导致的。先部署本分支修复，再用第 2.1 节 curl（故意不传 params）验证。不是 AUSD 金额/faucet 问题；`/api/health` 返回 ok 也不能证明 RPC 可用。 |
| 余额读不出来 / `/api/rpc` 返回 502 | 查看 Network 的 `x-kite-rpc-attempts`；修复版会尝试配置节点并校验 chain ID。确认 Render 外连、Alchemy key/网络、`MONAD_RPC_URL` 和 `MONAD_RPC_FALLBACK_URLS`。若只是读操作可稍后刷新；若发生在签名广播后，先查同一笔链上状态，勿盲目重签。 |
| 点 Test AUSD 报错 | 看是不是 gas 不够（不会，有 10 MON）；或水龙头限流。等几分钟再试，**不要重复点**——应用会把 pending 哈希存住，再点是查同一笔。 |
| 付款一直 pending | 应用有 30 秒等待上限，超时会提示"仍在 pending，不要重复提交"。直接去 MonadScan 查那笔哈希，别在 UI 上重试。 |
| 第二个账户登录回到第一个 | 同一 profile 只存一个 credential 提示。用另一个浏览器 profile 或另一台设备。 |
| Envio 显示接了但 Activity 没数据 | `envio: false` 说明 `ENVIO_GRAPHQL_URL` 没设。没设就别说用了 Envio。 |
| 提交页还是 Draft | 找最终的 Submit/Confirm 按钮。OAuth 登录、保存草稿都不算提交。 |

---

## 7. 时间分配建议

| 时间（UTC+8） | 做什么 |
|---|---|
| **今天 10/11 下午** | 第 2 节：先部署并验证 RPC hotfix，再领 AUSD、跑通真实付款、拿到 tx hash。**这是最高优先级。** |
| **今天 10/11 晚上** | 第 3.1 节准备 + 录一版草稿，自己看一遍找问题 |
| **10/12 上午** | 重录正式版；第 4 节 portal 填资料并**提交** |
| **10/12 下午** | 缓冲：修链接、修视频权限、补证据截图 |
| **10/13** | 只做紧急修复。**不要**把最后一天当开发日。 |

如果时间真的不够，按这个顺序砍：**保住"注册 + 公开 repo + 线上站点 + 一笔真实测试网付款 + 短视频 + 正式提交"**，sponsor credits 类的（Envio/Kimi/Qwen）全部放弃，不要为了多勾一个 bounty 把付款流程搞崩。

---

## 8. 不可更改的基线

**已获奖 `$0`；已到账 credits `$0`；Metropolis 正式提交数 `0`。**

只有看到 portal 状态是 Submitted/Complete，才能把"已提交"改成完成。只有拿到正式获奖/credits 通知，才能把奖励记为已获得。
