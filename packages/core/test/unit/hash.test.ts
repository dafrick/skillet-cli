import { describe, it } from 'vitest';

describe('hashSkill', () => {
  it.todo('same content produces the same hash');
  it.todo('renaming a file changes the hash');
  it.todo('\\r\\n line endings are normalised to \\n before hashing');
  it.todo('Windows backslash paths are normalised to forward slashes');
  it.todo('.skill-meta.json is excluded from hash by default');
  it.todo('custom ignore list excludes specified files');
});
