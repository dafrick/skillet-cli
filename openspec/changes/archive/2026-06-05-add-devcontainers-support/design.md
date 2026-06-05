## Context

Skillet is a pnpm TypeScript monorepo targeting Node 24 and TypeScript 6. Contributors currently set up their environment manually, causing version drift. AI coding agents like Claude Code run on the host by default — they can't be safely given broad autonomy and operate with whatever happens to be installed locally.

Dev containers solve both: VS Code attaches its terminal and language servers to a running Docker container, and the agent executes inside it. The key design challenge is making this seamless — the agent should work inside the container without the user needing to intervene, and git/GitHub operations should work from inside the container just as they do on the host.

## Goals / Non-Goals

**Goals:**

- No custom Dockerfile to maintain — use a well-maintained pre-built image
- pnpm, git, gh CLI, and Claude Code available immediately inside the container
- Agents run inside the container; git identity and GitHub auth work from inside via env/config
- Workspace bind-mount only by default; optional mounts documented as commented examples for contributors who want them
- `.devcontainer/README.md` with clear VS Code setup steps and agent usage guide
- `CONTRIBUTING.md` updated with a short dev container section
- Makefile targets abstract all container operations

**Non-Goals:**

- Custom Dockerfile or egress firewall (additive later if needed)
- Multi-architecture builds or CI runner containers
- GitHub Codespaces optimization (the setup works there, but it's not optimized for it)
- Replacing the existing local dev workflow — entirely opt-in
- Persisting agent tool state across rebuilds by default (agents re-authenticate; token via env var is the recommended path)

## Decisions

### 1. Pre-built image over custom Dockerfile

`mcr.microsoft.com/devcontainers/typescript-node:24-bookworm` includes Node 24, npm, git, common utilities, and VS Code server hooks. Maintaining a custom Dockerfile adds ongoing overhead for a team that doesn't need it yet. We add the one missing piece (gh CLI) via a devcontainer feature, and run pnpm setup in `postCreateCommand`. This matches the OpenSpec pattern and keeps the config minimal.

**If a custom Dockerfile is ever needed** (e.g., pinned tool versions, egress firewall, non-npm package installs), it's a straightforward addition: add a `Dockerfile` to `.devcontainer/` and change `"image"` to `"build": { "dockerfile": "Dockerfile" }` in `devcontainer.json`.

**Alternatives considered**: custom Dockerfile from `node:20` (more control, more maintenance); Anthropic reference container (opinionated toward Claude Code specifically, includes firewall machinery we don't need yet).

### 2. Node 24 + TypeScript 6

`24-bookworm` is the Node 24 variant of the MS devcontainers TypeScript image (Debian Bookworm base). TypeScript 6 is a project dependency, not an image-level concern — it arrives via `pnpm install` from `package.json`. The container handles the runtime; the project handles the compiler.

### 3. pnpm via corepack in postCreateCommand

The pre-built image includes Node 24 and npm but not pnpm. We run `corepack enable && corepack install && pnpm install` in `postCreateCommand` so that on first container open, pnpm is activated and all project dependencies are installed. `corepack install` reads the `"packageManager"` field from `package.json` and activates that exact pinned version — no registry call, no version drift. This follows the OpenSpec pattern and means the container is immediately usable, including for agents.

### 4. Workspace bind-mount only by default; optional mounts as comments

The workspace mount (`source=${localWorkspaceFolder},target=/workspace`) is the only default mount. This is the minimal, agent-agnostic baseline — it works for any agent, any IDE, and carries the project's `.claude/` directory (project-level settings) naturally.

The `~/.gitconfig` bind-mount (active by default, see Decision 5) is the only non-workspace default mount. An optional bind-mount for `~/.claude` is documented as a commented-out example for contributors who want Claude Code auth to persist across rebuilds; commented out because it's agent-specific and not the recommended default (env var auth is preferred).

**Why no `~/.claude` volume by default**: it couples the container to one agent's config format. Using `ANTHROPIC_API_KEY` (or equivalent) in `containerEnv` is agent-agnostic, survives rebuilds with no special mount, and works identically in Codespaces.

### 5. Git identity via `~/.gitconfig` bind-mount; GitHub auth via `GH_TOKEN`

Agents run inside the container and make git commits and gh CLI calls from there. SSH keys are not mounted (security boundary). Instead:

- `~/.gitconfig` bind-mounted read-only at `/home/node/.gitconfig` gives git the correct author name and email without any secrets
- `GH_TOKEN` set as a `containerEnv` entry (value via `${localEnv:GH_TOKEN}`) lets the gh CLI authenticate for PR creation, issue management, etc. — the token is sourced from the host env, never hardcoded

This is agent-agnostic: any agent that calls `git commit` or `gh pr create` inside the container gets the right identity and auth automatically.

### 6. Claude Code installed via devcontainer feature

Adding `"ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {}` to `features` installs Claude Code and the VS Code extension without any Dockerfile changes. This is the recommended Anthropic path for pre-built images and auto-updates Claude Code on container rebuild.

### 7. DEVCONTAINER env var set explicitly in containerEnv

`DEVCONTAINER=true` is set explicitly via `containerEnv` rather than relying on the base image or extension to inject it. VS Code's devcontainer extension does not guarantee this variable; the base image may or may not include it. Setting it ourselves makes the signal reliable and agent-agnostic — any agent that checks `DEVCONTAINER` gets a consistent answer regardless of which image variant or tool opens the container.

### 8. Documentation in .devcontainer/README.md + CONTRIBUTING.md mention

Setup instructions for VS Code and agent usage guidance live in `.devcontainer/README.md` — discoverable without leaving the directory, same pattern as OpenSpec. `CONTRIBUTING.md` gets a short section with one sentence of context and a link. This keeps documentation close to the configuration it describes.

## Risks / Trade-offs

- **Docker Desktop required** → Mitigation: documented prerequisite in `CONTRIBUTING.md` and the devcontainer README; existing local workflow unchanged
- **First container start is slow** (~2–4 min for image pull + pnpm install) → Mitigation: subsequent starts are fast (image is cached, only pnpm install repeats); note this in the README
- **GH_TOKEN must exist in host env** → Mitigation: README explains how to set it; gh CLI degrades gracefully (read-only ops work without it)
- **No auth persistence by default** — agents re-authenticate on rebuild → Mitigation: README documents the optional `~/.claude` mount and/or `ANTHROPIC_API_KEY` env var for contributors who want persistence

## Open Questions

None — all questions from the initial draft are resolved:
- `pnpm install` in `postCreateCommand`: yes (matches OpenSpec, ensures deps are ready)
- `managed-settings.json`: no (leave to individual contributors)
