import { describe, expect, it } from 'vitest';
import { computeAddDirectoryPlan } from '../../src/expansion.js';

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
