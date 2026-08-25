// dsh-helix — Cordis plugin for DeepSeek Harness.
// On startup, idempotently syncs the bundled Helix skill into the shared agent
// skills root (~/.agents/skills/helix) where dsh discovers SKILL.md skills.
// It never overwrites a helix skill it did not install itself (marker file).

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-helix';

const MARKER = '.installed-by-dsh-helix';

export async function apply() {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = join(here, 'skill');
  const pkg = JSON.parse(await readFile(join(here, 'package.json'), 'utf8'));
  const target = join(homedir(), '.agents', 'skills', 'helix');
  const markerPath = join(target, MARKER);

  try {
    if (existsSync(target)) {
      if (!existsSync(markerPath)) {
        console.log(`[dsh-helix] ${target} exists but was not installed by this plugin; leaving it untouched.`);
        return;
      }
      const installed = (await readFile(markerPath, 'utf8')).trim();
      // 版本号一致还不够：拷贝中断或用户误删单个文件会留下半损副本，
      // 只查 marker 会让残缺状态被永久保留。所以同时校验关键结构完整。
      const intact = existsSync(join(target, 'SKILL.md')) &&
        existsSync(join(target, 'methods')) &&
        existsSync(join(target, 'scripts'));
      if (installed === pkg.version && intact) return; // already current and complete
      if (!intact) console.log('[dsh-helix] existing copy is incomplete; repairing.');
      await rm(target, { recursive: true, force: true });
    }
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { recursive: true });
    await writeFile(markerPath, `${pkg.version}\n`);
    console.log(`[dsh-helix] Helix skill v${pkg.version} synced to ${target}. Restart may be needed for skill discovery.`);
  } catch (error) {
    console.warn(`[dsh-helix] skill sync failed (dsh keeps running): ${error?.message ?? error}`);
    console.warn(`[dsh-helix] manual fallback: cp -r ${source} ${target}`);
  }
}
