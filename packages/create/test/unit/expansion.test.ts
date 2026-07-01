import { describe, expect, it } from 'vitest';
import type { DetectionResult } from '../../src/detect.js';
import { computeAddDirectoryPlan, computeAddSkillPlan } from '../../src/expansion.js';

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
