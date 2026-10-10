# 叠加 Privy / Dynamic 的完整分析

> 日期：2026-10-10。目的：在 Kite 已经以 **Mera passkey 作为唯一账户层** 的前提下，评估叠加 Privy 或 Dynamic 的含义、收益、风险与建议。
>
> 本文区分三类信息：
> - **【官方】** 来自 monad.xyz 官方页面或厂商官方文档。
> - **【第三方】** 来自聚合网站、其他参赛者仓库或博客，**未经核实**，不能作为规则依据。
> - **【推断】** 基于代码与产品结构的判断。

---

## 1. 结论先行

**建议：不要叠加 Privy；Dynamic 只在特定条件下考虑，且不作为账户层。**

理由概括：

1. **规则风险未解决。** 第三方转述称 Privy bounty 要求“超越登录”，并且与 Mera “互斥”。如果为真，叠加 Privy 会直接失去两项 Mera bounty（合计 $5,000），去换取一项 $5,000 且结果不确定的 Privy bounty。这是一次负期望的交易。**这一点必须先在门户核实。**
2. **产品叙事冲突。** Kite 的卖点是“只用 Mera，无助记词、无扩展、无托管”。叠加第二个 embedded wallet 会产生两个地址、两套密钥，并引入第三方托管或 MPC 基础设施。
3. **时间不足。** 距离 10 月 12–13 日的提交截止只剩约 2–3 天。两家 SDK 的控制台配置、域名白名单、测试网支持、回归测试都需要时间。叠加会挤占 Mera 真机测试与测试网交易证据的时间，而这些证据是现有 bounty 的必需项。

下面是完整分析。

---

## 2. 事实核实

| 事项 | 来源与状态 |
|---|---|
| Privy 有 $5,000 bounty，标题 “Privy!” | **【官方】** monad.xyz Metropolis 页面 Sponsor prizes 列表。页面未给出具体要求。 |
| Dynamic 有 $5,000 bounty，标题 “Best Use of Dynamic” | **【官方】** 同上。 |
| Privy bounty 要求“超越登录，单纯登录集成不合格” | **【第三方】** 用户提供的中文材料与一个参赛者仓库的转述。未在官方页面核实。 |
| Privy bounty 与 Mera “互斥” | **【第三方】** 仅见于一个非官方仓库的转述，标注为“从 dashboard 页面 2026-09-22 摘录”。**未经核实。** |
| Dynamic bounty 要求“使用 Dynamic SDK，探索 Auth、Embedded Wallet、Agent Wallet、Signing 等” | **【第三方】** 用户提供的中文材料。 |
| Mera bounty 要求“使用 Mera 作为完整账户层，实现无助记词、无浏览器插件、无托管的钱包体验” | **【第三方】** 用户提供的中文材料。官方页面只有标题 “Best Mera-Powered UX on Monad”。 |
| 官方 bounty 列表中 Monad 的 Mera 奖项为 $2,500 + $2,500 | **【官方】** |
| Privy 支持 embedded wallet、passkey 登录、gas sponsorship、server wallet、policy、transfer API 等 | **【官方】** Privy 文档（gas sponsorship 需要 TEE 执行；sponsor 参数仅在 React SDK 与服务端可用，具体见文档）。 |
| Privy 定价 | **【第三方】** 多家聚合站报告：Developer 免费 ≤499 MAU；Core $299/月（500–2,499 MAU）。**价格以 Privy 官方定价页为准，未核实。** |
| Dynamic 定价 | **【第三方】** 聚合站报告：免费到 1,000 MAU，之后约 $249/月起。**未核实。** |
| Dynamic 支持 Monad | **【官方】** Monad 文档的 Embedded Wallets 页面将 Dynamic 列为提供 embedded wallet 与 passkey/social/email 登录的服务商。 |
| Dynamic 被 Fireblocks 收购（2025 年 10 月） | **【第三方】** 多家聚合站报告。 |
| Monad 官方模板使用 Privy 构建 React Native 钱包 | **【官方】** Monad 文档 “React Native Privy embedded wallet template”。这说明 Privy 在 Monad 生态中是被官方支持的集成路径，但**不等于**比赛规则。 |

