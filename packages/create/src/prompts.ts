import { checkbox, input } from '@inquirer/prompts';
import type { DetectionResult } from './detect.js';

export interface WizardConfig {
  name: string;
  version: string;
  description: string;
  author: string;
  repositoryUrl: string;
  license: string;
  skillDirs: string[];
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
    message: 'Description:',
    default: detected.description || '',
  });

  const author = await input({
    message: 'Author:',
    default: detected.gitUser || detected.author || '',
  });

  const repositoryUrl = await input({
    message: 'Repository URL:',
    default: detected.repositoryUrl || '',
  });

  const license = await input({
    message: 'License:',
    default: 'MIT',
  });

  let skillDirs: string[];
  if (detected.discoveredSkillDirs.length > 1) {
    skillDirs = await checkbox({
      message: 'Select skill content paths to package (relative to package root):',
      choices: detected.discoveredSkillDirs.map((d) => ({ name: d, value: d })),
    });
  } else {
    if (detected.discoveredSkillDirs.length === 0 && !detected.skillDir) {
      process.stdout.write(
        "\nNo SKILL.md found. A SKILL.md file defines your skill's name, description, and\n" +
          'usage instructions. Place it in a subdirectory (e.g. skills/my-skill/SKILL.md)\n' +
          'before publishing.\n\n',
      );
    }
    const skillDir = await input({
      message: 'Skill content path (relative to package root):',
      default: detected.skillDir || 'skill/',
    });
    skillDirs = [skillDir];
  }

  return { name, version, description, author, repositoryUrl, license, skillDirs };
}
