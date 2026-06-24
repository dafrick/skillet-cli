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
    isPrivate: false,
    license: '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// collectConfig — private field prompt (tasks 1.4–1.6)
// ---------------------------------------------------------------------------

describe('collectConfig — removePrivate behavior', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Task 1.4: removePrivate: true when user confirms removal
  it('collectConfig includes removePrivate: true when isPrivate and user confirms removal', async () => {
    const detected = makeDetectionResult({ isPrivate: true });

    // input calls (6 metadata prompts + 1 skill path)
    mockInput
      .mockReset()
      .mockResolvedValueOnce('my-skill')
      .mockResolvedValueOnce('1.0.0')
      .mockResolvedValueOnce('A test skill')
      .mockResolvedValueOnce('Test Author')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('MIT')
      .mockResolvedValueOnce('skill/'); // skill content path

    // confirm calls: (1) removePrivate, (2) marketplace opt-in (false → no sub-prompts)
    mockConfirm
      .mockResolvedValueOnce(true) // removePrivate: true
      .mockResolvedValueOnce(false); // marketplace: false → generateClaudePlugin/GeminiPlugin both false

    const config = await collectConfig(detected);

    expect(config.removePrivate).toBe(true);
  });

  // Task 1.5: removePrivate: false when user declines removal
  it('collectConfig includes removePrivate: false when isPrivate and user declines removal', async () => {
    const detected = makeDetectionResult({ isPrivate: true });

    mockInput
      .mockReset()
      .mockResolvedValueOnce('my-skill')
      .mockResolvedValueOnce('1.0.0')
      .mockResolvedValueOnce('A test skill')
      .mockResolvedValueOnce('Test Author')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('MIT')
      .mockResolvedValueOnce('skill/');

    // confirm calls: (1) removePrivate, (2) marketplace opt-in (false → no sub-prompts)
    mockConfirm
      .mockResolvedValueOnce(false) // removePrivate: false
      .mockResolvedValueOnce(false); // marketplace: false

    const config = await collectConfig(detected);

    expect(config.removePrivate).toBe(false);
  });

  // Task 1.6: no private prompt shown and removePrivate: false when isPrivate is false
  it('no private prompt shown and removePrivate is false when isPrivate is false', async () => {
    const detected = makeDetectionResult({ isPrivate: false });

    mockInput
      .mockReset()
      .mockResolvedValueOnce('my-skill')
      .mockResolvedValueOnce('1.0.0')
      .mockResolvedValueOnce('A test skill')
      .mockResolvedValueOnce('Test Author')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('MIT')
      .mockResolvedValueOnce('skill/');

    // confirm is called for plugin distribution prompts but NOT for private removal
    mockConfirm.mockResolvedValue(true);

    const config = await collectConfig(detected);

    expect(config.removePrivate).toBe(false);
    // The private removal confirm should not have been called
    // (plugin distribution prompts use confirm but private prompt is skipped)
    const privateCalls = mockConfirm.mock.calls.filter((c) =>
      (c[0] as { message: string }).message.toLowerCase().includes('private'),
    );
    expect(privateCalls).toHaveLength(0);
  });
});

describe('collectConfig — multi-skill mode', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: input prompts return sensible defaults
    mockInput.mockResolvedValue('my-skill');
    mockConfirm.mockResolvedValue(true);
    mockSelect.mockResolvedValue('skills/brainstorming/');
  });

  afterEach(() => {
    vi.resetAllMocks();
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

// ---------------------------------------------------------------------------
// collectConfig — license prompt default
// ---------------------------------------------------------------------------

describe('collectConfig — license prompt default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInput.mockResolvedValue('');
    mockConfirm.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1.4 License input() receives default: "Apache-2.0" when detected.license is "Apache-2.0"', async () => {
    const detected = makeDetectionResult({
      license: 'Apache-2.0',
      skillDir: 'skill/',
    });

    mockInput
      .mockResolvedValueOnce('my-skill') // name
      .mockResolvedValueOnce('1.0.0') // version
      .mockResolvedValueOnce('A test skill') // description
      .mockResolvedValueOnce('Test Author') // author
      .mockResolvedValueOnce('') // repositoryUrl
      .mockResolvedValueOnce('Apache-2.0') // license
      .mockResolvedValueOnce('skill/'); // skillDir

    await collectConfig(detected);

    const licenseCalls = mockInput.mock.calls.filter(
      (c) => (c[0] as { message: string }).message === 'License:',
    );
    expect(licenseCalls).toHaveLength(1);
    expect((licenseCalls[0][0] as { default: string }).default).toBe('Apache-2.0');
  });

  it('1.5 License input() receives default: "MIT" when detected.license is ""', async () => {
    const detected = makeDetectionResult({
      license: '',
      skillDir: 'skill/',
    });

    mockInput
      .mockResolvedValueOnce('my-skill') // name
      .mockResolvedValueOnce('1.0.0') // version
      .mockResolvedValueOnce('A test skill') // description
      .mockResolvedValueOnce('Test Author') // author
      .mockResolvedValueOnce('') // repositoryUrl
      .mockResolvedValueOnce('MIT') // license
      .mockResolvedValueOnce('skill/'); // skillDir

    await collectConfig(detected);

    const licenseCalls = mockInput.mock.calls.filter(
      (c) => (c[0] as { message: string }).message === 'License:',
    );
    expect(licenseCalls).toHaveLength(1);
    expect((licenseCalls[0][0] as { default: string }).default).toBe('MIT');
  });
});

