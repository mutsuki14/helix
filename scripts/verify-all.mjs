#!/usr/bin/env node
// One command that runs the whole verification chain.
//   build-gates -> build-skill --check -> test-gates -> fuzz-gates -> audit-manuals
// Any failure stops the chain with a non-zero exit.
//
// Usage: node scripts/verify-all.mjs [pluginDir]

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pluginArg = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
const extra = pluginArg ? [pluginArg] : [];

const STEPS = [
  ['build-gates.mjs', extra, '生成两个门计算器'],
  ['build-skill.mjs', [...extra, '--check'], '技能包与插件源是否同步'],
  ['sync-dsh.mjs', [], 'dsh 副本'],
  ['test-gates.mjs', extra, '50 条夹具跑两端适配器'],
  ['fuzz-gates.mjs', ['20000'], '2 万次随机输入的不变量'],
  ['audit-manuals.mjs', extra, '手册引用/索引/口令/模式自洽性']
];

let failed = 0;
for (const [script, args, what] of STEPS) {
  process.stdout.write(`\n▶ ${script} — ${what}\n`);
  const r = spawnSync(process.execPath, [join(here, script), ...args], { stdio: 'inherit' });
  if (r.status !== 0) {
    failed++;
    console.error(`\n✗ ${script} 失败（退出码 ${r.status}）——链路中止`);
    break;
  }
}
console.log(failed ? '\n验证链未通过' : '\n✓ 验证链全部通过');
process.exit(failed ? 1 : 0);
