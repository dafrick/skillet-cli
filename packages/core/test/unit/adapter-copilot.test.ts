import { describe, it } from 'vitest';

describe('copilotAdapter', () => {
  it.todo('detect() returns project scope when .github/ exists in cwd');
  it.todo('detect() returns user scope when ~/.copilot/ exists');
  it.todo('supportsScope("user") returns true');
  it.todo('supportsScope("project") returns true');
  it.todo('resolveInstallPath("project") returns .github/skills/<name>/ in cwd');
  it.todo('resolveInstallPath("user") returns ~/.copilot/skills/<name>/');
  it.todo('render() is passthrough');
});
