## Context

`create-skillet` today produces an npm package. The `skills/<name>/SKILL.md` layout it generates is already structurally identical to what plugin systems expect — no conversion needed. Claude Code and Copilot CLI share one plugin format; Gemini CLI has its own. A skill author's GitHub repo can serve as its own marketplace by adding a `marketplace.json` that references itself with `"source": "./"`.

The design principle is: one set of files, two distribution paths. The plugin manifests are generated into the same repo as the npm package. Nothing the author already configured changes.

## Goals / Non-Goals

**Goals:**
- Generate `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` covering Claude Code and Copilot CLI
- Generate `gemini-extension.json` and `GEMINI.md` for Gemini CLI gallery (optional, off by default if no `contextFileName` can be inferred)
- Validate version consistency across all manifests in `create-skillet check`
- Validate git publish readiness in `create-skillet check`: clean working tree, git tag exists on remote
- Gate `npm publish` on the plugin side already being live (tag on remote) via `prepublishOnly`
- Print post-publish next steps via a `postpublish` lifecycle hook
- Show share commands in the wizard completion block so authors know what to give their users

**Non-Goals:**
- Submitting to any marketplace on the author's behalf (that remains a manual step)
- Creating GitHub Releases (warn about it for Gemini; author creates manually or via `gh`)
- Supporting the dedicated marketplace repo pattern (`create-skillet marketplace init`) — future
- Validating against live marketplace APIs
- Generating Cursor, Codex, or other adapter-specific plugin manifests — future, separate changes

## Decisions

### 1. One repo = one plugin + one marketplace (self-hosted model)

A skill author's GitHub repo contains both the plugin content and a `marketplace.json` that references itself. Users add the repo as a marketplace and install from it. No skillet-owned central repo. No third-party submission required to start distributing.

```
my-skill/
├── .claude-plugin/
│   ├── plugin.json        ← what gets installed
│   └── marketplace.json   ← makes this repo a marketplace
├── skills/
│   └── my-skill/
│       └── SKILL.md
├── gemini-extension.json  ← Gemini gallery entry (optional)
└── GEMINI.md              ← Gemini context file (optional)
```

`marketplace.json` always uses `"source": "./"` pointing to the same repo. This is the pattern superpowers uses for its development marketplace, confirmed in the wild.

_Alternative considered_: A `skillet-cli/marketplace` community repo that all authors PR into. Rejected: puts skillet in the middle, creates a bottleneck, and requires author trust in a third-party repo that skillet would need to moderate.

### 2. `plugin.json` skills array mirrors `package.json` skillet config

The existing `WizardConfig` already captures `skillDir` (single-skill) and `skillsParentDirs` (multi-skill). Plugin manifest generation reads from this — no new prompts for content layout.

```
Single-skill:  skillet.skillDir = "skills/my-skill"  →  "skills": ["./skills/my-skill"]
Multi-skill:   skillet.skills = ["skills/a","skills/b"] →  "skills": ["./skills/a","./skills/b"]
```

The `marketplace.json` version, name, and author fields are copied from the same wizard config that populates `package.json`.

### 3. Prompt: platform targeting, not file details

The wizard asks which platforms to target, not which files to generate. The file generation is derived from the choice.

```
Generate plugin manifests for marketplace distribution?
  ✓ Claude Code + Copilot CLI    (.claude-plugin/plugin.json + marketplace.json)
  ○ Gemini CLI                   (gemini-extension.json + GEMINI.md)
```

Claude Code + Copilot CLI defaults on when a GitHub remote is detected (both tools require a public GitHub repo to install from). Gemini defaults on under the same condition. If no remote is detected, both default off with an explanatory note.

The Gemini prompt is a separate checkbox because it generates different files and has a distinct publishing path (GitHub topic rather than marketplace registration).

### 4. GEMINI.md generation: only when needed

`gemini-extension.json`'s `contextFileName` field accepts any file path — it does not have to be `GEMINI.md`. For single-skill packages, the generator points `contextFileName` directly at the skill's `SKILL.md` and generates no extra file:

```json
{ "contextFileName": "skills/my-skill/SKILL.md" }
```

