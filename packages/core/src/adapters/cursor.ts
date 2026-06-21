import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Scope } from '../types.js';
import type { Adapter, Context, NormalizedSkill } from './types.js';

export const cursorAdapter: Adapter = {
  id: 'cursor',
  label: 'Cursor',

  detect(ctx: Omit<Context, 'scope'>) {
    const scopes: Scope[] = [];
    if (fs.existsSync(path.join(ctx.cwd, '.cursor'))) {
      scopes.push('project');
    }
    return { scopes };
  },

  supportsScope(scope: Scope): boolean {
    return scope === 'project';
  },

  resolveInstallPath(skill: NormalizedSkill, ctx: Context): string {
    return path.join(ctx.cwd, '.cursor', 'rules', skill.name);
  },

  render(skill: NormalizedSkill, _ctx: Context): string {
    return skill.sourceDir;
  },

  async renderFile(skill: NormalizedSkill, _ctx: Context): Promise<string> {
    return `---\ndescription: ${skill.description}\nalwaysApply: false\n---\n${skill.body}`;
  },
};
