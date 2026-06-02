import { dim, ember500, irisBright } from './colors.js';
import { generateWordmark } from './wordmark.js';

export interface HeaderOpts {
  resolvedWordmarkName: string; // for full header wordmark (figlet input)
  resolvedDisplayName: string; // for light header prefix
  pkg: { name: string; version: string; description?: string };
  coreVersion: string; // @skillet-cli/core version for attribution line
}

// OSC 8 hyperlink: ]8;;<url>\<text>]8;;\
function osc8Link(url: string, text: string): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

function renderAttributionLine(coreVersion: string): string {
  const primary = irisBright.bold(`Packaged with Skillet v${coreVersion}`);
  const secondary = dim(
    `· package your own for any agent in one step ${osc8Link('https://github.com/dafrick/skillet', '↗')}`,
  );
  return `  ${primary} ${secondary}`;
}

// Full header: wordmark + description + attribution — for install/update
export function renderFullHeader(opts: HeaderOpts): string {
  if (!process.stdout.isTTY || process.env.CI) return '';
  const wordmark = generateWordmark(opts.resolvedWordmarkName);
  const descriptionLine = opts.pkg.description ? `${dim(opts.pkg.description)}\n` : '';
  const attribution = renderAttributionLine(opts.coreVersion);
  return `\n${wordmark}\n${descriptionLine}${attribution}\n\n`;
}

// Light header: DISPLAY-NAME + description + attribution — for list/uninstall
export function renderLightHeader(opts: HeaderOpts): string {
  if (!process.stdout.isTTY || process.env.CI) return '';
  const title = ember500.bold(`${opts.resolvedDisplayName}`);
  const titleLine = opts.pkg.description ? `${title} - ${dim(opts.pkg.description)}` : title;
  const attribution = renderAttributionLine(opts.coreVersion);
  return `${titleLine}\n${attribution}\n\n`;
}
