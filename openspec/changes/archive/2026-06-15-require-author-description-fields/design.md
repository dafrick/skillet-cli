## Context

The `create-skillet` wizard collects package metadata via interactive prompts in `packages/create/src/prompts.ts`. The `Description` and `Author` prompts currently display `'Description:'` and `'Author:'` respectively, with no label text indicating whether a value is required.

Issue #83 fixed the crash that occurred when these fields were left empty. The spec now explicitly states that blank input is accepted and the fields are omitted from `npm pkg set`. Issue #86 is a residual UX gap: users have no indication from the prompts themselves that these fields are optional.

The `repositoryUrl` field presents the same pattern (blank is accepted, no label hint), but its `message: 'Repository URL:'` is not in scope for this change.

## Goals / Non-Goals

**Goals:**
- Append `(optional)` to the `message` text for the `description` and `author` `@inquirer/prompts` `input` calls in `prompts.ts`
- Update the `skilletize-wizard` spec to record the exact label text
- Add or update a test asserting the `(optional)` suffix is present in both messages

**Non-Goals:**
- Adding `validate` callbacks or re-prompting on empty input (ruled out by spec and the #83 design doc)
- Changing `repositoryUrl` or any other prompt
- Any change to `scaffold.ts`, `detect.ts`, or `run.ts`
- Making these fields truly required

## Decisions

**Decision: label text `(optional)` appended to message string**

Alternatives considered:
- `[optional]` — less conventional in CLI tooling
- `(leave blank to skip)` — more verbose, consistent with `repositoryUrl` pattern we might adopt later, but longer than necessary for this scope
- Placeholder / `theme.style.placeholder` — `@inquirer/prompts` supports placeholder styling but it only appears when the field is empty and disappears on input, reducing reliability as a signal
- Moving hint to `describe` prop — `@inquirer/prompts input` does not have a `describe` field; `theme` customisation would be more complex and fragile

`(optional)` is the shortest, clearest, and most conventional phrasing. Two characters of diff.

## Risks / Trade-offs

- [Risk] Existing snapshot or string-match tests for the prompt message text will fail → Mitigation: update those tests as part of this change (they are the regression tests we want)
- [Risk] Future i18n: hardcoded `(optional)` string is not translatable → Mitigation: skillet has no i18n layer; this is not a current concern
