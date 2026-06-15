## MODIFIED Requirements

### Requirement: Dependency walk is seeded with the invoked package
When installing or updating, core SHALL begin the closure-resolution walk at the invoked package root `R`. Core SHALL collect `R`'s own skill trees via the `skillet` marker in `package.json` (`skillet.skillDir` for a single skill, or `skillet.skills` for multi-skill packages).

#### Scenario: Invoked package with no skill dependencies
- **WHEN** the invoked package declares no marked skill-package dependencies
- **THEN** core installs only the invoked package's own skills, identical to v0.1.0 behavior

#### Scenario: Invoked package with one marked dependency
- **WHEN** the invoked package's `package.json` `dependencies` contains one package that carries a `skillet` marker
- **THEN** core installs both the invoked package's own skills and the dependency's skills in one operation
