import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface Sandbox {
  root: string;
  home: string;
  cwd: string;
  [Symbol.asyncDispose](): Promise<void>;
}

export async function createSandbox(): Promise<Sandbox> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'skillet-'));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'project');

  await fs.mkdir(home, { recursive: true });
  await fs.mkdir(cwd, { recursive: true });

  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.chdir(cwd);

  return {
    root,
    home,
    cwd,
    async [Symbol.asyncDispose]() {
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}
