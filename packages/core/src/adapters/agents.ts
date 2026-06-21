import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Scope } from '../types.js';
import type { Adapter, Context, NormalizedSkill } from './types.js';

export const agentsAdapter: Adapter = {
  id: 'agents',
  label: 'Generic agents (.agents/)',

  detect(ctx: Omit<Context, 'scope'>) {
    const scopes: Scope[] = [];
    if (fs.existsSync(path.join(ctx.home, '.agents'))) {
      scopes.push('user');
    }
    if (fs.existsSync(path.join(ctx.cwd, '.agents'))) {
      scopes.push('project');
    }
    return { scopes };
  },

  supportsScope(_scope: Scope): boolean {
    return true;
  },

  resolveInstallPath(skill: NormalizedSkill, ctx: Context): string {
    if (ctx.scope === 'user') {
      return path.join(ctx.home, '.agents', 'skills', skill.name);
    }
    return path.join(ctx.cwd, '.agents', 'skills', skill.name);
  },

  render(skill: NormalizedSkill, _ctx: Context): string {
    return skill.sourceDir;
  },
};
