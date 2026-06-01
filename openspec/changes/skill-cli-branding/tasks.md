## 1. Dependencies

- [ ] 1.1 Add `figlet` and `@types/figlet` to `packages/core/package.json` dependencies
- [ ] 1.2 Run `pnpm install` and confirm figlet resolves with ANSI Shadow font available

## 2. Display Name Derivation & Wordmark Generation

- [ ] 2.1 Implement `deriveDisplayName(pkgName: string): string` utility: strips `@scope/` prefix, uppercases result
- [ ] 2.2 Implement `generateWordmark(displayName: string): string` using figlet "ANSI Shadow" font — returns plain ASCII (no color)
- [ ] 2.3 Apply five-stop Ember heated-iron gradient row-by-row to figlet output (reuse existing gradient logic from current SKILLET wordmark rendering)
- [ ] 2.4 Respect `NO_COLOR`: when set, return uncolored figlet output (structure preserved, no ANSI codes)
- [ ] 2.5 Unit-test `deriveDisplayName`: plain name, scoped name, single-segment scope edge cases
- [ ] 2.6 Unit-test `generateWordmark`: verify output is non-empty, verify gradient codes are present when NO_COLOR is unset

## 3. Header System Updates

- [ ] 3.1 Replace hardcoded SKILLET ASCII string in the full header renderer with a call to `generateWordmark(deriveDisplayName(pkg.name))`
- [ ] 3.2 Update the light header renderer to use `deriveDisplayName(pkg.name)` and `pkg.version` instead of the hardcoded `SKILLET v0.1.0` prefix
- [ ] 3.3 Update light header description field to use `pkg.description` (dim) instead of the hardcoded blurb
- [ ] 3.4 Remove the rotating tagline line from both full and light header render paths
- [ ] 3.5 Add attribution line rendered immediately after the wordmark (full header) and name line (light header): `Built with Skillet` in Iris Bright bold + `·` and descriptor + URL in `chalk.dim` — use placeholder copy until canonical URL is confirmed
- [ ] 3.6 Confirm attribution line is absent when `process.stdout.isTTY` is falsy or `CI` is set

## 4. Verb Mode

- [ ] 4.1 Add `verbMode?: 'fun' | 'standard'` and `displayName?: string` to the `RunOptions` type (defaults: `verbMode: 'fun'`, `displayName` absent)
- [ ] 4.2 Define standard verb constants: `STANDARD_INSTALL`, `STANDARD_UPDATE`, `STANDARD_UNINSTALL`, `STANDARD_DETECT` (active and done forms)
- [ ] 4.3 Wire `verbMode` and `displayName` through the CLI dispatcher so the correct verb pool and resolved display name are available to all header and verb renderers
- [ ] 4.4 Apply standard lowercase form in CI/non-TTY log lines when `verbMode` is `'standard'`
- [ ] 4.5 Unit-test verb selection: fun mode selects from the random pool; standard mode always returns the fixed form
- [ ] 4.6 Integration-test: `run({ verbMode: 'standard' })` produces `Installing into…` / `✔ Installed` output

## 5. Skillet's Own CLI

- [ ] 5.1 Update `packages/core/bin/cli.js` to pass `displayName: 'skillet'` to `run()` so Skillet's own header renders as `SKILLET` rather than `CORE` (which would be derived from the package name `@skillet-cli/core`)
- [ ] 5.2 Smoke-test: run `npx @skillet-cli/core` locally and confirm the full header shows the `SKILLET` wordmark with Ember gradient

## 6. End-to-End & Integration Tests

- [ ] 6.1 Integration test: full header (install) shows generated wordmark matching `pkg.name` derivation
- [ ] 6.2 Integration test: light header (list) shows derived name + `pkg.version` + `pkg.description`
- [ ] 6.3 Integration test: no tagline line appears in any header output
- [ ] 6.4 Integration test: attribution line appears in TTY headers, absent in CI mode
- [ ] 6.5 Integration test: `verbMode: 'standard'` produces correct verb forms across install, update, uninstall
- [ ] 6.6 Integration test: `verbMode: 'fun'` (default) still produces cooking verbs (regression guard)
- [ ] 6.7 Unit test: `displayName: 'skillet'` renders as `SKILLET` in both full and light header; `pkg.name` unchanged in manifest source field

## 7. Design System Reference

- [ ] 7.1 Update `docs/design/cli-design-system.html` with new header layouts showing generated wordmark, attribution line, no tagline
- [ ] 7.2 Add standard verb table to the CLI Design System reference (alongside the existing cooking verb table)
- [ ] 7.3 Update color usage notes: Iris Bright now used for attribution line (in addition to existing interactive roles)
- [ ] 7.4 Finalize and hardcode the attribution line copy + URL once the canonical Skillet URL is established (replace placeholder)
