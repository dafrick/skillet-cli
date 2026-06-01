import { describe, expect, it } from 'vitest';
import { pickStandardVerb, pickVerb } from '../../src/ui/verbs.js';

const INSTALL_ACTIVE_POOL = [
  'Searing into',
  'Baking into',
  'Frying into',
  'Grilling into',
  'Roasting into',
];
const INSTALL_DONE_POOL = ['Seared', 'Baked', 'Fried', 'Grilled', 'Roasted'];

describe('ui/verbs', () => {
  it('pickVerb("install") returns a pair from the install verb pool', () => {
    const pair = pickVerb('install', true);
    expect(INSTALL_ACTIVE_POOL).toContain(pair.active);
    expect(INSTALL_DONE_POOL).toContain(pair.done);
  });

  it('verbs are sentence-case when isTTY is true', () => {
    // Run multiple times to cover the random pool
    for (let i = 0; i < 20; i++) {
      const pair = pickVerb('install', true);
      // First character should be uppercase
      expect(pair.active[0]).toMatch(/[A-Z]/);
      expect(pair.done[0]).toMatch(/[A-Z]/);
    }
  });

  it('verbs are lowercase when isTTY is false', () => {
    // Run multiple times to cover the random pool
    for (let i = 0; i < 20; i++) {
      const pair = pickVerb('install', false);
      // Result should equal the lowercase of one of the pool entries
      expect(pair.active).toBe(pair.active.toLowerCase());
      expect(pair.done).toBe(pair.done.toLowerCase());
    }
  });
});

describe('pickStandardVerb', () => {
  it('install (TTY): returns Installing into / Installed', () => {
    const pair = pickStandardVerb('install', true);
    expect(pair).toEqual({ active: 'Installing into', done: 'Installed' });
  });

  it('update (TTY): returns Updating / Updated', () => {
    const pair = pickStandardVerb('update', true);
    expect(pair).toEqual({ active: 'Updating', done: 'Updated' });
  });

  it('uninstall (TTY): returns Removing / Removed', () => {
    const pair = pickStandardVerb('uninstall', true);
    expect(pair).toEqual({ active: 'Removing', done: 'Removed' });
  });

  it('detect (TTY): returns Detecting targets… / Found {n} target(s)', () => {
    const pair = pickStandardVerb('detect', true);
    expect(pair).toEqual({ active: 'Detecting targets…', done: 'Found {n} target(s)' });
  });

  it('non-TTY: active form is lowercased', () => {
    expect(pickStandardVerb('install', false).active).toBe('installing into');
    expect(pickStandardVerb('update', false).active).toBe('updating');
    expect(pickStandardVerb('uninstall', false).active).toBe('removing');
    expect(pickStandardVerb('detect', false).active).toBe('detecting targets…');
  });
});
