/**
 * Tests: ECO Extended — Monte Carlo / Latin Hypercube Sampling
 */

import {
  ecoLCGRandom,
  ecoLHSSingleVar,
  ecoLHSample,
  ecoInvTransform,
  ecoMonteCarloNPV,
} from "../../src/functions/eco";

// ─── ecoLCGRandom ─────────────────────────────────────────────────────────────

describe("ecoLCGRandom", () => {
  test("returns n samples", () => {
    expect(ecoLCGRandom(42, 10)).toHaveLength(10);
  });

  test("all values in [0, 1)", () => {
    const samples = ecoLCGRandom(123, 100);
    samples.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
  });

  test("deterministic: same seed → same sequence", () => {
    const a = ecoLCGRandom(7, 20);
    const b = ecoLCGRandom(7, 20);
    a.forEach((v, i) => expect(v).toBe(b[i]));
  });

  test("different seeds → different sequences", () => {
    const a = ecoLCGRandom(7, 10);
    const b = ecoLCGRandom(8, 10);
    const diff = a.some((v, i) => v !== b[i]);
    expect(diff).toBe(true);
  });
});

// ─── ecoLHSSingleVar ─────────────────────────────────────────────────────────

describe("ecoLHSSingleVar", () => {
  test("returns nSamples values", () => {
    expect(ecoLHSSingleVar(50, 42)).toHaveLength(50);
  });

  test("all values in [0, 1)", () => {
    const s = ecoLHSSingleVar(100, 99);
    s.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
  });

  test("each stratum [i/n, (i+1)/n) has exactly one sample", () => {
    const n = 20;
    const s = ecoLHSSingleVar(n, 42);
    const strata = new Array(n).fill(0);
    s.forEach(v => {
      const stratum = Math.floor(v * n);
      strata[Math.min(stratum, n - 1)]++;
    });
    strata.forEach(count => expect(count).toBe(1));
  });

  test("deterministic: same seed → same sample", () => {
    const a = ecoLHSSingleVar(30, 13);
    const b = ecoLHSSingleVar(30, 13);
    a.forEach((v, i) => expect(v).toBe(b[i]));
  });
});

// ─── ecoLHSample ─────────────────────────────────────────────────────────────

describe("ecoLHSample", () => {
  test("matrix shape: nSamples rows, nVars columns", () => {
    const m = ecoLHSample(50, 4, 42);
    expect(m).toHaveLength(50);
    m.forEach(row => expect(row).toHaveLength(4));
  });

  test("all values in [0, 1)", () => {
    const m = ecoLHSample(30, 3, 7);
    m.forEach(row =>
      row.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      })
    );
  });

  test("each column is independently LHS-stratified", () => {
    const n = 10;
    const m = ecoLHSample(n, 2, 42);
    for (let v = 0; v < 2; v++) {
      const col = m.map(row => row[v]);
      const strata = new Array(n).fill(0);
      col.forEach(val => { strata[Math.floor(val * n)]++; });
      strata.forEach(count => expect(count).toBe(1));
    }
  });

  test("columns are not identical (independent permutations)", () => {
    const m = ecoLHSample(20, 2, 42);
    const col0 = m.map(r => r[0]);
    const col1 = m.map(r => r[1]);
    const identical = col0.every((v, i) => v === col1[i]);
    expect(identical).toBe(false);
  });
});

// ─── ecoInvTransform ─────────────────────────────────────────────────────────

describe("ecoInvTransform — uniform", () => {
  test("u=0 → min", () => {
    expect(ecoInvTransform(0, "uniform", [10, 50])).toBeCloseTo(10, 6);
  });
  test("u=1 → max (approx)", () => {
    expect(ecoInvTransform(0.9999, "uniform", [10, 50])).toBeCloseTo(50, 0);
  });
  test("u=0.5 → midpoint", () => {
    expect(ecoInvTransform(0.5, "uniform", [10, 50])).toBeCloseTo(30, 6);
  });
});

describe("ecoInvTransform — triangular", () => {
  // min=0, mode=5, max=10
  test("u=0 → min", () => {
    expect(ecoInvTransform(0, "triangular", [0, 5, 10])).toBeCloseTo(0, 5);
  });
  test("u at fc=(mode-min)/(max-min)=0.5 → mode", () => {
    // At u=0.5 = fc → x = mode
    expect(ecoInvTransform(0.5, "triangular", [0, 5, 10])).toBeCloseTo(5, 4);
  });
  test("u=1 → max", () => {
    expect(ecoInvTransform(1.0, "triangular", [0, 5, 10])).toBeCloseTo(10, 4);
  });
  test("output within [min, max]", () => {
    for (const u of [0.1, 0.3, 0.7, 0.9]) {
      const x = ecoInvTransform(u, "triangular", [0, 5, 10]);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(10);
    }
  });
});

