import * as fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
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

// Default fallback for the bin/cli.js content comparison: matches
// buildBinCliJs()'s output exactly, so pre-existing tests that blanket-mock
// existsSync(...) to always return true (and therefore make binPath "exist")
// see a byte-identical match and take the silent-rewrite path rather than
// unexpectedly hitting the confirm() prompt. Kept as a literal string (not a
// call into buildBinCliJs()) to avoid a circular import through the mocked
// 'node:fs' module during test module resolution.
const DEFAULT_BIN_CLI_JS_FIXTURE = `#!/usr/bin/env node
import { createRequire } from 'node:module';
import { run } from '@skillet-cli/core';

const pkg = createRequire(import.meta.url)('../package.json');
await run({ pkg });
`;

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    chmodSync: vi.fn(),
    readFileSync: vi.fn((p: unknown) => {
      if (typeof p === 'string' && p.endsWith('cli.js')) {
        return `#!/usr/bin/env node
import { createRequire } from 'node:module';
import { run } from '@skillet-cli/core';

const pkg = createRequire(import.meta.url)('../package.json');
await run({ pkg });
`;
      }
      return '';
    }),
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
import * as fsp from 'node:fs/promises';
import { confirm } from '@inquirer/prompts';
import type { WizardConfig } from '../../src/prompts.js';
import { buildBinCliJs, executeScaffold } from '../../src/scaffold.js';

const mockSpawnSync = vi.mocked(spawnSync);
const mockFsExistsSync = vi.mocked(fs.existsSync);
const mockFsReadFileSync = vi.mocked(fs.readFileSync);
const mockFspWriteFile = vi.mocked(fsp.writeFile);
const mockConfirm = vi.mocked(confirm);

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
  isMultiSkill: false,
  skillsParentDirs: [],
  removePrivate: false,
  generateClaudePlugin: false,
  generateGeminiPlugin: false,
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

  // Task 7.1: a literal byte-identical assertion, not just substring checks —
  // this is the exact content that was previously written inline by
  // executeScaffold and is now produced by the extracted buildBinCliJs().
  it('produces byte-identical output to the previously hardcoded bin/cli.js content', () => {
    expect(buildBinCliJs()).toBe(DEFAULT_BIN_CLI_JS_FIXTURE);
  });
});

describe('executeScaffold — description and author guards', () => {
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

  // Task 1.1: empty description is omitted from npm pkg set args
  it('does NOT include description= in npm pkg set args when config.description is empty', async () => {
    await executeScaffold({ ...baseConfig, description: '' });
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('description='))).toBe(false);
  });

  // Task 1.2: empty author is omitted from npm pkg set args
  it('does NOT include author= in npm pkg set args when config.author is empty', async () => {
    await executeScaffold({ ...baseConfig, author: '' });
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('author='))).toBe(false);
  });

  // Task 1.3: regression guards — non-empty values ARE included
  it('DOES include description= in npm pkg set args when config.description is non-empty', async () => {
    await executeScaffold({ ...baseConfig, description: 'A great skill' });
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('description=') && a.includes('A great skill'))).toBe(
      true,
    );
  });

  it('DOES include author= in npm pkg set args when config.author is non-empty', async () => {
    await executeScaffold({ ...baseConfig, author: 'Jane Doe' });
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('author=') && a.includes('Jane Doe'))).toBe(true);
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

describe('executeScaffold — files allowlist', () => {
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

  it('sets files[0]=bin in the npm pkg set command', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('files[0]=bin'))).toBe(true);
  });

  it('sets files[1]=<skillDir> in the npm pkg set command', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    // baseConfig.skillDir = 'skill/'
    expect(allArgs.some((a) => a.includes('files[1]=skill/'))).toBe(true);
  });

  it('files[0] value is "bin" (no leading slash)', async () => {
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    // The arg string will have "files[0]=bin" wrapped in double quotes by runSync
    expect(allArgs.some((a) => a.includes('"files[0]=bin"'))).toBe(true);
  });

  it('files[1] value matches config.skillDir exactly', async () => {
    await executeScaffold({ ...baseConfig, skillDir: 'my-skill/' });
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('"files[1]=my-skill/"'))).toBe(true);
  });

  // Task 1.4: regression guard — single-skill files[1] is unchanged
  it('single-skill mode: files[1] is still set to config.skillDir (regression guard)', async () => {
    // baseConfig has isMultiSkill: false, skillDir: 'skill/'
    await executeScaffold(baseConfig);
    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('"files[1]=skill/"'))).toBe(true);
    // Must NOT produce multi-skill style parent dir entries
    expect(allArgs.some((a) => a.includes('files[2]='))).toBe(false);
  });
});

