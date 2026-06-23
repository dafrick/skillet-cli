## Tasks

### plugin-manifest-generation

- [ ] Extend `WizardConfig` with `generateClaudePlugin: boolean` and `generateGeminiPlugin: boolean` fields
- [ ] Add plugin distribution prompt group to `collectConfig()` in `prompts.ts` — two checkboxes defaulting based on `repositoryUrl` presence
- [ ] Create `packages/create/src/plugin-manifests.ts` with `generatePluginManifests(config)` function
- [ ] Implement `.claude-plugin/plugin.json` generation (name, description, version, author, license, skills array)
- [ ] Implement `.claude-plugin/marketplace.json` generation (name, owner, plugins[0] with source `"./"`)
- [ ] Implement `gemini-extension.json` generation — `contextFileName` points directly to `SKILL.md` for single-skill; `"GEMINI.md"` for multi-skill
- [ ] Implement `GEMINI.md` generation for multi-skill only (one `@./` import per skill directory; skipped for single-skill)
- [ ] Guard against overwriting existing manifests — warn and skip if file already exists
- [ ] Call `generatePluginManifests(config)` from `executeScaffold()` after npm scaffold steps
- [ ] Unit tests for `generatePluginManifests` covering single-skill and multi-skill layouts, Gemini on/off, existing-file skip behavior

### plugin-manifest-validation

- [ ] Add `validatePluginManifests(cwd)` function in `plugin-manifests.ts`
- [ ] Implement version sync check for `.claude-plugin/plugin.json` vs `package.json`
- [ ] Implement version sync check for `gemini-extension.json` vs `package.json`
- [ ] Implement skills path resolution check (each path → directory with SKILL.md)
- [ ] Implement `contextFileName` existence check for `gemini-extension.json`
- [ ] Implement git working tree cleanliness check (`git status --porcelain`)
- [ ] Implement `origin` remote existence check
- [ ] Implement remote tag existence check (`git ls-remote origin refs/tags/v{version}`) with remediation message on failure
- [ ] Handle `git ls-remote` network failure gracefully — exit 1 with "remote unreachable" message
- [ ] Call `validatePluginManifests(cwd)` from `runCheck()` in `check.ts`
- [ ] Unit tests for `validatePluginManifests` covering each validation scenario and the absent-manifest no-op

### post-publish-subcommand

- [ ] Add `post-publish` subcommand to Commander in `run.ts`
- [ ] Implement `post-publish` reading `package.json` version and detecting plugin manifests
- [ ] Print plugin marketplace confirmation and install commands when `.claude-plugin/plugin.json` exists
- [ ] Print Gemini GitHub Release reminder when `gemini-extension.json` exists
- [ ] Exit silently when no plugin manifests exist
- [ ] Wire `"postpublish": "create-skillet post-publish"` into `executeScaffold()` when `generateClaudePlugin` or `generateGeminiPlugin` is true
- [ ] Unit tests for `post-publish` output covering all three states (both manifests, claude-only, no manifests)

### wizard-completion-share-instructions

- [ ] Derive `owner/repo` from `config.repositoryUrl` (strip `.git` suffix, parse path)
- [ ] Add "Plugin marketplace ready" section to completion block in `run.ts` when `generateClaudePlugin` is true and `repositoryUrl` is non-empty
- [ ] Add pre-release tagging instructions to completion block (`git tag v{version} && git push origin v{version}`)
- [ ] Add Gemini topic note to completion block when `generateGeminiPlugin` is true
- [ ] Unit tests for the owner/repo derivation function
