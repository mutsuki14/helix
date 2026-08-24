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

> 克隆 https://github.com/mutsuki14/helix，识别你所在的 Agent 宿主，把 `skills/helix` 文件夹装到该宿主发现技能的位置（或把 SKILL.md 接入我的全局 Agent 指令），装完告诉我装到了哪里。

**Cindy** —— 请改用 [mutsuki14/cindy-plugins](https://github.com/mutsuki14/cindy-plugins) 里的插件版（同一套方法论，原生 `ghost_manual`/`helix_gate` 集成）。同一宿主不要两个都装。

## 使用

直接布置工程任务即可，技能按描述自动触发。显式口令：`helix: <任务>`、`helix seed`、`helix grill`（审问计划）、`helix plan`、`helix review`、`helix unstuck`、`helix status`、`helix retro`、`helix adr`。

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
