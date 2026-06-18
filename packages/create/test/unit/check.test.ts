import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — before module imports
// ---------------------------------------------------------------------------

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn(), readFileSync: vi.fn() };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, appendFile: vi.fn() };
});

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@skillet-cli/core', () => ({
  DEFAULT_IGNORE: new Set(['.git', 'node_modules', '.DS_Store', '.skill-manifest.json']),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { checkbox, confirm } from '@inquirer/prompts';
import { classifyFile, runCheck } from '../../src/check.js';

const mockSpawnSync = vi.mocked(spawnSync);
const mockFsExistsSync = vi.mocked(fs.existsSync);
const mockFsReadFileSync = vi.mocked(fs.readFileSync);
const mockFspAppendFile = vi.mocked(fsp.appendFile);
const mockCheckbox = vi.mocked(checkbox);
const mockConfirm = vi.mocked(confirm);

const SKILL_DIR = 'skill/my-skill';

function makePackOutput(files: { path: string; size: number }[]) {
  return JSON.stringify([{ name: 'my-skill', version: '0.1.0', files }]);
}

function setupPackageMocks(skillDir = SKILL_DIR) {
  mockFsExistsSync.mockReturnValue(true);
  mockFsReadFileSync.mockReturnValue(JSON.stringify({ skillet: { skillDir } }));
}

function makeSpawnResult(stdout: string, status = 0) {
  return { status, stdout, stderr: '', pid: 1, output: [], signal: null } as ReturnType<
    typeof spawnSync
  >;
}

// ---------------------------------------------------------------------------
// classifyFile unit tests (task 7.3)
// ---------------------------------------------------------------------------

describe('classifyFile', () => {
  const skillPaths = ['skill/my-skill'];

  it('classifies package.json outside skill path as infrastructure', () => {
    const result = classifyFile({ path: 'package.json', size: 100 }, skillPaths);
    expect(result.tier).toBe('infrastructure');
  });

  it('classifies bin/cli.js outside skill path as infrastructure', () => {
    const result = classifyFile({ path: 'bin/cli.js', size: 50 }, skillPaths);
    expect(result.tier).toBe('infrastructure');
  });

  it('classifies SKILL.md under skill path as skill-content', () => {
    const result = classifyFile({ path: 'skill/my-skill/SKILL.md', size: 200 }, skillPaths);
    expect(result.tier).toBe('skill-content');
  });

  it('classifies .md file under skill path as skill-content', () => {
    const result = classifyFile(
      { path: 'skill/my-skill/prompts/default.md', size: 150 },
      skillPaths,
    );
    expect(result.tier).toBe('skill-content');
  });

  it('classifies prompts/ directory entry under skill path as skill-content', () => {
    const result = classifyFile({ path: 'skill/my-skill/prompts', size: 0 }, skillPaths);
    expect(result.tier).toBe('skill-content');
  });

  it('classifies lock file under skill path as ambiguous', () => {
    const result = classifyFile(
      { path: 'skill/my-skill/package-lock.json', size: 5000 },
      skillPaths,
    );
    expect(result.tier).toBe('ambiguous');
  });

  it('classifies .ts file under skill path as ambiguous', () => {
    const result = classifyFile({ path: 'skill/my-skill/build.ts', size: 300 }, skillPaths);
    expect(result.tier).toBe('ambiguous');
  });

  it('classifies tsconfig.json under skill path as ambiguous', () => {
    const result = classifyFile({ path: 'skill/my-skill/tsconfig.json', size: 200 }, skillPaths);
    expect(result.tier).toBe('ambiguous');
  });

  it('classifies scripts/ entry under skill path as ambiguous', () => {
    const result = classifyFile({ path: 'skill/my-skill/scripts/build.sh', size: 80 }, skillPaths);
    expect(result.tier).toBe('ambiguous');
  });

  it('classifies node_modules under skill path as violation', () => {
    const result = classifyFile(
      { path: 'skill/my-skill/node_modules/dep/index.js', size: 1000 },
      skillPaths,
    );
    expect(result.tier).toBe('violation');
  });

  it('classifies .git under skill path as violation', () => {
    const result = classifyFile({ path: 'skill/my-skill/.git/config', size: 50 }, skillPaths);
    expect(result.tier).toBe('violation');
  });
});

// ---------------------------------------------------------------------------
// runCheck — preview mode (task 7.1)
// ---------------------------------------------------------------------------

