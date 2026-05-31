#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { run } from '@skillet/core';

const pkg = createRequire(import.meta.url)('../package.json');
await run({ skillDir: fileURLToPath(new URL('../skill', import.meta.url)), pkg });
