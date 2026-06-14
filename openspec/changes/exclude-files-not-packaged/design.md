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

### Decision 3: Use `npm pkg set files[]=...` in scaffold — not a `.npmignore`

**Chosen**: Append `npm pkg set files[]=bin` and `npm pkg set files[]=${config.skillDir}` to `executeScaffold`'s npm command sequence.

**Alternatives considered**:
- Write a `.npmignore`: blocklist approach; new files are included by default, which keeps the credential-leak risk.
- Directly write `files` into `package.json` via `JSON.parse`/`JSON.stringify`: violates the existing constraint that the wizard uses only native npm commands.

**Rationale**: `files` is an allowlist — only the listed entries are published. Aligns with existing scaffold pattern of using `npm pkg set` exclusively. Safer by default.

### Decision 4: Display file tree preview in wizard Step 5 (NPM preview)

**Chosen**: In `run.ts`, after config prompts and before the confirmation gate, list the skill directory contents, annotating excluded entries and confirming which paths will be in `files`.

**Alternatives considered**:
- Emit preview after confirmation: too late to be useful.
- New separate step: unnecessary complexity; the NPM preview step already exists as a natural place for this.

**Rationale**: The user already sees a summary of npm commands at the NPM preview step. Adding the file inclusion list there provides full context before they commit.

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
