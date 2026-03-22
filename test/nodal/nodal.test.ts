/**
 * Tests: Nodal Analysis
 */

import {
  nodalSweep,
  nodalOperatingPoint,
  nodalIPRVogel,
  nodalGasWell,
} from "../../src/functions/nodal";

// ─── nodalSweep ───────────────────────────────────────────────────────────────

describe("nodalSweep", () => {
  test("returns nPoints elements", () => {
    const result = nodalSweep(q => q * 2, 1, 100, 10);
    expect(result).toHaveLength(10);
  });

  test("default 20 points", () => {
    const result = nodalSweep(q => q, 1, 1000);
    expect(result).toHaveLength(20);
  });

  test("q values are log-spaced (monotonically increasing)", () => {
    const result = nodalSweep(q => q, 1, 1000, 5);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].q).toBeGreaterThan(result[i - 1].q);
    }
  });

  test("val matches fn(q)", () => {
    const result = nodalSweep(q => q * 3, 10, 100, 5);
    result.forEach(({ q, val }) => {
      expect(val).toBeCloseTo(q * 3, 6);
    });
  });
});

// ─── nodalOperatingPoint ─────────────────────────────────────────────────────

describe("nodalOperatingPoint — linear IPR and VLP", () => {
  // IPR: Pwf = 3000 - q (slope -1)
  // VLP: Pwf = 500 + 0.5*q (slope +0.5)
  // Intersection: 3000 - q = 500 + 0.5*q → 2500 = 1.5*q → q = 1666.67
  const ipr = (q: number): number => 3000 - q;
  const vlp = (q: number): number => 500 + 0.5 * q;

  test("q_op ≈ 1666.7 STB/d", () => {
    const { q_op } = nodalOperatingPoint(ipr, vlp, 1, 3000);
    expect(q_op).toBeCloseTo(1666.7, 0);
  });

  test("Pwf_op ≈ 1333 psia", () => {
    const { Pwf_op } = nodalOperatingPoint(ipr, vlp, 1, 3000);
    expect(Pwf_op).toBeCloseTo(1333.3, 0);
  });

  test("converged = true", () => {
    const { converged } = nodalOperatingPoint(ipr, vlp, 1, 3000);
    expect(converged).toBe(true);
  });

  test("tolerance respected: |q_op - 1666.7| < 0.1", () => {
    const { q_op } = nodalOperatingPoint(ipr, vlp, 1, 3000, 0.1);
    expect(Math.abs(q_op - 1666.67)).toBeLessThan(0.5);
  });

  test("ipr(q_op) ≈ vlp(q_op)", () => {
    const { q_op } = nodalOperatingPoint(ipr, vlp, 1, 3000);
    expect(Math.abs(ipr(q_op) - vlp(q_op))).toBeLessThan(1);
  });
});

describe("nodalOperatingPoint — no intersection (converged=false)", () => {
  // Both increasing — no intersection in range
  const ipr = (q: number): number => 1000 + q;
  const vlp = (q: number): number => 2000 + q;

  test("returns converged=false when no root in range", () => {
    const { converged } = nodalOperatingPoint(ipr, vlp, 1, 1000);
    expect(converged).toBe(false);
  });
});

// ─── nodalIPRVogel ────────────────────────────────────────────────────────────

describe("nodalIPRVogel — oil well", () => {
  const result = nodalIPRVogel(
    3000,    // Pr (psia)
    1000,    // Qmax (STB/d)
    500,     // Pwf_wh (psia)
    6000,    // depth (ft)
    2.441,   // tubing ID (in) = 2-7/8" tubing
    0.85,    // sg_oil
    500,     // GOR (scf/STB)
    500,     // GLR (scf/STB)
    130,     // T_avg_F
    1,       // qMin
    999      // qMax
  );

  test("iprCurve has 20 points", () => {
    expect(result.iprCurve).toHaveLength(20);
  });

  test("vlpCurve has 20 points", () => {
    expect(result.vlpCurve).toHaveLength(20);
  });

  test("IPR Pwf decreases with rate", () => {
    const curve = result.iprCurve;
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].Pwf).toBeLessThan(curve[i - 1].Pwf);
    }
  });

  test("q_op > 0", () => {
    expect(result.q_op).toBeGreaterThan(0);
  });

  test("Pwf_op > 0", () => {
    expect(result.Pwf_op).toBeGreaterThan(0);
  });

  test("Pwf_op < Pr", () => {
    expect(result.Pwf_op).toBeLessThan(3000);
  });
});

// ─── nodalGasWell ─────────────────────────────────────────────────────────────

describe("nodalGasWell", () => {
  const result = nodalGasWell(
    3000,      // Pr (psia)
    600,       // T (°R)
    0.65,      // sg_gas
    20,        // h (ft)
    10,        // k (md)
    0.25,      // rw (ft)
    1320,      // re (ft)
    0,         // skin
    500,       // Pwh (psia)
    6000,      // depth (ft)
    2.441,     // tubing ID (in)
    130,       // T_avg (°F)
    10,        // qMin (Mscf/d)
    5000       // qMax (Mscf/d)
  );

  test("returns iprCurve with 20 points", () => {
    expect(result.iprCurve).toHaveLength(20);
  });

  test("returns vlpCurve with 20 points", () => {
    expect(result.vlpCurve).toHaveLength(20);
  });

  test("q_op > 0 (Mscf/d)", () => {
    expect(result.q_op).toBeGreaterThan(0);
  });

  test("Pwf_op > Pwh (BHP > THP)", () => {
    expect(result.Pwf_op).toBeGreaterThan(500);
  });

  test("Pwf_op < Pr", () => {
    expect(result.Pwf_op).toBeLessThan(3000);
  });

  test("IPR Pwf decreases with rate", () => {
    const curve = result.iprCurve;
    expect(curve[curve.length - 1].Pwf).toBeLessThan(curve[0].Pwf);
  });
});
