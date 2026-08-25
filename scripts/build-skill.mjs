#!/usr/bin/env node
// Generates the cross-host skill pack from the Cindy plugin manuals.
//
//   <plugin>/manual/**            -> skills/helix/methods/*.md
//   <plugin>/manual/core/MANUAL.md -> skills/helix/SKILL.md (+ frontmatter,
//                                     + Cindy-priority notice)
//
// Why: methods/ used to be hand-copied, and hand-copying produced real defects
// (a dead `helix_gate` reference that only existed in the copy, and an effort
// ladder that silently lost its actionable details). The dsh copy — the only
// generated artifact in the repo — was also the only one that never drifted.
//
// Run after ANY manual change, then scripts/sync-dsh.mjs.
// Usage: node scripts/build-skill.mjs [pluginDir] [--check]

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const pluginDir = resolve(process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) ?? join(root, '..', 'helix'));
const manualDir = join(pluginDir, 'manual');
const skillDir = join(root, 'skills', 'helix');
const methodsDir = join(skillDir, 'methods');

const FRONTMATTER = `---
name: helix
description: "Use for disciplined coding and engineering work: clarifying vague requirements, specs and acceptance criteria, implementation plans, baseline-first edits, root-cause debugging, evidence before claiming done, independent code review, non-converging iterations, getting unstuck, checking task progress, long cross-session tasks, retrospectives, ADRs, retiring legacy code. Also on keywords: helix, seed, grill, plan, review, unstuck, status, retro, adr. 工程任务需要纪律时加载：澄清需求、出规格、写计划、修 bug 找根因、完成前验证、请人评审、迭代不收敛、脱困、查进展、长任务续航、复盘、记录架构决策。"
---
`;

const CINDY_NOTICE = `
> 若当前宿主是 Cindy 且已装入 \`helix\` 插件（工具列表里有 \`ghost_call\`，且花名册有 helix），优先使用插件（\`ghost_manual\` / \`helix_gate\` 工具），本技能是它的跨宿主等价物，不要两边重复走流程。
`;

