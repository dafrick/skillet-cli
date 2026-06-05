## Why

Contributors currently set up their development environment manually — installing the right Node version, pnpm, and global tools by hand. This leads to "works on my machine" drift and makes it harder for AI coding agents (Claude Code and others) to operate consistently inside the project. Dev containers solve both: a pre-built Microsoft image with Node 24 and TypeScript tooling gives everyone an identical environment, agents run inside the container where they have the correct tools and can be given broader permissions safely, and a `.devcontainer/README.md` makes onboarding self-contained.

## What Changes

- Add `.devcontainer/devcontainer.json` using the pre-built `mcr.microsoft.com/devcontainers/typescript-node:24-bookworm` image; no custom Dockerfile required
- `devcontainer.json` adds Claude Code and the gh CLI via devcontainer features, runs `pnpm install` on first start, configures VS Code extensions and settings, and mounts the workspace at `/workspace`
- Git identity carried in via a read-only `~/.gitconfig` bind-mount; GitHub auth via `GH_TOKEN` env var so agents can make commits and open PRs from inside the container
- Optional mounts (e.g. agent config directories) documented as commented-out examples in `devcontainer.json`
- Add `.devcontainer/README.md` with step-by-step VS Code setup instructions and agent usage guidance
- Add a short mention and link in `CONTRIBUTING.md` pointing contributors to the dev container as the recommended environment
- Add Makefile targets that abstract container operations

## Capabilities

### New Capabilities

- `devcontainer-environment`: The `.devcontainer/` directory — `devcontainer.json` and `README.md` — that defines the pre-built, fully-tooled dev container for VS Code and AI agents

### Modified Capabilities

- `dev-makefile`: New targets for building and managing the dev container locally (`devcontainer-build`, `devcontainer-open`, `devcontainer-rebuild`)
- `contributor-docs`: `CONTRIBUTING.md` updated with a dev container section pointing to `.devcontainer/README.md`

## Impact

- **New files**: `.devcontainer/devcontainer.json`, `.devcontainer/README.md`
- **Modified**: `Makefile`, `CONTRIBUTING.md`
- **Dependencies**: Docker Desktop required at runtime; `@devcontainers/cli` added as a dev dependency for headless Makefile targets
- **No breaking changes** — entirely additive; existing local development workflow unchanged
