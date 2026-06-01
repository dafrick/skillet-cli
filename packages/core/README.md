# @skillet-cli/core

`@skillet-cli/core` is a library that gives any npm package a complete, polished CLI for installing, updating, and managing an AI agent skill — so skill authors ship one dependency and get a production-ready installer for free.

## Installation

```sh
npm install @skillet-cli/core
```

## Usage

Create an entry-point file (e.g. `bin/cli.js`) — this is the entire CLI:

```js
#!/usr/bin/env node
import { createRequire } from 'node:module';
import { run } from '@skillet-cli/core';

const pkg = createRequire(import.meta.url)('../package.json');
await run({ skillDir: new URL('../skill', import.meta.url).pathname, pkg });
```

Add a `"bin"` field to your `package.json` pointing to that file, publish to npm, and you're done. Skillet handles detection, prompts, install, update, drift, and uninstall for every supported agent environment (Claude Code, GitHub Copilot, and generic agents).

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
