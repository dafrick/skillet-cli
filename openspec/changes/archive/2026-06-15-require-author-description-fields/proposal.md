## Why

The `Description` and `Author` prompts in `create-skillet` display no label hint indicating whether a value is required or optional. Because the crash from issue #83 has been fixed (empty values are accepted and fields are simply omitted from `package.json`), these fields are genuinely optional — but the prompts give the user no signal of that, creating a UX gap.

## What Changes

- The `Description` prompt message changes from `'Description:'` to `'Description (optional):'`
- The `Author` prompt message changes from `'Author:'` to `'Author (optional):'`
- The `skilletize-wizard` spec is updated to record the exact prompt label text for these two fields

## Capabilities

### New Capabilities

_(none — this is a label-text refinement, not a new capability)_

### Modified Capabilities

- `skilletize-wizard`: The prompt label text for `Description` and `Author` now includes `(optional)` to signal that blank input is valid and intentional.

## Impact

- `packages/create/src/prompts.ts`: two one-line changes (the `message` string for `description` and `author` inputs)
- `openspec/specs/skilletize-wizard/spec.md`: minor wording addition to the "Configuration prompts collect package metadata" requirement to record the label text
- Existing tests that assert on prompt message text (if any) will need updating; otherwise a regression test covering `(optional)` in both messages should be added
