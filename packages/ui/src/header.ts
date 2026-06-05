import { dim, ember500 } from './colors.js';

export interface FullHeaderOpts {
  wordmark: string;
  tagline: string;
  attributionLine: string;
}

export interface LightHeaderOpts {
  displayName: string;
  tagline?: string;
  attributionLine: string;
}

export function renderFullHeader(opts: FullHeaderOpts): string {
  if (!process.stdout.isTTY || process.env.CI) return '';
  const taglinePart = opts.tagline ? `${dim(opts.tagline)}\n` : '';
  return `\n${opts.wordmark}\n${taglinePart}${opts.attributionLine}\n\n`;
}

export function renderLightHeader(opts: LightHeaderOpts): string {
  if (!process.stdout.isTTY || process.env.CI) return '';
  const title = ember500.bold(opts.displayName);
  const titleLine = opts.tagline ? `${title} - ${dim(opts.tagline)}` : title;
  return `${titleLine}\n${opts.attributionLine}\n\n`;
}
