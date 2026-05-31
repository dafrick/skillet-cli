import { execSync } from 'node:child_process';

export default function setup() {
  execSync('pnpm -F @skillet/core build', { stdio: 'inherit', timeout: 60_000 });
}
