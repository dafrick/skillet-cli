## 1. Implementation

- [x] 1.1 Import `ExitPromptError` from `@inquirer/core` in `packages/core/src/run.ts`
- [x] 1.2 Wrap `await program.parseAsync(argv)` in a try/catch that catches `ExitPromptError`, writes `\nExiting...\n` to stderr, and calls `process.exit(0)`

## 2. Tests

- [x] 2.1 Add a unit test in `packages/core/test/unit/run-ctrl-c.test.ts` that stubs a prompt to throw `ExitPromptError` and asserts the process exits with code 0 and writes the exit message to stderr (no stack trace)
