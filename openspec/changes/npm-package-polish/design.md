## Context

`@skillet-cli/core` is published as a library that skill authors depend on. The npm package page is the first stop for anyone evaluating the library — it currently shows only the package name, version, and a blank description area. There is a root `README.md` written for the monorepo as a whole; it covers both end users and skill authors and is not suitable to ship as the package README verbatim.

## Goals / Non-Goals

**Goals:**
- Skill authors can read installation steps and the full API on the npm package page without leaving npmjs.com
- The npm sidebar shows repository link, homepage, license, and keywords
- The README lives in version control alongside the code it documents
- No CI or publish workflow changes are required

**Non-Goals:**
- Generating the README from code (no tooling integration)
- Keeping the package README and root README in sync automatically (manual maintenance; they serve different audiences)
- Documenting end-user CLI commands in the package README (that is the skill author's job)

## Decisions

### Decision: Package-scoped README, not a symlink or copy of the root

**Chosen**: `packages/core/README.md` — a standalone file written specifically for skill authors (library consumers), covering installation, the `run()` API, and RunOptions.

**Alternatives considered**:
- *Symlink `packages/core/README.md → ../../README.md`*: npm follows symlinks and would publish the root README. Rejected because the root README is monorepo-oriented and contains sections (Design Principles, end-user usage, contributing) that are noise for an npm consumer.
- *Copy root README into core on publish via a `prepack` script*: Would keep them automatically synced but introduces a fragile script, makes `packages/core/README.md` absent from the working tree (confusing), and complicates review. Not worth the complexity for one file.

**Result**: Two maintained files with overlapping content. The "Building with @skillet-cli/core" section of the root README and the package README's body will be kept in sync manually. This is the standard practice for monorepos (e.g., Radix UI, TanStack, Zod).

### Decision: No changes to `files` array

npm automatically includes `README.md`, `LICENSE`, and `CHANGELOG.md` in published tarballs regardless of the `files` field. Adding `packages/core/README.md` to the repo is sufficient — no publish workflow changes needed.

### Decision: Metadata values

| Field | Value | Rationale |
|---|---|---|
| `license` | `"MIT"` | Matches `LICENSE` file at repo root |
| `repository` | `{ type: "git", url: "..." }` | Object form is preferred; enables `npm repo` command |
| `homepage` | GitHub repo URL | Landing page for the project |
| `bugs` | GitHub issues URL | Standard for npm; enables `npm bugs` command |
| `keywords` | `["ai", "agents", "skills", "claude", "copilot", "cli", "installer"]` | Terms a skill author would search on npm |

## Risks / Trade-offs

- **Drift between root README and package README** → Mitigation: add a note in CONTRIBUTING.md that both files must be updated when the public API changes. The overlap is small (the RunOptions table and the minimal example).
- **Keywords become stale as supported agents expand** → Mitigation: keywords are updated in the same PR that adds a new adapter, since that PR already touches `package.json`.
