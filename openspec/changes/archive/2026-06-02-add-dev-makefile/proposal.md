## Why

Contributors needed to know exact pnpm filter syntax and node invocation paths to build, run, and clean the project. A Makefile at the repo root provides stable, memorable targets that can evolve under the hood without requiring documentation updates.

## What Changes

- Add `Makefile` at the repo root with targets: `build`, `clean`, `run`, `watch`, `test`, `test-unit`, `test-integration`, `test-e2e`, `test-coverage`, `lint`, `format`, `typecheck`
- Add "Local Build & Manual Testing" section to `CONTRIBUTING.md` referencing the Makefile targets and covering local linking workflow

## Capabilities

### New Capabilities

- `dev-makefile`: Root-level Makefile that abstracts build, clean, run, watch, and test commands for contributors

### Modified Capabilities

- `contributor-docs`: CONTRIBUTING.md gains a local build and manual testing section

## Impact

- `Makefile` (new file at repo root)
- `CONTRIBUTING.md` (new section added)
- No API, runtime, or dependency changes
