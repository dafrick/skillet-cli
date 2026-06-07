import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { createSpinner } from '@skillet-cli/ui';
import type { WizardConfig } from './prompts.js';

// shell:true is required on Windows where npm is a .cmd batch file that
// CreateProcess cannot execute directly. We build the command string ourselves
// and double-quote every arg so shell metacharacters (>, |, &, spaces) in
// values like "engines.node=>=24" or "description=A test skill" are not
// interpreted by the shell.
function runSync(cmd: string, args: string[], stepName: string): void {
  const cmdStr = [cmd, ...args.map((a) => `"${a}"`)].join(' ');
  const result = spawnSync(cmdStr, [], { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    throw new Error(`${stepName} exited with code ${result.status ?? 'null'}`);
  }
}

function buildBinCliJs(skillDir: string): string {
  return `#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { run } from '@skillet-cli/core';

const pkg = createRequire(import.meta.url)('../package.json');
await run({ skillDir: fileURLToPath(new URL('../${skillDir}', import.meta.url)), pkg });
`;
}

export async function executeScaffold(config: WizardConfig): Promise<void> {
  const spinner = createSpinner();

  try {
    // Step 1: npm init if no package.json
    const pkgJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      spinner.start('Prepping npm package…');
      runSync('npm', ['init', '-y'], 'npm init');
      spinner.succeed('Prepping done');
    }

    // Step 2: npm pkg set fields
    spinner.start('Seasoning package fields…');

    const pkgSetArgs = [
      `name=${config.name}`,
      `version=${config.version}`,
      `description=${config.description}`,
      `author=${config.author}`,
      `license=${config.license}`,
      'type=module',
      `engines.node=>=24`,
      `skillet.skillDir=${config.skillDirs[0]}`,
      `bin.${config.name}=./bin/cli.js`,
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

    spinner.succeed('Seasoning done');

    // Step 4: Write bin/cli.js
    spinner.start('Plating bin/cli.js…');
    const binDir = path.join(process.cwd(), 'bin');
    await fsp.mkdir(binDir, { recursive: true });
    const binPath = path.join(binDir, 'cli.js');
    await fsp.writeFile(binPath, buildBinCliJs(config.skillDirs[0]), 'utf8');

    // Step 5: chmod 755
    await fsp.chmod(binPath, 0o755);
    spinner.succeed('Plating done');

    // Step 6: npm install @skillet-cli/core
    spinner.start('Firing up @skillet-cli/core install…');
    const installResult = spawnSync('npm install @skillet-cli/core', [], {
      stdio: 'inherit',
      shell: true,
    });
    if (installResult.status !== 0) {
      throw new Error(
        `npm install @skillet-cli/core exited with code ${installResult.status ?? 'null'}`,
      );
    }
    spinner.succeed('Firing up done');
  } catch (err) {
    spinner.fail('Setup failed');
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error during setup: ${message}\n`);
    process.exit(1);
  }
}

function deriveSlug(skillDir: string): string {
  return path.basename(skillDir.replace(/\/$/, ''));
}

export async function executeBatchScaffold(config: WizardConfig): Promise<void> {
  const spinner = createSpinner();

  try {
    for (const skillDir of config.skillDirs) {
      const slug = deriveSlug(skillDir);
      const distPkgDir = path.join(process.cwd(), 'dist', slug);
      const binDir = path.join(distPkgDir, 'bin');

      spinner.start(`Creating dist/${slug}/…`);

      await fsp.mkdir(binDir, { recursive: true });

      const pkgJson: Record<string, unknown> = {
        name: slug,
        version: config.version,
        description: config.description,
        author: config.author,
        license: config.license,
        type: 'module',
        engines: { node: '>=24' },
        skillet: { skillDir },
        bin: { [slug]: './bin/cli.js' },
      };
      if (config.repositoryUrl) {
        pkgJson.repository = { type: 'git', url: config.repositoryUrl };
      }

      await fsp.writeFile(
        path.join(distPkgDir, 'package.json'),
        JSON.stringify(pkgJson, null, 2),
        'utf8',
      );

      const binPath = path.join(binDir, 'cli.js');
      // buildBinCliJs embeds the arg as `new URL('../<arg>', import.meta.url)`.
      // From dist/<slug>/bin/cli.js: '../' goes to dist/<slug>/, '../../' to
      // dist/, '../../../' to repo root. Batch packages are always at dist/<slug>/
      // (depth 2), so '../../<skillDir>' always resolves to the repo-root-relative path.
      await fsp.writeFile(binPath, buildBinCliJs(`../../${skillDir}`), 'utf8');
      await fsp.chmod(binPath, 0o755);

      spinner.succeed(`Created dist/${slug}/`);
    }

    spinner.start('Installing @skillet-cli/core…');
    const installResult = spawnSync('npm install @skillet-cli/core', [], {
      stdio: 'inherit',
      shell: true,
    });
    if (installResult.status !== 0) {
      throw new Error(
        `npm install @skillet-cli/core exited with code ${installResult.status ?? 'null'}`,
      );
    }
    spinner.succeed('Installation done');
  } catch (err) {
    spinner.fail('Batch setup failed');
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error during batch setup: ${message}\n`);
    process.exit(1);
  }
}
