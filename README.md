<p align="center">
  <img src=".github/wordmark.svg" alt="Skillet" />
</p>

<p align="center">
  <a href="https://github.com/dafrick/skillet-cli/actions/workflows/ci.yml"><img src="https://github.com/dafrick/skillet-cli/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@skillet-cli/core"><img src="https://img.shields.io/npm/v/@skillet-cli/core" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@skillet-cli/core"><img src="https://img.shields.io/node/v/@skillet-cli/core" alt="Node.js ≥24" /></a>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
</p>

<p align="center"><em>Mise en place for your agents.</em></p>

## What is Skillet?

Skills are structured files that teach AI agents how to accomplish specific tasks. Getting them installed across different agent environments — Claude Code, GitHub Copilot, generic agents — requires detecting the right tool, resolving the right path, handling updates, and presenting a consistent experience. Every skill author would have to build that from scratch.

Skillet solves this once. Authors ship a small npm package powered by `@skillet-cli/core`; end users run it to install, update, and uninstall skills in any agent environment.

## Design Principles

- **One dependency ships a complete installer.** Add `@skillet-cli/core` to your package, call `run()`. The CLI, prompts, adapters, drift detection, and UX are all included. Nothing else to wire up.
- **Standard package distribution.** Skills ship as npm packages — via GitHub Package Registry, npmjs.com, or any compatible registry. Skillet adds an installer, not a new distribution channel. Your existing publish workflow is enough.
- **UX is skillet's job, not yours.** Scope selection, auto-detection of agent environments, drift detection, update prompts, rich terminal output — everything that makes an installer feel polished comes out of the box. Write great skills; let skillet handle the rest.
- **Broad reach that expands over time.** Skillet ships with adapters for Claude Code, GitHub Copilot, and generic agents. As the ecosystem grows, so does adapter support — without changes to your skill.

## Using Skillet

When you install a skill published with `@skillet-cli/core`, you get four commands:

```sh
my-skill install     # Install the skill into detected agent environments
my-skill update      # Update an installed skill, preserving local modifications
my-skill list        # Show installed locations and drift status
my-skill uninstall   # Remove the skill from selected locations
```

**Scopes** — skills install at two granularities:

- `user` — installs to your home directory; available across every project
- `project` — installs to the current directory; scoped to that repo

The installer detects which agent tools are present and pre-selects them. You can confirm the defaults or choose a different target.

## Building with @skillet-cli/core

Use `@skillet-cli/core` to ship your skill as an npm package with a complete CLI — so your users can install, update, and uninstall it in any agent environment with a single command, whether that's Claude Code, GitHub Copilot, or any other agent.

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

Add the skill location to your `package.json`:

```json
{
  "skillet": {
    "skillDir": "./skill"
  }
}
```

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

### Composing skill-packages

To build on another skill-package's skills, list it in `dependencies` and use `skillet.skills` (a parent directory to scan) instead of `skillet.skillDir` in both packages. When a user installs your package, core automatically installs skills from all marked packages in your dependency closure — no extra commands needed.

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

Skills from `superpowers-base` are installed alongside your own. All skills are attributed to `travel-planner` in their `requestedBy` field so uninstalling it correctly garbage-collects any skills it exclusively owns.

### RunOptions

| Option | Type | Description |
|---|---|---|
| `skillDir` | `string \| undefined` | Path to a single skill tree directory. When omitted, core reads `skillet.skillDir` from `package.json` (single skill), or discovers skill trees via `skillet.skills` (multi-skill packages). |
| `pkg` | `{ name: string; version: string }` | Your package's name and version (used by the update notifier) |
| `hooks.transform` | `(skill: NormalizedSkill) => NormalizedSkill` | Modify the normalized skill before adapter dispatch; may be async |
| `hooks.beforeInstall` | `(skill: NormalizedSkill, adapter: Adapter, ctx: Context) => void` | Run before each adapter install; may be async |
| `hooks.afterInstall` | `(skill: NormalizedSkill, adapter: Adapter, ctx: Context) => void` | Run after each adapter install; may be async |
| `hooks.extendProgram` | `(program: Command, ctx: Record<string, unknown>) => void` | Add custom subcommands to the CLI (`Command` is from `commander`) |

All `hooks` fields are optional. `NormalizedSkill`, `Adapter`, and `Context` are TypeScript types exported from `@skillet-cli/core`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, scripts, commit format, and the release process.
