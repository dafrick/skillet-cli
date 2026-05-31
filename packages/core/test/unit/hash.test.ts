import { describe, it } from 'vitest';

describe('hashSkill', () => {
  it.todo('same content produces the same hash');
  it.todo('renaming a file changes the hash');
  it.todo('\\r\\n line endings are normalised to \\n before hashing');
  it.todo('Windows backslash paths are normalised to forward slashes');
  it.todo('.skill-manifest.json is excluded from hash by default');
  it.todo('custom ignore list excludes specified files');
  it.todo('edited file content produces a different hash');
  it.todo('.git directory is excluded from hash by default');
  it.todo('hash result starts with sha256: prefix');
  it.todo('filesystem iteration order does not affect the hash');
  it.todo('binary files (containing NUL bytes) are hashed without line-ending normalisation');
});
