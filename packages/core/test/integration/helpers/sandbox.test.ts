import * as fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSandbox, type Sandbox } from './sandbox.js';

describe('createSandbox', () => {
  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  const originalCwd = process.cwd();
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await sandbox[Symbol.asyncDispose]();
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
    expect(sandbox.home).not.toBe(originalHome);
    expect(sandbox.home).toContain('skillet-');
  });

  it('cleanup deletes the root directory', async () => {
    const root = sandbox.root;
    await sandbox[Symbol.asyncDispose]();
    await expect(fs.stat(root)).rejects.toThrow();
  });

  it('cleanup restores process.env.HOME', async () => {
    expect(process.env.HOME).toBe(sandbox.home);
    await sandbox[Symbol.asyncDispose]();
    expect(process.env.HOME).toBe(originalHome);
  });

  it('cleanup restores process.env.USERPROFILE', async () => {
    expect(process.env.USERPROFILE).toBe(sandbox.home);
    await sandbox[Symbol.asyncDispose]();
    expect(process.env.USERPROFILE).toBe(originalUserProfile);
  });

  it('cleanup restores process.cwd()', async () => {
    expect(process.cwd()).toBe(sandbox.cwd);
    await sandbox[Symbol.asyncDispose]();
    expect(process.cwd()).toBe(originalCwd);
  });
});
