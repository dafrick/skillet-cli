export type Command = 'install' | 'update' | 'uninstall' | 'detect';
export interface VerbPair {
  active: string;
  done: string;
}

// 5 verbs per command
const VERBS: Record<Command, VerbPair[]> = {
  install: [
    { active: 'Searing into', done: 'Seared' },
    { active: 'Baking into', done: 'Baked' },
    { active: 'Frying into', done: 'Fried' },
    { active: 'Grilling into', done: 'Grilled' },
    { active: 'Roasting into', done: 'Roasted' },
  ],
  update: [
    { active: 'Reheating', done: 'Reheated' },
    { active: 'Seasoning', done: 'Seasoned' },
    { active: 'Basting', done: 'Basted' },
    { active: 'Sautéing', done: 'Sautéed' },
    { active: 'Tempering', done: 'Tempered' },
  ],
  uninstall: [
    { active: 'Scraping', done: 'Scraped' },
    { active: 'Clearing', done: 'Cleared' },
    { active: 'Scrubbing', done: 'Scrubbed' },
    { active: 'Scouring', done: 'Scoured' },
    { active: 'Degreasing', done: 'Degreased' },
  ],
  detect: [
    { active: 'Scoping the kitchen…', done: 'Found {n} target(s)' },
    { active: 'Checking the pantry…', done: 'Found {n} target(s)' },
    { active: 'Lighting the stove…', done: 'Found {n} targets' },
    { active: 'Surveying the mise en place…', done: 'Found {n} targets' },
    { active: 'Preheating the oven…', done: 'Found {n} targets' },
  ],
};

// pickVerb returns sentence-case in TTY, lowercase in CI
export function pickVerb(
  command: Command,
  isTTY: boolean = process.stdout.isTTY ?? false,
): VerbPair {
  const pool = VERBS[command];
  const pair = pool[Math.floor(Math.random() * pool.length)];
  if (isTTY) return pair;
  return { active: pair.active.toLowerCase(), done: pair.done.toLowerCase() };
}

const STANDARD_VERBS: Record<Command, VerbPair> = {
  install: { active: 'Installing into', done: 'Installed' },
  update: { active: 'Updating', done: 'Updated' },
  uninstall: { active: 'Removing', done: 'Removed' },
  detect: { active: 'Detecting targets…', done: 'Found {n} target(s)' },
};

// pickStandardVerb returns deterministic sentence-case in TTY, lowercase active in CI
export function pickStandardVerb(
  command: Command,
  isTTY: boolean = process.stdout.isTTY ?? false,
): VerbPair {
  const pair = STANDARD_VERBS[command];
  if (isTTY) return pair;
  return { active: pair.active.toLowerCase(), done: pair.done };
}
