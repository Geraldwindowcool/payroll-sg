import { describe, it, expect } from "vitest";
import { niceCeil, linearScale } from "./chartScale";

describe("niceCeil — rounding up to a clean axis ceiling", () => {
  it("rounds up within the same decade to 1/2/5/10", () => {
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(1.5)).toBe(2);
    expect(niceCeil(3)).toBe(5);
    expect(niceCeil(7)).toBe(10);
  });

  it("scales correctly across magnitudes", () => {
    expect(niceCeil(8370)).toBe(10000);
    expect(niceCeil(42)).toBe(50);
    expect(niceCeil(420000)).toBe(500000);
  });

  it("never returns less than the input", () => {
    for (const v of [1, 4, 9, 99, 101, 4999, 500000.5]) {
      expect(niceCeil(v)).toBeGreaterThanOrEqual(v);
    }
  });

  it("treats non-positive input as a floor of 1, never NaN or negative", () => {
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(-50)).toBe(1);
    expect(niceCeil(NaN)).toBe(1);
  });
});

describe("linearScale — always includes zero in the domain", () => {
  it("scales all-positive values from a zero baseline at pixel 0", () => {
    const s = linearScale([100, 50, 200], 100);
    expect(s.domainMin).toBe(0);
    expect(s.zeroPixel).toBe(0);
    expect(s.toPixel(0)).toBe(s.zeroPixel);
    expect(s.toPixel(s.domainMax)).toBeCloseTo(100, 5);
  });

  it("scales all-negative values with the baseline at the far pixel end", () => {
    const s = linearScale([-100, -50], 100);
    expect(s.domainMax).toBe(0);
    expect(s.zeroPixel).toBeCloseTo(100, 5);
    expect(s.toPixel(0)).toBe(s.zeroPixel);
  });

  it("places the zero baseline between the two ends for mixed data", () => {
    const s = linearScale([100, -50], 150);
    expect(s.domainMin).toBeLessThan(0);
    expect(s.domainMax).toBeGreaterThan(0);
    expect(s.zeroPixel).toBeGreaterThan(0);
    expect(s.zeroPixel).toBeLessThan(150);
  });

  it("maps the domain max and min to the pixel range's ends", () => {
    const s = linearScale([80], 200);
    expect(s.toPixel(s.domainMax)).toBeCloseTo(200, 5);
    expect(s.toPixel(0)).toBeCloseTo(0, 5);
  });

  it("keeps zeroPixel consistent with toPixel(0) across all shapes of data — this is what keeps a bar's baseline lined up with its own axis line", () => {
    for (const values of [[100, 50, 200], [-100, -50], [100, -50], [80], [0, 0]]) {
      const s = linearScale(values, 137);
      expect(s.zeroPixel).toBe(s.toPixel(0));
    }
  });

  it("handles an all-zero dataset without dividing by zero", () => {
    const s = linearScale([0, 0], 100);
    expect(Number.isFinite(s.toPixel(0))).toBe(true);
    expect(Number.isNaN(s.toPixel(0))).toBe(false);
  });
});
