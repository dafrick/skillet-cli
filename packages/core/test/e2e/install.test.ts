import { describe, it } from 'vitest';

describe('install command (E2E)', () => {
  it.todo(
    'golden path TTY install: shows scope prompt, target multi-select, spinner with cooking verb, done line',
  );
  it.todo('golden path non-TTY install: prints prefixed log lines, no ANSI, exits 0');
  it.todo('list after install: shows pristine status');
  it.todo('list after file edit: shows modified status');
  it.todo('update --force after file edit: restores pristine status');
  it.todo('NO_COLOR=1 suppresses all ANSI escape sequences in output');
  it.todo('invalid --target exits with code 1 and descriptive error');
  it.todo('non-TTY stdin defaults to --yes behavior');
});
