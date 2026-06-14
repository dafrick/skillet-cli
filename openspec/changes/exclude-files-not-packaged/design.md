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

### Decision 3: Use indexed-array `npm pkg set` args in scaffold — not `--json` and not `.npmignore`

**Chosen**: Append two `npm pkg set` calls — `npm pkg set "files[0]=bin" "files[1]=<skillDir>"` — to `executeScaffold`'s npm command sequence.

**Alternatives considered**:
- Write a `.npmignore`: blocklist approach; new files are included by default, which keeps the credential-leak risk.
- Directly write `files` into `package.json` via `JSON.parse`/`JSON.stringify`: violates the existing constraint that the wizard uses only native npm commands.
- Use `npm pkg set --json files='["bin","<skillDir>"]'`: the `--json` form requires the argument `files=["bin","./skill/"]`, which contains inner double quotes. `runSync` in `scaffold.ts` wraps every argument in double quotes (`'"' + a + '"'`) before joining them into a shell command, so the inner double quotes corrupt the value. Rejected.

**Rationale**: Indexed-array args (`files[0]=bin`, `files[1]=<skillDir>`) are plain strings with no inner quotes, safe with the existing `runSync` double-quote wrapping. `files` is an allowlist — only the listed entries are published — so the two-entry form gives the desired restriction.

**Assumption**: This assumes no pre-existing `files` entries beyond index 1 survive in the target `package.json`. `npm init -y` never sets a `files` field, so in the standard `create-skillet` fresh-project flow this is a non-issue. If a pre-existing `files` array had entries at indices 2+ they would survive; this edge case is acceptable because `create-skillet` always generates from scratch.

### Decision 4: Display file tree preview as a post-setupSkillDir informational summary

**Chosen**: In `run.ts`, immediately after `setupSkillDir` completes (Step 7), print a publish preview to stdout listing the skill directory contents and noting any entries excluded by the standard ignore set. This is an informational summary — the user has already confirmed and the skill directory is already populated at this point.

**Alternatives considered**:
- Emit preview before the confirmation gate (Step 5): The only confirmation gate in `run.ts` (`proceedFinal`) runs at Step 5, before `executeScaffold` and `setupSkillDir`. A preview at Step 5 would show an empty or non-existent skill directory, making it useless. Placing the preview "before confirmation" and "after setupSkillDir" are mutually exclusive — we choose accuracy over pre-confirmation placement.
- Emit preview at a new wizard step before Step 5: Would require prompting the user to manually move files first; overly complex.

**Rationale**: `setupSkillDir` populates the skill directory. Running the preview immediately after ensures the directory exists and its contents are accurate. The preview is still valuable as a post-completion summary: it shows the user exactly what was packaged and confirms no unwanted directories were included. The preview function is extracted as a standalone pure function so it can be unit-tested without spinning up inquirer's raw-mode prompt.

## Risks / Trade-offs

- **`fs.cp` filter API availability**: The `filter` option for `fs.cp` requires Node.js ≥ 16.7.0. The project already targets `engines.node >= 24`, so this is safe.
- **Skill dir leading `./`**: If `config.skillDir` begins with `./`, the resulting `files[1]=./skill/` value produces a path like `./skill/` in `files`. npm normalises leading `./` in `files` entries, so this is benign.
- **Install-time filter is basename-only**: The filter skips any entry whose *name* matches `DEFAULT_IGNORE`. This means a file named `.DS_Store` anywhere in a nested subdirectory is also excluded. This is the intended behaviour (mirrors hashing) but worth noting.
- **No rollback for scaffold**: `npm pkg set files` modifies the user's `package.json` in place. If the user aborts mid-wizard after this step, they may have a partial `files` field. Existing behaviour for all `npm pkg set` commands in the scaffold — not a new risk.

## Migration Plan

No migration required. Both changes are additive at runtime:

1. Installing an existing skill after the patch will no longer copy `.git` / `node_modules`. The `postInstallHash` was already computed excluding those entries, so hashes remain consistent.
2. Existing generated `package.json` files that lack a `files` field are unaffected until users re-run `create-skillet` or add `files` manually.

## Open Questions

None. All decisions are resolved above.
