import { spawnSync } from 'node:child_process';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { checkbox } from '@inquirer/prompts';
import type { ClassifiedFile, DisplayEntry } from './check.js';
import { classifyFile, collapseToDirectories } from './check.js';

function extractNpmIgnoreKey(row: DisplayEntry): string {
  // For collapsed dir rows: strip " (N files)" suffix to get the directory name (with trailing /)
  // For individual file rows: use the path directly
  if (row.isDir) {
    return row.label.replace(/ \(\d+ files\)$/, '');
  }
  return row.paths[0];
}

async function writeNpmIgnoreEntries(entries: string[], cwd: string): Promise<void> {
  if (entries.length === 0) return;

  const npmignorePath = path.join(cwd, '.npmignore');
  let existing: string[] = [];

  try {
    const content = await fsp.readFile(npmignorePath, 'utf8');
    existing = content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    // File absent — start fresh
  }

  const existingSet = new Set(existing);
  const newEntries = entries.filter((e) => !existingSet.has(e));

  if (newEntries.length === 0) return;

  try {
    await fsp.appendFile(npmignorePath, `${newEntries.join('\n')}\n`, 'utf8');
    process.stdout.write('\nWrote to .npmignore:\n');
    for (const e of newEntries) {
      process.stdout.write(`  ${e}\n`);
    }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EROFS') {
      process.stderr.write('Could not write .npmignore — permission denied.\n');
      process.stdout.write('\nTo exclude manually, add these to .npmignore:\n');
      for (const e of entries) {
        process.stdout.write(`  ${e}\n`);
      }
      process.exit(1);
      return;
    }
    throw err;
  }
}

async function recheckForViolations(skillPaths: string[], cwd: string): Promise<void> {
  const packResult = spawnSync('npm pack --dry-run --json', [], {
    shell: true,
    encoding: 'utf8',
    stdio: 'pipe',
    cwd,
  });

  if (packResult.status !== 0) {
    process.stderr.write('npm pack failed during re-check — could not verify.\n');
    return;
  }

  let manifests: { name: string; version: string; files: { path: string; size: number }[] }[];
  try {
    manifests = JSON.parse(packResult.stdout) as typeof manifests;
  } catch {
    return;
  }

  const manifest = manifests[0];
  if (!manifest) return;

  const classified = manifest.files.map((f) => classifyFile(f, skillPaths));
  const remaining = classified.filter((f) => f.tier === 'violation');

  if (remaining.length === 0) {
    process.stdout.write('\n✓ Tarball is clean — no violations found.\n');
  } else {
    process.stderr.write(`\n${remaining.length} violation(s) still present:\n`);
    for (const v of remaining) {
      process.stderr.write(`  ${v.packPath}\n`);
    }
    process.exit(1);
  }
}

export async function triageViolations(
  violations: ClassifiedFile[],
  skillPaths: string[],
  cwd: string,
): Promise<void> {
  if (violations.length === 0) return;

  let currentRows = collapseToDirectories(violations);
  const toExclude: string[] = [];

  while (true) {
    const selected = await checkbox({
      message: 'Select entries to include in the tarball (uncheck to exclude from publish):',
      choices: currentRows.map((row) => ({
        name: row.label,
        value: row.label,
        checked: true,
      })),
    });

    const keptSet = new Set(selected);

    // Accumulate excluded entries
    for (const row of currentRows) {
      if (!keptSet.has(row.label)) {
        toExclude.push(extractNpmIgnoreKey(row));
      }
    }

    // Find kept directory rows eligible for expansion
    const keptDirs = currentRows.filter((r) => r.isDir && keptSet.has(r.label));
    if (keptDirs.length === 0) break;

    const toExpand = await checkbox({
      message: "Any directories you'd like to inspect further?",
      choices: keptDirs.map((r) => ({
        name: r.label,
        value: r.label,
        checked: false,
      })),
    });

    if (toExpand.length === 0) break;

    const expandSet = new Set(toExpand);
    const newRows: DisplayEntry[] = [];

    for (const row of currentRows) {
      if (!keptSet.has(row.label)) continue; // already excluded
      if (row.isDir && expandSet.has(row.label)) {
        // Expand one level into children
        const dirPrefix = extractNpmIgnoreKey(row); // e.g. 'node_modules/'
        const dirFiles = violations.filter((v) => row.paths.includes(v.packPath));
        const expanded = collapseToDirectories(dirFiles, dirPrefix);
        newRows.push(...expanded);
      } else {
        newRows.push(row);
      }
    }

    currentRows = newRows;
  }

  if (toExclude.length === 0) return;

  await writeNpmIgnoreEntries(toExclude, cwd);
  await recheckForViolations(skillPaths, cwd);
}
