## Context

Gemini CLI loads skills from `~/.gemini/skills/` and `.gemini/skills/` automatically, but silently skips any skill whose `SKILL.md` does not start with `---` as the literal first bytes. No leading blank lines, BOM, H1 title, or whitespace before the opening delimiter is allowed. Claude Code similarly documents leading frontmatter as required.

`normalizeSkill()` already validates that `name` and `description` fields are present (using gray-matter), but gray-matter is lenient about leading content — it may still parse frontmatter even with leading blank lines in some versions, meaning a malformed file can pass normalization yet silently fail in Gemini. The lint must be a raw string check independent of the parser.

The two integration points are:
- `packages/create/src/check.ts` — pre-publish check run by skill authors; interactive, can offer fixes
- `packages/core/src/install.ts` — install-time warning for consumers who install skills from npm

## Goals / Non-Goals

**Goals:**
- Detect when `SKILL.md` does not start with `---\n` and emit a specific, actionable warning
- In `create-skillet check` interactive mode: offer to auto-fix by rewriting `SKILL.md` with frontmatter at position 0
- In `skillet install`: emit the warning non-blocking (no exit, no prompt)
- Warning message names both affected environments (Gemini CLI, Claude Code)

**Non-Goals:**
- Validating frontmatter field values (already done by `normalizeSkill()`)
- Checking other environments' SKILL.md requirements
- Modifying `normalizeSkill()` to throw on leading content (would break existing callers)

## Decisions

### D1: Raw string check, not parser-dependent

**Decision**: The lint is `skillMdContent.startsWith('---\n') || skillMdContent.startsWith('---\r\n')` — no gray-matter involved.

**Rationale**: gray-matter's frontmatter detection behavior varies by version and config. Gemini's requirement is a raw byte-level constraint. A raw string check is simpler, more reliable, and doesn't risk false negatives from parser leniency.

**Alternatives considered**: Re-parsing with gray-matter in strict mode — rejected because gray-matter has no strict-position mode and behavior is version-dependent.

### D2: Auto-fix rewrites the file with correct structure

**Decision**: When the user elects to fix in `create-skillet check`, the tool reads the raw file, extracts the frontmatter data via gray-matter (which can find embedded frontmatter even with leading content), and rewrites `SKILL.md` as `---\n<re-serialized fields>\n---\n<original body>`.

**Rationale**: gray-matter can still extract data even from a malformed position, so we can preserve all existing fields while writing them at position 0. The user doesn't need to manually edit the file.

**Alternatives considered**: Prepending `---\n` without touching content — rejected because that would create a double-frontmatter file if the original had frontmatter later.

### D3: Non-blocking warning at install time

**Decision**: `skillet install` emits a `⚠` warning line to stderr and continues. No prompt, no exit.

**Rationale**: The consumer installing a skill from npm cannot fix the upstream package. Blocking install would break CI pipelines. The warning surfaces the issue so consumers can report it upstream or avoid the package.

### D4: Export `lintSkillFrontmatter` from `@skillet-cli/core`

**Decision**: The lint function is exported from `packages/core` so both `create-skillet` and any future consumers share the same implementation.

**Rationale**: Keeps the check co-located with `normalizeSkill()`. Avoids duplication between the create and core packages.

## Risks / Trade-offs

- [Risk] CRLF line endings — `---\r\n` is valid frontmatter; the check must handle both. Mitigation: check both variants explicitly (D1 above).
- [Risk] gray-matter may silently strip leading blank lines in future versions, making the raw check moot — but harmless to keep. Mitigation: the raw check is self-contained and doesn't depend on gray-matter behavior.
- [Risk] Auto-fix may lose comments or unusual whitespace inside the frontmatter block — gray-matter round-trips only parsed field values. Mitigation: warn the user that the file was rewritten and recommend reviewing the result.
