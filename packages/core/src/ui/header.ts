import {
  generateWordmark,
  renderFullHeader as uiRenderFullHeader,
  renderLightHeader as uiRenderLightHeader,
} from '@skillet-cli/ui';
import { dim, irisBright } from './colors.js';

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
    `· package your own for any agent in one step ${osc8Link('https://github.com/dafrick/skillet-cli', '↗')}`,
  );
  return `  ${primary} ${secondary}`;
}

// Full header: wordmark + description + attribution — for install/update
export function renderFullHeader(opts: HeaderOpts): string {
  const wordmark = generateWordmark(opts.resolvedWordmarkName);
  const tagline = opts.pkg.description ?? '';
  const attributionLine = renderAttributionLine(opts.coreVersion);
  return uiRenderFullHeader({ wordmark, tagline, attributionLine });
}

// Light header: DISPLAY-NAME + description + attribution — for list/uninstall
export function renderLightHeader(opts: HeaderOpts): string {
  const attributionLine = renderAttributionLine(opts.coreVersion);
  return uiRenderLightHeader({
    displayName: opts.resolvedDisplayName,
    tagline: opts.pkg.description,
    attributionLine,
  });
}
