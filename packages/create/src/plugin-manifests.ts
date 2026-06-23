import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { WizardConfig } from './prompts.js';

export async function generatePluginManifests(
  config: WizardConfig,
  cwd: string = process.cwd(),
): Promise<void> {
  if (config.generateClaudePlugin) {
    const claudePluginDir = path.join(cwd, '.claude-plugin');
    await fsp.mkdir(claudePluginDir, { recursive: true });

    // plugin.json
    const pluginJsonPath = path.join(claudePluginDir, 'plugin.json');
    if (fs.existsSync(pluginJsonPath)) {
      process.stdout.write(
        '⚠ .claude-plugin/plugin.json already exists — skipping (delete to regenerate)\n',
      );
    } else {
      const skills = config.isMultiSkill
        ? config.skillsParentDirs.map((d) => './' + d)
        : ['./' + config.skillDir.replace(/\/+$/, '')];

      const pluginJson = {
        name: config.name,
        description: config.description,
        version: config.version,
        author: { name: config.author },
        license: config.license,
        skills,
      };
      await fsp.writeFile(pluginJsonPath, JSON.stringify(pluginJson, null, 2) + '\n', 'utf8');
    }

    // marketplace.json
    const marketplaceJsonPath = path.join(claudePluginDir, 'marketplace.json');
    if (fs.existsSync(marketplaceJsonPath)) {
      process.stdout.write(
        '⚠ .claude-plugin/marketplace.json already exists — skipping (delete to regenerate)\n',
      );
    } else {
      const marketplaceJson = {
        name: config.name,
        owner: { name: config.author },
        plugins: [
          {
            name: config.name,
            version: config.version,
            source: './',
          },
        ],
      };
      await fsp.writeFile(
        marketplaceJsonPath,
        JSON.stringify(marketplaceJson, null, 2) + '\n',
        'utf8',
      );
    }
  }

  if (config.generateGeminiPlugin) {
    // gemini-extension.json
    const geminiExtPath = path.join(cwd, 'gemini-extension.json');
    if (fs.existsSync(geminiExtPath)) {
      process.stdout.write(
        '⚠ gemini-extension.json already exists — skipping (delete to regenerate)\n',
      );
    } else {
      const contextFileName = config.isMultiSkill
        ? 'GEMINI.md'
        : config.skillDir.replace(/\/+$/, '') + '/SKILL.md';

      const geminiJson = {
        name: config.name,
        version: config.version,
        description: config.description,
        contextFileName,
      };
      await fsp.writeFile(geminiExtPath, JSON.stringify(geminiJson, null, 2) + '\n', 'utf8');
    }

    // GEMINI.md — only for multi-skill
    if (config.isMultiSkill) {
      const geminiMdPath = path.join(cwd, 'GEMINI.md');
      if (fs.existsSync(geminiMdPath)) {
        process.stdout.write('⚠ GEMINI.md already exists — skipping (delete to regenerate)\n');
      } else {
        const geminiMdContent =
          config.skillsParentDirs.map((d) => '@./' + d + '/SKILL.md').join('\n') + '\n';
        await fsp.writeFile(geminiMdPath, geminiMdContent, 'utf8');
      }
    }
  }
}

export async function validatePluginManifests(cwd: string): Promise<void> {
  const pluginJsonPath = path.join(cwd, '.claude-plugin', 'plugin.json');
  const geminiExtPath = path.join(cwd, 'gemini-extension.json');

  const hasPluginJson = fs.existsSync(pluginJsonPath);
  const hasGeminiExt = fs.existsSync(geminiExtPath);

  // If neither manifest exists, nothing to validate
  if (!hasPluginJson && !hasGeminiExt) return;

  // Read package.json version
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(await fsp.readFile(pkgPath, 'utf8')) as { version: string };
  const pkgVersion = pkg.version;

  // Validate .claude-plugin/plugin.json
  if (hasPluginJson) {
    const pluginJson = JSON.parse(await fsp.readFile(pluginJsonPath, 'utf8')) as {
      version: string;
      skills: string[];
    };

    // Version sync check
    if (pluginJson.version !== pkgVersion) {
      process.stderr.write(
        `create-skillet check: .claude-plugin/plugin.json version "${pluginJson.version}" does not match package.json version "${pkgVersion}" — update plugin.json before publishing\n`,
      );
      process.exit(1);
    }

    // Skills path resolution check
    for (const skillsPath of pluginJson.skills) {
      const resolved = path.join(cwd, skillsPath.replace(/^\.\//, ''));
      const skillMd = path.join(resolved, 'SKILL.md');
      if (!fs.existsSync(skillMd)) {
        process.stderr.write(
          `create-skillet check: .claude-plugin/plugin.json skills path "${skillsPath}" does not contain SKILL.md\n`,
        );
        process.exit(1);
      }
    }
  }

  // Validate gemini-extension.json
  if (hasGeminiExt) {
    const geminiJson = JSON.parse(await fsp.readFile(geminiExtPath, 'utf8')) as {
      version: string;
      contextFileName: string;
    };

    // Version sync check
    if (geminiJson.version !== pkgVersion) {
      process.stderr.write(
        `create-skillet check: gemini-extension.json version "${geminiJson.version}" does not match package.json version "${pkgVersion}" — update gemini-extension.json before publishing\n`,
      );
      process.exit(1);
    }

    // contextFileName existence check
    const contextFilePath = path.join(cwd, geminiJson.contextFileName);
    if (!fs.existsSync(contextFilePath)) {
      process.stderr.write(
        `create-skillet check: gemini-extension.json contextFileName "${geminiJson.contextFileName}" does not exist\n`,
      );
      process.exit(1);
    }
  }

  // Git readiness checks

  // 1. Working tree cleanliness
  const statusResult = spawnSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
    cwd,
    stdio: 'pipe',
  });
  const dirty = (statusResult.stdout ?? '').trim();
  if (dirty) {
    process.stderr.write(
      `create-skillet check: uncommitted changes found — commit everything before publishing:\n${dirty}\n`,
    );
    process.exit(1);
  }

  // 2. Origin remote existence
  const remoteResult = spawnSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8',
    cwd,
    stdio: 'pipe',
  });
  if (remoteResult.status !== 0) {
    process.stderr.write(
      "create-skillet check: no git remote named 'origin' — a public GitHub remote is required for plugin marketplace distribution\n",
    );
    process.exit(1);
  }

  // 3. Remote tag existence
  const tagRef = `refs/tags/v${pkgVersion}`;
  const lsRemoteResult = spawnSync('git', ['ls-remote', 'origin', tagRef], {
    encoding: 'utf8',
    cwd,
    stdio: 'pipe',
  });
  if (lsRemoteResult.status !== 0 || lsRemoteResult.error) {
    process.stderr.write(
      `create-skillet check: could not reach remote 'origin' — verify that tag v${pkgVersion} exists on the remote before running npm publish\n`,
    );
    process.exit(1);
  }
  if (!(lsRemoteResult.stdout ?? '').trim()) {
    process.stderr.write(
      `create-skillet check: tag v${pkgVersion} not found on remote 'origin' — push it first:\n  git tag v${pkgVersion} && git push origin v${pkgVersion}\n`,
    );
    process.exit(1);
  }
}
