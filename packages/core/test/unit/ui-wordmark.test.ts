import { afterEach, describe, expect, it, vi } from 'vitest';

describe('deriveDisplayName', () => {
  it('uppercases a plain name with no scope', async () => {
    const { deriveDisplayName } = await import('../../src/ui/wordmark.js');
    expect(deriveDisplayName('my-skill')).toBe('MY-SKILL');
  });

  it('strips @scope/ prefix from a scoped package name', async () => {
    const { deriveDisplayName } = await import('../../src/ui/wordmark.js');
    expect(deriveDisplayName('@acme/code-reviewer')).toBe('CODE-REVIEWER');
  });

  it("handles skillet's own scoped name", async () => {
    const { deriveDisplayName } = await import('../../src/ui/wordmark.js');
    expect(deriveDisplayName('@skillet-cli/core')).toBe('CORE');
  });

  it('keeps already-uppercase name unchanged', async () => {
    const { deriveDisplayName } = await import('../../src/ui/wordmark.js');
    expect(deriveDisplayName('MY-SKILL')).toBe('MY-SKILL');
  });

  it('handles single-character after scope', async () => {
    const { deriveDisplayName } = await import('../../src/ui/wordmark.js');
    expect(deriveDisplayName('@acme/x')).toBe('X');
  });
});

describe('generateWordmark', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns non-empty output for a short name in TTY context', async () => {
    vi.stubEnv('NO_COLOR', '');
    Object.defineProperty(process.stdout, 'columns', { value: 200, configurable: true });
    vi.resetModules();
    const { generateWordmark } = await import('../../src/ui/wordmark.js');
    const result = generateWordmark('SKILL');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains ANSI escape codes when NO_COLOR is not set', async () => {
    vi.unstubAllEnvs();
    Object.defineProperty(process.stdout, 'columns', { value: 200, configurable: true });
    vi.resetModules();
    const { generateWordmark } = await import('../../src/ui/wordmark.js');
    const result = generateWordmark('SKILL');
    expect(result).toContain('\x1b[');
  });

  it('returns plain text (no figlet rows) when name exceeds terminal width', async () => {
    vi.unstubAllEnvs();
    Object.defineProperty(process.stdout, 'columns', { value: 1, configurable: true });
    vi.resetModules();
    const { generateWordmark } = await import('../../src/ui/wordmark.js');
    const result = generateWordmark('AVERYLONGNAME');
    // Should not contain figlet box-drawing characters
    expect(result).not.toMatch(/[█╗╔═╝╚║]/);
  });

  it('contains no ANSI codes when NO_COLOR is set', async () => {
    vi.stubEnv('NO_COLOR', '1');
    Object.defineProperty(process.stdout, 'columns', { value: 200, configurable: true });
    vi.resetModules();
    const { generateWordmark } = await import('../../src/ui/wordmark.js');
    const result = generateWordmark('SKILL');
    expect(result).not.toContain('\x1b[');
  });
});

describe('ui/wordmark', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns a non-empty multi-line string with ANSI codes when process.stdout.isTTY is true', async () => {
    // Stub isTTY via module re-import with mocked process.stdout
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    vi.stubEnv('CI', '');

    try {
      vi.resetModules();
      const { renderWordmark } = await import('../../src/ui/wordmark.js');
      const result = renderWordmark();

      expect(result.length).toBeGreaterThan(0);
      // Should have multiple lines
      expect(result.split('\n').length).toBeGreaterThanOrEqual(6);
      // Should contain ANSI escape sequences (chalk color codes)
      expect(result).toContain('\x1b[');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }
  });

  it('returns an empty string when process.stdout.isTTY is false', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });

    try {
      vi.resetModules();
      const { renderWordmark } = await import('../../src/ui/wordmark.js');
      const result = renderWordmark();
      expect(result).toBe('');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }
  });
});
