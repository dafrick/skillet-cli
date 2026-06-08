## Why

The `release-core.yml` and `release-create.yml` workflows currently trigger via `workflow_run` on every CI completion, producing a skipped workflow run in the Actions log for every push to main and every PR. This pollutes the Actions log with noise and makes it harder to spot real release activity.

## What Changes

- Change `release-core.yml` trigger from `workflow_run` (CI completed) to `push: tags: ['core-v*']`
- Change `release-create.yml` trigger from `workflow_run` (CI completed) to `push: tags: ['create-v*']`
- Update job context variable references from `github.event.workflow_run.*` to `github.sha` / `github.ref_name` in both release workflows
- Remove the `if:` condition that gated on `workflow_run.conclusion == 'success'` (no longer needed — the workflow only runs when the tag is pushed, not on every CI run)

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ci-cd-pipeline`: The release trigger mechanism changes from `workflow_run` (gated on CI conclusion) to a direct `push: tags` trigger. The requirement that mandates `workflow_run` and warns against direct tag triggers must be updated to reflect this intentional reversal.

## Impact

- `.github/workflows/release-core.yml` — trigger and context variable references updated
- `.github/workflows/release-create.yml` — trigger and context variable references updated
- `openspec/specs/ci-cd-pipeline/spec.md` — requirement for release trigger mechanism updated
- No application code changes
- No dependency changes
- Tradeoff: the `workflow_run` approach implicitly gated publishing on CI passing for the tag; a direct push trigger runs in parallel with CI. Tag protection rules or a pre-push hook are the proper long-term guard, but that is out of scope for this fix.
