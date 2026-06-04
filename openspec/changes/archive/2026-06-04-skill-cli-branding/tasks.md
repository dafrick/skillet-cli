## 1. Dependencies

- [x] 1.1 Add `figlet` and `@types/figlet` to `packages/core/package.json` dependencies
- [x] 1.2 Run `pnpm install` and confirm figlet resolves with ANSI Shadow font available

## 2. Display Name Derivation & Wordmark Generation

- [x] 2.1 Implement `deriveDisplayName(pkgName: string): string` utility: strips `@scope/` prefix, uppercases result
- [x] 2.2 Implement `generateWordmark(name: string): string` using figlet "ANSI Shadow" font — returns plain ASCII (no color); measure longest line against `process.stdout.columns ?? 120` and fall back to `chalk.bold(name)` plain text if it would overflow
- [x] 2.3 Apply five-stop Ember heated-iron gradient row-by-row to figlet output (reuse existing gradient logic from current SKILLET wordmark rendering); also apply Ember gradient to the plain-text fallback
- [x] 2.4 Respect `NO_COLOR`: when set, return uncolored figlet output (structure preserved, no ANSI codes); fallback plain text also uncolored
- [x] 2.5 Unit-test `deriveDisplayName`: plain name, scoped name, single-segment scope edge cases
- [x] 2.6 Unit-test `generateWordmark`: verify output is non-empty, verify gradient codes present when NO_COLOR unset; verify fallback to plain text when rendered width would exceed terminal columns

## 3. Header System Updates

- [x] 3.1 Replace hardcoded SKILLET ASCII art in the full header renderer with a call to `generateWordmark(resolvedWordmarkName)` where `resolvedWordmarkName` is passed in; update `renderFullHeader` signature to accept `{ resolvedWordmarkName, resolvedDisplayName, pkg, coreVersion }`
- [x] 3.2 Update the light header renderer to accept `{ resolvedDisplayName, pkg }` and replace the hardcoded `SKILLET v0.1.0` prefix with `<RESOLVED-DISPLAY-NAME> v<pkg.version>` in Ember 500 bold
- [x] 3.3 Update light header description field to use `pkg.description` (dim) instead of the hardcoded blurb
- [x] 3.4 Remove the rotating tagline line from both full and light header render paths
- [x] 3.5 Add attribution line rendered immediately after the wordmark (full header) and name line (light header): `Packaged with Skillet v{coreVersion}` in Iris Bright bold + `· package your own for any agent in one step ↗` in `chalk.dim` where `↗` is an OSC 8 hyperlink to `https://github.com/dafrick/skillet`; attribution absent in CI/non-TTY
- [x] 3.6 Unit-test: attribution line is absent when `process.stdout.isTTY` is falsy or `CI` is set

## 4. Verb Mode & Display Name Options

- [x] 4.1 Add `verbMode?: 'fun' | 'standard'`, `displayName?: string`, and `wordmarkName?: string` to `RunOptions` type (defaults: `verbMode: 'fun'`, others absent)
- [x] 4.2 Define standard verb constants: `STANDARD_INSTALL`, `STANDARD_UPDATE`, `STANDARD_UNINSTALL`, `STANDARD_DETECT` (active and done forms per spec: Installing/Installed, Updating/Updated, Removing/Removed, Detecting targets/Found N target(s))
- [x] 4.3 Wire `verbMode`, `displayName`, and `wordmarkName` through `run()` and CLI dispatcher; resolved display name = `displayName?.toUpperCase()` ?? `deriveDisplayName(pkg.name)`; resolved wordmark name = `wordmarkName?.toUpperCase()` ?? resolved display name; pass both to header renderers
- [x] 4.4 Apply standard lowercase form in CI/non-TTY log lines when `verbMode` is `'standard'`
- [x] 4.5 Unit-test verb selection: fun mode selects from random pool; standard mode always returns fixed form
- [x] 4.6 Integration-test: `run({ verbMode: 'standard' })` produces `Installing into…` / `✔ Installed` output

## 5. Skillet's Own CLI

- [x] 5.1 Update `packages/core/bin/cli.js` to pass `displayName: 'skillet'` to `run()` so Skillet's own header renders as `SKILLET` rather than `CORE`
- [ ] 5.2 Smoke-test: run the CLI locally and confirm the full header shows the `SKILLET` wordmark with Ember gradient [manual verification step]

## 6. End-to-End & Integration Tests

- [x] 6.1 Integration test: full header (install) shows generated wordmark matching `pkg.name` derivation
- [x] 6.2 Integration test: light header (list) shows derived name + `pkg.version` + `pkg.description`
- [x] 6.3 Integration test: no tagline line appears in any header output
- [x] 6.4 Integration test: attribution line appears in TTY headers, absent in CI mode
- [x] 6.5 Integration test: `verbMode: 'standard'` produces correct verb forms across install, update, uninstall
- [x] 6.6 Integration test: `verbMode: 'fun'` (default) still produces cooking verbs (regression guard)
- [x] 6.7 Unit test: `displayName: 'skillet'` renders `SKILLET` in both full and light header; `wordmarkName` overrides only the wordmark, not the light header; `pkg.name` unchanged in manifest source field

## 7. Design System Reference

- [x] 7.1 Update `docs/design/cli-design-system.html` with new header layouts showing generated wordmark, attribution line, no tagline
- [x] 7.2 Add standard verb table to the CLI Design System reference (alongside the existing cooking verb table)
- [x] 7.3 Update color usage notes: Iris Bright now used for attribution line (in addition to existing interactive roles)
- [x] 7.4 Attribution line copy is finalized — `Packaged with Skillet v{coreVersion} · package your own for any agent in one step ↗` linking to `https://github.com/dafrick/skillet` — ensure docs reflect this exactly, no placeholder