// ---------------------------------------------------------------------------
// collectConfig — plugin/extension marketplace prompt consolidation (task 1.3)
// ---------------------------------------------------------------------------

describe('collectConfig — marketplace prompt consolidation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockInput.mockResolvedValue('my-skill');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function makeInputSequence(overrides: { repositoryUrl?: string } = {}) {
    mockInput
      .mockResolvedValueOnce('my-skill') // name
      .mockResolvedValueOnce('1.0.0') // version
      .mockResolvedValueOnce('A test skill') // description
      .mockResolvedValueOnce('Test Author') // author
      .mockResolvedValueOnce(overrides.repositoryUrl ?? '') // repositoryUrl
      .mockResolvedValueOnce('MIT') // license
      .mockResolvedValueOnce('skill/'); // skillDir
  }

  it('generateClaudePlugin and generateGeminiPlugin are both false when marketplace opt-in is declined', async () => {
    const detected = makeDetectionResult({ isPrivate: false });
    makeInputSequence();

    // confirm: (1) marketplace: false → no sub-prompts
    mockConfirm.mockResolvedValueOnce(false);

    const config = await collectConfig(detected);

    expect(config.generateClaudePlugin).toBe(false);
    expect(config.generateGeminiPlugin).toBe(false);
  });

  it('generateClaudePlugin and generateGeminiPlugin reflect sub-prompt answers when marketplace opted in', async () => {
    const detected = makeDetectionResult({ isPrivate: false });
    makeInputSequence({ repositoryUrl: 'https://github.com/org/repo' });

    // confirm: (1) marketplace: true, (2) claude: true, (3) gemini: false
    mockConfirm
      .mockResolvedValueOnce(true) // marketplace
      .mockResolvedValueOnce(true) // claude+copilot
      .mockResolvedValueOnce(false); // gemini

    const config = await collectConfig(detected);

    expect(config.generateClaudePlugin).toBe(true);
    expect(config.generateGeminiPlugin).toBe(false);
  });

  it('sub-prompts are NOT called when marketplace is declined', async () => {
    const detected = makeDetectionResult({ isPrivate: false });
    makeInputSequence();

    mockConfirm.mockResolvedValueOnce(false); // marketplace: false

    await collectConfig(detected);

    // Only 1 confirm call (marketplace gate) — no sub-prompts
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    const [firstCall] = mockConfirm.mock.calls;
    expect((firstCall[0] as { message: string }).message).toContain('marketplace');
  });

  it('marketplace prompt defaults to true when repositoryUrl is present', async () => {
    const detected = makeDetectionResult({
      isPrivate: false,
      repositoryUrl: 'https://github.com/org/repo',
    });
    makeInputSequence({ repositoryUrl: 'https://github.com/org/repo' });

    // marketplace: false (we just want to check the default)
    mockConfirm.mockResolvedValueOnce(false);

    await collectConfig(detected);

    const marketplaceCall = mockConfirm.mock.calls[0];
    expect((marketplaceCall[0] as { default: boolean }).default).toBe(true);
  });

  it('marketplace prompt defaults to false when repositoryUrl is absent', async () => {
    const detected = makeDetectionResult({ isPrivate: false, repositoryUrl: '' });
    makeInputSequence({ repositoryUrl: '' });

    mockConfirm.mockResolvedValueOnce(false);

    await collectConfig(detected);

    const marketplaceCall = mockConfirm.mock.calls[0];
    expect((marketplaceCall[0] as { default: boolean }).default).toBe(false);
  });
});