`GEMINI.md` is only generated for multi-skill packages, where it acts as an aggregator because `contextFileName` accepts only one file:

```markdown
@./skills/skill-a/SKILL.md
@./skills/skill-b/SKILL.md
```

In that case `contextFileName` is set to `"GEMINI.md"`. If a skill has additional reference files, the author extends `GEMINI.md` manually — out of scope here.

### 5. Publish ordering: plugin tag on remote must precede `npm publish`

`npm publish` is gated on the plugin side already being live. The intended author ceremony is:

```
1. Bump version in package.json, plugin.json, marketplace.json, gemini-extension.json
2. git commit "release v1.1.0"
3. git push origin main
4. git tag v1.1.0
5. git push origin v1.1.0
6. npm publish          ← prepublishOnly runs create-skillet check
```

`create-skillet check` verifies step 5 has happened before npm proceeds. If the tag is missing, check exits 1 with a clear remediation message — the author pushes the tag and retries.

_Failure mode_: if npm publish fails after the tag is already live, the plugin marketplace is at v1.1.0 but the npm package is not. This is transient and recoverable by retrying `npm publish`. It is preferable to the reverse (npm live, no tag) which leaves plugin installs permanently unversioned.

_Alternative considered_: npm-first, tag in `postpublish`. Rejected: leaves a window where plugin installs are unversioned if the post-publish step is interrupted; also loses the ability to abort npm publish if the plugin side isn't ready.

### 6. `create-skillet check` extended with version and git readiness

**Version alignment** (exits 1 on mismatch):
- `.claude-plugin/plugin.json` → `version` must equal `package.json` version
- `.claude-plugin/marketplace.json` → `metadata.version` (optional field; checked only if present)
- `gemini-extension.json` → `version` must equal `package.json` version

**Path existence** (exits 1 on missing):
- Each path in `plugin.json` `skills` array → must be a directory containing `SKILL.md`
- `gemini-extension.json` `contextFileName` → must resolve to a real file

**Git readiness** (exits 1 on failure; only when plugin manifests exist):
- Working tree is clean — no uncommitted changes (`git status --porcelain`)
- A git remote named `origin` exists
- Tag `v{version}` exists on the remote (`git ls-remote origin refs/tags/v{version}`)

Git readiness checks require a network call (`git ls-remote`). If the remote is unreachable, check exits 1 with a message to verify the tag manually rather than a generic failure.

All plugin checks are silently skipped when no plugin manifests exist, preserving backward compatibility for npm-only repos.

### 7. `postpublish` lifecycle hook: `create-skillet post-publish`

After successful `npm publish`, a `postpublish` script prints remaining steps. It performs no git operations — the tag is already live by the time npm publish runs.

```
postpublish: create-skillet post-publish
```

Output:
```
Plugin marketplace live at v1.1.0
  claude plugin install my-skill@my-skill
  copilot plugin install my-skill@my-skill

Gemini: create a GitHub Release to mark this as the latest version:
  gh release create v1.1.0
  (or via github.com — Gemini's gallery checks for the Latest release)
```

The Gemini GitHub Release step is a reminder, not an enforced check. Gemini installs still work from the tag; the release is only needed for the gallery's "Latest" badge and auto-update detection.

`create-skillet post-publish` is wired into `package.json` by `executeScaffold()` alongside the existing `prepublishOnly` script.

### 8. Completion block: share commands, not a tutorial

The post-wizard output adds a short block only when plugin manifests were generated:

```
Plugin marketplace ready:
  Share with your users:
    claude plugin marketplace add <owner>/<repo>
    claude plugin install <skill-name>@<skill-name>

  Copilot CLI (same commands, replace 'claude' with 'copilot')

  Gemini: add topic 'gemini-cli-extension' to your GitHub repo
          then users install via: gemini extensions install <github-url>

  Before each release: git tag v{version} && git push origin v{version}
```

The `<owner>/<repo>` is derived from `repository.url` collected in the wizard. If no remote is set, this block is omitted.

## Open Questions

- Should the Gemini `GEMINI.md` import the skill's `SKILL.md` directly, or the whole skill directory using a glob? Current design: direct import of `SKILL.md` only — simpler and matches the superpowers pattern.
