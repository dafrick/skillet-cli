import * as path from 'node:path';
import { confirm, input } from '@inquirer/prompts';
import type { DetectionResult } from './detect.js';

export interface WizardConfig {
  name: string;
  version: string;
  description: string;
  author: string;
  repositoryUrl: string;
  license: string;
  skillDir: string;
  isMultiSkill: boolean;
  skillsParentDirs: string[];
  removePrivate: boolean;
  generateClaudePlugin: boolean;
  generateGeminiPlugin: boolean;
}

export function deriveParentDirs(discoveredSkillDirs: string[]): string[] {
  const filtered = discoveredSkillDirs.filter((d) => {
    const normalized = d.replace(/\/+$/, ''); // strip trailing slashes
    return normalized !== '.' && normalized !== './';
  });
  const parents = filtered.map((d) => {
    const normalized = d.replace(/\/+$/, '');
    return path.dirname(normalized);
  });
  return [...new Set(parents)];
}

export async function collectConfig(detected: DetectionResult): Promise<WizardConfig> {
  const name = await input({
    message: 'Package name:',
    default: detected.name,
  });

  const version = await input({
    message: 'Version:',
    default: detected.version || '0.1.0',
  });

  const description = await input({
    message: 'Description (optional):',
    default: detected.description || '',
  });

  const author = await input({
    message: 'Author (optional):',
    default: detected.gitUser || detected.author || '',
  });

  const repositoryUrl = await input({
    message: 'Repository URL:',
    default: detected.repositoryUrl || '',
  });

  const license = await input({
    message: 'License:',
    default: detected.license || 'MIT',
  });

  let removePrivate = false;
  if (detected.isPrivate) {
    removePrivate = await confirm({
      message: 'package.json has "private": true — remove it so you can publish?',
      default: true,
    });
  }

  const hasRemote = Boolean(repositoryUrl);
  const generateClaudePlugin = await confirm({
    message: 'Generate Claude Code + Copilot CLI plugin manifests (.claude-plugin/)?',
    default: hasRemote,
  });
  const generateGeminiPlugin = await confirm({
    message: 'Generate Gemini CLI extension manifest (gemini-extension.json)?',
    default: hasRemote,
  });

  let skillDir: string;
  let isMultiSkill = false;
  let skillsParentDirs: string[] = [];

  const filteredDirs = deriveParentDirs(detected.discoveredSkillDirs);
  const filteredSkillDirs = detected.discoveredSkillDirs.filter((d) => {
    const n = d.replace(/\/+$/, '');
    return n !== '.' && n !== './';
  });

  if (filteredSkillDirs.length > 1) {
    // Multi-skill mode: inform and confirm
    isMultiSkill = true;
    skillsParentDirs = filteredDirs;

    process.stdout.write(`\nFound ${filteredSkillDirs.length} skills:\n`);
    for (const dir of filteredSkillDirs) {
      process.stdout.write(`  ${dir}\n`);
    }
    process.stdout.write(
      `All ${filteredSkillDirs.length} skills will be packaged into this single npm package.\n`,
    );

    const proceed = await confirm({
      message: 'Package all skills into one npm package?',
      default: true,
    });
    if (!proceed) {
      process.stdout.write('No changes made.\n');
      process.exit(0);
    }

    skillDir = detected.discoveredSkillDirs[0] || 'skill/';
  } else {
    if (detected.discoveredSkillDirs.length === 0 && !detected.skillDir) {
      process.stdout.write(
        "\nNo SKILL.md found. A SKILL.md file defines your skill's name, description, and\n" +
          'usage instructions. Place it in a subdirectory (e.g. skills/my-skill/SKILL.md)\n' +
          'before publishing.\n\n',
      );
    }
    skillDir = await input({
      message: 'Skill content path (relative to package root):',
      default: detected.skillDir || 'skill/',
    });
  }

  return {
    name,
    version,
    description,
    author,
    repositoryUrl,
    license,
    skillDir,
    isMultiSkill,
    skillsParentDirs,
    removePrivate,
    generateClaudePlugin,
    generateGeminiPlugin,
  };
}
