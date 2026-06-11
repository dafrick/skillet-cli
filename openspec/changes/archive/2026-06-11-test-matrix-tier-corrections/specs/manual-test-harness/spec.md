## ADDED Requirements

### Requirement: TEST-MATRIX.md catalog entries have verified tier classifications
Every row in the `test-manual/TEST-MATRIX.md` candidate repo catalog SHALL have a tier classification that has been confirmed against the actual structure of that repository. A tier classification is "verified" when a person or agent has inspected the repository's file tree and confirmed that the number of SKILL.md files and the presence/absence of nested companion directories match the tier definition in `test-manual/README.md`.

#### Scenario: All catalog rows reflect confirmed tier classifications
- **WHEN** a guide consults TEST-MATRIX.md before starting a run
- **THEN** every row in the candidate catalog has a tier that was confirmed by direct inspection of the repo — not assigned by assumption

#### Scenario: Catalog covers all five tiers with verified repos
- **WHEN** the corrected catalog is in place
- **THEN** there is at least one verified candidate repo for each of tiers T1 through T5
