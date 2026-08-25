#!/usr/bin/env node
// Property-based fuzzing for the gate core.
//
// Fixtures (test-gates.mjs) prove known cases stay correct; this proves
// *invariants* hold across randomly generated input — the class of bug
// hand-written cases miss. Runs against source/gate-core.js directly
// (fast, no child processes), since both shipped calculators are generated
// from it and test-gates.mjs already proves the adapters agree.
//
// Usage: node scripts/fuzz-gates.mjs [iterations] [--coverage]
//   --coverage  也报告触达的结果分支，并在关键分支未被触达时失败
//               （通过的模糊测试若没触达安全关键分支，等于没测）

import { decide } from '../source/gate-core.js';

const N = Number(process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) ?? 4000);
const showCoverage = process.argv.includes('--coverage');

// Deterministic PRNG so a failure is reproducible from its seed.
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 0x100000000;
};
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
// Values that historically break naive validation.
const WEIRD = [undefined, null, NaN, Infinity, -Infinity, -0, '', '0.5', [], {}, true, false, 1e-12, 0.1 + 0.2];
// Hostile input matters, but so do the *success* paths — the safety-critical
// invariants (receipt grade A allows claiming done, triage L0 skips the loop)
// only exist there. An earlier revision produced grade A zero times in 4000
// runs, so hostility is deliberately kept low and clarity biased high.
let hostile = 0.06;
const maybeWeird = (v) => (rnd() < hostile ? pick(WEIRD) : v);
const unit = () => maybeWeird(Math.round(rnd() * 100) / 100);
// biased high so ambiguity/drift gates actually pass sometimes
const clearUnit = () => maybeWeird(Math.round((0.55 + rnd() * 0.45) * 100) / 100);
const lowUnit = () => maybeWeird(Math.round(rnd() * 0.35 * 100) / 100);

const outcome = {};
const bump = (k) => { outcome[k] = (outcome[k] || 0) + 1; };
// 这些分支承载安全关键不变量；跑不到就等于没测到
const CRITICAL = ['receipt:A', 'receipt:B', 'receipt:C', 'triage:L0', 'triage:L1', 'triage:L2',
  'loop:converged', 'loop:continue', 'loop:unstuck', 'loop:cap-reached',
  'ambiguity:pass', 'ambiguity:fail', 'drift:pass', 'drift:fail',
  'calibrate:tighten-advice', 'calibrate:triage-bias'];

const failures = [];
const record = (why, args, res) => {
  if (failures.length < 12) failures.push(`✗ ${why}\n    args: ${JSON.stringify(args)}\n    res:  ${JSON.stringify(res)?.slice(0, 240)}`);
};

// ---- invariants every mode must satisfy ---------------------------------
function checkUniversal(args, res) {
  if (typeof res !== 'object' || res === null) return record('返回值不是对象', args, res);
  if (res.ok !== true && res.ok !== false) return record('ok 不是布尔', args, res);
  if (res.ok === false && typeof res.error !== 'string') return record('失败分支 error 不是字符串', args, res);
  if (res.ok === true) {
    if (typeof res.result !== 'object' || res.result === null) return record('成功分支 result 不是对象', args, res);
    if (typeof res.result.gate !== 'string') return record('result 缺 gate 字段', args, res);
    let json;
    try { json = JSON.stringify(res.result); } catch { return record('result 不可 JSON 序列化', args, res); }
    if (json === undefined) return record('result 序列化为 undefined', args, res);
    if (/null|NaN/.test(JSON.stringify(res.result.score ?? 0))) {
      if (Number.isNaN(res.result.score)) return record('score 是 NaN', args, res);
    }
  }
}

