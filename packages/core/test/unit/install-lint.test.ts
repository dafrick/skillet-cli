import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — before module imports
// ---------------------------------------------------------------------------

vi.mock('../../src/lint.js', () => ({
  lintSkillFrontmatter: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { registry } from '../../src/adapters/index.js';
import { performInstall } from '../../src/install.js';
import { lintSkillFrontmatter } from '../../src/lint.js';
import { normalizeSkill } from '../../src/normalize.js';
import { createSandbox } from '../integration/helpers/sandbox.js';

const mockLintSkillFrontmatter = vi.mocked(lintSkillFrontmatter);

const helloSkillDir = fileURLToPath(new URL('../../fixtures/hello-skill', import.meta.url));

describe('performInstall — frontmatter lint warning', () => {
  let stderrChunks: string[];
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stderrChunks = [];
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrChunks.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('emits no frontmatter warning when SKILL.md starts with ---', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get('claude')!;
      mockLintSkillFrontmatter.mockReturnValue(true);

      await performInstall(skill, adapter, 'user', { pkg: { name: 'test-pkg', version: '1.0.0' } });

      const stderrOutput = stderrChunks.join('');
      expect(stderrOutput).not.toContain('frontmatter');
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });

  it('emits frontmatter warning to stderr naming the skill when SKILL.md does not start with ---', async () => {
    const sandbox = await createSandbox();
    try {
      const skill = await normalizeSkill(helloSkillDir);
      const adapter = registry.get('claude')!;
      mockLintSkillFrontmatter.mockReturnValue(false);

      const installPath = await performInstall(skill, adapter, 'user', {
        pkg: { name: 'test-pkg', version: '1.0.0' },
      });

      const stderrOutput = stderrChunks.join('');
      expect(stderrOutput).toContain(skill.name);
      expect(stderrOutput).toContain('SKILL.md frontmatter');
      expect(installPath).toBeTruthy();
    } finally {
      await sandbox[Symbol.asyncDispose]();
    }
  });
});
