import { createRequire } from 'node:module';
import path from 'node:path';
import { confirm } from '@inquirer/prompts';
import { generateWordmark, renderFullHeader } from '@skillet-cli/ui';
import { Command } from 'commander';
import { type DetectionResult, detectEnvironment } from './detect.js';
import { collectConfig } from './prompts.js';
import { printPublishPreview } from './publish-preview.js';
import { executeScaffold } from './scaffold.js';
import { setupSkillDir } from './skill-dir.js';

export function skillMdStatus(detected: DetectionResult): string {
  if (detected.hasSkillMd) return 'found';
  if (detected.discoveredSkillDirs.length === 1)
    return `found in ${detected.discoveredSkillDirs[0]}`;
  if (detected.discoveredSkillDirs.length > 1)
    return `found in ${detected.discoveredSkillDirs.length} locations`;
  return 'not found';
}

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
    process.stdout.write('\nCommands to run:\n');
    if (!detected.hasPackageJson) {
      process.stdout.write('  npm init -y\n');
    }
    process.stdout.write('  npm pkg set name=... version=... (and other fields)\n');
    process.stdout.write('  npm install @skillet-cli/core\n');
    process.stdout.write('\n');

    const proceedFinal = await confirm({
      message: 'Proceed? (no = exit with no changes)',
      default: true,
    });

    if (!proceedFinal) {
      process.stdout.write('No changes made. Re-run `create-skillet` to start over.\n');
      process.exit(0);
      return;
    }

    // Step 6: Execute scaffold
    await executeScaffold(config);

    // Step 7: Skill directory setup (skip for multi-skill packages)
    if (!config.isMultiSkill) {
      await setupSkillDir(detected);
    }

    // Step 7b: Publish preview
    await printPublishPreview(path.join(detected.cwd, config.skillDir));

    // Step 8: Completion block
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`\nDone in ${elapsed}s — Your skill package is ready.\n\n`);
    process.stdout.write(`  Next steps:\n`);
    process.stdout.write(`    npx . install    — test locally\n`);
    if (detected.isPrivate && !config.removePrivate) {
      process.stdout.write(`    Remove "private": true first: npm pkg delete private\n`);
    } else {
      process.stdout.write(`    npm publish      — publish to npm\n`);
    }
    process.stdout.write('\n');
  });

export async function run(): Promise<void> {
  await program.parseAsync(process.argv);
}
