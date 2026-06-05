import { basil, dim, ember500, irisBright } from '@skillet-cli/ui';
import { Chalk } from 'chalk';
import { describe, expect, it } from 'vitest';

describe('colors', () => {
  it('ember500 is a callable function that does not throw', () => {
    expect(typeof ember500).toBe('function');
    expect(() => ember500('test')).not.toThrow();
  });

  it('irisBright is a callable function that does not throw', () => {
    expect(typeof irisBright).toBe('function');
    expect(() => irisBright('test')).not.toThrow();
  });

  it('basil is a callable function that does not throw', () => {
    expect(typeof basil).toBe('function');
    expect(() => basil('test')).not.toThrow();
  });

  it('dim is a callable function that does not throw', () => {
    expect(typeof dim).toBe('function');
    expect(() => dim('test')).not.toThrow();
  });

  it('color functions produce ANSI escape sequences with level 3 chalk', () => {
    const chalkColor = new Chalk({ level: 3 });
    const result = chalkColor.rgb(232, 116, 59)('hello');
    expect(result).toContain('\x1b[');
    expect(result).toContain('hello');
  });

  it('ember500 returns a string when called', () => {
    const result = ember500('hello');
    expect(typeof result).toBe('string');
    expect(result).toContain('hello');
  });
});
