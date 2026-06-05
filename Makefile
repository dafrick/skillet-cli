.PHONY: devcontainer-build devcontainer-open devcontainer-rebuild

devcontainer-build:
	pnpm exec devcontainer build --workspace-folder .

devcontainer-open:
	code --folder-uri "vscode-remote://dev-container+$(shell printf '%s' $$(pwd) | xxd -p | tr -d '\n')/workspace"

devcontainer-rebuild:
	pnpm exec devcontainer build --workspace-folder . --no-cache
