import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be set up before the module under test is imported
// ---------------------------------------------------------------------------

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  input: vi.fn(),
  select: vi.fn(),
  checkbox: vi.fn(),
}));

vi.mock('../../src/detect.js', () => ({
  detectEnvironment: vi.fn(),
}));

vi.mock('../../src/prompts.js', () => ({
  collectConfig: vi.fn(),
}));

vi.mock('../../src/scaffold.js', () => ({
  executeScaffold: vi.fn(),
  buildBinCliJs: vi.fn().mockReturnValue('#!/usr/bin/env node\n'),
  runSync: vi.fn(),
}));

vi.mock('../../src/skill-dir.js', () => ({
  setupSkillDir: vi.fn(),
}));

vi.mock('../../src/check.js', () => ({
  runCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@skillet-cli/ui', () => ({
  generateWordmark: vi.fn().mockReturnValue('SKILLET'),
  renderFullHeader: vi.fn().mockReturnValue(''),
  createSpinner: vi.fn(() => ({
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { confirm } from '@inquirer/prompts';
import { runCheck } from '../../src/check.js';
import type { DetectionResult } from '../../src/detect.js';
import { detectEnvironment } from '../../src/detect.js';
import type { WizardConfig } from '../../src/prompts.js';
import { collectConfig } from '../../src/prompts.js';
import { skillMdStatus } from '../../src/run.js';
import { executeScaffold } from '../../src/scaffold.js';
import { setupSkillDir } from '../../src/skill-dir.js';

const mockConfirm = vi.mocked(confirm);
const mockDetectEnvironment = vi.mocked(detectEnvironment);
const mockCollectConfig = vi.mocked(collectConfig);
const mockExecuteScaffold = vi.mocked(executeScaffold);
const mockSetupSkillDir = vi.mocked(setupSkillDir);
const mockRunCheck = vi.mocked(runCheck);

function makeFakeDetected(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    cwd: '/fake/cwd',
    name: 'my-skill',
    version: '1.0.0',
    author: 'Test Author',
    description: 'A test skill',
    license: '',
    hasPackageJson: true,
    hasSkillMd: true,
    skillDir: 'skill/',
    discoveredSkillDirs: [],
    repositoryUrl: '',
    gitUser: 'Test User <test@example.com>',
    isPrivate: false,
    ...overrides,
  };
}

// Minimal DetectionResult stub — only the fields skillMdStatus reads
function makeDetected(overrides: Partial<DetectionResult>): DetectionResult {
  return {
    cwd: '/project',
    name: 'my-skill',
    version: '0.1.0',
    author: '',
    description: '',
    license: '',
    hasPackageJson: false,
    hasSkillMd: false,
    skillDir: null,
    discoveredSkillDirs: [],
    repositoryUrl: '',
    gitUser: '',
    isPrivate: false,
    ...overrides,
  };
}

function makeFakeConfig(overrides: Partial<WizardConfig> = {}): WizardConfig {
  return {
    name: 'my-skill',
    version: '1.0.0',
    description: 'A test skill',
    author: 'Test Author',
    repositoryUrl: '',
    license: 'MIT',
    skillDir: 'skill/',
    isMultiSkill: false,
    skillsParentDirs: [],
    removePrivate: false,
    generateClaudePlugin: false,
    generateGeminiPlugin: false,
    ...overrides,
  };
}

/**
 * Invoke the run action by dynamically importing run.ts and calling run()
 * with argv stubbed so Commander sees no extra args.
 *
 * We re-import fresh each time via resetModules so module-level state
 * (Commander program instance) doesn't accumulate between tests.
 */
async function invokeRunAction(): Promise<void> {
  const originalArgv = process.argv;
  process.argv = ['node', 'create-skillet'];
  try {
    // Invalidate module cache so we get a fresh Commander program each test
    vi.resetModules();
    const { run } = await import('../../src/run.js');
    await run();
  } finally {
    process.argv = originalArgv;
  }
}

// ---------------------------------------------------------------------------
// Tests: preview block stdout output
// ---------------------------------------------------------------------------

describe('run.ts — preview block output', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let writtenLines: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    writtenLines = [];

    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenLines.push(String(chunk));
      return true;
    });

    // Default: confirm returns true for all prompts
    mockConfirm.mockResolvedValue(true);
    mockExecuteScaffold.mockResolvedValue(undefined);
    mockSetupSkillDir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('writes skillsParent: and skills to stdout when isMultiSkill: true', async () => {
    mockDetectEnvironment.mockReturnValue(
      makeFakeDetected({
        discoveredSkillDirs: ['skills/brainstorming/', 'skills/debugging/'],
      }),
    );
    mockCollectConfig.mockResolvedValue(
      makeFakeConfig({
        isMultiSkill: true,
        skillsParentDirs: ['skills'],
      }),
    );

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    expect(allOutput).toContain('skillsParent:');
    expect(allOutput).toContain('skills');
  });

  it('does NOT write skillDir: to stdout when isMultiSkill: true', async () => {
    mockDetectEnvironment.mockReturnValue(
      makeFakeDetected({
        discoveredSkillDirs: ['skills/brainstorming/', 'skills/debugging/'],
      }),
    );
    mockCollectConfig.mockResolvedValue(
      makeFakeConfig({
        isMultiSkill: true,
        skillsParentDirs: ['skills'],
      }),
    );

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    expect(allOutput).not.toContain('skillDir:');
  });

  it('writes skillDir: and skill/ to stdout when isMultiSkill: false', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected());
    mockCollectConfig.mockResolvedValue(
      makeFakeConfig({
        isMultiSkill: false,
        skillDir: 'skill/',
      }),
    );

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    expect(allOutput).toContain('skillDir:');
    expect(allOutput).toContain('skill/');
  });

  it('does NOT write skillsParent: to stdout when isMultiSkill: false', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected());
    mockCollectConfig.mockResolvedValue(
      makeFakeConfig({
        isMultiSkill: false,
        skillDir: 'skill/',
      }),
    );

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    expect(allOutput).not.toContain('skillsParent:');
  });
});

