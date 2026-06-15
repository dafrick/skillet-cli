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
2. **Prompts for configuration** — package name, version, description, author, repository URL, and license. If multiple skill directories are detected, all are packaged together automatically; otherwise you confirm or override the skill directory path
3. **Shows a preview** — displays the full `npm pkg set` command before writing anything
4. **Scaffolds the package** — runs `npm init -y` if there is no `package.json`, then `npm pkg set` to apply all fields
5. **Writes `bin/cli.js`** — a ready-to-run entry point that calls `@skillet-cli/core`
6. **Installs the runtime** — runs `npm install @skillet-cli/core`
7. **Selects skill files** — for single-skill packages, shows a checkbox list of files to move into `skill/` (or a single confirm for large directories); pre-selects `SKILL.md` and common resource folders. Skipped for multi-skill packages

## What you get

After the wizard completes, your directory contains:

```
package.json          # name, version, bin, skillet.skillDir (or skillet.skills for multi-skill), engines, type=module
bin/
  cli.js              # #!/usr/bin/env node — calls run() from @skillet-cli/core
node_modules/
  @skillet-cli/core/
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

## Changelog

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
