/**
 * Tests: Hydraulic Fracturing (FRAC)
 */

import {
  pknAverageWidth,
  pknMaxWidth,
  pknFractureVolume,
  pknFluidEfficiency,
  pknNetPressure,
  kgdAverageWidth,
  kgdFractureVolume,
  radialFractureRadius,
  carterLeakoffCoeff,
  carterCumulativeLoss,
  proppantSettlingVelocity,
  hinderedSettlingVelocity,
  dimensionlessConductivity,
  fracturedWellSkin,
  fractureStimulationRatio,
} from "../../src/functions/frac";

// ─── PKN Geometry ─────────────────────────────────────────────────────────────

describe("PKN Fracture Geometry", () => {
  const mu = 100;     // cp fracturing fluid
  const qi = 15;      // bbl/min injection rate
  const xf = 500;     // ft half-length
  const E  = 4e6;     // psi Young's modulus
  const nu = 0.25;    // Poisson's ratio

  test("average width > 0", () => {
    const w = pknAverageWidth(mu, qi, xf, E, nu);
    expect(w).toBeGreaterThan(0);
  });

  test("width increases with viscosity", () => {
    const w1 = pknAverageWidth(10,  qi, xf, E, nu);
    const w2 = pknAverageWidth(200, qi, xf, E, nu);
    expect(w2).toBeGreaterThan(w1);
  });

  test("width increases with injection rate", () => {
    const w1 = pknAverageWidth(mu, 5,  xf, E, nu);
    const w2 = pknAverageWidth(mu, 30, xf, E, nu);
    expect(w2).toBeGreaterThan(w1);
  });

  test("max width = (4/π) × avg width", () => {
    const w_avg = pknAverageWidth(mu, qi, xf, E, nu);
    const w_max = pknMaxWidth(w_avg);
    expect(w_max).toBeCloseTo((4 / Math.PI) * w_avg, 5);
  });

  test("fracture volume > 0", () => {
    const w = pknAverageWidth(mu, qi, xf, E, nu);
    const V = pknFractureVolume(xf, 100, w);
    expect(V).toBeGreaterThan(0);
  });

  test("fluid efficiency in [0,1]", () => {
    const w = pknAverageWidth(mu, qi, xf, E, nu);
    const Vf = pknFractureVolume(xf, 100, w);
    const eff = pknFluidEfficiency(Vf, Vf * 2.5);  // 60% fluid loss
    expect(eff).toBeGreaterThan(0);
    expect(eff).toBeLessThanOrEqual(1.0);
  });

  test("net pressure > 0", () => {
    const w = pknAverageWidth(mu, qi, xf, E, nu);
    const dP = pknNetPressure(w, xf, E, nu);
    expect(dP).toBeGreaterThan(0);
  });
});

// ─── KGD Geometry ─────────────────────────────────────────────────────────────

describe("KGD Fracture Geometry", () => {
  test("average width > 0", () => {
    const w = kgdAverageWidth(100, 15, 400, 100, 4e6, 0.25);
    expect(w).toBeGreaterThan(0);
  });

  test("volume > 0", () => {
    const w = kgdAverageWidth(100, 15, 400, 100, 4e6, 0.25);
    const V = kgdFractureVolume(400, 100, w);
    expect(V).toBeGreaterThan(0);
  });
});

// ─── Radial Fracture ──────────────────────────────────────────────────────────

describe("Radial Fracture", () => {
  test("radius > 0", () => {
    const R = radialFractureRadius(5000, 4e6, 0.25, 500);
    expect(R).toBeGreaterThan(0);
  });

  test("radius increases with injected volume", () => {
    const R1 = radialFractureRadius(1000,  4e6, 0.25, 500);
    const R2 = radialFractureRadius(10000, 4e6, 0.25, 500);
    expect(R2).toBeGreaterThan(R1);
  });
});

// ─── Carter Leakoff ───────────────────────────────────────────────────────────

