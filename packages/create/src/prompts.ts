import { input } from '@inquirer/prompts';
import type { DetectionResult } from './detect.js';

export interface WizardConfig {
  name: string;
  version: string;
  description: string;
  author: string;
  repositoryUrl: string;
  license: string;
  skillDir: string;
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

  const skillDir = await input({
    message: 'Skill content path (relative to package root):',
    default: detected.skillDir || 'skill/',
  });

  return { name, version, description, author, repositoryUrl, license, skillDir };
}
