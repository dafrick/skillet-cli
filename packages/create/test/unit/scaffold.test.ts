import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    chmodSync: vi.fn(),
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    chmod: vi.fn(),
  };
});

import { spawnSync } from 'node:child_process';
import type { WizardConfig } from '../../src/prompts.js';
import { executeScaffold } from '../../src/scaffold.js';

const mockSpawnSync = vi.mocked(spawnSync);
const mockFsExistsSync = vi.mocked(fs.existsSync);

function makeSuccessResult() {
  return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as ReturnType<
    typeof spawnSync
  >;
}

function makeFailResult() {
  return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('error') } as ReturnType<
    typeof spawnSync
  >;
}

const baseConfig: WizardConfig = {
  name: 'my-skill',
  version: '1.0.0',
  description: 'A test skill',
  author: 'Test Author',
  repositoryUrl: 'git+https://github.com/org/repo',
  license: 'MIT',
  skillDir: 'skill/',
};

describe('executeScaffold — npm init conditional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
  });

  it('runs npm init -y when no package.json exists', async () => {
    mockFsExistsSync.mockReturnValue(false);

    await executeScaffold(baseConfig);

    const calls = mockSpawnSync.mock.calls;
    const initCall = calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('npm') && c[0].includes('init'),
    );
    expect(initCall).toBeDefined();
  });

  it('skips npm init when package.json already exists', async () => {
    mockFsExistsSync.mockReturnValue(true);

    await executeScaffold(baseConfig);

    const calls = mockSpawnSync.mock.calls;
    const initCall = calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('npm') && c[0].includes('init'),
    );
    expect(initCall).toBeUndefined();
  });
});

describe('executeScaffold — npm pkg set fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    mockFsExistsSync.mockReturnValue(true);
  });

  function getPkgSetArgs(): string[] {
    return mockSpawnSync.mock.calls
      .filter(
        (c) =>
          typeof c[0] === 'string' &&
          c[0].includes('npm') &&
          c[0].includes('"pkg"') &&
          c[0].includes('"set"'),
      )
      .map((c) => c[0] as string);
  }

  it('sets name field', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('name=') && a.includes('my-skill'))).toBe(true);
  });

  it('sets version field', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('version=') && a.includes('1.0.0'))).toBe(true);
  });

  it('sets description field', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('description='))).toBe(true);
  });

  it('sets author field', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('author='))).toBe(true);
  });

  it('sets license field', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('license=') && a.includes('MIT'))).toBe(true);
  });

  it('sets type=module', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('type=module'))).toBe(true);
  });

  it('sets engines.node', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('engines.node='))).toBe(true);
  });

  it('sets skillet.skillDir', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('skillet.skillDir='))).toBe(true);
  });

  it('sets bin entry', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    // bin.[name]=./bin/cli.js
    expect(allArgs.some((a) => a.includes('bin.') && a.includes('./bin/cli.js'))).toBe(true);
  });
});

describe('executeScaffold — repository URL guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    mockFsExistsSync.mockReturnValue(true);
  });

  function getPkgSetArgs(): string[] {
    return mockSpawnSync.mock.calls
      .filter(
        (c) =>
          typeof c[0] === 'string' &&
          c[0].includes('npm') &&
          c[0].includes('"pkg"') &&
          c[0].includes('"set"'),
      )
      .map((c) => c[0] as string);
  }

  it('does NOT set repository.url when repositoryUrl is empty', async () => {
    await executeScaffold({ ...baseConfig, repositoryUrl: '' });
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('repository.url'))).toBe(false);
  });

  it('sets repository.url when repositoryUrl is non-empty', async () => {
    await executeScaffold({ ...baseConfig, repositoryUrl: 'git+https://github.com/org/repo' });
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('repository.url'))).toBe(true);
    expect(allArgs.some((a) => a.includes('repository.type=git'))).toBe(true);
  });
});
