/**
 * Tests: Spline Interpolation
 */

import {
  splineLinear,
  splineLinearArray,
  splineCubicCoefficients,
  splineCubic,
  splineCubicArray,
  splineCubicDeriv,
  splineCubicIntegral,
  splinePchipSlopes,
  splinePchip,
  splinePchipArray,
  splinePchipInverse,
  splineLookup,
  splineBilinear,
} from "../../src/functions/spline";

// ─── Test data ────────────────────────────────────────────────────────────

const xs = [0, 1, 2, 3, 4];
const ys = [0, 1, 4, 9, 16]; // y = x²

// ─── splineLinear ─────────────────────────────────────────────────────────

describe("splineLinear", () => {
  test("exact at data points", () => {
    xs.forEach((x, i) => expect(splineLinear(xs, ys, x)).toBeCloseTo(ys[i], 10));
  });

  test("midpoint of [0,1] segment", () => {
    // Between x=0(y=0) and x=1(y=1): linear gives 0.5
    expect(splineLinear(xs, ys, 0.5)).toBeCloseTo(0.5, 10);
  });

  test("midpoint of [1,2] segment", () => {
    // Between x=1(y=1) and x=2(y=4): linear gives 2.5
    expect(splineLinear(xs, ys, 1.5)).toBeCloseTo(2.5, 10);
  });

  test("extrapolates beyond right endpoint", () => {
    // Segment [3,4]: slope = 7, so at x=5: 16 + 7 = 23
    expect(splineLinear(xs, ys, 5)).toBeCloseTo(23, 10);
  });

  test("two-point array", () => {
    expect(splineLinear([0, 2], [0, 4], 1)).toBeCloseTo(2, 10);
  });

  test("throws for mismatched arrays", () => {
    expect(() => splineLinear([1, 2], [1], 1.5)).toThrow();
  });

  test("throws for non-increasing x", () => {
    expect(() => splineLinear([0, 2, 1], [0, 1, 2], 1)).toThrow();
  });
});

// ─── splineLinearArray ────────────────────────────────────────────────────

describe("splineLinearArray", () => {
  test("returns array of same length as xqs", () => {
    const result = splineLinearArray(xs, ys, [0.5, 1.5, 2.5]);
    expect(result).toHaveLength(3);
  });

  test("values match splineLinear", () => {
    const xqs = [0.5, 1.5, 2.5, 3.5];
    const expected = xqs.map(xq => splineLinear(xs, ys, xq));
    const result = splineLinearArray(xs, ys, xqs);
    result.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 10));
  });
});

// ─── splineCubicCoefficients ──────────────────────────────────────────────

describe("splineCubicCoefficients", () => {
  test("natural spline: M[0] = M[n-1] = 0", () => {
    const M = splineCubicCoefficients(xs, ys);
    expect(M[0]).toBeCloseTo(0, 8);
    expect(M[M.length - 1]).toBeCloseTo(0, 8);
  });

  test("returns array same length as x", () => {
    const M = splineCubicCoefficients(xs, ys);
    expect(M).toHaveLength(xs.length);
  });

  test("linear data: all second derivatives are zero", () => {
    const xLin = [0, 1, 2, 3];
    const yLin = [0, 1, 2, 3];
    const M = splineCubicCoefficients(xLin, yLin);
    M.forEach(m => expect(Math.abs(m)).toBeLessThan(1e-10));
  });
});

// ─── splineCubic ─────────────────────────────────────────────────────────

