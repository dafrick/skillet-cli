/**
 * Pure functions computing the "quick flow" plans offered by the intent menu
 * (see run.ts) when create-skillet is re-run against an existing skillet
 * package. Kept free of I/O so they're independently unit-testable — see
 * docs/design.md decision 7.
 */

import type { DetectionResult } from './detect.js';

export interface AddDirectoryPlan {
  /** The normalized directory entry being added (e.g. "prompts/"). */
  directory: string;
  /** The resulting `files[]` array — existing entries first, new entry appended. */
  files: string[];
}

/**
 * Normalize a user-entered directory path: trim whitespace and ensure a
 * trailing slash so it reads unambiguously as a directory entry.
 */
function normalizeDirectory(rawDir: string): string {
  const trimmed = rawDir.trim();
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/**
 * Compute the plan for adding a directory to the published package's
 * `files[]` array. Appends the normalized new directory to the current
 * files, never disturbing existing entries and never exposing an index.
 */
export function computeAddDirectoryPlan(
  currentFiles: string[] | undefined,
  newDir: string,
): AddDirectoryPlan {
  const directory = normalizeDirectory(newDir);
  const files = [...(currentFiles ?? []), directory];
  return { directory, files };
}

export interface AddSkillPlan {
  /** True when this plan converts a single-skill package to multi-skill. */
  convertedFromSingleSkill: boolean;
  /** The resulting `skillet.skills` array — existing entries preserved, new parent dir appended. */
  skills: string[];
  /** The resulting `files[]` array — existing entries preserved, new parent dir appended. */
  files: string[];
}

/**
 * Compute the directory that "contains" a given skill directory, for use as
 * a `skillet.skills`/`files[]` entry — e.g. "skills/debugging" -> "skills/".
 * Falls back to the (normalized) directory itself when it has no parent
 * segment.
 */
function parentDirectory(rawDir: string): string {
  const trimmed = rawDir.trim().replace(/\/+$/, '');
  const lastSlash = trimmed.lastIndexOf('/');
  const parent = lastSlash === -1 ? trimmed : trimmed.slice(0, lastSlash);
  return normalizeDirectory(parent);
}

/**
 * Compute the plan for adding another skill to the published package.
 * Converts a single-skill package (`detected.skillDir`) to multi-skill by
 * combining the original skill's directory and the new skill's parent
 * directory into a `skillet.skills` array, or appends the new skill's parent
 * directory to an already-multi-skill package's existing `skillet.skills`
 * entries (preserved, never disturbed). Computes the corresponding `files[]`
 * array the same way. Never exposes an index.
 */
export function computeAddSkillPlan(detected: DetectionResult, newSkillDir: string): AddSkillPlan {
  const newParentDir = parentDirectory(newSkillDir);
  const existingSkills = detected.skillsParentDirs ?? [];
  const currentFiles = detected.files ?? [];

  const convertedFromSingleSkill = existingSkills.length === 0;
  const baseSkills = convertedFromSingleSkill
    ? detected.skillDir
      ? [normalizeDirectory(detected.skillDir)]
      : []
    : existingSkills.map(normalizeDirectory);

  const skills = baseSkills.includes(newParentDir) ? baseSkills : [...baseSkills, newParentDir];
  const files = currentFiles.includes(newParentDir)
    ? [...currentFiles]
    : [...currentFiles, newParentDir];

  return { convertedFromSingleSkill, skills, files };
}
