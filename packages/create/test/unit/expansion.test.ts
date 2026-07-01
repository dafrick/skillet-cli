import { describe, expect, it } from 'vitest';
import type { DetectionResult } from '../../src/detect.js';
import { computeAddDirectoryPlan, computeAddSkillPlan, diffMetadata } from '../../src/expansion.js';
import type { WizardConfig } from '../../src/prompts.js';

function makeDetected(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    cwd: '/fake/cwd',
    name: 'my-skill',
    version: '1.0.0',
    author: '',
    description: '',
    license: '',
    hasPackageJson: true,
    isPrivate: false,
    hasSkillMd: true,
    skillDir: 'skill/',
    discoveredSkillDirs: [],
    repositoryUrl: '',
    gitUser: '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Task 4.1: computeAddDirectoryPlan — pure function
// ---------------------------------------------------------------------------

describe('computeAddDirectoryPlan', () => {
  it('appends a normalized directory entry to the current files[] array', () => {
    const plan = computeAddDirectoryPlan(['bin', 'skill'], 'prompts/');

    expect(plan.files).toEqual(['bin', 'skill', 'prompts/']);
  });

  it('does not disturb existing entries (order and content preserved)', () => {
    const currentFiles = ['bin', 'skill'];
    const plan = computeAddDirectoryPlan(currentFiles, 'prompts/');

    expect(plan.files.slice(0, 2)).toEqual(currentFiles);
    // original array is not mutated
    expect(currentFiles).toEqual(['bin', 'skill']);
  });

  it('normalizes a directory path without a trailing slash by adding one', () => {
    const plan = computeAddDirectoryPlan(['bin', 'skill'], 'prompts');

    expect(plan.files).toEqual(['bin', 'skill', 'prompts/']);
    expect(plan.directory).toBe('prompts/');
  });

  it('trims surrounding whitespace from the entered path', () => {
    const plan = computeAddDirectoryPlan(['bin', 'skill'], '  prompts/  ');

    expect(plan.directory).toBe('prompts/');
  });

  it('treats an undefined current files array as empty', () => {
    const plan = computeAddDirectoryPlan(undefined, 'prompts/');

    expect(plan.files).toEqual(['prompts/']);
  });

  it('does not expose an index in its output', () => {
    const plan = computeAddDirectoryPlan(['bin', 'skill'], 'prompts/');

    expect(plan).not.toHaveProperty('index');
    expect(JSON.stringify(plan)).not.toMatch(/files\[\d+\]/);
  });
});

// ---------------------------------------------------------------------------
// Task 5.1: computeAddSkillPlan — pure function
// ---------------------------------------------------------------------------

describe('computeAddSkillPlan', () => {
  it('converts a single-skill package to multi-skill, combining the original and new parent directories', () => {
    const detected = makeDetected({
      skillDir: 'skill/',
      skillsParentDirs: undefined,
      files: ['bin', 'skill/'],
    });

    const plan = computeAddSkillPlan(detected, 'skills/debugging');

    expect(plan.convertedFromSingleSkill).toBe(true);
    expect(plan.skills).toEqual(['skill/', 'skills/']);
    expect(plan.files).toEqual(['bin', 'skill/', 'skills/']);
  });

  it('appends to an already-multi-skill package without disturbing existing skillet.skills entries', () => {
    const detected = makeDetected({
      skillDir: null,
      skillsParentDirs: ['skills-a/'],
      files: ['bin', 'skills-a/'],
    });

    const plan = computeAddSkillPlan(detected, 'skills-b/new-skill');

    expect(plan.convertedFromSingleSkill).toBe(false);
    expect(plan.skills).toEqual(['skills-a/', 'skills-b/']);
    expect(plan.files).toEqual(['bin', 'skills-a/', 'skills-b/']);
  });

  it('preserves order of existing multi-skill entries and appends the new one last', () => {
    const detected = makeDetected({
      skillDir: null,
      skillsParentDirs: ['skills-c/', 'skills-a/'],
      files: ['bin', 'skills-c/', 'skills-a/'],
    });

    const plan = computeAddSkillPlan(detected, 'skills-b/new-skill');

    expect(plan.skills).toEqual(['skills-c/', 'skills-a/', 'skills-b/']);
  });

  it('normalizes the new skill directory to its parent directory with a trailing slash', () => {
    const detected = makeDetected({ skillDir: 'skill/', files: ['bin', 'skill/'] });

    const plan = computeAddSkillPlan(detected, 'skills/debugging/');

    expect(plan.skills).toContain('skills/');
  });

  it('does not duplicate an entry when the new skill lands under an already-tracked parent directory', () => {
    const detected = makeDetected({
      skillDir: null,
      skillsParentDirs: ['skills/'],
      files: ['bin', 'skills/'],
    });

    const plan = computeAddSkillPlan(detected, 'skills/another-skill');

    expect(plan.skills).toEqual(['skills/']);
    expect(plan.files).toEqual(['bin', 'skills/']);
  });

  it('does not expose an index in its output', () => {
    const detected = makeDetected({ skillDir: 'skill/', files: ['bin', 'skill/'] });
    const plan = computeAddSkillPlan(detected, 'skills/debugging');

    expect(plan).not.toHaveProperty('index');
    expect(JSON.stringify(plan)).not.toMatch(/files\[\d+\]/);
  });
});

// ---------------------------------------------------------------------------
// Task 6.1: diffMetadata — pure function
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<WizardConfig> = {}): WizardConfig {
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

describe('diffMetadata', () => {
  it('returns an empty result when nothing changed', () => {
    const detected = makeDetected({
      name: 'my-skill',
      version: '1.0.0',
      description: 'A test skill',
      author: 'Test Author',
      license: 'MIT',
    });
    const config = makeConfig({
      name: 'my-skill',
      version: '1.0.0',
      description: 'A test skill',
      author: 'Test Author',
      license: 'MIT',
    });

    expect(diffMetadata(detected, config)).toEqual([]);
  });

  it('returns only the description field when just description differs', () => {
    const detected = makeDetected({
      name: 'my-skill',
      version: '1.0.0',
      description: 'Old description',
      author: 'Test Author',
      license: 'MIT',
    });
    const config = makeConfig({
      name: 'my-skill',
      version: '1.0.0',
      description: 'New description',
      author: 'Test Author',
      license: 'MIT',
    });

    expect(diffMetadata(detected, config)).toEqual([
      { field: 'description', current: 'Old description', next: 'New description' },
    ]);
  });

  it('returns both version and license when both differ', () => {
    const detected = makeDetected({
      name: 'my-skill',
      version: '1.0.0',
      description: 'A test skill',
      author: 'Test Author',
      license: 'MIT',
    });
    const config = makeConfig({
      name: 'my-skill',
      version: '2.0.0',
      description: 'A test skill',
      author: 'Test Author',
      license: 'Apache-2.0',
    });

    expect(diffMetadata(detected, config)).toEqual([
      { field: 'version', current: '1.0.0', next: '2.0.0' },
      { field: 'license', current: 'MIT', next: 'Apache-2.0' },
    ]);
  });

  it('includes name and author fields in the comparison', () => {
    const detected = makeDetected({
      name: 'old-name',
      version: '1.0.0',
      description: 'A test skill',
      author: 'Old Author',
      license: 'MIT',
    });
    const config = makeConfig({
      name: 'new-name',
      version: '1.0.0',
      description: 'A test skill',
      author: 'New Author',
      license: 'MIT',
    });

    expect(diffMetadata(detected, config)).toEqual([
      { field: 'name', current: 'old-name', next: 'new-name' },
      { field: 'author', current: 'Old Author', next: 'New Author' },
    ]);
  });
});
