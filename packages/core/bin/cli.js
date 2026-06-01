#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { run } from '../dist/run.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

await run({
  skillDir: fileURLToPath(new URL('../fixtures/hello-skill', import.meta.url)),
  pkg,
  displayName: 'skillet',
});
