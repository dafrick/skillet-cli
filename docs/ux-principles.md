# Create-Skillet UX Principles

This document defines the UX principles that govern `create-skillet` design decisions. All proposals and specs should be evaluated against these principles. When a spec violates a principle, the spec is wrong — not the principle.

A concise version of these principles is embedded in `openspec/config.yaml` so AI agents have them at proposal and spec creation time.

---

## Who We Are Building For

Skill authors are people who have great ideas for AI skills but are **not necessarily experts in npm package mechanics**. They know what they want to accomplish — publish a skill, add a directory, update their package — but they should not need to know how npm's `files` array is indexed, or what `npm pkg set` does, or how `.npmignore` interacts with the `files` field.

Our job is to make them successful. Their job is to write great skills.

---

## Core Principles

### 1. One command per lifecycle stage

Every lifecycle stage (initial scaffold, expanding/updating, verifying, publishing) should be achievable through a single command. Authors should never need to chain obscure npm commands or know implementation details to accomplish a common task.

**What this means in practice:**
- If expanding a published skill requires updating the `files` array, `create-skillet` does it — the author doesn't type `npm pkg set 'files[2]=prompts/'`.
- If updating requires knowing the current `files` entries first, `create-skillet` reads them.
- Documentation that tells users to run raw npm commands is a failure mode, not a solution.

**Anti-pattern:** Printing "run `npm pkg set 'files[N]=new-dir/'`" in the wizard completion block. The user doesn't know what N is and shouldn't have to find out.

---

### 2. Multiple paths to success

If there are multiple ways a user might intuitively approach a task, all of them should work correctly. Do not force users down a single path. Punishing the intuitive path erodes trust.

**What this means in practice:**
- An author who re-runs `create-skillet` when they want to update their package should get the correct update behavior — not a fresh scaffold that clobbers their published version.
- An author who looks for `create-skillet update` should find it and get the same outcome.
- An author who just bumps the version and runs `npm publish` (for simple content additions) should also succeed, and we should tell them when that's the right move.

**Decision guide:** When designing a flow, ask "what would three different authors try first?" All three paths should either work or give a clear, helpful redirect.

---

### 3. Consent before destruction

Never silently destroy or reset user work. Before any action that overwrites user-modified content:

1. **Detect** whether the file has been modified by the user (not just whether it exists).
2. **Prefer merge**: if the modification can be merged with the new content, attempt it.
3. **Fall back to consent**: if merge fails or isn't applicable, show the diff/conflict and ask the user what to do.
4. **Always report**: tell the user what happened — whether merge succeeded, whether they chose to overwrite, etc.

**Concrete cases this principle applies to:**
- `.npmignore`: if the user added exclusions, detect them, try to merge new entries with existing content, warn if the merge is uncertain.
- `bin/cli.js`: always overwritten by re-run. Before overwriting, check if the user modified it (compare to the canonical generated content). If modified, warn explicitly and ask for consent.
- `package.json` fields (`name`, `version`, `description`, `author`): re-running the wizard re-collects and resets all of these. This is a footgun. Show current values, ask for confirmation before overwriting, especially for `version` (which maps to a published release).

**Anti-pattern:** Writing `.npmignore` only if it doesn't already exist. This is "safe" in the sense that it doesn't destroy data, but it's not good enough — on a re-run the file may be outdated and a merge is the right behavior.

---

### 4. Transparent actions

Show what will change before changing it. Summarize what was done after. Users should never wonder what just happened to their package.

**What this means in practice:**
- Before scaffold/update: a preview or summary of the changes about to be made.
- After scaffold/update: a summary of what was changed, what was preserved, what needs manual attention.
- When skipping an action (e.g., "`.npmignore` is unchanged — your exclusions were preserved"): say so.

---

### 5. Fail safely, succeed verbosely

On success: tell the user exactly what was done and what to do next — do not assume they remember the workflow from the first run.

On failure: give a clear, actionable error message. "Something went wrong" is not acceptable. The user should know what failed and have a concrete next step to recover.

---

## Anti-Patterns Catalogue

These are specific mistakes to avoid in proposals and specs:

| Anti-pattern | Principle violated | Better approach |
|---|---|---|
| Telling users to run `npm pkg set 'files[N]=...'` | #1 One command | Automate the `files` update in `create-skillet` |
| Silently not-overwriting a file because it exists | #3 Consent | Detect modifications, merge if possible, ask if not |
| Silently overwriting a user-modified file | #3 Consent | Detect, warn, ask |
| Resetting `version` without warning | #3 Consent | Show current value, require explicit confirmation |
| Documenting re-run as "safe" without caveats | #4 Transparency | List what will and won't change explicitly |
| Telling users to do X "manually" for a common task | #1 One command | Automate it |
| Only supporting one entry point for a common operation | #2 Multiple paths | Support all intuitive paths |
| Printing raw diffs without context | #4 Transparency | Explain what the diff means and what the user's options are |

---

## Design Principle Summary (for config.yaml)

> Target audience: skill authors who are not deeply familiar with npm internals. They know what they want to accomplish, not how to do it at the tool level.
>
> 1. **One command** — never require chaining npm commands; automate what can be automated.
> 2. **Multiple paths** — if there are multiple intuitive ways to do something, all must work.
> 3. **Consent before destruction** — detect modifications, prefer merge, fall back to explicit consent. Never silently reset.
> 4. **Transparent** — show what will change before; summarize what changed after.
> 5. **Fail safely** — clear errors with concrete recovery steps; verbose success with next steps.
