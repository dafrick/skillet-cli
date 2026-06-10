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
2. **Prompts for configuration** — package name, version, description, author, repository URL, license, and which directory holds your skill files
3. **Shows a preview** — displays the full `npm pkg set` command before writing anything
4. **Scaffolds the package** — runs `npm init -y` if there is no `package.json`, then `npm pkg set` to apply all fields
5. **Writes `bin/cli.js`** — a ready-to-run entry point that calls `@skillet-cli/core`
6. **Installs the runtime** — runs `npm install @skillet-cli/core`
7. **Selects skill files** — shows a checkbox list of files in your skill directory (or a single confirm for large directories); pre-selects `SKILL.md` and common resource folders

## What you get

After the wizard completes, your directory contains:

```
package.json          # name, version, bin, skillet.skillDir, engines, type=module
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