**关键未知：** Privy 与 Dynamic 在本次门户中的确切评审标准、是否允许与 Mera 同时申报、是否允许同一项目在多个 bounty 中共用同一功能。这些必须由你本人登录门户查看。

---

## 3. 什么叫“叠加”

在 Kite 的架构里，“叠加”可以有四种含义，性质差异很大。

| 方案 | 含义 | 账户层 | 是否动摇 Mera 叙事 | 对 bounty 的影响 |
|---|---|---|---|---|
| **A. 纯 Mera（当前）** | 只用 Mera | Mera | 否 | Mera ×2 + Agora + Envio 等 |
| **B. Mera + Dynamic 辅助功能** | Dynamic 只用于某个辅助场景（如 agent 钱包、签名服务），不替代 Mera 账户 | Mera 为主，Dynamic 为辅 | 中等，需解释清楚 | 可能申报 Dynamic；需确认是否与 Mera 冲突 |
| **C. Mera + Privy 登录/gas 赞助** | 用 Privy 做邮箱/社交登录，或做 gas 赞助 | 双账户 | 是 | 可能申报 Privy，但可能失去 Mera |
| **D. 用 Privy/Dynamic 替换 Mera** | 整体换成 embedded wallet | Privy 或 Dynamic | 完全背离 | 失去两项 Mera bounty，且背离用户原始要求，**不予考虑** |

---

## 4. 叠加 Privy 的完整分析

### 4.1 技术含义

- **双账户问题。** 用户会有两个地址：Mera 派生的 EOA 与 Privy embedded wallet 地址。付款链接里的 `payee` 指向哪一个？通讯录与 Activity 页要按哪个地址查询？这些都要重新设计。
- **身份绑定问题。** 要决定 Privy 的用户标识与 Mera 凭证如何关联。一种做法是 Privy 登录后生成 Mera 账户，另一种是反过来。两种都需要持久化映射，映射本身就是新的隐私与安全面。
- **gas 赞助的吸引力（真实的收益）。** 目前付款人需要 MON 付 gas，对 Agora 跨境场景是明显的门槛。Privy 的 gas sponsorship 理论上能去掉这个门槛。但：
  - 官方文档说明 gas 赞助要求 **TEE 执行**，并需在控制台配置支持的链、sponsor 白名单与赞助预算；
  - 服务端 sponsor 需要预算管理与滥用控制；
  - 你需要确认 Privy 对 Monad 测试网的支持范围。
- **SDK 体积与依赖。** Privy React SDK 会显著增加前端包体积。当前构建的 `evm-vendor` 已经有 ~297 KB（gzip ~91 KB），再加一个 SDK 会更大。移动端首屏变慢是 PWA 的实际风险。
- **RP ID 与 passkey 冲突。** Privy 的 passkey 与 Mera 的 passkey 都绑定同一个域名。用户会在系统里看到两个 Kite 相关凭证，容易混淆。
- **依赖面扩大。** Privy 控制台的 App ID、客户端配置、允许域名、webhook、服务端密钥都要管理。服务端密钥必须只放在环境变量。

### 4.2 收益

- 可能申报 Privy $5,000 bounty（前提是规则允许且要求满足）。
- gas 赞助可以显著改善付款人首次体验（若实现可靠）。
- 邮箱/社交登录可以降低部分用户的门槛（但与 Mera 的“无助记词、passkey 优先”叙事并不完全一致）。

### 4.3 风险（按严重程度排序）

