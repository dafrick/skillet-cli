import { readdir } from 'node:fs/promises';
import { DEFAULT_IGNORE } from '@skillet-cli/core';

export async function printPublishPreview(skillDir: string): Promise<void> {
  process.stdout.write('\nPackage contents preview:\n');

  let entries: string[];
  try {
    const dirents = await readdir(skillDir, { withFileTypes: true });
    entries = dirents.map((d) => d.name);
  } catch {
    process.stdout.write(`  (skill directory not found: ${skillDir})\n`);
    return;
  }

  for (const entry of entries) {
    if (DEFAULT_IGNORE.has(entry)) {
      process.stdout.write(`  [excluded] ${entry}\n`);
    } else {
      process.stdout.write(`  ${entry}\n`);
    }
  }
}
