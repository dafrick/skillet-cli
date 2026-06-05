import { createSpinner } from '@skillet-cli/ui';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('createSpinner (TTY)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls process.stdout.write when start and succeed are called', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const spinner = createSpinner(true);
    spinner.start('label');
    spinner.succeed('done');
    expect(writeSpy).toHaveBeenCalled();
  });

  it('start writes spinner char and label', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const spinner = createSpinner(true);
    spinner.start('my-label');
    expect(writes.some((w) => w.includes('my-label'))).toBe(true);
  });

  it('succeed clears the line and writes success indicator', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const spinner = createSpinner(true);
    spinner.start('working');
    spinner.succeed('done');
    // Should have emitted ANSI clear line sequence after start
    const allOutput = writes.join('');
    expect(allOutput).toContain('done');
    expect(allOutput).toContain('\x1b[');
  });

  it('fail writes failure indicator', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const spinner = createSpinner(true);
    spinner.start('working');
    spinner.fail('oops');
    const allOutput = writes.join('');
    expect(allOutput).toContain('oops');
  });
});

describe('createSpinner (non-TTY)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('succeed writes label followed by newline', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const spinner = createSpinner(false);
    spinner.succeed('done');
    expect(writes).toContain('done\n');
  });

  it('succeed output does not contain ANSI escape codes', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const spinner = createSpinner(false);
    spinner.succeed('done');
    const allOutput = writes.join('');
    expect(allOutput).not.toContain('\x1b[');
  });

  it('start is a no-op (no output)', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const spinner = createSpinner(false);
    spinner.start('label');
    expect(writes.length).toBe(0);
  });

  it('fail writes label followed by newline', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const spinner = createSpinner(false);
    spinner.fail('error');
    expect(writes).toContain('error\n');
  });
});
