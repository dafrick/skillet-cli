## Context

Skillet's install and publish pipelines both share a logical exclusion set (`.git`, `node_modules`, `.DS_Store`, `.skill-manifest.json`) but only the content-hashing path enforces it. `DEFAULT_IGNORE` in `packages/core/src/hash.ts` is an unexported `Set`; `copyTree()` in `packages/core/src/install.ts` passes no `filter` to `fs.cp`; and `executeScaffold()` in `packages/create/src/scaffold.ts` never sets the `files` allowlist in the generated `package.json`.

The result: installed skills pick up noise directories (`.git`, `node_modules`) and `npm publish` ships everything not in `.gitignore`, including potential credentials in local config files.

## Goals / Non-Goals

**Goals:**
- Apply the same exclusion set at install-copy time that is already applied at hash time
- Restrict what `create-skillet` publishes to only the `bin/` and skill content directories
- Show the user what will be published before they confirm the wizard
- Keep `DEFAULT_IGNORE` as the single source of truth for both hashing and copying

**Non-Goals:**
- Changing the hash algorithm or the composition of `DEFAULT_IGNORE`
- Adding `.npmignore` support
- Credential scanning
- Modifying what is excluded at hash time

## Decisions

### Decision 1: Export `DEFAULT_IGNORE` from `hash.ts` and import it in `install.ts`

**Chosen**: Export the existing `Set` from `hash.ts` and import it in `install.ts`.

**Alternatives considered**:
- Duplicate the list in `install.ts`: rejected — two lists will drift.
- Move the list to a shared constants file: heavier refactor than needed; the hash module is already the natural home for it.

**Rationale**: One export, zero duplication. The install module already imports from the hash module for `hashSkill`.

### Decision 2: Use `fs.cp` `filter` callback keyed on `path.basename`

**Chosen**: Pass `filter: (_src) => !DEFAULT_IGNORE.has(path.basename(_src))` to `fs.cp`.

**Alternatives considered**:
- Walk the tree manually with `fs.readdir` and skip ignored entries: more code, same outcome.
- Use a glob library: unnecessary dependency for a `Set` membership check.

**Rationale**: `fs.cp` `filter` receives the absolute source path; `path.basename` extracts the entry name. This mirrors how `collectFiles()` in `hash.ts` already skips entries by name.

**`fs.cp` filter semantics (important)**: The `filter` callback is invoked once per entry — both files and directories — as `fs.cp` recurses. When the callback returns `false` for a directory, the entire subtree under that directory is pruned (not descended into). This is exactly the behaviour we want for `node_modules/` and `.git/`: returning `false` stops recursion entirely, so their contents are never visited. The callback is also called with the root source directory itself as its very first invocation; because skill directory names (e.g. `skill/`) are never members of `DEFAULT_IGNORE`, this call always returns `true` and the copy proceeds normally. This per-entry, subtree-pruning behaviour matches how `collectFiles()` in `hash.ts` already skips entries by basename.

### Decision 3: Use `npm pkg set --json files=...` in scaffold — not a `.npmignore`

**Chosen**: Append `npm pkg set --json files='["bin","<skillDir>"]'` to `executeScaffold`'s npm command sequence, atomically replacing the entire `files` field.

**Alternatives considered**:
- Write a `.npmignore`: blocklist approach; new files are included by default, which keeps the credential-leak risk.
- Directly write `files` into `package.json` via `JSON.parse`/`JSON.stringify`: violates the existing constraint that the wizard uses only native npm commands.
- Use `npm pkg set files[]=bin` followed by `npm pkg set files[]=${config.skillDir}` (array-index append form): this does NOT clear a pre-existing `files` array — entries at indices beyond the last appended item survive, leaving the field in an inconsistent state when run against an existing `package.json`. Rejected.

**Rationale**: `files` is an allowlist — only the listed entries are published. Using `--json` with a literal JSON array always overwrites the field entirely, regardless of its prior contents. Aligns with the existing scaffold pattern of using `npm pkg set` exclusively. Safer by default.

### Decision 4: Display file tree preview in wizard Step 8 (after `setupSkillDir`)

**Chosen**: In `run.ts`, immediately after `setupSkillDir` completes (Step 7) and before the confirmation gate, list the skill directory contents, annotating excluded entries and confirming which paths will be in `files`.

**Alternatives considered**:
- Emit preview at the NPM preview step (Step 5): At Step 5, `setupSkillDir` has not yet run, so `config.skillDir` almost always does not exist on disk yet (files are still in the cwd root). The preview would always fall through to the "directory will be created" fallback, defeating its purpose.
- Emit preview after confirmation: too late to be useful.
- New separate step: unnecessary complexity.

**Rationale**: `setupSkillDir` populates the skill directory. Running the preview immediately after ensures the directory exists and its contents are accurate. The preview still appears before the final confirmation prompt, giving the user full context before they commit.

## Risks / Trade-offs

- **`fs.cp` filter API availability**: The `filter` option for `fs.cp` requires Node.js ≥ 16.7.0. The project already targets `engines.node >= 24`, so this is safe.
- **Skill dir edge case**: If `config.skillDir` begins with `./`, the `npm pkg set files[]=${config.skillDir}` command may produce a path like `./skill/` in `files`. npm normalises leading `./` in `files` entries, so this is benign.
- **Install-time filter is basename-only**: The filter skips any entry whose *name* matches `DEFAULT_IGNORE`. This means a file named `.DS_Store` anywhere in a nested subdirectory is also excluded. This is the intended behaviour (mirrors hashing) but worth noting.
- **No rollback for scaffold**: `npm pkg set files` modifies the user's `package.json` in place. If the user aborts mid-wizard after this step, they may have a partial `files` field. Existing behaviour for all `npm pkg set` commands in the scaffold — not a new risk.

## Migration Plan

No migration required. Both changes are additive at runtime:

1. Installing an existing skill after the patch will no longer copy `.git` / `node_modules`. The `postInstallHash` was already computed excluding those entries, so hashes remain consistent.
2. Existing generated `package.json` files that lack a `files` field are unaffected until users re-run `create-skillet` or add `files` manually.

## Open Questions

None. All decisions are resolved above.