describe('executeScaffold — multi-skill mode', () => {
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

  it('sets skillet.skills=skills (single parent) and does NOT set skillet.skillDir when isMultiSkill: true', async () => {
    const config: WizardConfig = {
      ...baseConfig,
      isMultiSkill: true,
      skillsParentDirs: ['skills'],
    };

    await executeScaffold(config);

    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('skillet.skills=') && a.includes('skills'))).toBe(true);
    expect(allArgs.some((a) => a.includes('skillet.skillDir='))).toBe(false);
  });

  it('sets skillet.skills as JSON array when skillsParentDirs has multiple entries and does NOT set skillet.skillDir', async () => {
    const config: WizardConfig = {
      ...baseConfig,
      isMultiSkill: true,
      skillsParentDirs: ['core', 'exp'],
    };

    await executeScaffold(config);

    const allArgs = getPkgSetArgs();
    expect(
      allArgs.some(
        (a) => a.includes('skillet.skills=') && a.includes('"core"') && a.includes('"exp"'),
      ),
    ).toBe(true);
    expect(allArgs.some((a) => a.includes('skillet.skillDir='))).toBe(false);
  });

  it('still sets skillet.skillDir in single-skill mode (regression)', async () => {
    await executeScaffold(baseConfig); // baseConfig has isMultiSkill: false

    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('skillet.skillDir='))).toBe(true);
    expect(allArgs.some((a) => a.includes('skillet.skills='))).toBe(false);
  });

  // Task 1.1: multi-skill single parent sets files[1]=skills/
  it('sets files[1]=skills/ when isMultiSkill: true and skillsParentDirs is ["skills"]', async () => {
    const config: WizardConfig = {
      ...baseConfig,
      isMultiSkill: true,
      skillsParentDirs: ['skills'],
    };

    await executeScaffold(config);

    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('"files[1]=skills/"'))).toBe(true);
  });

  // Task 1.2: multi-skill multiple parents sets files[1]=core/ and files[2]=exp/
  it('sets files[1]=core/ and files[2]=exp/ when isMultiSkill: true and skillsParentDirs is ["core", "exp"]', async () => {
    const config: WizardConfig = {
      ...baseConfig,
      isMultiSkill: true,
      skillsParentDirs: ['core', 'exp'],
    };

    await executeScaffold(config);

    const allArgs = getPkgSetArgs();
    expect(allArgs.some((a) => a.includes('"files[1]=core/"'))).toBe(true);
    expect(allArgs.some((a) => a.includes('"files[2]=exp/"'))).toBe(true);
  });

  // Task 1.3: normalization — skillsParentDirs entry without trailing slash gets one added
  it('normalizes skillsParentDirs entry without trailing slash to have one (files[1]=skills/)', async () => {
    const config: WizardConfig = {
      ...baseConfig,
      isMultiSkill: true,
      skillsParentDirs: ['skills'], // no trailing slash
    };

    await executeScaffold(config);

    const allArgs = getPkgSetArgs();
    // Must produce files[1]=skills/ (with trailing slash), not files[1]=skills (without)
    expect(allArgs.some((a) => a.includes('"files[1]=skills/"'))).toBe(true);
    expect(
      allArgs.some((a) => a.includes('"files[1]=skills"') && !a.includes('"files[1]=skills/"')),
    ).toBe(false);
  });
});

