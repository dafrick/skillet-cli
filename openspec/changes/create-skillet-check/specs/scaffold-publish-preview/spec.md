## MODIFIED Requirements

### Requirement: Publish preview uses npm pack output (not DEFAULT_IGNORE walk)
After `setupSkillDir` completes in the `create-skillet` wizard, a publish preview SHALL display the classified tarball output by invoking the `check` module in preview mode (`interactive: false`). The preview SHALL NOT use `DEFAULT_IGNORE` to simulate exclusions, and SHALL NOT show interactive prompts or modify `.npmignore`.

#### Scenario: Preview shows npm-pack-based classified output
- **WHEN** the wizard has completed `setupSkillDir` and `package.json` contains a valid skillet marker
- **THEN** the output is derived from `npm pack --dry-run --json` and classified into tiers (infrastructure ✓, skill content ✓, ambiguous ⚠), matching the same logic used by `create-skillet check`

#### Scenario: Excluded entries noted in preview reflect actual tarball
- **WHEN** the skill content directory contains entries that would be excluded by `.npmignore`
- **THEN** those entries do NOT appear in the preview output (because they are absent from the npm pack manifest)

#### Scenario: Preview does not modify .npmignore
- **WHEN** the publish preview runs after the wizard
- **THEN** `.npmignore` is not written or updated as part of the preview step

#### Scenario: Preview does not show interactive prompts
- **WHEN** the publish preview runs after the wizard
- **THEN** no `@inquirer/prompts` checkbox or confirmation prompts are presented to the user

#### Scenario: Preview is a post-setupSkillDir informational summary
- **WHEN** the publish preview is displayed
- **THEN** the classified output is printed to stdout immediately after `setupSkillDir` completes (after the user has already confirmed), serving as a confirmation of what was packaged

#### Scenario: npm pack failure in preview is non-fatal
- **WHEN** `npm pack --dry-run --json` exits non-zero during the post-wizard preview
- **THEN** the preview prints a warning that pack output was unavailable, but the wizard continues and exits normally without throwing

## REMOVED Requirements

### Requirement: Publish preview lists files that will be published (shown after setupSkillDir)
**Reason**: Replaced by npm-pack-based classified preview via the `check` module in preview mode. The DEFAULT_IGNORE-based file walk no longer reflects actual publish behavior.
**Migration**: `printPublishPreview` in `publish-preview.ts` is replaced by calling `runCheck({ interactive: false })`. The `scaffold-publish-preview` spec's previous requirements are superseded by the MODIFIED requirement above.
