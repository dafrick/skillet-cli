## Tasks

### plugin-manifest-generation

- [x] Extend `WizardConfig` with `generateClaudePlugin: boolean` and `generateGeminiPlugin: boolean` fields
- [x] Add plugin distribution prompt group to `collectConfig()` in `prompts.ts` — two checkboxes defaulting based on `repositoryUrl` presence
- [x] Create `packages/create/src/plugin-manifests.ts` with `generatePluginManifests(config)` function
- [x] Implement `.claude-plugin/plugin.json` generation (name, description, version, author, license, skills array)
- [x] Implement `.claude-plugin/marketplace.json` generation (name, owner, plugins[0] with source `"./"`)
- [x] Implement `gemini-extension.json` generation — `contextFileName` points directly to `SKILL.md` for single-skill; `"GEMINI.md"` for multi-skill
- [x] Implement `GEMINI.md` generation for multi-skill only (one `@./` import per skill directory; skipped for single-skill)
- [x] Guard against overwriting existing manifests — warn and skip if file already exists
- [x] Call `generatePluginManifests(config)` from `executeScaffold()` after npm scaffold steps
- [x] Unit tests for `generatePluginManifests` covering single-skill and multi-skill layouts, Gemini on/off, existing-file skip behavior

### plugin-manifest-validation

- [x] Add `validatePluginManifests(cwd)` function in `plugin-manifests.ts`
- [x] Implement version sync check for `.claude-plugin/plugin.json` vs `package.json`
- [x] Implement version sync check for `gemini-extension.json` vs `package.json`
- [x] Implement skills path resolution check (each path → directory with SKILL.md)
- [x] Implement `contextFileName` existence check for `gemini-extension.json`
- [x] Implement git working tree cleanliness check (`git status --porcelain`)
- [x] Implement `origin` remote existence check
- [x] Implement remote tag existence check (`git ls-remote origin refs/tags/v{version}`) with remediation message on failure
- [x] Handle `git ls-remote` network failure gracefully — exit 1 with "remote unreachable" message
- [x] Call `validatePluginManifests(cwd)` from `runCheck()` in `check.ts`
- [x] Unit tests for `validatePluginManifests` covering each validation scenario and the absent-manifest no-op

### post-publish-subcommand

- [x] Add `post-publish` subcommand to Commander in `run.ts`
- [x] Implement `post-publish` reading `package.json` version and detecting plugin manifests
- [x] Print plugin marketplace confirmation and install commands when `.claude-plugin/plugin.json` exists
- [x] Print Gemini GitHub Release reminder when `gemini-extension.json` exists
- [x] Exit silently when no plugin manifests exist
- [x] Wire `"postpublish": "create-skillet post-publish"` into `executeScaffold()` when `generateClaudePlugin` or `generateGeminiPlugin` is true
- [x] Unit tests for `post-publish` output covering all three states (both manifests, claude-only, no manifests)

### wizard-completion-share-instructions

- [x] Derive `owner/repo` from `config.repositoryUrl` (strip `.git` suffix, parse path)
- [x] Add "Plugin marketplace ready" section to completion block in `run.ts` when `generateClaudePlugin` is true and `repositoryUrl` is non-empty
- [x] Add pre-release tagging instructions to completion block (`git tag v{version} && git push origin v{version}`)
- [x] Add Gemini topic note to completion block when `generateGeminiPlugin` is true
- [x] Unit tests for the owner/repo derivation function
