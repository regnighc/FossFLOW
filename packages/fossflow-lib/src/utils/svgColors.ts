const SVG_PREFIX = 'data:image/svg+xml;base64,';
const SKIP_FILLS = new Set(['none', 'inherit', 'transparent', 'currentcolor']);

function isSvgDataUrl(url: string): boolean {
  return url.startsWith(SVG_PREFIX);
}

/** Decode a base64 SVG data URL to SVG string, or return null on failure. */
function decodeSvg(url: string): string | null {
  try {
    return atob(url.slice(SVG_PREFIX.length));
  } catch {
    return null;
  }
}

function encodeSvg(svg: string): string {
  return SVG_PREFIX + btoa(unescape(encodeURIComponent(svg)));
}

/**
 * Extract all unique non-transparent fill color values from a base64 SVG data URL.
 * Returns an empty array if the URL isn't a base64 SVG.
 */
export function extractSvgFills(url: string): string[] {
  if (!isSvgDataUrl(url)) return [];
  const svg = decodeSvg(url);
  if (!svg) return [];

  const seen = new Set<string>();
  const fills: string[] = [];

  const attrRe = /fill="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(svg)) !== null) {
    const v = m[1].trim();
    if (!SKIP_FILLS.has(v.toLowerCase()) && !seen.has(v)) {
      seen.add(v);
      fills.push(v);
    }
  }

  const styleRe = /fill:\s*([^;}"'\s][^;}"']*)/gi;
  while ((m = styleRe.exec(svg)) !== null) {
    const v = m[1].trim();
    if (!SKIP_FILLS.has(v.toLowerCase()) && !seen.has(v)) {
      seen.add(v);
      fills.push(v);
    }
  }

  return fills;
}

/**
 * Return a new base64 SVG data URL with fill colors replaced according to colorMap.
 * Keys are original fill values, values are replacement hex colors.
 * Returns the original URL unchanged if no matches or not a base64 SVG.
 */
export function applyIconColors(url: string, colorMap: Record<string, string>): string {
  if (!isSvgDataUrl(url) || !Object.keys(colorMap).length) return url;
  const svg = decodeSvg(url);
  if (!svg) return url;

  let out = svg;
  for (const [orig, replacement] of Object.entries(colorMap)) {
    if (!orig || !replacement) continue;
    const esc = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`fill="${esc}"`, 'gi'), `fill="${replacement}"`);
    out = out.replace(new RegExp(`fill:\\s*${esc}`, 'gi'), `fill:${replacement}`);
  }

  return encodeSvg(out);
}
