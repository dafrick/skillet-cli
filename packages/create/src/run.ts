import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { confirm, input, select } from '@inquirer/prompts';
import { generateWordmark, renderFullHeader } from '@skillet-cli/ui';
import { Command } from 'commander';
import { runCheck } from './check.js';
import { type DetectionResult, detectEnvironment } from './detect.js';
import { computeAddDirectoryPlan } from './expansion.js';
import { collectConfig } from './prompts.js';
import { executeScaffold, runSync } from './scaffold.js';
import { setupSkillDir } from './skill-dir.js';

/**
 * Intent-menu option values, in menu display order.
 * Extended/implemented by later task groups (4: add-directory, 5: add-skill).
 */
type WizardIntent = 'add-directory' | 'add-skill' | 'reconfigure' | 'check';

const INTENT_MENU_CHOICES: Array<{ name: string; value: WizardIntent }> = [
  { name: 'Add a directory to the published package', value: 'add-directory' },
  { name: 'Add another skill / convert to multi-skill', value: 'add-skill' },
  {
    name: 'Reconfigure everything (name, version, description, author, license, layout)',
    value: 'reconfigure',
  },
  { name: 'Just check what would be published', value: 'check' },
];

/**
 * "Add a directory to the published package" quick flow: prompts only for
 * the directory path, computes the resulting `files[]` plan, shows it, and
 * on confirmation writes only the updated `files` field via `npm pkg set`.
 * Never collects or writes name/version/description/author/license.
 */
async function handleAddDirectory(detected: DetectionResult): Promise<void> {
  const newDir = await input({
    message: 'Directory to add to the published package:',
  });

  const plan = computeAddDirectoryPlan(detected.files, newDir);

  process.stdout.write(`\nWill add \`${plan.directory}\` to the published package.\n`);
  process.stdout.write(`  files: ${JSON.stringify(plan.files)}\n\n`);

  const proceed = await confirm({
    message: 'Proceed?',
    default: true,
  });

  if (!proceed) {
    process.stdout.write(`${CANCEL_MESSAGE}\n`);
    return;
  }

  runSync('npm', ['pkg', 'set', '--json', `files=${JSON.stringify(plan.files)}`], 'npm pkg set');

  process.stdout.write('\npackage.json updated.\n');
}

/**
 * Placeholder for the "Add another skill / convert to multi-skill" quick flow.
 * TODO(task group 5): prompt for the new skill's directory, compute the plan via
 * computeAddSkillPlan, show it, confirm, and run `npm pkg set` for `skillet.skills`/`files`.
 */
async function handleAddSkill(_detected: DetectionResult): Promise<void> {
  process.stdout.write('\nAdding another skill is not yet implemented.\n');
}

export function skillMdStatus(detected: DetectionResult): string {
  if (detected.hasSkillMd) return 'found';
  if (detected.discoveredSkillDirs.length === 1)
    return `found in ${detected.discoveredSkillDirs[0]}`;
  if (detected.discoveredSkillDirs.length > 1)
    return `found in ${detected.discoveredSkillDirs.length} locations`;
  return 'not found';
}

export function deriveOwnerRepo(repositoryUrl: string): string | null {
  if (!repositoryUrl) return null;
  const url = repositoryUrl.replace(/^git\+/, '').replace(/\.git$/, '');
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  } catch {
    // not a valid URL
  }
  return null;
}

export async function runPostPublish(): Promise<void> {
  const cwd = process.cwd();
  const pkgPath = path.join(cwd, 'package.json');
  let pkgName = '';
  let pkgVersion = '';
  try {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw) as { name?: string; version?: string };
    pkgName = pkg.name ?? '';
    pkgVersion = pkg.version ?? '';
  } catch {
    // no package.json — exit silently
    return;
  }

  const hasClaudePlugin = fs.existsSync(path.join(cwd, '.claude-plugin', 'plugin.json'));
  const hasGemini = fs.existsSync(path.join(cwd, 'gemini-extension.json'));

  if (!hasClaudePlugin && !hasGemini) return;

  if (hasClaudePlugin) {
    process.stdout.write(`Plugin marketplace live at v${pkgVersion}\n`);
    process.stdout.write(`  claude plugin install ${pkgName}@${pkgName}\n`);
    process.stdout.write(`  copilot plugin install ${pkgName}@${pkgName}\n`);
    process.stdout.write('\n');
  }

  if (hasGemini) {
    process.stdout.write('Gemini: create a GitHub Release to mark this as the latest version:\n');
    process.stdout.write(`  gh release create v${pkgVersion}\n`);
    process.stdout.write(
      "  (or via github.com — Gemini's gallery checks for the Latest release)\n",
    );
    process.stdout.write('\n');
  }
}

export const CANCEL_MESSAGE = 'No changes made. Re-run `create-skillet` to start over.';

const _require = createRequire(import.meta.url);
const pkg = _require('../package.json') as { name: string; version: string };

