# Skillet Vision

## What We're Building

Skills are structured files that teach AI agents how to accomplish specific tasks. Every AI environment — Claude Code, GitHub Copilot, Gemini CLI, Codex, Cursor — has its own install path, its own conventions, its own update story. Every skill author would have to solve this from scratch.

Skillet solves it once. Authors ship a small npm package; end users run it to install, update, and uninstall skills in any agent environment.

## Who We Serve

**Skill authors** — developers who write prompts, workflows, and agent instructions and want to share them. They should be able to publish a polished, installable skill without becoming experts in npm packaging, agent environment paths, or CLI ergonomics.

**Skill users** — people who install skills into their agent environments. They should get a consistent, guided experience regardless of which agent they use or which skill they install.

## Our Role

We handle everything between "I wrote a skill" and "my users have it installed and up to date":

- Package scaffolding and lifecycle management (`create-skillet`)
- Agent environment detection and path resolution
- Install, update, drift detection, and uninstall
- The full CLI UX — prompts, output, error messages, progress

Authors write great skills. Users install them easily. We take care of the rest.

## Design Principles

**One dependency ships a complete installer.** Add `@skillet-cli/core`, call `run()`. The CLI, prompts, adapters, drift detection, and UX are all included. Nothing else to wire up.

**Standard package distribution.** Skills ship as npm packages via any compatible registry. Skillet adds an installer, not a new distribution channel. Your existing publish workflow is enough.

**UX is skillet's job, not yours.** Everything that makes an installer feel polished — scope selection, auto-detection, drift detection, update prompts, rich terminal output — comes out of the box. The UX principles that govern how we build these experiences live in `docs/ux-principles.md`.

**Broad reach that expands over time.** Skillet ships with adapters for Claude Code, GitHub Copilot, Gemini CLI, Codex, Cursor, and generic agents. As the ecosystem grows, so does adapter support — without changes to your skill.
