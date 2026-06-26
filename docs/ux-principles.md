# Skillet UX Principles

These principles apply to all skillet packages — `@skillet-cli/core`, `create-skillet`, and any future tooling in this ecosystem.

For visual design (color palette, output patterns, verb reference, wordmark), see the Ember & Iris design system at `docs/design/cli-design-system.html`.

---

## Our Goal

Make users successful by handling complexity on their behalf. Skill authors should be able to publish, expand, and maintain their skills. End users should be able to install, update, and manage skills across agent environments. Neither group should need to understand what is happening under the hood to do this well.

We handle the package mechanics, the file management, the environment detection — everything. Their job is to write great skills and use them.

---

## Failure Modes

These are unambiguous signals that a design has gone wrong:

- **The user must run npm commands** to accomplish something (the sole exception is `npm publish`, which is intentionally left to the user as an irreversible, credentialed action)
- **The user must edit files** beyond simple, self-evident content they authored themselves (e.g., writing skill prompt files is fine; manually editing `package.json` fields or `files` arrays is not)
- **The user is left without guidance** after an error

If a proposed spec or design requires either of the first two, it is solving the wrong problem — reconsider the approach.

---

## Principles

### 1. We handle complexity; users provide intent

Automation over instruction. If a task can be automated, it must be. Users tell us what they want to accomplish; we figure out the how.

When a user wants to expand their published skill to include a new directory, the right answer is a command that does it — not documentation explaining which npm command to run and what array index to use.

### 2. Multiple paths to success

If there are multiple intuitive ways to approach a task, all of them must work correctly. Do not force users down a single path or punish the intuitive one.

Design for the user who doesn't know the "right" sequence — they will try what seems reasonable, and that should succeed.

### 3. Consent before irreversible actions

Before overwriting or resetting user-modified content:

1. Detect whether the content was modified (not just whether it exists)
2. Prefer merge over discard — if modifications can be reconciled with the new content, attempt it
3. Fall back to explicit consent — show what will change and ask
4. Always report what happened

This applies to any file we own that the user might also touch, and to any metadata we collect and write back (especially versioned fields).

### 4. Progressive disclosure

Output should be clean and compact by default. Show the top-level picture; provide tools to go deeper when needed.

For example, when showing what changed in an install, show which directories were affected — not every individual file. Let the user ask for the detail if they want it. The CLI should feel neat and focused, not like a log file.

### 5. Clarity where it matters

Reserve detailed output for moments of anxiety or consequence. Before publishing, show everything that will be included in the tarball — users need to verify nothing inappropriate is going out. Before a destructive action, confirm. After a successful routine operation, be quiet.

The rule is not "always be verbose" or "always be brief" — it is "match the level of information to the stakes of the moment."

### 6. Actionable errors

When something fails, tell the user what to do next or how to diagnose the problem. A useful error has two parts: what went wrong, and the concrete next step to recover or investigate.

Never leave the user stranded with a generic failure message.

### 7. Prefer interactive over sequential

When a task involves multiple steps or decisions, prefer a single interactive command that guides the user through them. Avoid designs that require the user to run multiple commands in sequence to accomplish one logical goal.

---

## Anti-Patterns

| Anti-pattern | Principle violated |
|---|---|
| Instructing users to run tool-internal commands (npm, git, etc.) | We handle complexity |
| Printing steps that require the user to know an internal detail (array index, flag name, field path) | We handle complexity |
| Silently overwriting user-modified content | Consent |
| Not checking for modifications before overwriting | Consent |
| Dumping every file or line when a summary would do | Progressive disclosure |
| Equal verbosity for publish and routine status | Clarity where it matters |
| Error output with no recovery step or diagnostic pointer | Actionable errors |
| Requiring multiple sequential commands for one logical operation | Prefer interactive |
| Documenting a workaround instead of fixing the underlying gap | We handle complexity |