describe("Carter Leakoff", () => {
  test("total coefficient < any individual component", () => {
    const C = carterLeakoffCoeff(0.01, 0.02, 0.03);
    expect(C).toBeLessThan(0.01);
    expect(C).toBeGreaterThan(0);
  });

  test("cumulative loss increases with time", () => {
    const V1 = carterCumulativeLoss(0.005, 10000, 30);
    const V2 = carterCumulativeLoss(0.005, 10000, 60);
    expect(V2).toBeGreaterThan(V1);
  });

  test("cumulative loss increases with fracture area", () => {
    const V1 = carterCumulativeLoss(0.005, 5000,  30);
    const V2 = carterCumulativeLoss(0.005, 20000, 30);
    expect(V2).toBeGreaterThan(V1);
  });
});

// ─── Proppant Settling ────────────────────────────────────────────────────────

describe("Proppant Settling", () => {
  test("settling velocity > 0 for denser proppant than fluid", () => {
    const vs = proppantSettlingVelocity(0.022, 165, 65, 500);
    expect(vs).toBeGreaterThan(0);
  });

  test("settling velocity = 0 when proppant density = fluid density", () => {
    const vs = proppantSettlingVelocity(0.022, 65, 65, 500);
    expect(vs).toBe(0);
  });

  test("larger proppant settles faster", () => {
    const vs1 = proppantSettlingVelocity(0.011, 165, 65, 500);  // 40/70 mesh
    const vs2 = proppantSettlingVelocity(0.022, 165, 65, 500);  // 20/40 mesh
    expect(vs2).toBeGreaterThan(vs1);
  });

  test("higher viscosity slows settling", () => {
    const vs1 = proppantSettlingVelocity(0.022, 165, 65, 100);
    const vs2 = proppantSettlingVelocity(0.022, 165, 65, 1000);
    expect(vs1).toBeGreaterThan(vs2);
  });

  test("hindered settling < free settling", () => {
    const vs = proppantSettlingVelocity(0.022, 165, 65, 500);
    const vh = hinderedSettlingVelocity(vs, 0.3);
    expect(vh).toBeLessThan(vs);
  });

  test("throws for negative viscosity", () => {
    expect(() => proppantSettlingVelocity(0.022, 165, 65, -10)).toThrow();
  });
});

// ─── Dimensionless Conductivity and Skin ─────────────────────────────────────

describe("Fracture Dimensionless Conductivity and Skin", () => {
  test("CfD > 0 for valid inputs", () => {
    const CfD = dimensionlessConductivity(100000, 0.25, 5, 300);
    expect(CfD).toBeGreaterThan(0);
  });

  test("CfD increases with fracture permeability", () => {
    const C1 = dimensionlessConductivity(50000,  0.25, 5, 300);
    const C2 = dimensionlessConductivity(200000, 0.25, 5, 300);
    expect(C2).toBeGreaterThan(C1);
  });

  test("fractured well skin is negative (stimulation)", () => {
    const Sf = fracturedWellSkin(300, 0.35, 50);  // CfD=50 (high conductivity)
    expect(Sf).toBeLessThan(0);
  });

  test("longer fracture gives more negative skin", () => {
    const S1 = fracturedWellSkin(100, 0.35, 50);
    const S2 = fracturedWellSkin(500, 0.35, 50);
    expect(S2).toBeLessThan(S1);
  });

  test("low CfD reduces stimulation benefit (less negative skin)", () => {
    const S_hi = fracturedWellSkin(300, 0.35, 50);
    const S_lo = fracturedWellSkin(300, 0.35, 0.5);
    expect(S_lo).toBeGreaterThan(S_hi);
  });

  test("stimulation ratio > 1 with damage", () => {
    const Sf = fracturedWellSkin(300, 0.35, 50);
    const ratio = fractureStimulationRatio(1000, 0.35, Sf, 10);  // S_damage=10
    expect(ratio).toBeGreaterThan(1);
  });
});
