import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DetectionResult {
  cwd: string;
  name: string;
  version: string;
  author: string;
  description: string;
  hasPackageJson: boolean;
  hasSkillMd: boolean;
  skillDir: string | null;
  repositoryUrl: string;
  gitUser: string;
}

/**
 * Convert a directory name into a valid kebab-case npm package name.
 * - Lowercase
 * - Replace spaces, underscores, dots with hyphens
 * - Strip characters not in [a-z0-9-]
 * - Collapse consecutive hyphens
 * - Strip leading/trailing hyphens
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s_.]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalize a git remote URL to git+https:// format.
 * Handles SSH (git@github.com:org/repo.git) and HTTPS variants.
 */
function normalizeGitUrl(rawUrl: string): string {
  let url = rawUrl.trim();

  // SSH format: git@github.com:org/repo.git → https://github.com/org/repo
  if (url.startsWith('git@')) {
    url = url.replace(/^git@([^:]+):/, 'https://$1/');
  }

  // Strip git+https:// prefix if already present so we can re-add it uniformly
  if (url.startsWith('git+https://')) {
    url = url.slice('git+'.length);
  }

  // Strip .git suffix
  if (url.endsWith('.git')) {
    url = url.slice(0, -4);
  }

  return `git+${url}`;
}

/**
 * Run a git command and return its stdout, or empty string on failure.
 */
function gitOutput(args: string[]): string {
  try {
    const result = spawnSync('git', args, { encoding: 'buffer' });
    if (result.status !== 0) return '';
    const stdout = result.stdout as Buffer;
    return stdout.toString('utf8').trim();
  } catch {
    return '';
  }
}

interface PackageJson {
  name?: string;
  version?: string;
  author?: string;
  description?: string;
  skillet?: {
    skillDir?: string;
  };
}

export function detectEnvironment(nameArg?: string): DetectionResult {
  const cwd = process.cwd();

  // --- package.json ---
  const pkgJsonPath = path.join(cwd, 'package.json');
  let hasPackageJson = false;
  let pkgName = '';
  let version = '';
  let author = '';
  let description = '';
  let pkgSkillDir: string | null = null;

  if (fs.existsSync(pkgJsonPath)) {
    hasPackageJson = true;
    try {
      const raw = fs.readFileSync(pkgJsonPath, 'utf8');
      const pkg = JSON.parse(raw) as PackageJson;
      pkgName = pkg.name ?? '';
      const rawVersion = pkg.version ?? '';
      // 0.0.0-* (e.g. "0.0.0-source") is a pnpm workspace placeholder, not a real version
      version = /^0\.0\.0(-|$)/.test(rawVersion) ? '' : rawVersion;
      author = pkg.author ?? '';
      description = pkg.description ?? '';
      if (pkg.skillet?.skillDir) {
        pkgSkillDir = pkg.skillet.skillDir;
      }
    } catch {
      // ignore parse errors
    }
  }

  // --- Name resolution ---
  let name: string;
  if (nameArg) {
    name = nameArg;
  } else if (pkgName) {
    name = pkgName;
  } else {
    name = toKebabCase(path.basename(cwd));
  }

  // --- SKILL.md ---
  const hasSkillMd = fs.existsSync(path.join(cwd, 'SKILL.md'));

  // --- skillDir ---
  let skillDir: string | null = null;
  if (pkgSkillDir !== null) {
    // package.json takes precedence
    skillDir = pkgSkillDir;
  } else if (
    fs.existsSync(path.join(cwd, 'skill')) &&
    fs.statSync(path.join(cwd, 'skill')).isDirectory()
  ) {
    skillDir = 'skill/';
  }

  // --- Git ---
  const rawRemote = gitOutput(['remote', 'get-url', 'origin']);
  const repositoryUrl = rawRemote ? normalizeGitUrl(rawRemote) : '';

  const gitName = gitOutput(['config', 'user.name']);
  const gitEmail = gitOutput(['config', 'user.email']);
  const gitUser = gitName && gitEmail ? `${gitName} <${gitEmail}>` : gitName || '';

  return {
    cwd,
    name,
    version,
    author,
    description,
    hasPackageJson,
    hasSkillMd,
    skillDir,
    repositoryUrl,
    gitUser,
  };
}
