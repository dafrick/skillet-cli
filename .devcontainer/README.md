# Dev Container

The skillet monorepo ships a dev container that gives you Node 24, pnpm, the GitHub CLI, and Claude Code — all pre-configured and ready to use.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running on your host
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension installed

## Getting Started

1. Clone the repository and open it in VS Code.
2. When prompted "Reopen in Container", click it. If the prompt doesn't appear, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Dev Containers: Reopen in Container**.
3. VS Code will pull the image, install features, and run `corepack enable && corepack install && pnpm install && pnpm exec lefthook install`. This takes **2–4 minutes on first start**; subsequent starts are fast because Docker caches the image layers.
4. Once the container is ready, open a terminal — you're working inside the container at `/workspace`.

## Git Configuration (`~/.gitconfig`)

The dev container bind-mounts your host `~/.gitconfig` file so that git commits inside the container use your host identity without any extra setup.

**Important:** `~/.gitconfig` must exist as a **file** on your host. If it doesn't exist and Docker creates a directory instead, git commands in the container will fail.

To ensure `~/.gitconfig` exists:

```sh
# If you haven't created a .gitconfig yet, initialize one
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Verify it exists
ls -l ~/.gitconfig
```

## GitHub Authentication (`GH_TOKEN`)

The container forwards `GH_TOKEN` from your host environment. This token is used by the GitHub CLI (`gh`) for operations like creating pull requests and listing issues.

**Set it on your host before opening the container:**

```sh
# Add to ~/.zshrc or ~/.bashrc
export GH_TOKEN=ghp_your_token_here
```

Then open (or reopen) the container — the value is injected via `containerEnv` at startup.

If `GH_TOKEN` is not set, the `gh` CLI will prompt for interactive login; in a container terminal you'll see this prompt and can authenticate interactively. Without a token or successful interactive login, you won't be able to create PRs or perform write operations against the GitHub API.

## Running Claude Code

Claude Code is installed automatically as a dev container feature. Once the container starts, open a terminal in VS Code and run:

```sh
claude
```

The environment variable `DEVCONTAINER=true` is set inside the container, which Claude Code can use to detect the containerized environment.

## Optional: Persist Claude Code Auth Across Rebuilds

By default, Claude Code auth lives only inside the container and is lost when you rebuild. To persist it, you can bind-mount your host `~/.claude` directory into the container.

In `.devcontainer/devcontainer.json`, find the commented-out mount and uncomment it:

```jsonc
"source=${localEnv:HOME}/.claude,target=/home/node/.claude,type=bind"
```

**Tradeoff:**

| Approach | Auth survives rebuild | Agent-agnostic |
|---|---|---|
| Env-var auth (`ANTHROPIC_API_KEY`) | Yes — set it on the host like `GH_TOKEN` | Yes — works with any AI tool |
| `~/.claude` bind-mount | Yes | No — ties the container config to Claude Code specifically |

Use the bind-mount if you work primarily with Claude Code and want to avoid re-authenticating after every rebuild. Use env-var auth if you want a portable, agent-agnostic setup.

## Headless Use and Makefile Targets

The root `Makefile` provides targets for building the container image outside of VS Code:

| Target | Description |
|---|---|
| `make devcontainer-build` | Build the image using the local `devcontainer.json` |
| `make devcontainer-rebuild` | Same as above but skips the Docker layer cache (full rebuild) |
| `make devcontainer-open` | Open VS Code connected to the running container via `vscode-remote://` URI; **requires the container to already be running** (useful for CLI-based launches) |

These are useful for pre-building the image in CI or verifying that the container definition builds cleanly before pushing.
