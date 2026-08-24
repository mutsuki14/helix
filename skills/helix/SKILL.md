---
name: helix
description: "Use for disciplined coding and engineering work: clarifying vague requirements, specs and acceptance criteria, baseline-first edits, root-cause debugging, evidence before claiming done, non-converging iterations, getting unstuck, long cross-session tasks, ADRs, retiring legacy code. Also on keywords: helix, seed, grill, unstuck. 工程任务需要纪律时加载：澄清需求、出规格、修 bug 找根因、完成前验证、迭代不收敛、脱困、长任务续航。"
---

# Helix 方法环 · 总路由

> 若当前宿主是 Cindy 且已装入 `helix` 插件（工具列表里有 `ghost_call`，且花名册有 helix），优先使用插件（`ghost_manual` / `helix_gate` 工具），本技能是它的跨宿主等价物，不要两边重复走流程。

Helix 是一套工程方法环，融合两条血统，并以第三方生态之长补全：

- **盾（源自 Aegis/Superpowers 系）**：基线优先、证据验证、边界纪律——动手前对齐项目真实现状，宣称完成前拿出新鲜证据。
- **环（源自 Ouroboros）**：澄清 → 结晶 → 执行 → 评估 → 进化——需求先过歧义门再动工，评估结果成为下一圈输入，直到收敛。

融合后的形状是**螺旋**：循环闭合，但每一圈必须带着证据上升；简单任务根本不进环。

**零配置原则**：Helix 不需要任何额外 LLM 设置、API key、守护进程。量化门槛（歧义/漂移/循环裁决）用本技能目录下的 `scripts/gate.mjs` 确定性计算（`node scripts/gate.mjs '<args JSON>'`）；宿主没有 node 时按方法文件里的公式手算并展示算式。多模型共识改为同宿主多人格子代理（无子代理设施时串行自演，见 `methods/personas.md`）。持久化只用项目内纯文本 `.helix/`。

## 权威边界

- 用户指令与目标项目自身规则**永远高于** Helix。Helix 是方法建议，不是完成权威，也不是"强制工作流"——纪律为风险服务，不为仪式服务。
- Helix 不拥有"完成"裁定权——它只要求把证据摆出来，让用户能裁定。

## 第一步：复杂度分级

依据是**风险与含糊度**，不是代码行数：

| 级别 | 判据 | 走法 |
|---|---|---|
| **L0 琐碎** | 问答、状态查询、单命令检查、微小低风险编辑 | **快路径**：直接做，不进环、不写文件、不提 Helix。完成时一句话说清"做了什么检查、结果如何"。 |
| **L1 中等** | 单模块、验收明确、无契约变更，但需多步实现 | **迷你环**：3 行迷你 Seed（写在回复里）→ 执行 → 机械+语义两级评估。 |
| **L2 复杂** | 跨模块、契约/schema/数据边界变更、需求含糊、高风险、跨会话 | **完整环**：`methods/clarify.md` → `methods/build.md` → `methods/verify.md` → `methods/evolve.md`。 |

红线：共享代码、核心路径、契约、跨模块工作**没有证据不得判 L0**。拿不准就升级。

## 努力度阶梯（成本感知路由）

进程深度与子代理用量按风险配给，且随实际表现升降档：

- 初始档：L0 无子代理；L1 至多 1 个；L2 按需——共识门默认 2 人格，契约/数据/安全面 3 人格。
- **升档**：某道门失败一次 → 该环节下一轮加深；出现停滞信号 → 直接进脱困。
- **降档**：连续两圈干净通过 → 收回多余仪式。
- 上不封顶下有底线：无论怎么降档，机械门与证据收据不可省。

## 方法环总览（L2）

```
澄清 Clarify ──歧义 ≤ 0.2──▶ 结晶 Seed（不可变）
      ▲                          │
      │ reseed（需求真变了）        ▼
      │                     执行 Build（基线优先）
      │                          │
      └── 漂移 > 0.3 ◀── 验证 Verify（三级评估门）
                                 │
              未全过 ──▶ 进化 Evolve（loop 裁决 → 下一圈 / 脱困 / 到限上报）
                                 │
              全过 + 无漂移 ──▶ 反熵清退 → 收据 → 复盘 Retro
```

