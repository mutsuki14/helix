#!/usr/bin/env node
// Regenerates integrations/dsh/skill as a verbatim copy of skills/helix.
// Run after any change to skills/helix (see MAINTAINING.md).
import { cp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'skills', 'helix');
const dst = join(root, 'integrations', 'dsh', 'skill');
await rm(dst, { recursive: true, force: true });
await cp(src, dst, { recursive: true });
console.log('synced skills/helix -> integrations/dsh/skill');
