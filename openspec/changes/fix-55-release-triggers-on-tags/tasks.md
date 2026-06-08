## 1. Update release-core.yml

- [x] 1.1 Replace `on: workflow_run` trigger with `on: push: tags: ['core-v*']`
- [x] 1.2 Remove the `if:` condition on the `publish` job (no longer needed)
- [x] 1.3 Update `concurrency.group` to use `github.sha` instead of `github.event.workflow_run.head_sha`
- [x] 1.4 Update the `Validate semver tag` step env var to use `github.ref_name` instead of `github.event.workflow_run.head_branch`
- [x] 1.5 Update `actions/checkout` `ref` to use `github.sha` instead of `github.event.workflow_run.head_sha`

## 2. Update release-create.yml

- [x] 2.1 Replace `on: workflow_run` trigger with `on: push: tags: ['create-v*']`
- [x] 2.2 Remove the `if:` condition on the `publish` job (no longer needed)
- [x] 2.3 Update `concurrency.group` to use `github.sha` instead of `github.event.workflow_run.head_sha`
- [x] 2.4 Update the `Validate semver tag` step env var to use `github.ref_name` instead of `github.event.workflow_run.head_branch`
- [x] 2.5 Update `actions/checkout` `ref` to use `github.sha` instead of `github.event.workflow_run.head_sha`

## 3. Update ci-cd-pipeline spec

- [x] 3.1 Update `openspec/specs/ci-cd-pipeline/spec.md` to replace the requirement mandating `workflow_run` with one mandating direct `push: tags` triggers for release workflows
