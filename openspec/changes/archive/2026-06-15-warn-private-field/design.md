## Context

`create-skillet` runs against an existing repository whose `package.json` may already contain `"private": true` — a common marker in monorepos, internal packages, and forked repos. When present, `npm publish` fails immediately with "This package has been marked as private." The wizard currently reads `name`, `version`, `author`, `description`, and `skillet.skillDir` from an existing `package.json` but ignores `private`. The completion block unconditionally prints `npm publish` as the recommended next step regardless of whether publishing is actually possible.

The change touches four files: `detect.ts` (types + detection), `prompts.ts` (new conditional prompt + updated `WizardConfig`), `scaffold.ts` (new `npm pkg delete private` call), and `run.ts` (updated early-gate summary and completion block). No external dependencies are added.

## Goals / Non-Goals

**Goals:**
- Detect `"private": true` during environment detection and expose `isPrivate: boolean` on `DetectionResult`
- Surface the detected `private` flag in the early-gate confirmation summary
- Prompt the user to resolve the flag during the prompts phase
- Remove `"private": true` via `npm pkg delete private` when the user consents
- Conditionally suppress `npm publish` from the completion block when the user did not consent to removal
- Cover all new behaviors with unit/integration tests (TDD: tests written before implementation)

**Non-Goals:**
- Setting or adding `"private": true` to a `package.json` that does not already have it
- Any change to `packages/core`, `publish-preview.ts`, `skill-dir.ts`, the multi-skill branching path, or `packages/create/src/scaffold-files-allowlist.ts`
- Adding a new `npm publish` validation step at publish time
- Handling `"private": false` (that is the default and requires no special treatment)

## Decisions

### Decision: Prompt to remove rather than warn-only or auto-remove

**Chosen**: Ask the user whether to remove `"private": true` and act on the answer.

**Alternatives considered**:
- *Warn-only* (print a notice, do nothing): does not resolve the problem; the user still has to remember to run `npm pkg delete private` manually.
- *Auto-remove silently*: removes without consent; users who have `"private": true` intentionally for non-publish use-cases would be surprised.
- *Prompt + resolve*: respects user intent and fixes the problem in-wizard for users who want it fixed. Preferred.

### Decision: `removePrivate` boolean on `WizardConfig`

The prompt answer needs to flow from `prompts.ts` → `scaffold.ts`. Adding `removePrivate: boolean` to `WizardConfig` keeps the same data-flow pattern used for all other wizard fields. Defaulting to `false` when `isPrivate` is `false` means downstream code can always read `config.removePrivate` unconditionally.

### Decision: Place the `private` prompt after metadata prompts, before the skill-dir prompt

This keeps it adjacent to other package-level decisions (name, version, author…). Inserting it after `license` and before the skill-content-path prompt or the multi-skill branch is the least surprising position.

### Decision: Suppress `npm publish` in completion block rather than add a warning alongside it

When the user explicitly declined to remove `"private": true`, printing `npm publish` with an asterisk or side-note invites confusion. Replacing the line with an actionable remediation (`npm pkg delete private`) is cleaner and eliminates ambiguity.

### Decision: `isPrivate` on `DetectionResult` defaults to `false` when no `package.json` exists

When `hasPackageJson` is `false`, `"private"` cannot be `true` by definition. Defaulting to `false` avoids nullable type complexity and prevents any conditional prompt from appearing in the new-project path.

## Risks / Trade-offs

- [Risk] User sets `"private": true` deliberately (e.g., to mark a dev branch) and the wizard removes it without them noticing → Mitigation: the prompt is explicit ("remove it so you can publish?") and defaults to `true` (remove), so the user must actively answer or accept. The completion block also does not silently revert: if they said "yes" the flag is gone; if they said "no" they see the remediation note.
- [Risk] `npm pkg delete private` fails on some npm versions → Mitigation: `runSync` already throws and exits with code 1 on non-zero exit; the same error path used by all other scaffold steps applies here.
- [Risk] The early-gate summary grows a new line, potentially exceeding terminal width on narrow terminals → Mitigation: the line format mirrors existing lines (`private:       true ⚠  (cannot publish until removed)`) and is conditionally printed only when `isPrivate` is true, so the common path is unaffected.
