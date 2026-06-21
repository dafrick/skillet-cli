import type { NormalizedSkill } from '../normalize.js';
import type { Scope } from '../types.js';

export type { NormalizedSkill };

export interface Context {
  scope: Scope;
  cwd: string;
  home: string;
}

export interface DetectResult {
  scopes: Scope[];
}

export interface NormalizedSkillBase {
  name: string;
  sourceDir: string;
}

export interface Adapter {
  id: string;
  label: string;
  detect(ctx: Omit<Context, 'scope'>): DetectResult;
  supportsScope(scope: Scope): boolean;
  resolveInstallPath(skill: NormalizedSkill, ctx: Context): string;
  render(skill: NormalizedSkill, ctx: Context): string;
  renderFile?(skill: NormalizedSkill, ctx: Context): Promise<string>;
  installNote?(scope: Scope): string | undefined;
}
