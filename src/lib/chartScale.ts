// Chart axis/scale math — pure functions, no I/O, same reasoning as every
// other src/lib/*.ts file: this is the part worth unit testing directly.

/** Rounds a value up to a "nice" number (1/2/5 × a power of 10) for a chart
 *  axis ceiling — e.g. 8,370 → 10,000, 42 → 50, 4 → 5. */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const norm = value / base;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * base;
}

export interface LinearScale {
  /** Maps a data value to a pixel position within [0, pixelRange]. */
  toPixel(value: number): number;
  /** The pixel position of the zero baseline. */
  zeroPixel: number;
  domainMin: number;
  domainMax: number;
}

/** A linear scale over a domain that always includes 0 — so a chart with
 *  any mix of positive and negative values (e.g. a loss-making month)
 *  still draws bars growing from a real zero baseline, not from an edge. */
export function linearScale(values: number[], pixelRange: number): LinearScale {
  const dataMax = Math.max(0, ...values);
  const dataMin = Math.min(0, ...values);
  const domainMax = dataMax > 0 ? niceCeil(dataMax) : 0;
  const domainMin = dataMin < 0 ? -niceCeil(-dataMin) : 0;
  const span = domainMax - domainMin || 1;

  const toPixel = (value: number) => (pixelRange * (value - domainMin)) / span;

  return { domainMin, domainMax, zeroPixel: toPixel(0), toPixel };
}
