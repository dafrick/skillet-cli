## ADDED Requirements

### Requirement: T1 run with valid Step 2 grading exists
The project SHALL contain at least one completed manual test run for T1 (`Hao0321/claude-skill-code-cleanup`) in which the Step 2 grade was produced without the guide pre-exposing the tool name. The run SHALL use the corrected `LOG.md.template` (post-`82c73d7`) where `create-skillet-version:` is not in the pre-session frontmatter block.

#### Scenario: Run folder committed with all required artifacts
- **WHEN** the change is merged
- **THEN** `test-manual/runs/` contains a directory named `2026-06-25-hao0321-claude-skill-code-cleanup/` (or a date-stamped equivalent) with `TASK.md`, `LOG.md`, `TEST-RUN.md`, and a redacted `AGENT-SUPPLEMENT.md` present

#### Scenario: Tester's AGENT-SUPPLEMENT.md does not contain tool name
- **WHEN** examining the `AGENT-SUPPLEMENT.md` committed in the run folder
- **THEN** the file does not contain `create-skillet` or `npx create-skillet` — the tool-name example has been replaced with a neutral placeholder (e.g. `"<your-command>"`)

#### Scenario: Step 2 grade based on observable tester behavior
- **WHEN** reviewing `TEST-RUN.md` from the run
- **THEN** the Step 2 grade is one of: pass, soft-pass, fail, or "not gradeable — agent recall suspected" — and the rationale references the first observable action the tester took (search vs. direct tool invocation)

#### Scenario: LOG.md does not contain pre-filled version
- **WHEN** examining the `LOG.md` frontmatter in the committed run
- **THEN** the `create-skillet-version:` field is absent from the pre-session block and appears only in the post-session block (filled in after the tester completed their work)

#### Scenario: LOG.md documents the tester's first documentation consulted
- **WHEN** reviewing `LOG.md` from the run
- **THEN** the log records the first documentation URL or resource the tester accessed before invoking any tool — either the npm README URL (`https://www.npmjs.com/package/create-skillet`) if the tester searched for it, or an explicit note that the tester invoked the tool name directly without a visible search step (agent recall)

#### Scenario: TEST-MATRIX.md records T1 result
- **WHEN** examining `test-manual/TEST-MATRIX.md`
- **THEN** the T1 row for `Hao0321/claude-skill-code-cleanup` is no longer "Untested" and references the run date or folder
