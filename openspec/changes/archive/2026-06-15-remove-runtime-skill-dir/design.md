## Context

`run()` in `@skillet-cli/core` originally accepted a `skillDir` option so authors could point the library at their skill directory before `skillet.skillDir` in `package.json` existed. Once `package.json` became the canonical source of truth, the runtime override became redundant dead surface. PR #91 (branch `chore/remove-runtime-skill-dir`) has already shipped the implementation.

## Goals / Non-Goals

**Goals:**
- Remove `skillDir?` from `RunOptions` permanently
- Update all five affected specs to match the as-shipped API
- Archive the change so the removal is fully documented

**Non-Goals:**
- Any changes to how `skillet.skillDir` or `skillet.skills` in `package.json` are read — that logic is unchanged
- Backwards-compat shims or deprecation warnings — no published consumers existed

## Decisions

**Remove outright, no deprecation period.** The `skillDir` param was never mentioned in a changelog or published README; no downstream packages depend on it. A deprecation cycle would add complexity with no benefit.

**package.json is the sole source of skill location.** When `run()` is called and `package.json` has no `skillet` key, a descriptive error is thrown naming both `skillDir` and `skills` as the expected sub-keys. This is the only migration path callers need.

## Risks / Trade-offs

**Internal callers only.** All four test files that passed `skillDir` at runtime were updated in the same PR; no external callers exist. Risk: low.

**Error message quality.** If an author accidentally omits the `skillet` key, the error must be clear. The new message names both `skillet.skillDir` and `skillet.skills` explicitly. → Mitigation: covered by existing integration tests.
