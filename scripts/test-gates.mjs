#!/usr/bin/env node
// One fixture table, run against BOTH generated calculators.
//
// This is the regression net that the hand-synced era lacked: every fixture
// executes through the real Cindy adapter (stubbed host) and the real CLI
// adapter (child process), and the two must agree except for the wording
// differences declared in INTENTIONAL_DIFFS.
//
// Usage: node scripts/test-gates.mjs [pluginDir]   (default: ../helix)

import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginDir = resolve(process.argv[2] ?? join(root, '..', 'helix'));
const GATE = join(root, 'skills', 'helix', 'scripts', 'gate.mjs');
const MAIN = join(pluginDir, 'main.js');

// Host-adaptation differences that are correct by design.
const INTENTIONAL_DIFFS = [
  { why: 'CLI 额外实现 evidence 模式，模式列表因此更长', when: (r) => typeof r.__err === 'string' && r.__err.startsWith('mode 必须是') },
  { why: 'calibrate 建议里的宿主称谓（给 helix_gate 传 / 传）', when: (r) => r.gate === 'calibrate' && typeof r.recommendation === 'string' && r.recommendation.includes('threshold:') }
];

const T = (name, args, expect) => ({ name, args, expect });
const base = { cross_module: false, contract_change: false, shared_code: false, cross_session: false, high_risk: false, multi_step: false, ambiguity_guess: 0.05 };
const okChecks = [
  { name: 't', exit_code: 0, fresh: true, scope: 'target' },
  { name: 'r', exit_code: 0, fresh: true, scope: 'regression' }
];

