#!/usr/bin/env node
// Manual consistency audit — the "are the docs internally coherent" check that
// the gate tests cannot cover. Verifies, across BOTH the plugin manuals and the
// generated skill pack:
//   1. every referenced method/manual file actually exists
//   2. every existing file is reachable from the router index
//   3. every command in the command table is described somewhere
//   4. gate invocations in prose use modes the implementation really has
//   5. no cross-host leakage (Cindy-only calls inside the standalone pack)
//
// Usage: node scripts/audit-manuals.mjs [pluginDir]

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_MODES } from '../source/gate-core.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginDir = resolve(process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) ?? join(root, '..', 'helix'));
const manualDir = join(pluginDir, 'manual');
const skillDir = join(root, 'skills', 'helix');

const problems = [];
const note = (where, msg) => problems.push(`${where}: ${msg}`);

// ---------- plugin side ----------
const sections = await readdir(manualDir);
const pluginFiles = new Set();   // "core/personas.md"
for (const s of sections) {
  for (const f of await readdir(join(manualDir, s))) {
    if (f.endsWith('.md')) pluginFiles.add(`${s}/${f}`);
  }
}

const pluginText = new Map();
for (const rel of pluginFiles) pluginText.set(rel, await readFile(join(manualDir, rel), 'utf8'));

// 1. referenced paths exist  (`core/personas.md`, ghost_manual path: "x/y.md")
for (const [rel, text] of pluginText) {
  for (const m of text.matchAll(/`(core|clarify|build|verify|evolve)\/([a-zA-Z-]+\.md)`/g)) {
    const target = `${m[1]}/${m[2]}`;
    if (!pluginFiles.has(target)) note(`manual/${rel}`, `引用了不存在的文件 ${target}`);
  }
  for (const m of text.matchAll(/ghost_manual\(\{ ghost_id: "helix", path: "([^"]+)" \}\)/g)) {
    const p = m[1];
    if (p.includes('<')) continue; // placeholder form
    if (!pluginFiles.has(p)) note(`manual/${rel}`, `ghost_manual 指向不存在的文件 ${p}`);
  }
  // 4. gate modes used in prose must exist in the implementation
  for (const m of text.matchAll(/mode: "([a-z]+)"/g)) {
    if (!CORE_MODES.includes(m[1]) && m[1] !== 'evidence') note(`manual/${rel}`, `使用了不存在的 gate 模式 "${m[1]}"`);
  }
}

// 2. every file reachable from the router index
const router = pluginText.get('core/MANUAL.md') ?? '';
for (const rel of pluginFiles) {
  if (rel === 'core/MANUAL.md') continue;
  const base = rel.split('/')[1];
  const section = rel.split('/')[0];
  const named = base === 'MANUAL.md'
    ? new RegExp(`\`${section}/MANUAL\\.md\``).test(router) || new RegExp(`\`${section}\``).test(router)
    : router.includes(base);
  if (!named) note('manual/core/MANUAL.md', `索引未收录 ${rel}（Agent 无从发现）`);
}

// 3. commands in the table are described in some manual
const cmdRe = /^\| `helix ([a-z]+)`/gm;
const commands = [...router.matchAll(cmdRe)].map((m) => m[1]);
const allPluginText = [...pluginText.values()].join('\n');
for (const c of commands) {
  const mentions = (allPluginText.match(new RegExp(`helix ${c}`, 'g')) ?? []).length;
  if (mentions < 2) note('manual', `口令 helix ${c} 只在索引出现 ${mentions} 次，没有任何手册解释它`);
}
// and the discovery surface should name them
const ghost = JSON.parse(await readFile(join(pluginDir, 'ghost.json'), 'utf8'));
for (const c of commands) {
  if (!ghost.whenToUse.toLowerCase().includes(c)) note('ghost.json', `whenToUse 未提及口令 ${c}`);
}

// ---------- skill pack side ----------
const methodFiles = new Set(await readdir(join(skillDir, 'methods')));
const skillText = new Map([['SKILL.md', await readFile(join(skillDir, 'SKILL.md'), 'utf8')]]);
for (const f of methodFiles) skillText.set(`methods/${f}`, await readFile(join(skillDir, 'methods', f), 'utf8'));

for (const [rel, text] of skillText) {
  for (const m of text.matchAll(/`methods\/([a-zA-Z-]+\.md)`/g)) {
    if (!methodFiles.has(m[1])) note(`skills/${rel}`, `引用了不存在的方法文件 methods/${m[1]}`);
  }
  // 5. cross-host leakage (the Cindy-priority notice in SKILL.md is expected)
  const body = rel === 'SKILL.md' ? text.slice(text.indexOf('## 权威边界')) : text;
  for (const bad of ['ghost_manual(', 'ghost_call(', 'helix_gate']) {
    if (body.includes(bad)) note(`skills/${rel}`, `残留 Cindy 专有引用 ${bad}`);
  }
  for (const m of text.matchAll(/mode: "([a-z]+)"/g)) {
    if (!CORE_MODES.includes(m[1]) && m[1] !== 'evidence') note(`skills/${rel}`, `使用了不存在的 gate 模式 "${m[1]}"`);
  }
}
// scripts referenced by the skill must ship with it
for (const [rel, text] of skillText) {
  for (const m of text.matchAll(/node (scripts\/[a-z-]+\.mjs)/g)) {
    if (!existsSync(join(skillDir, m[1]))) note(`skills/${rel}`, `引用了未随包的脚本 ${m[1]}`);
  }
}

// every plugin manual has a counterpart in the skill pack
for (const rel of pluginFiles) {
  const [section, base] = rel.split('/');
  const expected = base === 'MANUAL.md' ? (section === 'core' ? 'SKILL.md' : `methods/${section}.md`) : `methods/${base}`;
  if (!skillText.has(expected)) note('skills/helix', `插件手册 ${rel} 在技能包中没有对应产物（应为 ${expected}）`);
}

console.log(problems.length ? problems.map((p) => `✗ ${p}`).join('\n') : '');
console.log(problems.length
  ? `手册自洽性审计：${problems.length} 处问题`
  : `手册自洽性审计通过（插件 ${pluginFiles.size} 份 / 技能包 ${skillText.size} 份，引用、索引、口令、gate 模式、跨宿主纯净度全部一致）`);
process.exit(problems.length ? 1 : 0);
