#!/usr/bin/env node
import { createRequire } from 'node:module';
import { run } from '../dist/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

await run({
  pkg,
  displayName: 'skillet',
});
