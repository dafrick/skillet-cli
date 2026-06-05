import { Chalk } from 'chalk';
import figlet from 'figlet';
import { ember500 } from './colors.js';

export function deriveDisplayName(pkgName: string): string {
  const slashIndex = pkgName.indexOf('/');
  const base = slashIndex !== -1 ? pkgName.slice(slashIndex + 1) : pkgName;
  return base.toUpperCase();
}

const chalkTrueColor = new Chalk({ level: 3 });

const ROW_COLORS: Array<[number, number, number]> = [
  [251, 210, 160],
  [240, 146, 90],
  [232, 116, 59],
  [199, 90, 40],
  [156, 68, 28],
  [156, 68, 28],
];

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

export function generateWordmark(name: string): string {
  const noColor = process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '';
  const DEFAULT_TERMINAL_WIDTH = 120;
  const maxWidth = process.stdout.columns ?? DEFAULT_TERMINAL_WIDTH;
  const art = figlet.textSync(name, { font: 'ANSI Shadow' });
  const artLines = art.split('\n');
  const maxLineWidth = Math.max(...artLines.map((l) => l.length));
  if (maxLineWidth > maxWidth) {
    if (noColor) return name;
    return ember500.bold(name);
  }
  if (noColor) return art;
  const lastColor = ROW_COLORS[ROW_COLORS.length - 1] as [number, number, number];
  return artLines.map((line, i) => renderLine(line, ROW_COLORS[i] ?? lastColor)).join('\n');
}
