## Context

Cursor IDE has two project-level auto-load surfaces:
1. **`.cursor/rules/*.mdc` files** — YAML-frontmatter markdown files; auto-loaded by Cursor's AI as contextual rules
2. **`AGENTS.md`** — plain markdown at project root or subdirectories; always loaded

Cursor does **not** auto-scan arbitrary `skills/` directories without a plugin manifest. The community claim that `.agents/skills/` is auto-discovered by Cursor is inaccurate for raw project directories — it requires an installed plugin. There is no official user-scope filesystem path for Cursor global rules (those are stored in the Cursor app settings UI).

Skillet's adapter model installs skill directories via `render()` + `resolveInstallPath()`. The cursor adapter must bridge from that directory model to Cursor's file-based `.mdc` format.

## Goals / Non-Goals

**Goals:**
- Install skills to `.cursor/rules/<skill.name>.mdc` so Cursor auto-loads them
- Generate valid `.mdc` frontmatter from the skill's SKILL.md `description` field
- Use `alwaysApply: false` + `description` so Cursor's AI applies the rule when relevant (agent-requested mode — closest analog to skill invocation)
- Support project scope only; drop user scope (Cursor has no user-scope filesystem skills path)

**Non-Goals:**
- Supporting user scope — Cursor global rules are in the app UI, not `~/.cursor/`
- Parsing or transforming any skill content beyond extracting `description` and `body` from SKILL.md

## Decisions

### D1: Install as a directory under `.cursor/rules/<name>/`, write `<name>.mdc` inside

**Decision**: `resolveInstallPath()` returns `.cursor/rules/<name>/` (a directory, consistent with all other adapters). The installer writes a single `<name>.mdc` file inside that directory.

**Rationale**: Cursor reads `.mdc` files **recursively** from `.cursor/rules/`, so a file at `.cursor/rules/<name>/<name>.mdc` is auto-loaded. Using a directory keeps `resolveInstallPath()` semantics consistent with all other adapters (every adapter returns a directory). It also allows future expansion (multiple files per skill if needed).

**Alternatives considered**: Flat file at `.cursor/rules/<name>.mdc` — simpler but makes `resolveInstallPath()` return a file path, breaking the directory contract. Installing to `.cursor/skills/<name>/` — rejected because Cursor never auto-loads from there.

### D2: `alwaysApply: false` + `description` frontmatter

**Decision**: The generated `.mdc` frontmatter sets `alwaysApply: false` and populates `description` from the skill's SKILL.md `description` field.

**Rationale**: Cursor's behavior matrix: when `alwaysApply: false` and `description` is set (no globs), the AI agent decides when to invoke the rule based on its description. This is the closest analog to how other environments activate skills on demand. `alwaysApply: true` would bloat context unconditionally.

### D3: Adapter interface extended with optional `renderFile?()` method

**Decision**: Add an optional `renderFile?(skill: NormalizedSkill, ctx: Context): Promise<string>` method to the `Adapter` interface. The installer checks `typeof adapter.renderFile === 'function'`; if true, it calls `renderFile()` to get file content and writes it as `<skill.name>.mdc` inside the directory from `resolveInstallPath()`. Otherwise it uses the existing directory-copy path.

**Rationale**: Duck-typed optional method is cleaner than a `renderMode` string flag — the presence of the method is self-documenting and avoids an enum. `render()` semantics are unchanged for existing adapters. `resolveInstallPath()` continues to return directories for all adapters. The `.mdc` content is generated async (reading SKILL.md body), so `Promise<string>` is appropriate.

Two interface changes needed:
1. Optional `renderFile?(skill: NormalizedSkill, ctx: Context): Promise<string>` added to `Adapter`
2. `render(skill: NormalizedSkill, ctx: Context): string` — parameter widened from `NormalizedSkillBase` to `NormalizedSkill` so cursor's (and any future adapters') `renderFile` can access `skill.description` and `skill.body` without parsing SKILL.md again

### D4: Detection checks `.cursor/` in cwd only

**Decision**: Detect Cursor presence by checking for `.cursor/` in cwd. Do not detect user scope.

**Rationale**: Consistent with other adapters (detect the tool's marker directory). A fresh Cursor install creates `.cursor/` in the project on first use. No user-scope detection because there is no user-scope target.

## Risks / Trade-offs

- [Risk] Cursor may change its `.mdc` frontmatter schema → Mitigation: The adapter generates a minimal frontmatter (`description` + `alwaysApply`) with no Cursor-specific extensions; low churn surface.
- [Risk] `render()` return-type semantic change (path → content when `renderMode: 'file'`) is a breaking interface change if other adapters ever call `render()` directly → Mitigation: guarded by `renderMode` check in the installer; existing adapters are unaffected since their `renderMode` defaults to `'directory'`.
- [Risk] Skills with multi-section bodies may lose formatting fidelity in `.mdc` → Mitigation: SKILL.md body is copied verbatim into the `.mdc` body; no transformation.

## Migration Plan

No migration required. This is an additive change. Existing adapter behavior is unchanged. The interface extension is backwards-compatible (optional `renderMode` field, defaulting to existing behavior).
