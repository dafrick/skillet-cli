import { describe, it } from 'vitest';

describe('normalizeSkill', () => {
  it.todo('valid SKILL.md is parsed correctly');
  it.todo('missing name throws a descriptive error');
  it.todo('missing description throws a descriptive error');
  it.todo('missing SKILL.md throws a descriptive error with the path');
  it.todo('optional version field is passed through when present');
  it.todo('arbitrary extra frontmatter fields are passed through');
  it.todo('relative path input is resolved to absolute sourceDir');
  it.todo('contentHash is present on the returned object and starts with sha256:');
  it.todo('contentHash changes when a file in the skill directory is edited');
});
