import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WizardConfig } from '../../src/prompts.js';
import { executeScaffold } from '../../src/scaffold.js';
import type { Sandbox } from '../helpers/sandbox.js';
import { createSandbox } from '../helpers/sandbox.js';

const baseConfig: WizardConfig = {
  name: 'my-skill',
  version: '1.0.0',
  description: 'A test skill',
  author: 'Test Author',
  repositoryUrl: '',
  license: 'MIT',
  skillDir: 'skill/',
  isMultiSkill: false,
  skillsParentDirs: [],
  removePrivate: false,
};

describe('executeScaffold — integration (filesystem)', () => {
  let sandbox: Sandbox;
  let originalCwd: string;

  beforeEach(async () => {
    sandbox = await createSandbox();
    originalCwd = process.cwd();
    process.chdir(sandbox.dir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await sandbox.cleanup();
  });

  it('writes bin/cli.js that calls run({ pkg }) with no skillDir argument', async () => {
    // Create a package.json so npm init is skipped
    await fsp.writeFile(
      path.join(sandbox.dir, 'package.json'),
      JSON.stringify({ name: 'my-skill', version: '1.0.0' }),
    );

    await executeScaffold({ ...baseConfig, skillDir: 'skill/' });

    const binPath = path.join(sandbox.dir, 'bin', 'cli.js');
    const content = await fsp.readFile(binPath, 'utf8');
    expect(content).toContain('run({ pkg })');
    expect(content).not.toContain('skillDir');
    expect(content).not.toContain('fileURLToPath');
    expect(content).not.toContain('new URL');
  }, 90_000);

  it.skipIf(process.platform === 'win32')('bin/cli.js has execute bits set', async () => {
    await fsp.writeFile(
      path.join(sandbox.dir, 'package.json'),
      JSON.stringify({ name: 'my-skill', version: '1.0.0' }),
    );

    await executeScaffold({ ...baseConfig, skillDir: 'skill/' });

    const binPath = path.join(sandbox.dir, 'bin', 'cli.js');
    const stat = await fsp.stat(binPath);
    // Check execute bits (owner, group, other)
    expect((stat.mode & 0o111) !== 0).toBe(true);
  });
});
