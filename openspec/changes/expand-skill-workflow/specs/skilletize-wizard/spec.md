## ADDED Requirements

### Requirement: Scaffold initializes .npmignore only when absent

`executeScaffold` SHALL write `.npmignore` with the content `**/node_modules\n` only when `.npmignore` does not already exist in the current working directory. When `.npmignore` already exists, the wizard SHALL leave it untouched — no read, no merge, and no append. This applies to the scaffold-time initialization step only and is distinct from the separate interactive triage flow (`create-skillet check`'s `.npmignore` triage), which already appends confirmed exclusions without clobbering.

#### Scenario: No existing .npmignore

- **WHEN** `executeScaffold` runs and no `.npmignore` file exists in the current directory
- **THEN** the wizard writes `.npmignore` with content `**/node_modules\n`

#### Scenario: Existing .npmignore is preserved on re-run

- **WHEN** `executeScaffold` runs and a `.npmignore` file already exists (e.g., from a prior `create-skillet` run or from the interactive triage flow having added custom exclusions)
- **THEN** the wizard does NOT write to `.npmignore` — its existing content is preserved exactly, including any custom entries the author added

## MODIFIED Requirements

### Requirement: Wizard displays next steps on completion

After successful execution, the wizard SHALL print a completion message with recommended next steps. When `config.removePrivate` is `false` AND the package was originally private, the `npm publish` line SHALL be omitted and replaced with `Remove "private": true first: npm pkg delete private`. In all other cases, the next steps SHALL include both `npx . install` (test locally) and `npm publish` (publish to npm). Following the "Next steps:" block, the wizard SHALL print an additional "To expand your skill:" guidance block covering, in order: (1) adding a new top-level content directory via `npm pkg set files[N]=<newDir>/`, with an explicit note to check the current `files` array first since the correct index depends on the package's existing `files` length (single-skill packages typically have `files[0]=bin`, `files[1]=<skillDir>`, making `files[2]` the next available index, but multi-skill or manually-edited packages may differ); (2) making simple content updates within the existing skill directory — bump the version and run `npm publish`, no re-scaffold needed; (3) making structural changes by re-running `create-skillet`, with an explicit warning that doing so resets `name`, `version`, `description`, and `author` to whatever is entered in the prompts; (4) verifying the tarball contents with `create-skillet check` before publishing. This guidance block SHALL be produced by a function callable independently of the completion block's stdout writes, so it can be unit tested.

#### Scenario: Completion output — not private or private was removed

- **WHEN** all execution steps succeed and either `detected.isPrivate` was `false` OR `config.removePrivate` was `true`
- **THEN** the wizard prints a success message followed by `npx . install` and `npm publish` as labeled next steps

#### Scenario: Completion output — private declined to remove

- **WHEN** all execution steps succeed and `detected.isPrivate` was `true` and `config.removePrivate` was `false`
- **THEN** the wizard prints a success message followed by `npx . install` as a next step, and a note `Remove "private": true first: npm pkg delete private` instead of `npm publish`

#### Scenario: Expansion guidance printed after next steps

- **WHEN** the wizard completes execution successfully
- **THEN** the terminal output includes a "To expand your skill:" block, printed after the "Next steps:" block and before any plugin marketplace share instructions, covering adding a directory, simple content updates, structural re-run (with its metadata-reset warning), and `create-skillet check` verification

#### Scenario: Expansion guidance warns about metadata reset on re-run

- **WHEN** the wizard's "To expand your skill:" guidance describes re-running `create-skillet` for structural changes
- **THEN** the guidance explicitly warns that re-running resets `name`, `version`, `description`, and `author` to the values entered in the wizard prompts

#### Scenario: Expansion guidance caveats the files[] index

- **WHEN** the wizard's "To expand your skill:" guidance describes adding a new content directory
- **THEN** the guidance instructs the author to check their current `files` array before choosing an index, rather than asserting a fixed index unconditionally
