import {
  ptaBourdetDerivative,
  ptaDualPorosityDerivative,
} from "../../src/functions/pta";

describe("ptaBourdetDerivative", () => {
  it("returns same length array as input", () => {
    const t   = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    const dP  = t.map(ti => 50 * Math.log(ti + 1));
    const d   = ptaBourdetDerivative(t, dP, 0.1);
    expect(d).toHaveLength(t.length);
  });

  it("throws if arrays have different lengths", () => {
    expect(() => ptaBourdetDerivative([1, 2, 3], [10, 20], 0.1)).toThrow();
  });

  it("derivative of a log function is approximately constant (radial flow)", () => {
    // dP = m * ln(t) → d(dP)/d(ln t) = m
    const m = 50;
    const t = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    const dP = t.map(ti => m * Math.log(ti));
    const d = ptaBourdetDerivative(t, dP, 0.1);
    // Interior points should be close to m
    for (let i = 1; i < d.length - 1; i++) {
      if (!isNaN(d[i])) expect(d[i]).toBeCloseTo(m, 0);
    }
  });

  it("handles single-point arrays without throwing", () => {
    const d = ptaBourdetDerivative([1], [10], 0.1);
    expect(d).toHaveLength(1);
  });

  it("larger L produces smoother (less variable) derivatives", () => {
    const t  = [0.1, 0.15, 0.22, 0.33, 0.5, 0.75, 1.1, 1.6, 2.4, 3.5, 5.2, 7.7, 11.5];
    const dP = t.map((ti, i) => 30 * Math.log(ti + 1) + (i % 2 === 0 ? 2 : -2)); // noisy
    const dSmall = ptaBourdetDerivative(t, dP, 0.05).filter(v => !isNaN(v));
    const dLarge = ptaBourdetDerivative(t, dP, 0.5).filter(v => !isNaN(v));
    const varSmall = Math.max(...dSmall) - Math.min(...dSmall);
    const varLarge = Math.max(...dLarge) - Math.min(...dLarge);
    expect(varLarge).toBeLessThanOrEqual(varSmall + 1); // larger L → less variation
  });

  it("derivative is NaN only at boundary points without neighbours", () => {
    const t  = [1, 100]; // only 2 points, large gap
    const dP = [0, 50];
    const d  = ptaBourdetDerivative(t, dP, 0.1);
    expect(d).toHaveLength(2);
    // Both can compute a one-sided slope
    expect(isNaN(d[0])).toBe(false);
    expect(isNaN(d[1])).toBe(false);
  });
});

describe("ptaDualPorosityDerivative", () => {
  const tD_CD = [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 50, 100, 500];

  it("returns objects with correct array lengths", () => {
    const r = ptaDualPorosityDerivative(tD_CD, 0.1, 1e-5);
    expect(r.PD_arr).toHaveLength(tD_CD.length);
    expect(r.dPD_arr).toHaveLength(tD_CD.length);
    expect(r.tD_CD_arr).toHaveLength(tD_CD.length);
  });

  it("PD values are non-negative", () => {
    const r = ptaDualPorosityDerivative(tD_CD, 0.1, 1e-5);
    r.PD_arr.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  });

  it("PD increases with tD/CD (pressure builds during buildup)", () => {
    const r = ptaDualPorosityDerivative(tD_CD, 0.1, 1e-5);
    for (let i = 0; i < r.PD_arr.length - 1; i++) {
      expect(r.PD_arr[i + 1]).toBeGreaterThanOrEqual(r.PD_arr[i] - 0.01);
    }
  });

  it("returns tD_CD_arr identical to input", () => {
    const r = ptaDualPorosityDerivative(tD_CD, 0.1, 1e-5);
    expect(r.tD_CD_arr).toEqual(tD_CD);
  });

  it("late-time PD is larger than early-time PD (pressure builds)", () => {
    const tAll = [0.01, 0.1, 1, 10, 100, 500];
    const r = ptaDualPorosityDerivative(tAll, 0.05, 1e-5);
    const n = r.PD_arr.length;
    // Late-time PD should exceed early-time PD
    expect(r.PD_arr[n - 1]).toBeGreaterThanOrEqual(r.PD_arr[0]);
  });

  it("different omega values produce different PD curves", () => {
    const r1 = ptaDualPorosityDerivative(tD_CD, 0.05, 1e-5);
    const r2 = ptaDualPorosityDerivative(tD_CD, 0.5,  1e-5);
    const diff = r1.PD_arr.reduce((s, v, i) => s + Math.abs(v - r2.PD_arr[i]), 0);
    expect(diff).toBeGreaterThan(0);
  });
});
