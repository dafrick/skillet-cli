## Context

`@skillet-cli/ui` uses figlet's `textSync` with the `ANSI Shadow` font to render the CLI wordmark. Figlet's Node.js implementation (`node-figlet.mjs`) resolves font files using `import.meta.url` at load time: `path.join(dirname(fileURLToPath(import.meta.url)), '/../fonts/')`. When tsup bundles `@skillet-cli/ui` into `create-skillet/dist/run.js`, `import.meta.url` points to the bundle output, so figlet searches for fonts in `node_modules/create-skillet/fonts/` — a path that does not exist in the published package.

Figlet v1.11.0 provides an `importable-fonts/` directory where each font is a JS module exporting the font data as a string. These can be pre-registered via `figlet.parseFont(name, data)`, after which `textSync` finds the font in memory without touching the filesystem.

## Goals / Non-Goals

**Goals:**
- Eliminate the runtime filesystem dependency for the `ANSI Shadow` font
- Fix the crash without modifying `create-skillet`'s build config or `files` array

**Non-Goals:**
- Changing the wordmark appearance or behavior
- Adding support for other figlet fonts
- Restructuring the `@skillet-cli/ui` build pipeline

## Decisions

### Decision: Use figlet's importable font API instead of copying font files

**Chosen**: Import `ansiShadowFontData` from `figlet/fonts/ANSI Shadow` and call `figlet.parseFont('ANSI Shadow', ansiShadowFontData)` at module load time in `wordmark.ts`.

**Alternatives considered**:
- *Copy `ANSI Shadow.flf` to `packages/create/fonts/` and add to `files`*: Works but ships a binary asset, is fragile (depends on figlet's internal path resolution staying stable), and requires manual maintenance if the font is updated.
- *Externalize figlet from the tsup bundle*: Requires adding figlet to `create-skillet`'s `dependencies` and ensuring it's installed when running via `npx`. Adds coupling between packages that should be independent.
- *Use async `figlet.loadFont()` instead of `textSync`*: Would require making `generateWordmark` async, cascading through `renderFullHeader` and all callers. Disproportionate refactor for a one-line fix.

The importable font API is the approach figlet's own documentation recommends for bundled environments. The font data is bundled into the JS output by tsup, so no filesystem access is needed at runtime.

## Risks / Trade-offs

- **Font data size**: `ANSI Shadow.flf` is ~50 KB. Bundling it inline increases `run.js` by ~50 KB. Acceptable for a CLI tool; not a browser asset concern.
- **figlet version coupling**: The importable font path `figlet/fonts/ANSI Shadow` is stable in figlet v1.11.x and is part of the package's exports map. If figlet ever removes this export, the import will fail at build time (compile-time error, not runtime crash).
