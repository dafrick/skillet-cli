import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { checkbox, confirm } from '@inquirer/prompts';
import { DEFAULT_IGNORE, lintSkillFrontmatter } from '@skillet-cli/core';
import matter from 'gray-matter';
import { validatePluginManifests } from './plugin-manifests.js';

interface PackFile {
  path: string;
  size: number;
}

interface NpmPackManifest {
  name: string;
  version: string;
  files: PackFile[];
}

type Tier = 'infrastructure' | 'skill-content' | 'ambiguous' | 'violation';

export interface ClassifiedFile {
  packPath: string;
  size: number;
  tier: Tier;
}

const SKILL_CONTENT_BASENAMES = new Set([
  'SKILL.md',
  'prompts',
  'resources',
  'assets',
  'templates',
  'examples',
]);

const AMBIGUOUS_BASENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'biome.json',
]);

const AMBIGUOUS_FIRST_SEGMENTS = new Set(['scripts']);

const AMBIGUOUS_PATTERNS: RegExp[] = [/\.tsx?$/, /^tsconfig/, /^vitest\.config/, /^\.eslintrc/];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSkillPaths(cwd: string): string[] {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error('No package.json found in current directory');
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    skillet?: { skillDir?: string; skills?: string | string[] };
  };
  const skillet = pkg.skillet;
  if (!skillet) {
    throw new Error(
      'No skillet marker in package.json (missing skillet.skillDir or skillet.skills)',
    );
  }
  if (typeof skillet.skillDir === 'string') return [skillet.skillDir];
  if (Array.isArray(skillet.skills)) return skillet.skills;
  if (typeof skillet.skills === 'string') return [skillet.skills];
  throw new Error('No skillet marker in package.json (missing skillet.skillDir or skillet.skills)');
}

function isUnderSkillPath(filePath: string, skillPaths: string[]): boolean {
  return skillPaths.some((sp) => {
    const prefix = sp.endsWith('/') ? sp : `${sp}/`;
    return filePath === sp || filePath.startsWith(prefix);
  });
}

export function classifyFile(file: PackFile, skillPaths: string[]): ClassifiedFile {
  const { path: filePath, size } = file;

  if (!isUnderSkillPath(filePath, skillPaths)) {
    return { packPath: filePath, size, tier: 'infrastructure' };
  }

  // Compute path relative to matched skill root
  const matchedPrefix =
    skillPaths
      .map((sp) => (sp.endsWith('/') ? sp : `${sp}/`))
      .find((prefix) => filePath.startsWith(prefix)) ?? '';
  const relPath = filePath.slice(matchedPrefix.length);
  const parts = relPath.split('/').filter(Boolean);
  const firstSegment = parts[0] ?? '';
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Violations: DEFAULT_IGNORE entries inside skill path
  if (DEFAULT_IGNORE.has(firstSegment)) {
    return { packPath: filePath, size, tier: 'violation' };
  }

  // Skill content: known content directory/file names or .md extension
  if (
    SKILL_CONTENT_BASENAMES.has(firstSegment) ||
    SKILL_CONTENT_BASENAMES.has(basename) ||
    ext === '.md'
  ) {
    return { packPath: filePath, size, tier: 'skill-content' };
  }

  // Ambiguous: known dev-tooling first segment
  if (AMBIGUOUS_FIRST_SEGMENTS.has(firstSegment)) {
    return { packPath: filePath, size, tier: 'ambiguous' };
  }

  // Ambiguous: known dev-tooling basenames
  if (AMBIGUOUS_BASENAMES.has(basename)) {
    return { packPath: filePath, size, tier: 'ambiguous' };
  }

  // Ambiguous: known dev-tooling patterns
  for (const pattern of AMBIGUOUS_PATTERNS) {
    if (pattern.test(basename)) return { packPath: filePath, size, tier: 'ambiguous' };
  }

  // Default: unrecognized skill-path entry → ambiguous
  return { packPath: filePath, size, tier: 'ambiguous' };
}

function printTier(label: string, files: ClassifiedFile[]): void {
  if (files.length === 0) return;
  process.stdout.write(`\n  ${label}\n`);
  for (const f of files) {
    process.stdout.write(`      ${f.packPath.padEnd(48)} ${formatSize(f.size)}\n`);
  }
}

