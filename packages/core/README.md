# @skillet-cli/core

Use `@skillet-cli/core` to ship your skill as an npm package with a complete CLI — so your users can install, update, and uninstall it in any agent environment with a single command, whether that's Claude Code, GitHub Copilot, or any other agent.

## For skill authors

**Quick start:** Run `npm create skillet` in your project directory. The interactive wizard detects defaults from your git config and existing files, prompts for the rest, and scaffolds everything for you — skip straight to step 4.

### 1. Create your package

Initialize a directory with a `package.json`. Publishing via GitHub Package Registry requires no separate npm account:

```json
{
  "name": "@your-github-username/my-skill",
  "version": "1.0.0",
  "type": "module",
  "bin": { "my-skill": "bin/cli.js" },
  "publishConfig": { "registry": "https://npm.pkg.github.com" }
}
```

### 2. Add your skill files

Place your prompt files in a `skill/` directory with a `SKILL.md` file at its root.

### 3. Wire up the CLI

Install the library:

```sh
npm install @skillet-cli/core
```

Create `bin/cli.js` — this is your entire CLI:

```js
#!/usr/bin/env node
import { createRequire } from 'node:module';
import { run } from '@skillet-cli/core';

const pkg = createRequire(import.meta.url)('../package.json');
await run({ pkg });
```

Add a `skillet` key to your `package.json` to tell core where your skills live:

```json
{
  "skillet": {
    "skillDir": "./skill"
  }
}
```

`skillDir` is the direct path to your skill directory — the directory that contains `SKILL.md` at its root. For packages with multiple skill trees, use `skillet.skills` instead to name a parent directory to scan for skill subdirectories (e.g. `"skills": "skills"` to discover every `skills/*/SKILL.md`).

### 4. Publish

Authenticate with GitHub Package Registry once, then publish:

```sh
npm login --registry=https://npm.pkg.github.com
npm publish
```

Your users configure the registry for your scope once, then install via npx:

```sh
npm config set @your-github-username:registry https://npm.pkg.github.com
npx @your-github-username/my-skill install
```

Skillet detects their agent environment and puts the skill in the right place.

### Publishing to npm instead

If you'd rather publish to the public npm registry, remove `publishConfig` from your `package.json` and run `npm publish`. Your users can then run `npx @your-github-username/my-skill install` with no registry setup.

## Composing skill-packages

To build on another skill-package's skills, list it in `dependencies` and add the `skillet` marker to both packages. When a user installs your package, core automatically installs skills from all marked packages in your dependency closure — no extra commands needed.

```json
{
  "name": "travel-planner",
  "dependencies": {
    "superpowers-base": "^1.0.0"
  },
  "skillet": {
    "skills": "skills"
  }
}
```

Skills from `superpowers-base` are installed alongside `travel-planner`'s own skills. All skills are attributed to `travel-planner` in their `requestedBy` field so uninstalling `travel-planner` correctly garbage-collects any skills it exclusively owns.

> **Note:** Dependency packages are discovered by their `skillet` marker only. A dependency that calls `run({ skillDir })` without a marker in `package.json` cannot be discovered as a skill dependency, even if its CLI produces skills when run directly.

## Back-compatibility

Packages that call `run({ skillDir, pkg })` explicitly continue to work without any changes. The `skillet` marker is the fallback used only when `skillDir` is not provided.

## RunOptions

| Option | Type | Description |
|---|---|---|
| `skillDir` | `string \| undefined` | Path to a single skill tree directory. When omitted, core discovers skill trees via the `skillet` marker in `package.json`. |
| `pkg` | `{ name: string; version: string }` | Your package's name and version (used by the update notifier and `requestedBy` attribution) |
| `hooks.transform` | `(skill: NormalizedSkill) => NormalizedSkill` | Modify the normalized skill before adapter dispatch; may be async |
| `hooks.beforeInstall` | `(skill: NormalizedSkill, adapter: Adapter, ctx: Context) => void` | Run before each adapter install; may be async |
| `hooks.afterInstall` | `(skill: NormalizedSkill, adapter: Adapter, ctx: Context) => void` | Run after each adapter install; may be async |
| `hooks.extendProgram` | `(program: Command, ctx: Record<string, unknown>) => void` | Add custom subcommands to the CLI (`Command` is from `commander`) |

All `hooks` fields are optional. `NormalizedSkill`, `Adapter`, and `Context` are TypeScript types exported from `@skillet-cli/core`.

## Changelog

### v0.3.0

- **`skillet.skillDir` in `package.json`**: declare the direct path to a single skill directory; takes precedence over `skillet.skills` when present
- **Simplified `bin/cli.js`**: `create-skillet` now generates `await run({ pkg })` with no explicit `skillDir` — skill location is read entirely from `package.json`
- **Noise file exclusion**: `copyTree` skips `.git`, `node_modules`, `.DS_Store`, and `.skill-manifest.json` when copying skill files during install
- **Publish file scoping**: exported `DEFAULT_IGNORE` constant; skill packages now have `files` restricted to `bin/` and the skill directory, preventing accidental inclusion of dev artifacts

### v0.2.0

- **`skillet` marker in `package.json`**: declare skill tree directories; string or array form; defaults to `skills/`
- **Dependency-aware installation**: core walks `dependencies` recursively, installs skills from all marked packages in one operation
- **`requestedBy` manifest field**: every install records which top-level package requested it
- **GC uninstall**: uninstalling a package removes it from `requestedBy` on its skills; skills with an empty `requestedBy` are garbage-collected (with modified-content guardrail)
- **v0.1.x manifest compatibility**: old manifests without `requestedBy` are skipped by GC and persist harmlessly
- **Unchanged**: content-hash algorithm, render hash, drift detection, adapter interface, scopes, CI safety, the three-line `bin/cli.js`

### v0.1.0

Initial release.

## Further Reading

- [GitHub repository](https://github.com/dafrick/skillet-cli) — full docs, contributing guide, and issue tracker
