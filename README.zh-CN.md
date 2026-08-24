# Helix 方法环

<p align="center">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

给 AI 编码 Agent 的**零配置工程方法包**——支持 Claude Code、Codex CLI、OpenCode、Pi、OMP 以及任何能读技能文件的 Agent。没有 API key、守护进程、Python 依赖，不需要任何额外 LLM 设置：所有量化门槛由随包零依赖 Node 脚本确定性计算（无 node 时 Agent 按公式手算并展示算式）。

Helix 融合三条血统的长处并补齐它们的缺口：

- **盾**（Aegis / Superpowers 系）：基线优先、先证据后完成的收据、系统化根因调试、计划文档、两阶段子代理评审、测试反模式、git 纪律。
- **环**（Ouroboros 系）：苏格拉底澄清 → 量化歧义门（≤0.2）→ 不可变 Seed 规格 → 三级评估门 → 漂移门（≤0.3）→ 带确定性收敛/停滞裁决与硬圈数上限的进化循环。
- **自有**：按风险配给的努力度阶梯、复盘驱动的只紧不松门槛校准、九个派发即用人格（含无子代理宿主的串行自演回退）、跨会话存活的纯文本账本（`.helix/`）。

形状是螺旋：循环闭合，但每一圈必须带着证据上升；琐碎任务根本不进环。

## 安装

技能就是一个文件夹：`skills/helix`（路由 `SKILL.md` + 14 份方法文件 + `scripts/gate.mjs`）。

**Claude Code（插件市场）**

```text
/plugin marketplace add mutsuki14/helix
/plugin install helix@helix
```

**Claude Code（手动）**

```bash
git clone https://github.com/mutsuki14/helix.git
cp -r helix/skills/helix ~/.claude/skills/helix
```

**DeepSeek Harness（dsh）**

```bash
dsh plugin --profile <your-profile> add "github:mutsuki14/helix#main&path:integrations/dsh"
```

随包 Cordis 插件会在启动时把技能幂等同步到 `~/.agents/skills/helix`（细节见 [integrations/dsh](./integrations/dsh)）。dsh 原生读共享技能根，下面的直接复制方式同样有效。

**Codex CLI / OpenCode / 使用共享技能根的宿主**

```bash
git clone https://github.com/mutsuki14/helix.git
mkdir -p ~/.agents/skills && cp -r helix/skills/helix ~/.agents/skills/helix
```

**Pi、OMP 及其他任意 Agent（不依赖技能发现机制）**

把仓库克隆到任意位置，然后在全局 Agent 指令文件（`AGENTS.md` 或等价物）里加：

```markdown
## Helix 方法环
工程任务（澄清含糊需求、出规格、调试、完成前验证、迭代不收敛）时，
读取并遵循 <克隆路径>/skills/helix/SKILL.md，按需加载 methods/ 下的文件。
```

**通用安装提示词**——把这段话发给任何有能力的 Agent：

> 克隆 https://github.com/mutsuki14/helix， 识别你所在的 Agent 宿主，把 `skills/helix` 文件夹装到该宿主发现技能的位置（或把 SKILL.md 接入我的全局 Agent 指令），装完告诉我装到了哪里。

**Cindy** —— 请改用 [mutsuki14/cindy-plugins](https://github.com/mutsuki14/cindy-plugins) 里的插件版（同一套方法论，原生 `ghost_manual`/`helix_gate` 集成）。同一宿主不要两个都装。

## 使用

直接布置工程任务即可，技能按描述自动触发。

### 显式口令详解

口令只是快捷方式：不喊口令、直接布置工程任务时，Agent 也会按任务风险自动分级路由；自然语言同义表达（如"审问这个计划"、"卡住了"）同样触发。在 Cindy 中用 `$helix` 前缀点名。

| 口令 | 做什么 | 什么时候用 | 你会得到 |
|---|---|---|---|
| `helix: <任务>` | 显式进环：先做 L0/L1/L2 复杂度分级，再按级别走快路径 / 迷你环 / 完整环 | 想强制用完整纪律做一件事 | 分级结论 + 对应流程的推进 |
| `helix seed` | 只澄清不执行：苏格拉底访谈 + 歧义评分门（≤0.2 才过），把共识结晶成不可变 Seed 规格 | 需求还含糊，想先对齐再决定做不做 | Seed：目标 / 非目标 / 约束 / 可验证的验收标准 / 本体 / 停止条件 |
| `helix grill` | 压力测试：以"试图推翻"立场审问既有计划/设计，一次一个问题，追最脆弱假设、被放弃的替代方案、失败爆炸半径 | 动工前想把方案烤透；评审别人给的方案 | 压测结论：存活的方案 + 修正点清单 + 未消除的风险 |
| `helix plan` | 把已结晶的 Seed 拆成可执行计划：任务粒度 2–15 分钟、每个任务带精确文件路径与验证动作、批次即安全检查点 | 跨会话 / 需分批审批 / 要派多个实现者的大任务 | `.helix/plan.md` 计划文档 |
| `helix review` | 派独立评审员（未参与实现）做生产就绪度评审：正确性 / 契约 / 归属 / 复杂度 / 测试 / 安全 | 合并前、高风险改动完成后 | 按 critical/major/minor 分级的发现清单；critical 阻塞合并 |
| `helix unstuck` | 停滞诊断（打转 / 震荡 / 无进展 / 收益递减）+ 五视角脱困：简化者、黑客、反对者、架构师、研究者各给一句诊断 | 同一问题反复修不好、迭代不收敛、没思路 | 五条不同方向的出路 + 选定的新路径 |
| `helix status` | 读 `.helix/journal.md` 账本汇报：AC 通过情况、当前圈数、已验证事实、下一步 | 新会话接续长任务；想知道进展到哪了 | 当前圈状态摘要 |
| `helix retro` | 复盘四问：预测偏差、返工根因、可复用打法、项目地雷；有价值的教训入账 | 一个 L2 任务收尾后；一次代价高昂的失败后 | `.helix/learnings.md` 新增条目（下个任务开工时会被回读） |
| `helix adr` | 记录一条架构决策：背景 / 决定 / 放弃项 / 重审触发器 | 做出改变架构、契约或技术选型的决定时 | `.helix/decisions.md`（或项目已有 ADR 目录）新增一条 |

门槛计算确定性、可审计：

```bash
node skills/helix/scripts/gate.mjs '{ mode: "ambiguity", goal: 0.9, constraints: 0.7, success: 0.8 }'
node skills/helix/scripts/gate.mjs '{ mode: "loop", ac_total: 6, ac_passed_history: [2, 4] }'
```

## 目录

```
skills/helix/
  SKILL.md            路由：L0/L1/L2 分级、努力度阶梯、口令表、文件索引
  methods/            clarify / grill / brownfield / build / plan / tdd / debugging
                      / subagents / git / verify / review / evolve / retro / personas
  scripts/gate.mjs    歧义 / 漂移 / 循环三种门的计算器（零依赖）
```

## 血统与许可

MIT。方法论综合研究自 [Aegis](https://github.com/GanyuanRan/Aegis)（MIT，其本身派生自 [Superpowers](https://github.com/obra/superpowers)）与 [Ouroboros](https://github.com/Q00/ouroboros)（MIT），全部方法文本为原创撰写。用户指令与目标项目规则永远高于 Helix——它是方法建议，不是完成权威。
