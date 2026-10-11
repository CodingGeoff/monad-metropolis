# Kite — Metropolis 提交冲刺手册（最后 48 小时）

> **核对时间：** 2026-10-11 07:35 UTC（= 北京/上海 15:35，东京 16:35）
> **官方提交截止：** 2026-10-13（官方页面未公布精确时分；以登录 [portal](https://hackathon.monad.xyz/) 后的倒计时为准）
> **本文所有"已验证"结论都来自本次实际执行的命令或实际打开的页面，逐条附了证据。未验证的都明确标注为未验证。**

---

## 0. 一句话结论

**还不能直接录视频交付。** 只剩**一个**硬阻塞：

> **演示钱包 `0xba7cd500C6CbE528eEBA123583de0B09B8f109dB` 目前有 10 MON（gas 够了），但 AUSD 余额是 0。**
> 没有 AUSD 就没有链上转账，也就没有 Agora / Mera bounty 需要的交易哈希。

修复它只需要**在真机上点一次应用内的 "Test AUSD" 按钮**（Agora 测试网水龙头，每次固定发 **10,000 AUSD**，手续费约 0.013 MON），大约 10 分钟。之后就可以按第 3 节录制。

其余全部是可选项或必须由你本人账号完成的门户操作。**不需要再改任何代码**——理由见第 5 节。

---

## 1. 已验证清单（附证据）

| # | 事项 | 状态 | 本次取得的证据 |
|---|---|---|---|
| 1 | 代码仓库公开 | ✅ | `GET api.github.com/repos/CodingGeoff/monad-metropolis` → `"private": false` |
| 2 | 线上 HTTPS 应用可访问 | ✅ | `https://kite-monad-payments.onrender.com/` 返回 SPA（标题 `Kite — payments that move at the speed of work`） |
| 3 | 同域 Express API 存活 | ✅ | `/api/health` → `{"status":"ok","chainId":10143,"rpcProvider":"alchemy","integrations":{"envio":false,"ai":{"kimi":false,"qwen":false,"hunyuan":false}}}` |
| 4 | **Alchemy 已生效** | ✅ | 同上，`rpcProvider` 为 `"alchemy"`（源码里该字段等价于"服务端 `ALCHEMY_API_KEY` 非空"） |
| 5 | chainId 正确 | ✅ | `chainId: 10143`（Monad Testnet） |
| 6 | PWA service worker 已上线 | ✅ | `/sw.js` 返回 `kite-shell-v1`，与仓库 `public/sw.js` 一致 |
| 7 | **`/pay` 分享路由在生产可用** | ✅ | `GET /pay?r=…` 返回 SPA 并进入 Payments 页 |
| 8 | **EIP-712 发票链接在生产验签通过** | ✅ | 用仓库自带 `signPaymentRequest()` 真签一张 12.5 AUSD 发票（payee `0x5Fb31764b09F9717613DdC746867E633bcbB988b`，`detailsHash 0xdd7fb1c5…`），线上打开后页面显示 **Verified**、金额 `12.5 AUSD`、收款方 `0x5Fb317…bB988b`、到期 `10/18/2026` |
| 9 | 演示钱包有 gas | ✅ | MonadScan 地址页显示 **10 MON**，来源 `0x631a6A93…05F16d08e` 两笔各 5 MON |
| 10 | Agora 水龙头可用且金额已知 | ✅ | 水龙头合约 `0xd236c18D…65a73ee6C` 共 649 笔交易，最近一笔 8 分钟前成功；tx `0xc4ce2d3f…e516` 显示 `requestFunds` 转出 **10,000 AUSD**，手续费 0.0133212 MON，状态 Success |
| 11 | 自动化测试 | ✅ | `npm test` → **7 个文件 / 49 项测试全部通过**（`server-api` 18、`payment-schedule` 13、`api` 4、`invoices` 4、`contact-crypto` 4、`account-derivation` 2、`ai-schema` 4） |
| 12 | 生产构建 | ✅ | `npm run build` → `tsc --noEmit` 通过，Vite 产出 6 个资源文件 |
| 13 | 依赖安全 | ✅ | 根包与 `indexer/` 的 `npm audit` 均为 **0 vulnerabilities** |
| 14 | 官方截止时间 | ✅ | Monad 官方博客与第三方赛事页均记为 **10 月 13 日提交 / 10-14–27 评审 / 11-3 公布** |

### 未通过 / 未完成（不要对外声称已完成）

| 事项 | 状态 | 说明 |
|---|---|---|
| **演示钱包 AUSD 余额** | ❌ **0 AUSD** | MonadScan 以 holder 过滤 AUSD 合约，该地址 `Balance 0 AUSD`；`Transactions Sent: Latest N/A`（从未发出交易） |
| 真实 AUSD 转账哈希 | ❌ | 依赖上一项 |
| Envio Cloud | ❌ | `/api/health` 的 `envio: false`；indexer 只有本地测试 |
| Kimi / Qwen / Hunyuan | ❌ | 三项均 `false`，无真实 provider 调用 |
| 真机 passkey / PRF | ❌ | 沙箱无 authenticator，无法验证；必须由你在真机完成 |
| Portal 注册与提交 | ❌ | 需要你的账号，无法代做 |
| 演示视频 | ❌ | — |

---

## 2. 唯一阻塞项：给演示钱包领 AUSD（约 10 分钟，必须真机）

**前提：** 该地址是你某个 Mera passkey 派生出来的地址。如果不是，请先确认——只有持有对应 passkey 的人才能动这笔 AUSD。

1. 用**支持 PRF 的浏览器**打开 <https://kite-monad-payments.onrender.com/>。
   兼容表见 <https://mera.category.xyz/authenticator-support/>。桌面 Chrome / Edge 最新版最稳。
2. **Connect passkey** → 用你已有的 passkey 登录（不是新建）。
3. 核对右上角地址是否为 `0xba7c…09dB`。**如果地址不对，说明这不是同一个 passkey，停下来**，不要往错误地址转东西。
4. 等余额卡刷新。此时应显示 `10 MON` gas、`0 AUSD`。
   - **这一步同时验证了 Alchemy 通路**：余额能读出来，说明浏览器 → `/api/rpc` → Alchemy → Monad 全链路通。如果余额读不出来，先解决这个（见第 6 节）。
5. 点余额卡上的 **Test AUSD**（Agora 水龙头）。会弹一次 passkey 确认，然后发一笔 `requestFunds`。
6. 等确认。Monad 测试网出块很快（本次实测约 0.3 秒/块），通常几秒内 toast 变为 `Test AUSD received`。
7. 刷新后余额应为 **10,000 AUSD**。
8. **立刻保存证据**：
   - 浏览器地址栏 + 余额截图；
   - `https://testnet.monadscan.com/address/0xba7cd500C6CbE528eEBA123583de0B09B8f109dB` 的 Token Transfers 页截图；
   - 水龙头那笔交易的哈希。

> 水龙头每次固定 10,000 AUSD，所以 demo 里发票金额建议用 **1–50 AUSD** 这个量级，画面数字好看又不至于像乱来。

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
| 0:50–1:05 | Settings 页 / `/api/health` | "所有链上读写都走同域 `/api/rpc`，服务端用 Alchemy 的 Monad testnet 节点。`/api/health` 只报 provider 名字，不回显密钥。" |
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

     > Kite helps independent workers and small studios request and settle dollar-denominated invoices. A seller creates an EIP-712-signed payment link — a single invoice or a payroll-style plan of up to 12 installments; the payer verifies the recipient, amount, AUSD token, chain, description and expiry, then signs a direct ERC-20 transfer from a Mera passkey account on Monad. Accounts are derived in the browser from passkey PRF: no extension, no seed phrase, no custodial backend. All chain access goes through a same-origin API backed by Alchemy's Monad testnet RPC. A second key, HKDF-domain-separated from the same PRF output, AES-256-GCM-encrypts the repeat-payee address book before it reaches localStorage; the server never sees contact data. This is a Monad **testnet** prototype: test AUSD and MON have no monetary value, there is no fiat off-ramp, and it is not for production funds.
     > Demo: <https://kite-monad-payments.onrender.com/> · Code: <https://github.com/CodingGeoff/monad-metropolis> · Test transaction: `[EXPLORER TX URL]`
5. 勾选 bounty 时，**每一项都要能当场指出代码位置 + demo 时间点**。当前只有 **Alchemy** 有服务端配置证据；**Mera 两项**和 **Agora** 依赖第 2、3 节的真机演示；**Envio / Kimi / Qwen 目前不要勾**。
6. Agora 那项如果没拿到"PWA 算不算 mobile app"的确认，就在描述里明说这是 installable PWA，别声称 native。
7. 点最终 **Submit**，确认状态变成 Submitted/Complete 而不是 Draft，**保存 submission ID 和截图**。
8. 提交后用无痕窗口把每条链接再点一遍。

---

## 5. 为什么这一轮不改代码

线上这份构建是**已被端到端验证过的**（第 1 节第 7、8 项：生产的 `/pay` 路由 + EIP-712 验签 + 链配置全部实测通过）。距离截止不到 48 小时，任何代码改动都意味着重新部署、重新验证一遍 passkey 和付款路径——而这两条恰恰是最难在沙箱里复现的。

所以本轮只做了**零风险的仓库层交付物**：根 `README.md`、根 `LICENSE`、文档更新。它们不进入构建产物，不触发行为变化。

`render.yaml` 里 `autoDeployTrigger: commit` 且 `branch: main`，因此这些改动合到 `main` 后 Render 会重新构建一次。**重建后请务必再打开一次站点和 `/api/health` 确认**（构建命令没变，风险很低，但要确认）。

---

## 6. 出问题怎么办

| 症状 | 先查什么 |
|---|---|
| 页面白屏或转很久 | Render free plan 休眠。等 30–60 秒，刷新；录制前先预热。 |
| `/api/health` 打不开但首页能开 | 服务只发了静态 `dist/`，或者启动时找不到 `tsx`。检查 Render 的 start command 是 `npm start`、build command 带 `--include=dev`。 |
| passkey 能建但付款失败 / 报 PRF 不支持 | 普通 WebAuthn passkey ≠ 支持 PRF。换 Mera 兼容表里的 authenticator；确认是 HTTPS 且 RP ID 就是 `kite-monad-payments.onrender.com`。**不要临时换域名。** |
| 余额读不出来 / 一直转圈 | 打开 DevTools Network 看 `/api/rpc` 的响应。若是 502，多半是 Alchemy key 无效或该 key 没开 Monad testnet 网络。 |
| 点 Test AUSD 报错 | 看是不是 gas 不够（不会，有 10 MON）；或水龙头限流。等几分钟再试，**不要重复点**——应用会把 pending 哈希存住，再点是查同一笔。 |
| 付款一直 pending | 应用有 30 秒等待上限，超时会提示"仍在 pending，不要重复提交"。直接去 MonadScan 查那笔哈希，别在 UI 上重试。 |
| 第二个账户登录回到第一个 | 同一 profile 只存一个 credential 提示。用另一个浏览器 profile 或另一台设备。 |
| Envio 显示接了但 Activity 没数据 | `envio: false` 说明 `ENVIO_GRAPHQL_URL` 没设。没设就别说用了 Envio。 |
| 提交页还是 Draft | 找最终的 Submit/Confirm 按钮。OAuth 登录、保存草稿都不算提交。 |

---

## 7. 时间分配建议

| 时间（UTC+8） | 做什么 |
|---|---|
| **今天 10/11 下午** | 第 2 节：领 AUSD、跑通一笔真实付款、拿到 tx hash。**这是最高优先级。** |
| **今天 10/11 晚上** | 第 3.1 节准备 + 录一版草稿，自己看一遍找问题 |
| **10/12 上午** | 重录正式版；第 4 节 portal 填资料并**提交** |
| **10/12 下午** | 缓冲：修链接、修视频权限、补证据截图 |
| **10/13** | 只做紧急修复。**不要**把最后一天当开发日。 |

如果时间真的不够，按这个顺序砍：**保住"注册 + 公开 repo + 线上站点 + 一笔真实测试网付款 + 短视频 + 正式提交"**，sponsor credits 类的（Envio/Kimi/Qwen）全部放弃，不要为了多勾一个 bounty 把付款流程搞崩。

---

## 8. 不可更改的基线

**已获奖 `$0`；已到账 credits `$0`；Metropolis 正式提交数 `0`。**

只有看到 portal 状态是 Submitted/Complete，才能把"已提交"改成完成。只有拿到正式获奖/credits 通知，才能把奖励记为已获得。
