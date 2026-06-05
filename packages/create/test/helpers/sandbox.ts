import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface Sandbox {
  dir: string;
  cleanup(): Promise<void>;
}

export async function createSandbox(files?: Record<string, string | null>): Promise<Sandbox> {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'create-skillet-')));

  if (files) {
    for (const [filename, content] of Object.entries(files)) {
      const filepath = path.join(dir, filename);
      const dirname = path.dirname(filepath);
      await fs.mkdir(dirname, { recursive: true });
      if (content === null) {
        // create directory
        await fs.mkdir(filepath, { recursive: true });
      } else {
        await fs.writeFile(filepath, content, 'utf8');
      }
    }
  }

  return {
    dir,
    async cleanup() {
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
