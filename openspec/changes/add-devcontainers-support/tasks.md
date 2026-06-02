## 1. Project Setup

- [ ] 1.1 Create `.devcontainer/` directory at repo root
- [ ] 1.2 Add `@devcontainers/cli` as a dev dependency in root `package.json`
- [ ] 1.3 Run `pnpm install` to update lockfile

## 2. devcontainer.json

- [ ] 2.1 Create `.devcontainer/devcontainer.json` with `"image": "mcr.microsoft.com/devcontainers/typescript-node:24-bookworm"`
- [ ] 2.2 Add `features` block: `ghcr.io/devcontainers/features/github-cli:1` (latest) and `ghcr.io/anthropics/devcontainer-features/claude-code:1.0`
- [ ] 2.3 Set `"remoteUser": "node"`, `"workspaceMount"`, and `"workspaceFolder": "/workspace"`
- [ ] 2.4 Add `"mounts"` with: `~/.gitconfig` read-only bind-mount at `/home/node/.gitconfig` (active by default), plus a commented-out bind-mount for `~/.claude` (`source=${localEnv:HOME}/.claude,target=/home/node/.claude,type=bind`) with inline explanation of the tradeoff
- [ ] 2.5 Set `"containerEnv"` with: `GH_TOKEN: "${localEnv:GH_TOKEN}"` and `DEVCONTAINER: "true"`
- [ ] 2.6 Set `"postCreateCommand": "corepack enable && corepack install && pnpm install"`
- [ ] 2.7 Add `"customizations.vscode.extensions"`: `anthropic.claude-code`, `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `eamodio.gitlens`, `vitest.explorer`, `streetsidesoftware.code-spell-checker`
- [ ] 2.8 Add `"customizations.vscode.settings"`: `editor.formatOnSave`, default terminal bash, `typescript.tsdk` pointing to workspace TypeScript

## 3. Makefile Targets

- [ ] 3.1 Add `devcontainer-build` target: `pnpm exec devcontainer build --workspace-folder .`
- [ ] 3.2 Add `devcontainer-open` target: `code --folder-uri "vscode-remote://dev-container+$(shell printf '%s' $$(pwd) | xxd -p | tr -d '\n')/workspace"`
- [ ] 3.3 Add `devcontainer-rebuild` target: `pnpm exec devcontainer build --workspace-folder . --no-cache`
- [ ] 3.4 Add all three targets to `.PHONY`

## 4. Documentation

- [ ] 4.1 Create `.devcontainer/README.md` covering: prerequisites (Docker Desktop, VS Code Dev Containers extension), step-by-step "Reopen in Container" instructions, how to set `GH_TOKEN` in the host environment, how to run `claude` inside the container, the optional `~/.claude` bind-mount for auth persistence, and a note that `make devcontainer-build/rebuild` are available for headless use
- [ ] 4.2 Update `CONTRIBUTING.md` with a short "Dev Container" section: one sentence recommending the container as the default environment, and a link/path to `.devcontainer/README.md`

## 5. Verification

- [ ] 5.1 Run `make devcontainer-build` and confirm it completes without errors
- [ ] 5.2 Open the project in VS Code via "Reopen in Container" and verify the terminal runs as `node` inside `/workspace`
- [ ] 5.3 Confirm `claude --version`, `pnpm --version`, and `gh --version` all exit 0 inside the container
- [ ] 5.4 Confirm `echo $DEVCONTAINER` returns `true` inside the container (set via `containerEnv`)
- [ ] 5.5 Make a test git commit inside the container and confirm author name/email match host identity
- [ ] 5.6 Run `make devcontainer-rebuild` and confirm it completes with no cache