// ---------------------------------------------------------------------------
// Task 2.6: setupSkillDir NOT called when isMultiSkill: true
// ---------------------------------------------------------------------------

describe('run.ts — setupSkillDir not called in multi-skill mode', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Silence stdout
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    mockConfirm.mockResolvedValue(true);
    mockExecuteScaffold.mockResolvedValue(undefined);
    mockSetupSkillDir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('does NOT call setupSkillDir when isMultiSkill: true and hasSkillMd: true', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected({ hasSkillMd: true }));
    mockCollectConfig.mockResolvedValue(
      makeFakeConfig({
        isMultiSkill: true,
        skillsParentDirs: ['skills'],
      }),
    );

    await invokeRunAction();

    expect(mockSetupSkillDir).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tasks 1.9–1.10: early-gate summary private: warning line
// ---------------------------------------------------------------------------

describe('run.ts — early-gate summary: private field warning', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let writtenLines: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    writtenLines = [];

    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenLines.push(String(chunk));
      return true;
    });

    mockConfirm.mockResolvedValue(true);
    mockExecuteScaffold.mockResolvedValue(undefined);
    mockSetupSkillDir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  // Task 1.9: early-gate summary includes private: warning when isPrivate: true
  it('early-gate summary includes "private:" warning line when isPrivate is true', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected({ isPrivate: true }));
    mockCollectConfig.mockResolvedValue(makeFakeConfig({ removePrivate: false }));

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    expect(allOutput).toContain('private:');
    expect(allOutput).toContain('⚠');
  });

  // Task 1.10: early-gate summary does NOT include private: line when isPrivate: false
  it('early-gate summary does NOT include "private:" line when isPrivate is false', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected({ isPrivate: false }));
    mockCollectConfig.mockResolvedValue(makeFakeConfig({ removePrivate: false }));

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    // The warning line should not appear
    expect(allOutput).not.toMatch(/private:.*⚠/);
  });
});

// ---------------------------------------------------------------------------
// Tasks 1.11–1.13: completion block
// ---------------------------------------------------------------------------