const program = new Command();
program
  .name('create-skillet')
  .description('Convert a skill directory into a publishable npm package')
  .argument('[name]', 'optional package name — overrides the directory-name default')
  .action(async (nameArg?: string) => {
    const start = Date.now();

    // Step 1: Detect environment
    const detected = detectEnvironment(nameArg);

    // Step 2: Render header
    const header = renderFullHeader({
      wordmark: generateWordmark('SKILLETIZE'),
      tagline: `Package ${detected.name || 'your skill'} for any AI agent`,
      attributionLine: `Powered by Skillet CLI v${pkg.version}`,
    });
    process.stdout.write(header);

    // Step 3: Early gate — show detection summary and confirm
    process.stdout.write(`Directory:    ${detected.cwd}\n`);
    process.stdout.write(`SKILL.md:     ${skillMdStatus(detected)}\n`);
    process.stdout.write(`package.json: ${detected.hasPackageJson ? 'found' : 'not found'}\n`);
    if (detected.isPrivate) {
      process.stdout.write(`private:       true ⚠  (cannot publish until removed)\n`);
    }
    process.stdout.write(`Git user:     ${detected.gitUser || '(not detected)'}\n`);
    process.stdout.write('\n');

    const proceedEarly = await confirm({
      message: 'Proceed with setup?',
      default: true,
    });

    if (!proceedEarly) {
      process.stdout.write('\nTo set up manually:\n');
      process.stdout.write('  npm init\n');
      process.stdout.write(`  npm pkg set name="${detected.name}"\n`);
      process.stdout.write('  npm pkg set version="0.1.0"\n');
      process.stdout.write('  npm pkg set type=module\n');
      process.stdout.write('  npm pkg set engines.node=">=24"\n');
      process.stdout.write('  npm pkg set bin.your-skill="./bin/cli.js"\n');
      process.stdout.write('  # Write bin/cli.js\n');
      process.stdout.write('  npm install @skillet-cli/core\n');
      process.exit(0);
      return;
    }

    // Step 3b: Intent menu — only shown when re-running against an existing
    // skillet package; first-time setup goes straight into the full wizard.
    if (detected.isExistingSkilletPackage) {
      const intent = await select({
        message: 'What would you like to do?',
        choices: INTENT_MENU_CHOICES,
      });

      switch (intent) {
        case 'add-directory':
          await handleAddDirectory(detected);
          return;
        case 'add-skill':
          await handleAddSkill(detected);
          return;
        case 'check':
          await runCheck({ interactive: true });
          return;
        case 'reconfigure':
          // Fall through into the existing full wizard below.
          break;
      }
    }

    // Step 4: Collect config via prompts
    const config = await collectConfig(detected);

    // Step 5: NPM preview + confirm
    process.stdout.write('\nReady to set up:\n');
    process.stdout.write(`  name:         ${config.name}\n`);
    process.stdout.write(`  version:      ${config.version}\n`);
    process.stdout.write(`  description:  ${config.description}\n`);
    process.stdout.write(`  author:       ${config.author}\n`);
    process.stdout.write(`  license:      ${config.license}\n`);
    process.stdout.write(
      `  repositoryUrl:${config.repositoryUrl ? ` ${config.repositoryUrl}` : ' (none)'}\n`,
    );
    if (config.isMultiSkill) {
      process.stdout.write(`  skillsParent:  ${config.skillsParentDirs.join(', ')}\n`);
    } else {
      process.stdout.write(`  skillDir:     ${config.skillDir}\n`);
    }
    process.stdout.write("\nHere's what I'll do:\n");
    if (!detected.hasPackageJson) {
      process.stdout.write('  Initialize package.json\n');
    }
    process.stdout.write('  Set package fields (name, version, description, etc.)\n');
    process.stdout.write('  Write bin/cli.js\n');
    process.stdout.write('  Install @skillet-cli/core\n');
    process.stdout.write('\n');

    const proceedFinal = await confirm({
      message: 'Proceed? (no = exit with no changes)',
      default: true,
    });

    if (!proceedFinal) {
      process.stdout.write(`${CANCEL_MESSAGE}\n`);
      process.exit(0);
      return;
    }

    // Step 6: Execute scaffold
    await executeScaffold(config);

    // Step 7: Skill directory setup (skip for multi-skill packages)
    if (!config.isMultiSkill) {
      await setupSkillDir(detected);
    }

    // Step 7b: Publish preview (read-only — no prompts, no .npmignore writes)
    await runCheck({ interactive: false });

    // Step 8: Completion block
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`\nDone in ${elapsed}s — Your skill package is ready.\n\n`);
    process.stdout.write(`  Next steps:\n`);
    process.stdout.write(`    npx . install         — test locally\n`);
    process.stdout.write(`    create-skillet check  — verify what will be published\n`);
    if (detected.isPrivate && !config.removePrivate) {
      process.stdout.write(`    Remove "private": true first: npm pkg delete private\n`);
    } else {
      process.stdout.write(`    npm publish           — publish to npm\n`);
    }

    // Plugin marketplace share instructions
    const ownerRepo = config.generateClaudePlugin ? deriveOwnerRepo(config.repositoryUrl) : null;
    if (ownerRepo) {
      process.stdout.write('\nPlugin marketplace ready:\n');
      process.stdout.write('  Share with your users:\n');
      process.stdout.write(`    claude plugin marketplace add ${ownerRepo}\n`);
      process.stdout.write(`    claude plugin install ${config.name}@${config.name}\n`);
      process.stdout.write('\n');
      process.stdout.write("  Copilot CLI (same commands, replace 'claude' with 'copilot')\n");
      if (config.generateGeminiPlugin) {
        process.stdout.write('\n');
        process.stdout.write("  Gemini: add topic 'gemini-cli-extension' to your GitHub repo\n");
        process.stdout.write(
          `          then users install via: gemini extensions install ${config.repositoryUrl.replace(/^git\+/, '').replace(/\.git$/, '')}\n`,
        );
      }
      process.stdout.write('\n');
      process.stdout.write(
        `  Before each release: git tag v{version} && git push origin v{version}\n`,
      );
    }
    process.stdout.write('\n');
  });

program.addCommand(
  new Command('check')
    .description('Check publish readiness — verify tarball contents before npm publish')
    .action(async () => {
      await runCheck({ interactive: true });
    }),
);

program.addCommand(
  new Command('post-publish')
    .description('Print post-publish next steps (run via postpublish npm lifecycle hook)')
    .action(async () => {
      await runPostPublish();
    }),
);

export async function run(): Promise<void> {
  await program.parseAsync(process.argv);
}
