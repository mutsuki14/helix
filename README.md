# Helix Method Loop

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

A **zero-config engineering method pack** for AI coding agents — Claude Code, Codex CLI, OpenCode, Pi, OMP, and any agent that can read skill files. No API keys, no daemons, no Python runtime, no extra LLM setup: every quantitative gate is computed by a bundled zero-dependency Node script (or by the agent showing its arithmetic).

Helix fuses the strengths of three lineages and closes their gaps:

- **The shield** (Aegis / Superpowers lineage): baseline-first edits, evidence-before-done receipts, systematic root-cause debugging, plans, two-phase subagent review, TDD anti-patterns, git discipline.
- **The loop** (Ouroboros lineage): Socratic clarification → quantified ambiguity gate (≤0.2) → immutable Seed spec → three-tier evaluation → drift gate (≤0.3) → evolution loop with deterministic convergence/stall rulings and a hard loop cap.
- **Its own**: risk-scaled effort ladder, tighten-only threshold calibration fed by retrospectives, nine dispatch-ready personas with a no-subagent fallback, and an append-only plain-text ledger (`.helix/`) that survives session resets.

The result is a spiral: the loop closes, but every turn must rise with evidence. Trivial tasks never enter the loop at all.

## Install

The skill is one folder: `skills/helix` (router `SKILL.md` + 14 method files + `scripts/gate.mjs`).

**Claude Code (plugin marketplace)**

```text
/plugin marketplace add mutsuki14/helix
/plugin install helix@helix
```

**Claude Code (manual)**

```bash
git clone https://github.com/mutsuki14/helix.git
cp -r helix/skills/helix ~/.claude/skills/helix
```

**DeepSeek Harness (dsh)**

```bash
dsh plugin --profile <your-profile> add "github:mutsuki14/helix#main&path:integrations/dsh"
```

The bundled Cordis plugin idempotently syncs the skill into `~/.agents/skills/helix` on startup (details: [integrations/dsh](./integrations/dsh)). Since dsh natively reads the shared skills root, the plain copy below works too.

**Codex CLI / OpenCode / hosts using the shared skills root**

```bash
git clone https://github.com/mutsuki14/helix.git
mkdir -p ~/.agents/skills && cp -r helix/skills/helix ~/.agents/skills/helix
```

**Pi, OMP, and any other agent (no skill discovery needed)**

Clone the repo anywhere, then add this to your global agent instructions file (`AGENTS.md` or equivalent):

```markdown
## Helix Method Loop
For engineering tasks (clarifying vague requirements, specs, debugging,
verification before claiming done, non-converging iterations), read and follow
<path-to-clone>/skills/helix/SKILL.md, loading files under methods/ on demand.
```

**Universal agent prompt** — paste this to any capable agent:

> Clone https://github.com/mutsuki14/helix, detect which agent host you are running in, and install the `skills/helix` folder where this host discovers skills (or wire `SKILL.md` into my global agent instructions). Then confirm what you installed and where.

**Cindy** — use the packaged plugin from [mutsuki14/cindy-plugins](https://github.com/mutsuki14/cindy-plugins) instead (same methodology, native `ghost_manual`/`helix_gate` integration). Don't install both in the same host.

## Use

Just assign engineering work — the skill triggers on its description.

### Explicit commands explained

Commands are shortcuts: without them, the agent still auto-triages engineering tasks by risk; natural-language equivalents ("grill this plan", "I'm stuck") trigger the same routes. Inside Cindy, invoke with the `$helix` prefix.

| Command | What it does | When to use | What you get |
|---|---|---|---|
| `helix: <task>` | Enter the loop explicitly: L0/L1/L2 triage first, then fast path / mini loop / full loop | You want a task done under full discipline | Triage verdict + the corresponding workflow |
| `helix seed` | Clarify only, no execution: Socratic interview + ambiguity gate (must be ≤0.2), then crystallize an immutable Seed spec | Requirements still vague; align before deciding to build | Seed: goal / non-goals / constraints / verifiable acceptance criteria / ontology / stop conditions |
| `helix grill` | Pressure-test an existing plan/design from a "try to refute" stance, one question at a time: weakest assumptions, discarded alternatives, blast radius | Before committing to a plan; reviewing someone else's design | Verdict: what survived + fixes + residual risks |
| `helix plan` | Slice a crystallized Seed into an executable plan: 2–15-minute tasks with exact file paths and verification steps; batches are safe checkpoints | Cross-session work, batch approvals, multiple implementers | A `.helix/plan.md` plan document |
| `helix review` | Dispatch an independent reviewer (not the implementer) for production readiness: correctness / contracts / ownership / complexity / tests / security | Before merging; after high-risk changes | Findings ranked critical/major/minor; critical blocks the merge |
| `helix unstuck` | Stall diagnosis (spinning / oscillation / no progress / diminishing returns) + five-lens escape: simplifier, hacker, dissenter, architect, researcher | Same bug won't die, iterations not converging, out of ideas | Five distinct ways out + the chosen new path |
| `helix status` | Report from the `.helix/journal.md` ledger: AC pass state, current loop, verified facts, next step | Resuming a long task in a new session; checking progress | A current-loop status summary |
| `helix retro` | Four-question retrospective: prediction misses, rework root cause, reusable tactics, project landmines; worthwhile lessons are recorded | After finishing an L2 task; after a costly failure | New entries in `.helix/learnings.md` (re-read at the next task's start) |
| `helix adr` | Record an architecture decision: context / decision / rejected options / re-review trigger | Whenever a decision changes architecture, contracts, or tech choices | A new entry in `.helix/decisions.md` (or the project's own ADR home) |

Gate math is deterministic and auditable:

```bash
node skills/helix/scripts/gate.mjs '{ mode: "ambiguity", goal: 0.9, constraints: 0.7, success: 0.8 }'
node skills/helix/scripts/gate.mjs '{ mode: "loop", ac_total: 6, ac_passed_history: [2, 4] }'
```

## Layout

```
skills/helix/
  SKILL.md            router: L0/L1/L2 triage, effort ladder, command table, file index
  methods/            clarify, grill, brownfield, build, plan, tdd, debugging,
                      subagents, git, verify, review, evolve, retro, personas
  scripts/gate.mjs    ambiguity / drift / loop gate calculator (zero-dependency)
```

Method files are currently written in Chinese; agents handle them natively. English translations welcome via PR.

## Design lineage & license

MIT. Methodology synthesized from studying [Aegis](https://github.com/GanyuanRan/Aegis) (MIT, itself derived from [Superpowers](https://github.com/obra/superpowers)) and [Ouroboros](https://github.com/Q00/ouroboros) (MIT); all method text here is original writing. User instructions and target-project rules always outrank Helix — it is advisory, not a completion authority.
