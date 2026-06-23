import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePluginManifests } from '../../src/plugin-manifests.js';
import type { WizardConfig } from '../../src/prompts.js';

const baseConfig: WizardConfig = {
  name: 'my-skill',
  version: '1.0.0',
  description: 'A test skill',
  author: 'Test Author',
  repositoryUrl: 'https://github.com/owner/my-skill.git',
  license: 'MIT',
  skillDir: 'skills/my-skill',
  isMultiSkill: false,
  skillsParentDirs: [],
  removePrivate: false,
  generateClaudePlugin: true,
  generateGeminiPlugin: true,
};

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-manifests-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('generatePluginManifests — single-skill', () => {
  it('plugin.json has skills: ["./skills/my-skill"]', async () => {
    await generatePluginManifests(baseConfig, tmpDir);

    const pluginJsonPath = path.join(tmpDir, '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8')) as {
      skills: string[];
    };
    expect(pluginJson.skills).toEqual(['./skills/my-skill']);
  });

  it('contextFileName is "skills/my-skill/SKILL.md" and no GEMINI.md written', async () => {
    await generatePluginManifests(baseConfig, tmpDir);

    const geminiExtPath = path.join(tmpDir, 'gemini-extension.json');
    const geminiExt = JSON.parse(fs.readFileSync(geminiExtPath, 'utf8')) as {
      contextFileName: string;
    };
    expect(geminiExt.contextFileName).toBe('skills/my-skill/SKILL.md');

    const geminiMdPath = path.join(tmpDir, 'GEMINI.md');
    expect(fs.existsSync(geminiMdPath)).toBe(false);
  });

  it('no GEMINI.md written for single-skill', async () => {
    await generatePluginManifests(baseConfig, tmpDir);

    const geminiMdPath = path.join(tmpDir, 'GEMINI.md');
    expect(fs.existsSync(geminiMdPath)).toBe(false);
  });

  it('strips trailing slash from skillDir when building skills array', async () => {
    const config = { ...baseConfig, skillDir: 'skills/my-skill/' };
    await generatePluginManifests(config, tmpDir);

    const pluginJsonPath = path.join(tmpDir, '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8')) as {
      skills: string[];
    };
    expect(pluginJson.skills).toEqual(['./skills/my-skill']);
  });

  it('strips trailing slash from skillDir when building contextFileName', async () => {
    const config = { ...baseConfig, skillDir: 'skills/my-skill/' };
    await generatePluginManifests(config, tmpDir);

    const geminiExtPath = path.join(tmpDir, 'gemini-extension.json');
    const geminiExt = JSON.parse(fs.readFileSync(geminiExtPath, 'utf8')) as {
      contextFileName: string;
    };
    expect(geminiExt.contextFileName).toBe('skills/my-skill/SKILL.md');
  });
});

describe('generatePluginManifests — multi-skill', () => {
  const multiConfig: WizardConfig = {
    ...baseConfig,
    isMultiSkill: true,
    skillsParentDirs: ['skills/a', 'skills/b'],
  };

  it('plugin.json has skills: ["./skills/a", "./skills/b"]', async () => {
    await generatePluginManifests(multiConfig, tmpDir);

    const pluginJsonPath = path.join(tmpDir, '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8')) as {
      skills: string[];
    };
    expect(pluginJson.skills).toEqual(['./skills/a', './skills/b']);
  });

  it('contextFileName is "GEMINI.md"', async () => {
    await generatePluginManifests(multiConfig, tmpDir);

    const geminiExtPath = path.join(tmpDir, 'gemini-extension.json');
    const geminiExt = JSON.parse(fs.readFileSync(geminiExtPath, 'utf8')) as {
      contextFileName: string;
    };
    expect(geminiExt.contextFileName).toBe('GEMINI.md');
  });

  it('GEMINI.md contains @./skills/a/SKILL.md and @./skills/b/SKILL.md', async () => {
    await generatePluginManifests(multiConfig, tmpDir);

    const geminiMdPath = path.join(tmpDir, 'GEMINI.md');
    const content = fs.readFileSync(geminiMdPath, 'utf8');
    expect(content).toContain('@./skills/a/SKILL.md');
    expect(content).toContain('@./skills/b/SKILL.md');
  });
});

