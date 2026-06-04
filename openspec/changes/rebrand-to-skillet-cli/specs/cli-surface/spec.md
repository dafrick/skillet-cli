## MODIFIED Requirements

### Requirement: Attribution line appears in all TTY headers
Every header variant (full and light) SHALL include a single attribution line rendered immediately below the wordmark or name line, before any other content. The attribution line SHALL NOT appear in CI or non-TTY environments (consistent with header suppression rules).

The attribution line format: `Packaged with Skillet v{core-version}` in Iris Bright bold, followed by `· package your own for any agent in one step ↗` in `chalk.dim`, where `↗` is an OSC 8 terminal hyperlink to `https://github.com/dafrick/skillet-cli` and `{core-version}` is `@skillet-cli/core`'s own package version.

#### Scenario: Attribution line appears below full header wordmark
- **WHEN** install runs in TTY and the full header is displayed
- **THEN** the line immediately following the wordmark block reads the attribution string in Iris Bright + dim

#### Scenario: Attribution line appears below light header name line
- **WHEN** list runs in TTY and the light header is displayed
- **THEN** the line immediately following the name line reads the attribution string

#### Scenario: Attribution line is suppressed in CI/non-TTY
- **WHEN** install runs in a non-TTY environment or CI is set
- **THEN** no attribution line is emitted

#### Scenario: Attribution hyperlink points to skillet-cli repo
- **WHEN** a TTY header is rendered
- **THEN** the OSC 8 hyperlink URL in the attribution line is `https://github.com/dafrick/skillet-cli`
