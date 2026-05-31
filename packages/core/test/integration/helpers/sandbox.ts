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
  // realpath resolves macOS symlinks (e.g. /var → /private/var) so that
  // sandbox paths match what process.cwd() returns after process.chdir().
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'skillet-')));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'project');

  await fs.mkdir(home, { recursive: true });
  await fs.mkdir(cwd, { recursive: true });

  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  const originalCwd = process.cwd();

  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.chdir(cwd);

  return {
    root,
    home,
    cwd,
    async [Symbol.asyncDispose]() {
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalUserProfile === undefined) {
        delete process.env.USERPROFILE;
      } else {
        process.env.USERPROFILE = originalUserProfile;
      }
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}