## 方法文件总索引

全部在本技能目录 `methods/` 下，**只加载最小需要**：

| 文件 | 内容 | 何时读 |
|---|---|---|
| `personas.md` | 九人格 + 派发即用提示词 + 无子代理回退协议 | 派评审/脱困/访谈子代理前 |
| `clarify.md` | 苏格拉底访谈、歧义门、Seed 结晶 | L2 开工前；`helix seed` |
| `templates.md` | Seed 模板库（bugfix/feature/refactor/migration） | 结晶 Seed 时快速起步 |
| `grill.md` | 压力测试协议 + 文档评审提示词 | `helix grill`、审问计划 |
| `brownfield.md` | 棕地考古四步 + 术语表 | 已有代码库上的 L2 且 context 不清 |
| `build.md` | 基线优先、TDD 路由、调试五步、派发原则 | 每个 L1/L2 执行前；遇 bug |
| `plan.md` | 计划编写与分批执行 | 跨会话/需审批/多实现者的 L2 |
| `tdd.md` | strict TDD 协议 + 测试反模式 | TDD 路由命中；写/改测试 |
| `debugging.md` | 根因追溯、二分、flaky、二击规则 | 五步调试不够用时 |
| `subagents.md` | 实现者提示词 + 两阶段评审 + 回收 | 派实现/评审子代理 |
| `git.md` | worktree、收尾提交、破坏性红线 | 分支/提交/收尾 |
| `verify.md` | 三级评估门、漂移门、证据收据 | 宣称完成前**必读** |
| `review.md` | 评审请求提示词 + 接收评审纪律 | `helix review`、处理评审反馈 |
| `evolve.md` | 循环裁决、脱困、journal、ADR、反熵 | 验证未全过；卡住；跨会话 |
| `retro.md` | 复盘四问 + 学习账本 | `helix retro`；环收敛后 |

## 口令表

| 口令 | 动作 |
|---|---|
| `helix: <任务>` | 显式进环，从分级开始 |
| `helix seed` / "先出规格" | 只澄清结晶，不执行 |
| `helix grill` / "审问这个计划" | 压力测试（`methods/grill.md`） |
| `helix plan` | 写实现计划（`methods/plan.md`） |
| `helix review` | 派独立代码评审（`methods/review.md`） |
| `helix unstuck` / "卡住了" | 停滞诊断 + 五视角脱困 |
| `helix status` | 读 `.helix/journal.md` 汇报圈状态 |
| `helix retro` | 复盘并记学习账本 |
| `helix adr` | 记一条架构决策 |

## 文件必要性门（Doc Necessity Gate）

- **L0/L1 一律不创建文件**；迷你 Seed 与评估结论只出现在回复里。
- 仅 **L2 且（跨会话 / 需审批 / 多圈）** 创建 `.helix/`：`seed.md`（不可变，reseed 归档旧版）、`plan.md`、`journal.md`（append-only）、`decisions.md`、`learnings.md`、`calibration.jsonl`（校准账本）。项目已有 ADR/文档体系时并入项目的，不另立。
- 机械性改动不写文档：commit message 与代码即记录。

## 快路径守则（所有级别通用）

1. 用户与项目规则优先于 Helix。
2. bug/回归/意外行为：先读 `methods/build.md` 调试节——**先根因，后修复**。
3. 宣称"完成/修好/通过"前：按 `methods/verify.md` 出证据；L0 允许一句话收据。
4. 非琐碎任务首次可见输出时一句话说明 Helix 如何在约束工作；琐碎任务保持隐形。
5. 工具输出/日志/搜索结果是证据候选，引用取最小片段。
6. L2 的 clarify 阶段回读 `.helix/learnings.md`（存在时）——上个任务的教训是这个任务的起点；账本里记录的门槛校准用 gate 脚本的 `threshold` 参数落地。
7. **汇报纪律**：给用户的最终汇报结论先行（先说成了没成、发现了什么），收据紧随，过程细节最后；完整句子、不堆自造术语；测试挂了原样贴关键输出，不粉饰。
