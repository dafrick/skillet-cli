## Context

The npm package scope `@skillet-cli/core` already carries the `skillet-cli` identity, but the GitHub repository is still named `skillet` (`dafrick/skillet`). This mismatch means every hardcoded URL in source, tests, docs, and openspec artifacts points to a name that doesn't match the package's own scope. Renaming the repo closes the gap.

The change touches six distinct locations: `packages/core/package.json`, `packages/core/src/ui/header.ts`, two test files, two README files, and one pending-change spec. No runtime logic changes — only strings.

## Goals / Non-Goals

**Goals:**
- Rename the GitHub repository to `dafrick/skillet-cli`
- Update every hardcoded `github.com/dafrick/skillet` string to `github.com/dafrick/skillet-cli`
- Keep the npm package name (`@skillet-cli/core`) unchanged

**Non-Goals:**
- Changing the npm package name or scope
- Updating the git remote in local clones (users do this themselves, or GitHub redirects handle it)
- Updating third-party links or cached references outside this repo

## Decisions

### Single-pass string replacement

All affected strings are the same pattern: `github.com/dafrick/skillet` → `github.com/dafrick/skillet-cli`. A targeted find-and-replace across the known files is sufficient. No regex ambiguity risk — the old string does not appear as a substring of anything unrelated.

**Alternative considered:** Scripted `sed` across the whole tree. Rejected because the affected files are fully enumerated in the proposal; a script would be overkill and harder to review.

### GitHub repo rename first

The GitHub repo should be renamed before (or at the same time as) merging the URL updates, so that the new URLs resolve immediately. GitHub automatically redirects the old URL for existing clones and links, so there is no hard ordering requirement, but renaming first is cleaner.

### openspec pending-change specs get updated too

`openspec/changes/npm-package-polish/specs/npm-package-metadata/spec.md` references the old URL as a requirement value. This spec is not yet applied, so updating it in the same pass keeps the spec accurate and avoids a follow-up change.

The completed task log in `openspec/changes/skill-cli-branding/tasks.md` also references the old URL, but it is historical record. Updating it is low-value; leave it as-is.

## Risks / Trade-offs

- **Broken external links before rename** → GitHub redirects handle this automatically once the rename is done; the window is negligible if rename and merge happen close together.
- **Missed occurrences** → The file list was built by grepping the repo. Any future file that embeds the URL will need a separate update, but this is low risk for a small repo.

## Migration Plan

1. Rename GitHub repo: `dafrick/skillet` → `dafrick/skillet-cli` (one click in GitHub Settings → General → Repository name)
2. Merge this branch — all in-repo URL strings are updated atomically
3. No rollback needed: GitHub redirects the old URL indefinitely, and the string change is trivially reversible
