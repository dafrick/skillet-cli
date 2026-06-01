## Why

When a skill author publishes a CLI using `@skillet-cli/core`, their users see the SKILLET wordmark and Skillet-branded taglines — Skillet's identity, not theirs. This undermines the value proposition for skill authors who want to ship a polished, named CLI, and wastes a high-visibility surface for Skillet discovery when someone installs a third-party skill.

## What Changes

- **Full header (install/update)**: Instead of the hardcoded SKILLET ASCII wordmark, generate a dynamic block-art wordmark from the skill name using the same ANSI Shadow style and Ember gradient. The name is derived from `pkg.name` by stripping the npm scope prefix and uppercasing, unless `displayName` is provided (see below).
- **Light header (list/uninstall)**: Replace the hardcoded `SKILLET v0.1.0` prefix with `<SKILL-NAME> vX.Y.Z` drawn from the same name derivation and `pkg.version`. Same Ember 500 bold, all-caps rendering.
- **`displayName` option on `run()`**: An optional explicit display name that overrides the name derived from `pkg.name`. Uppercased at render time. Used by Skillet's own `bin/cli.js` (where `pkg.name` is `@skillet-cli/core`) to ensure the header reads "SKILLET" rather than "CORE".
- **Taglines**: Suppress the rotating Skillet tagline pool for all skill CLI headers. The taglines are Skillet-specific brand copy and look out of place under a third-party skill name.
- **Attribution line**: Add a single attribution line under every header (full and light) advertising Skillet to end users. Renders in Iris Bright. Final copy TBD (see Decisions below), format: `Built with Skillet · skill manager for AI agents · <skillet-url>`.
- **Verb mode configuration**: Add a `verbMode: 'fun' | 'standard'` option to `run()`. Default is `'fun'` (existing cooking verbs). `'standard'` replaces cooking verbs with conventional English equivalents (Installing/Installed, Updating/Updated, Removing/Removed) for skill authors who want a professional presentation.
- **New dependency**: `figlet` (+ `@types/figlet`) added to `packages/core` for ASCII wordmark generation.

## Capabilities

### New Capabilities

- `skill-wordmark`: Dynamic ANSI Shadow block-art wordmark generated from `pkg.name` using figlet, with the same Ember gradient applied row-by-row. Handles scoped package names (strips `@org/` prefix), converts to uppercase. Replaces the hardcoded SKILLET ASCII art in the full header.

### Modified Capabilities

- `cli-surface`: Header system changes (full header now generated, light header reads from `pkg`, taglines suppressed, attribution line added); new `verbMode` and `displayName` parameters on `run()` with a standard verb pool alongside the existing fun pool.

## Impact

- `packages/core`: new `figlet` / `@types/figlet` dependency; updated header rendering logic; updated `run()` API signature (`verbMode`, `displayName`)
- `openspec/specs/cli-surface/spec.md`: delta requirements for attribution line, light header from `pkg`, tagline suppression, `verbMode` parameter
- `docs/design/cli-design-system.html`: visual spec update for attribution line and standard verb tables
- **Not breaking** for existing callers of `run()` — `verbMode` defaults to `'fun'`, all existing behavior preserved unless opted in
