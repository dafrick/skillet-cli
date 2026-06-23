import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePluginManifests } from '../../src/plugin-manifests.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawnSync: vi.fn() };
});

const mockSpawnSync = vi.mocked(spawnSync);

function makeSpawnResult(
  status: number,
  stdout = '',
  stderr = '',
  error?: Error,
): ReturnType<typeof spawnSync> {
  return {
    status,
    stdout,
    stderr,
    pid: 1,
    output: [null, stdout, stderr],
    signal: null,
    error,
  };
}

/** All git checks succeed — clean tree, valid origin, tag found */
function mockGitSuccess(version: string): void {
  mockSpawnSync
    .mockReturnValueOnce(makeSpawnResult(0, '', '')) // git status --porcelain (clean)
    .mockReturnValueOnce(makeSpawnResult(0, 'https://github.com/owner/repo.git', '')) // git remote get-url origin
    .mockReturnValueOnce(makeSpawnResult(0, `abc123\trefs/tags/v${version}\n`, '')); // git ls-remote (tag found)
}

/** A sentinel error thrown by our process.exit mock so we can stop execution */
class ExitError extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
  }
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-manifests-test-'));
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers to set up temp dirs
// ---------------------------------------------------------------------------

function writePkgJson(dir: string, version: string): void {
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'test-pkg', version }),
    'utf8',
  );
}

function writePluginJson(dir: string, version: string, skills: string[]): void {
  const claudeDir = path.join(dir, '.claude-plugin');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(
    path.join(claudeDir, 'plugin.json'),
    JSON.stringify({ name: 'test-pkg', version, skills }),
    'utf8',
  );
}

function writeGeminiExt(dir: string, version: string, contextFileName: string): void {
  fs.writeFileSync(
    path.join(dir, 'gemini-extension.json'),
    JSON.stringify({ name: 'test-pkg', version, contextFileName }),
    'utf8',
  );
}

function makeSkillDir(dir: string, relPath: string): void {
  const full = path.join(dir, relPath);
  fs.mkdirSync(full, { recursive: true });
  fs.writeFileSync(path.join(full, 'SKILL.md'), '# skill\n', 'utf8');
}

/**
 * Run validatePluginManifests, capturing stderr writes and exit code.
 * The process.exit mock throws ExitError so execution stops at the first exit.
 */
async function runValidate(
  dir: string,
): Promise<{ exitCode: number | null; stderrOutput: string }> {
  const stderrWrites: string[] = [];
  let exitCode: number | null = null;

  const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    exitCode = typeof code === 'number' ? code : 0;
    throw new ExitError(exitCode);
  }) as unknown as ReturnType<typeof vi.spyOn>;

  const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    stderrWrites.push(String(chunk));
    return true;
  });

  try {
    await validatePluginManifests(dir);
  } catch (err) {
    if (!(err instanceof ExitError)) throw err;
  } finally {
    mockExit.mockRestore();
    mockStderr.mockRestore();
  }

  return { exitCode, stderrOutput: stderrWrites.join('') };
}

// ---------------------------------------------------------------------------
// Test: no manifests → silent no-op
// ---------------------------------------------------------------------------

