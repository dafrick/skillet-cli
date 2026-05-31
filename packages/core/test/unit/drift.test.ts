import { describe, it } from 'vitest';

describe('detectDrift', () => {
  it.todo('unmodified install returns "pristine"');
  it.todo('editing a file in the install directory returns "modified"');
  it.todo('.skill-manifest.json-only change returns "pristine" (excluded from drift check)');
  it.todo('directory with no .skill-manifest.json returns "unknown"');
});

describe('isStale', () => {
  it.todo('returns false when source contentHash matches manifest contentHash');
  it.todo('returns true when source contentHash differs from manifest contentHash');
});
