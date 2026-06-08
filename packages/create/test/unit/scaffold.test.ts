import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { buildBinCliJs, executeScaffold } from '../../src/scaffold.js';

const mockSpawnSync = vi.mocked(spawnSync);
const mockFsExistsSync = vi.mocked(fs.existsSync);

function makeSuccessResult() {
  return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as ReturnType<
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

describe('buildBinCliJs — generated bin/cli.js content', () => {
  it('takes no arguments and returns a string', () => {
    const result = buildBinCliJs();
    expect(typeof result).toBe('string');
  });

  it('generated content calls run({ pkg }) with no skillDir argument', () => {
    const result = buildBinCliJs();
    expect(result).toContain('run({ pkg })');
    expect(result).not.toContain('skillDir');
  });

  it('generated content does not contain fileURLToPath or new URL', () => {
    const result = buildBinCliJs();
    expect(result).not.toContain('fileURLToPath');
    expect(result).not.toContain('new URL');
  });

  it('generated content imports run from @skillet-cli/core', () => {
    const result = buildBinCliJs();
    expect(result).toContain("from '@skillet-cli/core'");
    expect(result).toContain('run');
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
