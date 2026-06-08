import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { checkbox, confirm } from '@inquirer/prompts';
import type { DetectionResult } from './detect.js';
import { runSync } from './scaffold.js';

const LOCK_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);
const SKILL_DIRS = new Set(['resources', 'assets', 'templates']);

/**
 * Pure function that determines which items should be pre-selected for the
 * skill directory move. Exported for testability.
 */
export function getPreselected(items: string[]): string[] {
  return items.filter((item) => {
    // Always select SKILL.md
    if (item === 'SKILL.md') return true;

    // Never select README.md
    if (item === 'README.md') return false;

    // Never select dotfiles or dot-folders (starts with .)
    const baseName = item.endsWith('/') ? item.slice(0, -1) : item;
    if (baseName.startsWith('.')) return false;

    // Never select lock files
    if (LOCK_FILES.has(item)) return false;

    // Pre-select skill-related folders
    const dirName = item.endsWith('/') ? item.slice(0, -1) : item;
    if (SKILL_DIRS.has(dirName)) return true;

    return false;
  });
}

/**
 * Read directory items in cwd, normalized so directories have a trailing slash.
 */
async function readDirItems(cwd: string): Promise<string[]> {
  const entries = await fsp.readdir(cwd, { withFileTypes: true });
  return entries
    .filter((e) => e.name !== 'skill') // exclude the target dir
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
}

export async function setupSkillDir(detected: DetectionResult): Promise<void> {
  const cwd = detected.cwd;
  const skillPath = path.join(cwd, 'skill');

  // Step 1: skip if skill/ already exists
  try {
    const stat = await fsp.stat(skillPath);
    if (stat.isDirectory()) {
      process.stdout.write('skill/ already exists — skipping skill directory setup.\n');
      return;
    }
  } catch {
    // skill/ doesn't exist — continue
  }

  // Step 2: skip if no SKILL.md in root
  const hasSkillMd = detected.hasSkillMd;
  if (!hasSkillMd) {
    return;
  }

  // Step 3: read directory items
  const allItems = await readDirItems(cwd);
  const LARGE_DIR_THRESHOLD = 12;

  let selectedItems: string[];

  if (allItems.length <= LARGE_DIR_THRESHOLD) {
    // Step 4a: checkbox with pre-selection
    const preselected = getPreselected(allItems);
    selectedItems = await checkbox({
      message: 'Select files/folders to move into skill/:',
      choices: allItems.map((item) => ({
        name: item,
        value: item,
        checked: preselected.includes(item),
      })),
    });
  } else {
    // Step 4b: >12 items — single confirm for minimal set
    const skillRelatedExtras = allItems
      .filter((item) => {
        const dirName = item.endsWith('/') ? item.slice(0, -1) : item;
        return SKILL_DIRS.has(dirName) && dirName !== 'resources';
      })
      .join(', ');

    const extraMsg = skillRelatedExtras
      ? ` (other skill-related folders detected but not included: ${skillRelatedExtras})`
      : '';

    const confirmed = await confirm({
      message: `Move only SKILL.md and resources/ (if present) into skill/?${extraMsg}`,
      default: true,
    });

    if (!confirmed) {
      process.stdout.write('No files moved. Your npm package is set up.\n');
      process.exit(0);
    }

    selectedItems = allItems.filter((item) => {
      return item === 'SKILL.md' || item === 'resources/';
    });
  }

  // Step 5: preview + final confirm
  if (selectedItems.length === 0) {
    process.stdout.write('No files selected. Your npm package is set up.\n');
    return;
  }

  process.stdout.write('\nFiles to move into skill/:\n');
  for (const item of selectedItems) {
    process.stdout.write(`  ${item}\n`);
  }
  process.stdout.write('\n');

  const proceed = await confirm({
    message: 'Proceed with moving these files?',
    default: true,
  });

  if (!proceed) {
    process.stdout.write('No files moved. Your npm package is set up.\n');
    process.exit(0);
  }

  // Step 6: execute the move
  await fsp.mkdir(skillPath, { recursive: true });

  for (const item of selectedItems) {
    const src = path.join(cwd, item.endsWith('/') ? item.slice(0, -1) : item);
    const dest = path.join(skillPath, item.endsWith('/') ? item.slice(0, -1) : item);
    try {
      await fsp.rename(src, dest);
      process.stdout.write(`  Moved ${item}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error moving ${item}: ${message}\n`);
      process.exit(1);
    }
  }

  // Step 7: update package.json to reflect new skill location
  // bin/cli.js does not need to be rewritten — it no longer embeds the skill path
  runSync('npm', ['pkg', 'set', 'skillet.skillDir=./skill/'], 'npm pkg set skillet.skillDir');
}
