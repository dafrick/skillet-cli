## Context

`create-skillet` is currently a single-action Commander CLI (the wizard). Its post-wizard publish preview simulates tarball contents by walking the skill directory and flagging entries against `DEFAULT_IGNORE` — the install-time filter — which does not reflect what `npm publish` actually packs. A skill author can unknowingly publish lock files, TypeScript sources, dev configs, or `node_modules` nested inside a skill subdirectory, with no safety net before or during publish.

There is no standalone pre-publish command, and no `prepublishOnly` hook in scaffold-generated packages.

## Goals / Non-Goals

**Goals:**
- `create-skillet check` subcommand using `npm pack --dry-run --json` as the authoritative tarball manifest
- Classification by skill-path membership (Option A) and name-based patterns within skill paths (Option B)
- Interactive `.npmignore` additions with exit-1 abort when updated
- Post-wizard preview replaced by the same logic in read-only mode
- Scaffold wires `create-skillet` as a devDependency and `prepublishOnly: "create-skillet check"` into the generated package

**Non-Goals:**
- Expanding `DEFAULT_IGNORE` (install-time filter — separate change if needed)
- Consolidating `SCAN_SKIP_DIRS` into `DEFAULT_IGNORE` (separate cleanup)
- CI / non-TTY mode for `check` (follow-up)
- `create-skillet update` or other subcommands (future, issue #110)

## Decisions

### 1. `npm pack --dry-run --json` as ground truth (not filesystem walk)

`npm pack` reflects actual tarball contents — honoring `files`, `.npmignore`, and nested-directory npm behavior. Filesystem walk + exclusion simulation always diverges in edge cases (nested `node_modules`, `.npmignore` layering, `files` whitelist interactions).

_Alternative considered_: Simulate with `glob` + `files` + exclusion logic. Rejected: fragile, requires re-implementing npm's algorithm, will be wrong.

### 2. Classification: skill paths (Option A) + name patterns within (Option B)

Items in the tarball are classified by two rules applied in order:

```
1. Is the item under any declared skill path (skillet.skillDir / skillet.skills)?
   NO  → ✓  package infrastructure  (bin/, package.json, LICENSE, README.md, …)
   YES → apply Option B name patterns:
         - SKILL.md, *.md, prompts/, resources/, assets/, templates/, examples/  → ✓ skill content
         - *.ts, *.tsx, lock files, biome.json, tsconfig.json, vitest.config*,
           .eslintrc*, scripts/                                                   → ⚠ ambiguous
         - entries matching DEFAULT_IGNORE (.git, node_modules, .DS_Store, …)    → ✗ violation
```

Infrastructure items outside skill paths are trusted as-is — they belong in the package. Only within skill paths can something be unexpected. Violations (DEFAULT_IGNORE matches) inside skill paths are always flagged, even if .npmignore was supposed to exclude them (they shouldn't appear in the pack output at all if excluded).

_Alternative considered_: Flag all items for review regardless of path. Rejected: produces noise for every package.json, bin/cli.js, LICENSE — the signal-to-noise ratio is poor.

### 3. Interactive .npmignore flow: prompt → update → exit 1 → rerun

If the user selects items to exclude, the check writes those patterns to `.npmignore` and exits 1. The user must rerun `npm publish`. This matches the standard npm fix-publish-config workflow and ensures the next pack reflects the change.

_Alternative considered_: Update `.npmignore` then re-run check in the same process. Rejected: silent re-run hides what actually changed; user should see the clean diff on a fresh run.

Two interactive prompts are presented (both only if TTY):
1. Checkbox over ⚠ items: select any to exclude
2. "Also exclude any ✓ skill content?" — if Yes, opens checkbox over all ✓ skill-path items

If nothing is selected in either prompt → exit 0, publish proceeds normally.

### 4. Shared `runCheck` function with `interactive` flag

`check.ts` exports `runCheck({ interactive: boolean })`. When `interactive: true` (standalone `create-skillet check`), prompts are shown and `.npmignore` may be updated. When `interactive: false` (post-wizard preview), output is printed but no prompts appear and no files are modified.

This avoids duplicating classification + display logic.

### 5. Commander subcommand refactor: `addCommand` for `check`, default action for wizard

```
create-skillet            → existing wizard action (backward compatible)
create-skillet check      → new check subcommand
```

Commander routes the first positional argument to a matching subcommand; if no match, falls through to the default action. The name arg (`create-skillet mypackage`) continues to work. The edge case of a package literally named "check" is an acceptable limitation.

### 6. Scaffold adds `create-skillet@latest` devDep + `prepublishOnly` script

After the existing `npm install @skillet-cli/core@latest` step, scaffold runs:
```
npm install --save-dev create-skillet@latest
```
And writes `"prepublishOnly": "create-skillet check"` to `package.json` via `npm pkg set`.

`create-skillet` is therefore available locally in the generated package; no `npx` fetch needed at publish time.

## Risks / Trade-offs

- [Subcommand name collision with package name] A package named "check" would have its wizard name arg intercepted as the `check` subcommand. Mitigation: extremely unlikely; document as known limitation.
- [npm pack requires npm in PATH] Already a given (publish requires npm). No new runtime dependency introduced.
- [prepublishOnly exit 1 on first-time setup] After scaffold, if the skill directory contains ⚠ items, the first `npm publish` attempt will fail and require a `create-skillet check` run. Mitigation: clear exit message explains the required action.
- [publish preview (read-only mode) runs npm pack at end of wizard] Adds a few seconds. Mitigation: run with a spinner; pack is fast for small packages.

## Open Questions

None blocking.
