import { readFileSync } from 'node:fs';

const msg = readFileSync(process.argv[2], 'utf8').split('\n')[0];
const pattern = /^(feat|fix|chore|test|docs|refactor|perf|ci|build|spec)(\([^)]+\))?: \S/;

if (!pattern.test(msg)) {
  process.stderr.write('Commit message does not follow conventional commits format\n');
  process.exit(1);
}
