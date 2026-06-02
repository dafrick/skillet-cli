## 1. Full header

- [x] 1.1 Add leading `\n` before wordmark in `renderFullHeader`
- [x] 1.2 Render `pkg.description` (dimmed) on its own line between wordmark and attribution, only when present
- [x] 1.3 Omit description line entirely (no blank line) when `pkg.description` is absent

## 2. Light header

- [x] 2.1 Remove `pkg.version` from the title line
- [x] 2.2 Render description inline as `NAME - description` only when `pkg.description` is present
- [x] 2.3 Render title alone (no ` - ` separator) when `pkg.description` is absent

## 3. Tests

- [x] 3.1 Update `ui-header.test.ts` assertions that expected version in light header
- [x] 3.2 Verify no regressions in full test suite
