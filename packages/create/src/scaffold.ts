import { type StdioOptions, spawnSync } from 'node:child_process';
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
export function runSync(
  cmd: string,
  args: string[],
  stepName: string,
  stdioOverride?: StdioOptions,
): void {
  const cmdStr = [cmd, ...args.map((a) => `"${a}"`)].join(' ');
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

    // Step 4: Write bin/cli.js
    spinner.start('Plating bin/cli.js…');
    const binDir = path.join(process.cwd(), 'bin');
    await fsp.mkdir(binDir, { recursive: true });
    const binPath = path.join(binDir, 'cli.js');
    await fsp.writeFile(binPath, buildBinCliJs(), 'utf8');

    // Step 5: chmod 755
    await fsp.chmod(binPath, 0o755);

    // Write .npmignore to exclude nested node_modules from the published tarball.
    // npm's built-in node_modules exclusion only covers the package root; skill
    // subdirectories listed in "files" carry their own node_modules otherwise.
    const npmignorePath = path.join(process.cwd(), '.npmignore');
    await fsp.writeFile(npmignorePath, '**/node_modules\n', 'utf8');

    spinner.succeed('Plating done');

    // Step 6: npm install @skillet-cli/core + create-skillet (devDep)
    process.stdout.write(
      'Installing @skillet-cli/core (this may take a few minutes on first run)…\n',
    );
    const installResult = spawnSync('npm install @skillet-cli/core@latest', [], {
      stdio: 'inherit',
      shell: true,
    });
    if (installResult.status !== 0) {
      throw new Error(
        `npm install @skillet-cli/core exited with code ${installResult.status ?? 'null'}`,
      );
    }
    const devInstallResult = spawnSync('npm install --save-dev create-skillet@latest', [], {
      stdio: 'inherit',
      shell: true,
    });
    if (devInstallResult.status !== 0) {
      throw new Error(
        `npm install create-skillet exited with code ${devInstallResult.status ?? 'null'}`,
      );
    }
    process.stdout.write('Install complete.\n');
  } catch (err) {
    spinner.fail('Setup failed');
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error during setup: ${message}\n`);
    process.exit(1);
  }
}
