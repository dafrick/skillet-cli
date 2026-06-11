/**
 * Tests for post-move update behavior in setupSkillDir.
 *
 * After files are moved into skill/, the wizard must:
 *  1. Rewrite bin/cli.js to reference skill/ as the skillDir URL
 *  2. Run `npm pkg set skillet.skillDir=./skill/` to update package.json
 *
 * These tests use the same mock strategy as scaffold.test.ts.
 */

import * as fsp from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @inquirer/prompts so we can control user responses
vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

// Mock node:child_process so runSync doesn't actually spawn anything
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

// Mock fs/promises so we don't touch the real filesystem
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn(),
    stat: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn(),
    writeFile: vi.fn(),
    chmod: vi.fn(),
  };
});

import { spawnSync } from 'node:child_process';
import { checkbox, confirm } from '@inquirer/prompts';
import type { DetectionResult } from '../../src/detect.js';
import { setupSkillDir } from '../../src/skill-dir.js';

const mockCheckbox = vi.mocked(checkbox);
const mockConfirm = vi.mocked(confirm);
const mockSpawnSync = vi.mocked(spawnSync);
const mockFspStat = vi.mocked(fsp.stat);
const mockFspReaddir = vi.mocked(fsp.readdir);
const mockFspMkdir = vi.mocked(fsp.mkdir);
const mockFspRename = vi.mocked(fsp.rename);
const mockFspWriteFile = vi.mocked(fsp.writeFile);
const mockFspChmod = vi.mocked(fsp.chmod);

function makeDetected(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    cwd: '/fake/repo',
    name: 'my-skill',
    version: '1.0.0',
    author: 'Test',
    description: '',
    hasPackageJson: true,
    hasSkillMd: true,
    skillDir: './',
    discoveredSkillDirs: ['./'],
    repositoryUrl: '',
    gitUser: '',
    ...overrides,
  };
}

function makeSpawnSuccess() {
  return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as ReturnType<
    typeof spawnSync
  >;
}

/** Make fsp.stat throw ENOENT — simulates skill/ directory not existing yet */
function mockSkillDirAbsent() {
  mockFspStat.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
}

/** Make fsp.readdir return a small set of items */
function mockReaddir(items: string[]) {
  mockFspReaddir.mockResolvedValue(
    items.map((name) => ({
      name: name.endsWith('/') ? name.slice(0, -1) : name,
      isDirectory: () => name.endsWith('/'),
      isFile: () => !name.endsWith('/'),
      isSymbolicLink: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    })) as unknown as Awaited<ReturnType<typeof fsp.readdir>>,
  );
}

