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
  it('has ANSI Shadow pre-registered in figlet cache after module load', async () => {
    // Verifies the module pre-loads the font via figlet.parseFont at import time.
    // Without this, textSync throws ENOENT in bundled packages where figlet
    // cannot resolve its fonts/ directory (e.g., after `npx create-skillet`).
    vi.resetModules();
    // Import UI module first — this triggers parseFont('ANSI Shadow', ...) at module level
    await import('@skillet-cli/ui');
    // Import figlet from the same module registry so we see the same figFonts cache
    const { default: figletMod } = await import('figlet');
    // loadedFonts() returns Object.keys(figFonts) — fonts registered via parseFont
    expect((figletMod as unknown as { loadedFonts: () => string[] }).loadedFonts()).toContain(
      'ANSI Shadow',
    );
  });

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