const genAmbiguity = () => {
  const u = rnd() < 0.5 ? clearUnit : unit;
  const a = { mode: 'ambiguity', goal: u(), constraints: u(), success: u() };
  if (rnd() < 0.5) { a.brownfield = true; a.context = u(); }
  if (rnd() < 0.4) a.threshold = maybeWeird(Math.round(rnd() * 40) / 100);
  return a;
};
const genDrift = () => {
  const u = rnd() < 0.5 ? lowUnit : unit;
  const a = { mode: 'drift', goal: u(), constraints: u(), ontology: u() };
  if (rnd() < 0.4) a.threshold = maybeWeird(Math.round(rnd() * 50) / 100);
  return a;
};
const genLoop = () => {
  const total = maybeWeird(int(1, 12));
  const len = int(1, 8);
  const cap = typeof total === 'number' ? Math.max(0, total) : 5;
  // 一半生成单调上升的历史：否则 continue/converged 分支覆盖过低
  let hist;
  if (rnd() < 0.5) {
    let v = int(0, Math.max(0, cap - 1));
    hist = Array.from({ length: len }, () => { v = Math.min(cap, v + int(0, 2)); return v; });
  } else {
    hist = Array.from({ length: len }, () => (rnd() < hostile ? pick(WEIRD) : int(0, cap)));
  }
  const a = { mode: 'loop', ac_total: total, ac_passed_history: rnd() < 0.08 ? pick(WEIRD) : hist };
  if (rnd() < 0.3) a.max_loops = maybeWeird(int(1, 12));
  if (rnd() < 0.2) a.repeated_same_error = pick([true, false, 'yes', 1]);
  if (rnd() < 0.2) a.oscillation = pick([true, false, 0]);
  return a;
};
const genReceipt = () => {
  const mk = () => ({
    name: rnd() < 0.06 ? pick(WEIRD) : `c${int(1, 9)}`,
    exit_code: rnd() < 0.1 ? pick(WEIRD) : int(0, 3),
    fresh: rnd() < 0.1 ? pick(WEIRD) : rnd() < 0.75,
    scope: rnd() < 0.1 ? pick(WEIRD) : pick(['target', 'regression', 'other']),
    ...(rnd() < 0.2 ? { incomplete: pick(['timed-out(600s)', 'output-overflow(>32MB)', '', null]) } : {})
  });
  // 半数生成"全绿"检查集：否则 grade A（唯一允许宣称完成的等级）永远测不到
  const clean = () => ({ name: `c${int(1, 9)}`, exit_code: 0, fresh: true, scope: pick(['target', 'regression']) });
  const gen = rnd() < 0.5 ? clean : mk;
  const checks = rnd() < 0.04 ? pick(WEIRD)
    : gen === clean
      ? [{ name: 't', exit_code: 0, fresh: true, scope: 'target' }, ...Array.from({ length: int(0, 3) }, clean)]
      : Array.from({ length: int(1, 4) }, mk);
  const a = { mode: 'receipt', checks };
  if (rnd() < 0.6) a.uncovered = rnd() < 0.12 ? pick(WEIRD) : Array.from({ length: int(0, 3) }, () => `u${int(1, 5)}`);
  return a;
};
const genTriage = () => {
  const b = () => (rnd() < hostile ? pick(WEIRD) : rnd() < 0.22);
  return {
    mode: 'triage', cross_module: b(), contract_change: b(), shared_code: b(),
    cross_session: b(), high_risk: b(), multi_step: b(), ambiguity_guess: rnd() < 0.5 ? lowUnit() : unit()
  };
};
const genCalibrate = () => ({
  mode: 'calibrate',
  records: rnd() < 0.05 ? pick(WEIRD) : Array.from({ length: int(0, 14) }, () => ({
    ambiguity: rnd() < hostile ? pick(WEIRD) : Math.round(rnd() * 25) / 100,
    loops: rnd() < hostile ? pick(WEIRD) : int(1, 6),
    ...(rnd() < 0.6 ? { drift: Math.round(rnd() * 100) / 100 } : {}),
    ...(rnd() < 0.6 ? { level_initial: pick(['L0', 'L1', 'L2', 'L3', '']), level_final: pick(['L0', 'L1', 'L2', 'x']) } : {})
  }))
});

const GENS = [genAmbiguity, genAmbiguity, genDrift, genDrift, genLoop, genLoop,
  genReceipt, genReceipt, genTriage, genTriage, genCalibrate, genCalibrate,
  () => ({ mode: pick(['zzz', '', null, undefined, 42]) }), () => ({})];

