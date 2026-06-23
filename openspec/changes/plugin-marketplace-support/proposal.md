## Why

Skills published via `create-skillet` are currently distributed only through npm. Users install them with `npx <package-name> install`, which works but requires users to discover the package on npm. AI coding tools have a parallel distribution path — plugin marketplaces — that offers in-tool discovery and one-command install, and which is already where users look for this kind of content.

Claude Code and GitHub Copilot CLI share the same plugin format (`plugin.json`, `skills/<name>/SKILL.md`). Gemini CLI has its own extension format (`gemini-extension.json`, `GEMINI.md`). Skillet's `skills/` directory structure is already compatible with both — pluginizing a skill is almost entirely additive.

The goal is to let skill authors distribute through marketplaces without creating extra work or separate choices. Npm and plugins distribute the same content; the difference is how users discover and install it.

## What Changes

- **Plugin manifest generation in `create-skillet`**: the wizard gains an optional prompt group that generates `.claude-plugin/plugin.json` (Claude Code + Copilot CLI) and, optionally, `gemini-extension.json` + `GEMINI.md` (Gemini CLI) into the skill's repository.
- **Self-hosted marketplace generation**: alongside `plugin.json`, the wizard also generates `.claude-plugin/marketplace.json` pointing to the current repository with `"source": "./"`. This makes the author's GitHub repo its own marketplace — no central infrastructure required. Users add `claude plugin marketplace add owner/repo` and install from it directly.
- **Plugin validation in `create-skillet check`**: the existing check command is extended to validate plugin manifests — version consistency across `plugin.json`, `marketplace.json`, `gemini-extension.json`, and `package.json`; skills paths resolve to real directories; `contextFileName` resolves to a real file.
- **Completion output updated**: the post-wizard next-steps output is extended with the marketplace registration and install commands the author can share with their users.

## Capabilities

### New Capabilities
- `plugin-manifest-generation`: wizard generates `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` for Claude Code + Copilot CLI distribution; optionally generates `gemini-extension.json` + `GEMINI.md` for Gemini CLI gallery.
- `plugin-manifest-validation`: `create-skillet check` validates plugin manifests — version sync, path resolution, `contextFileName` existence.

### Modified Capabilities
- `scaffold-publish-preview` (from `create-skillet-check`): post-wizard completion block extended with plugin marketplace share instructions when plugin manifests were generated.
- `wizard-prompts`: `collectConfig` gains a plugin distribution prompt group after the existing npm metadata prompts.

## Impact

- `packages/create/src/run.ts` — extend completion block with marketplace share commands
- `packages/create/src/prompts.ts` — add plugin distribution prompt group; extend `WizardConfig` with plugin manifest fields
- `packages/create/src/scaffold.ts` — add plugin manifest file writes after npm scaffold steps
- `packages/create/src/check.ts` — add plugin manifest validation (version sync, path resolution)
- New: `packages/create/src/plugin-manifests.ts` — plugin manifest generation and validation logic
