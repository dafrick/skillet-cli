import { describe, it } from 'vitest';

const COMBINATIONS = [
  { adapterId: 'claude', scope: 'user', expectedSubdir: '.claude/skills' },
  { adapterId: 'claude', scope: 'project', expectedSubdir: '.claude/skills' },
  { adapterId: 'copilot', scope: 'user', expectedSubdir: '.copilot/skills' },
  { adapterId: 'copilot', scope: 'project', expectedSubdir: '.github/skills' },
  { adapterId: 'agents', scope: 'user', expectedSubdir: '.agents/skills' },
  { adapterId: 'agents', scope: 'project', expectedSubdir: '.agents/skills' },
] as const;

describe.each(COMBINATIONS)('install: $adapterId/$scope', ({
  adapterId: _adapterId,
  scope: _scope,
  expectedSubdir: _expectedSubdir,
}) => {
  it.todo('fresh install: correct files written to <expectedSubdir>/<skill-name>/');
  it.todo('fresh install: .skill-manifest.json contains all required fields with correct formats');
  it.todo('fresh install: postInstallHash matches re-hash of installed folder');
  it.todo('idempotent install: running twice produces no changes and exits successfully');
  it.todo('drift detection: detectDrift() returns "modified" after file edit');
  it.todo('drift detection: detectDrift() returns "pristine" for unmodified install');
  it.todo('drift detection: detectDrift() returns "unknown" when no .skill-manifest.json exists');
  it.todo('stale detection: isStale() returns true when source skill has changed');
  it.todo('stale detection: isStale() returns false when source matches stored contentHash');
  it.todo('update pristine+stale: overwrites silently without prompting');
  it.todo('update drifted + --force: overwrites without backup');
  it.todo('update drifted without --force (non-TTY): skips and reports the skip');
  it.todo('uninstall: removes installed directory');
  it.todo('uninstall: findExistingInstalls() returns empty for that adapter/scope');
  it.todo('hooks: beforeInstall is called before files are copied');
  it.todo('hooks: afterInstall is called after .skill-manifest.json is written');
  it.todo('hooks: both hooks receive correct arguments');
});