| # | 风险 | 严重程度 | 说明 |
|---|---|---|---|
| R1 | **规则互斥导致 Mera bounty 丢失** | 高 | 第三方称两者互斥。若成立，失去 $5,000（两项 Mera）。**未核实前不能叠加。** |
| R2 | **Privy 要求超越登录，我们的集成可能被判定为“仅登录”** | 高 | 第三方转述的规则。gas 赞助或服务端 wallet 才能满足“超越登录”，这会增加实现量。 |
| R3 | **叙事矛盾** | 高 | “无托管、无助记词、只用 Mera”的承诺被削弱。评审若发现双账户会质疑产品定位。 |
| R4 | **时间不足** | 高 | 2–3 天内完成 Privy 控制台配置、集成、双账户映射、回归测试、真机验证，风险很大。 |
| R5 | **隐私与数据面扩大** | 中高 | Privy 会收集邮箱/手机号等 PII，需要隐私政策与数据处理说明。当前应用不收集这些数据。 |
| R6 | **托管/安全模型变化** | 中 | Privy 使用 TEE + 密钥分片（官方文档称非托管，但密钥分片由 Privy 基础设施参与）。我们需要如实描述，不能说“完全自持”。 |
| R7 | **成本** | 低（黑客松期间） | 免费层约 499 MAU；超出后 Core 约 $299/月（**第三方报告，未核实**）。若 Privy 按 MAU 计费，闲置用户也计入。 |
| R8 | **供应商锁定** | 中 | 之后迁移需要重新处理用户账户映射与地址迁移。 |
| R9 | **测试网支持不确定** | 中 | 需确认 Privy 是否在控制台为 Monad 测试网提供 embedded wallet 与 gas 赞助。未核实。 |
| R10 | **回归风险** | 中 | 新增登录路径会影响现有 Mera 流程（锁定、清零、会话超时）。需要重新跑全部安全测试。 |
| R11 | **依赖第三方可用性** | 低 | Privy 或其 API 故障会影响登录与 gas 赞助。Mera 路径应保留为无第三方依赖的降级选项。 |

### 4.4 Privy 的理论期望值（粗略）

令 `p1` 为“规则允许同时申报且我们的集成满足要求”的概率，`p2` 为“规则互斥或我们的集成不被认可”的概率。

- 叠加 Privy 的收益 ≈ `p1 × $5,000`
- 叠加 Privy 的损失 ≈ `p2 × $5,000`（Mera 两项）+ 时间成本（挤占真机测试与视频）

只要 `p2` 不明显小于 `p1`，期望值就为负或接近零。在没有门户证据之前，我无法给出可信的 `p1`，但第三方转述已经把 `p2` 推到了不可忽略的水平。

---

## 5. 叠加 Dynamic 的完整分析

### 5.1 技术含义

- Dynamic 同样提供 embedded wallet（MPC/TSS 或 TEE）、社交/邮箱/passkey 登录与多钱包连接。
- Dynamic 的 bounty 描述（第三方转述）是“使用 Dynamic SDK 探索 Auth、Embedded Wallet、Agent Wallet、Signing”。它**不像** Mera 那样要求“完整账户层”，这意味着 Dynamic 的 bounty 与 Mera 的冲突可能比 Privy 小。**但这仍需门户核实。**
- 若只把 Dynamic 用于“Agent Wallet / Signing”这类辅助场景，就可以避免双账户问题。例如：一个“定时付款代理”，由 Dynamic 托管的 agent 钱包在用户授权范围内执行分期付款。但这会引入**委托签名**，等于让第三方基础设施在一定范围内代表用户付款，安全与合规风险都显著上升。

### 5.2 收益

- 可能申报 Dynamic $5,000。
- 如果做 agent 辅助功能，能展示“AI 代理 + 钱包”的故事，与 Track 4 的 agent 基础设施方向相关。

### 5.3 风险

| # | 风险 | 严重程度 | 说明 |
|---|---|---|---|
| D1 | 双账户与叙事冲突（若作为登录/账户层） | 高 | 与 Privy 的 R3 相同。 |
| D2 | 委托签名的安全风险（若做 agent） | 高 | 代理可以在授权范围内花用户的钱。需要限额、白名单、撤销机制、审计日志。两天内无法做到可靠。 |
| D3 | 规则不明确 | 中高 | “探索” 的强度要求未知。浅层集成可能不被认可。 |
| D4 | 定价不确定 | 低（黑客松期间） | 第三方称免费到 1,000 MAU。需官方核实。 |
| D5 | 收购与路线图变化 | 低中 | 第三方报告 Dynamic 2025 年被 Fireblocks 收购，产品路线可能变化。需要核实。 |
| D6 | 与 Mera 的 bounty 冲突 | 未知 | 需要门户核实。 |