describe('run.ts — completion block: npm publish conditional', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let writtenLines: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    writtenLines = [];

    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenLines.push(String(chunk));
      return true;
    });

    mockConfirm.mockResolvedValue(true);
    mockExecuteScaffold.mockResolvedValue(undefined);
    mockSetupSkillDir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  // Task 1.11: isPrivate && !removePrivate → omit npm publish, show npm pkg delete private note
  it('omits "npm publish" and includes "npm pkg delete private" note when isPrivate: true and removePrivate: false', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected({ isPrivate: true }));
    mockCollectConfig.mockResolvedValue(makeFakeConfig({ removePrivate: false }));

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    expect(allOutput).not.toContain('npm publish');
    expect(allOutput).toContain('npm pkg delete private');
  });

  // Task 1.12: isPrivate: true and removePrivate: true → includes npm publish
  it('includes "npm publish" when isPrivate: true and removePrivate: true', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected({ isPrivate: true }));
    mockCollectConfig.mockResolvedValue(makeFakeConfig({ removePrivate: true }));

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    expect(allOutput).toContain('npm publish');
  });

  // Task 1.13: isPrivate: false → includes npm publish
  it('includes "npm publish" when isPrivate is false', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected({ isPrivate: false }));
    mockCollectConfig.mockResolvedValue(makeFakeConfig({ removePrivate: false }));

    await invokeRunAction();

    const allOutput = writtenLines.join('');
    expect(allOutput).toContain('npm publish');
  });
});

describe('skillMdStatus', () => {
  it('returns "found" when hasSkillMd is true (root-level SKILL.md)', () => {
    const detected = makeDetected({ hasSkillMd: true });
    expect(skillMdStatus(detected)).toBe('found');
  });

  it('returns "found in <path>" when exactly one directory discovered', () => {
    const detected = makeDetected({ discoveredSkillDirs: ['skill/openspec-auto/'] });
    expect(skillMdStatus(detected)).toBe('found in skill/openspec-auto/');
  });

  it('returns "found in N locations" when multiple directories discovered', () => {
    const detected = makeDetected({
      discoveredSkillDirs: ['skill/openspec-auto/', 'skill/other/', 'tools/'],
    });
    expect(skillMdStatus(detected)).toBe('found in 3 locations');
  });

  it('returns "not found" when no SKILL.md exists anywhere', () => {
    const detected = makeDetected({});
    expect(skillMdStatus(detected)).toBe('not found');
  });

  it('returns "found" (no path suffix) when root hasSkillMd is true even if discoveredSkillDirs is non-empty', () => {
    const detected = makeDetected({
      hasSkillMd: true,
      discoveredSkillDirs: ['skill/openspec-auto/'],
    });
    expect(skillMdStatus(detected)).toBe('found');
  });
});

// ---------------------------------------------------------------------------
// Task 7.6: Commander routing
// ---------------------------------------------------------------------------

async function invokeWithArgs(args: string[]): Promise<void> {
  const originalArgv = process.argv;
  process.argv = args;
  try {
    vi.resetModules();
    const { run } = await import('../../src/run.js');
    await run();
  } finally {
    process.argv = originalArgv;
  }
}

describe('run.ts — Commander routing (task 7.6)', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    mockConfirm.mockResolvedValue(true);
    mockExecuteScaffold.mockResolvedValue(undefined);
    mockSetupSkillDir.mockResolvedValue(undefined);
    mockRunCheck.mockResolvedValue(undefined);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('routes create-skillet (no args) to wizard — detectEnvironment is called', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected());
    mockCollectConfig.mockResolvedValue(makeFakeConfig());

    await invokeWithArgs(['node', 'create-skillet']);

    expect(mockDetectEnvironment).toHaveBeenCalled();
  });

  it('routes create-skillet check to runCheck with interactive: true', async () => {
    await invokeWithArgs(['node', 'create-skillet', 'check']);

    expect(mockRunCheck).toHaveBeenCalledWith({ interactive: true });
    expect(mockDetectEnvironment).not.toHaveBeenCalled();
  });

  it('routes create-skillet mypackage to wizard with nameArg — detectEnvironment called', async () => {
    mockDetectEnvironment.mockReturnValue(makeFakeDetected({ name: 'mypackage' }));
    mockCollectConfig.mockResolvedValue(makeFakeConfig({ name: 'mypackage' }));

    await invokeWithArgs(['node', 'create-skillet', 'mypackage']);

    expect(mockDetectEnvironment).toHaveBeenCalledWith('mypackage');
    expect(mockRunCheck).not.toHaveBeenCalledWith({ interactive: true });
  });
});
