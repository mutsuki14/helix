// CLI adapter — appended to gate-core.js by scripts/build-gates.mjs.
// Owns argv parsing, stdout/exit codes, and the standalone-only `evidence`
// mode (the Cindy sandbox cannot spawn shell commands, so it stays here).

const EXTRA_MODES = ['evidence'];

const fail = (message) => {
  console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
};
const out = (result) => console.log(JSON.stringify({ ok: true, result }, null, 2));

let args;
try {
  // Accept loose JS-object syntax (unquoted keys), matching the manual examples.
  args = new Function(`return (${process.argv[2] ?? '{}'})`)();
} catch {
  fail('无法解析参数：传一个 JSON/JS 对象字面量字符串');
}
if (args === null || typeof args !== 'object' || Array.isArray(args)) {
  fail('参数必须是一个对象字面量，例如 \'{ mode: "drift", goal: 0.1, constraints: 0, ontology: 0.2 }\'');
}

if (args.mode === 'evidence') {
  const { spawnSync } = await import('node:child_process');
  const cmds = args.commands;
  if (!Array.isArray(cmds) || cmds.length < 1 || cmds.length > 8 || cmds.some((c) =>
    !c || typeof c.cmd !== 'string' || !['target', 'regression', 'other'].includes(c.scope))) {
    fail('evidence 模式需要 commands(1–8 项,每项 {cmd: "shell 命令", scope: target|regression|other})');
  }
  const checks = [];
  let anyIncomplete = false;
  const TAIL_LINES = 15;
  const TAIL_CHARS = 2000;
  for (const c of cmds) {
    const started = Date.now();
    // maxBuffer 放宽到 32MB：默认 1MB 会让啰嗦但通过的测试被杀进程、status 变 null、误报成失败。
    const r = spawnSync(c.cmd, { shell: true, encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
    const outText = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    // tail 先截行再截字符：单行超长输出（minified/长堆栈/带 \r 的进度条）否则会把上百万字符灌进上下文。
    let tail = outText.split('\n').slice(-TAIL_LINES).join('\n').trim();
    if (tail.length > TAIL_CHARS) tail = `…[前段已截断，仅留末 ${TAIL_CHARS} 字符]…\n` + tail.slice(-TAIL_CHARS);
    // 进程被杀时拿不到真实退出码：按失败计（fail-closed），但必须显式标注原因，不许伪装成普通失败。
    const incomplete = r.error
      ? (r.error.code === 'ETIMEDOUT' ? 'timed-out(600s)'
        : r.error.code === 'ENOBUFS' ? 'output-overflow(>32MB)'
        : String(r.error.code || r.error.message).slice(0, 60))
      : (typeof r.status !== 'number' ? `killed-by-signal(${r.signal ?? 'unknown'})` : null);
    if (incomplete) anyIncomplete = true;
    checks.push({
      name: c.cmd,
      exit_code: typeof r.status === 'number' ? r.status : 1,
      fresh: true,
      scope: c.scope,
      duration_ms: Date.now() - started,
      output_chars: outText.length,
      ...(incomplete ? { incomplete } : {}),
      tail
    });
  }
  out({
    gate: 'evidence',
    checks,
    ...(anyIncomplete ? { warning: '有检查带 incomplete 标记：进程被杀，exit_code=1 是 fail-closed 的占位值而非真实退出码。不要把它当作"测试真的失败了"——缩小输出（重定向到文件后只读摘要）或提高超时后重跑。' } : {}),
    next: '把 checks（去掉 tail/duration_ms/output_chars）连同 uncovered 一起传给 mode:"receipt" 定级；tail 中的关键行贴进对话作为证据。带 incomplete 的检查先重跑，不要直接拿去定级。'
  });
} else {
  const verdict = decide(args, { thresholdHint: '传 ', extraModes: EXTRA_MODES });
  if (verdict.ok) out(verdict.result);
  else fail(verdict.error);
}
