import { describe, expect, it } from 'vitest';
import type { Adapter } from '../../src/adapters/registry.js';
import { createRegistry, registerAdapter, registry } from '../../src/adapters/registry.js';

function makeAdapter(id: string): Adapter {
  return {
    id,
    label: `Adapter ${id}`,
    detect: () => ({ scopes: [] }),
    supportsScope: () => true,
    resolveInstallPath: (skill, ctx) => `/${ctx.scope}/${skill.name}`,
    render: (skill) => skill.sourceDir,
  };
}

describe('registry', () => {
  it('register() adds an adapter', () => {
    const reg = createRegistry();
    const adapter = makeAdapter('test-add');
    reg.register(adapter);
    expect(reg.get('test-add')).toBe(adapter);
  });

  it('get(id) returns the registered adapter', () => {
    const reg = createRegistry();
    const adapter = makeAdapter('test-get');
    reg.register(adapter);
    expect(reg.get('test-get')).toBe(adapter);
    expect(reg.get('nonexistent')).toBeUndefined();
  });

  it('list() returns all registered adapters', () => {
    const reg = createRegistry();
    const a1 = makeAdapter('list-a');
    const a2 = makeAdapter('list-b');
    reg.register(a1);
    reg.register(a2);
    const result = reg.list();
    expect(result).toHaveLength(2);
    expect(result).toContain(a1);
    expect(result).toContain(a2);
  });

  it('registering a duplicate id throws', () => {
    const reg = createRegistry();
    reg.register(makeAdapter('dupe'));
    expect(() => reg.register(makeAdapter('dupe'))).toThrow(
      'Adapter with id "dupe" is already registered',
    );
  });

  it('registerAdapter is an alias for registry.register', () => {
    // registerAdapter delegates to the module-level registry singleton
    // Verify calling it registers into the singleton registry
    const id = `alias-test-${Math.random().toString(36).slice(2)}`;
    const adapter = makeAdapter(id);
    registerAdapter(adapter);
    expect(registry.get(id)).toBe(adapter);
  });
});

describe('default registry includes built-in adapters', () => {
  it('registry.list() includes gemini adapter after package import', async () => {
    await import('../../src/adapters/index.js');
    const ids = registry.list().map((a) => a.id);
    expect(ids).toContain('gemini');
  });
});
