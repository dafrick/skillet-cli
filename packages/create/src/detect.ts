import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DetectionResult {
  cwd: string;
  name: string;
  version: string;
  author: string;
  description: string;
  license: string;
  hasPackageJson: boolean;
  isPrivate: boolean;
  hasSkillMd: boolean;
  skillDir: string | null;
  /** All skill dirs discovered by scanning for SKILL.md files, as relative paths with trailing slash. */
  discoveredSkillDirs: string[];
  repositoryUrl: string;
  gitUser: string;
  /** True when package.json exists and declares itself a skillet package via skillet.skillDir or skillet.skills. */
  isExistingSkilletPackage?: boolean;
  /** The `files` array from package.json, if present. */
  files?: string[];
  /** The normalized `skillet.skills` value from package.json (string or array form), as an array. Undefined when absent/empty. */
  skillsParentDirs?: string[];
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

const SCAN_SKIP_DIRS = new Set(['node_modules', 'dist']);

/**
 * Recursively scan `baseDir` for `SKILL.md` files and return the containing
 * directories as paths relative to `baseDir` with a trailing slash.
 * Skips dot-directories and `node_modules`.
 */
export function scanForSkillMds(baseDir: string, _currentDir?: string): string[] {
  const currentDir = _currentDir ?? baseDir;
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry.isFile() && entry.name === 'SKILL.md') {
      const rel = path.relative(baseDir, currentDir);
      results.push(rel ? `${rel}/` : './');
    } else if (
      entry.isDirectory() &&
      !entry.name.startsWith('.') &&
      !SCAN_SKIP_DIRS.has(entry.name)
    ) {
      results.push(...scanForSkillMds(baseDir, path.join(currentDir, entry.name)));
    }
  }

  return results;
}

interface PackageJson {
  name?: string;
  version?: string;
  author?: string;
  description?: string;
  private?: boolean;
  license?: string;
  skillet?: {
    skillDir?: string;
    skills?: string | string[];
  };
  files?: string[];
}

export function detectEnvironment(nameArg?: string): DetectionResult {
  const cwd = process.cwd();

  // --- package.json ---
  const pkgJsonPath = path.join(cwd, 'package.json');
  let hasPackageJson = false;
  let isPrivate = false;
  let pkgName = '';
  let version = '';
  let author = '';
  let description = '';
  let license = '';
  let pkgSkillDir: string | null = null;
  let hasSkilletSkills = false;
  let pkgFiles: string[] | undefined;
  let pkgSkillsParentDirs: string[] | undefined;

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
      isPrivate = pkg.private === true;
      license = pkg.license ?? '';
      if (pkg.skillet?.skillDir) {
        pkgSkillDir = pkg.skillet.skillDir;
      }
      const pkgSkills = pkg.skillet?.skills;
      hasSkilletSkills = Array.isArray(pkgSkills) ? pkgSkills.length > 0 : Boolean(pkgSkills);
      if (hasSkilletSkills) {
        pkgSkillsParentDirs = Array.isArray(pkgSkills) ? pkgSkills : [pkgSkills as string];
      }
      if (pkg.files) {
        pkgFiles = pkg.files;
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

  // --- Scan for SKILL.md files ---
  const discoveredSkillDirs = scanForSkillMds(cwd);

  // --- skillDir ---
  let skillDir: string | null = null;
  if (pkgSkillDir !== null) {
    // package.json takes precedence
    skillDir = pkgSkillDir;
  } else if (discoveredSkillDirs.length === 1) {
    skillDir = discoveredSkillDirs[0];
  } else if (
    discoveredSkillDirs.length === 0 &&
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

  // --- isExistingSkilletPackage ---
  const isExistingSkilletPackage = hasPackageJson && (pkgSkillDir !== null || hasSkilletSkills);

  return {
    cwd,
    name,
    version,
    author,
    description,
    license,
    hasPackageJson,
    isPrivate,
    hasSkillMd,
    skillDir,
    discoveredSkillDirs,
    repositoryUrl,
    gitUser,
    isExistingSkilletPackage,
    files: pkgFiles,
    skillsParentDirs: pkgSkillsParentDirs,
  };
}
