## 1. Wording & framing quick wins

- [ ] 1.1 Change "Commands to run:" heading in `run.ts` preview block to "Here's what I'll do:" and rewrite each listed item as a plain-English description (e.g., "Initialize package.json", "Set package fields", "Write bin/cli.js", "Install @skillet-cli/core")
- [ ] 1.2 Update unit tests in `run.test.ts` and `completion-block.test.ts` that assert on the old "Commands to run:" text
- [ ] 1.3 Replace the two independent `confirm` calls in `prompts.ts` ("Generate Claude Code + Copilot CLI manifests?" / "Generate Gemini CLI extension?") with a single high-level `confirm`: "Add plugin/extension marketplace support?" followed by conditional sub-prompts when the user opts in
- [ ] 1.4 Update `prompts.test.ts` assertions that reference the old plugin prompt messages

## 2. npm install output suppression

- [ ] 2.1 In `scaffold.ts`, change the `spawnSync` call for `npm install @skillet-cli/core` from `stdio: 'inherit'` to `stdio: 'pipe'`
- [ ] 2.2 Write a progress line before the install (`  Installing @skillet-cli/core…`) and a success line after (`  ✓ Installed @skillet-cli/core`); on non-zero exit, write captured stderr to terminal and exit with code 1
- [ ] 2.3 Update `skilletize-wizard` spec requirement "Install step emits plain progress output, not a spinner" to reflect piped stdio; update corresponding unit and integration tests

## 3. Directory collapsing in file display

- [ ] 3.1 Extract a `collapseToDirectories(files: PackFile[]): DisplayEntry[]` utility in `check.ts` that groups entries sharing a common first path segment into `{ label: 'dirname/ (N files)', paths: string[], isDir: true }` rows and leaves top-level files as `{ label: path, paths: [path], isDir: false }` rows
- [ ] 3.2 Apply `collapseToDirectories` to each classification tier's file list in the `runCheck` output (skill-content, infrastructure, ambiguous) — display collapsed rows in the existing tier sections
- [ ] 3.3 Write unit tests for `collapseToDirectories` covering: all files in one directory, mixed dirs and top-level files, single file in a directory (shown individually, not collapsed), empty input

## 4. Interactive .npmignore triage

- [ ] 4.1 Create `src/npmignore-triage.ts` exporting `async function triageViolations(violations: PackFile[], cwd: string): Promise<void>` — entry point for the interactive flow
- [ ] 4.2 Implement initial checkbox render inside `triageViolations`: build collapsed display rows from violation entries, present via `@inquirer/prompts` `checkbox`, pre-select all (included by default), return set of unchecked (excluded) entries
- [ ] 4.3 Implement the expand loop: after the initial checkbox, if any selected rows are collapsed directories, offer a follow-up `checkbox` ("Any directories you'd like to inspect further?"); for each chosen directory, replace its row with direct children collapsed one level; repeat until user declines or no collapsible dirs remain
- [ ] 4.4 Implement `.npmignore` write: collect excluded entries (collapsed dir → `dirname/`, file → path), deduplicate against existing `.npmignore` content if the file exists, append new entries
- [ ] 4.5 Implement post-write re-check: re-run `npm pack --dry-run --json` and re-classify; print zero-violation success message or summarize remaining violations and exit with code 1
- [ ] 4.6 Wire `triageViolations` into `runCheck`: in interactive mode (`{ interactive: true }`), replace the current static violation message with a call to `triageViolations`; in non-interactive mode leave the static message unchanged
- [ ] 4.7 Write unit tests for `triageViolations` covering: no violations (skipped), single top-level file excluded, single directory collapsed and excluded, directory expanded then child excluded, .npmignore append deduplication

## 5. Integration & regression

- [ ] 5.1 Run the full unit test suite (`pnpm test:unit` in `packages/create`) and fix any failures caused by the above changes
- [ ] 5.2 Run `pnpm typecheck` in `packages/create` and resolve any TypeScript errors
- [ ] 5.3 Manually smoke-test the wizard end-to-end in a temp directory: verify "Here's what I'll do:" framing, suppressed npm output, and single-prompt plugin opt-in
- [ ] 5.4 Manually smoke-test `create-skillet check` in a temp package with a deliberate violation (add a `node_modules/` entry): verify interactive triage appears, .npmignore is written, and re-check passes
