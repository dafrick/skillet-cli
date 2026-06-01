## Context

`packages/core` ships a CLI surface where all visual output — the SKILLET ASCII wordmark, the light header, the rotating tagline — is hardcoded to Skillet's brand. When skill authors use `run()` to ship their own CLI, their users see "SKILLET" not the skill name. This wastes both the skill author's chance at a branded experience and Skillet's best advertising surface (the install moment is high-visibility; discovery attribution should happen there).

The goal of this change is to:
1. Make the CLI surface feel native to whichever skill is being installed (name-driven wordmark, skill version in headers)
2. Add a compact attribution line that advertises Skillet to end users at install time
3. Give skill authors a one-flag escape hatch from cooking verbs for professional presentations

## Goals / Non-Goals

**Goals:**
- Generated ANSI Shadow wordmark from `pkg.name` (or `displayName` override) for the full header
- `displayName` option on `run()` so callers can specify an explicit display name that overrides the derivation from `pkg.name`
- Light header reads `pkg.name` (or `displayName`) and `pkg.version` — no hardcoded strings
- Single attribution line (copy and URL TBD) on every header, in Iris Bright
- `verbMode: 'fun' | 'standard'` option on `run()` with standard English verb pools
- Suppress Skillet-branded rotating taglines in skill CLI headers
- Backward compatible — no existing callers of `run()` break

**Non-Goals:**
- Custom color schemes per skill (future change)
- Skill-author-provided tagline pools (removed, not deferred)
- A `--standard` user-facing flag (verb mode is an author-time, not user-time, decision)
- Generating wordmarks for arbitrary strings unrelated to a skill's identity

## Decisions

### Decision: Use `figlet` with ANSI Shadow font for wordmark generation

The current SKILLET wordmark is hand-crafted in ANSI Shadow style using box-drawing characters (╗, ╔, ═, etc.) with the Ember heated-iron gradient applied row-by-row. `figlet` with "ANSI Shadow" produces the same character set.

The visual output will closely match the current hardcoded art; any minor glyph differences are acceptable during the transition.

**Alternative: cfonts** — richer output options, but ~3× heavier and less common in CLI tooling. Rejected on dependency weight.

**Alternative: hardcode ASCII art per skill** — not scalable, requires skill authors to generate their own art. Rejected.

### Decision: Scoped package names — strip the scope, use the name portion

`@org/my-skill` becomes `MY-SKILL` in the wordmark and light header. The scope prefix is developer-facing and looks awkward as ASCII art. The bare name is what end users recognize.

Implementation: strip everything up to and including the first `/`, then uppercase.

**Alternative: show `MY-ORG/MY-SKILL`** — slash renders in figlet but produces two visual words with a separator; confusing. Rejected.

### Decision: `displayName` option allows explicit name override

`pkg.name` is not always the right display name. The clearest case: `packages/core/bin/cli.js` passes `pkg` from `@skillet-cli/core`, so the derived display name would be "CORE" — not "SKILLET". A `displayName` option on `run()` lets callers specify the exact string to show in headers, bypassing the scope-strip derivation entirely.

`displayName` is uppercased at render time by the same pipeline as the derived name. Skillet's own `bin/cli.js` passes `displayName: 'skillet'` → renders as "SKILLET".

Scope of override: `displayName` replaces the derived name in both the full header wordmark and the light header prefix. `pkg.name` and `pkg.version` are still used for all other purposes (manifests, update notifier, CI log prefix).

**Alternative: modify pkg before passing to run()** — e.g., `run({ pkg: { ...pkg, name: 'skillet' }, ... })`. Works but mutates a shared object and silently changes behavior in non-header contexts. Rejected in favor of an explicit, purpose-scoped option.

**Alternative: a separate `wordmarkName` option** — more specific but adds cognitive overhead without additional power when `displayName` alone is the question. Rejected as a *replacement* for `displayName`; `displayName` covers both header contexts.

### Decision: `wordmarkName` option for independent wordmark control

When `displayName` is set to a long name (e.g. `my-analytics-platform`), the skill author may want to keep that full name in the light header — where it reads as plain text — while using a shorter abbreviation in the figlet wordmark to avoid overflow. `wordmarkName` provides that control without forcing the author to shorten `displayName` globally.

