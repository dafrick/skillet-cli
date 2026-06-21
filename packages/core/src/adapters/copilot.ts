import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Scope } from '../types.js';
import type { Adapter, Context, NormalizedSkill } from './types.js';

export const copilotAdapter: Adapter = {
  id: 'copilot',
  label: 'GitHub Copilot',

  detect(ctx: Omit<Context, 'scope'>) {
    const scopes: Scope[] = [];
    if (fs.existsSync(path.join(ctx.home, '.copilot'))) {
      scopes.push('user');
    }
    if (fs.existsSync(path.join(ctx.cwd, '.github'))) {
      scopes.push('project');
    }
    return { scopes };
  },

  supportsScope(_scope: Scope): boolean {
    return true;
  },

  resolveInstallPath(skill: NormalizedSkill, ctx: Context): string {
    if (ctx.scope === 'user') {
      return path.join(ctx.home, '.copilot', 'skills', skill.name);
    }
    return path.join(ctx.cwd, '.github', 'skills', skill.name);
  },

  render(skill: NormalizedSkill, _ctx: Context): string {
    return skill.sourceDir;
  },
};
