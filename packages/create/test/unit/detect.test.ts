import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We mock child_process spawnSync to control git subprocess behavior
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'node:child_process';
import { detectEnvironment } from '../../src/detect.js';

const mockSpawnSync = vi.mocked(spawnSync);

// Helper to make spawnSync return a given stdout string with status 0
function mockGitSuccess(results: Record<string, string>) {
  mockSpawnSync.mockImplementation((cmd: string, args?: readonly string[]) => {
    const key = [cmd, ...(args ?? [])].join(' ');
    for (const [pattern, value] of Object.entries(results)) {
      if (key.includes(pattern)) {
        return {
          status: 0,
          stdout: Buffer.from(`${value}\n`),
          stderr: Buffer.from(''),
        } as ReturnType<typeof spawnSync>;
      }
    }
    return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('error') } as ReturnType<
      typeof spawnSync
    >;
  });
}

function mockGitFailure() {
  mockSpawnSync.mockReturnValue({
    status: 1,
    stdout: Buffer.from(''),
    stderr: Buffer.from('error'),
  } as ReturnType<typeof spawnSync>);
}

describe('detectEnvironment — git remote normalization', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'detect-test-')));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('SSH remote → git+https URL', () => {
    mockGitSuccess({
      'get-url origin': 'git@github.com:org/repo.git',
      'user.name': 'Test User',
      'user.email': 'test@example.com',
    });

    const result = detectEnvironment();
    expect(result.repositoryUrl).toBe('git+https://github.com/org/repo');
  });

  it('already-HTTPS remote → git+https URL', () => {
    mockGitSuccess({
      'get-url origin': 'https://github.com/org/repo',
      'user.name': 'Test User',
      'user.email': 'test@example.com',
    });

    const result = detectEnvironment();
    expect(result.repositoryUrl).toBe('git+https://github.com/org/repo');
  });

  it('.git suffix stripped from HTTPS remote', () => {
    mockGitSuccess({
      'get-url origin': 'https://github.com/org/repo.git',
      'user.name': 'Test User',
      'user.email': 'test@example.com',
    });

    const result = detectEnvironment();
    expect(result.repositoryUrl).toBe('git+https://github.com/org/repo');
  });

  it('git remote failure → repositoryUrl: ""', () => {
    mockGitFailure();

    const result = detectEnvironment();
    expect(result.repositoryUrl).toBe('');
  });
});

describe('detectEnvironment — existing package.json', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'detect-test-')));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    mockGitFailure();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('reads all fields from existing package.json', async () => {
    const pkgData = {
      name: 'my-skill',
      version: '1.2.3',
      author: 'Jane Doe',
      description: 'A great skill',
      skillet: { skillDir: 'skill/' },
    };
    await fsp.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkgData));

    const result = detectEnvironment();

    expect(result.name).toBe('my-skill');
    expect(result.version).toBe('1.2.3');
    expect(result.author).toBe('Jane Doe');
    expect(result.description).toBe('A great skill');
    expect(result.skillDir).toBe('skill/');
    expect(result.hasPackageJson).toBe(true);
  });

  it('skillDir comes from skillet.skillDir not filesystem check', async () => {
    const pkgData = {
      name: 'my-skill',
      version: '1.0.0',
      skillet: { skillDir: 'custom-skills/' },
    };
    await fsp.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkgData));
    // Create a skill/ folder - should be ignored since package.json has skillDir
    await fsp.mkdir(path.join(tmpDir, 'skill'));

    const result = detectEnvironment();
    expect(result.skillDir).toBe('custom-skills/');
  });

  it('nameArg overrides package.json name', async () => {
    const pkgData = { name: 'original-name', version: '1.0.0' };
    await fsp.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkgData));

    const result = detectEnvironment('override-name');
    expect(result.name).toBe('override-name');
  });

  it('0.0.0-source placeholder version is returned as empty string', async () => {
    const pkgData = { name: 'my-skill', version: '0.0.0-source' };
    await fsp.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkgData));

    const result = detectEnvironment();
    expect(result.version).toBe('');
  });

  it('0.0.0 exact version is returned as empty string', async () => {
    const pkgData = { name: 'my-skill', version: '0.0.0' };
    await fsp.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkgData));

    const result = detectEnvironment();
    expect(result.version).toBe('');
  });

  it('real pre-release version like 1.0.0-beta.1 is preserved', async () => {
    const pkgData = { name: 'my-skill', version: '1.0.0-beta.1' };
    await fsp.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkgData));

    const result = detectEnvironment();
    expect(result.version).toBe('1.0.0-beta.1');
  });
});

describe('detectEnvironment — no package.json, kebab-case from directory name', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'detect-test-')));
    originalCwd = process.cwd();
    vi.clearAllMocks();
    mockGitFailure();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  async function withDirName(name: string): Promise<string> {
    const dir = path.join(tmpDir, name);
    await fsp.mkdir(dir, { recursive: true });
    process.chdir(dir);
    const result = detectEnvironment();
    return result.name;
  }

  it('spaces → hyphens', async () => {
    expect(await withDirName('My Skill')).toBe('my-skill');
  });

  it('underscores → hyphens', async () => {
    expect(await withDirName('My_Skill_v2')).toBe('my-skill-v2');
  });

  it('leading dot stripped', async () => {
    expect(await withDirName('.config')).toBe('config');
  });

  it('hasPackageJson is false when no package.json', async () => {
    const dir = path.join(tmpDir, 'test-skill');
    await fsp.mkdir(dir, { recursive: true });
    process.chdir(dir);
    const result = detectEnvironment();
    expect(result.hasPackageJson).toBe(false);
  });
});

describe('detectEnvironment — skill/ subfolder detection', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'detect-test-')));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    mockGitFailure();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('skill/ subfolder present, no package.json → skillDir: "skill/"', async () => {
    await fsp.mkdir(path.join(tmpDir, 'skill'));

    const result = detectEnvironment();
    expect(result.skillDir).toBe('skill/');
  });

  it('no skill/ subfolder and no package.json → skillDir: null', () => {
    const result = detectEnvironment();
    expect(result.skillDir).toBeNull();
  });

  it('SKILL.md in cwd → hasSkillMd: true', async () => {
    await fsp.writeFile(path.join(tmpDir, 'SKILL.md'), '# Skill');

    const result = detectEnvironment();
    expect(result.hasSkillMd).toBe(true);
  });

  it('no SKILL.md → hasSkillMd: false', () => {
    const result = detectEnvironment();
    expect(result.hasSkillMd).toBe(false);
  });
});
