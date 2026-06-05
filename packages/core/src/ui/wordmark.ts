import { Chalk } from 'chalk';

export { deriveDisplayName, generateWordmark } from '@skillet-cli/ui';

// Use level 3 (true color) when rendering — the TTY guard in renderWordmark()
// ensures we only call this on actual terminals. Forcing level avoids chalk
// detecting no-color in test/CI environments before the guard is checked.
const chalkTrueColor = new Chalk({ level: 3 });

const ART_LINES = [
  '███████╗██╗  ██╗██╗██╗     ██╗     ███████╗████████╗',
  '██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝╚══██╔══╝',
  '███████╗█████╔╝ ██║██║     ██║     █████╗     ██║   ',
  '╚════██║██╔═██╗ ██║██║     ██║     ██╔══╝     ██║   ',
  '███████║██║  ██╗██║███████╗███████╗███████╗   ██║   ',
  '╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   ',
];

// Heated-iron gradient — one color per row
const ROW_COLORS: Array<[number, number, number]> = [
  [251, 210, 160],
  [240, 146, 90],
  [232, 116, 59],
  [199, 90, 40],
  [156, 68, 28],
  [156, 68, 28],
];

// Shadow box-drawing characters used by ANSI Shadow figlet output.
const SHADOW_CHARS = new Set(['╗', '╔', '═', '╝', '╚', '║']);

function renderLine(line: string, rowColor: [number, number, number]): string {
  const [r, g, b] = rowColor;
  const shadowR = Math.round(r * 0.4);
  const shadowG = Math.round(g * 0.4);
  const shadowB = Math.round(b * 0.4);
  const mainColor = chalkTrueColor.rgb(r, g, b);
  const shadowColor = chalkTrueColor.rgb(shadowR, shadowG, shadowB);
  return [...line]
    .map((char) => (SHADOW_CHARS.has(char) ? shadowColor(char) : mainColor(char)))
    .join('');
}

// Returns the rendered wordmark string, or empty string when no TTY
export function renderWordmark(): string {
  if (!process.stdout.isTTY || process.env.CI) return '';
  return ART_LINES.map((line, i) => renderLine(line, ROW_COLORS[i] ?? ROW_COLORS[0])).join('\n');
}
