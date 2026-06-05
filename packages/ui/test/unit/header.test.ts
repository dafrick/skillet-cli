import { afterEach, describe, expect, it, vi } from 'vitest';

function withTTY(isTTY: boolean): () => void {
  const originalIsTTY = process.stdout.isTTY;
  Object.defineProperty(process.stdout, 'isTTY', { value: isTTY, configurable: true });
  return () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
  };
}

describe('renderFullHeader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('contains attributionLine text in TTY mode', async () => {
    const restore = withTTY(true);
    vi.stubEnv('CI', '');
    vi.resetModules();
    try {
      const { renderFullHeader } = await import('@skillet-cli/ui');
      const result = renderFullHeader({ wordmark: 'W', tagline: 'T', attributionLine: 'A' });
      expect(result).toContain('A');
    } finally {
      restore();
    }
  });

  it('returns empty string when CI is set', async () => {
    const restore = withTTY(true);
    vi.stubEnv('CI', 'true');
    vi.resetModules();
    try {
      const { renderFullHeader } = await import('@skillet-cli/ui');
      const result = renderFullHeader({ wordmark: 'W', tagline: 'T', attributionLine: 'A' });
      expect(result).toBe('');
    } finally {
      restore();
    }
  });

  it('returns empty string when not TTY', async () => {
    const restore = withTTY(false);
    vi.stubEnv('CI', '');
    vi.resetModules();
    try {
      const { renderFullHeader } = await import('@skillet-cli/ui');
      const result = renderFullHeader({ wordmark: 'W', tagline: 'T', attributionLine: 'A' });
      expect(result).toBe('');
    } finally {
      restore();
    }
  });

  it('contains wordmark in TTY mode', async () => {
    const restore = withTTY(true);
    vi.stubEnv('CI', '');
    vi.resetModules();
    try {
      const { renderFullHeader } = await import('@skillet-cli/ui');
      const result = renderFullHeader({ wordmark: 'MYWM', tagline: 'T', attributionLine: 'ATTR' });
      expect(result).toContain('MYWM');
    } finally {
      restore();
    }
  });
});

describe('renderLightHeader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('contains attributionLine text in TTY mode', async () => {
    const restore = withTTY(true);
    vi.stubEnv('CI', '');
    vi.resetModules();
    try {
      const { renderLightHeader } = await import('@skillet-cli/ui');
      const result = renderLightHeader({ displayName: 'D', tagline: 'T', attributionLine: 'X' });
      expect(result).toContain('X');
    } finally {
      restore();
    }
  });

  it('contains displayName in TTY mode', async () => {
    const restore = withTTY(true);
    vi.stubEnv('CI', '');
    vi.resetModules();
    try {
      const { renderLightHeader } = await import('@skillet-cli/ui');
      const result = renderLightHeader({
        displayName: 'MY-TOOL',
        tagline: 'T',
        attributionLine: 'X',
      });
      expect(result).toContain('MY-TOOL');
    } finally {
      restore();
    }
  });

  it('contains optional tagline when provided', async () => {
    const restore = withTTY(true);
    vi.stubEnv('CI', '');
    vi.resetModules();
    try {
      const { renderLightHeader } = await import('@skillet-cli/ui');
      const result = renderLightHeader({
        displayName: 'D',
        tagline: 'A tagline here',
        attributionLine: 'X',
      });
      expect(result).toContain('A tagline here');
    } finally {
      restore();
    }
  });

  it('does not crash when tagline is omitted', async () => {
    const restore = withTTY(true);
    vi.stubEnv('CI', '');
    vi.resetModules();
    try {
      const { renderLightHeader } = await import('@skillet-cli/ui');
      expect(() => renderLightHeader({ displayName: 'D', attributionLine: 'X' })).not.toThrow();
    } finally {
      restore();
    }
  });

  it('returns empty string when CI is set', async () => {
    const restore = withTTY(true);
    vi.stubEnv('CI', 'true');
    vi.resetModules();
    try {
      const { renderLightHeader } = await import('@skillet-cli/ui');
      const result = renderLightHeader({ displayName: 'D', attributionLine: 'X' });
      expect(result).toBe('');
    } finally {
      restore();
    }
  });

  it('returns empty string when not TTY', async () => {
    const restore = withTTY(false);
    vi.stubEnv('CI', '');
    vi.resetModules();
    try {
      const { renderLightHeader } = await import('@skillet-cli/ui');
      const result = renderLightHeader({ displayName: 'D', attributionLine: 'X' });
      expect(result).toBe('');
    } finally {
      restore();
    }
  });
});