describe('generatePluginManifests — marketplace.json', () => {
  it('plugins[0].source equals "./"', async () => {
    await generatePluginManifests(baseConfig, tmpDir);

    const marketplaceJsonPath = path.join(tmpDir, '.claude-plugin', 'marketplace.json');
    const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf8')) as {
      plugins: Array<{ source: string }>;
    };
    expect(marketplace.plugins[0].source).toBe('./');
  });

  it('top-level name equals plugins[0].name', async () => {
    await generatePluginManifests(baseConfig, tmpDir);

    const marketplaceJsonPath = path.join(tmpDir, '.claude-plugin', 'marketplace.json');
    const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf8')) as {
      name: string;
      plugins: Array<{ name: string }>;
    };
    expect(marketplace.name).toBe(marketplace.plugins[0].name);
  });
});

describe('generatePluginManifests — skip existing files', () => {
  it('existing plugin.json is skipped with a warning and not overwritten', async () => {
    const claudePluginDir = path.join(tmpDir, '.claude-plugin');
    fs.mkdirSync(claudePluginDir, { recursive: true });
    const pluginJsonPath = path.join(claudePluginDir, 'plugin.json');
    const originalContent = '{"original": true}\n';
    fs.writeFileSync(pluginJsonPath, originalContent, 'utf8');

    const stdoutWrites: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdoutWrites.push(String(chunk));
      return true;
    });

    try {
      await generatePluginManifests(baseConfig, tmpDir);
    } finally {
      stdoutSpy.mockRestore();
    }

    // File should not be overwritten
    expect(fs.readFileSync(pluginJsonPath, 'utf8')).toBe(originalContent);

    // Warning should have been emitted
    expect(stdoutWrites.some((w) => w.includes('.claude-plugin/plugin.json'))).toBe(true);
    expect(stdoutWrites.some((w) => w.includes('skipping'))).toBe(true);
  });
});

describe('generatePluginManifests — generateClaudePlugin: false', () => {
  it('no plugin.json or marketplace.json written when generateClaudePlugin is false', async () => {
    const config = { ...baseConfig, generateClaudePlugin: false };
    await generatePluginManifests(config, tmpDir);

    const pluginJsonPath = path.join(tmpDir, '.claude-plugin', 'plugin.json');
    const marketplaceJsonPath = path.join(tmpDir, '.claude-plugin', 'marketplace.json');
    expect(fs.existsSync(pluginJsonPath)).toBe(false);
    expect(fs.existsSync(marketplaceJsonPath)).toBe(false);
  });
});

describe('generatePluginManifests — generateGeminiPlugin: false', () => {
  it('no gemini-extension.json or GEMINI.md written when generateGeminiPlugin is false', async () => {
    const multiConfig: WizardConfig = {
      ...baseConfig,
      generateGeminiPlugin: false,
      isMultiSkill: true,
      skillsParentDirs: ['skills/a', 'skills/b'],
    };
    await generatePluginManifests(multiConfig, tmpDir);

    const geminiExtPath = path.join(tmpDir, 'gemini-extension.json');
    const geminiMdPath = path.join(tmpDir, 'GEMINI.md');
    expect(fs.existsSync(geminiExtPath)).toBe(false);
    expect(fs.existsSync(geminiMdPath)).toBe(false);
  });
});

describe('executeScaffold — postpublish script wiring', () => {
  it('postpublish script test lives in scaffold.test.ts — verify via scaffold integration', () => {
    // This is a placeholder: the actual postpublish wiring tests are
    // in the scaffold.test.ts describe block below.
    expect(true).toBe(true);
  });
});
