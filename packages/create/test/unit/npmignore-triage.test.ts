import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — before module imports
// ---------------------------------------------------------------------------

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, appendFile: vi.fn(), readFile: vi.fn() };
});

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
}));

// Provide a known DEFAULT_IGNORE so classifyFile behaves predictably in tests
vi.mock('@skillet-cli/core', () => ({
  DEFAULT_IGNORE: new Set(['node_modules', '.git', '.DS_Store', '.skill-manifest.json', '.env']),
  lintSkillFrontmatter: vi.fn().mockReturnValue(true),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import * as fsp from 'node:fs/promises';
import { checkbox } from '@inquirer/prompts';
import type { ClassifiedFile } from '../../src/check.js';
import { triageViolations } from '../../src/npmignore-triage.js';

const mockSpawnSync = vi.mocked(spawnSync);
const mockFspAppendFile = vi.mocked(fsp.appendFile);
const mockFspReadFile = vi.mocked(fsp.readFile);
const mockCheckbox = vi.mocked(checkbox);

const CWD = '/fake/pkg';
const SKILL_PATHS = ['skill/my-skill'];

function makeViolation(packPath: string, size = 100): ClassifiedFile {
  return { packPath, size, tier: 'violation' };
}

function makePackResult(files: { path: string; size: number }[], status = 0) {
  return {
    status,
    stdout: JSON.stringify([{ name: 'my-skill', version: '0.1.0', files }]),
    stderr: '',
    pid: 1,
    output: [],
    signal: null,
  } as ReturnType<typeof spawnSync>;
}

// ---------------------------------------------------------------------------
// Helper: set up a clean re-check that returns zero violations
// ---------------------------------------------------------------------------
function setupCleanRecheck() {
  mockSpawnSync.mockReturnValue(
    makePackResult([
      { path: 'package.json', size: 100 },
      { path: 'bin/cli.js', size: 50 },
    ]),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('triageViolations', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stdoutChunks: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutChunks = [];
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

    mockFspReadFile.mockRejectedValue({ code: 'ENOENT' }); // no existing .npmignore
    mockFspAppendFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('returns immediately when violations array is empty', async () => {
    await triageViolations([], SKILL_PATHS, CWD);

    expect(mockCheckbox).not.toHaveBeenCalled();
    expect(mockFspAppendFile).not.toHaveBeenCalled();
  });

  it('excludes a single top-level file and writes it to .npmignore', async () => {
    const violations = [makeViolation('.env')];

    // User unchecks .env (selected = [])
    mockCheckbox.mockResolvedValueOnce([]); // main checkbox: nothing kept
    // No dirs → no expand prompt → loop ends

    setupCleanRecheck();

    await triageViolations(violations, SKILL_PATHS, CWD);

    expect(mockFspAppendFile).toHaveBeenCalledOnce();
    const [, content] = mockFspAppendFile.mock.calls[0];
    expect(String(content)).toContain('.env');
  });

  it('collapses a directory and writes dirname/ to .npmignore when excluded', async () => {
    const violations = [
      makeViolation('node_modules/lodash/index.js'),
      makeViolation('node_modules/lodash/utils.js'),
    ];

    // User unchecks node_modules/ (selected = [])
    mockCheckbox.mockResolvedValueOnce([]);

    setupCleanRecheck();

    await triageViolations(violations, SKILL_PATHS, CWD);

    const [, content] = mockFspAppendFile.mock.calls[0];
    expect(String(content)).toContain('node_modules/');
    expect(String(content)).not.toContain('lodash');
  });

  it('expands a directory then excludes a child', async () => {
    const violations = [
      makeViolation('node_modules/lodash/index.js'),
      makeViolation('node_modules/lodash/utils.js'),
      makeViolation('node_modules/semver/index.js'),
    ];

    // Iteration 1 — main checkbox: keep node_modules/ (3 files) (leave it checked)
    mockCheckbox.mockResolvedValueOnce(['node_modules/ (3 files)']);
    // Expansion prompt: expand node_modules/
    mockCheckbox.mockResolvedValueOnce(['node_modules/ (3 files)']);
    // Iteration 2 — main checkbox: uncheck node_modules/lodash/ (exclude it)
    mockCheckbox.mockResolvedValueOnce(['node_modules/semver/index.js']); // keep only semver
    // No more dirs selected → loop ends

    setupCleanRecheck();

    await triageViolations(violations, SKILL_PATHS, CWD);

    const [, content] = mockFspAppendFile.mock.calls[0];
    expect(String(content)).toContain('node_modules/lodash/');
    expect(String(content)).not.toContain('node_modules/semver');
  });

  it('deduplicates entries already in .npmignore', async () => {
    const violations = [makeViolation('.env')];

    // Existing .npmignore already contains .env
    mockFspReadFile.mockResolvedValue('.env\n*.log\n');

    // User excludes .env
    mockCheckbox.mockResolvedValueOnce([]);

    setupCleanRecheck();

    await triageViolations(violations, SKILL_PATHS, CWD);

    // appendFile should NOT be called since .env is already present
    expect(mockFspAppendFile).not.toHaveBeenCalled();
  });

  it('prints diagnostic and calls process.exit(1) when .npmignore write fails with EACCES', async () => {
    const violations = [makeViolation('.env')];

    mockCheckbox.mockResolvedValueOnce([]); // exclude .env

    mockFspAppendFile.mockRejectedValue(
      Object.assign(new Error('Permission denied'), { code: 'EACCES' }),
    );

    await triageViolations(violations, SKILL_PATHS, CWD);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = (stderrSpy.mock.calls as [unknown][]).map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('permission denied');
  });

  it('calls process.exit(1) when re-check still finds violations', async () => {
    const violations = [makeViolation('.env')];

    mockCheckbox.mockResolvedValueOnce([]); // exclude .env

    // Re-check: violation still present (maybe .npmignore pattern didn't match)
    mockSpawnSync.mockReturnValue(
      makePackResult([
        { path: 'skill/my-skill/.env', size: 50 }, // still in tarball
      ]),
    );

    await triageViolations(violations, SKILL_PATHS, CWD);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('prints success message when re-check finds zero violations', async () => {
    const violations = [makeViolation('.env')];

    mockCheckbox.mockResolvedValueOnce([]); // exclude .env

    setupCleanRecheck(); // no violations in re-check

    await triageViolations(violations, SKILL_PATHS, CWD);

    const allOutput = stdoutChunks.join('');
    expect(allOutput).toContain('✓');
    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });
});