describe('validatePluginManifests — no manifests', () => {
  it('returns without calling process.exit or writing to stderr when no manifests exist', async () => {
    writePkgJson(tmpDir, '1.0.0');

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBeNull();
    expect(stderrOutput).toBe('');
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Test: plugin.json version checks
// ---------------------------------------------------------------------------

describe('validatePluginManifests — plugin.json version', () => {
  it('exits 1 when plugin.json version does not match package.json', async () => {
    writePkgJson(tmpDir, '2.0.0');
    makeSkillDir(tmpDir, 'skills/my-skill');
    writePluginJson(tmpDir, '1.0.0', ['./skills/my-skill']);

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('does not match');
    expect(stderrOutput).toContain('1.0.0');
    expect(stderrOutput).toContain('2.0.0');
  });

  it('does not exit when plugin.json version matches package.json', async () => {
    writePkgJson(tmpDir, '1.0.0');
    makeSkillDir(tmpDir, 'skills/my-skill');
    writePluginJson(tmpDir, '1.0.0', ['./skills/my-skill']);

    mockGitSuccess('1.0.0');

    const { exitCode } = await runValidate(tmpDir);

    expect(exitCode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test: gemini-extension.json version checks
// ---------------------------------------------------------------------------

describe('validatePluginManifests — gemini-extension.json version', () => {
  it('exits 1 when gemini-extension.json version does not match package.json', async () => {
    writePkgJson(tmpDir, '2.0.0');
    // Write a SKILL.md so contextFileName check would pass (version check fires first)
    fs.writeFileSync(path.join(tmpDir, 'SKILL.md'), '# skill\n', 'utf8');
    writeGeminiExt(tmpDir, '1.0.0', 'SKILL.md');

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('gemini-extension.json');
    expect(stderrOutput).toContain('does not match');
  });
});

// ---------------------------------------------------------------------------
// Test: skills path checks
// ---------------------------------------------------------------------------

describe('validatePluginManifests — skills path resolution', () => {
  it('exits 1 when skills path directory does not exist', async () => {
    writePkgJson(tmpDir, '1.0.0');
    writePluginJson(tmpDir, '1.0.0', ['./skills/missing']);

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('does not contain SKILL.md');
    expect(stderrOutput).toContain('./skills/missing');
  });

  it('exits 1 when skills path directory exists but has no SKILL.md', async () => {
    writePkgJson(tmpDir, '1.0.0');
    const skillDir = path.join(tmpDir, 'skills', 'no-skill-md');
    fs.mkdirSync(skillDir, { recursive: true });
    // Do NOT write SKILL.md
    writePluginJson(tmpDir, '1.0.0', ['./skills/no-skill-md']);

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('does not contain SKILL.md');
  });

  it('does not exit when valid skills path with SKILL.md exists', async () => {
    writePkgJson(tmpDir, '1.0.0');
    makeSkillDir(tmpDir, 'skills/my-skill');
    writePluginJson(tmpDir, '1.0.0', ['./skills/my-skill']);

    mockGitSuccess('1.0.0');

    const { exitCode } = await runValidate(tmpDir);

    expect(exitCode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test: contextFileName checks
// ---------------------------------------------------------------------------

describe('validatePluginManifests — contextFileName', () => {
  it('does not exit when contextFileName exists', async () => {
    writePkgJson(tmpDir, '1.0.0');
    fs.writeFileSync(path.join(tmpDir, 'GEMINI.md'), '# gemini\n', 'utf8');
    writeGeminiExt(tmpDir, '1.0.0', 'GEMINI.md');

    mockGitSuccess('1.0.0');

    const { exitCode } = await runValidate(tmpDir);

    expect(exitCode).toBeNull();
  });

  it('exits 1 when contextFileName does not exist', async () => {
    writePkgJson(tmpDir, '1.0.0');
    // Do NOT write GEMINI.md
    writeGeminiExt(tmpDir, '1.0.0', 'GEMINI.md');

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('contextFileName');
    expect(stderrOutput).toContain('GEMINI.md');
    expect(stderrOutput).toContain('does not exist');
  });
});

// ---------------------------------------------------------------------------
// Git checks — use a shared setup: valid plugin.json with SKILL.md
// ---------------------------------------------------------------------------

function setupValidManifestDir(dir: string, version = '1.0.0'): void {
  writePkgJson(dir, version);
  makeSkillDir(dir, 'skills/my-skill');
  writePluginJson(dir, version, ['./skills/my-skill']);
}

describe('validatePluginManifests — git working tree cleanliness', () => {
  it('exits 1 when there are uncommitted changes', async () => {
    setupValidManifestDir(tmpDir);

    mockSpawnSync.mockReturnValueOnce(makeSpawnResult(0, ' M README.md\n', '')); // dirty

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('uncommitted changes');
    expect(stderrOutput).toContain('README.md');
  });

  it('does not exit on clean working tree (proceeds to next check)', async () => {
    setupValidManifestDir(tmpDir);

    mockSpawnSync
      .mockReturnValueOnce(makeSpawnResult(0, '', '')) // git status clean
      .mockReturnValueOnce(makeSpawnResult(0, 'https://github.com/owner/repo.git', '')) // remote ok
      .mockReturnValueOnce(makeSpawnResult(0, 'abc123\trefs/tags/v1.0.0\n', '')); // tag found

    const { exitCode } = await runValidate(tmpDir);

    expect(exitCode).toBeNull();
  });
});

describe('validatePluginManifests — git origin remote', () => {
  it('exits 1 when no origin remote exists', async () => {
    setupValidManifestDir(tmpDir);

    mockSpawnSync
      .mockReturnValueOnce(makeSpawnResult(0, '', '')) // git status clean
      .mockReturnValueOnce(makeSpawnResult(128, '', 'error: No such remote')); // no origin

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain("no git remote named 'origin'");
    expect(stderrOutput).toContain('GitHub');
  });
});

describe('validatePluginManifests — remote tag existence', () => {
  it('exits 1 when tag is missing from remote', async () => {
    setupValidManifestDir(tmpDir, '1.2.3');

    mockSpawnSync
      .mockReturnValueOnce(makeSpawnResult(0, '', '')) // git status clean
      .mockReturnValueOnce(makeSpawnResult(0, 'https://github.com/owner/repo.git', '')) // remote ok
      .mockReturnValueOnce(makeSpawnResult(0, '', '')); // ls-remote: empty = tag not found

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('tag v1.2.3 not found');
    expect(stderrOutput).toContain('git tag v1.2.3 && git push origin v1.2.3');
  });

  it('exits 1 when git ls-remote fails (network error)', async () => {
    setupValidManifestDir(tmpDir, '1.0.0');

    mockSpawnSync
      .mockReturnValueOnce(makeSpawnResult(0, '', '')) // git status clean
      .mockReturnValueOnce(makeSpawnResult(0, 'https://github.com/owner/repo.git', '')) // remote ok
      .mockReturnValueOnce(
        makeSpawnResult(128, '', 'fatal: unable to connect', new Error('spawn error')),
      ); // network fail

    const { exitCode, stderrOutput } = await runValidate(tmpDir);

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain("could not reach remote 'origin'");
  });

  it('does not exit when tag exists on remote', async () => {
    setupValidManifestDir(tmpDir, '1.0.0');

    mockGitSuccess('1.0.0');

    const { exitCode } = await runValidate(tmpDir);

    expect(exitCode).toBeNull();
  });
});
