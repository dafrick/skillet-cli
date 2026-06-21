import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Scope } from '../types.js';
import type { Adapter, Context, NormalizedSkill } from './types.js';

export const claudeAdapter: Adapter = {
  id: 'claude',
  label: 'Claude Code',

  detect(ctx: Omit<Context, 'scope'>) {
    const scopes: Scope[] = [];
    if (fs.existsSync(path.join(ctx.home, '.claude'))) {
      scopes.push('user');
    }
    if (fs.existsSync(path.join(ctx.cwd, '.claude'))) {
      scopes.push('project');
    }
    return { scopes };
  },

  supportsScope(_scope: Scope): boolean {
    return true;
  },

  resolveInstallPath(skill: NormalizedSkill, ctx: Context): string {
    if (ctx.scope === 'user') {
      return path.join(ctx.home, '.claude', 'skills', skill.name);
    }
    return path.join(ctx.cwd, '.claude', 'skills', skill.name);
  },

  render(skill: NormalizedSkill, _ctx: Context): string {
    return skill.sourceDir;
  },
};
