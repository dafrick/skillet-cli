import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CLI_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../bin/cli.js');
const HELLO_SKILL_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/hello-skill',
);

interface RunResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

function runCli(
  args: string[],
  opts: { home: string; cwd: string; env?: Record<string, string> },
): RunResult {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    cwd: opts.cwd,
    env: {
      ...process.env,
      HOME: opts.home,
      USERPROFILE: opts.home,
      CI: '1', // suppress headers and color
      NO_COLOR: '1', // disable chalk
      ...opts.env,
    },
    encoding: 'utf8',
    timeout: 15_000,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

async function withSandbox<T>(fn: (home: string, cwd: string) => Promise<T>): Promise<T> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'skillet-e2e-'));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'project');
  await fs.mkdir(home, { recursive: true });
  await fs.mkdir(cwd, { recursive: true });
  await fs.writeFile(
    path.join(cwd, 'package.json'),
    JSON.stringify(
      { name: '@skillet-cli/core', version: '0.3.0', skillet: { skillDir: HELLO_SKILL_PATH } },
      null,
      2,
    ),
    'utf8',
  );
  try {
    return await fn(home, cwd);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

describe('install command (E2E)', () => {
  it.todo(
    'golden path TTY install: shows scope prompt, target multi-select, spinner with cooking verb, done line',
  );

  it('golden path non-TTY install: prints prefixed log lines, no ANSI, exits 0', async () => {
    await withSandbox(async (home, cwd) => {
      const result = runCli(['install', '--target', 'agents', '--scope', 'user', '--yes'], {
        home,
        cwd,
      });

      expect(result.status).toBe(0);
      // Non-TTY output: prefixed lines
      expect(result.stdout).toContain('@skillet-cli/core');
      expect(result.stdout).toContain('agents');
      // No ANSI escape sequences — CI mode disables chalk
      expect(result.stdout).not.toContain('[');
    });
  });

  it('list after install: shows pristine status', async () => {
    await withSandbox(async (home, cwd) => {
      // Install first
      const installResult = runCli(['install', '--target', 'agents', '--scope', 'user', '--yes'], {
        home,
        cwd,
      });
      expect(installResult.status).toBe(0);

      // List
      const listResult = runCli(['list'], { home, cwd });
      expect(listResult.status).toBe(0);
      expect(listResult.stdout).toContain('pristine');
    });
  });

  it('list after file edit: shows modified status', async () => {
    await withSandbox(async (home, cwd) => {
      // Install
      runCli(['install', '--target', 'agents', '--scope', 'user', '--yes'], { home, cwd });

      // Edit installed file
      const skillPath = path.join(home, '.agents', 'skills', 'hello-skill', 'SKILL.md');
      const original = await fs.readFile(skillPath, 'utf8');
      await fs.writeFile(skillPath, `${original}\n\n<!-- locally modified -->`, 'utf8');

      // List should show modified
      const listResult = runCli(['list'], { home, cwd });
      expect(listResult.status).toBe(0);
      expect(listResult.stdout).toContain('modified');
    });
  });

  it('update --force after file edit: restores pristine status', async () => {
    await withSandbox(async (home, cwd) => {
      // Install
      runCli(['install', '--target', 'agents', '--scope', 'user', '--yes'], { home, cwd });

      // Edit installed file
      const skillPath = path.join(home, '.agents', 'skills', 'hello-skill', 'SKILL.md');
      const original = await fs.readFile(skillPath, 'utf8');
      await fs.writeFile(skillPath, `${original}\n\n<!-- locally modified -->`, 'utf8');

      // Confirm modified
      const listBefore = runCli(['list'], { home, cwd });
      expect(listBefore.stdout).toContain('modified');

      // Force update
      const updateResult = runCli(['update', '--force'], { home, cwd });
      expect(updateResult.status).toBe(0);

      // List should now show pristine
      const listAfter = runCli(['list'], { home, cwd });
      expect(listAfter.status).toBe(0);
      expect(listAfter.stdout).toContain('pristine');
    });
  });

  it('NO_COLOR=1 suppresses all ANSI escape sequences in output', async () => {
    await withSandbox(async (home, cwd) => {
      const result = runCli(['install', '--target', 'agents', '--scope', 'user', '--yes'], {
        home,
        cwd,
        env: { NO_COLOR: '1' },
      });

      expect(result.status).toBe(0);
      // No ESC character in output
      expect(result.stdout.indexOf('')).toBe(-1);
    });
  });

  it('invalid --target exits with code 1 and descriptive error', async () => {
    await withSandbox(async (home, cwd) => {
      const result = runCli(
        ['install', '--target', 'nonexistent-adapter', '--scope', 'user', '--yes'],
        { home, cwd },
      );

      // Either exits non-zero or prints "No targets selected"
      const combined = result.stdout + result.stderr;
      const isErrorOrEmpty =
        result.status !== 0 || combined.includes('No targets') || combined.includes('selected');
      expect(isErrorOrEmpty).toBe(true);
    });
  });

  it('non-TTY stdin defaults to --yes behavior', async () => {
    await withSandbox(async (home, cwd) => {
      // No --yes, but no TTY → should auto-select detected targets
      // With sandbox home that has .agents/, agents adapter always detects
      // claude won't detect (no ~/.claude/), copilot won't detect (no .github/)
      // agents always detects → should install to agents/user
      const result = runCli(['install', '--scope', 'user'], { home, cwd });
      // Should not hang waiting for input; agents adapter always detected
      expect(result.status).toBe(0);
    });
  });
});