describe('executeScaffold — package.json written display', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>;

  const fixturePackageJson = JSON.stringify(
    {
      name: 'my-skill',
      version: '0.1.0',
      description: 'A test skill',
      author: 'Test Author',
      license: 'MIT',
      type: 'module',
    },
    null,
    2,
  );

  const configWithCustomValues: WizardConfig = {
    ...baseConfig,
    version: '0.1.0',
    license: 'MIT',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    mockFsExistsSync.mockReturnValue(true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue(fixturePackageJson);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    readFileSyncSpy.mockRestore();
  });

  it('suppresses npm init stdout by using "pipe" for stdout so npm defaults do not reach the terminal', async () => {
    mockFsExistsSync.mockReturnValue(false);

    const spawnSyncCalls: Array<{ cmd: string; options: unknown }> = [];
    mockSpawnSync.mockImplementation((cmd: unknown, _args: unknown, options: unknown) => {
      spawnSyncCalls.push({ cmd: String(cmd), options });
      return makeSuccessResult();
    });

    await executeScaffold(configWithCustomValues);

    const initCall = spawnSyncCalls.find((c) => c.cmd.includes('init'));
    expect(initCall).toBeDefined();

    // The stdio option must pipe stdout (index 1) so npm init's default package.json
    // block ("version": "1.0.0", "license": "ISC") never reaches the terminal.
    const stdio = (initCall!.options as { stdio?: unknown }).stdio;
    expect(Array.isArray(stdio)).toBe(true);
    const stdioArray = stdio as unknown[];
    expect(stdioArray[1]).toBe('pipe');
  });

  it('outputs a "package.json written:" block with user-configured version, license, author, and type values', async () => {
    const writtenMessages: string[] = [];
    stdoutSpy.mockImplementation((chunk: unknown) => {
      writtenMessages.push(String(chunk));
      return true;
    });

    await executeScaffold(configWithCustomValues);

    const allOutput = writtenMessages.join('');
    expect(allOutput).toContain('package.json written:');
    expect(allOutput).toContain('"version": "0.1.0"');
    expect(allOutput).toContain('"license": "MIT"');
    expect(allOutput).toContain('"author": "Test Author"');
    expect(allOutput).toContain('"type": "module"');
  });
});

describe('executeScaffold — npm pkg delete private (tasks 1.7–1.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    mockFsExistsSync.mockReturnValue(true);
  });

  function getDeletePrivateCalls(): string[] {
    return mockSpawnSync.mock.calls
      .filter(
        (c) =>
          typeof c[0] === 'string' &&
          c[0].includes('npm') &&
          c[0].includes('"pkg"') &&
          c[0].includes('"delete"') &&
          c[0].includes('private'),
      )
      .map((c) => c[0] as string);
  }

  // Task 1.7: npm pkg delete private IS called when removePrivate: true
  it('calls "npm pkg delete private" when config.removePrivate is true', async () => {
    await executeScaffold({ ...baseConfig, removePrivate: true });
    const deleteCalls = getDeletePrivateCalls();
    expect(deleteCalls.length).toBeGreaterThan(0);
  });

  // Task 1.8: npm pkg delete private is NOT called when removePrivate: false
  it('does NOT call "npm pkg delete private" when config.removePrivate is false', async () => {
    await executeScaffold({ ...baseConfig, removePrivate: false });
    const deleteCalls = getDeletePrivateCalls();
    expect(deleteCalls.length).toBe(0);
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

  it('installs @skillet-cli/core@latest (not bare @skillet-cli/core) to ensure the latest version is always used', async () => {
    await executeScaffold(baseConfig);

    const calls = mockSpawnSync.mock.calls;
    const installCall = calls.find((c) => typeof c[0] === 'string' && c[0].includes('npm install'));
    expect(installCall).toBeDefined();
    expect(installCall![0]).toContain('@skillet-cli/core@latest');
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

  it('writes "✓ Installed @skillet-cli/core" to stdout after the install spawnSync completes with status 0', async () => {
    const writtenMessages: string[] = [];
    stdoutSpy.mockImplementation((chunk: unknown) => {
      writtenMessages.push(String(chunk));
      return true;
    });

    await executeScaffold(baseConfig);

    expect(writtenMessages.some((msg) => msg.includes('✓ Installed @skillet-cli/core'))).toBe(true);
  });

  it('uses stdio: "pipe" (not "inherit") for the npm install @skillet-cli/core spawnSync call', async () => {
    const spawnSyncCalls: Array<{ cmd: string; options: unknown }> = [];
    mockSpawnSync.mockImplementation((cmd: unknown, _args: unknown, options: unknown) => {
      spawnSyncCalls.push({ cmd: String(cmd), options });
      return makeSuccessResult();
    });

    await executeScaffold(baseConfig);

    const installCall = spawnSyncCalls.find((c) => c.cmd.includes('@skillet-cli/core@latest'));
    expect(installCall).toBeDefined();
    expect((installCall!.options as { stdio?: unknown }).stdio).toBe('pipe');
  });

  it('writes captured stderr to process.stderr and calls process.exit(1) when npm install fails', async () => {
    const stderrMessages: string[] = [];
    const localStderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: unknown) => {
        stderrMessages.push(String(chunk));
        return true;
      });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

    mockSpawnSync.mockImplementation((cmd: unknown) => {
      if (String(cmd).includes('@skillet-cli/core@latest')) {
        return {
          status: 1,
          stdout: '',
          stderr: 'npm ERR! network timeout',
          pid: 1,
          output: [],
          signal: null,
        } as ReturnType<typeof import('node:child_process').spawnSync>;
      }
      return makeSuccessResult();
    });

    await executeScaffold(baseConfig);

    // Assertions before restore — mockRestore() clears call history
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrMessages.some((m) => m.includes('npm ERR!'))).toBe(true);

    exitSpy.mockRestore();
    localStderrSpy.mockRestore();
  });
});

