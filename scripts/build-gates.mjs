#!/usr/bin/env node
// Generates both gate calculators from source/gate-core.js + adapters.
//
//   source/gate-core.js  ──┬── + adapter-cli.mjs   -> skills/helix/scripts/gate.mjs
//                          └── + adapter-cindy.js  -> <plugin>/main.js
//
// Both outputs are self-contained (no imports): the Cindy sandbox loads a
// single entry file, and gate.mjs must work anywhere it is copied.
// Run after ANY change to source/, then `node scripts/test-gates.mjs`.
//
// Usage: node scripts/build-gates.mjs [pluginDir]   (default: ../helix)

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginDir = resolve(process.argv[2] ?? join(root, '..', 'helix'));

const BANNER = (src) => `// GENERATED FILE — DO NOT EDIT.
// Built from source/gate-core.js + source/${src} by scripts/build-gates.mjs.
// Edit those sources and re-run the build; hand-edits here will be overwritten.
`;

// The core ends with an ESM export used only by the test harness; the
// concatenated outputs must not carry it.
const core = (await readFile(join(root, 'source', 'gate-core.js'), 'utf8'))
  .replace(/\nexport \{[^}]*\};\n?$/, '\n');

const targets = [
  { adapter: 'adapter-cli.mjs', out: join(root, 'skills', 'helix', 'scripts', 'gate.mjs'), shebang: true },
  { adapter: 'adapter-cindy.js', out: join(pluginDir, 'main.js'), shebang: false }
];

for (const t of targets) {
  if (t.out.startsWith(pluginDir) && !existsSync(pluginDir)) {
    console.warn(`[build-gates] plugin dir not found, skipping: ${t.out}`);
    continue;
  }
  const adapter = await readFile(join(root, 'source', t.adapter), 'utf8');
  const body = `${t.shebang ? '#!/usr/bin/env node\n' : ''}${BANNER(t.adapter)}\n${core}\n${adapter}`;
  await writeFile(t.out, body, 'utf8');
  console.log(`[build-gates] wrote ${t.out} (${body.length} bytes)`);
}
