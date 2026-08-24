# 维护约定 / Maintenance Convention

Helix 以三种形态分发，**任何内容更新必须三处同步**，版本号保持一致：

| 形态 | 位置 | 更新动作 |
|---|---|---|
| Cindy 插件源码 | [mutsuki14/cindy-plugins](https://github.com/mutsuki14/cindy-plugins) 的 `helix/` | bump `ghost.json` version → `ghost_forge_pack` 重新打包装入 |
| 跨宿主技能包 | 本仓库 `skills/helix/` | 同步 `SKILL.md` / `methods/` / `scripts/gate.mjs`，bump `.claude-plugin/plugin.json` version |
| 已装入实例 | 用户各宿主 | Cindy 走更新确认框；技能目录重新拷贝 |

内容转换规则（Cindy 手册 → 本仓库 methods/）：

- `ghost_manual({ ghost_id: "helix", path: "X/MANUAL.md" })` → 直接读 `methods/X.md`
- `ghost_call({ ..., tool: "helix_gate", args: ... })` → `node scripts/gate.mjs '<args>'`
- 门槛/裁决逻辑改动必须**双端同改**（插件 `main.js` 与本仓库 `gate.mjs`）并各自跑测试用例

English summary: Helix ships in three forms (Cindy plugin, this cross-host skill pack, installed instances). Every content update must sync all of them with matching version numbers; gate-logic changes must land in both `main.js` (plugin) and `scripts/gate.mjs` (here), each with tests.