describe('executeScaffold — .npmignore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    // package.json exists (skip npm init), but .npmignore does not (so it gets written).
    mockFsExistsSync.mockImplementation(
      (p) => !(typeof p === 'string' && p.endsWith('.npmignore')),
    );
  });

  it('writes a .npmignore containing **/node_modules to prevent nested node_modules from being published', async () => {
    await executeScaffold(baseConfig);

    const npmignoreCall = mockFspWriteFile.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('.npmignore'),
    );
    expect(npmignoreCall).toBeDefined();
    expect(String(npmignoreCall![1])).toContain('**/node_modules');
  });

  it('does not overwrite .npmignore when it already exists', async () => {
    mockFsExistsSync.mockReturnValue(true);

    await executeScaffold(baseConfig);

    const npmignoreCall = mockFspWriteFile.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('.npmignore'),
    );
    expect(npmignoreCall).toBeUndefined();
  });
});

describe('executeScaffold — create-skillet devDep and prepublishOnly (task 7.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    mockFsExistsSync.mockReturnValue(true);
  });

  function getSpawnCmds(): string[] {
    return mockSpawnSync.mock.calls.map((c) => String(c[0]));
  }

  function getPkgSetArgs(): string[] {
    return getSpawnCmds().filter((cmd) => cmd.includes('"pkg"') && cmd.includes('"set"'));
  }

  it('installs create-skillet@latest as a devDependency', async () => {
    await executeScaffold(baseConfig);
    const cmds = getSpawnCmds();
    expect(cmds.some((c) => c.includes('create-skillet@latest') && c.includes('--save-dev'))).toBe(
      true,
    );
  });

  it('installs create-skillet after @skillet-cli/core', async () => {
    const cmdOrder: string[] = [];
    mockSpawnSync.mockImplementation((cmd: unknown) => {
      cmdOrder.push(String(cmd));
      return makeSuccessResult();
    });

    await executeScaffold(baseConfig);

    const coreIdx = cmdOrder.findIndex((c) => c.includes('@skillet-cli/core@latest'));
    const csIdx = cmdOrder.findIndex((c) => c.includes('create-skillet@latest'));
    expect(coreIdx).toBeGreaterThanOrEqual(0);
    expect(csIdx).toBeGreaterThan(coreIdx);
  });

  it('sets scripts.prepublishOnly=create-skillet check in npm pkg set', async () => {
    await executeScaffold(baseConfig);
    const pkgSetArgs = getPkgSetArgs();
    expect(
      pkgSetArgs.some(
        (a) => a.includes('scripts.prepublishOnly') && a.includes('create-skillet check'),
      ),
    ).toBe(true);
  });
});

describe('executeScaffold — postpublish script (task 27)', () => {
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

  it('includes scripts.postpublish=create-skillet post-publish when generateClaudePlugin is true', async () => {
    await executeScaffold({ ...baseConfig, generateClaudePlugin: true });
    const pkgSetArgs = getPkgSetArgs();
    expect(
      pkgSetArgs.some(
        (a) => a.includes('scripts.postpublish') && a.includes('create-skillet post-publish'),
      ),
    ).toBe(true);
  });

  it('includes scripts.postpublish=create-skillet post-publish when generateGeminiPlugin is true', async () => {
    await executeScaffold({ ...baseConfig, generateGeminiPlugin: true });
    const pkgSetArgs = getPkgSetArgs();
    expect(
      pkgSetArgs.some(
        (a) => a.includes('scripts.postpublish') && a.includes('create-skillet post-publish'),
      ),
    ).toBe(true);
  });

  it('does NOT include scripts.postpublish when both generateClaudePlugin and generateGeminiPlugin are false', async () => {
    await executeScaffold({
      ...baseConfig,
      generateClaudePlugin: false,
      generateGeminiPlugin: false,
    });
    const pkgSetArgs = getPkgSetArgs();
    expect(pkgSetArgs.some((a) => a.includes('scripts.postpublish'))).toBe(false);
  });
});

