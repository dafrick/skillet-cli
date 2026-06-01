import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Sandbox } from './sandbox.js';

export interface FixturePackage {
  name: string;
  version: string;
  skillet?: object;
  /** names of sibling fixture packages this fixture depends on */
  deps?: string[];
}

/**
 * Installs a set of fixture npm packages into a sandbox's `node_modules`.
 *
 * For each fixture:
 *  - Writes `<sandbox.cwd>/fixtures/<name>/package.json` with its metadata.
 *  - Writes a stub `<sandbox.cwd>/fixtures/<name>/index.js`.
 *
 * Then writes `<sandbox.cwd>/package.json` with `dependencies` pointing each
 * top-level fixture (fixtures not depended on by any other fixture in the
 * array) to `file:./fixtures/<name>`.
 *
 * Finally, runs `npm install --ignore-scripts` in `<sandbox.cwd>` so that
 * `createRequire` resolves packages identically to production.
 */
export async function installFixturePackages(
  sandbox: Sandbox,
  fixtures: FixturePackage[],
): Promise<void> {
  const fixturesDir = path.join(sandbox.cwd, 'fixtures');
  await fs.mkdir(fixturesDir, { recursive: true });

  // Determine which package names appear as deps of any other fixture.
  // Those are NOT top-level — they are resolved transitively via npm.
  const transitiveNames = new Set<string>();
  for (const fixture of fixtures) {
    for (const depName of fixture.deps ?? []) {
      transitiveNames.add(depName);
    }
  }

  // Write each fixture directory
  for (const fixture of fixtures) {
    const fixtureDir = path.join(fixturesDir, fixture.name);
    await fs.mkdir(fixtureDir, { recursive: true });

    // Build the `dependencies` map for this fixture, pointing to sibling dirs
    const fixtureDeps: Record<string, string> = {};
    for (const depName of fixture.deps ?? []) {
      // Point to the sibling fixture directory via file: protocol
      fixtureDeps[depName] = `file:../${depName}`;
    }

    const pkgJson: Record<string, unknown> = {
      name: fixture.name,
      version: fixture.version,
      main: 'index.js',
      type: 'module',
    };

    if (Object.keys(fixtureDeps).length > 0) {
      pkgJson.dependencies = fixtureDeps;
    }

    if (fixture.skillet !== undefined) {
      pkgJson.skillet = fixture.skillet;
    }

    await fs.writeFile(
      path.join(fixtureDir, 'package.json'),
      JSON.stringify(pkgJson, null, 2),
      'utf8',
    );

    // Stub index.js
    await fs.writeFile(path.join(fixtureDir, 'index.js'), 'export {};\n', 'utf8');
  }

  // Build the root package.json with top-level fixtures as dependencies
  const rootDeps: Record<string, string> = {};
  for (const fixture of fixtures) {
    if (!transitiveNames.has(fixture.name)) {
      rootDeps[fixture.name] = `file:./fixtures/${fixture.name}`;
    }
  }

  const rootPkgJson = {
    name: 'skillet-test-root',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies: rootDeps,
  };

  await fs.writeFile(
    path.join(sandbox.cwd, 'package.json'),
    JSON.stringify(rootPkgJson, null, 2),
    'utf8',
  );

  // Run npm install to produce a real node_modules tree
  execSync('npm install --ignore-scripts', {
    cwd: sandbox.cwd,
    stdio: 'pipe',
  });
}
