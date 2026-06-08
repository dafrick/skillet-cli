## 1. Update release-core.yml

- [ ] 1.1 Replace `on: workflow_run` trigger with `on: push: tags: ['core-v*']`
- [ ] 1.2 Remove the `if:` condition on the `publish` job (no longer needed)
- [ ] 1.3 Update `concurrency.group` to use `github.sha` instead of `github.event.workflow_run.head_sha`
- [ ] 1.4 Update the `Validate semver tag` step env var to use `github.ref_name` instead of `github.event.workflow_run.head_branch`
- [ ] 1.5 Update `actions/checkout` `ref` to use `github.sha` instead of `github.event.workflow_run.head_sha`

## 2. Update release-create.yml

- [ ] 2.1 Replace `on: workflow_run` trigger with `on: push: tags: ['create-v*']`
- [ ] 2.2 Remove the `if:` condition on the `publish` job (no longer needed)
- [ ] 2.3 Update `concurrency.group` to use `github.sha` instead of `github.event.workflow_run.head_sha`
- [ ] 2.4 Update the `Validate semver tag` step env var to use `github.ref_name` instead of `github.event.workflow_run.head_branch`
- [ ] 2.5 Update `actions/checkout` `ref` to use `github.sha` instead of `github.event.workflow_run.head_sha`

## 3. Update ci-cd-pipeline spec

- [ ] 3.1 Update `openspec/specs/ci-cd-pipeline/spec.md` to replace the requirement mandating `workflow_run` with one mandating direct `push: tags` triggers for release workflows
