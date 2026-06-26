## MODIFIED Requirements

### Requirement: Wizard displays next steps on completion
After successful execution, the wizard SHALL print a completion message with recommended next steps. When `config.removePrivate` is `false` AND the package was originally private, the `npm publish` line SHALL be omitted and replaced with `Remove "private": true first: npm pkg delete private`. In all other cases, the next steps SHALL include both `npx . install` (test locally) and `npm publish` (publish to npm). After the next steps block, the wizard SHALL additionally print a "To expand your skill" section — see the `wizard-expansion-guidance` spec for requirements on that block.

#### Scenario: Completion output — not private or private was removed
- **WHEN** all execution steps succeed and either `detected.isPrivate` was `false` OR `config.removePrivate` was `true`
- **THEN** the wizard prints a success message followed by `npx . install` and `npm publish` as labeled next steps, followed by the expansion guidance block

#### Scenario: Completion output — private declined to remove
- **WHEN** all execution steps succeed and `detected.isPrivate` was `true` and `config.removePrivate` was `false`
- **THEN** the wizard prints a success message followed by `npx . install` as a next step, and a note `Remove "private": true first: npm pkg delete private` instead of `npm publish`, followed by the expansion guidance block
