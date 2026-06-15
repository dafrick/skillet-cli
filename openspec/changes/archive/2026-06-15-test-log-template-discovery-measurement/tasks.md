## 1. Update the spec (test-driven first)

- [x] 1.1 In `openspec/specs/manual-test-harness/spec.md`, remove `create-skillet-version` from the header field list in the `### Requirement: LOG.md.template is the test user's session narrative` requirement body
- [x] 1.2 In the same requirement, update the comment clause to say the guide does NOT pre-fill `create-skillet-version:` and explain why (discovering the tool is what Step 2 measures)
- [x] 1.3 Add the post-session block requirement to the same requirement body: after the append region, separated by a horizontal rule, the tester records `create-skillet-version:` once the session completes
- [x] 1.4 Add a new scenario to the same requirement: `#### Scenario: create-skillet-version is not pre-filled by the guide` — WHEN the guide hands a fresh LOG.md to the test user, THEN the `create-skillet-version:` field is blank (tester fills it in post-session)

## 2. Update LOG.md.template

- [x] 2.1 In `test-manual/templates/LOG.md.template`, remove `create-skillet-version:` from the guide-prefilled frontmatter block
- [x] 2.2 Update the frontmatter comment to clarify the guide does NOT pre-fill `create-skillet-version:` and the reason why
- [x] 2.3 After the append region (`<!-- Append entries below. -->`), add a horizontal rule and a post-session block containing a comment instructing the tester to fill in `create-skillet-version:` after discovering and using the tool, followed by the `create-skillet-version:` field

## 3. Update README.md guide instructions

- [x] 3.1 In `test-manual/README.md` Step 6, remove `create-skillet-version` from the list of fields the guide pre-fills before handoff
- [x] 3.2 Add a parenthetical or note after the field list in Step 6 explaining that `create-skillet-version` is intentionally excluded — discovering the tool is what Step 2 measures

## 4. Verify consistency

- [x] 4.1 Confirm that `test-manual/templates/TEST-RUN.md.template` still contains `create-skillet-version:` in its metadata block (guide-only; no change needed)
- [x] 4.2 Check `test-manual/runs/` to confirm no existing run LOG.md files need updating (they are historical records; no retroactive edits required)
- [x] 4.3 Read through a complete simulated guide flow (init-run → pre-fill → hand off → post-session) to confirm the field is absent from the test user's initial view and present in the post-session block
