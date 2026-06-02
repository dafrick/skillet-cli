## Context

Contributors needed to know exact pnpm filter syntax and raw node invocation paths to perform common tasks. The commands are stable but not memorable, and any underlying change (e.g., switching from tsc to esbuild) would require updating documentation in multiple places.

## Goals / Non-Goals

**Goals:**
- Provide a single, stable set of `make` targets that wrap all common dev commands
- Keep `CONTRIBUTING.md` pointing at targets rather than raw commands so the docs stay valid when implementation changes

**Non-Goals:**
- Replacing pnpm scripts (the Makefile delegates to them, not around them)
- CI integration (CI continues to call pnpm scripts directly)
- Cross-platform support beyond standard Unix make

## Decisions

**Delegate to pnpm scripts, don't duplicate logic.**
All Makefile targets call the existing root-level pnpm scripts. This keeps a single source of truth and means the Makefile is just a stable alias layer.

**`make run` calls `--help` rather than a subcommand.**
The CLI requires a subcommand to do anything meaningful; running without one exits 1. `--help` exits 0 and confirms the binary built and starts correctly, making it a valid smoke test without requiring interactive input.

**`make clean` targets `dist/` and `coverage/`.**
These are the only generated output directories. `node_modules/` is managed by pnpm and intentionally excluded.

## Risks / Trade-offs

- `make` may not be installed on Windows — acceptable given the Node.js 24+ and pnpm requirement already imply a Unix-friendly environment
- Adds a thin indirection layer; contributors must know to look at the Makefile when a target changes behavior
