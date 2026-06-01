## ADDED Requirements

### Requirement: Package declares itself a skill-package via the `skillet` key
An npm package SHALL be treated as a skill-package by `@skillet/core` if and only if its `package.json` contains a top-level key named `skillet`. The presence of this key is the sole switch; the absence of any dependencies, the presence of `node_modules`, or any other package characteristic SHALL NOT trigger skill-package treatment.

#### Scenario: Package with `skillet` key is recognized as a skill-package
- **WHEN** core reads a `package.json` that contains a `skillet` key
- **THEN** core treats the package as a skill-package and proceeds to discover its skill trees

#### Scenario: Package without `skillet` key is not treated as a skill-package
- **WHEN** core reads a `package.json` that does not contain a `skillet` key
- **THEN** core treats the package as an ordinary npm library and does not discover or install any skills from it

#### Scenario: Package with empty `node_modules` or no dependencies is unaffected
- **WHEN** a package with no npm dependencies is installed via its CLI
- **THEN** core installs only that package's own skills, exactly as in v0.1.0, without triggering any dependency walk

### Requirement: `skillet.skills` names one or more parent directories for skill tree discovery
The value of `skillet.skills` SHALL be either a string or an array of strings. Each value is a path relative to the package root. For each named path, core SHALL scan that directory: each immediate subdirectory containing a file named `SKILL.md` SHALL be treated as one skill tree; subdirectories without `SKILL.md` SHALL be ignored. When `skills` is an array, all named directories are scanned and their results are unioned.

#### Scenario: String form — skills directory contains multiple skill trees
- **WHEN** `skillet.skills` is a string pointing to a directory containing three subdirectories each with a `SKILL.md`
- **THEN** core discovers and installs all three skill trees from that package

#### Scenario: String form — subdirectory without `SKILL.md` is not treated as a skill tree
- **WHEN** `skillet.skills` is a string pointing to a directory containing a subdirectory that lacks `SKILL.md`
- **THEN** core does not treat that subdirectory as a skill tree and does not attempt to install from it

#### Scenario: Array form — skills spread across multiple parent directories
- **WHEN** `skillet.skills` is `["skills/core", "skills/experimental"]` and each named directory has subdirectories with `SKILL.md`
- **THEN** core discovers and installs skill trees from both directories in one operation

#### Scenario: Array form — an entry with no SKILL.md-bearing subdirectories contributes zero skill trees
- **WHEN** `skillet.skills` is `["skills/core", "skills/empty"]` and `skills/empty` has no subdirectories with `SKILL.md`
- **THEN** core installs skill trees from `skills/core` only; no error is raised for the empty directory

### Requirement: `skillet.skills` defaults to `"skills"` when omitted
If the `skillet` key is present in `package.json` but the `skills` sub-key is absent, core SHALL behave as if `skillet.skills` were set to `"skills"`.

#### Scenario: `skillet` key present, `skills` sub-key absent
- **WHEN** a `package.json` contains `"skillet": {}` with no `skills` property
- **THEN** core looks for skill trees in the `skills/` directory relative to the package root

### Requirement: Explicit `skillDir` passed to `run()` is honored for the invoked package
When the invoked package calls `run({ skillDir })` with a non-null `skillDir` argument, core SHALL treat that value as the skill tree directory for the invoked package, equivalent to a `skillet` marker pointing at that directory. If no `skillDir` is passed, core SHALL fall back to the package's `skillet` marker.

#### Scenario: `run()` called with explicit `skillDir`
- **WHEN** the invoked package calls `run({ skillDir: './my-skills' })`
- **THEN** core uses `./my-skills` as the skill tree directory for that package, regardless of whether a `skillet` marker is present

#### Scenario: `run()` called without `skillDir`, marker present
- **WHEN** the invoked package calls `run({})` or `run()` with no `skillDir`
- **AND** the package's `package.json` has a `skillet` marker
- **THEN** core uses the directory named in `skillet.skills` (or the default `"skills"`) as the skill tree directory

#### Scenario: `run()` called without `skillDir`, no marker
- **WHEN** the invoked package calls `run({})` with no `skillDir`
- **AND** the package's `package.json` has no `skillet` marker
- **THEN** core behaves as in v0.1.0 (no skills discovered from this package)

### Requirement: Dependency packages are discovered via marker only; their CLI is never executed
For packages reached through the dependency walk, the `skillet` marker is the sole discovery mechanism. Core SHALL read the dependency's `package.json` and its skill tree directly. Core SHALL NOT execute the dependency's `bin` entry or any script defined in its `package.json`.

#### Scenario: Dependency package has `skillet` marker
- **WHEN** the dependency walk reaches a package whose `package.json` contains a `skillet` key
- **THEN** core reads that package's skill trees from the marker path, without running the package's CLI

#### Scenario: Dependency package uses `run({ skillDir })` without a marker
- **WHEN** the dependency walk reaches a package that has no `skillet` key in `package.json`
- **THEN** core skips that package — it cannot be discovered as a skill dependency, even if its CLI would produce skills when run directly

### Requirement: Authors who intend their package to be depended upon MUST carry the marker
This is a normative authoring constraint, not a runtime enforcement. Core SHALL NOT error at runtime when a dependency lacks the marker; it SHALL silently skip it. However, a `skillDir`-only package (no `skillet` marker) MUST NOT be expected to be discoverable as a skill dependency.

#### Scenario: Dependency without marker is skipped, no error
- **WHEN** the dependency walk reaches a package whose `package.json` has no `skillet` key
- **THEN** core records no error and continues the walk, treating the package as an ordinary library