describe('setupSkillDir — post-move bin/cli.js update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSpawnSuccess());
    mockFspMkdir.mockResolvedValue(undefined);
    mockFspRename.mockResolvedValue(undefined);
    mockFspWriteFile.mockResolvedValue(undefined);
    mockFspChmod.mockResolvedValue(undefined);
  });

  it('does NOT rewrite bin/cli.js after files are moved (package.json is source of truth)', async () => {
    mockSkillDirAbsent();
    mockReaddir(['SKILL.md', 'README.md']);
    // User selects SKILL.md, then confirms move
    mockCheckbox.mockResolvedValue(['SKILL.md']);
    mockConfirm.mockResolvedValue(true);

    await setupSkillDir(makeDetected());

    // bin/cli.js must NOT have been written — only package.json update is needed
    const writeCall = mockFspWriteFile.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('bin/cli.js'),
    );
    expect(writeCall).toBeUndefined();
  });

  it('does NOT chmod bin/cli.js after files are moved', async () => {
    mockSkillDirAbsent();
    mockReaddir(['SKILL.md', 'README.md']);
    mockCheckbox.mockResolvedValue(['SKILL.md']);
    mockConfirm.mockResolvedValue(true);

    await setupSkillDir(makeDetected());

    // chmod must NOT have been called on bin/cli.js
    const chmodCall = mockFspChmod.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('bin/cli.js'),
    );
    expect(chmodCall).toBeUndefined();
  });

  it('runs npm pkg set skillet.skillDir=./skill/ after files are moved', async () => {
    mockSkillDirAbsent();
    mockReaddir(['SKILL.md', 'README.md']);
    mockCheckbox.mockResolvedValue(['SKILL.md']);
    mockConfirm.mockResolvedValue(true);

    await setupSkillDir(makeDetected());

    // Must have called spawnSync with npm pkg set skillet.skillDir
    const spawnCalls = mockSpawnSync.mock.calls.map((c) => c[0] as string);
    const pkgSetCall = spawnCalls.find(
      (c) => c.includes('npm') && c.includes('"pkg"') && c.includes('skillet.skillDir=./skill/'),
    );
    expect(pkgSetCall).toBeDefined();
  });

  it('prints "skillDir updated to: ./skill/" after files are moved', async () => {
    mockSkillDirAbsent();
    mockReaddir(['SKILL.md', 'README.md']);
    mockCheckbox.mockResolvedValue(['SKILL.md']);
    mockConfirm.mockResolvedValue(true);

    const stdoutSpy = vi.spyOn(process.stdout, 'write');

    await setupSkillDir(makeDetected());

    const writtenStrings = stdoutSpy.mock.calls
      .map((c) => c[0])
      .filter((s): s is string => typeof s === 'string');
    const found = writtenStrings.some((s) => s.includes('skillDir updated to: ./skill/'));

    stdoutSpy.mockRestore();

    expect(found).toBe(true);
  });
});

describe('setupSkillDir — no update when no files selected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSpawnSuccess());
    mockFspMkdir.mockResolvedValue(undefined);
    mockFspRename.mockResolvedValue(undefined);
    mockFspWriteFile.mockResolvedValue(undefined);
    mockFspChmod.mockResolvedValue(undefined);
  });

  it('does NOT rewrite bin/cli.js when user selects no files', async () => {
    mockSkillDirAbsent();
    mockReaddir(['SKILL.md', 'README.md']);
    // User selects nothing from the checkbox
    mockCheckbox.mockResolvedValue([]);
    // confirm is not reached — no files selected exits early

    await setupSkillDir(makeDetected());

    // bin/cli.js must NOT have been written
    const writeCall = mockFspWriteFile.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('bin/cli.js'),
    );
    expect(writeCall).toBeUndefined();
  });

  it('does NOT call npm pkg set skillet.skillDir when user selects no files', async () => {
    mockSkillDirAbsent();
    mockReaddir(['SKILL.md', 'README.md']);
    mockCheckbox.mockResolvedValue([]);

    await setupSkillDir(makeDetected());

    const spawnCalls = mockSpawnSync.mock.calls.map((c) => c[0] as string);
    const pkgSetCall = spawnCalls.find(
      (c) => c.includes('"pkg"') && c.includes('skillet.skillDir'),
    );
    expect(pkgSetCall).toBeUndefined();
  });
});

describe('setupSkillDir — no update when user declines the move', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSpawnSuccess());
    mockFspMkdir.mockResolvedValue(undefined);
    mockFspRename.mockResolvedValue(undefined);
    mockFspWriteFile.mockResolvedValue(undefined);
    mockFspChmod.mockResolvedValue(undefined);
  });

  it('does NOT rewrite bin/cli.js when user declines at the confirmation', async () => {
    mockSkillDirAbsent();
    mockReaddir(['SKILL.md', 'README.md']);
    mockCheckbox.mockResolvedValue(['SKILL.md']);
    // User declines at final confirm
    mockConfirm.mockResolvedValue(false);

    // setupSkillDir calls process.exit(0) when user declines
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit(0)');
    });

    await expect(setupSkillDir(makeDetected())).rejects.toThrow('process.exit(0)');

    // bin/cli.js must NOT have been written
    const writeCall = mockFspWriteFile.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('bin/cli.js'),
    );
    expect(writeCall).toBeUndefined();

    mockExit.mockRestore();
  });
});
