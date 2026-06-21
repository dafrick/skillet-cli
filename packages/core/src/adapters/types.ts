import type { Scope } from '../types.js';

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
  resolveInstallPath(skill: NormalizedSkillBase, ctx: Context): string;
  render(skill: NormalizedSkillBase, ctx: Context): string;
  installNote?(scope: Scope): string | undefined;
}
