## ADDED Requirements

### Requirement: Detect license from package.json
`detectEnvironment()` SHALL read the `license` field from `package.json` and include it in `DetectionResult`. When the field is absent or the file does not exist, the value SHALL be an empty string `''`.

#### Scenario: package.json has a simple SPDX license
- **WHEN** `package.json` contains `"license": "Apache-2.0"`
- **THEN** `DetectionResult.license` SHALL equal `"Apache-2.0"`

#### Scenario: package.json has a compound SPDX expression
- **WHEN** `package.json` contains `"license": "(MIT AND CC-BY-SA-4.0)"`
- **THEN** `DetectionResult.license` SHALL equal `"(MIT AND CC-BY-SA-4.0)"` verbatim, without normalization

#### Scenario: package.json has no license field
- **WHEN** `package.json` exists but contains no `license` key
- **THEN** `DetectionResult.license` SHALL equal `""`

#### Scenario: no package.json present
- **WHEN** no `package.json` file exists in the current directory
- **THEN** `DetectionResult.license` SHALL equal `""`

### Requirement: Use detected license as prompt default
`collectConfig()` SHALL use the detected `license` value as the default for the License prompt. When the detected value is absent or empty, it SHALL fall back to `'MIT'`.

#### Scenario: detected license is non-empty
- **WHEN** `DetectionResult.license` is `"Apache-2.0"`
- **THEN** the License prompt default SHALL be `"Apache-2.0"`

#### Scenario: detected license is empty
- **WHEN** `DetectionResult.license` is `""`
- **THEN** the License prompt default SHALL be `"MIT"`

#### Scenario: user accepts the prompt default
- **WHEN** the user presses Enter without typing on the License prompt
- **THEN** `WizardConfig.license` SHALL equal the prompt default (detected value or `'MIT'`)
