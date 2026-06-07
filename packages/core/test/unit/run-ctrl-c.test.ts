import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ExitPromptError } from '@inquirer/core';
import { select } from '@inquirer/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../../src/run.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

async function makeTmpDir(): Promise<string> {
  return fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'skillet-ctrl-c-')));
}

async function writeSkill(dir: string, name: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Test skill\n---\nBody.\n`,
    'utf8',
  );
}

describe('run() — Ctrl+C (ExitPromptError)', () => {
  let tmpDir: string;
  let originalCwd: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 0 and prints Exiting... when user presses Ctrl+C during a prompt', async () => {
    const skillDir = path.join(tmpDir, 'my-skill');
    await writeSkill(skillDir, 'my-skill');

    // Force TTY so install prompts are shown
    const isTTYDesc = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      writable: true,
      configurable: true,
    });

    // Stub select() to simulate Ctrl+C during the scope prompt
    vi.mocked(select).mockRejectedValue(new ExitPromptError('User force closed the prompt'));

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null) => undefined as never);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await run({
      skillDir,
      pkg: { name: 'test-pkg', version: '1.0.0' },
      argv: ['node', 'cli.js', 'install'],
    });

    // Restore isTTY
    Object.defineProperty(
      process.stdout,
      'isTTY',
      isTTYDesc ?? {
        value: undefined,
        writable: true,
        configurable: true,
      },
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Exiting'));
  });
});