describe("splineCubic", () => {
  test("exact at data points", () => {
    xs.forEach((x, i) => expect(splineCubic(xs, ys, x)).toBeCloseTo(ys[i], 6));
  });

  test("interpolates between data points", () => {
    // Natural cubic spline through x², should be close to x² in the interior
    const mid = splineCubic(xs, ys, 2.0);
    expect(mid).toBeCloseTo(4.0, 4);
  });

  test("smooth: closer than linear for x²", () => {
    // Cubic spline through x² should outperform linear at x=1.5
    // linear gives 2.5, exact is 2.25
    const cubic = splineCubic(xs, ys, 1.5);
    const linear = splineLinear(xs, ys, 1.5);
    expect(Math.abs(cubic - 2.25)).toBeLessThan(Math.abs(linear - 2.25));
  });

  test("two-point fallback to linear", () => {
    const result = splineCubic([0, 1], [0, 1], 0.5);
    expect(result).toBeCloseTo(0.5, 5);
  });
});

// ─── splineCubicArray ─────────────────────────────────────────────────────

describe("splineCubicArray", () => {
  test("matches splineCubic point-by-point", () => {
    const xqs = [0.5, 1.5, 2.5, 3.5];
    const arr  = splineCubicArray(xs, ys, xqs);
    xqs.forEach((xq, i) => expect(arr[i]).toBeCloseTo(splineCubic(xs, ys, xq), 10));
  });
});

// ─── splineCubicDeriv ─────────────────────────────────────────────────────

describe("splineCubicDeriv", () => {
  test("linear data: derivative = slope", () => {
    const xL = [0, 1, 2];
    const yL = [0, 2, 4];
    expect(splineCubicDeriv(xL, yL, 1)).toBeCloseTo(2, 5);
  });

  test("finite difference check at interior point", () => {
    const h = 1e-5;
    const deriv = splineCubicDeriv(xs, ys, 2.0);
    const fd = (splineCubic(xs, ys, 2 + h) - splineCubic(xs, ys, 2 - h)) / (2 * h);
    expect(deriv).toBeCloseTo(fd, 4);
  });
});

// ─── splineCubicIntegral ──────────────────────────────────────────────────

describe("splineCubicIntegral", () => {
  test("zero-length integral = 0", () => {
    expect(splineCubicIntegral(xs, ys, 1, 1)).toBeCloseTo(0, 10);
  });

  test("linear data: integral = trapezoid area", () => {
    const xL = [0, 1, 2, 3, 4];
    const yL = [0, 1, 2, 3, 4]; // y = x → integral from 0 to 4 = 8
    const result = splineCubicIntegral(xL, yL, 0, 4);
    expect(result).toBeCloseTo(8, 4);
  });

  test("antisymmetry: integral(a,b) = -integral(b,a)", () => {
    const fwd = splineCubicIntegral(xs, ys, 1, 3);
    const rev = splineCubicIntegral(xs, ys, 3, 1);
    expect(fwd + rev).toBeCloseTo(0, 8);
  });
});

// ─── splinePchipSlopes ────────────────────────────────────────────────────

describe("splinePchipSlopes", () => {
  test("two-point array: slope = (y1-y0)/(x1-x0)", () => {
    const d = splinePchipSlopes([0, 2], [0, 4]);
    expect(d[0]).toBeCloseTo(2, 10);
    expect(d[1]).toBeCloseTo(2, 10);
  });

  test("returns same length as x", () => {
    const d = splinePchipSlopes(xs, ys);
    expect(d).toHaveLength(xs.length);
  });

  test("monotone: slope zero at inflection of step function", () => {
    // Step: 0 → 0 → 1 → 1 at x = 0,1,2,3: interior slopes should be 0 at flat regions
    const xS = [0, 1, 2, 3];
    const yS = [0, 0, 1, 1];
    const d  = splinePchipSlopes(xS, yS);
    // d[1] and d[2] should be 0 (inflection point between flat and rising)
    expect(d[1]).toBeCloseTo(0, 5);
    expect(d[2]).toBeCloseTo(0, 5);
  });
});

// ─── splinePchip ─────────────────────────────────────────────────────────

