## Context

The `create-skillet` wizard collects optional metadata fields (`description`, `author`) via interactive prompts. When a user presses Enter to leave either blank, the empty string flows into `WizardConfig` unchanged. `executeScaffold()` in `packages/create/src/scaffold.ts` then builds `pkgSetArgs` unconditionally — producing tokens like `description=` and `author=` — and passes them to `npm pkg set`. npm rejects bare `key=` tokens with a non-zero exit and the error "npm pkg set expects a key=value pair of args". The wizard aborts via `process.exit(1)`, leaving an orphaned `package.json` created by the preceding `npm init -y`.

The `repositoryUrl` field already uses a conditional spread to skip the `npm pkg set` call when empty. The fix is to extend that pattern to `description` and `author`.

## Goals / Non-Goals

**Goals:**
- Prevent the wizard from crashing when `description` or `author` is left blank
- Keep the fix minimal: one file, two conditional spreads, matching the existing `repositoryUrl` guard
- Add unit tests that explicitly cover the empty-value case for both fields

**Non-Goals:**
- Inline validation or re-prompting in `prompts.ts`
- Any UI change indicating these fields are optional
- Changes to `detect.ts`, `run.ts`, or any file other than `scaffold.ts` and its tests
- E2e test automation for the wizard (no pseudo-TTY in CI)

## Decisions

### Skip empty fields at the `npm pkg set` call site (not in `prompts.ts`)

The skip happens in `scaffold.ts` using the same conditional-spread pattern already used for `repositoryUrl`:

```ts
...(config.description ? [`description=${config.description}`] : []),
...(config.author ? [`author=${config.author}`] : []),
```

**Alternatives considered:**
- **Validate in `prompts.ts`** — would require re-prompt loops, error messages, and changes to a second file. Adds complexity for no observable user benefit: npm already leaves the field absent (not empty) when skipped, which is the correct outcome.
- **Filter out `key=` tokens before calling npm** — generic string manipulation is fragile; the conditional spread is explicit and readable.
- **Set a placeholder value** — would write misleading data to `package.json`; worse than omitting the field.

### No change to the `skilletize-wizard` spec beyond a delta clarification

The existing spec scenario "All required fields are set" lists `description` and `author` as outputs. Since they are genuinely optional (npm schema allows absent fields), the delta spec adds a scenario clarifying that each is omitted when blank. No existing scenario is contradicted; the `repositoryUrl` skip is already specified.

## Risks / Trade-offs

- **Risk:** A user who always fills in `description`/`author` will see no behavior change — regression is invisible. → Mitigation: existing test suite already passes non-empty values through; the new test cases explicitly guard both paths (empty → omitted, non-empty → included).
- **Risk:** Future maintainer adds a new optional field and forgets the guard. → Mitigation: the pattern is consistent across three fields now (`repositoryUrl`, `description`, `author`); convention is established.
- **Trade-off:** Skipping the field means `npm init -y`'s default (empty string `""` for `description`, absent for `author`) is left in place when the user presses Enter. This is acceptable — it matches npm's own default behavior and the field can be set later with `npm pkg set`.
