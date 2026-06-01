import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { checkbox, select } from '@inquirer/prompts';
import { Command } from 'commander';
import updateNotifier from 'update-notifier';
import { registry } from './adapters/index.js';
import type { Adapter } from './adapters/types.js';
import { detectDrift, isStale } from './drift.js';
import { gcUninstall } from './gc.js';
import type { InstallOptions, InstallRecord } from './install.js';
import { findExistingInstalls, performInstall } from './install.js';
import { discoverSkillTrees, readPackageName, readSkilletMarker } from './marker.js';
import { type NormalizedSkill, normalizeSkill } from './normalize.js';
import type { Scope } from './types.js';
import { basil, chili, dim, ember400 } from './ui/colors.js';
import { renderFullHeader, renderLightHeader } from './ui/header.js';
import { createSpinner } from './ui/spinner.js';
import { pickStandardVerb, pickVerb } from './ui/verbs.js';
import { deriveDisplayName } from './ui/wordmark.js';
import { applyUpdate } from './update.js';
import { resolveSkillPackageClosure } from './walk.js';

const _require = createRequire(import.meta.url);
const corePackage = _require('../package.json') as { version: string };
const coreVersion = corePackage.version;

export interface RunOptions {
  skillDir?: string;
  pkg: { name: string; version: string };
  argv?: string[];
  verbMode?: 'fun' | 'standard';
  displayName?: string;
  wordmarkName?: string;
  hooks?: {
    transform?: (skill: NormalizedSkill) => Promise<NormalizedSkill> | NormalizedSkill;
    beforeInstall?: (
      skill: NormalizedSkill,
      adapter: Adapter,
      ctx: import('./adapters/types.js').Context,
    ) => Promise<void> | void;
    afterInstall?: (
      skill: NormalizedSkill,
      adapter: Adapter,
      ctx: import('./adapters/types.js').Context,
    ) => Promise<void> | void;
    extendProgram?: (program: Command, ctx: Record<string, unknown>) => void;
  };
}

interface TargetOption {
  adapter: Adapter;
  scope: Scope;
  detected: boolean;
}

function buildTargetList(home: string, cwd: string, opts: { scope?: string }): TargetOption[] {
  const targets: TargetOption[] = [];
  const scopes: Scope[] = ['user', 'project'];

  for (const adapter of registry.list()) {
    const detectResult = adapter.detect({ home, cwd });
    for (const scope of scopes) {
      if (!adapter.supportsScope(scope)) continue;
      // If --scope is specified, only include that scope
      if (opts.scope && opts.scope !== scope) continue;
      targets.push({
        adapter,
        scope,
        detected: detectResult.scopes.includes(scope),
      });
    }
  }
  return targets;
}

async function runInstallPrompts(
  allTargets: TargetOption[],
  opts: { target: string[]; scope?: string; yes?: boolean },
): Promise<TargetOption[]> {
  // Step 1: Scope prompt (if --scope not passed)
  let chosenScope: Scope | undefined = opts.scope as Scope | undefined;

  if (!chosenScope) {
    const scopeChoices: Array<{ name: string; value: Scope }> = [
      { name: 'user   — install for this user account (recommended)', value: 'user' },
      { name: 'project — install for this project only', value: 'project' },
    ];
    chosenScope = await select({
      message: 'Install scope:',
      choices: scopeChoices,
      default: 'user' as Scope,
    });
  }

  // Filter targets to the selected scope
  const scopedTargets = allTargets.filter((t) => t.scope === chosenScope);

  // Step 2: Target multi-select (if --target not passed)
  if (opts.target.length > 0) {
    return scopedTargets.filter((t) => opts.target.includes(t.adapter.id));
  }

  const targetChoices = scopedTargets.map((t) => ({
    name: `${t.adapter.label}${t.detected ? '' : ' (not detected)'}`,
    value: t,
    checked: t.detected,
  }));

  if (targetChoices.length === 0) {
    return [];
  }

  const selected = await checkbox({
    message: 'Select targets to install:',
    choices: targetChoices,
  });

  return selected;
}

