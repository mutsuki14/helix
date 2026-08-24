# dsh-helix — Helix for DeepSeek Harness

Helix 方法环的 DeepSeek Harness（dsh）插件版。这是一个 config-only + 安装器的最小 bundle：Cordis 插件在 dsh 启动时把随包的 Helix 技能幂等同步到共享技能根 `~/.agents/skills/helix`（dsh 原生发现 SKILL.md 技能的位置），随后一切能力由技能本身提供——零 API key、零守护进程、零额外 LLM 配置。

## 安装

```bash
dsh plugin --profile <your-profile> add "github:mutsuki14/helix#main&path:integrations/dsh"
```

重启 dsh。看到日志 `[dsh-helix] Helix skill v… synced` 即成功；命令面板/技能列表中应出现 `helix`。

嫌插件多余的话，**直接复制技能也完全等价**（dsh 技能契约与 Anthropic SKILL.md 通用）：

```bash
git clone https://github.com/mutsuki14/helix.git
mkdir -p ~/.agents/skills && cp -r helix/skills/helix ~/.agents/skills/helix
```

插件版的唯一增益：随 `dsh plugin update` 升级时自动同步新版技能。

## 行为与安全边界

- 同步是**幂等**的：版本一致时什么都不做。
- 只覆盖**自己安装**的副本（以 `.installed-by-dsh-helix` 标记文件识别版本）；发现你手动安装的 helix 技能时保持不动并打印提示。
- `failOnStartupError: false`：同步失败不影响 dsh 启动，日志给出手动复制命令。
- 卸载：`dsh plugin --profile <profile> remove dsh-helix`，再手动删除 `~/.agents/skills/helix`（插件不做自动删除，避免误伤共享技能根）。

## 维护

`skill/` 目录是 `../../skills/helix` 的构建副本，不要手改——改上游后运行仓库根的 `node scripts/sync-dsh.mjs` 重新生成（见根目录 `MAINTAINING.md`）。

> 注：dsh 发展很快（2026-08 发布），若安装命令行为有变，以 [官方文档](https://deepseek-harness.github.io/deepseek-harness/) 为准；本包无构建步骤、无依赖，Git 安装不需要 allowBuilds。
