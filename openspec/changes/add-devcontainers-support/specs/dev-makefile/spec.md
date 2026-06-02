## ADDED Requirements

### Requirement: Makefile provides a devcontainer-build target
The `Makefile` SHALL include a `devcontainer-build` target that builds the dev container image locally using `@devcontainers/cli`, without pushing to any registry.

#### Scenario: Image is built locally
- **WHEN** a contributor runs `make devcontainer-build`
- **THEN** Docker pulls the pre-built base image and applies devcontainer features; the resulting image is available in the local Docker daemon

#### Scenario: Build does not push to a registry
- **WHEN** a contributor runs `make devcontainer-build`
- **THEN** no image is pushed to any remote registry

---

### Requirement: Makefile provides a devcontainer-open target
The `Makefile` SHALL include a `devcontainer-open` target that opens the project in VS Code using the dev container, building the image first if it does not exist.

#### Scenario: VS Code opens in container
- **WHEN** a contributor runs `make devcontainer-open`
- **THEN** VS Code opens with the project inside the running dev container

---

### Requirement: Makefile provides a devcontainer-rebuild target
The `Makefile` SHALL include a `devcontainer-rebuild` target that forces a full rebuild of the container image with no Docker cache.

#### Scenario: Rebuild ignores cache
- **WHEN** a contributor runs `make devcontainer-rebuild`
- **THEN** Docker builds the image from scratch, ignoring any cached layers
