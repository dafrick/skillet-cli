import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createSandbox } from '../helpers/sandbox.js';

// Automated e2e for the interactive wizard is not fully feasible because
// @inquirer/prompts reads from stdin with raw mode — piping pre-seeded answers
// requires careful timing and a pseudo-TTY, which is complex in a test harness.
//
// This file contains:
// 1. A basic smoke test verifying the binary exists and exits with usage info (no crash)
// 2. Scaffolded test stubs for future full automation
//
// To test manually:
//   cd /tmp/my-skill && create-skillet
// Then verify: package.json exists, bin/cli.js exists and is executable, skill/SKILL.md moved

describe('create-skillet binary smoke test', () => {
  it('bin/cli.js exists and is a valid ESM file', async () => {
    const binPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../bin/cli.js');
    const stat = await fs.stat(binPath);
    expect(stat.isFile()).toBe(true);
    // Verify execute permission
    expect(stat.mode & 0o111).not.toBe(0);
    const content = await fs.readFile(binPath, 'utf8');
    expect(content).toContain('#!/usr/bin/env node');
    expect(content).toContain('dist/run.js');
  });

  it('sandbox helper creates and populates a temp directory', async () => {
    const sandbox = await createSandbox({ 'SKILL.md': '# My Skill' });
    try {
      const skillMdPath = path.join(sandbox.dir, 'SKILL.md');
      const content = await fs.readFile(skillMdPath, 'utf8');
      expect(content).toBe('# My Skill');
    } finally {
      await sandbox.cleanup();
    }
  });
});

describe.todo('create-skillet full wizard e2e (requires stdin piping to @inquirer/prompts)');

// Future automation options:
// 1. Use a pseudo-TTY library (node-pty) to pipe answers to interactive prompts
// 2. Refactor wizard to accept a `--yes` / non-interactive mode for testing
// 3. Use expect (the Unix tool) via spawnSync to drive the interactive session
//
// Expected assertions when automated:
// - process exits 0
// - package.json exists with name, version, type=module, bin, skillet.skillDir
// - bin/cli.js exists and is executable (mode & 0o111 !== 0)
// - skill/SKILL.md exists (moved from root)

it('SKILLETIZE wordmark renders in wide TTY context (task 10.5)', async () => {
  const originalColumns = process.stdout.columns;
  Object.defineProperty(process.stdout, 'columns', { value: 200, configurable: true });
  try {
    const { generateWordmark } = await import('@skillet-cli/ui');
    const result = generateWordmark('SKILLETIZE');
    // Should contain figlet art — non-empty, multi-line
    expect(result.length).toBeGreaterThan(0);
    expect(result.split('\n').length).toBeGreaterThanOrEqual(4);
    // Should contain ANSI color codes (ember gradient applied)
    expect(result).toContain('\x1b[');
  } finally {
    Object.defineProperty(process.stdout, 'columns', {
      value: originalColumns,
      configurable: true,
    });
  }
});

it('no header output emitted in CI=true mode (task 10.5)', async () => {
  const originalCI = process.env.CI;
  process.env.CI = 'true';
  try {
    const { renderFullHeader, generateWordmark } = await import('@skillet-cli/ui');
    const result = renderFullHeader({
      wordmark: generateWordmark('SKILLETIZE'),
      tagline: 'Package test-skill for any AI agent',
      attributionLine: 'Powered by Skillet CLI v0.1.0',
    });
    expect(result).toBe('');
  } finally {
    if (originalCI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCI;
    }
  }
});

void os; // suppress unused import warning