describe("ecoInvTransform — normal", () => {
  test("u=0.5 → mean", () => {
    expect(ecoInvTransform(0.5, "normal", [100, 20])).toBeCloseTo(100, 0);
  });
  test("u=0.84 → mean + ~1 stddev", () => {
    // Normal CDF(1) ≈ 0.8413
    const x = ecoInvTransform(0.8413, "normal", [0, 1]);
    expect(x).toBeCloseTo(1.0, 1);
  });
  test("u=0.16 → mean − ~1 stddev", () => {
    const x = ecoInvTransform(0.1587, "normal", [0, 1]);
    expect(x).toBeCloseTo(-1.0, 1);
  });
});

describe("ecoInvTransform — lognormal", () => {
  test("always returns positive value", () => {
    for (const u of [0.1, 0.5, 0.9]) {
      expect(ecoInvTransform(u, "lognormal", [5, 0.5])).toBeGreaterThan(0);
    }
  });
  test("u=0.5 → e^mu (median of lognormal)", () => {
    const mu = 5;
    const x  = ecoInvTransform(0.5, "lognormal", [mu, 0.1]);
    expect(x).toBeCloseTo(Math.exp(mu), 0);
  });
});

// ─── ecoMonteCarloNPV ────────────────────────────────────────────────────────

describe("ecoMonteCarloNPV", () => {
  // Simple deterministic NPV: 2 params (price, cost)
  // NPV = price×volume − cost,  volume fixed at 1000 BOE
  const npvFn = (params: number[], _dr: number): number => {
    const [price, cost] = params;
    return price * 1000 - cost;
  };
  const paramDists = [
    { dist: "uniform" as const, params: [50, 80] },   // price $/BOE
    { dist: "uniform" as const, params: [20000, 40000] }, // cost $
  ];

  test("returns an object with expected keys", () => {
    const result = ecoMonteCarloNPV(200, 0.10, paramDists, npvFn, 42);
    expect(result).toHaveProperty("mean");
    expect(result).toHaveProperty("p10");
    expect(result).toHaveProperty("p50");
    expect(result).toHaveProperty("p90");
    expect(result).toHaveProperty("stddev");
    expect(result).toHaveProperty("min");
    expect(result).toHaveProperty("max");
    expect(result).toHaveProperty("samples");
  });

  test("samples length = nSamples", () => {
    const { samples } = ecoMonteCarloNPV(100, 0.10, paramDists, npvFn);
    expect(samples).toHaveLength(100);
  });

  test("p10 < p50 < p90 (ordered percentiles)", () => {
    const { p10, p50, p90 } = ecoMonteCarloNPV(500, 0.10, paramDists, npvFn, 7);
    expect(p10).toBeLessThan(p50);
    expect(p50).toBeLessThan(p90);
  });

  test("min ≤ p10 and p90 ≤ max", () => {
    const { min, p10, p90, max } = ecoMonteCarloNPV(300, 0.10, paramDists, npvFn, 99);
    expect(min).toBeLessThanOrEqual(p10);
    expect(p90).toBeLessThanOrEqual(max);
  });

  test("mean ≈ (50+80)/2 × 1000 − (20000+40000)/2 = 35000", () => {
    // Expected mean NPV ≈ 65/2 × 1000 − 30000 = 32500
    const { mean } = ecoMonteCarloNPV(1000, 0.10, paramDists, npvFn, 42);
    expect(mean).toBeGreaterThan(25000);
    expect(mean).toBeLessThan(40000);
  });

  test("stddev > 0 for random inputs", () => {
    const { stddev } = ecoMonteCarloNPV(500, 0.10, paramDists, npvFn, 13);
    expect(stddev).toBeGreaterThan(0);
  });

  test("triangular distribution MC", () => {
    const triDists = [
      { dist: "triangular" as const, params: [40, 65, 90] },  // price
    ];
    const trivNpvFn = (params: number[], _dr: number): number => params[0] * 1000;
    const { p50 } = ecoMonteCarloNPV(500, 0.10, triDists, trivNpvFn, 17);
    // Median of triangular(40,65,90) ≈ 64 → NPV p50 ≈ 64000
    expect(p50).toBeGreaterThan(55000);
    expect(p50).toBeLessThan(75000);
  });

  test("deterministic: same seed → same mean", () => {
    const r1 = ecoMonteCarloNPV(200, 0.10, paramDists, npvFn, 42);
    const r2 = ecoMonteCarloNPV(200, 0.10, paramDists, npvFn, 42);
    expect(r1.mean).toBe(r2.mean);
  });
});