async function runInstall(
  skill: NormalizedSkill,
  pkg: { name: string; version: string },
  hooks: RunOptions['hooks'],
  opts: {
    target: string[];
    scope?: string;
    yes?: boolean;
    force?: boolean;
    requestorRoot?: string;
  },
  verbMode: 'fun' | 'standard',
  resolvedDisplayName: string,
  resolvedWordmarkName: string,
): Promise<void> {
  const isTTY = process.stdout.isTTY ?? false;

  const home = process.env.HOME ?? process.env.USERPROFILE ?? os.homedir();
  const cwd = process.cwd();

  const allTargets = buildTargetList(home, cwd, opts);

  let selectedTargets: TargetOption[];

  if (!isTTY || opts.yes) {
    // Non-interactive: use detected targets (or --target filtered), scope defaults to user
    if (opts.target.length > 0) {
      selectedTargets = allTargets.filter((t) => opts.target.includes(t.adapter.id));
    } else {
      selectedTargets = allTargets.filter((t) => t.detected);
    }
    // If no scope specified, default to user
    if (!opts.scope) {
      selectedTargets = selectedTargets.filter((t) => t.scope === 'user');
    }
  } else {
    selectedTargets = await runInstallPrompts(allTargets, opts);
  }

  if (selectedTargets.length === 0) {
    console.log('  No targets selected.');
    return;
  }

  const installOpts: InstallOptions = {
    pkg,
    requestorRoot: opts.requestorRoot,
    hooks: { beforeInstall: hooks?.beforeInstall, afterInstall: hooks?.afterInstall },
  };
  const verb =
    verbMode === 'standard' ? pickStandardVerb('install', isTTY) : pickVerb('install', isTTY);
  const start = Date.now();

  for (const { adapter, scope } of selectedTargets) {
    if (isTTY) {
      const spinner = createSpinner(true);
      spinner.start(`${verb.active} ${adapter.label} (${scope})…`);
      try {
        const installPath = await performInstall(skill, adapter, scope, installOpts);
        spinner.succeed(`${verb.done.padEnd(10)} ${adapter.id.padEnd(10)} ${installPath}`);
      } catch (err) {
        spinner.fail(
          `Failed to install ${adapter.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        throw err;
      }
    } else {
      const installPath = await performInstall(skill, adapter, scope, installOpts);
      console.log(`[${pkg.name}] ${verb.active} ${adapter.id} (${scope})…`);
      console.log(`[${pkg.name}] ✔ ${verb.done} — ${installPath}`);
    }
  }

  if (isTTY) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `\n  ${selectedTargets.length} target${selectedTargets.length !== 1 ? 's' : ''} installed · ${elapsed}s`,
    );
  } else {
    console.log(
      `[${pkg.name}] ${selectedTargets.length} target${selectedTargets.length !== 1 ? 's' : ''} installed`,
    );
  }
}

async function runDriftPrompt(
  record: InstallRecord,
): Promise<'backup_and_overwrite' | 'overwrite' | 'skip'> {
  console.log(ember400(`⚠  ${record.adapter.id} has local modifications`));
  return select({
    message: 'What would you like to do?',
    choices: [
      {
        name: 'backup and overwrite  — saves a timestamped copy, then reinstalls',
        value: 'backup_and_overwrite' as const,
      },
      {
        name: 'overwrite             — discards local changes and reinstalls',
        value: 'overwrite' as const,
      },
      {
        name: 'skip                  — leave this install as-is',
        value: 'skip' as const,
      },
    ],
  });
}

async function runUpdate(
  skill: NormalizedSkill,
  pkg: { name: string; version: string },
  opts: { force?: boolean; addNew?: boolean },
  verbMode: 'fun' | 'standard',
  resolvedDisplayName: string,
  resolvedWordmarkName: string,
): Promise<void> {
  const isTTY = process.stdout.isTTY ?? false;

  const records = await findExistingInstalls(skill);

  if (records.length === 0 && !opts.addNew) {
    console.log('  No installs found.');
    return;
  }

  const verb =
    verbMode === 'standard' ? pickStandardVerb('update', isTTY) : pickVerb('update', isTTY);
  let updatedCount = 0;

  for (const record of records) {
    const result = await applyUpdate(record, skill, {
      pkg,
      force: opts.force,
      isTTY,
      onDrift: async (r) => {
        if (!isTTY) return 'skip';
        return runDriftPrompt(r);
      },
    });

    if (result.action === 'updated' || result.action === 'backed_up_and_updated') {
      updatedCount++;
      if (isTTY) {
        console.log(`✔ ${result.record.adapter.id}   ${result.record.installPath}`);
      } else {
        console.log(`[${pkg.name}] ${verb.active} ${result.record.installPath}…`);
        console.log(`[${pkg.name}] ✔ ${verb.done} — ${result.record.installPath}`);
      }
    } else if (result.action === 'drifted_skipped') {
      const warning = `⚠  ${record.adapter.id} has local modifications (use --force to overwrite)`;
      if (isTTY) {
        console.log(ember400(warning));
      } else {
        console.warn(`[${pkg.name}] ${warning}`);
      }
    }
    // 'skipped' — already up to date, no output needed
  }

  // --add-new: offer newly available targets not yet installed
  if (opts.addNew) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? os.homedir();
    const cwd = process.cwd();
    const allTargets = buildTargetList(home, cwd, {});
    const installedKeys = new Set(records.map((r) => `${r.adapter.id}:${r.scope}`));
    const newTargets = allTargets.filter(
      (t) => t.detected && !installedKeys.has(`${t.adapter.id}:${t.scope}`),
    );

    if (newTargets.length > 0) {
      const installVerb =
        verbMode === 'standard' ? pickStandardVerb('install', isTTY) : pickVerb('install', isTTY);
      for (const { adapter, scope } of newTargets) {
        if (isTTY) {
          const spinner = createSpinner(true);
          spinner.start(`${installVerb.active} ${adapter.label} (${scope})…`);
          try {
            const installPath = await performInstall(skill, adapter, scope, { pkg });
            spinner.succeed(
              `${installVerb.done.padEnd(10)} ${adapter.id.padEnd(10)} ${installPath}`,
            );
            updatedCount++;
          } catch (err) {
            spinner.fail(
              `Failed to install ${adapter.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        } else {
          const installPath = await performInstall(skill, adapter, scope, { pkg });
          console.log(`[${pkg.name}] ${installVerb.active} ${installPath}…`);
          console.log(`[${pkg.name}] ✔ ${installVerb.done} — ${installPath}`);
          updatedCount++;
        }
      }
    }
  }

  if (updatedCount === 0 && records.length > 0) {
    if (isTTY) {
      process.stdout.write('  All installs are up to date.\n');
    }
  }
}

async function runGcDeletePrompt(skillDir: string): Promise<boolean> {
  const { confirm } = await import('@inquirer/prompts');
  return confirm({
    message: `Skill at ${skillDir} has local modifications. Delete anyway?`,
    default: false,
  });
}

async function runUninstall(
  skill: NormalizedSkill,
  pkg: { name: string; version: string },
  requestorRoot: string,
  opts: { yes?: boolean; force?: boolean },
  verbMode: 'fun' | 'standard',
  resolvedDisplayName: string,
  resolvedWordmarkName: string,
): Promise<void> {
  const isTTY = process.stdout.isTTY ?? false;

  const records = await findExistingInstalls(skill);
  if (records.length === 0) {
    return;
  }

  let toRemove: InstallRecord[] = records;

  if (isTTY && !opts.yes) {
    const selected = await checkbox({
      message: 'Which installs would you like to remove?',
      choices: records.map((r) => ({
        name: `${r.adapter.id.padEnd(10)} ${r.installPath}`,
        value: r,
        checked: true,
      })),
    });
    toRemove = selected;
  }

  if (toRemove.length === 0) {
    return;
  }

  const verb =
    verbMode === 'standard' ? pickStandardVerb('uninstall', isTTY) : pickVerb('uninstall', isTTY);

  for (const record of toRemove) {
    // Assumes installPath is always a skill subdirectory (not a file), matching the adapter convention.
    const targetDir = path.dirname(record.installPath);

    if (isTTY) {
      const spinner = createSpinner(true);
      spinner.start(`${verb.active} ${record.adapter.id}…`);
      await gcUninstall(requestorRoot, targetDir, {
        force: opts.force,
        isTTY,
        onPrompt: runGcDeletePrompt,
      });
      spinner.succeed(`${verb.done.padEnd(10)} ${record.adapter.id}`);
    } else {
      console.log(`[${pkg.name}] ${verb.active} ${record.adapter.id}…`);
      await gcUninstall(requestorRoot, targetDir, {
        force: opts.force,
        isTTY,
      });
      console.log(`[${pkg.name}] ✔ ${verb.done} — ${record.adapter.id}`);
    }
  }
}

async function runList(
  skill: NormalizedSkill,
  _pkg: { name: string; version: string },
): Promise<void> {
  const records = await findExistingInstalls(skill);
  if (records.length === 0) {
    console.log('  No installs found.');
    return;
  }

  for (const record of records) {
    const drift = await detectDrift(record.installPath);
    const stale = await isStale(record.installPath, skill.contentHash);

    const driftStr =
      drift === 'pristine'
        ? basil('pristine')
        : drift === 'modified'
          ? chili('modified')
          : dim('unknown');

    const staleStr = stale ? dim(' · stale') : '';
    const hashShort = dim(`${record.manifest.contentHash.slice(0, 16)}…`);
    console.log(
      `  ${record.adapter.id.padEnd(10)} ${record.installPath.padEnd(40)} ${driftStr}${staleStr}  ${hashShort}`,
    );
  }
}

function registerInstallCommand(
  program: Command,
  skills: NormalizedSkill[],
  pkg: { name: string; version: string },
  hooks: RunOptions['hooks'],
  verbMode: 'fun' | 'standard',
  resolvedDisplayName: string,
  resolvedWordmarkName: string,
  requestorRoot?: string,
): void {
  program
    .command('install')
    .description('Install the skill to target AI tools')
    .option('--target <id>', 'target adapter id (repeatable)', collect, [])
    .option('--scope <scope>', 'scope: user or project')
    .option('--yes', 'skip interactive prompts')
    .option('--force', 'overwrite drifted installs')
    .action(async (opts: { target: string[]; scope?: string; yes?: boolean; force?: boolean }) => {
      process.stdout.write(renderFullHeader({ resolvedWordmarkName, resolvedDisplayName, pkg, coreVersion }));
      for (const skill of skills) {
        await runInstall(skill, pkg, hooks, { ...opts, requestorRoot }, verbMode, resolvedDisplayName, resolvedWordmarkName);
      }
    });
}

function registerUpdateCommand(
  program: Command,
  skills: NormalizedSkill[],
  pkg: { name: string; version: string },
  verbMode: 'fun' | 'standard',
  resolvedDisplayName: string,
  resolvedWordmarkName: string,
): void {
  program
    .command('update')
    .description('Update installed skill files')
    .option('--force', 'overwrite without prompting on local modifications')
    .option('--add-new', 'also offer newly available targets')
    .action(async (opts: { force?: boolean; addNew?: boolean }) => {
      process.stdout.write(renderFullHeader({ resolvedWordmarkName, resolvedDisplayName, pkg, coreVersion }));
      for (const skill of skills) {
        await runUpdate(skill, pkg, opts, verbMode, resolvedDisplayName, resolvedWordmarkName);
      }
    });
}

function registerUninstallCommand(
  program: Command,
  skills: NormalizedSkill[],
  pkg: { name: string; version: string },
  verbMode: 'fun' | 'standard',
  resolvedDisplayName: string,
  resolvedWordmarkName: string,
  requestorRoot: string,
): void {
  program
    .command('uninstall')
    .description('Remove installed skill files')
    .option('--yes', 'skip interactive prompts')
    .option('--force', 'delete modified skills without prompting')
    .action(async (opts: { yes?: boolean; force?: boolean }) => {
      process.stdout.write(renderLightHeader({ resolvedWordmarkName, resolvedDisplayName, pkg, coreVersion }));
      for (const skill of skills) {
        await runUninstall(skill, pkg, requestorRoot, opts, verbMode, resolvedDisplayName, resolvedWordmarkName);
      }
    });
}

function registerListCommand(
  program: Command,
  skills: NormalizedSkill[],
  pkg: { name: string; version: string },
  resolvedDisplayName: string,
  resolvedWordmarkName: string,
): void {
  program
    .command('list')
    .description('List all installed skill targets')
    .action(async () => {
      process.stdout.write(renderLightHeader({ resolvedWordmarkName, resolvedDisplayName, pkg, coreVersion }));
      for (const skill of skills) {
        await runList(skill, pkg);
      }
    });
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export async function run(options: RunOptions): Promise<void> {
  const { skillDir, pkg, argv = process.argv, hooks, verbMode = 'fun' } = options;

  if (!pkg) throw new Error('pkg is required — pass { pkg } to run()');

  // The top-level invoked package's npm name — used as requestorRoot for all skills in the closure.
  const requestorRoot = await readPackageName(process.cwd()).catch(() => pkg.name);

  // Resolve skill directories for the invoked package
  const invokedPackageRoot: string = process.cwd();
  let invokedSkillDirs: string[];
  if (skillDir !== undefined) {
    invokedSkillDirs = [skillDir];
  } else {
    const marker = await readSkilletMarker(process.cwd());
    if (!marker) {
      throw new Error(
        'No skillDir provided and no "skillet" key found in package.json. ' +
          'Either pass skillDir to run() or add a "skillet" key to your package.json.',
      );
    }
    const discovered: string[] = [];
    for (const dir of marker.skillsDirs) {
      const abs = path.resolve(dir);
      const trees = await discoverSkillTrees(abs);
      discovered.push(...trees);
    }
    if (discovered.length === 0) {
      throw new Error(
        `No skill trees found. Searched directories: ${marker.skillsDirs.join(', ')}. ` +
          'Each skill tree must contain a SKILL.md file.',
      );
    }
    invokedSkillDirs = discovered;
  }

  // Walk the dependency closure to get all skills (invoked + transitive dependencies),
  // in topological order (dependency skills before dependent skills).
  const skillEntries = await resolveSkillPackageClosure(invokedPackageRoot, invokedSkillDirs);
  const resolvedSkillDirs = skillEntries.map((e) => e.skillDir);

  // Resolve display and wordmark names once
  const resolvedDisplayName = (options.displayName ?? deriveDisplayName(pkg.name)).toUpperCase();
  const resolvedWordmarkName = (
    options.wordmarkName ??
    options.displayName ??
    deriveDisplayName(pkg.name)
  ).toUpperCase();

  // Normalize all skills, applying transform hook to each if provided
  const skills = await Promise.all(
    resolvedSkillDirs.map(async (dir) => {
      let skill = await normalizeSkill(dir);
      if (hooks?.transform) {
        skill = await hooks.transform(skill);
      }
      return skill;
    }),
  );

  // Build commander program
  const program = new Command();
  program.name(pkg.name).version(pkg.version).addHelpCommand(false);

  // Set up unknown command handler
  program.on('command:*', () => {
    process.exit(1);
  });

  // Register subcommands
  registerInstallCommand(
    program,
    skills,
    pkg,
    hooks,
    verbMode,
    resolvedDisplayName,
    resolvedWordmarkName,
    requestorRoot,
  );
  registerUpdateCommand(program, skills, pkg, verbMode, resolvedDisplayName, resolvedWordmarkName);
  registerUninstallCommand(
    program,
    skills,
    pkg,
    verbMode,
    resolvedDisplayName,
    resolvedWordmarkName,
    requestorRoot,
  );
  registerListCommand(program, skills, pkg, resolvedDisplayName, resolvedWordmarkName);

  // Call extendProgram hook if provided
  if (hooks?.extendProgram) {
    hooks.extendProgram(program, {});
  }

  // Parse
  await program.parseAsync(argv);

  // Update notifier — after command output, TTY only
  if (process.stdout.isTTY) {
    updateNotifier({ pkg }).notify();
  }
}