for (let i = 0; i < N; i++) {
  const args = pick(GENS)();
  let res;
  try {
    res = decide(args, { thresholdHint: '传 ' });
  } catch (e) {
    record(`抛异常: ${e.message}`, args, null);
    continue;
  }
  checkUniversal(args, res);
  if (!res.ok) { bump('err'); continue; }
  const r = res.result;
  bump(r.gate === 'loop' ? `loop:${r.verdict}`
    : r.gate === 'receipt' ? `receipt:${r.grade}`
    : r.gate === 'triage' ? `triage:${r.level}`
    : (r.gate === 'ambiguity' || r.gate === 'drift') ? `${r.gate}:${r.pass ? 'pass' : 'fail'}${r.tightened ? '+tight' : ''}`
    : `calibrate:${/自评偏乐观/.test(r.recommendation) ? 'tighten-advice'
      : /系统性偏低/.test(r.recommendation) ? 'triage-bias'
      : /表现尚可/.test(r.recommendation) ? 'ok'
      : /本就超标/.test(r.recommendation) ? 'exec-issue' : 'insufficient'}`);

  // --- mode-specific invariants ---
  if (r.gate === 'ambiguity' || r.gate === 'drift') {
    if (typeof r.score !== 'number' || !Number.isFinite(r.score)) record('score 非有限数', args, res);
    if (r.score < -0.001 || r.score > 1.001) record(`score 越界 ${r.score}`, args, res);
    if (r.pass !== (r.score <= r.threshold)) record('pass 与 score/threshold 不自洽', args, res);
    const def = r.gate === 'ambiguity' ? 0.2 : 0.3;
    if (r.threshold > def + 1e-9) record(`门槛被放宽到 ${r.threshold}`, args, res);
    if (r.tightened !== (r.threshold !== def)) record('tightened 标记不自洽', args, res);
  }
  if (r.gate === 'loop') {
    if (!['converged', 'continue', 'unstuck', 'cap-reached'].includes(r.verdict)) record(`未知 verdict ${r.verdict}`, args, res);
    if (r.ac_passed === r.ac_total && r.verdict !== 'converged') record('全通过却未判 converged', args, res);
    if (r.verdict === 'converged' && r.ac_passed !== r.ac_total) record('未全通过却判 converged', args, res);
    if (r.loops_remaining < 0) record('loops_remaining 为负', args, res);
    if (r.verdict === 'continue' && r.loops_remaining === 0) record('无剩余圈数却判 continue', args, res);
  }
  if (r.gate === 'receipt') {
    if (!['A', 'B', 'C'].includes(r.grade)) record(`未知 grade ${r.grade}`, args, res);
    if (r.claim_allowed !== (r.grade !== 'C')) record('claim_allowed 与 grade 不自洽', args, res);
    // 核心安全属性：有失败/不新鲜/未跑完的检查，绝不允许宣称完成
    if ((r.failed.length || r.stale.length || (r.incomplete?.length ?? 0)) && r.claim_allowed) {
      record('存在失败/不新鲜/未跑完检查却允许宣称完成', args, res);
    }
    if (r.grade === 'A' && r.uncovered.length) record('有未覆盖面却判 A', args, res);
    if (!Array.isArray(r.uncovered)) record('uncovered 不是数组', args, res);
  }
  if (r.gate === 'triage') {
    if (!['L0', 'L1', 'L2'].includes(r.level)) record(`未知 level ${r.level}`, args, res);
    if (args.shared_code === true && r.level === 'L0') record('共享代码红线被击穿（判 L0）', args, res);
    if (args.contract_change === true && r.level !== 'L2') record('契约变更未判 L2', args, res);
    if (!Array.isArray(r.reasons) || !r.reasons.length) record('reasons 为空', args, res);
    if (r.level === 'L0' && !/隐形/.test(r.route_line)) record('L0 却给了 Route line', args, res);
  }
  if (r.gate === 'calibrate') {
    if (typeof r.recommendation !== 'string' || !r.recommendation) record('recommendation 为空', args, res);
    if (r.n !== (Array.isArray(args.records) ? args.records.length : -1)) record('n 与输入不符', args, res);
    if (r.triage && r.triage.misjudged !== r.triage.under_triaged + r.triage.over_triaged) record('误判统计不自洽', args, res);
    if (r.triage && r.triage.misjudged > r.triage.with_levels) record('误判数超过样本数', args, res);
    if (/收紧为/.test(r.recommendation)) {
      const m = r.recommendation.match(/收紧为 ([\d.]+)/);
      if (m && Number(m[1]) > 0.2) record(`建议门槛 ${m[1]} 反而放宽`, args, res);
      if (m && Number(m[1]) < 0.05) record(`建议门槛 ${m[1]} 低于下限`, args, res);
    }
  }
}

const missing = CRITICAL.filter((c) => !outcome[c]);
if (showCoverage) {
  console.log('结果分支覆盖:');
  for (const k of Object.keys(outcome).sort()) console.log(`  ${k.padEnd(26)} ${outcome[k]}`);
  console.log('');
}
console.log(failures.length ? failures.join(String.fromCharCode(10)) : '');
console.log(`${N} 次随机输入：${failures.length ? `${failures.length} 类不变量被破坏` : '全部不变量成立'}`);
if (missing.length) console.log(`关键分支未触达（本次结论不可信）: ${missing.join(', ')}`);
else console.log(`${CRITICAL.length} 个关键分支全部触达`);
process.exit(failures.length || missing.length ? 1 : 0);
