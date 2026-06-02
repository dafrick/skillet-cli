## Context

After the initial branding implementation, visual inspection of `install` output revealed two issues: the wordmark appeared immediately after the shell prompt line with no gap, and the light header showed a version number that served no clear purpose for a skill end-user (the version is already shown by `--version`).

## Goals / Non-Goals

**Goals:**
- Add breathing room between the shell prompt and the wordmark
- Remove visual noise (version in light header) without losing useful information
- Handle absent `pkg.description` cleanly — no stray blank lines or separators

**Non-Goals:**
- Changing colors, fonts, or the wordmark itself
- Altering CI/non-TTY suppression behavior

## Decisions

**Leading blank line in full header, not trailing blank line after output.**
Adding the blank line at the start of the header keeps the spacing as part of the header's responsibility rather than spreading it across multiple call sites.

**Description conditional on presence, not defaulting to empty string.**
An empty description renders a blank line (full header) or a ` - ` fragment (light header). Checking for presence before rendering avoids both artifacts.

**Version removed from light header.**
The light header appears on `list` and `uninstall` — commands where the skill version is not actionable. It added line length without benefit. Version is available via `--version` when needed.

**Description inline in light header (`NAME - description`).**
The full header has vertical space for a separate description line below the wordmark. The light header is compact by design; inlining keeps it to two lines (title + attribution).

## Risks / Trade-offs

- Removing the version from the light header is a visual regression for anyone who relied on it as a quick version check — acceptable given `--version` covers that need