Resolution order:
- **Full header wordmark**: `wordmarkName` (uppercased) → `displayName` (uppercased) → derived from `pkg.name`
- **Light header**: `displayName` (uppercased) → derived from `pkg.name`

`wordmarkName` is optional. When omitted, the wordmark input falls through to `displayName` or the derived name as before. Like `displayName`, it does not affect `pkg.name` usage in manifests, CI log prefixes, or the update notifier.

### Decision: Same Ember heated-iron gradient for all generated wordmarks

Skill CLIs that use Skillet share Skillet's visual language. This makes the ecosystem recognizable and reinforces the "Packaged with Skillet" attribution. Skill authors who want different colors can style their own header via `extendProgram`.

**Alternative: derive gradient from skill name** — gimmick with low payoff. Rejected.

### Decision: Taglines suppressed, not made configurable

The tagline pool is Skillet's brand copy. Showing "Cast iron. No flaking." under a skill named "My Analytics Tools" is confusing and undercuts the skill author's presentation. Removing them is cleaner than making them configurable (which would add API surface and a fallback question).

**Alternative: let skill authors pass a custom tagline pool** — left open for a future customization change if demand exists.

### Decision: Attribution line is a single compact line in Iris Bright

Format: `Packaged with Skillet v{core-version} · package your own for any agent in one step ↗`. The version is `@skillet-cli/core`'s own version. The `↗` text is an OSC 8 terminal hyperlink to the Skillet GitHub repository. Iris Bright signals secondary context and contrasts with the skill name's Ember rendering, creating a clear visual hierarchy: skill identity → Skillet attribution.

Colors: `Packaged with Skillet v{core-version}` in Iris Bright bold; `·` and remainder in `chalk.dim`.

### Decision: `verbMode` is a `run()` parameter, not a CLI flag

Verb mode is a presentation choice the skill author makes for their audience — it is not something end users should toggle per-invocation. A `run({ verbMode: 'standard' })` call keeps the decision in the skill author's `bin/cli.js`.

**Alternative: `SKILLET_VERB_MODE` env var** — readable at runtime, but env vars are for operational config, not brand voice. Rejected.

### Decision: Standard verb pools cover the same four commands as fun pools

| Command | Standard Active | Standard Done |
|---|---|---|
| install | Installing into `<target>`… | ✔ Installed |
| update | Updating `<target>`… | ✔ Updated |
| uninstall | Removing `<target>`… | ✔ Removed |
| detect | Detecting targets… | ✔ Found N targets |

CI / non-TTY mode lowercases the active form as with fun verbs: `[my-skill] installing into claude (user)…`.

## Risks / Trade-offs

[Long skill names produce wide wordmarks] → `figlet` does not wrap. A name like `my-analytics-platform` renders as a ~130-char-wide wordmark that may overflow narrow terminals. Mitigation: render the figlet string first, measure the longest line against `process.stdout.columns` (defaulting to 120), and fall back to an Ember-gradient `chalk.bold` plain-text header if it would overflow. No arbitrary character-count threshold; no startup warning.

[figlet ANSI Shadow output may differ from current handcrafted SKILLET art] → Visual regression limited to Skillet's own CLI. Accept minor glyph differences in exchange for removing the hardcoded string. Can be fine-tuned after seeing actual figlet output.

[figlet adds ~0.5 MB to `packages/core`] → Acceptable given existing `commander` + `inquirer` footprint. Monitor via bundlesize check in CI.

[Scoped name stripping is a lossy transform] → `@my-org/skill` and `@other-org/skill` both produce `SKILL`. This is correct for display but could confuse debugging. Context is preserved in `pkg.name` everywhere else.

## Migration Plan

Non-breaking. `verbMode` defaults to `'fun'`. All existing callers of `run()` keep current behavior. The wordmark and light header changes are additive rendering changes — callers pass `pkg` already; no signature changes beyond the new optional field.

Rollback: revert the figlet integration; restore the hardcoded SKILLET wordmark string; remove attribution line.

## Open Questions

1. ~~**Attribution copy**~~: Resolved. Final line: `Packaged with Skillet v{core-version} · package your own for any agent in one step ↗`, linking to the Skillet GitHub repository via OSC 8.
2. ~~**Long-name behavior**~~: Resolved. Render figlet output first, measure longest line against `process.stdout.columns ?? 120`, fall back to Ember-gradient `chalk.bold` plain-text header if it would overflow. No character-count threshold, no startup warning.
