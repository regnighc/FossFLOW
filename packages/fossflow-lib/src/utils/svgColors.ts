const SVG_PREFIX = 'data:image/svg+xml;base64,';
const SKIP_FILLS = new Set(['none', 'inherit', 'currentcolor']);
const SKIP_STROKES = new Set(['none', 'inherit', 'currentcolor']);

export function isSvgDataUrl(url: string): boolean {
  return url.startsWith(SVG_PREFIX);
}

function decodeSvg(url: string): string | null {
  try {
    return atob(url.slice(SVG_PREFIX.length));
  } catch {
    return null;
  }
}

function encodeSvg(svg: string): string {
  try {
    return SVG_PREFIX + btoa(unescape(encodeURIComponent(svg)));
  } catch {
    // btoa fails on non-latin1 chars — fall back to percent-encoding
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
}

export type SvgColorEntry = {
  value: string;
  type: 'fill' | 'stroke';
  isTransparent: boolean;
};

/**
 * Extract all unique colorable values (fills + strokes) from a base64 SVG.
 * Includes transparent fills so the user can recolor faces that are currently hidden.
 */
export function extractSvgColors(url: string): SvgColorEntry[] {
  if (!isSvgDataUrl(url)) return [];
  const svg = decodeSvg(url);
  if (!svg) return [];

  const seen = new Set<string>();
  const results: SvgColorEntry[] = [];

  const add = (value: string, type: 'fill' | 'stroke') => {
    const key = `${type}:${value.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    const lower = value.toLowerCase().trim();
    const skip = type === 'fill' ? SKIP_FILLS : SKIP_STROKES;
    if (skip.has(lower)) return;
    results.push({ value: value.trim(), type, isTransparent: lower === 'transparent' });
  };

  const attrFillRe = /fill="([^"]+)"/gi;
  const attrStrokeRe = /stroke="([^"]+)"/gi;
  const styleFillRe = /fill:\s*([^;}"']+)/gi;
  const styleStrokeRe = /stroke:\s*([^;}"']+)/gi;

  let m: RegExpExecArray | null;
  while ((m = attrFillRe.exec(svg)) !== null) add(m[1], 'fill');
  while ((m = attrStrokeRe.exec(svg)) !== null) add(m[1], 'stroke');
  while ((m = styleFillRe.exec(svg)) !== null) add(m[1], 'fill');
  while ((m = styleStrokeRe.exec(svg)) !== null) add(m[1], 'stroke');

  return results;
}

/** Legacy: returns just fill values (backwards compat for existing code). */
export function extractSvgFills(url: string): string[] {
  return extractSvgColors(url)
    .filter(e => e.type === 'fill')
    .map(e => e.value);
}

/**
 * Return a new base64 SVG with fill and stroke colors replaced per colorMap.
 * Keys: "fill:<original>" or "stroke:<original>", values: replacement hex.
 * Also accepts plain "<original>" as a fill key for backward compat.
 */
export function applyIconColors(url: string, colorMap: Record<string, string>): string {
  if (!isSvgDataUrl(url) || !Object.keys(colorMap).length) return url;
  const svg = decodeSvg(url);
  if (!svg) return url;

  let out = svg;
  for (const [key, replacement] of Object.entries(colorMap)) {
    if (!key || !replacement) continue;

    // Support both "fill:#xxx" / "stroke:#xxx" keys and plain "#xxx" fill keys
    let type: 'fill' | 'stroke' = 'fill';
    let orig = key;
    if (key.startsWith('fill:')) { type = 'fill'; orig = key.slice(5); }
    else if (key.startsWith('stroke:')) { type = 'stroke'; orig = key.slice(7); }

    const esc = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (type === 'fill') {
      out = out.replace(new RegExp(`fill="${esc}"`, 'gi'), `fill="${replacement}"`);
      out = out.replace(new RegExp(`fill:\\s*${esc}`, 'gi'), `fill:${replacement}`);
    } else {
      out = out.replace(new RegExp(`stroke="${esc}"`, 'gi'), `stroke="${replacement}"`);
      out = out.replace(new RegExp(`stroke:\\s*${esc}`, 'gi'), `stroke:${replacement}`);
    }
  }

  return encodeSvg(out);
}
