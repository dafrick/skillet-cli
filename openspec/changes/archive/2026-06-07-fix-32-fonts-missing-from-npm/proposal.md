## Why

`create-skillet` crashes on every fresh `npx` install because figlet's Node.js runtime resolves font paths using `import.meta.url`, which — when the code is bundled by tsup into `create-skillet/dist/run.js` — points to the bundle output rather than the original figlet package. The result: figlet looks for `ANSI Shadow.flf` at `node_modules/create-skillet/fonts/`, a directory that does not exist in the published package. The tool is completely unusable on first run.

## What Changes

- Switch `@skillet-cli/ui`'s `generateWordmark` from relying on figlet's filesystem font loader to using figlet's importable font API (`figlet/fonts/ANSI Shadow`)
- The font data is pre-parsed at module load time via `figlet.parseFont()`, eliminating all filesystem access for font loading at runtime

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- None — the external behavior of the wordmark is unchanged. This is a pure implementation fix; no spec-level requirements change. -->

## Impact

- `packages/ui/src/wordmark.ts`: add font data import and `parseFont` call
- No API changes, no behavior changes, no new dependencies (figlet already ships importable font modules)
