import { render } from 'cli-testing-library';
import { afterEach } from 'vitest';
import { createSandbox, type Sandbox } from '../../integration/helpers/sandbox.js';

export interface RenderCliResult {
  sandbox: Sandbox;
  cli: Awaited<ReturnType<typeof render>>;
}

export async function renderCli(
  args: string[],
  sandboxOpts?: { extraEnv?: Record<string, string> },
): Promise<RenderCliResult> {
  const sandbox = await createSandbox();

  const cli = await render('node', ['bin/cli.js', ...args], {
    env: {
      ...process.env,
      HOME: sandbox.home,
      USERPROFILE: sandbox.home,
      ...sandboxOpts?.extraEnv,
    },
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
  });

  return { sandbox, cli };
}
