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
import type { DetectionResult } from '../../src/detect.js';
import { detectEnvironment } from '../../src/detect.js';
import type { WizardConfig } from '../../src/prompts.js';
import { collectConfig } from '../../src/prompts.js';
import { executeScaffold } from '../../src/scaffold.js';
import { setupSkillDir } from '../../src/skill-dir.js';
import { skillMdStatus } from '../../src/run.js';

const mockConfirm = vi.mocked(confirm);
const mockDetectEnvironment = vi.mocked(detectEnvironment);
const mockCollectConfig = vi.mocked(collectConfig);
const mockExecuteScaffold = vi.mocked(executeScaffold);
const mockSetupSkillDir = vi.mocked(setupSkillDir);

function makeFakeDetected(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    cwd: '/fake/cwd',
    name: 'my-skill',
    version: '1.0.0',
    author: 'Test Author',
    description: 'A test skill',
    hasPackageJson: true,
    hasSkillMd: true,
    skillDir: 'skill/',
    discoveredSkillDirs: [],
    repositoryUrl: '',
    gitUser: 'Test User <test@example.com>',
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
    hasPackageJson: false,
    hasSkillMd: false,
    skillDir: null,
    discoveredSkillDirs: [],
    repositoryUrl: '',
    gitUser: '',
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
