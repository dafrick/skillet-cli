## Why

Skillet has open GitHub issues that can be implemented autonomously — bugs with clear reproduction steps, minor enhancements with defined scope — but acting on them requires manual triage and kickoff every time. An autonomous loop prompt enables Claude Code to pick, implement, and deliver issue fixes end-to-end without human initiation, while surfacing blockers early and leaving clear state for human review.

## What Changes

- **New file**: `prompts/auto-issue.md` — a self-contained prompt for use with Claude Code's `/loop` command that drives an 8-phase autonomous issue lifecycle
- The prompt handles its own state via PR description (human-readable + machine-parseable), so multiple loop runs safely resume in-progress work
- No changes to existing CLI packages, tests, or CI configuration

## Capabilities

### New Capabilities

- `auto-issue-agent`: End-to-end autonomous GitHub issue lifecycle — triage, workspace setup, exploration, OpenSpec proposal, implementation with TDD, code review, CI monitoring, and PR handoff

### Modified Capabilities

## Impact

- Adds `prompts/` directory at repo root
- Requires OpenSpec and superpowers skills to be installed in the Claude Code environment
- Requires `gh` CLI authenticated with repo write access
- No runtime or package changes
