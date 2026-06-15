import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// deriveParentDirs — parent-directory derivation
// ---------------------------------------------------------------------------

// Import the function that doesn't exist yet (will fail to import or at runtime).
// We use a dynamic import in each test block so the import error manifests as a
// test failure rather than a module-level error that crashes the whole file.
import { deriveParentDirs } from '../../src/prompts.js';

describe('deriveParentDirs', () => {
  it('returns ["skills"] for dirs under skills/', () => {
    const result = deriveParentDirs([
      'skills/brainstorming/',
      'skills/debugging/',
      'skills/planning/',
    ]);
    expect(result).toEqual(['skills']);
  });

  it('deduplicates parent dirs', () => {
    const result = deriveParentDirs(['skills/brainstorming/', 'skills/debugging/']);
    expect(result).toEqual(['skills']);
  });

  it('handles multiple different parents', () => {
    const result = deriveParentDirs(['core/summarize/', 'core/rewrite/', 'exp/draft/']);
    expect(result).toContain('core');
    expect(result).toContain('exp');
    expect(result).toHaveLength(2);
  });

  it('normalizes trailing slashes before computing parent', () => {
    const result = deriveParentDirs(['skills/brainstorming/', 'skills/debugging/']);
    expect(result).toEqual(['skills']);
  });

  it('filters out root-level entries normalized to "./"', () => {
    const result = deriveParentDirs(['./', 'skills/brainstorming/', 'skills/debugging/']);
    expect(result).toEqual(['skills']);
  });

  it('filters out root-level entries normalized to "."', () => {
    const result = deriveParentDirs(['.']);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// collectConfig — multi-skill behavior
// ---------------------------------------------------------------------------

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

import { confirm, input, select } from '@inquirer/prompts';
import type { DetectionResult } from '../../src/detect.js';
import { collectConfig } from '../../src/prompts.js';

const mockInput = vi.mocked(input);
const mockSelect = vi.mocked(select);
const mockConfirm = vi.mocked(confirm);

function makeDetectionResult(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    cwd: '/fake/cwd',
    name: 'my-skill',
    version: '1.0.0',
    author: 'Test Author',
    description: 'A test skill',
    hasPackageJson: true,
    hasSkillMd: false,
    skillDir: null,
    discoveredSkillDirs: [],
    repositoryUrl: '',
    gitUser: '',
    ...overrides,
  };
}

describe('collectConfig — multi-skill mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: input prompts return sensible defaults
    mockInput.mockResolvedValue('my-skill');
    mockConfirm.mockResolvedValue(true);
    mockSelect.mockResolvedValue('skills/brainstorming/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets isMultiSkill: true and populates skillsParentDirs when discoveredSkillDirs has 2+ non-root entries', async () => {
    const detected = makeDetectionResult({
      discoveredSkillDirs: ['skills/brainstorming/', 'skills/debugging/'],
    });

    // Override input to return useful values for each prompt in sequence
    mockInput
      .mockResolvedValueOnce('my-skill') // name
      .mockResolvedValueOnce('1.0.0') // version
      .mockResolvedValueOnce('A test skill') // description
      .mockResolvedValueOnce('Test Author') // author
      .mockResolvedValueOnce('') // repositoryUrl
      .mockResolvedValueOnce('MIT'); // license

    const config = await collectConfig(detected);

    expect(config.isMultiSkill).toBe(true);
    expect(config.skillsParentDirs).toEqual(['skills']);
  });

  it('does NOT call skill-path input prompt when 2+ non-root entries discovered', async () => {
    const detected = makeDetectionResult({
      discoveredSkillDirs: ['skills/brainstorming/', 'skills/debugging/'],
    });

    mockInput
      .mockResolvedValueOnce('my-skill')
      .mockResolvedValueOnce('1.0.0')
      .mockResolvedValueOnce('A test skill')
      .mockResolvedValueOnce('Test Author')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('MIT');

    await collectConfig(detected);

    // The input mock for skill path ("Skill content path") should not be called
    const inputCalls = mockInput.mock.calls.map((c) => (c[0] as { message: string }).message);
    const skillPathCallCount = inputCalls.filter(
      (msg) => typeof msg === 'string' && msg.toLowerCase().includes('skill content path'),
    ).length;
    expect(skillPathCallCount).toBe(0);
  });

  it('uses "Description (optional):" and "Author (optional):" as prompt messages', async () => {
    const detected = makeDetectionResult({
      discoveredSkillDirs: ['skills/brainstorming/'],
    });

    mockInput
      .mockResolvedValueOnce('my-skill') // name
      .mockResolvedValueOnce('1.0.0') // version
      .mockResolvedValueOnce('A test skill') // description
      .mockResolvedValueOnce('Test Author') // author
      .mockResolvedValueOnce('') // repositoryUrl
      .mockResolvedValueOnce('MIT') // license
      .mockResolvedValueOnce('skills/brainstorming/'); // skillDir

    await collectConfig(detected);

    const inputMessages = mockInput.mock.calls.map((c) => (c[0] as { message: string }).message);
    expect(inputMessages).toContain('Description (optional):');
    expect(inputMessages).toContain('Author (optional):');
  });

  // Task 2.5: root-level filtering test
  it('filters root-level "./" from discoveredSkillDirs when computing isMultiSkill and skillsParentDirs', async () => {
    const detected = makeDetectionResult({
      discoveredSkillDirs: ['./', 'skills/brainstorming/', 'skills/debugging/'],
    });

    mockInput
      .mockResolvedValueOnce('my-skill')
      .mockResolvedValueOnce('1.0.0')
      .mockResolvedValueOnce('A test skill')
      .mockResolvedValueOnce('Test Author')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('MIT');

    const config = await collectConfig(detected);

    // Root filtered out; 2 subdir entries remain → multi-skill
    expect(config.isMultiSkill).toBe(true);
    // Root NOT included in skillsParentDirs
    expect(config.skillsParentDirs).toEqual(['skills']);
  });
});
