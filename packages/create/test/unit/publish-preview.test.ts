import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printPublishPreview } from '../../src/publish-preview.js';

describe('printPublishPreview', () => {
  let tmpDir: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'publish-preview-test-'));
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    stdoutSpy.mockRestore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  // Task 4.1: After printPublishPreview with a populated dir, stdout contains lines for each file
  it('prints each file entry to stdout', async () => {
    await writeFile(path.join(tmpDir, 'SKILL.md'), '# Skill');
    await writeFile(path.join(tmpDir, 'README.md'), '# Readme');

    await printPublishPreview(tmpDir);

    const output = stdoutSpy.mock.calls.map((call) => call[0] as string).join('');
    expect(output).toContain('SKILL.md');
    expect(output).toContain('README.md');
  });

  // Task 4.2: Ignored entries (.git, node_modules) are noted as [excluded]
  it('marks DEFAULT_IGNORE entries as [excluded]', async () => {
    await writeFile(path.join(tmpDir, 'SKILL.md'), '# Skill');
    await mkdir(path.join(tmpDir, '.git'));
    await mkdir(path.join(tmpDir, 'node_modules'));

    await printPublishPreview(tmpDir);

    const output = stdoutSpy.mock.calls.map((call) => call[0] as string).join('');
    expect(output).toContain('[excluded]');
    expect(output).toContain('.git');
    expect(output).toContain('node_modules');
    // SKILL.md should appear without [excluded]
    const lines = output.split('\n');
    const skillLine = lines.find((l) => l.includes('SKILL.md'));
    expect(skillLine).toBeDefined();
    expect(skillLine).not.toContain('[excluded]');
  });

  // Task 4.3: Graceful handling of missing directory — does not throw, notes the directory
  it('does not throw and prints a note when the directory is missing', async () => {
    await expect(
      printPublishPreview('/nonexistent/path/xyz-publish-preview-test'),
    ).resolves.not.toThrow();

    const output = stdoutSpy.mock.calls.map((call) => call[0] as string).join('');
    expect(output).toMatch(/not found|not found/i);
  });
});
