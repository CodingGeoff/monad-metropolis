# Kite 参加 Monad Metropolis：下一步完整执行手册

> **适用项目：** Kite — 基于 Mera passkey 的 Monad Testnet AUSD 发票与付款应用  
> **编写/核对日期：** 2026-10-10（香港/上海时区 UTC+8）  
> **建议主赛道：** Consumer Products & Payments（消费者产品与支付）  
> **重要说明：** 本文是行动清单和条件性奖金估算，不是获奖通知、现金承诺、法律意见或安全审计。官方 portal 中登录后显示的最新规则、截止倒计时和每项 bounty 原文优先于本文及第三方转述。

---

## 目录

1. [先看结论](#1-先看结论)
2. [官方赛事信息与规则边界](#2-官方赛事信息与规则边界)
3. [当前项目状态：哪些已完成、哪些没做](#3-当前项目状态哪些已完成哪些没做)
4. [奖金与 credits 台账](#4-奖金与-credits-台账)
5. [接下来按顺序执行](#5-接下来按顺序执行)
6. [详细操作 A：portal 注册与规则核验](#6-详细操作-aportal-注册与规则核验)
7. [详细操作 B：撤销旧 PAT、创建公开代码仓库](#7-详细操作-b撤销旧-pat创建公开代码仓库)
8. [详细操作 C：部署公开 HTTPS 应用](#8-详细操作-c部署公开-https-应用)
9. [详细操作 D：真实设备 passkey 与 Testnet 付款](#9-详细操作-d真实设备-passkey-与-testnet-付款)
10. [详细操作 E：Envio、Alchemy、Kimi、Qwen](#10-详细操作-eenvioalchemykimiqwen)
11. [提交材料：项目文案、视频与证据](#11-提交材料项目文案视频与证据)
12. [最终提交检查表](#12-最终提交检查表)
13. [建议时间表与时间不够时的取舍](#13-建议时间表与时间不够时的取舍)
14. [常见失败点与处理办法](#14-常见失败点与处理办法)
15. [官方资料与项目内部文档](#15-官方资料与项目内部文档)

---

## 1. 先看结论

### 目前可确认的成绩

- Kite 的根应用和 Envio indexer 已完成本地实现和验证。使用 Node.js `v24.21.0` / npm `10.8.2` 时：根应用类型检查通过；根测试 **5 个文件、18 项测试通过**；生产构建通过；npm audit 未发现漏洞。`indexer/` 的 codegen、类型检查、handler 测试（1 项）和 audit 也通过。
- 产品核心方向是：商家创建一张 AUSD 付款请求，付款人检查收款方、金额、币种和期限后，用 Mera passkey 签名并在 Monad Testnet 转账。通讯录使用独立派生密钥在用户浏览器加密。
- 本轮已准备 Render Blueprint（根目录 `render.yaml`）：Node `24.21.0`、新加坡区域、Free demo plan、`/api/health` health check；它只是可导入的配置，**没有**连接 repo、创建 Render service、取得 live HTTPS URL 或做线上 smoke test。
- 有 AUSD Transfer 的 Envio config/schema/handler 和本地测试；但目前没有 Envio Cloud 部署。应用有 Alchemy/Kimi/Qwen 接口代码；目前没有配置实际服务密钥，也没有实际 provider 调用。

### 现在还不能声称完成的事

- 目前没有 Metropolis 注册、项目 profile、bounty 选择或正式提交。
- 没有公开 GitHub repo、有效的 Git commit history、GitHub remote、公开 demo 域名、demo 视频或 submission confirmation。
- 没有真人设备上的 Mera PRF 测试；没有已完成的 AUSD 测试网用户间交易和 transaction hash。
- 当前健康检查曾显示 chain ID `10143`、RPC 为 `public`、Envio/Kimi/Qwen 等 integration 关闭。这只是本地服务/配置检查，**不等于**真的调用了 sponsor API，也不等于链上转账成功。
- 先前有一个 GitHub PAT 曾暴露在对话中。没有使用或保存它；请先按第 7 节撤销。不要把新的 PAT、钱包私钥、助记词或 API key 发到对话或写进公开 repo。

### 最重要的排序

**先保住参赛资格与提交，不要先追 credits：**

1. 今天登录官方 portal，确认账户、截止时区、规则和 bounty 原文；建 solo team/project draft。
2. 撤销旧 PAT；建立一个 public GitHub repo，先做密钥检查。
3. 部署一个可以从手机浏览的 HTTPS app；按最终域名测试 Mera passkey。
4. 用两组专门的测试账户完成一笔 AUSD Testnet 发票付款，保存链上证据。
5. 录制符合 portal 限制的短视频，正式提交并确认状态不是 draft。
6. 只有核心流程稳定后，才接通 Envio、Alchemy、Kimi、Qwen 等 sponsor 功能。

官方公开页面写的提交日期是 **2026-10-13**。现在是 2026-10-10，时间很紧。官方页面没有显示精确时分和时区，应立即登录 [Metropolis portal](https://hackathon.monad.xyz/) 看倒计时。网上有说法称截止为 10 月 13 日 23:59 ET；若 portal 最终确认此时间，则香港/上海时间为 **10 月 14 日 11:59**，但在 portal 确认前不要当作官方时间。自己的内部截止建议定为 **10 月 12 日 HKT**，预留至少一天处理链接/视频/提交问题。

---

## 2. 官方赛事信息与规则边界

### 公开页面目前可以确认的内容

Monad 官方 Metropolis 页面列出：

- 2026 年 9 月 1 日至 10 月 13 日，全球线上活动；
- 四个赛道：Onchain Finance & Trading、Consumer Products & Payments、Social, Attention & Culture、Trust, Identity & AI Infrastructure；
- 每个主赛道 `$30,000`，页面注明在 3 个获奖团队间平分，也就是每队的赛道奖金额为 `$10,000`；
- Grand Champion `$25,000`；
- 评审期 10 月 14–27 日，官方页面列出的获奖公布日为 11 月 3 日；
- 官方 FAQ 允许 solo builder；公开项目 profile 至少需要 demo、短项目介绍和代码链接。

四个赛道奖池加 Grand Champion 的页面金额算术合计为 `$145,000`；官网的 `$250,000+` 是**整个活动**的 prize pool，包含 sponsor prizes、credits、服务等，不是 Kite 一队可以领取的金额。所有具体规则及最新金额请看[官方活动页](https://monad.xyz/developers/hackathons/metropolis)和[登录后的官方 portal](https://hackathon.monad.xyz/)。

### 哪些规则尚不能从本次公开页面确认

官方 portal 需要登录。提交前由参赛者亲自确认：

- 精确截止时间和时区；portal 的倒计时是否允许提交后修改；
- 年龄、地域/制裁名单、KYC、获奖钱包及主联系人要求；
- 一个参与者/团队能提交几个项目、主赛道奖和 sponsor bounty 是否能叠加；
- repo 是否必须公开、必须采用何种 license、提交是否要求 commit history；
- AI 辅助开发披露、素材/第三方代码归属、build window 的要求；
- 视频格式与时长；
- Agora 的“mobile app”是否接受 installable PWA；
- 两个 Mera bounty 的准确评判条件，以及 Alchemy/Kimi/Qwen credits 的领取、有效期和适用模型。

**开源规则有冲突：** 官方营销页 FAQ 表示 open source 鼓励但不强制；一个参赛者的[非官方公开 repo](https://github.com/precious-akpan/monad-metropolis-merchant-rails)声称登录后的 rules modal 有强制开源要求。我无法登录你的 portal，也不会把参赛者转述当成 binding rule。请以 portal 中当前版官方规则为准。Kite 已有 MIT license；为了公开评审、Envio Cloud 部署和快速交付，仍建议按 public repo 准备。

---

## 3. 当前项目状态：哪些已完成、哪些没做

### 已完成的实现/验证

| 项目 | 已有内容 | 现在能证明什么 |
|---|---|---|
| 前端与产品流程 | React/Vite/TypeScript；手机优先、可安装 PWA；AUSD 发票和付款请求；invoice link 状态 | 代码存在，build 与自动化检查通过；不证明线上体验已完成 |
| Mera | Mera passkey account/signing session 接入 | 集成代码与本地测试存在；尚未由真人在最终 HTTPS 域名完成 PRF 测试 |
| AUSD | Monad Testnet 上 AUSD 读写和支付流程代码 | 代码已按 Testnet 配置；尚无本轮真实用户付款哈希 |
| 隐私通讯录 | Mera PRF 派生后经 HKDF 域分离，再用 AES-GCM 加密地址簿 | 有代码和加密/篡改相关测试；尚无用户重载/跨设备演示证据 |
| Envio | `indexer/config.yaml`、schema、Transfer handler、测试 | codegen/类型检查/本地 handler 测试通过；尚未在 Envio Cloud 同步，也未被线上 app 调用 |
| Alchemy | 服务器端 RPC proxy | 代码已写；当前 health 显示 `rpcProvider: public`，不是 Alchemy |
| Kimi/Qwen | 服务器端可选文案/翻译 API | 输入校验和 fallback 代码存在；当前没有真实 provider key/成功请求 |
| 质量检查 | 根项目 18 项测试、indexer 1 项测试、build/typecheck/audit | 先前在 Node 24.21.0 / npm 10.8.2 下通过；此轮仅改 Render/package metadata/docs。当前 sandbox 是 Node 20.20.2，低于项目 strict Node 24 要求，所以没有在本轮重跑 npm test/build |

### 尚未完成事项的原因：区分代码缺失、未实测与需要用户授权

> 这些 gap 不是同一种原因。能在仓库里安全完成的配置已经先准备；需要 GitHub/云平台账号、设备上的 authenticator、真实签名、资金或赛事账户的步骤，不能用 mock 数据冒充完成。当前也只有 2026-10-10 的开发/文档状态，实际部署与线上验证仍未发生。

| 事项 | 当前状态 | 为什么现在没实现/没法确认 | 关闭事项的下一步 |
|---|---|---|---|
| Render HTTPS 部署 | 已加入根目录 [`render.yaml`](../render.yaml)，但没有 Render service 或公开 URL | 配置文件只是部署蓝图；工作区没有有效 Git remote/公开 repo，也没有你的 Render 登录授权。创建 service、授权代码托管账户和选择计费计划必须由账户持有人确认。 | 按第 8 节把有效 public repo 连到 Render，应用 Blueprint，实测首页和 `/api/health`。 |
| Netlify 部署 | 尚未为 Netlify 改造 | 当前 Express 启动文件直接 `app.listen()`；Netlify 官方 Express 方案使用 Functions，需要 handler wrapper、`/api/*` rewrite，并调整启动/路由方式。只发 Vite `dist/` 会让 `/api/*` 缺失。为缩短交付路径，先选不需改架构的 Render，而不是并行维护两套。 | 若确定选择 Netlify，再单独把 API 改为 Netlify Function 或拆成独立后端，并跑完整接口测试。 |
| 最终 hostname / 自有域名 | 未选择，尚未创建 Mera passkey | 域名购买、DNS、云账户和最终 URL 都由你决定；代码默认以 `window.location.hostname` 作为 Mera RP ID。先在临时域名建 credential、之后换域名，会造成 RP ID 不匹配。 | 先选最终的 `onrender.com` hostname 或自有域名，再在该 HTTPS host 建 passkey；具体见第 8–9 节。 |
| 手机打开与 PWA 安装 | manifest、service worker、响应式布局代码已存在；未在真实 iPhone/Android 上实测 | 沙箱不能证明真实设备的安全上下文、安装流程、屏幕适配或 WebAuthn 行为。当前是可安装的 PWA，不是原生 iOS/Android app；service worker 只缓存 app shell/assets，付款 API 仍需联网。Agora bounty 是否把 PWA 算作 mobile app 未确认。 | 部署后在真实 Safari/Chrome 打开、安装并完成支付路径测试；向 organizer 确认 PWA 资格，不确认就不声称满足 native/mobile bounty。 |
| Mera passkey / PRF 实机验证 | 集成代码和本地账户派生测试存在；尚无最终域名上的真人 create/sign-in 记录 | Mera 不仅要普通 WebAuthn passkey，还要求 authenticator 提供 PRF、discoverable credential 和 user verification。没有真实平台 authenticator 就无法证明 PRF 能力；本地单元测试不等于手机验证。 | 按 Mera 兼容表选择 authenticator，在最终 HTTPS hostname 实测创建、恢复、地址一致和付款。 |
| AUSD faucet 与 payer-to-payee 交易 | Testnet 地址/合约做过只读核对；没有真实 faucet 请求或用户间成功付款 tx hash | 必须由持有人在设备上完成 passkey 解锁、支付 Monad 测试 gas 并签署交易。不能代签，也不能伪造 explorer 链接或把 UI preview 算作交易。 | 按第 9 节准备两个专用账户与测试资金，真实发送一笔后保存 receipt/hash。 |
| Envio Cloud / Alchemy / Kimi / Qwen / Hunyuan live use | Envio 有本地 indexer 测试；Alchemy 与 AI 接口代码已写；目前没有线上服务调用证据 | Cloud/GitHub App 授权、provider 账户、bounty key/credits、region/model 选择和 secret 都需你的账户；把 key 放进聊天或公开仓库不安全。无 key 的 fallback 不是 sponsor usage。 | 仅为确实要申报的 bounty 开账户，把 key 存在部署平台 server env，执行真实请求并保存 provider usage 证据。 |
| 原生手机 app | 未开发；当前交付是 PWA | Swift/Kotlin/React Native 包装、签名、商店分发与设备 QA 是一条额外开发线；当前三天左右的冲刺优先验证核心 testnet 付款和提交，且 Agora 的 PWA 资格还未确认。 | 先向 organizer 问清是否必须 native；只有规则明确要求且时间/设备允许，才另立开发任务。 |
| 法币兑换、银行入账、真实跨境 payout | 未实现 | 现在只有 Monad Testnet 上的 AUSD ERC-20 转账，没有 FX 执行、银行 API、off-ramp、流动性或持牌支付合作方。真实出入金还涉及 KYC/AML、制裁筛查、资金管理和地域法律合规；不能靠补几个 API key 安全补齐。 | 作为单独产品/合规项目立项并接入经核准的支付合作方；现在必须明确写“无 fiat off-ramp”。 |
| Gasless / relayer、主网与自有 escrow 合约 | 未实现；目前由付款人 passkey 直接签 ERC-20 转账，需 payer 自己有 MON gas；没有新部署 Kite 合约 | relayer/paymaster 需要资金来源、服务端密钥、滥用控制与安全评审；主网/托管/escrow 引入真实资金风险。当前比赛 demo 明确是 Testnet，自动化测试不是智能合约审计。 | 不在赶提交时贸然上线；若以后做主网或代付 gas，先设计权限/限额、威胁模型、监控和独立审计。 |
| 云端发票/客户数据库与跨设备联系人同步 | 未实现；联系人密文保存在本地浏览器，付款请求由签名 link 携带；没有服务端数据库 | 服务器存储会增加用户账号、数据保留、恢复、访问控制和隐私义务；MVP 先采用本地加密通讯录，减少明文数据上传。清除本机浏览器资料时，不保证可从服务器恢复。 | 只有产品确需跨设备同步时，再设计端到端加密备份、恢复与删除机制；不要把本地存储说成云备份。 |
| portal 注册、旧 PAT 撤销、公开视频与正式提交 | 尚未完成 | 赛事账户、年龄/地区资格、规则接受、税务/KYC、领奖资料和最终 Submit 都属于参赛者本人行为；旧 PAT 必须由你在 GitHub 撤销。demo 视频也应等真实流程验证后录制，不能把预览伪装成真人交易。 | 你本人按第 6–7、11–12 节完成；不需要把密码、PAT、助记词或私钥发给我。 |

所以这里并非笼统地“没权限就不做”：Render 蓝图、可自动完成的代码/测试已经准备；未继续做 Netlify adapter、原生 app、off-ramp、gas sponsorship/主网，是架构、时间、合规或安全边界的取舍；而上线、真人 PRF、链上付款与正式提交，必须由你自己的账户/设备和明确授权完成。所有状态都要据证据更新，不能用“代码已写”代替“线上已验证”。

### 当前必须补齐的外部/人工事项

- 官方 portal 参赛注册与提交；
- 公开 GitHub repo。项目目录中虽有 `.git` 文件夹，但它是**不完整 stub**，`git status` 和 `git rev-parse` 会失败，没有可用 history/remote；
- Node 24 环境下有效的 Git 初始化、账号作者信息和首次真实 commit；
- HTTPS 部署、最终域名、手机可访问性；`render.yaml` 已准备，但仍需你把 repo 连到 Render 并完成真实线上验证；
- 两个 Testnet passkey 测试账户、MON gas、AUSD test funds 和真实交易；
- Envio Cloud/GitHub App、Alchemy account/key、Kimi/Qwen 事件账户与真实 API 调用（若要申报这些 bounty）；
- 录屏、公开链接、最终提交确认。

### 部署细节（`tsx` / Node 版本）

根目录 `npm start` 用 `tsx` 启动 Express，而 `tsx` 目前在 `devDependencies`。新增的 Render Blueprint 显式执行 `npm ci --include=dev && npm run build`，因此为 Render 部署时不需要仅为此把 `tsx` 挪进生产依赖；其他平台若会 prune dev dependencies 或把 build/runtime 分离，必须改成保留 `tsx` 或编译 server 后再执行，并实际检查启动日志。项目 Node 范围已收窄为 `>=24 <25`；Blueprint 固定 `NODE_VERSION=24.21.0`，避免 Render 默认 Node 大版本变化。

不要只部署 `dist/` 静态站点：Kite 还需要同域 Express API（`/api/health`、`/api/rpc` 等）。
---

## 4. 奖金与 credits 台账

以下金额来自 Monad 官方公开 prize 页面；它们是公开奖项金额，不等于已得金额。除官网明确标为 credits 的条目外，具体付款介质（现金、USDC 或其他方式）和领取条款仍要在 portal 确认。[官方奖项列表](https://monad.xyz/developers/hackathons/metropolis)

| 奖项 | 官网标示金额/类型 | Kite 的当前状态 | 提交前需要什么 |
|---|---:|---|---|
| Consumer Products & Payments 主赛道前三之一 | `$10,000` 奖项金额（该赛道 `$30k ÷ 3`） | 产品方向匹配，但没有 submission | 一笔真实 Testnet 付款、公开项目页、demo/code link、完整说明，最终由评审决定 |
| Grand Champion | `$25,000` 奖项金额 | 全场竞赛；当前没有评审证据 | 必须成为四赛道中的全场最佳；与其他奖能否叠加由 portal 确认 |
| Agora — Best Cross-Border Payments App on Monad | `$10,000`，官网未标为 credits | Mera/AUSD/invoice 代码有基础；未实测链上付款；PWA 是否满足 mobile app 未确认 | 两端 passkey、移动端 demo、真实 AUSD 支付及 explorer hash；先核实 PWA 资格和 bounty 原文 |
| Monad Foundation — Best Mera-Powered UX on Monad | `$2,500`，官网未标为 credits | Mera 设计上为唯一账户层；没有实机 PRF 验证 | 用实际 authenticator 建立/恢复账户并完成用户付款，不依赖钱包扩展、助记词或托管账户 |
| Monad Foundation — Mera: One Passkey, Many Keys | `$2,500`，官网未标为 credits | 已有第二个用途的域分离密钥和本地加密通讯录代码/测试 | 用同一个 passkey 证明可恢复账户和非钱包用途；证明数据库/存储中只有密文；满足 portal 的精确创意要求 |
| Envio — Best Use of Envio | `$1,000`，官网未标为 credits | indexer 本地测试通过但未部署，当前 app 未用 Envio | Cloud sync、GraphQL endpoint、实际新 AUSD 转账在 Activity 里由 Envio 返回 |
| Alchemy — Best Projects using Alchemy | `$1,000 credits` | 代码未启用；health 是 public RPC | Alchemy Testnet app/key、真实 app RPC 请求、dashboard usage 记录 |
| Kimi — Best Builds Powered by KIMI | `$3,000 credits` | 当前无 Kimi key/真实调用 | 真实 Kimi 请求、正确 event model、可见 usage 记录 |
| Alibaba Cloud — Best Builds with Qwen 3.8 Max | `$5,000 credits` | 当前无 Qwen key/真实调用 | 正确地域/workspace endpoint、真实 Qwen 翻译、usage 记录 |

**现在的实际账面值：** 获得的奖金 `$0`；到账 credits `$0`；portal 提交数 `0`。不能把写好的代码、测试通过或奖池金额计成收入。

**只作规划的潜在额度：** Agora + 两个 Mera + Envio 这四项官网未标为 credits 的目标 bounty 合计 `$16,000`；Alchemy/Kimi/Qwen 是 `$9,000 credits`。如果同一项目最终还同时赢得主赛道 `$10,000` 和 Grand Champion `$25,000`，纯算术上会是 `$51,000` 的非 credits 奖项金额 + `$9,000 credits`。这是“每项都获奖、符合资格、且允许叠加”的极端上界，不是概率预测；同项目奖项叠加及实际付款币种没有在本次公开核验中确认。

官方还列出 Envio Cloud hosting（给获奖团队，页面标示价值 `$5,000`）。它是获奖后服务，不是现金 bounty，也没有计入 `$9,000` credits。不要把其他未集成的 Kuru、Perpl、Chainlink、Aurora、Privy、Dynamic、Nansen、MetaMask 等金额加入 Kite 总额。

---

## 5. 接下来按顺序执行

建议严格按下面先后顺序。带“必须本人”的操作涉及个人账户、法律资格、私钥、交易签名或官方条款接受，我不能替你登录或代签。

| 顺序 | 事项 | 谁做 | 完成判据 |
|---|---|---|---|
| 1 | 撤销对话中暴露的 GitHub PAT | 你本人 | GitHub token 页面显示已撤销/删除 |
| 2 | 登录 Metropolis、读规则、确认时区、注册 solo team/主赛道 | 你本人 | portal 显示已注册/有项目草稿 |
| 3 | 创建 public GitHub repo、扫描秘密、推送项目 | 你本人/本地终端 | 无需登录即可看到 README、license 和代码 |
| 4 | Node 24 上确认 build，部署同域 Node app 到 HTTPS | 你本人提供 host account；技术配置可照本手册 | 首页、`/api/health` 可公开访问 |
| 5 | 在 final domain 实测 Mera、领测试币并付款 | 你本人 | 有 passkey 测试结果、真实成功 tx hash |
| 6 | 接通必要的 sponsor integrations | 你本人提供 provider account/keys | health + provider usage + demo 中可证明真实调用 |
| 7 | 录 demo、更新 README/profile、正式提交 | 你本人 | portal 显示 Submitted/Complete 并有确认记录 |

若只能完成少数事项，优先做 **1–5 和 7**。不要为了 credits 延迟核心付款流程、视频和提交。

---

## 6. 详细操作 A：portal 注册与规则核验

### A1. 登录并确认是正确账户

1. 打开 [Metropolis 官方 portal](https://hackathon.monad.xyz/)。
2. 用你将长期使用的 GitHub、Google 或 Discord 登录方式。注意：不同 provider 可能是不同 portal 账户；如果登录后 profile 空白，先确认是不是用了另一个登录方式。
3. 记录 portal 用户名/项目 owner 信息，不要在公开 README 写私人邮箱、证件或账号密钥。

### A2. 阅读并保存规则

在 portal 中找到 Rules & Guidelines、Eligibility、Tracks & Bounties、Submission 页面。把以下项复制到自己的本地笔记或截图存档：

- deadline 精确时间、时间区域、portal 倒计时；
- 一人/团队可以有几个 project、每个 project 只能选几个 track；
- 年龄、地区限制、KYC、税务、领奖钱包；
- repo 可见性、license、project build window、AI coding disclosure；
- 视频上限、视频托管平台、必须展示哪些信息；
- Agora bounty 是否承认 PWA；
- Mera 两项 bounty 各自的精确要求；
- sponsor credits 的 account、模型、用量和领取步骤；
- 主赛道、Grand Champion、多个 bounty 能否同一队叠加。

如 portal 规则与官网营销 FAQ 冲突，以 portal 的正式规则为准；对 PWA 或 bounty 文案有疑问，立即向官方 organizer/Monad developer Discord 询问并保留答复。不要根据其他参赛者的 repo 自行推断资格。

### A3. 注册主赛道并创建项目草稿

1. 如 portal 要求 team，创建 solo team；官方公开 FAQ 表示 solo builders 可以参加。
2. 选择 **Consumer Products & Payments**。Kite 面向普通付款人与独立工作者，以 AUSD 付款体验而非交易/做市为核心。
3. 项目名称建议：`Kite — Passkey AUSD Invoices on Monad`。
4. 可先保存 draft；不要把没有发生的 demo、部署、交易或 sponsor 调用写成已完成。
5. 确认 portal 显示 project/team 已创建，不只是账号登录。

### A4. Bounty 选择原则

只有 portal 支持、而且你能用视频/公开证据满足条款时才选该 bounty。建议顺序：

1. 主赛道 Consumer Products & Payments；
2. Mera UX 与 Mera One Passkey, Many Keys（先完成真实 passkey/重载证明）；
3. Agora Cross-Border（先确认 PWA 是否满足 mobile app）；
4. Envio（部署成功才选）；
5. Alchemy/Kimi/Qwen（只在真实调用和 credits 条款核对后选）。

选了 bounty 不代表符合资格，也不代表获奖；不要用“集成了代码”替代“已成功运行”。

---

## 7. 详细操作 B：撤销旧 PAT、创建公开代码仓库

### B1. 先撤销暴露过的 PAT

**不要重用、粘贴或转发先前 token。** 到 GitHub 网页：

1. 右上角头像 → **Settings**；
2. 左侧 **Developer settings** → **Personal access tokens**；
3. 分别检查 Fine-grained tokens 和 Tokens (classic)；
4. 撤销对话中暴露的 token；若无法辨认，撤销所有可能的 token，并检查最近的 GitHub 安全/审计活动；
5. 之后用 GitHub 网页 OAuth 或自己电脑的 `gh auth login`，不要在聊天里提供 PAT。

### B2. 在 GitHub 创建 public repo

网页方式：

1. GitHub → New repository；
2. 名称可用 `kite-monad-payments`；Visibility 设为 **Public**；
3. 项目目录已有 README、LICENSE、`.gitignore`、lockfiles，所以创建时不要再勾选初始化 README/license/gitignore，以免首次 push 冲突；
4. 创建后先不把任何 secret 上传；复制 repo URL。

### B3. 初始化本地 Git（在你自己的 Node/Git 电脑上）

在终端使用项目真实路径：

```bash
cd /home/user/kite
node -v                 # 必须是 v24.x；项目 .nvmrc 要求 24
npm -v

git init -b main
git config user.name "你的真实参赛者名称"
git config user.email "你的 GitHub commit 邮箱"
```

项目目录目前有一个不完整 `.git` stub。若上面的 `git init -b main` 后 `git status` 仍报 “not a git repository”，不要直接删除目录里的文件；先把这个空/不完整 metadata 备份到项目外，再初始化：

```bash
# 只有 git init 后仍失败时才做；此操作保留备份，不会删除源代码
mv .git ../kite-incomplete-git-backup

git init -b main
```

### B4. 上传前密钥检查与首次 push

根 `.gitignore` 已忽略 `node_modules/`、`dist/`、`.env`、`.env.*`，并保留 `.env.example`。仍要亲自确认 staged files：

```bash
git status --short
git check-ignore -v .env
git add .
git status --short
git diff --cached --check
```

然后在 GitHub 网页的 repo 里确认 `.env`、钱包私钥、助记词、API key、PAT、浏览器 profile、个人发票信息均未出现在待上传文件中。若发现任何已泄露凭证，不只删除文件，还要先撤销/轮换凭证。

确认没有 secrets 后：

```bash
git commit -m "Build Kite Monad payments demo"
git remote add origin https://github.com/<你的GitHub用户名>/kite-monad-payments.git
```

认证建议：

```bash
gh auth login
git push -u origin main
```

如果使用 GitHub 网页创建 repo 且本地目录有 `.git` stub，以 `git remote -v` 检查 remote。若 `origin` 已存在但地址不对，先查清再修改，不要盲目覆盖。

**不要伪造历史：** 当前没有有效 commit history。只用实际提交日期；不要 backdate commit。README 如需说明 build window，按实际情况写清何时开发、哪些文件在何时完成。如果规则对开发历史有要求，向官方说明 repo 是现在初始化的，不要声称有不存在的历史。

### B5. AI 和代码来源披露

README 中添加真实、简短的 AI-assisted development disclosure。可用以下英文草稿，提交前按你的实际情况删改：

> AI-assisted development: AI assistance via Arena.ai Agent Mode was used to help prepare implementation, tests, and documentation. Type checks, automated tests, production build, and dependency audits were run. The participant is responsible for reviewing and submitting the final project. Other coding assistants/tools used by the participant: [list only tools actually used, or delete this sentence].

若规则要求具体底层模型，而你无法确认，不要猜模型名称；询问 organizer 可接受的披露方式。产品里 Kimi/Qwen 的推理调用与“AI 辅助写代码”是两种不同披露，分别说明。

### B6. README 至少更新这些内容

- 项目用途、目标用户、已真实跑通的功能；
- Node 24、npm 安装和本地启动步骤；
- `.env.example` 变量说明（写变量名和示例，不写真实 key）；
- demo URL、public repo URL、Monad Testnet chain ID；
- AUSD contract、测试 transaction hash（只在成功后加入）；
- Envio/Alchemy/Kimi/Qwen 当前状态，明确区分 mock/fallback 与 live；
- license、第三方依赖归属、AI disclosure；
- testnet token 无真实价值、无 fiat off-ramp、未做安全审计等限制。

---

## 8. 详细操作 C：部署公开 HTTPS 应用

### C1. 平台选择：推荐 Render；Netlify 可行但需改造

| 平台 | 能不能用 | 对当前 Kite 需要什么 | 建议 |
|---|---|---|---|
| **Render Web Service** | 可以，最贴合现有代码 | 一项 Node Web Service 就能运行 Express API，并在同一进程服务 Vite `dist/`；当前服务器已监听 `0.0.0.0:$PORT`。根目录 [`render.yaml`](../render.yaml) 已准备好 Blueprint。 | **优先选 Render**：不用把 Express 改成 serverless，`/api/*` 与 PWA 同源，步骤最少。 |
| **Netlify** | 可以，但不是把 `dist/` 直接上传就完成 | Netlify 官方 Express 部署基于 Netlify Functions；要加 Function handler（例如 `serverless-http`）、将 `/api/*` rewrite 到 Function，并把当前直接 `app.listen()` 的入口改成可被 Function 调用的 Express app。Functions 也有运行时/内存限制。纯静态发布会丢失 `/api/health`、`/api/rpc`、`/api/ai`。 | 只有你特别偏好 Netlify 时再做 adapter；目前为赶主流程和提交，不并行改架构。 |

**Render 实际部署步骤：**

1. 先按第 7 节把代码推到你自己的 GitHub public repo。当前不完整 `.git` stub 不能直接当作有效 repo。
2. 登录 Render Dashboard → **New → Blueprint**，授权并选择含有 `render.yaml` 的 repo/`main` branch，检查变更清单后 Apply。
3. 蓝图目前显式选 Singapore 区域、Free demo plan、Node `24.21.0`；build 为 `npm ci --include=dev && npm run build`，start 为 `npm start`，health check 为 `/api/health`。如果 Render 要求确认 compute plan，先确认金额/账单再点创建；Free 可用于测试，现场演示前若不接受冷启动可在 Dashboard 由你升级到 always-on 计划。
4. 部署成功后用 Render Dashboard 实际分配的 hostname（常见形式为 `https://<service>.onrender.com`）打开首页和 `https://<hostname>/api/health`。确认日志显示 Kite 正常监听，并且 API 返回 `status: ok`、chain ID `10143`。
5. 到 service 的 **Environment** 里，仅添加需要的 server-side secrets（例如 `ALCHEMY_API_KEY`、`ENVIO_GRAPHQL_URL`、`KIMI_API_KEY`、`QWEN_API_KEY`）；不要把任何密钥放在 `VITE_*`、`render.yaml`、GitHub 或聊天中。

Render 的 Free Web Service 闲置 15 分钟后会 spin down；下一位访问者可能等约一分钟才看到服务恢复。因此它适合先验证 HTTPS 与产品，但不适合完全不预热的限时现场 demo；若要可靠展示，接受冷启动或由你选 always-on plan。Free plan 也有 workspace 用量额度；创建前在 Render billing/usage 页面核对当前 bandwidth、build-pipeline 额度与超额处理，并在添加付款方式时设好 spend limit，避免把“free compute”误当成所有流量/构建都无限免费。Render 会给 Web Service 提供 `onrender.com` URL；自有域名和 TLS 的操作见下一小节。

**Netlify 为什么现在没有现成配置：** 这不是 Netlify 不能部署，而是目前 server entry 是常驻 Express server；必须先拆出 app/handler、增加函数构建与 rewrite，再用真实 Netlify preview 验证 JSON-RPC 签名提交和所有 API。Render 能原样承接同一个 Node process，所以先做 Render 的配置比在短赛期内引入 serverless 改造风险更低。

不要只发布 Vite `dist/` 到静态托管：除非同时部署后端并把 `/api/*` 安全地代理回同域，否则页面能打开也不等于付款功能能用。

### C2. HTTPS、最终域名与 Mera RP ID

- **不用先买域名也能有 HTTPS。** Render service 会提供自己的 `onrender.com` hostname。Render 对 service 和已验证的 custom domain 管理 TLS；浏览器访问走 HTTPS。若要自有域名，则先在 Render Dashboard 添加域名，再到你的 DNS 提供商配置记录，回 Dashboard Verify；Render 会签发/续期 TLS，并把 HTTP 转到 HTTPS。
- **最终 hostname 要在首次创建 passkey 前确定。** 现有 `src/lib/account.ts` 使用 `VITE_MERA_RP_ID || window.location.hostname`。若留空，passkey 会按访问时的 hostname 设 RP ID；因此通过 Render hostname 创建的 credential，不会因为账号同步就自动变成另一个 custom domain 的 credential。换域名后应在新最终域名重新创建/恢复新的 passkey；原 RP ID 的凭证通常不能在新 domain 使用。
- 若决定把自有域名作为最终 URL，先接好 DNS、等 HTTPS 证书正常，再在该域名实测。若把 `VITE_MERA_RP_ID` 固定在 build env，必须确认它与最终 WebAuthn RP ID 匹配；它是公开配置，不是 secret。最简单做法是让 app 用 `window.location.hostname` 默认值，并只在一个最终 hostname 上建 demo passkey。
- `localhost` 仅用于本机开发；在手机上打开正式 demo 时必须使用公开 HTTPS hostname。不要录制/提交临时 preview URL 后再换域名。

Render 自定义域名官方步骤：在 service 设置中添加 hostname → 在域名商配置 DNS → 回 Render 验证；证书由 Render 管理。自有域名的注册/DNS 账户仍由你控制。详细手动步骤见 [Render custom domains](https://render.com/docs/custom-domains)。

### C3. 环境变量

在部署平台的 **server environment** 设置真实密钥，不要提交 `.env`：

```text
# 可选 RPC provider。留空时 health 会显示 public RPC
ALCHEMY_API_KEY=
MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# 只有已成功部署 Envio 才填写
ENVIO_GRAPHQL_URL=https://<Envio给出的endpoint>/graphql

# 可选 Kimi（先确认本次活动提供的账户/key/model）
KIMI_API_KEY=
KIMI_BASE_URL=https://api.moonshot.ai/v1
KIMI_MODEL=kimi-k3

# 可选 Qwen；URL 应以 key 所属地域/workspace 的官方页面为准
QWEN_API_KEY=
QWEN_BASE_URL=https://<你的地域或workspace endpoint>/compatible-mode/v1
QWEN_MODEL=qwen3.8-max
```

实际模板见项目 [`.env.example`](../.env.example)。Hunyuan 变量也存在，但不是当前优先 bounty，时间紧时不要加。

### C4. 上线后的基础验证

1. 打开 `https://<你的域名>/`：确认首页完整、移动宽度可用、没有浏览器 console 致命错误；
2. 打开 `https://<你的域名>/api/health`：应显示 chain ID `10143`，且没有 404/500；
3. 确认 health 响应**不回显 API key**；
4. 若 `ALCHEMY_API_KEY` 已设置，health 应显示 `rpcProvider: alchemy`；若未设置则会是 `public`；
5. Envio 和 AI flags 变为 true 只说明配置存在，仍需完成第 10 节里的真实请求证明；
6. 在手机 Safari/Chrome 实测 HTTPS、安装提示、窗口刷新、deeplink/payment link 打开；
7. 若 app/server 报错，先查看部署日志与当前 `.env.example` 名称，不要把 API key 贴给别人调试。

**手机/PWA 检查：** 项目已有 `manifest.webmanifest`、`sw.js`、safe-area viewport 和响应式样式。iPhone 用 Safari 打开 HTTPS URL 后可从 Share 菜单选 **Add to Home Screen**；Android 用 Chrome 菜单里的 **Install app / Add to Home screen**（名称随系统版本变化）。当前 service worker 只缓存 app shell/assets，不缓存 `/api/*`；浏览器离线时不能创建 passkey、查询 RPC 或付款，所以不要声称“离线支付”。安装成功也只代表 PWA，不代表原生 App，也不自动证明 Agora bounty 资格。

---

## 9. 详细操作 D：真实设备 passkey 与 Testnet 付款

### D1. 使用专用测试账户

- 只用 Monad Testnet 测试账户；不要导入存有主网资产的钱包。
- 至少准备两组独立账户：一个 invoice/payee，一个 payer。最好使用不同手机或不同 browser profile，避免不小心由同一账户付给自己。
- **不要求必须按指纹。** Passkey 是 WebAuthn credential；Mera 每次创建/恢复 ceremony 要求 authenticator 本地做 user verification，但实际手势由设备决定，可以是指纹、Face ID/其他生物识别、设备 PIN/密码等。生物特征不会传给 Kite 或 Mera 服务端，也不会成为 app 可读的数据。
- **普通 passkey 能创建，不代表 Mera 能用。** Mera 还需要 WebAuthn PRF、discoverable credential 和 user verification；这三个条件要在一组明确的操作系统 + 浏览器 + authenticator 上同时满足。Mera 当前兼容表可作为实测起点：iPhone/iPad 可用 iOS 18+ Safari + iCloud Keychain；Android 可用 Chrome + Google Password Manager；也列有 1Password 等已验证组合。桌面 Chrome 的本机 profile passkey 与 password-manager passkey 并非同一兼容性，若 PRF 失败先查官方表，不要只看“创建 passkey 成功”。
- 在最终 HTTPS 域名测试：一次创建、锁定/退出后 sign-in、检查派生地址一致；保留设备/OS/browser/authenticator 与测试结果。PRF 不可用时停在失败状态，不能以普通假账户替代真实 Mera 演示。[Mera passkey/PRF 说明](https://mera.category.xyz/concepts/passkeys-and-prf/) · [Mera authenticator 兼容表](https://mera.category.xyz/authenticator-support/) · [Mera 官方入门](https://mera.category.xyz/getting-started/)
- 屏幕录制不得出现私钥、助记词、PRF 输出、API key、真实个人信息。

### D2. 领 Monad Testnet MON 与 AUSD

Monad Testnet 当前公开信息为 chain ID `10143`、RPC `https://testnet-rpc.monad.xyz`；用之前再核对[官方 Testnet docs](https://docs.monad.xyz/developer-essentials/testnet)。MON 只用来支付测试网 gas，可从[官方 Monad faucet](https://faucet.monad.xyz/)申请。

Agora 官方 deployment 文档当前列出的 Monad Testnet AUSD 合约地址是：

```text
AUSD:  0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC
Faucet: 0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C
AUSD decimals: 6
```

以[Agora 官方 deployment 列表](https://docs.agora.finance/developer/contract-deployments)当天显示为准。通过 Kite UI 的测试资金/faucet 入口操作，不要手动调用未知合约，不要把测试 token 当成真钱。测试 faucet 可能限流。

### D3. 核心 E2E 付款脚本

逐步验证：

1. payee 在正式 demo 域名用 Mera 创建/恢复 passkey，确认显示的 account address；
2. payer 用另一个 passkey 登录/创建账户；
3. 为需要支付 gas 的账户领 MON，按 app 流程取得 AUSD test funds；
4. payee 创建一个金额较小的 AUSD invoice，设置清楚的说明和 expiry；
5. 复制链接，在另一设备/browser profile 打开；
6. payer 核对 token、chain、付款金额、收款地址、过期时间；
7. payer 自己点击确认并签署交易；AI 和服务器不能决定收款地址/金额，也不能代签；
8. 等链上交易成功，核对 AUSD 余额变动、receipt/status、payee invoice status、Activity；
9. 打开 Testnet explorer 检查 transaction hash、发送方、接收方、token、数额和成功状态；
10. 如果 deploy 了 Envio，再确认 Activity 数据实际来自 Envio；否则 app 应诚实显示 RPC fallback。

Monad Testnet explorer：[testnet.monadscan.com](https://testnet.monadscan.com)。收集 tx hash/公开浏览器链接即可，不保存账户秘密。

### D4. 必测异常路径

至少测并记录：

- 同一 invoice 再付一次：拒绝或正确提示已支付；
- 修改 payment link 的 amount、receiver 或 token：签名/校验失败；
- 已过期 invoice：付款按钮不可用或提交前拒绝；
- 余额不足或没 MON：错误信息清晰，不显示假成功；
- 切到错误 chain：不会误发到错误网络；
- 取消签名/拒绝 WebAuthn：页面可恢复；
- 刷新、退出或重新进入后，付款状态能正确更新；
- 客户端 RPC 或 Envio 暂时不可用时，有诚实的错误/fallback 状态。

使用 [`docs/TEST_MATRIX.md`](./TEST_MATRIX.md) 作为底稿。成功 tx hash、截图、测试时间应另存一份；可以公开的证据也可写进 README/profile。不要公开 payer 的真实身份信息。

### D5. Mera “One Passkey, Many Keys” 证据怎么拍

建议演示：

1. 用一个 Mera passkey 建好钱包账户；
2. 同一 passkey 解锁一个独立、非钱包用途的密钥（Kite 是加密收款通讯录）；
3. 展示浏览器存储/应用数据中看不到联系人明文，只有密文/非敏感元数据；
4. 锁定/关闭页面后重新打开，用同一 passkey 解锁并恢复通讯录；
5. 再证明付款账户地址一致；
6. 清楚解释不同用途使用 HKDF 域分离，不是重复使用同一裸 key。

这只是有说服力的证据方案，不是官方评分保证；最后以 portal 里 “One Passkey, Many Keys” 精确规则为准。

---

## 10. 详细操作 E：Envio、Alchemy、Kimi、Qwen

### E1. Envio：`$1,000` 未标 credits 的 bounty 候选

当前已经做完本地 codegen、typecheck 和 handler test；**尚未真实使用 Envio Cloud**。

1. 把 `indexer/` 下的 `config.yaml`、schema、handler、测试推到 public GitHub repo；确认配置指向 Monad Testnet 的 Agora AUSD `Transfer` event；
2. 阅读 [Envio HyperIndex quickstart](https://docs.envio.dev/docs/HyperIndex/quickstart)；
3. 用自己的账户登录 Envio Cloud，安装/授权 Envio GitHub App 访问该 repo；
4. 根据当日 [Envio Cloud CLI 文档](https://docs.envio.dev/docs/HyperIndex/envio-cloud-cli)或 dashboard 新建 indexer。monorepo 中把 root directory 指到 `indexer/`，选择正确 branch/config；CLI 文档目前标注 alpha，应以当日 dashboard/文档为准。CLI 形式可参考下面示例（`<...>` 处按你的真实 repo/commit/org 替换；不要把 GitHub token 写入命令或聊天）：

   ```bash
   cd /home/user/kite
   npm install -g envio-cloud
   envio-cloud login
   git rev-parse --short HEAD
   envio-cloud indexer add \
     --name kite-ausd \
     --repo kite-monad-payments \
     --branch main \
     --root-dir indexer \
     --tier development
   envio-cloud deployment status kite-ausd <COMMIT_HASH>
   envio-cloud deployment endpoint kite-ausd <COMMIT_HASH>
   ```

   `envio-cloud login` 会打开浏览器授权；按当前 CLI 帮助补充 organization 参数。若 CLI 或组织权限与文档不一致，改用 Envio Cloud dashboard，不要反复猜 flag。
5. 等 deployment build 成功、开始同步并追上链头；复制 Envio 给出的 GraphQL endpoint；
6. 在 Kite 部署平台 server env 设置 `ENVIO_GRAPHQL_URL`，触发重新部署；
7. `/api/health` 显示 Envio 配置已开启后，**再发一笔新 AUSD 测试交易**；确认 Activity 显示 Envio 来源/索引数据，而不是 RPC fallback；
8. 留存 deployment 状态、GraphQL query/result、Activity 截图和 transaction hash。

`ENVIO_API_TOKEN` 是本地/自托管开发用途；Envio Cloud 通常用自己的 GitHub Cloud deployment 配置。不要把 token 放进 public repo。

### E2. Alchemy：`$1,000 credits` 候选

1. 在 [Alchemy dashboard](https://dashboard.alchemy.com/signup) 创建 account/app；选择 Monad Testnet，复制 API key；
2. 对照 [Alchemy Monad quickstart](https://www.alchemy.com/docs/reference/monad-api-quickstart)，官方 RPC 形式为 `https://monad-testnet.g.alchemy.com/v2/<API_KEY>`；
3. 把 key 只设在 Kite 部署平台的 server-side `ALCHEMY_API_KEY`；重新部署；
4. 打开 health 确认 `rpcProvider` 变为 `alchemy`；
5. 用 Kite 完成至少一次区块/余额读取及一次由用户 passkey 签署的测试交易；
6. 在 Alchemy dashboard 检查确有该 app 的 Monad 请求/usage；保存经遮盖 key 的截图或记录；
7. demo 展示 Kite 的实际产品流程如何依赖 Alchemy RPC，而不只展示后台配置。

当前 proxy 路由已存在，但若没有真实 Alchemy 请求，不应申报“已使用 Alchemy”。Health 只证明 key 配置，不是 bounty 证据。

### E3. Kimi：`$3,000 credits` 候选

1. 登录活动/官方指定的 Kimi account，确认这项比赛认可的 API key、credits、model 与有效期；不要默认为个人付费余额等于 sponsor credits；
2. 参照 [Kimi API 官方 quickstart](https://platform.moonshot.ai/docs/guide/kimi-k2-5-quickstart)核对 base URL 和 model；当前 Kite 模板默认 `KIMI_BASE_URL=https://api.moonshot.ai/v1`、`KIMI_MODEL=kimi-k3`，活动要求可能不同；
3. 在部署平台设置 `KIMI_API_KEY`/`KIMI_BASE_URL`/`KIMI_MODEL`，server-only；
4. 用纯虚构 demo 文本生成 invoice copy；检查 Kimi 成功返回、UI 显示结果、用户可以改写/拒绝；金额、收款地址、签名数据不应送给 AI；
5. provider 账户 usage log 显示本次实际请求与 model；保存截图/时间；
6. 在提交材料里准确说明这项 AI 做什么、不做什么。

### E4. Qwen：`$5,000 credits` 候选

1. 创建活动认可的 Alibaba Cloud Model Studio account/key；核对 key 所属地域、workspace、模型和 credit 领取方式；
2. 参照 [Alibaba Model Studio OpenAI-compatible 文档](https://help.aliyun.com/en/model-studio/compatibility-of-openai-with-dashscope)。不要直接照抄别的地域的 endpoint；
3. 在 server env 设置 `QWEN_API_KEY`、匹配区域的 `QWEN_BASE_URL`、活动要求的 `QWEN_MODEL`；
4. 用虚构 invoice 文案实际翻译一次，确认 provider 成功返回且用户可编辑/拒绝；
5. 检查 Alibaba/活动 dashboard usage，保留调用证据；
6. 只有实际用过指定模型且符合 bounty 条款，才申报 Qwen bounty。

### E5. 时间不足时的 sponsor 取舍

- 优先顺序是：一笔稳定的 AUSD payment → Mera 两项真实演示 → Agora mobile/PWA 资格确认 → Envio 部署 → Alchemy → Kimi/Qwen。
- 如果 Envio deployment 没同步成功，诚实写 local-tested，不要申报已使用 Envio。
- 如果 provider key 没有、credits 未到账、或接口没有返回，不要把本地 fallback 说成 Kimi/Qwen。
- 不要为 credits bounty 在最后一天引入新依赖、影响付款或 passkey 稳定性。

---

## 11. 提交材料：项目文案、视频与证据

### 11.1 项目名称与短描述

**项目名：** `Kite — Passkey AUSD Invoices on Monad`

**英文短描述：**

> Request, verify and settle AUSD invoices on Monad with Mera passkeys—without handing custody to a payment processor.

**中文解释：** Kite 面向独立工作者/小型工作室创建可验证的 AUSD 付款请求；付款方用 passkey 直接在 Monad Testnet 签名付款，不把账户托管给支付中介。

### 11.2 项目说明草稿

将方括号 URL 换成实际链接；未完成的 integration 要删掉对应句子。

> Kite helps independent workers and small studios request and settle dollar-denominated invoices. A seller creates a signed payment link; the payer verifies the recipient, amount, AUSD token and expiry, then authorizes a direct transfer from a Mera passkey account on Monad. The Activity view uses Envio HyperIndex only when the hosted indexer is configured; otherwise it labels its bounded RPC fallback. A separate Mera-derived key encrypts saved payees in the browser. This is a Monad Testnet prototype: test AUSD/MON have no monetary value, no fiat off-ramp is provided, and the product is not for production funds. Demo: [LIVE URL]. Code: [PUBLIC GITHUB URL]. Test transaction: [EXPLORER TX URL].

发布前逐项确认：

- 是否真的在手机上跑过；
- 链上 transaction hash 是否存在且成功；
- Envio 是否同步、Activity 是否真的来自 Envio；
- Alchemy/Kimi/Qwen 是否有 dashboard usage 证据；
- 有无法币兑换/银行到账；若没有，必须说没有；
- 有没有任何虚构用户/虚构 transaction 被呈现成真实。

### 11.3 视频要求

先在 portal 查具体时长、视频平台与可见性要求。若确定上限是 3 分钟，建议控制在 **2:30–2:50**，留上传/播放缓冲。建议镜头顺序：

| 时间 | 展示内容 |
|---|---|
| 0:00–0:20 | 谁遇到什么支付问题；一句话说明 Kite |
| 0:20–0:55 | 用手机创建/恢复 Mera passkey；强调没有扩展/助记词（仅在真实验证后） |
| 0:55–1:30 | payee 创建 invoice，payer 打开链接并核对金额/地址/token/expiry |
| 1:30–1:55 | payer 自己签名；显示交易 pending → confirmed，不剪辑伪装真实时间/状态 |
| 1:55–2:15 | 打开 Monad Testnet explorer 显示 tx hash 和成功状态 |
| 2:15–2:35 | 显示已真实部署的 Envio/Alchemy/Mera Many Keys（没有完成就不展示/不声称） |
| 2:35–2:50 | 解释 Testnet 无真实价值、无 fiat off-ramp、下一步 |

视频要设置为 portal/评委可访问；用无痕窗口测试权限。画面不要显示 secret、个人 email、真实联系人、签名私钥或 API key。可加英文字幕，讲解语言按比赛受众决定；以 portal 要求为准。

### 11.4 建议证据目录（本地保存，不一定全上传 public repo）

可以在自己电脑建立一个未公开的证据文件夹，并保留：

```text
evidence/
  portal-rules-notes.txt        # deadline、bounty 原文、资格、规则版本
  registration-confirmation.png # portal 注册/项目状态
  app-live-check.txt            # app URL、/api/health 摘要（不含 secret）
  testnet-payment-1.txt         # 时间、chain、tx hash、explorer URL
  envio-deployment.png          # 仅在真部署后
  alchemy-usage.png             # 仅在真调用后，遮住 key
  kimi-usage.png                # 仅在真调用后
  qwen-usage.png                # 仅在真调用后
  demo-video-url.txt
  final-submission.png          # 正式提交确认/ID/时间
```

证据截图如含邮箱、姓名、钱包余额以外的隐私资料，发布前打码。**绝不**把私钥、助记词、PRF bytes、PAT/API keys 放入证据目录或公开仓库。

---

## 12. 最终提交检查表

提交前逐项打勾；每个勾都要有可验证证据。

### 资格与 portal

- [ ] 用正确登录 provider 注册，确认账号不是另一个空 profile。
- [ ] solo team/成员资料完整，主赛道为 Consumer Products & Payments。
- [ ] 自己已确认年龄、地区/制裁限制、KYC、领奖钱包、税务责任。
- [ ] 精确 deadline/time zone 已在 portal 确认；内部截止早于官方截止。
- [ ] 规则、视频限制、开源/license、AI disclosure、一个项目/track 限制已读。
- [ ] 每一项选中的 bounty 都能指出条款、实际功能和 demo 证据。

### 代码与安全

- [ ] GitHub repo 为评审可访问的状态；`git push` 成功。
- [ ] README 的命令在 Node 24 下可复现；MIT `LICENSE` 存在。
- [ ] `.env`、私钥、mnemonic、PAT、API keys、用户个人资料不在 repo/history。
- [ ] 先前暴露的 PAT 已撤销；未在公开 repo/README/视频中泄露新 token。
- [ ] AI coding disclosure 和依赖/素材 attribution 按 portal 要求填写。
- [ ] Git 提交日期真实，不伪造 build history。

### 线上运行与链上证据

- [ ] 同域 Express + Vite app 在 HTTPS 域名可访问；不是只有静态 mockup。
- [ ] `/api/health` 正常；不泄露 secret；网络 chain ID `10143`。
- [ ] Mera passkey 在真实手机/浏览器/authenticator 上通过 PRF 测试。
- [ ] 两个专用测试账号可以创建 invoice 与支付。
- [ ] 至少一笔 AUSD Testnet 付款真实成功，explorer tx hash 可打开。
- [ ] 过期、修改、重复支付、余额不足、错误 chain 等异常已测。
- [ ] 如果申报 Envio，indexer 已同步且 app 实际查询；如果申报 Alchemy/Kimi/Qwen，有成功调用与 provider usage 证据。
- [ ] PWA/mobile 资格有官方确认，或明确不申报 Agora mobile bounty。

### profile 与最终提交

- [ ] 项目名称/短描述/完整说明真实；Testnet 和无 fiat off-ramp 的限制已说明。
- [ ] demo URL、public GitHub URL、视频 URL、交易 explorer URL 无需授权即可打开。
- [ ] 视频符合 portal 时长与格式，显示真实产品及真实链上互动；没有 secret/PII。
- [ ] 点击最终 **Submit**；portal 显示 Submitted/Complete，不是 Draft。
- [ ] 保存 submission ID、最终确认页和提交时间；重新打开每条链接做无痕测试。

---

## 13. 建议时间表与时间不够时的取舍

日期按 2026-10-10 更新；以 portal 倒计时为准。

### 10 月 10 日：资格、repo、项目草稿

- 先撤销 PAT；
- 登录 portal、读规则、确认 deadline、建 solo team、选主赛道；
- 创建 public repo、初始化真实 Git history、提交当前工作快照；
- 录入项目名称/说明草稿。

### 10 月 11 日：线上 demo 与主流程

- Node 24 部署到稳定 HTTPS 域名；先验证主页和 `/api/health`；
- 在最终域名创建 passkey；
- 取得 MON/AUSD test funds；用两个 passkey 跑一次付款；
- 修复阻挡核心付款的 bug；保存 tx hash。

### 10 月 12 日：证据、视频、正式提交

- 加 README/demo URL/交易哈希/AI disclosure；
- 完成必要异常测试；
- 录制并检查视频；
- 正式提交、保存 confirmation；
- 有余力才继续 Envio / Alchemy / AI credits。

### 10 月 13 日：只留给紧急修复

除非 portal 允许，否则不要把最后一天当计划内开发日。不要等到最后时刻上传视频或改 repo 权限。

### 若只剩很少时间

1. 先完成 portal 参赛注册/主赛道提交；
2. 公开 repo + HTTPS 页面 + 一笔真实 testnet 付款 + 短视频；
3. 如 passkey/付款已实测，证明 Mera UX；如加密通讯录可以稳定演示，再证明 Many Keys；
4. Agora mobile/PWA 若未拿到确认，就不申报该项；
5. Envio 没有 Cloud endpoint 就只说 local-tested；Alchemy/Kimi/Qwen 没有真实调用就不申报；
6. 不能为了多报一个 bounty 让付款流程不稳定或错过正式提交。

---

## 14. 常见失败点与处理办法

### “portal 登录了，但我看不到项目”
可能用了不同 OAuth provider。先退出并用首次注册时的 provider 登录；不要重复创建多个 team/project，除非 rules 允许。

### “Passkey 能创建，但付款失败/PRF 不支持”
WebAuthn passkey 与 PRF 能力不是一回事。检查浏览器/系统/authenticator、HTTPS、RP ID 是否是最终域名；换 Mera 文档支持的 authenticator 测试。不要为 demo 换域名。

### “线上页有，但 `/api/health` 404/启动时报找不到 tsx”
说明可能只发布了静态 `dist/`，或 runtime 清理了 dev dependencies。部署同一 Node service 来处理 Express API；Node 24；确保 `tsx` 在 runtime 存在或编译 server。

### “Envio health true，但 Activity 没数据显示 Envio”
Health 可能只验证了 endpoint 配置。先查看 Envio Cloud sync status、GraphQL schema/查询和 token 地址；发送 sync 完成后的新 transfer 再核对 app source 标记。

### “Alchemy health 显示 alchemy，但 dashboard 无 usage”
检查是否请求真的经过同一个 backend key、环境变量是否在生产 service、服务是否重启/重新部署；发一笔读取请求后看 provider usage。不要拍含 key 的画面。

### “Kimi/Qwen 按钮有文案，但 provider dashboard 无使用记录”
这可能是 app 的本地 fallback。先确认 server environment key/model/base URL；再看 server logs 和 provider usage。只有成功 provider request 才是 sponsor-model evidence。

### “AUSD faucet 无余额/失败”
faucet 可能限流或余额耗尽；先核对官方地址、token、chain、请求参数；不要对主网地址发送。没有成功 faucet 也可以用另一测试账户/官方允许的方案，不能伪造 test funds。

### “我已 push，但项目不 public/评委打不开”
用无痕浏览器未登录 GitHub 打开 repo 和 README；检查组织权限、branch、视频隐私、部署平台 access control。不要只在自己登录状态下测试。

### “提交页面是 Draft”
必须找到 portal 的最终 Submit/Confirm 操作；保存 complete/submitted 状态、submission ID 与时间。OAuth 登录、项目草稿或保存按钮不等于提交完成。

---

## 15. 官方资料与项目内部文档

### 官方活动、链与 sponsor 文档

- [Monad Metropolis 官方页：track、prizes、时间线、FAQ](https://monad.xyz/developers/hackathons/metropolis)
- [Metropolis 官方 portal：登录、rules、注册、提交](https://hackathon.monad.xyz/)
- [Monad Testnet 网络参数](https://docs.monad.xyz/developer-essentials/testnet)
- [Monad Testnet faucet](https://faucet.monad.xyz/)
- [Agora AUSD 官方合约地址列表](https://docs.agora.finance/developer/contract-deployments)
- [Mera 官方文档、示例和安装](https://mera.category.xyz/)
- [Mera passkey 与 PRF 概念](https://mera.category.xyz/concepts/passkeys-and-prf/)
- [Mera authenticator PRF 兼容表](https://mera.category.xyz/authenticator-support/)
- [Mera PRF/密钥派生技术说明](https://www.category.xyz/blogs/mera-crypto-onboarding-with-only-a-passkey-on-any-network)
- [Render：部署 Node/Express app](https://render.com/docs/deploy-node-express-app)
- [Render：Blueprint `render.yaml` schema 与字段](https://render.com/docs/blueprint-spec)
- [Render：Node.js 版本选择](https://render.com/docs/node-version)
- [Render：Free service 限制/闲置休眠](https://render.com/docs/free)
- [Render：自定义域名与 TLS](https://render.com/docs/custom-domains)
- [Netlify：Express on Netlify Functions](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/)
- [Envio HyperIndex quickstart](https://docs.envio.dev/docs/HyperIndex/quickstart)
- [Envio Cloud CLI](https://docs.envio.dev/docs/HyperIndex/envio-cloud-cli)
- [Alchemy 创建 API key](https://www.alchemy.com/docs/create-an-api-key)
- [Alchemy Monad Testnet quickstart](https://www.alchemy.com/docs/reference/monad-api-quickstart)
- [Kimi API quickstart](https://platform.moonshot.ai/docs/guide/kimi-k2-5-quickstart)
- [Alibaba Model Studio OpenAI-compatible API](https://help.aliyun.com/en/model-studio/compatibility-of-openai-with-dashscope)

### Kite 内部文档

- [README](../README.md)：产品介绍、运行方式与 testnet 限制；
- [BOUNTY_MAP](./BOUNTY_MAP.md)：集成方向与 bounty 证据缺口；
- [INTEGRATIONS](./INTEGRATIONS.md)：AUSD/RPC/Envio/AI integration 设置；
- [DEMO_SCRIPT](./DEMO_SCRIPT.md)：现有演示草稿；
- [TEST_MATRIX](./TEST_MATRIX.md)：自动化和手动测试矩阵；
- [THREAT_MODEL](./THREAT_MODEL.md)：密钥、passkey、付款和隐私边界。

---

## 完成记录更新规则

- 只有看到 portal 注册状态，才把“已注册”改为完成；
- 只有公开 URL 在无痕窗口打开，才把“已部署/公开”改为完成；
- 只有真实交易 receipt/explorer hash，才把“付款已完成”改为完成；
- 只有 Envio/Alchemy/Kimi/Qwen/Hunyuan 的成功记录和 app 中真实使用，才把相应 integration 标成“已实现”；
- 只有 portal 最终状态为 Submitted/Complete，才把“已提交”改为完成；
- 只有收到正式获奖/credits 通知并满足领取流程，才把奖励记入“已获得”。

**当前不可更改的基线：已获奖 `$0`；已到账 credits `$0`；Metropolis 正式提交数 `0`。**
