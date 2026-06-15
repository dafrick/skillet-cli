## REMOVED Requirements

### Requirement: Programmatic `skillDir` argument to `run()` continues to override all package.json config
**Reason**: `package.json` is now the sole canonical source of skill location. The `skillDir` runtime argument was a stop-gap that pre-dated `skillet.skillDir` in `package.json`. It is removed in `@skillet-cli/core` v0.3.0 with no published consumers.
**Migration**: Replace any `run({ skillDir: '/path/to/skill', pkg })` call with `run({ pkg })` and set `skillet.skillDir` to the equivalent relative path in `package.json`.