describe('executeScaffold — bin/cli.js overwrite guard (tasks 7.2–7.5)', () => {
  const modifiedBinCliJs = '#!/usr/bin/env node\n// hand-edited by the author\n';

  function getBinCliJsWriteCall() {
    return mockFspWriteFile.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('cli.js'),
    );
  }

  function getBinCliJsChmodCall() {
    return vi
      .mocked(fsp.chmod)
      .mock.calls.find((c) => typeof c[0] === 'string' && (c[0] as string).endsWith('cli.js'));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue(makeSuccessResult());
    // package.json and .npmignore already exist by default in these tests —
    // only bin/cli.js existence/content is varied per test.
    mockFsExistsSync.mockImplementation((p) => !(typeof p === 'string' && p.endsWith('cli.js')));
  });

  // Task 7.2: no existing bin/cli.js — written unconditionally, no prompt.
  it('writes bin/cli.js unconditionally with no comparison or prompt when it does not already exist', async () => {
    mockFsExistsSync.mockReturnValue(true);
    mockFsExistsSync.mockImplementation((p) => !(typeof p === 'string' && p.endsWith('cli.js')));

    await executeScaffold(baseConfig);

    const writeCall = getBinCliJsWriteCall();
    expect(writeCall).toBeDefined();
    expect(String(writeCall![1])).toBe(buildBinCliJs());
    expect(getBinCliJsChmodCall()).toBeDefined();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  // Task 7.3: existing content matches buildBinCliJs() output exactly —
  // rewritten silently, no warning or prompt.
  it('rewrites bin/cli.js silently with no warning or prompt when existing content matches buildBinCliJs() exactly', async () => {
    mockFsExistsSync.mockReturnValue(true);
    mockFsReadFileSync.mockImplementation((p: unknown) => {
      if (typeof p === 'string' && p.endsWith('cli.js')) return DEFAULT_BIN_CLI_JS_FIXTURE;
      return '';
    });
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await executeScaffold(baseConfig);

    const writeCall = getBinCliJsWriteCall();
    expect(writeCall).toBeDefined();
    expect(String(writeCall![1])).toBe(buildBinCliJs());
    expect(mockConfirm).not.toHaveBeenCalled();
    const allOutput = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(allOutput).not.toContain('modified');

    stdoutSpy.mockRestore();
  });

  // Task 7.4: existing content differs — warns and asks for confirmation
  // before overwriting.
  it('warns and asks for confirmation before overwriting when existing bin/cli.js content differs from buildBinCliJs()', async () => {
    mockFsExistsSync.mockReturnValue(true);
    mockFsReadFileSync.mockImplementation((p: unknown) => {
      if (typeof p === 'string' && p.endsWith('cli.js')) return modifiedBinCliJs;
      return '';
    });
    mockConfirm.mockResolvedValueOnce(true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await executeScaffold(baseConfig);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    const allOutput = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(allOutput.toLowerCase()).toContain('modified');

    // Accepting the prompt still results in the file being replaced.
    const writeCall = getBinCliJsWriteCall();
    expect(writeCall).toBeDefined();
    expect(String(writeCall![1])).toBe(buildBinCliJs());
    expect(getBinCliJsChmodCall()).toBeDefined();

    stdoutSpy.mockRestore();
  });

  // Task 7.5: declining the confirmation leaves the existing file untouched
  // and the wizard continues with the remaining steps.
  it('leaves the existing bin/cli.js untouched and continues the wizard when the overwrite confirmation is declined', async () => {
    mockFsExistsSync.mockReturnValue(true);
    mockFsReadFileSync.mockImplementation((p: unknown) => {
      if (typeof p === 'string' && p.endsWith('cli.js')) return modifiedBinCliJs;
      return '';
    });
    mockConfirm.mockResolvedValueOnce(false);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

    await executeScaffold(baseConfig);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(getBinCliJsWriteCall()).toBeUndefined();
    expect(getBinCliJsChmodCall()).toBeUndefined();

    // The wizard continues with the remaining steps (e.g. npm install),
    // rather than aborting the whole scaffold.
    const cmds = mockSpawnSync.mock.calls.map((c) => String(c[0]));
    expect(cmds.some((c) => c.includes('npm install') && c.includes('@skillet-cli/core'))).toBe(
      true,
    );
    expect(exitSpy).not.toHaveBeenCalled();

    stdoutSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
