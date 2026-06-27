## Why

The openspec-auto explore stage treated issue scope constraints as authoritative product decisions rather than as user input to a product thinking process — leading to PR #120 delivering a UX principle violation because the issue said "no new command" and the agent accepted that as a hard constraint instead of evaluating whether a command was actually the right solution. The root cause is that explore was investigating "what the issue asks for" rather than diagnosing the real problem and evaluating solutions.

## What Changes

- **`prompts/explore.md`** — reframed as a product thinking document, not an issue processor:
  - Goal statement: the issue is a problem description, not a spec; the agent's job is product translation
  - Issue constraints are inputs to weigh, not mandates to follow
  - New "Problem diagnosis" output section: explicit synthesis of how the real problem differs from the issue's framing, what are assumed vs. real constraints
  - New "Solutions considered" output section (≥2 options for features): each evaluated against `docs/ux-principles.md` failure modes and `docs/VISION.md`
  - Scope handling reframed: target the right solution at MVP scope (solves the core problem well, without non-essential scope); if the full right solution is large, propose sequencing (Phase 1, Phase 2) and ask which to start with — never cut scope to an inferior solution that doesn't solve the core problem well
  - Blocking question criteria tightened: diverging from the issue's framing is a product decision, not a blocker; NEEDS_INPUT for scope means "here's how I'd sequence this, which phase first?" not "this is too big"

- **`prompts/proposal-review.md`** — expanded review criteria to verify explore did product work:
  - Problem synthesis: did the discovery go beyond restating the issue? Is there a "how this differs from the issue" note?
  - Solution space: were alternatives documented and evaluated?
  - UX impact: was the chosen approach assessed against `ux-principles.md` failure modes and `VISION.md`?
  - Vision alignment: does the approach reflect "we handle complexity, users provide intent"?

## Capabilities

### New Capabilities

- `openspec-auto-product-thinking`: Requirements for the explore and proposal-review stages of the openspec-auto pipeline to perform and verify principled product thinking — problem diagnosis beyond the issue, solution space evaluation, UX/vision alignment.

### Modified Capabilities

_(none — the existing `auto-issue-agent` spec describes the pipeline structure, which is unchanged)_

## Impact

- `.agents/skills/openspec-auto/prompts/explore.md` — primary change
- `.agents/skills/openspec-auto/prompts/proposal-review.md` — expanded review criteria
- No runtime code changes; all changes are to agent prompt files
