import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Scope } from '../types.js';
import type { Adapter, Context, NormalizedSkillBase } from './types.js';

export const codexAdapter: Adapter = {
  id: 'codex',
  label: 'Codex CLI',

  detect(ctx: Omit<Context, 'scope'>) {
    const scopes: Scope[] = [];
    if (fs.existsSync(path.join(ctx.home, '.codex'))) {
      scopes.push('user');
    }
    if (fs.existsSync(path.join(ctx.cwd, '.codex', 'config.toml'))) {
      scopes.push('project');
    }
    return { scopes };
  },

  supportsScope(_scope: Scope): boolean {
    return true;
  },

  resolveInstallPath(skill: NormalizedSkillBase, ctx: Context): string {
    if (ctx.scope === 'user') {
      return path.join(ctx.home, '.agents', 'skills', skill.name);
    }
    return path.join(ctx.cwd, '.agents', 'skills', skill.name);
  },

  render(skill: NormalizedSkillBase, _ctx: Context): string {
    return skill.sourceDir;
  },

  installNote(scope: Scope): string | undefined {
    if (scope === 'user') {
      return 'installs to ~/.agents/skills/ — also available to any generic agents environment';
    }
    return undefined;
  },
};
