## ADDED Requirements

### Requirement: Scope and target prompts collected once for all skills in a batch
When `install` is run on a multi-skill package interactively, the library SHALL collect scope and target selections exactly once before iterating over skills. Every skill in the batch SHALL be installed to the same resolved targets without re-prompting.

#### Scenario: Single prompt round for two-skill package
- **WHEN** `install` is run interactively on a package with 2 skills and no `--target` or `--scope` flags
- **THEN** the scope prompt appears exactly once and the target multi-select appears exactly once, regardless of the number of skills

#### Scenario: All skills installed to the same resolved targets
- **WHEN** the user selects scope `user` and target `claude` for a 3-skill package
- **THEN** all 3 skills are installed into `~/.claude/skills/<skill-name>/` without any further prompts

#### Scenario: Prompt round not repeated for single-skill package
- **WHEN** `install` is run interactively on a single-skill package
- **THEN** behavior is identical to the existing single-prompt flow — no regression

### Requirement: No targets selected bails before the skill loop
When the resolved target list is empty after prompt or flag resolution, the library SHALL print `No targets selected.` once and exit without iterating over any skill.

#### Scenario: Empty target selection exits cleanly
- **WHEN** `install` is run interactively and the user deselects all targets in the multi-select
- **THEN** `No targets selected.` is printed once and no skill installation is attempted

### Requirement: Consolidated batch summary printed after all skills complete
After all skills in the batch are installed, the library SHALL print a single summary line. In TTY mode the format is `N skills × M targets installed · Xs`; in CI / non-TTY mode the format is `[pkg.name] N skills × M targets installed`. For a single-skill package the wording uses `1 skill`.

#### Scenario: Batch summary in TTY mode for multi-skill package
- **WHEN** `install` completes 2 skills across 2 targets in a TTY environment
- **THEN** the output contains exactly one summary line reading `2 skills × 2 targets installed · <elapsed>s` and no per-skill summary lines

#### Scenario: Batch summary in CI mode
- **WHEN** `install` completes 3 skills across 1 target in a non-TTY environment
- **THEN** the output contains exactly one summary line reading `[pkg.name] 3 skills × 1 target installed`

#### Scenario: Single-skill summary uses singular wording
- **WHEN** `install` completes 1 skill across 2 targets in a TTY environment
- **THEN** the summary reads `1 skill × 2 targets installed · <elapsed>s`

### Requirement: Non-interactive multi-skill install uses resolved targets without prompting
When `--scope` and `--target` flags are provided (or the environment is non-TTY), the library SHALL resolve targets from flags/detection once and install all skills to those targets without any prompts.

#### Scenario: Flag-driven multi-skill install produces one summary
- **WHEN** `install --target claude --scope user` is run on a 2-skill package in non-TTY mode
- **THEN** both skills are installed to `~/.claude/skills/<name>/` and exactly one summary line is printed

#### Scenario: --yes flag on multi-skill package prompts once
- **WHEN** `install --yes` is run interactively on a 3-skill package
- **THEN** all detected targets are selected without prompting and all 3 skills are installed, with one summary line
