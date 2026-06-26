# Skillet UX Principles

These principles apply to all skillet packages — `@skillet-cli/core`, `create-skillet`, and any future tooling in this ecosystem.

For visual design (color palette, output patterns, verb reference, wordmark), see the Ember & Iris design system at `docs/design/cli-design-system.html`.

---

## Our Goal

Make users successful by handling complexity on their behalf. Skill authors should be able to publish, expand, and maintain their skills. End users should be able to install, update, and manage skills across agent environments. Neither group should need to understand what is happening under the hood to do this well.

We handle the package mechanics, the file management, the environment detection — everything. Their job is to write great skills and use them.

---

## Principles

### 1. Tools explain themselves

Users should be able to pick up any skillet tool and succeed without reading documentation first. Commands, prompts, and output should be self-describing — a user who just runs the command and reads what appears should understand what is happening and what to do next.

If users need to consult external docs to accomplish a basic task, the tool hasn't done its job.

### 2. We handle complexity; users provide intent

Automation over instruction. If a task can be automated, it must be. Users tell us what they want to accomplish; we figure out the how.

When a user wants to expand their published skill to include a new directory, the right answer is a command that does it — not documentation explaining which npm command to run and what array index to use.

### 3. Multiple paths to success

If there are multiple intuitive ways to approach a task, all of them must work correctly. Do not force users down a single path or punish the intuitive one.

Design for the user who doesn't know the "right" sequence — they will try what seems reasonable, and that should succeed.

### 4. Consent before irreversible actions

Before overwriting or resetting user-modified content:

1. Detect whether the content was modified (not just whether it exists)
2. Prefer merge over discard — if modifications can be reconciled with the new content, attempt it
3. Fall back to explicit consent — show what will change and ask
4. Always report what happened

This applies to any file we own that the user might also touch, and to any metadata we collect and write back (especially versioned fields).

### 5. Progressive disclosure

Output should be clean and compact by default. Show the top-level picture; provide tools to go deeper when needed.

For example, when showing what changed in an install, show which directories were affected — not every individual file. Let the user ask for the detail if they want it. The CLI should feel neat and focused, not like a log file.

### 6. Clarity where it matters

At moments of anxiety or consequence — publishing, destructive actions — ensure the user has exactly what they need to make a confident decision. Progressive disclosure still applies: keep the output clean and focused, with the option to expand. What changes at high-stakes moments is that the relevant information is made prominent and the user can confirm before proceeding.

The rule is not verbosity when stakes are high — it is clarity when clarity matters.

### 7. Actionable errors

When something fails, tell the user what to do next or how to diagnose the problem. A useful error has two parts: what went wrong, and the concrete next step to recover or investigate.

Never leave the user stranded with a generic failure message.

### 8. Prefer interactive over sequential

When a task involves multiple steps or decisions, prefer a single interactive command that guides the user through them. Avoid designs that require the user to run multiple commands in sequence to accomplish one logical goal.

---

## Failure Modes

These are unambiguous signals that a design has gone wrong:

- **The user must run npm commands** to accomplish something (the sole exception is `npm publish`, which is intentionally left to the user as an irreversible, credentialed action)
- **The user must edit files** beyond simple, self-evident content they authored themselves (e.g., writing skill prompt files is fine; manually editing `package.json` fields or `files` arrays is not)
- **The user is left without guidance** after an error

If a proposed spec or design requires either of the first two, it is solving the wrong problem — reconsider the approach.

---

## Anti-Patterns

| Anti-pattern | Principle violated |
|---|---|
| Requiring users to read docs before they can complete a basic task | Tools explain themselves |
| Output or prompts that don't explain what is happening or what to do next | Tools explain themselves |
| Instructing users to run tool-internal commands (npm, git, etc.) | We handle complexity |
| Printing steps that require the user to know an internal detail (array index, flag name, field path) | We handle complexity |
| Silently overwriting user-modified content | Consent |
| Not checking for modifications before overwriting | Consent |
| Dumping every file or line when a summary would do | Progressive disclosure |
| Treating a high-stakes action the same as a routine one — no focused confirmation | Clarity where it matters |
| Error output with no recovery step or diagnostic pointer | Actionable errors |
| Requiring multiple sequential commands for one logical operation | Prefer interactive |
| Documenting a workaround instead of fixing the underlying gap | We handle complexity |
