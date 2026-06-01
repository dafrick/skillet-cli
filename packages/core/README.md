# @skillet-cli/core

Use `@skillet-cli/core` to ship your skill as an npm package with a complete CLI — so your users can install, update, and uninstall it in any agent environment with a single command, whether that's Claude Code, GitHub Copilot, or any other agent.

## For skill authors

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

Place your prompt files in a `skill/` directory.

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
await run({ skillDir: new URL('../skill', import.meta.url).pathname, pkg });
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

## RunOptions

| Option | Type | Description |
|---|---|---|
| `skillDir` | `string` | Path to the directory containing your skill files |
| `pkg` | `{ name: string; version: string }` | Your package's name and version (used by the update notifier) |
| `hooks.transform` | `(skill: NormalizedSkill) => NormalizedSkill` | Modify the normalized skill before adapter dispatch; may be async |
| `hooks.beforeInstall` | `(skill: NormalizedSkill, adapter: Adapter, ctx: Context) => void` | Run before each adapter install; may be async |
| `hooks.afterInstall` | `(skill: NormalizedSkill, adapter: Adapter, ctx: Context) => void` | Run after each adapter install; may be async |
| `hooks.extendProgram` | `(program: Command, ctx: Record<string, unknown>) => void` | Add custom subcommands to the CLI (`Command` is from `commander`) |

All `hooks` fields are optional. `NormalizedSkill`, `Adapter`, and `Context` are TypeScript types exported from `@skillet-cli/core`.

## Further Reading

- [GitHub repository](https://github.com/dafrick/skillet) — full docs, contributing guide, and issue tracker