const FIXTURES = [
  T('amb greenfield', { mode: 'ambiguity', goal: 0.9, constraints: 0.7, success: 0.8 }, (r) => r.score === 0.19 && r.pass === true),
  T('amb brownfield', { mode: 'ambiguity', goal: 0.9, constraints: 0.7, success: 0.8, brownfield: true, context: 0.85 }, (r) => r.score === 0.185 && r.pass === true),
  T('amb boundary exact 0.2', { mode: 'ambiguity', goal: 0.8, constraints: 0.8, success: 0.8 }, (r) => r.score === 0.2 && r.pass === true),
  T('amb tighten 0.15 fails', { mode: 'ambiguity', goal: 0.9, constraints: 0.8, success: 0.8, threshold: 0.15 }, (r) => r.pass === false && r.tightened === true),
  T('amb threshold=default not tightened', { mode: 'ambiguity', goal: 0.9, constraints: 0.9, success: 0.9, threshold: 0.2 }, (r) => r.tightened === false),
  T('amb loosen rejected', { mode: 'ambiguity', goal: 0.9, constraints: 0.9, success: 0.9, threshold: 0.5 }, (r) => /只能收紧/.test(r.__err)),
  T('amb below min rejected', { mode: 'ambiguity', goal: 1, constraints: 1, success: 1, threshold: 0.01 }, (r) => /只能收紧/.test(r.__err)),
  T('amb missing dim', { mode: 'ambiguity', goal: 0.9, constraints: 0.7 }, (r) => /success/.test(r.__err)),
  T('amb brownfield missing context', { mode: 'ambiguity', goal: 0.9, constraints: 0.7, success: 0.8, brownfield: true }, (r) => /context/.test(r.__err)),

  T('drift pass', { mode: 'drift', goal: 0.1, constraints: 0, ontology: 0.2 }, (r) => r.score === 0.09 && r.pass === true),
  T('drift exact 0.3', { mode: 'drift', goal: 0.3, constraints: 0.3, ontology: 0.3 }, (r) => r.score === 0.3 && r.pass === true),
  T('drift tightened 0.1', { mode: 'drift', goal: 0.1, constraints: 0, ontology: 0.2, threshold: 0.1 }, (r) => r.pass === true && r.tightened === true),
  T('drift loosen rejected', { mode: 'drift', goal: 0.1, constraints: 0, ontology: 0.2, threshold: 0.9 }, (r) => /只能收紧/.test(r.__err)),

  T('loop converged', { mode: 'loop', ac_total: 4, ac_passed_history: [2, 4] }, (r) => r.verdict === 'converged'),
  T('loop continue', { mode: 'loop', ac_total: 4, ac_passed_history: [1, 3] }, (r) => r.verdict === 'continue'),
  T('loop no progress', { mode: 'loop', ac_total: 4, ac_passed_history: [2, 2] }, (r) => r.verdict === 'unstuck'),
  T('loop diminishing returns', { mode: 'loop', ac_total: 10, ac_passed_history: [2, 3] }, (r) => r.verdict === 'unstuck' && /收益递减/.test(r.reason)),
  T('loop first loop', { mode: 'loop', ac_total: 4, ac_passed_history: [1] }, (r) => r.verdict === 'continue'),
  T('loop cap reached', { mode: 'loop', ac_total: 6, ac_passed_history: [1, 2, 3, 4, 5] }, (r) => r.verdict === 'cap-reached'),
  T('loop max_loops=1', { mode: 'loop', ac_total: 5, ac_passed_history: [1], max_loops: 1 }, (r) => r.verdict === 'cap-reached'),
  T('loop spinning flag', { mode: 'loop', ac_total: 4, ac_passed_history: [1, 2], repeated_same_error: true }, (r) => r.verdict === 'unstuck'),
  T('loop converged beats spin flag', { mode: 'loop', ac_total: 4, ac_passed_history: [1, 4], repeated_same_error: true }, (r) => r.verdict === 'converged'),
  T('loop zero progress from zero', { mode: 'loop', ac_total: 5, ac_passed_history: [0, 0] }, (r) => r.verdict === 'unstuck'),
  T('loop bad total', { mode: 'loop', ac_total: 0, ac_passed_history: [0] }, (r) => /ac_total/.test(r.__err)),
  T('loop history exceeds total', { mode: 'loop', ac_total: 4, ac_passed_history: [9] }, (r) => /ac_passed_history/.test(r.__err)),

  T('receipt A', { mode: 'receipt', checks: okChecks, uncovered: [] }, (r) => r.grade === 'A' && r.claim_allowed === true),
  T('receipt A without uncovered key', { mode: 'receipt', checks: okChecks }, (r) => r.grade === 'A'),
  T('receipt B uncovered', { mode: 'receipt', checks: okChecks, uncovered: ['并发未验'] }, (r) => r.grade === 'B'),
  T('receipt B no regression', { mode: 'receipt', checks: [okChecks[0]] }, (r) => r.grade === 'B'),
  T('receipt C failed', { mode: 'receipt', checks: [{ name: 't', exit_code: 1, fresh: true, scope: 'target' }] }, (r) => r.grade === 'C' && r.claim_allowed === false),
  T('receipt C stale', { mode: 'receipt', checks: [{ name: 't', exit_code: 0, fresh: false, scope: 'target' }] }, (r) => r.grade === 'C'),
  T('receipt C no target', { mode: 'receipt', checks: [{ name: 'lint', exit_code: 0, fresh: true, scope: 'other' }] }, (r) => r.grade === 'C'),
  // 回归：uncovered 传成字符串曾把 B 抬成 A
  T('receipt rejects string uncovered', { mode: 'receipt', checks: okChecks, uncovered: '并发未验' }, (r) => /必须是字符串数组/.test(r.__err)),
  T('receipt rejects non-string item', { mode: 'receipt', checks: okChecks, uncovered: ['ok', 42] }, (r) => /必须是字符串数组/.test(r.__err)),
  // 回归：evidence 标记的未跑完检查不得被当作通过
  T('receipt C on incomplete check', { mode: 'receipt', checks: [{ name: 't', exit_code: 0, fresh: true, scope: 'target', incomplete: 'timed-out(600s)' }, okChecks[1]] }, (r) => r.grade === 'C' && /未跑完/.test(r.reason)),
  T('receipt bad checks', { mode: 'receipt', checks: [{ name: 't' }] }, (r) => /checks/.test(r.__err)),

  T('triage L0', { mode: 'triage', ...base }, (r) => r.level === 'L0'),
  T('triage L1 multi_step', { mode: 'triage', ...base, multi_step: true }, (r) => r.level === 'L1'),
  T('triage L1 shared-code red line', { mode: 'triage', ...base, shared_code: true }, (r) => r.level === 'L1' && /红线/.test(r.reasons.join())),
  T('triage L1 amb boundary 0.4', { mode: 'triage', ...base, ambiguity_guess: 0.4 }, (r) => r.level === 'L1'),
  T('triage L2 amb above 0.4', { mode: 'triage', ...base, ambiguity_guess: 0.41 }, (r) => r.level === 'L2'),
  T('triage L0 amb boundary 0.1', { mode: 'triage', ...base, ambiguity_guess: 0.1 }, (r) => r.level === 'L0'),
  T('triage L2 contract', { mode: 'triage', ...base, contract_change: true }, (r) => r.level === 'L2'),
  T('triage missing signal', { mode: 'triage', cross_module: true }, (r) => /全部必填/.test(r.__err)),

  T('calibrate empty', { mode: 'calibrate', records: [] }, (r) => r.n === 0 && /样本不足/.test(r.recommendation)),
  T('calibrate tighten advice', { mode: 'calibrate', records: [{ ambiguity: 0.18, loops: 4 }, { ambiguity: 0.15, loops: 3 }, { ambiguity: 0.19, loops: 5 }, { ambiguity: 0.05, loops: 1 }, { ambiguity: 0.08, loops: 1 }] }, (r) => r.high_rework.mean_ambiguity === 0.173 && /收紧为 0\.153/.test(r.recommendation)),
  T('calibrate triage misjudge', { mode: 'calibrate', records: [{ ambiguity: 0.1, loops: 1, level_initial: 'L1', level_final: 'L2' }, { ambiguity: 0.1, loops: 1, level_initial: 'L2', level_final: 'L2' }, { ambiguity: 0.1, loops: 1, level_initial: 'L1', level_final: 'L1' }, { ambiguity: 0.1, loops: 2, level_initial: 'L1', level_final: 'L2' }, { ambiguity: 0.1, loops: 1, level_initial: 'L0', level_final: 'L0' }] }, (r) => r.triage.under_triaged === 2 && /系统性偏低/.test(r.recommendation)),
  T('calibrate bad record', { mode: 'calibrate', records: [{ ambiguity: 2, loops: 1 }] }, (r) => /records/.test(r.__err)),

  T('unknown mode', { mode: 'zzz' }, (r) => /mode 必须是/.test(r.__err)),
  T('empty args', {}, (r) => /mode 必须是/.test(r.__err))
];

