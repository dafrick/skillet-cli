# create-skillet

Interactive wizard that turns a skill directory into a publishable Skillet npm package.

```sh
npm create skillet
```

or

```sh
npx create-skillet
```

Run it in the directory you want to package. The wizard detects defaults from your `package.json`, `git config`, and git remote URL, then walks you through the rest.

## What it does

1. **Detects defaults** — reads your git user name/email, derives a package name from the directory or git remote, and pre-fills the repository URL from `git remote get-url origin`
2. **Prompts for configuration** — package name, version, description, author, repository URL, and license. If a git remote is detected, also prompts whether to generate Claude Code + Copilot CLI plugin manifests (`.claude-plugin/`) and a Gemini CLI extension manifest (`gemini-extension.json`). If multiple skill directories are detected, all are packaged together automatically; otherwise you confirm or override the skill directory path
3. **Shows a preview** — displays the full `npm pkg set` command before writing anything
4. **Scaffolds the package** — runs `npm init -y` if there is no `package.json`, then `npm pkg set` to apply all fields
5. **Writes `bin/cli.js`** — a ready-to-run entry point that calls `@skillet-cli/core`
6. **Installs the runtime** — runs `npm install @skillet-cli/core`
7. **Selects skill files** — for single-skill packages, shows a checkbox list of files to move into `skill/` (or a single confirm for large directories); pre-selects `SKILL.md` and common resource folders. Skipped for multi-skill packages
8. **Generates plugin manifests** (when opted in) — writes `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` for Claude Code and Copilot CLI plugin marketplace distribution, and/or `gemini-extension.json` for Gemini CLI gallery distribution

## What you get

After the wizard completes, your directory contains:

```
package.json          # name, version, bin, skillet.skillDir (or skillet.skills for multi-skill), engines, type=module
bin/
  cli.js              # #!/usr/bin/env node — calls run() from @skillet-cli/core
node_modules/
  @skillet-cli/core/
.claude-plugin/       # (if opted in) Claude Code + Copilot CLI plugin marketplace files
  plugin.json         # plugin definition — name, version, skills paths
  marketplace.json    # self-hosted marketplace entry — source: "./"
gemini-extension.json # (if opted in) Gemini CLI gallery extension manifest
```

The generated `bin/cli.js` looks like this — skill location comes entirely from `package.json`:

```js
#!/usr/bin/env node
import { createRequire } from 'node:module';
import { run } from '@skillet-cli/core';

const pkg = createRequire(import.meta.url)('../package.json');
await run({ pkg });
```

From there, publish to npm or GitHub Package Registry and your users can run:

```sh
npx your-package-name install
```

See [`@skillet-cli/core`](https://www.npmjs.com/package/@skillet-cli/core) for the full skill author guide.

## Subcommands

### `create-skillet check`

Verifies publish readiness before `npm publish`:

- Runs `npm pack --dry-run` and classifies every file in the tarball (skill content, infrastructure, violations)
- Validates that `.claude-plugin/plugin.json` and `gemini-extension.json` versions match `package.json`
- Checks that all skills paths in `plugin.json` contain a `SKILL.md`
- Checks git readiness: clean working tree, `origin` remote present, and version tag pushed to remote

Run it manually before publishing, or add it to your `prepublishOnly` script.

### `create-skillet post-publish`

Prints post-publish next steps after `npm publish` succeeds. Wire it up as a `postpublish` script:

```json
{
  "scripts": {
    "postpublish": "create-skillet post-publish"
  }
}
```

When `.claude-plugin/plugin.json` is present, prints the `claude plugin marketplace add` and install commands for your users. When `gemini-extension.json` is present, reminds you to create a GitHub Release so Gemini's gallery picks up the new version.

## Changelog

### v0.4.0

- **Plugin marketplace support**: wizard prompts (default on when a git remote is detected) to generate Claude Code + Copilot CLI manifests (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`) and/or a Gemini CLI extension manifest (`gemini-extension.json`). Each skill repo is its own self-hosted marketplace — no central infrastructure required
- **`create-skillet check` extended**: now validates plugin manifest versions against `package.json`, checks that skills paths resolve to a `SKILL.md`, and verifies git readiness (clean tree, `origin` remote, version tag on remote via `git ls-remote`)
- **`create-skillet post-publish` subcommand**: prints `claude plugin marketplace add` and install commands after `npm publish`; reminds Gemini authors to create a GitHub Release. Wire as `"postpublish": "create-skillet post-publish"` in `package.json`
- **Completion block**: when plugin manifests are generated and a `repositoryUrl` is present, the wizard prints ready-to-share install instructions at the end

### v0.3.0

- **`create-skillet check` subcommand**: runs `npm pack --dry-run` and classifies every tarball entry as skill content, infrastructure, or a violation; exits non-zero on violations
- **License detection**: reads `license` field from existing `package.json` and uses it as the prompt default
- **Private field warning**: detects `"private": true` in `package.json` and offers to remove it so the package can be published
- **Optional description and author prompts**: fields are now optional — empty answers are skipped in `npm pkg set` rather than written as empty strings
- **`.npmignore` generation**: writes `.npmignore` to exclude nested `node_modules/` from the published tarball
- **Stable `@skillet-cli/core` installs**: wizard installs `@skillet-cli/core@latest` to prevent stale cached versions on re-runs
- **`files[]` for multi-skill**: generated `package.json` correctly includes all skill parent directories in the `files` array

### v0.2.0

- **Multi-skill repo support**: wizard detects multiple skill directories and prompts you to choose which one to package
- **`skillet.skillDir` as source of truth**: generated `bin/cli.js` calls `run({ pkg })` with no hardcoded path — skill location is read entirely from `package.json`
- **Accurate `package.json` preview**: final `package.json` state is displayed after all `npm pkg set` commands complete, reflecting the true written values
- **SKILL.md detection**: wizard summary accurately indicates whether a `SKILL.md` file is present in the selected skill directory
- **Publish file scoping**: scaffolded `package.json` sets `files` to `bin/` and the skill directory, preventing dev artifacts from being included in the published package
- **npm install output**: replaced spinner with plain stdout so actual install progress is visible
- **Post-move display**: shows the updated skill directory path after a directory move
- **Bug fixes**: `bin/cli.js` and `package.json` are correctly rewritten after a skill directory move

### v0.1.0

Initial release.