describe('runCheck — preview mode', () => {
  let stdoutChunks: string[];
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutChunks = [];
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    setupPackageMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('prints classified output and does not write .npmignore', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(
        makePackOutput([
          { path: 'package.json', size: 100 },
          { path: 'bin/cli.js', size: 50 },
          { path: `${SKILL_DIR}/SKILL.md`, size: 200 },
          { path: `${SKILL_DIR}/package-lock.json`, size: 5000 },
        ]),
      ),
    );

    await runCheck({ interactive: false });

    const output = stdoutChunks.join('');
    expect(output).toContain('publish check');
    expect(output).toContain('✓ package infrastructure');
    expect(output).toContain('✓ skill content');
    expect(output).toContain('⚠ review');
    expect(mockFspAppendFile).not.toHaveBeenCalled();
  });

  it('does not show prompts in preview mode', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(makePackOutput([{ path: `${SKILL_DIR}/package-lock.json`, size: 5000 }])),
    );

    await runCheck({ interactive: false });

    expect(mockCheckbox).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('prints warning and returns (non-fatal) when npm pack fails', async () => {
    mockSpawnSync.mockReturnValue(makeSpawnResult('', 1));

    await expect(runCheck({ interactive: false })).resolves.toBeUndefined();

    const output = stdoutChunks.join('');
    expect(output).toContain('unavailable');
  });
});

// ---------------------------------------------------------------------------
// runCheck — violation detection (task 7.2)
// ---------------------------------------------------------------------------

describe('runCheck — violation detection', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
    setupPackageMocks();
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('exits 1 when node_modules appears under skill path in preview mode', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(
        makePackOutput([{ path: `${SKILL_DIR}/node_modules/dep/index.js`, size: 1000 }]),
      ),
    );

    await runCheck({ interactive: false });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits 1 for violations in interactive mode too', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(makePackOutput([{ path: `${SKILL_DIR}/.git/config`, size: 50 }])),
    );

    await runCheck({ interactive: true });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// runCheck — interactive flow (task 7.4)
// ---------------------------------------------------------------------------

describe('runCheck — interactive flow', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stdoutChunks: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
    mockFspAppendFile.mockResolvedValue(undefined);
    setupPackageMocks();
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('appends selected ambiguous items to .npmignore and exits 1', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(
        makePackOutput([
          { path: `${SKILL_DIR}/SKILL.md`, size: 100 },
          { path: `${SKILL_DIR}/package-lock.json`, size: 5000 },
          { path: `${SKILL_DIR}/tsconfig.json`, size: 300 },
        ]),
      ),
    );
    mockCheckbox.mockResolvedValueOnce([`${SKILL_DIR}/package-lock.json`]);
    mockConfirm.mockResolvedValue(false);

    await runCheck({ interactive: true });

    expect(mockFspAppendFile).toHaveBeenCalledOnce();
    const [, content] = mockFspAppendFile.mock.calls[0];
    expect(String(content)).toContain(`${SKILL_DIR}/package-lock.json`);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does not write .npmignore and does not exit 1 when nothing selected', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(makePackOutput([{ path: `${SKILL_DIR}/package-lock.json`, size: 5000 }])),
    );
    mockCheckbox.mockResolvedValueOnce([]);
    mockConfirm.mockResolvedValue(false);

    await runCheck({ interactive: true });

    expect(mockFspAppendFile).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it('appends to existing .npmignore without overwriting', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(makePackOutput([{ path: `${SKILL_DIR}/tsconfig.json`, size: 200 }])),
    );
    mockCheckbox.mockResolvedValueOnce([`${SKILL_DIR}/tsconfig.json`]);
    mockConfirm.mockResolvedValue(false);

    await runCheck({ interactive: true });

    // appendFile, not writeFile
    expect(mockFspAppendFile).toHaveBeenCalledOnce();
  });

  it('skips prompts when no ambiguous items present', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(
        makePackOutput([
          { path: 'package.json', size: 100 },
          { path: `${SKILL_DIR}/SKILL.md`, size: 200 },
        ]),
      ),
    );

    await runCheck({ interactive: true });

    expect(mockCheckbox).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it('exits 0 (no process.exit call with 1) when no items selected', async () => {
    mockSpawnSync.mockReturnValue(
      makeSpawnResult(makePackOutput([{ path: `${SKILL_DIR}/package-lock.json`, size: 5000 }])),
    );
    mockCheckbox.mockResolvedValueOnce([]);
    mockConfirm.mockResolvedValue(false);

    await runCheck({ interactive: true });

    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });
});
