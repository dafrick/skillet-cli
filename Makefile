.PHONY: build clean run watch test test-unit test-integration test-e2e test-coverage lint format typecheck

build:
	pnpm build

clean:
	rm -rf packages/core/dist packages/core/coverage

run: build
	node packages/core/bin/cli.js --help

watch:
	pnpm --filter @skillet-cli/core exec tsc --watch

test:
	pnpm test

test-unit:
	pnpm test:unit

test-integration:
	pnpm test:integration

test-e2e:
	pnpm test:e2e

test-coverage:
	pnpm test:coverage

lint:
	pnpm lint

format:
	pnpm format

typecheck:
	pnpm typecheck
