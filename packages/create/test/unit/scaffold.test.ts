import * as fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

const mockSpinnerStart = vi.fn();
const mockSpinnerSucceed = vi.fn();
const mockSpinnerFail = vi.fn();

vi.mock('@skillet-cli/ui', () => ({
  createSpinner: vi.fn(() => ({
    start: mockSpinnerStart,
    succeed: mockSpinnerSucceed,
    fail: mockSpinnerFail,
  })),
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
    const initCmd = initCall![0] as string;
    expect(initCmd).toContain('--init-license=MIT');
    expect(initCmd).toContain('--init-type=module');
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

describe('executeScaffold — npm install progress output', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    mockFsExistsSync.mockReturnValue(true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('writes a message containing @skillet-cli/core to stdout before the install spawnSync call', async () => {
    const writtenMessages: string[] = [];
    const spawnSyncCallOrder: Array<{ cmd: string; stdoutIndexAtCall: number }> = [];

    stdoutSpy.mockImplementation((chunk: unknown) => {
      writtenMessages.push(String(chunk));
      return true;
    });

    mockSpawnSync.mockImplementation((cmd: unknown, ..._rest: unknown[]) => {
      spawnSyncCallOrder.push({
        cmd: String(cmd),
        stdoutIndexAtCall: writtenMessages.length,
      });
      return makeSuccessResult();
    });

    await executeScaffold(baseConfig);

    // Find the install spawnSync call
    const installCall = spawnSyncCallOrder.find((c) => c.cmd.includes('npm install'));
    expect(installCall).toBeDefined();

    // Messages written before the install spawnSync call
    const writtenBeforeInstall = writtenMessages.slice(0, installCall!.stdoutIndexAtCall);
    expect(writtenBeforeInstall.some((msg) => msg.includes('@skillet-cli/core'))).toBe(true);
  });

  it('does NOT call spinner.start with an install-related label for the npm install step', async () => {
    await executeScaffold(baseConfig);

    const startCalls = mockSpinnerStart.mock.calls.map((c) => String(c[0]));
    expect(startCalls.some((label) => label.toLowerCase().includes('install'))).toBe(false);
    expect(startCalls.some((label) => label.toLowerCase().includes('firing'))).toBe(false);
  });

  it('writes "Install complete." to stdout after the install spawnSync completes with status 0', async () => {
    const writtenMessages: string[] = [];
    stdoutSpy.mockImplementation((chunk: unknown) => {
      writtenMessages.push(String(chunk));
      return true;
    });

    await executeScaffold(baseConfig);

    expect(writtenMessages.some((msg) => msg.includes('Install complete.'))).toBe(true);
  });
});
