/**
 * Pure functions computing the "quick flow" plans offered by the intent menu
 * (see run.ts) when create-skillet is re-run against an existing skillet
 * package. Kept free of I/O so they're independently unit-testable — see
 * docs/design.md decision 7.
 */

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
