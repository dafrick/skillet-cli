## Context

Both release workflows (`release-core.yml`, `release-create.yml`) use `workflow_run` triggered by CI completion. GitHub creates a workflow run entry every time the trigger fires — even when the `if:` condition on the job causes the job to be skipped. Since CI runs on every push to `main` and every PR, this produces two skipped release workflow runs per CI run, filling the Actions log with noise.

The current `ci.yml` already triggers on `push: tags: ['core-v*', 'create-v*']`, so CI runs on the tag commit before the release workflow needs to do anything.

## Goals / Non-Goals

**Goals:**
- Release workflows only appear in the Actions log when a release tag is actually pushed
- No skipped runs on pushes to main or PR updates
- Preserve existing publish behavior (semver validation, OIDC provenance, package scoping)

**Non-Goals:**
- Adding a hard CI-gate dependency (parallel execution is acceptable given existing semver validation)
- Changing the release process itself (version bumping, changelogs, etc.)
- Adding tag protection rules (a separate concern)

## Decisions

### Use direct `push: tags` trigger instead of `workflow_run`

**Decision**: Replace `on: workflow_run` with `on: push: tags: ['core-v*']` (and `['create-v*']` respectively).

**Rationale**: The `workflow_run` trigger cannot be scoped to only fire on tag-triggered CI runs — it fires on every CI completion regardless of what triggered CI. A direct tag trigger is idiomatic GitHub Actions for release workflows and fires exactly once when the tag is pushed.

**Alternative considered**: Keep `workflow_run` and add a `branches` filter (which also matches tags). GitHub's documentation inconsistently describes whether `branches` in `workflow_run` matches tag refs; this approach is fragile and underdocumented.

**Alternative considered**: Keep `workflow_run` and add an additional `if:` condition to check `head_branch` against a regex. This avoids the skipped-run problem only if combined with a `branches` filter at the trigger level — which has the fragility issue above.

### Context variable mapping

Under `workflow_run`, steps reference `github.event.workflow_run.head_sha` (for checkout ref) and `github.event.workflow_run.head_branch` (for semver validation). Under a direct push trigger these become:
- `github.sha` — the SHA of the pushed tag commit (use for checkout `ref`)
- `github.ref_name` — the tag name without `refs/tags/` prefix (e.g. `core-v1.2.3`) (use for semver validation)

The checkout `ref` can also be omitted entirely since the default checkout on a tag push checks out the tag commit.

### Remove the `workflow_run.conclusion == 'success'` gate

**Decision**: Remove the `if: github.event.workflow_run.conclusion == 'success'` job condition. Under a direct push trigger this condition has no equivalent — the workflow simply doesn't run unless the tag is pushed.

**Tradeoff**: CI and the release workflow now run in parallel rather than sequentially. A publish could theoretically start while CI is still running. In practice:
1. The semver validation regex catches malformed tags immediately
2. Tag pushes are intentional release actions — CI is expected to be green on the commit before tagging
3. If CI fails after a publish, the release has already happened; this is the same risk as before since the `workflow_run` gate only prevented publish if CI failed *on that tag*, not if CI failed after publish

## Risks / Trade-offs

- **Parallel CI + publish** → Mitigation: enforce that tags are only pushed after CI passes on `main` via convention or tag protection rules (out of scope but recommended)
- **ci-cd-pipeline spec explicitly forbids this approach** → Mitigation: update the spec as part of this change; the prior guidance was written before the multi-package tag scheme (`core-v*`, `create-v*`) was in place and the `workflow_run` noise issue was surfaced
