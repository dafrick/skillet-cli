## Why

Gemini CLI silently skips any skill whose `SKILL.md` does not have frontmatter (`---` delimiters) as the very first bytes of the file — no leading blank lines, no H1 title, nothing before the opening `---`. Claude Code similarly discourages non-leading frontmatter. Skills published with malformed frontmatter structure will silently fail to auto-load in Gemini, giving users no feedback at packaging or install time.

## What Changes

- `create-skillet check` gains a frontmatter-position lint step: reads each skill's `SKILL.md`, checks that the file starts with `---` (no leading whitespace or text), and warns if not
- `skillet install` gains the same lint as a non-blocking warning when processing a skill being installed
- In interactive mode (`create-skillet check`), if the lint fails the user is offered an auto-fix: rewrite the `SKILL.md` to move any stray leading content after the frontmatter block, ensuring `---` is the first line
- Warning message clearly names both affected environments: "This skill's SKILL.md will not auto-load in Gemini CLI and is discouraged for Claude Code — frontmatter must be the first content in the file"

## Capabilities

### New Capabilities

- `skill-frontmatter-lint`: Validates that `SKILL.md` frontmatter begins at the very first byte of the file; warns with actionable message when not; offers interactive fix in `create-skillet check`

### Modified Capabilities

- `cli-surface`: The `create-skillet check` command gains a new lint check and optional interactive fix step
- `install-orchestration`: `skillet install` gains a non-blocking frontmatter-position warning during skill normalization

## Impact

- `packages/create/src/check.ts` — new lint function called from `runCheck()`
- `packages/core/src/install.ts` — emit warning if frontmatter is not at position 0
- No new dependencies (raw string check on file content; no additional parser needed beyond the existing `gray-matter` import in `normalize.ts`)
- Non-breaking: all existing behavior preserved; lint is warn-only at install time and prompt-gated at check time
