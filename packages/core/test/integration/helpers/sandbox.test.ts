import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSandbox, type Sandbox } from './sandbox.js';

describe('createSandbox', () => {
  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalUserProfile;
  });

  it('creates the root directory', async () => {
    const stat = await fs.stat(sandbox.root);
    expect(stat.isDirectory()).toBe(true);
  });

  it('creates home/ and project/ subdirectories', async () => {
    const homeStat = await fs.stat(sandbox.home);
    const cwdStat = await fs.stat(sandbox.cwd);
    expect(homeStat.isDirectory()).toBe(true);
    expect(cwdStat.isDirectory()).toBe(true);
  });

  it('sets process.env.HOME to sandbox home', () => {
    expect(process.env.HOME).toBe(sandbox.home);
  });

  it('sandbox home is not the real home directory', () => {
    const realHome = os.tmpdir();
    expect(sandbox.home).not.toBe(realHome);
    expect(sandbox.home).toContain('skillet-');
  });

  it('cleanup deletes the root directory', async () => {
    const root = sandbox.root;
    await sandbox[Symbol.asyncDispose]();
    await expect(fs.stat(root)).rejects.toThrow();
  });
});