// ---- runners -------------------------------------------------------------
let handler;
globalThis.cindy = { onHostMessage: (f) => { handler = f; }, send: async (m) => { globalThis.__last = m; } };
// eslint-disable-next-line no-eval
(0, eval)(await readFile(MAIN, 'utf8'));

const runCindy = async (args) => {
  await handler({ type: 'tool-call', tool: 'helix_gate', callId: 't', args });
  const m = globalThis.__last;
  return m.ok ? m.result : { __err: m.error.message };
};
const runCli = (args) => {
  try {
    return JSON.parse(execFileSync('node', [GATE, JSON.stringify(args)], { encoding: 'utf8' })).result;
  } catch (e) {
    try { return { __err: JSON.parse(e.stdout).error }; } catch { return { __err: `EXEC:${String(e.message).slice(0, 80)}` }; }
  }
};

let pass = 0;
const failures = [];
for (const f of FIXTURES) {
  const a = await runCindy(f.args);
  const b = runCli(f.args);
  const problems = [];
  if (!f.expect(a)) problems.push(`cindy 结果不符预期: ${JSON.stringify(a).slice(0, 160)}`);
  if (!f.expect(b)) problems.push(`cli 结果不符预期: ${JSON.stringify(b).slice(0, 160)}`);
  if (JSON.stringify(a) !== JSON.stringify(b) && !INTENTIONAL_DIFFS.some((d) => d.when(a))) {
    problems.push(`两端不一致:\n    cindy: ${JSON.stringify(a).slice(0, 200)}\n    cli:   ${JSON.stringify(b).slice(0, 200)}`);
  }
  if (problems.length) failures.push(`✗ ${f.name}\n  ${problems.join('\n  ')}`);
  else pass++;
}

console.log(failures.length ? failures.join('\n') : '');
console.log(`${pass}/${FIXTURES.length} 用例通过${failures.length ? `，${failures.length} 失败` : '（两端一致，仅允许声明过的宿主适配差异）'}`);
process.exit(failures.length ? 1 : 0);
