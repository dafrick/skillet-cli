# metadata-change-consent Specification

## Purpose
TBD - created by archiving change document-skill-expansion. Update Purpose after archive.
## Requirements
### Requirement: Metadata diff shown before overwriting published package.json fields
When the "Reconfigure everything" path completes `collectConfig()`, the wizard SHALL compare the collected `name`, `version`, `description`, `author`, and `license` values against the corresponding values in `DetectionResult` (the values currently on disk before this run). If one or more fields differ, the wizard SHALL display a "Changes to published metadata:" block listing each changed field as `current → new`, before the existing preview-confirmation step proceeds to write `package.json`. Fields that are unchanged SHALL NOT appear in this block.

#### Scenario: Single field changed
- **WHEN** the collected `description` differs from `DetectionResult.description` and all other compared fields are unchanged
- **THEN** the "Changes to published metadata:" block shows only the `description` field as `current → new`

#### Scenario: Multiple fields changed
- **WHEN** collected `version` and `license` both differ from their detected counterparts
- **THEN** the "Changes to published metadata:" block lists both `version` and `license`, each as `current → new`

#### Scenario: No fields changed
- **WHEN** all of `name`, `version`, `description`, `author`, and `license` collected by the wizard match `DetectionResult` exactly
- **THEN** no "Changes to published metadata:" block is shown

#### Scenario: First-time setup — no diff shown
- **WHEN** `DetectionResult.isExistingSkilletPackage` is `false` (first-time setup, not a reconfigure of an existing package)
- **THEN** no "Changes to published metadata:" block is shown, regardless of collected values

#### Scenario: license included in the diff
- **WHEN** the collected `license` differs from `DetectionResult.license`
- **THEN** `license` appears in the "Changes to published metadata:" block alongside `name`, `version`, `description`, and `author` using the same current → new format

---

### Requirement: Metadata diff is folded into the existing preview-confirm step
The "Changes to published metadata:" block SHALL be displayed immediately preceding (or as part of) the existing "Ready to set up" / "Here's what I'll do:" preview step, and SHALL be gated by the same single confirmation — no additional confirmation prompt is introduced solely for the metadata diff.

#### Scenario: Single confirmation covers both plan and diff
- **WHEN** the reconfigure path has changed metadata fields
- **THEN** the user sees the metadata diff block and the existing plan/preview block, then answers a single confirmation prompt that covers both

#### Scenario: Decline leaves package.json untouched
- **WHEN** the user declines the confirmation after viewing the metadata diff
- **THEN** no `npm pkg set` command runs and `package.json` remains as it was before the run