export async function runCheck({ interactive }: { interactive: boolean }): Promise<void> {
  const cwd = process.cwd();

  let skillPaths: string[];
  try {
    skillPaths = getSkillPaths(cwd);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`create-skillet check: ${msg}\n`);
    process.exit(1);
  }

  const packResult = spawnSync('npm pack --dry-run --json', [], {
    shell: true,
    encoding: 'utf8',
    stdio: 'pipe',
    cwd,
  });

  if (packResult.status !== 0) {
    if (!interactive) {
      process.stdout.write('\n  (publish preview unavailable: npm pack failed)\n');
      return;
    }
    process.stderr.write('npm pack failed. Cannot run publish check.\n');
    process.exit(1);
  }

  let manifests: NpmPackManifest[];
  try {
    manifests = JSON.parse(packResult.stdout) as NpmPackManifest[];
  } catch {
    if (!interactive) {
      process.stdout.write('\n  (publish preview unavailable: could not parse npm pack output)\n');
      return;
    }
    process.stderr.write('Could not parse npm pack --dry-run --json output.\n');
    process.exit(1);
  }

  const manifest = manifests[0];
  if (!manifest) {
    if (!interactive) return;
    process.stderr.write('npm pack returned empty result.\n');
    process.exit(1);
  }

  const classified = manifest.files.map((f) => classifyFile(f, skillPaths));
  const infrastructure = classified.filter((f) => f.tier === 'infrastructure');
  const skillContent = classified.filter((f) => f.tier === 'skill-content');
  const ambiguous = classified.filter((f) => f.tier === 'ambiguous');
  const violations = classified.filter((f) => f.tier === 'violation');
  const totalSize = manifest.files.reduce((sum, f) => sum + f.size, 0);

  process.stdout.write(`\n── ${manifest.name}@${manifest.version} publish check ──\n`);
  process.stdout.write(`\n  Tarball: ${formatSize(totalSize)} · ${manifest.files.length} files\n`);

  printTier('✗ VIOLATIONS — must be excluded', violations);
  printTier('✓ package infrastructure', infrastructure);
  printTier('✓ skill content', skillContent);
  printTier('⚠ review — might be dev tooling', ambiguous);

  process.stdout.write('\n──────────────────────────────────────────\n');

  // Violations always cause non-zero exit, regardless of mode
  if (violations.length > 0) {
    process.stderr.write(
      `\n${violations.length} violation(s) found — these entries must not be published.\n` +
        'Add them to .npmignore and rerun npm publish.\n',
    );
    process.exit(1);
  }

  // Frontmatter lint — check each skill directory's SKILL.md
  const frontmatterViolations: Array<{ skillMdPath: string; content: string }> = [];
  for (const skillPath of skillPaths) {
    const skillMdPath = path.join(cwd, skillPath, 'SKILL.md');
    try {
      const content = await fsp.readFile(skillMdPath, 'utf8');
      if (!lintSkillFrontmatter(content)) {
        frontmatterViolations.push({ skillMdPath, content });
        process.stdout.write(
          `\n⚠ ${skillPath}/SKILL.md: SKILL.md frontmatter is not at the start of the file — this skill will not auto-load in Gemini CLI and is discouraged for Claude Code.\n`,
        );
      }
    } catch {
      // SKILL.md missing — skip lint
    }
  }

  // Plugin manifest validation (version sync + git readiness)
  await validatePluginManifests(cwd);

  // Preview mode: display only, no prompts, no .npmignore writes
  if (!interactive) return;

  // Interactive: offer to fix any frontmatter violations
  for (const { skillMdPath, content } of frontmatterViolations) {
    const shouldFix = await confirm({
      message: 'Fix SKILL.md by moving frontmatter to the start of the file?',
      default: true,
    });
    if (shouldFix) {
      const fmStart = content.indexOf('---');
      if (fmStart !== -1) {
        const fmSlice = content.slice(fmStart);
        const parsed = matter(fmSlice);
        const rewritten = matter.stringify(parsed.content, parsed.data);
        await fsp.writeFile(skillMdPath, rewritten, 'utf8');
        process.stdout.write(
          '\nSKILL.md was rewritten. Please review — comments and unusual whitespace inside the frontmatter block may not have been preserved.\n',
        );
      }
    }
  }

  // Interactive: nothing to review if no ambiguous items
  if (ambiguous.length === 0) return;

  const toExclude: string[] = [];

  const ambiguousSelected = await checkbox({
    message: 'Exclude any ⚠ items from the tarball?',
    choices: ambiguous.map((f) => ({
      name: `${f.packPath}  (${formatSize(f.size)})`,
      value: f.packPath,
      checked: false,
    })),
  });
  toExclude.push(...ambiguousSelected);

  if (skillContent.length > 0) {
    const reviewContent = await confirm({
      message: 'Also exclude any ✓ skill content items?',
      default: false,
    });
    if (reviewContent) {
      const contentSelected = await checkbox({
        message: 'Select ✓ skill content items to exclude',
        choices: skillContent.map((f) => ({
          name: `${f.packPath}  (${formatSize(f.size)})`,
          value: f.packPath,
          checked: false,
        })),
      });
      toExclude.push(...contentSelected);
    }
  }

  if (toExclude.length === 0) return;

  const npmignorePath = path.join(cwd, '.npmignore');
  await fsp.appendFile(npmignorePath, `${toExclude.join('\n')}\n`, 'utf8');

  process.stdout.write('\nUpdated .npmignore with the following exclusions:\n');
  for (const p of toExclude) {
    process.stdout.write(`  ${p}\n`);
  }
  process.stdout.write('\nRerun `npm publish` to apply the updated .npmignore.\n');
  process.exit(1);
}
