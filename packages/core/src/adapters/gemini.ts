import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Scope } from '../types.js';
import type { Adapter, Context, NormalizedSkillBase } from './types.js';

export const geminiAdapter: Adapter = {
  id: 'gemini',
  label: 'Gemini CLI',

  detect(ctx: Omit<Context, 'scope'>) {
    const scopes: Scope[] = [];
    if (fs.existsSync(path.join(ctx.home, '.gemini'))) {
      scopes.push('user');
    }
    if (fs.existsSync(path.join(ctx.cwd, '.gemini'))) {
      scopes.push('project');
    }
    return { scopes };
  },

  supportsScope(_scope: Scope): boolean {
    return true;
  },

  resolveInstallPath(skill: NormalizedSkillBase, ctx: Context): string {
    if (ctx.scope === 'user') {
      return path.join(ctx.home, '.gemini', 'skills', skill.name);
    }
    return path.join(ctx.cwd, '.gemini', 'skills', skill.name);
  },

  render(skill: NormalizedSkillBase, _ctx: Context): string {
    return skill.sourceDir;
  },
};