describe("splinePchip", () => {
  test("exact at data points", () => {
    xs.forEach((x, i) => expect(splinePchip(xs, ys, x)).toBeCloseTo(ys[i], 8));
  });

  test("monotone between monotone data", () => {
    const xM = [0, 1, 2, 3];
    const yM = [0, 1, 2, 3];
    const xqs = [0.3, 0.7, 1.3, 1.7, 2.3, 2.7];
    xqs.forEach((xq, i) => {
      if (i > 0) {
        const curr = splinePchip(xM, yM, xqs[i]);
        const prev = splinePchip(xM, yM, xqs[i - 1]);
        expect(curr).toBeGreaterThan(prev);
      }
    });
  });

  test("no overshoot on monotone data", () => {
    // Step function: PCHIP should not overshoot above 1
    const xS = [0, 1, 2, 3, 4];
    const yS = [0, 0, 1, 1, 1];
    const xqs = [0.5, 1.5, 2.5, 3.5];
    xqs.forEach(xq => {
      const v = splinePchip(xS, yS, xq);
      expect(v).toBeGreaterThanOrEqual(-0.01);
      expect(v).toBeLessThanOrEqual(1.01);
    });
  });
});

// ─── splinePchipArray ─────────────────────────────────────────────────────

describe("splinePchipArray", () => {
  test("matches splinePchip point-by-point", () => {
    const xqs = [0.5, 1.5, 2.5];
    const arr  = splinePchipArray(xs, ys, xqs);
    xqs.forEach((xq, i) => expect(arr[i]).toBeCloseTo(splinePchip(xs, ys, xq), 10));
  });
});

// ─── splinePchipInverse ───────────────────────────────────────────────────

describe("splinePchipInverse", () => {
  test("finds x for given y in monotone data", () => {
    const xM = [0, 1, 2, 3, 4, 5];
    const yM = [0, 1, 4, 9, 16, 25];  // y ~ x²
    const xFound = splinePchipInverse(xM, yM, 4.0);
    // y = 4 corresponds to x = 2
    expect(xFound).toBeCloseTo(2.0, 3);
  });

  test("returns NaN when target is outside root bracket", () => {
    const xM = [0, 1, 2];
    const yM = [1, 2, 3];
    const result = splinePchipInverse(xM, yM, 0);  // target below minimum
    expect(isNaN(result)).toBe(true);
  });

  test("finds boundary value", () => {
    const xM = [0, 1, 2, 3];
    const yM = [0, 1, 2, 3];
    expect(splinePchipInverse(xM, yM, 1.5)).toBeCloseTo(1.5, 3);
  });
});

// ─── splineLookup ─────────────────────────────────────────────────────────

describe("splineLookup", () => {
  test("matches splineLinear", () => {
    const tX = [0, 1, 2, 3];
    const tY = [0, 10, 20, 30];
    expect(splineLookup(tX, tY, 1.5)).toBeCloseTo(15, 10);
  });
});

// ─── splineBilinear ───────────────────────────────────────────────────────

describe("splineBilinear", () => {
  const xs2 = [0, 1, 2];
  const ys2 = [0, 1, 2];
  // Z[i][j] = xs2[i] + ys2[j]
  const Z = [
    [0, 1, 2],
    [1, 2, 3],
    [2, 3, 4],
  ];

  test("exact at grid corners", () => {
    expect(splineBilinear(xs2, ys2, Z, 0, 0)).toBeCloseTo(0, 10);
    expect(splineBilinear(xs2, ys2, Z, 2, 2)).toBeCloseTo(4, 10);
    expect(splineBilinear(xs2, ys2, Z, 1, 2)).toBeCloseTo(3, 10);
  });

  test("center of cell [0,0]−[1,1] = 1.0", () => {
    // Z(0.5, 0.5) = 0.5 + 0.5 = 1.0 for Z = x+y
    expect(splineBilinear(xs2, ys2, Z, 0.5, 0.5)).toBeCloseTo(1.0, 10);
  });

  test("throws on wrong Z dimensions", () => {
    expect(() => splineBilinear([0, 1], [0, 1], [[0]], 0.5, 0.5)).toThrow();
  });
});
