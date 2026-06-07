import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
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
import { executeBatchScaffold, executeScaffold } from '../../src/scaffold.js';

const mockSpawnSync = vi.mocked(spawnSync);
const mockFsExistsSync = vi.mocked(fs.existsSync);
const mockFspMkdir = vi.mocked(fsp.mkdir);
const mockFspWriteFile = vi.mocked(fsp.writeFile);

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
  skillDirs: ['skill/'],
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

  it('sets skillet.skillDir from skillDirs[0]', async () => {
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

describe('executeBatchScaffold — creates dist packages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    mockFspMkdir.mockResolvedValue(undefined);
    mockFspWriteFile.mockResolvedValue(undefined);
    vi.mocked(fsp.chmod).mockResolvedValue(undefined);
  });

  const batchConfig: WizardConfig = {
    name: 'my-skill-collection',
    version: '1.0.0',
    description: 'A skill collection',
    author: 'Test Author',
    repositoryUrl: '',
    license: 'MIT',
    skillDirs: ['skills/skill-a/', 'skills/skill-b/'],
  };

  it('creates a bin directory for each skill', async () => {
    await executeBatchScaffold(batchConfig);
    const mkdirPaths = mockFspMkdir.mock.calls.map((c) => c[0] as string);
    expect(mkdirPaths.some((p) => p.includes('skill-a'))).toBe(true);
    expect(mkdirPaths.some((p) => p.includes('skill-b'))).toBe(true);
  });

  it('writes bin/cli.js for each skill', async () => {
    await executeBatchScaffold(batchConfig);
    const writePaths = mockFspWriteFile.mock.calls.map((c) => c[0] as string);
    expect(writePaths.some((p) => p.includes('skill-a') && p.includes('cli.js'))).toBe(true);
    expect(writePaths.some((p) => p.includes('skill-b') && p.includes('cli.js'))).toBe(true);
  });

  it('writes package.json for each skill', async () => {
    await executeBatchScaffold(batchConfig);
    const writePaths = mockFspWriteFile.mock.calls.map((c) => c[0] as string);
    expect(writePaths.some((p) => p.includes('skill-a') && p.endsWith('package.json'))).toBe(true);
    expect(writePaths.some((p) => p.includes('skill-b') && p.endsWith('package.json'))).toBe(true);
  });

  it('derives package name from skill dir basename', async () => {
    await executeBatchScaffold(batchConfig);
    const skillAWrite = mockFspWriteFile.mock.calls.find(
      (c) => (c[0] as string).includes('skill-a') && (c[0] as string).endsWith('package.json'),
    );
    expect(skillAWrite).toBeDefined();
    const pkg = JSON.parse(skillAWrite![1] as string) as { name: string };
    expect(pkg.name).toBe('skill-a');
  });

  it('sets type=module, engines, and skillet.skillDir in each package.json', async () => {
    await executeBatchScaffold(batchConfig);
    const skillAWrite = mockFspWriteFile.mock.calls.find(
      (c) => (c[0] as string).includes('skill-a') && (c[0] as string).endsWith('package.json'),
    );
    const pkg = JSON.parse(skillAWrite![1] as string) as {
      type: string;
      engines: { node: string };
      skillet: { skillDir: string };
    };
    expect(pkg.type).toBe('module');
    expect(pkg.engines.node).toBe('>=24');
    expect(pkg.skillet.skillDir).toBe('skills/skill-a/');
  });

  it('runs npm install @skillet-cli/core exactly once', async () => {
    await executeBatchScaffold(batchConfig);
    const installCalls = mockSpawnSync.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('@skillet-cli/core'),
    );
    expect(installCalls).toHaveLength(1);
  });

  it('does NOT call npm pkg set (uses direct JSON writes instead)', async () => {
    await executeBatchScaffold(batchConfig);
    const pkgSetCalls = mockSpawnSync.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('"pkg"') && c[0].includes('"set"'),
    );
    expect(pkgSetCalls).toHaveLength(0);
  });
});