// A→B rewrite rules. Order matters: the ghost_call rule must run before the
// bare-filename rule so tool arguments are not mangled.
function convert(text) {
  return text
    // placeholder forms first (they do not match the concrete-path rules below)
    .replace(/路径均相对 `[a-z]+\/`，用 `ghost_manual\(\{ ghost_id: "helix", path: "[a-z]+\/<文件>" \}\)` 读取。/g,
      '全部位于本技能目录的 `methods/` 下，直接读文件。')
    .replace(/读取方式：`ghost_manual\(\{ ghost_id: "helix", path: "<上表路径>" \}\)`。/g,
      '读取方式：直接读本技能目录 `methods/` 下的对应文件。')
    // ghost_call(...helix_gate...) -> node scripts/gate.mjs '<args>'
    .replace(/`ghost_call\(\{ ghost_id: "helix", tool: "helix_gate", args: \{ (.*?) \} \}\)`/gs,
      "`node scripts/gate.mjs '{ $1 }'`（脚本在本技能目录下；无 node 时按公式/规则手算，并把每一步写在回复里）")
    // ghost_manual({... "x/MANUAL.md"}) -> `methods/x.md`
    .replace(/`?ghost_manual\(\{ ghost_id: "helix", path: "([a-z]+)\/MANUAL\.md" \}\)`?/g, '`methods/$1.md`')
    // ghost_manual({... "x/deep.md"}) -> `methods/deep.md`
    .replace(/`?ghost_manual\(\{ ghost_id: "helix", path: "[a-z]+\/([a-z]+\.md)" \}\)`?/g, '`methods/$1`')
    // cross-refs: `core/personas.md` -> `methods/personas.md`
    .replace(/`(?:clarify|build|verify|evolve|core)\/((?!MANUAL)[a-z]+\.md)`/g, '`methods/$1`')
    // section refs: `build/MANUAL.md` -> `methods/build.md`
    .replace(/`(clarify|build|verify|evolve)\/MANUAL\.md`/g, '`methods/$1.md`')
    // bare deep-file refs inside a section: `tdd.md` -> `methods/tdd.md`
    .replace(/`(plan|tdd|debugging|subagents|git|grill|brownfield|review|retro|personas|templates|domains|routing)\.md`/g, '`methods/$1.md`')
    // `.helix/plan.md` is a project data file, not a method — undo the rewrite
    .replace(/`\.helix\/methods\//g, '`.helix/')
    .replace(/、`methods\/plan\.md`、`journal\.md`/g, '、`plan.md`、`journal.md`')
    .replace(/methods\/methods\//g, 'methods/')
    // host-specific wording
    .replace(/用 `helix_gate` 的 `threshold` 参数落地/g, '用 gate 脚本的 `threshold` 参数落地')
    // host-specific wording
    .replace(/用插件工具做确定性计算（不要心算）：/g, '用随包脚本做确定性计算（不要心算）：')
    .replace(/已按 `core\/MANUAL\.md` 分级为 L2/g, '已按 `SKILL.md` 总路由分级为 L2')
    .replace(/`helix_gate` 的 `triage` 模式/g, 'gate 脚本的 `triage` 模式')
    .replace(/传给 `helix_gate` 即生效/g, '传给 gate 脚本即生效');
}

// Standalone-only additions that have no source in the plugin manuals.
// Declared here so they are explicit rather than accidental hand-edits.
const STANDALONE_ONLY = {
  'verify.md': [{
    after: '- 任何一项红 → 不进下一门，回 `build`（bug 走系统化调试）。',
    add: '\n- 本技能的脚本可代跑并汇总：`node scripts/gate.mjs \'{ mode: "evidence", commands: [{ cmd: "npm test", scope: "target" }, { cmd: "npm run lint", scope: "other" }] }\'`，输出可直接喂给 receipt 定级。'
  }]
};

// Whole paragraphs that must read differently on the standalone side (the two
// hosts genuinely differ). Declared as replacements so they can never silently
// regress to the plugin wording the way a hand-copy would.
const SKILL_OVERRIDES = [
  {
    from: '**零配置原则**：Helix 不需要任何额外 LLM 设置。量化门槛（歧义/漂移/循环裁决）由当前 Agent 自评后交 `helix_gate` 工具确定性计算；多模型共识改为同宿主多人格子代理；持久化只用项目内纯文本。没有 API key、守护进程、Python 依赖。',
    to: '**零配置原则**：Helix 不需要任何额外 LLM 设置、API key、守护进程。量化门槛（歧义/漂移/循环裁决）用本技能目录下的 `scripts/gate.mjs` 确定性计算（`node scripts/gate.mjs \'<args JSON>\'`）；宿主没有 node 时按方法文件里的公式手算并展示算式。多模型共识改为同宿主多人格子代理（无子代理设施时串行自演，见 `methods/personas.md`）。持久化只用项目内纯文本 `.helix/`。'
  },
  { from: '## 努力度阶梯（成本感知路由，零配置版）', to: '## 努力度阶梯（成本感知路由）' },
  { from: '## 手册总索引\n\n主文件一层直达；深读文件按触发条件加载，**只载最小需要**：', to: '## 方法文件总索引\n\n全部在本技能目录 `methods/` 下，**只加载最小需要**：' }
];

const outputs = new Map();

// methods/*.md from every manual file
for (const section of await readdir(manualDir)) {
  for (const file of await readdir(join(manualDir, section))) {
    if (!file.endsWith('.md')) continue;
    const src = await readFile(join(manualDir, section, file), 'utf8');
    if (file === 'MANUAL.md') {
      if (section === 'core') continue; // becomes SKILL.md below
      outputs.set(join(methodsDir, `${section}.md`), convert(src));
    } else {
      outputs.set(join(methodsDir, file), convert(src));
    }
  }
}

// SKILL.md from core/MANUAL.md
const coreSrc = await readFile(join(manualDir, 'core', 'MANUAL.md'), 'utf8');
let skill = convert(coreSrc)
  .replace(/`core\/(personas|domains|routing)\.md`/g, '`methods/$1.md`')
  .replace(/读取方式：`methods\//g, '读取方式：直接读本技能目录下的 `methods/')
  // command table: drop the Cindy-only $helix invocation
  .replace(/`helix: <任务>` \/ `\$helix <任务>`/g, '`helix: <任务>`');
// index table lives in the skill dir, so the methods/ prefix is redundant noise
skill = skill.replace(/^\| `methods\/([a-z]+\.md)` \|/gm, '| `$1` |');
for (const o of SKILL_OVERRIDES) {
  if (!skill.includes(o.from)) throw new Error(`SKILL_OVERRIDES 锚点失效（插件源已改？）: ${o.from.slice(0, 50)}`);
  skill = skill.replace(o.from, o.to);
}
// insert the Cindy-priority notice right after the H1
skill = skill.replace(/^(# [^\n]+\n)/, `$1${CINDY_NOTICE}`);
outputs.set(join(skillDir, 'SKILL.md'), FRONTMATTER + skill);

// apply standalone-only additions
for (const [file, edits] of Object.entries(STANDALONE_ONLY)) {
  const path = join(methodsDir, file);
  let text = outputs.get(path);
  if (text === undefined) throw new Error(`STANDALONE_ONLY targets missing file: ${file}`);
  for (const e of edits) {
    if (!text.includes(e.after)) throw new Error(`STANDALONE_ONLY anchor not found in ${file}: ${e.after.slice(0, 40)}`);
    text = text.replace(e.after, e.after + e.add);
  }
  outputs.set(path, text);
}

// leftover Cindy-specific references are a build error, not a silent copy
const LEAKS = [/ghost_manual/, /ghost_call/, /helix_gate/, /[a-z]+\/MANUAL\.md/];
const problems = [];
for (const [path, text] of outputs) {
  for (const leak of LEAKS) {
    if (leak.test(text) && !(path.endsWith('SKILL.md') && /ghost_call|helix_gate|ghost_manual/.test(text.slice(0, 900)))) {
      problems.push(`${path}: 残留 ${leak}`);
    }
  }
}
if (problems.length) {
  console.error('[build-skill] 转换后仍有 Cindy 专有引用：\n  ' + problems.join('\n  '));
  process.exit(1);
}

if (!existsSync(methodsDir)) await mkdir(methodsDir, { recursive: true });
let changed = 0;
for (const [path, text] of outputs) {
  const before = existsSync(path) ? await readFile(path, 'utf8') : null;
  const normalized = before === null ? null : before.replace(/\r\n/g, '\n');
  if (normalized === text) continue;
  changed++;
  if (checkOnly) console.error(`[build-skill] 与源不同步: ${path}`);
  else await writeFile(path, text, 'utf8');
}
if (checkOnly) {
  console.log(changed ? `[build-skill] ${changed} 个文件与插件源不同步（跑 node scripts/build-skill.mjs 重新生成）` : '[build-skill] 技能包与插件源一致');
  process.exit(changed ? 1 : 0);
}
console.log(`[build-skill] 生成 ${outputs.size} 个文件，其中 ${changed} 个有更新`);
