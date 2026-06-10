## Context

`packages/create/src/scaffold.ts` orchestrates the `create-skillet` wizard scaffold phase. Its sixth step runs `npm install @skillet-cli/core` via `spawnSync` with `stdio: 'inherit'`. Before this call, the code does `spinner.start('Firing up @skillet-cli/core install…')` and after it does `spinner.succeed('Firing up done')`.

The spinner (`@skillet-cli/ui`) has two implementations:
- **TTY** (`createTTYSpinner`): writes a single `⠙ label` character to stdout with no newline and no animation loop. `succeed` clears the line with `\r\x1b[2K` and writes `✓ label\n`.
- **Non-TTY** (`createNoOpSpinner`): `start` is a no-op. Only `succeed` writes output.

In non-TTY environments (CI, Docker, piped output) the spinner `start` call emits nothing, so the user sees no output at all from the moment the previous `✓ Plating done` line appears until npm finishes — potentially 5+ minutes later — and `✓ Firing up done` appears. In TTY environments, the static spinner character is written before the `spawnSync` call, but it never animates, giving the visual impression of a freeze.

## Goals / Non-Goals

**Goals:**
- Emit a plain-text progress line to stdout immediately before the npm install starts, visible in both TTY and non-TTY environments.
- Preserve `stdio: 'inherit'` so npm's own output continues to reach the terminal in TTY contexts.
- Follow test-driven development: update tests to assert the new message first, then implement.

**Non-Goals:**
- Adding a `--verbose` or `--debug` CLI flag to `create-skillet`.
- Converting the `spawnSync` call to async `spawn` for streaming.
- Animating the spinner (requires an async refactor and is out of scope).
- Changes to `@skillet-cli/ui` spinner API.
- Changes to `packages/core`, `packages/cli`, or any other package.
- Windows-specific behavior changes.

## Decisions

### Decision: Use `process.stdout.write` instead of `spinner.start` for the pre-install message

`spinner.start` is a no-op in non-TTY mode — which is precisely the environment where the issue was reported (Docker, CI container). A plain `process.stdout.write` bypasses the spinner entirely and is guaranteed to emit regardless of TTY state.

**Alternative considered:** Extend the spinner's non-TTY implementation to also print a line on `start`. Rejected: that would change the spinner API and affect every other `spinner.start` call in the codebase, which currently intentionally silence non-TTY start noise.

### Decision: Remove `spinner.start` / `spinner.succeed` for the install step; use plain writes only

Rather than keeping the spinner wrapper and adding a plain write before it, we remove both spinner calls for the install step and use two plain `process.stdout.write` calls:
1. A "starting" message before the `spawnSync` call.
2. A "done" confirmation message after the `spawnSync` call succeeds.

This avoids the `\r\x1b[2K` line-clearing behavior in TTY mode that would erase npm's last progress line.

**Alternative considered:** Keep `spinner.succeed` for the confirmation and only add a plain write before. Rejected: in TTY mode `spinner.succeed` clears the current line, which could clear npm's own last output line. Plain writes compose better with npm's inherited output stream.

### Decision: Message wording communicates expected duration

The message reads `Installing @skillet-cli/core (this may take a few minutes on first run)…\n` — the parenthetical sets expectations without alarming users who have a warm cache.

### Decision: No changes to `runSync`; the install step retains its own `spawnSync` call

The install step already uses `spawnSync` directly (not the `runSync` helper) because it was wrapped in spinner calls. Keeping it inline (or moving it to use `runSync`) is an implementation detail. The tests mock `spawnSync`, so either approach is testable. Inline is simpler and avoids touching `runSync`.

## Risks / Trade-offs

- **Risk: npm output interleaving with the confirmation message in TTY mode** → The install output goes directly to the terminal via `stdio: 'inherit'`. The post-install "done" write happens after `spawnSync` returns, so it appears after npm's output. No interleaving risk.
- **Risk: The "starting" message appearing even on a warm cache where the install is instant** → Acceptable. The message is informational. A fast install just means the confirmation message follows immediately.
- **Trade-off: We lose the spinner's `✓` prefix on the install confirmation** → Minor. Other steps keep their spinners. The install step's plain writes are consistent with the informational nature of the progress message.

## Migration Plan

No migration required. This is a purely additive output change. The install behavior (command, stdio mode, error handling) is unchanged.
