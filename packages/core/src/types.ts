export type Scope = 'user' | 'project';

export interface SkilletPackageJson {
  skills?: string | string[];
  [key: string]: unknown;
}

export interface SkillManifest {
  name: string;
  description: string;
  source: string;
  declaredVersion: string | undefined;
  contentHash: string;
  renderHash: string;
  adapterId: string;
  scope: Scope;
  libVersion: string;
  installedAt: string;
  postInstallHash: string;
  requestedBy: string[];
}
