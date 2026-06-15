## MODIFIED Requirements

### Requirement: LOG.md.template is the test user's session narrative
`test-manual/templates/LOG.md.template` SHALL be the test user's running narrative of what they did, tried, and observed. It SHALL be append-only. The format examples in the template SHALL appear in a fully self-contained HTML comment block that is explicitly closed before the append region begins, **with no blank line between the closing `-->` of the examples block and the `<!-- Append entries below. -->` marker**, so there is no ambiguous insertion zone between the two comment blocks and test user entries are never inadvertently placed inside a comment. The header SHALL include: repo, tier, env, date, tester, and Docker base image. A comment SHALL indicate that the guide pre-fills all frontmatter fields before handoff, that the test user fills in `tester:` only, and that the guide does **not** pre-fill `create-skillet-version:` because discovering the tool is what Step 2 measures. The template SHALL include a **post-session block** after the append region, separated by a horizontal rule, where the tester records `create-skillet-version:` after the session completes. Format examples in the template SHALL be in first-person from the test user's perspective.

The guide SHALL consult `LOG.md` to cross-reference with `TEST-RUN.md` grading, identify issues the test user noted but did not flag explicitly, and understand the sequence of events when a step failed.

#### Scenario: LOG.md entries are timestamped and append-only
- **WHEN** a test user records an observation during a session
- **THEN** a new HH:MM-prefixed entry is appended without modifying any prior entry

#### Scenario: LOG.md format examples are in first-person
- **WHEN** a test user opens a new LOG.md from the template
- **THEN** the example entries are written from the test user's point of view (e.g., "Ran `npx create-skillet`…" not "Test user ran…")

#### Scenario: LOG.md references issue files as they are created
- **WHEN** a test user creates an issue file during a session
- **THEN** the LOG.md entry that prompted the issue references the issue identifier (ISS-NNN)

#### Scenario: Format examples do not swallow log entries
- **WHEN** a test user appends their first log entry to a fresh LOG.md
- **THEN** the entry appears as visible Markdown content, not inside an HTML comment block

#### Scenario: Log entries are plain text, not comment-wrapped
- **WHEN** a coding-agent test user appends a log entry
- **THEN** the entry is a plain-text `HH:MM ...` line, not wrapped in `<!-- -->` comment syntax

#### Scenario: create-skillet-version is not pre-filled by the guide
- **WHEN** the guide hands a fresh LOG.md to the test user
- **THEN** the `create-skillet-version:` field is blank — the tester fills it in after discovering and using the tool, in the post-session block after the append region
