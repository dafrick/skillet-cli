import { type StdioOptions, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { confirm } from '@inquirer/prompts';
import { createSpinner } from '@skillet-cli/ui';
import { generatePluginManifests } from './plugin-manifests.js';
import type { WizardConfig } from './prompts.js';

// shell:true is required on Windows where npm is a .cmd batch file that
// CreateProcess cannot execute directly. We build the command string ourselves
// and double-quote every arg so shell metacharacters (>, |, &, spaces) in
// values like "engines.node=>=24" or "description=A test skill" are not
// interpreted by the shell. Any double quotes already present in an arg
// (e.g. a JSON-stringified value passed to `npm pkg set --json`) are
// backslash-escaped first so they don't prematurely close the wrapping
// quotes and corrupt the value.
export function runSync(
  cmd: string,
  args: string[],
  stepName: string,
  stdioOverride?: StdioOptions,
): void {
  const cmdStr = [cmd, ...args.map((a) => `"${a.replace(/"/g, '\\"')}"`)].join(' ');
  const result = spawnSync(cmdStr, [], { stdio: stdioOverride ?? 'inherit', shell: true });
  if (result.status !== 0) {
    throw new Error(`${stepName} exited with code ${result.status ?? 'null'}`);
  }
}

export function buildBinCliJs(): string {
  return `#!/usr/bin/env node
import { createRequire } from 'node:module';
import { run } from '@skillet-cli/core';

const pkg = createRequire(import.meta.url)('../package.json');
await run({ pkg });
`;
}

export async function executeScaffold(config: WizardConfig): Promise<void> {
  const spinner = createSpinner();

  try {
    // Step 1: npm init if no package.json
    const pkgJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      spinner.start('Prepping npm package…');
      runSync('npm', ['init', '-y'], 'npm init', ['inherit', 'pipe', 'inherit']);
      spinner.succeed('Prepping done');
    }

    // Step 2: npm pkg set fields
    spinner.start('Seasoning package fields…');

    const skillField = config.isMultiSkill
      ? config.skillsParentDirs.length === 1
        ? `skillet.skills=${config.skillsParentDirs[0]}`
        : `skillet.skills=${JSON.stringify(config.skillsParentDirs)}`
      : `skillet.skillDir=${config.skillDir}`;

    const filesArgs = config.isMultiSkill
      ? config.skillsParentDirs.map((dir, i) => {
          const normalized = dir.endsWith('/') ? dir : `${dir}/`;
          return `files[${i + 1}]=${normalized}`;
        })
      : [`files[1]=${config.skillDir}`];

    const pkgSetArgs = [
      `name=${config.name}`,
      `version=${config.version}`,
      ...(config.description ? [`description=${config.description}`] : []),
      ...(config.author ? [`author=${config.author}`] : []),
      `license=${config.license}`,
      'type=module',
      `engines.node=>=24`,
      skillField,
      `bin.${config.name}=./bin/cli.js`,
      `files[0]=bin`,
      ...filesArgs,
      'scripts.prepublishOnly=create-skillet check',
      ...(config.generateClaudePlugin || config.generateGeminiPlugin
        ? ['scripts.postpublish=create-skillet post-publish']
        : []),
    ];

    runSync('npm', ['pkg', 'set', ...pkgSetArgs], 'npm pkg set');

    // Step 3: repository URL (only if non-empty)
    if (config.repositoryUrl) {
      runSync('npm', ['pkg', 'set', 'repository.type=git'], 'npm pkg set repository.type');
      runSync(
        'npm',
        ['pkg', 'set', `repository.url=${config.repositoryUrl}`],
        'npm pkg set repository.url',
      );
    }

    // Step 3b: Remove private field if requested
    if (config.removePrivate) {
      runSync('npm', ['pkg', 'delete', 'private'], 'npm pkg delete private');
    }

    spinner.succeed('Seasoning done');

    const finalPkg = fs.readFileSync(pkgJsonPath, 'utf8');
    process.stdout.write(`\npackage.json written:\n${finalPkg}\n`);

    // Step 4: Write bin/cli.js — gated on a content comparison rather than an
    // unconditional overwrite. If no bin/cli.js exists yet, write it without
    // any prompt. If it exists and matches the freshly rendered content
    // exactly, rewrite silently (idempotent, no-op from the user's
    // perspective). If it exists and differs, warn and ask for consent
    // before overwriting; declining leaves the existing file untouched and
    // the wizard continues with the remaining steps.
    const binDir = path.join(process.cwd(), 'bin');
    await fsp.mkdir(binDir, { recursive: true });
    const binPath = path.join(binDir, 'cli.js');
    const renderedBinCliJs = buildBinCliJs();

    let shouldWriteBinCliJs = true;
    if (fs.existsSync(binPath)) {
      const existingBinCliJs = fs.readFileSync(binPath, 'utf8');
      if (existingBinCliJs !== renderedBinCliJs) {
        process.stdout.write(
          '\n⚠  bin/cli.js appears to have been modified since it was generated.\n',
        );
        shouldWriteBinCliJs = await confirm({
          message: 'Overwrite bin/cli.js with the freshly generated version?',
          default: false,
        });
      }
    }

    if (shouldWriteBinCliJs) {
      spinner.start('Plating bin/cli.js…');
      await fsp.writeFile(binPath, renderedBinCliJs, 'utf8');

      // Step 5: chmod 755
      await fsp.chmod(binPath, 0o755);
    } else {
      process.stdout.write('  Skipping bin/cli.js — existing file left untouched.\n');
    }

    // Write .npmignore to exclude nested node_modules from the published tarball.
    // npm's built-in node_modules exclusion only covers the package root; skill
    // subdirectories listed in "files" carry their own node_modules otherwise.
    const npmignorePath = path.join(process.cwd(), '.npmignore');
    if (!fs.existsSync(npmignorePath)) {
      await fsp.writeFile(npmignorePath, '**/node_modules\n', 'utf8');
    }

    spinner.succeed('Plating done');

    // Step 6b: Generate plugin manifests (if requested)
    await generatePluginManifests(config);

    // Step 6: npm install @skillet-cli/core + create-skillet (devDep)
    process.stdout.write('  Installing @skillet-cli/core…\n');
    const installResult = spawnSync('npm install @skillet-cli/core@latest', [], {
      stdio: 'pipe',
      shell: true,
      encoding: 'utf8',
    });
    if (installResult.status !== 0) {
      if (installResult.stderr) {
        process.stderr.write(String(installResult.stderr));
      }
      process.exit(1);
      return;
    }
    process.stdout.write('  ✓ Installed @skillet-cli/core\n');

    const devInstallResult = spawnSync('npm install --save-dev create-skillet@latest', [], {
      stdio: 'pipe',
      shell: true,
      encoding: 'utf8',
    });
    if (devInstallResult.status !== 0) {
      if (devInstallResult.stderr) {
        process.stderr.write(String(devInstallResult.stderr));
      }
      process.exit(1);
      return;
    }
  } catch (err) {
    spinner.fail('Setup failed');
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error during setup: ${message}\n`);
    process.exit(1);
  }
}