### 5.4 Dynamic 的建议

- **如果门户允许 Dynamic 与 Mera 并存，且 Dynamic 的 bounty 接受“非账户层”的功能，**可以做一个**只读/低权限**的辅助功能，例如：用 Dynamic 的 Auth 为“商家端仪表盘”提供登录（不接触付款签名），或用 Dynamic 展示链接的 embedded wallet 作为“收款地址选项”。这样不改变资金路径。
- 任何涉及签名或资金的 agent 功能，本轮不建议实现。

---

## 6. 决策矩阵

| 条件 | 行动 |
|---|---|
| 门户明确：Privy 与 Mera 互斥 | **不叠加 Privy**。保留 Mera。 |
| 门户明确：Privy 只允许 gas 赞助或服务端 wallet 等超越登录的功能，且与 Mera 不互斥 | 仍不建议。时间不足以可靠实现，除非你有 Privy 控制台权限与 1 天以上的专门开发时间。 |
| 门户明确：Dynamic 允许非账户层的辅助功能，且与 Mera 不互斥 | 可以考虑做一个**低权限**的辅助功能（见 5.4）。 |
| 门户规则仍不清楚 | 先向官方 organizer / Discord 询问，保存回复。**在得到书面答复前，不叠加。** |
| 你本人不能在 2 天内完成 Mera 真机测试与测试网交易 | 不叠加任何第三方。把时间全部放在 Mera 与 Agora 的证据上。 |

---

## 7. 如果你决定叠加：最小实施方案

仅在门户确认允许、且你有至少 1–2 天专门时间时执行。

**Privy（仅登录与 gas 赞助，不替代 Mera）：**
1. Privy 控制台：创建 App，启用需要的登录方式，配置允许域名（生产域名与 localhost）。
2. 前端：新增 `PrivyProvider`，只在独立路由（例如 `/sponsored`）启用，不影响主流程。
3. 服务端：仅在需要时使用 Privy 服务端密钥，且只放在环境变量。
4. 账户映射：如果 Privy 地址要用于收款，必须在付款链接中明确标注是哪一个地址，并重新验签。
5. gas 赞助：只对白名单交易启用，设置预算与每日上限，记录日志。
6. 测试：新增针对路由隔离与密钥不泄露的测试；确保 Mera 流程的 `server-api` 与 `contact-crypto` 测试全部通过。
7. 隐私：增加隐私政策页面，列出 Privy 收集的数据。

**Dynamic（低权限辅助）：**
1. 控制台：创建 environment，启用 embedded wallet 与 passkey 登录。
2. 前端：只在“商家端工作台”或独立页面启用 `DynamicContextProvider`。
3. 不接入任何付款签名路径。
4. 证据：功能截图与说明文字，明确它不是账户层。

---

## 8. 对你的行动项

1. **今天**登录 Metropolis 门户，搜索 Privy 与 Dynamic 的 bounty 原文，并截图保存。
2. 确认是否允许同一项目同时申报 Mera 与 Privy/Dynamic。
3. 如果门户不清楚，在 Monad 开发者 Discord 或官方邮箱询问，把答复保存到 `docs/evidence/`。
4. 在拿到答复之前，**不要**在仓库中新增 Privy/Dynamic 的依赖或 key。
5. 把时间优先用于：Mera 真机测试、测试网交易、Render 部署、视频。这些对现有 bounty 的收益更确定。

---

## 9. 风险声明

- 本文不是法律意见或官方规则解释。规则以门户登录后的版本为准。
- 本文中所有 Privy/Dynamic 价格、收购信息、互斥说法均未经官方核实，仅供决策参考。
- 任何 embedded wallet 或 gas 赞助都会改变资金与数据的信任边界。在叠加前，请重新阅读 `THREAT_MODEL.md` 并更新其中内容。
