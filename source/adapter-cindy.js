// Cindy plugin adapter — appended to gate-core.js by scripts/build-gates.mjs.
// Owns only the host protocol: receive tool-call, reply tool-result.

cindy.onHostMessage(async function (msg) {
  if (msg.type !== 'tool-call' || msg.tool !== 'helix_gate') return;
  const verdict = decide(msg.args || {}, { thresholdHint: '给 helix_gate 传 ' });
  await cindy.send(verdict.ok
    ? { type: 'tool-result', callId: msg.callId, ok: true, result: verdict.result }
    : { type: 'tool-result', callId: msg.callId, ok: false, error: { code: 'INVALID_ARGS', message: verdict.error } });
});
