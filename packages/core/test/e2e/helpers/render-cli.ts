import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from 'cli-testing-library';
import { createSandbox, type Sandbox } from '../../integration/helpers/sandbox.js';

// Resolved at import time — before any process.chdir() can affect it.
// This file lives at test/e2e/helpers/; three levels up is packages/core/.
const CLI_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../bin/cli.js');

export interface RenderCliResult {
  sandbox: Sandbox;
  cli: Awaited<ReturnType<typeof render>>;
  [Symbol.asyncDispose](): Promise<void>;
}

export async function renderCli(
  args: string[],
  sandboxOpts?: { extraEnv?: Record<string, string> },
): Promise<RenderCliResult> {
  const sandbox = await createSandbox();
  try {
    const cli = await render('node', [CLI_PATH, ...args], {
      cwd: sandbox.cwd,
      spawnOpts: {
        env: {
          ...process.env,
          HOME: sandbox.home,
          USERPROFILE: sandbox.home,
          ...sandboxOpts?.extraEnv,
        },
      },
    });

    return {
      sandbox,
      cli,
      [Symbol.asyncDispose]: () => sandbox[Symbol.asyncDispose](),
    };
  } catch (err) {
    await sandbox[Symbol.asyncDispose]();
    throw err;
  }
}
