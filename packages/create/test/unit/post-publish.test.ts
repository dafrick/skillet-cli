import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runPostPublish } from '../../src/run.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn(), readFileSync: vi.fn() };
});

const mockPkg = JSON.stringify({ name: 'my-skill', version: '1.1.0' });

describe('runPostPublish', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let fsModule: typeof import('node:fs');

  beforeEach(async () => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    fsModule = await import('node:fs');
    vi.mocked(fsModule.readFileSync).mockReturnValue(mockPkg);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('no manifests → no output', async () => {
    vi.mocked(fsModule.existsSync).mockReturnValue(false);
    await runPostPublish();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('claude plugin only → prints plugin marketplace confirmation', async () => {
    vi.mocked(fsModule.existsSync).mockImplementation((p) => {
      const str = String(p);
      return str.includes('.claude-plugin');
    });
    await runPostPublish();
    const output = writeSpy.mock.calls
      .map((c: Parameters<typeof process.stdout.write>) => c[0])
      .join('');
    expect(output).toContain('Plugin marketplace live at v1.1.0');
    expect(output).toContain('claude plugin install my-skill@my-skill');
    expect(output).toContain('copilot plugin install my-skill@my-skill');
    expect(output).not.toContain('Gemini:');
  });

  it('gemini only → prints Gemini release reminder', async () => {
    vi.mocked(fsModule.existsSync).mockImplementation((p) => {
      const str = String(p);
      return str.includes('gemini-extension.json');
    });
    await runPostPublish();
    const output = writeSpy.mock.calls
      .map((c: Parameters<typeof process.stdout.write>) => c[0])
      .join('');
    expect(output).toContain('Gemini:');
    expect(output).toContain('gh release create v1.1.0');
    expect(output).not.toContain('Plugin marketplace live');
  });

  it('both manifests → prints both sections', async () => {
    vi.mocked(fsModule.existsSync).mockReturnValue(true);
    await runPostPublish();
    const output = writeSpy.mock.calls
      .map((c: Parameters<typeof process.stdout.write>) => c[0])
      .join('');
    expect(output).toContain('Plugin marketplace live at v1.1.0');
    expect(output).toContain('claude plugin install my-skill@my-skill');
    expect(output).toContain('Gemini:');
    expect(output).toContain('gh release create v1.1.0');
  });

  it('gemini absent → no Gemini text', async () => {
    vi.mocked(fsModule.existsSync).mockImplementation((p) => {
      const str = String(p);
      return str.includes('.claude-plugin');
    });
    await runPostPublish();
    const output = writeSpy.mock.calls
      .map((c: Parameters<typeof process.stdout.write>) => c[0])
      .join('');
    expect(output).not.toContain('Gemini:');
  });

  it('no package.json → exits silently', async () => {
    vi.mocked(fsModule.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    await runPostPublish();
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
