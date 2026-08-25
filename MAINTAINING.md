# 维护约定 / Maintenance Convention

**单一事实源**：`source/` 与 Cindy 插件的 `manual/` 是仅有的两处手写内容；技能包、dsh 副本、两个门计算器全部是**生成物**。

```
source/gate-core.js ──build-gates──┬─> skills/helix/scripts/gate.mjs   (CLI 适配器)
  + adapter-*.js                   └─> <plugin>/main.js                (Cindy 适配器)

<plugin>/manual/**  ──build-skill──> skills/helix/{SKILL.md, methods/*.md}

skills/helix/       ──sync-dsh────> integrations/dsh/skill/
```

## 改动后必跑（顺序固定）

```bash
node scripts/verify-all.mjs      # 一条命令跑完整链：build-gates → build-skill --check
                                 # → sync-dsh → test-gates(50 夹具双端)
                                 # → fuzz-gates(2 万随机输入+关键分支覆盖守卫)
                                 # → audit-manuals(手册引用/索引/口令/模式自洽)
```

单步脚本也可独立运行（build-gates / build-skill / sync-dsh / test-gates / fuzz-gates / audit-manuals）。
`build-skill.mjs --check` 只校验不写盘；`fuzz-gates.mjs 200000 --coverage` 可放大规模并打印分支覆盖。
脚本默认插件目录为 `../helix`，可传参覆盖：`node scripts/verify-all.mjs /path/to/plugin`。

## 版本号（四处必须一致）

| 位置 | 形态 | 更新动作 |
|---|---|---|
| `<plugin>/ghost.json` | Cindy 插件 | bump 后 `ghost_forge_pack` 重新打包 |
| `.claude-plugin/plugin.json` | 跨宿主技能包 | bump |
| `integrations/dsh/package.json` | dsh 插件 | bump（`skill/` 由 sync-dsh 生成） |
| 已装入实例 | 用户各宿主 | Cindy 走更新确认框；技能目录重新拷贝；dsh 走 `dsh plugin update` |

同时 [mutsuki14/cindy-plugins](https://github.com/mutsuki14/cindy-plugins) 的 `helix/` 是插件源码的分发镜像，改完一并同步。

## 红线

- **不要手改任何生成物**：`skills/helix/**`、`integrations/dsh/skill/**`、两个门计算器，文件头都写着 GENERATED。手改会被下次构建覆盖，而且正是历史上漂移的来源——一个只存在于副本里的死引用、一份被悄悄削短的努力度阶梯，都是手工搬运的产物。
- 宿主间必然不同的措辞写进 `build-skill.mjs` 的 `SKILL_OVERRIDES` / `STANDALONE_ONLY`，**不要**在生成物里手写：锚点失效时构建会直接报错，手写则会静默退化。
- `evidence` 模式是 CLI 独有能力（Cindy 沙箱不能起 shell 子进程），登记在 `adapter-cli.mjs`，不进 `gate-core.js`。
- 转换后仍残留 `ghost_manual` / `ghost_call` / `helix_gate` 的，`build-skill.mjs` 直接报错退出，不会生成半成品。

English: `source/` and the plugin's `manual/` are the only hand-written trees. The skill pack, the dsh copy and both gate calculators are generated — never hand-edit them. Run build-gates → build-skill → sync-dsh → test-gates after any change, and keep the four version numbers in lockstep.
