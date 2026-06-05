import { afterEach, describe, expect, it, vi } from 'vitest';

describe('deriveDisplayName', () => {
  it("strips @scope/ prefix: '@skillet-cli/core' → 'CORE'", async () => {
    const { deriveDisplayName } = await import('@skillet-cli/ui');
    expect(deriveDisplayName('@skillet-cli/core')).toBe('CORE');
  });

  it("handles plain name: 'create-skillet' → 'CREATE-SKILLET'", async () => {
    const { deriveDisplayName } = await import('@skillet-cli/ui');
    expect(deriveDisplayName('create-skillet')).toBe('CREATE-SKILLET');
  });
});

describe('generateWordmark', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns plain ember-bold string when terminal is too narrow for figlet art', async () => {
    vi.unstubAllEnvs();
    const originalColumns = process.stdout.columns;
    Object.defineProperty(process.stdout, 'columns', { value: 10, configurable: true });
    try {
      vi.resetModules();
      const { generateWordmark } = await import('@skillet-cli/ui');
      const result = generateWordmark('CORE');
      // Should not contain figlet box-drawing characters (art doesn't fit)
      expect(result).not.toMatch(/[█╗╔═╝╚║]/);
      // Should contain the name itself
      expect(result).toContain('CORE');
    } finally {
      Object.defineProperty(process.stdout, 'columns', {
        value: originalColumns,
        configurable: true,
      });
    }
  });

  it('returns string with ANSI color codes when terminal is wide enough', async () => {
    vi.unstubAllEnvs();
    const originalColumns = process.stdout.columns;
    Object.defineProperty(process.stdout, 'columns', { value: 200, configurable: true });
    try {
      vi.resetModules();
      const { generateWordmark } = await import('@skillet-cli/ui');
      const result = generateWordmark('CORE');
      expect(result).toContain('\x1b[');
    } finally {
      Object.defineProperty(process.stdout, 'columns', {
        value: originalColumns,
        configurable: true,
      });
    }
  });
});
