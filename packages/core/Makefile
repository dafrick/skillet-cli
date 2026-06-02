.PHONY: build clean watch test test-unit test-integration test-e2e test-coverage lint format typecheck

build:
	pnpm build

clean:
	rm -rf dist coverage

watch:
	pnpm exec tsc --watch --preserveWatchOutput

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
