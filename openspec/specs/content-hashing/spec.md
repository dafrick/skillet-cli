## ADDED Requirements

### Requirement: Deterministic SHA-256 tree hash
The library SHALL compute a SHA-256 digest over the entire skill directory tree using a fixed, documented algorithm, and return it prefixed with `sha256:`.

#### Scenario: Same content produces same hash on any platform
- **WHEN** `hashSkill(skillDir)` is called on two machines with identical skill file content but different OS path separators or line endings
- **THEN** both calls return the same `sha256:` hash string

#### Scenario: Hash prefix is self-describing
- **WHEN** `hashSkill(skillDir)` returns a result
- **THEN** the result string starts with `sha256:`

### Requirement: Files sorted by relative POSIX path before hashing
The library SHALL list all files recursively, normalise their paths to forward-slash POSIX form, sort lexically, and feed them into the hash in that sorted order.

#### Scenario: Filesystem iteration order does not affect hash
- **WHEN** the underlying filesystem returns directory entries in different orders across two calls
- **THEN** `hashSkill` returns the same hash both times

### Requirement: Each file contributes path and content to the hash
For each file in sorted order the library SHALL feed the relative POSIX path bytes, a `0x00` separator, the file content bytes, and another `0x00` separator into the hash. Before feeding content, the library SHALL detect whether the file is a text file using the heuristic: **a file is text if it contains no `0x00` (NUL) bytes**. Text files SHALL have `\r\n` line endings normalised to `\n` before hashing. Binary files are fed unchanged.

#### Scenario: Renamed file produces different hash
- **WHEN** a file is renamed but its content is unchanged
- **THEN** `hashSkill` returns a different hash than before the rename

#### Scenario: Edited file produces different hash
- **WHEN** any byte in any tracked file changes
- **THEN** `hashSkill` returns a different hash

#### Scenario: Windows line endings normalised for text files
- **WHEN** a text file (no NUL bytes) contains `\r\n` line endings
- **THEN** the hash is identical to the same file with `\n` line endings

#### Scenario: Binary files hashed without normalisation
- **WHEN** a file contains one or more `0x00` bytes
- **THEN** its bytes are fed into the hash without any line-ending transformation

### Requirement: Ignore set excludes noise files
The library SHALL exclude `.git`, `node_modules`, `.DS_Store`, and `.skill-manifest.json` from the hash computation by default. The ignore set SHALL be exported as `DEFAULT_IGNORE` so that other modules (e.g., the install copy step) can reference it without duplication.

#### Scenario: .git directory ignored
- **WHEN** the skill directory contains a `.git/` subdirectory
- **THEN** its contents do not affect the computed hash

#### Scenario: .skill-manifest.json ignored
- **WHEN** `.skill-manifest.json` is present in the skill directory
- **THEN** it is excluded from the hash so source and installed trees can be compared fairly

#### Scenario: DEFAULT_IGNORE is exported
- **WHEN** another module imports `DEFAULT_IGNORE` from the hashing module
- **THEN** the import resolves to the same Set used internally by `hashSkill`

### Requirement: Custom ignore patterns via options
The library SHALL accept an optional `ignore` array of glob patterns that extend the default ignore set.

#### Scenario: Custom pattern excludes matching files
- **WHEN** `hashSkill(skillDir, { ignore: ['*.tmp'] })` is called and `.tmp` files are present
- **THEN** those files are excluded from the hash
