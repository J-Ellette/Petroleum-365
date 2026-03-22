/**
 * Tests: Vertical Flow Performance (VFP)
 */

import {
  singlePhaseLiquidDeltaP,
  singlePhaseLiquidBHP,
  singlePhaseGasBHP,
  singlePhaseGasOutletP,
  beggsBrillGradient,
  beggsBrillBHP,
  grayGradient,
  hagedornBrownGradient,
  turnerCriticalVelocity,
  minimumGasRateForLiftoff,
  vlpCurveBeggsBrill,
} from "../../src/functions/vfp";

// ─── Single-Phase Liquid ──────────────────────────────────────────────────────

describe("Single-Phase Liquid", () => {
  test("pressure drop increases with flow rate", () => {
    const dp1 = singlePhaseLiquidDeltaP(100, 2, 3000, 1.0);
    const dp2 = singlePhaseLiquidDeltaP(500, 2, 3000, 1.0);
    expect(dp2).toBeGreaterThan(dp1);
  });

  test("pressure drop increases with pipe length", () => {
    const dp1 = singlePhaseLiquidDeltaP(200, 2, 1000, 1.0);
    const dp2 = singlePhaseLiquidDeltaP(200, 2, 5000, 1.0);
    expect(dp2).toBeGreaterThan(dp1);
  });

  test("gravity component dominates in vertical pipe at low flow", () => {
    const dp = singlePhaseLiquidDeltaP(1, 2, 1000, 1.0, 90);
    // ~1000 ft water column ≈ 433 psi; some friction adds to it
    expect(dp).toBeGreaterThan(400);
    expect(dp).toBeLessThan(500);
  });

  test("no gravity at horizontal inclination (angle=0)", () => {
    const dpV = singlePhaseLiquidDeltaP(100, 2, 1000, 1.0, 90);  // vertical
    const dpH = singlePhaseLiquidDeltaP(100, 2, 1000, 1.0, 0);   // horizontal
    expect(dpH).toBeLessThan(dpV);
  });

  test("BHP = inlet + deltaP", () => {
    const dP = singlePhaseLiquidDeltaP(200, 2, 3000, 1.0, 90);
    const BHP = singlePhaseLiquidBHP(100, 200, 2, 3000, 1.0, 90);
    expect(BHP).toBeCloseTo(100 + dP, 3);
  });
});

// ─── Single-Phase Gas ─────────────────────────────────────────────────────────

describe("Single-Phase Gas", () => {
  test("BHP > WHP for upward gas flow (wellbore)", () => {
    const Pbh = singlePhaseGasBHP(500, 5, 2.44, 8000, 600, 0.85, 0.65);
    expect(Pbh).toBeGreaterThan(500);
  });

  test("BHP increases with flow rate (more friction)", () => {
    const Pbh1 = singlePhaseGasBHP(500, 2,  2.44, 8000, 600, 0.85, 0.65);
    const Pbh2 = singlePhaseGasBHP(500, 10, 2.44, 8000, 600, 0.85, 0.65);
    expect(Pbh2).toBeGreaterThan(Pbh1);
  });

  test("BHP increases with well depth", () => {
    const Pbh1 = singlePhaseGasBHP(500, 5, 2.44, 4000, 580, 0.85, 0.65);
    const Pbh2 = singlePhaseGasBHP(500, 5, 2.44, 8000, 600, 0.85, 0.65);
    expect(Pbh2).toBeGreaterThan(Pbh1);
  });

  test("outlet pressure is less than inlet (pipe flow)", () => {
    const P2 = singlePhaseGasOutletP(1000, 10, 4, 5, 540, 0.9, 0.65);
    expect(P2).toBeLessThan(1000);
    expect(P2).toBeGreaterThan(0);
  });

  test("higher flow rate gives lower outlet pressure", () => {
    const P2a = singlePhaseGasOutletP(1000, 10,  4, 5, 540, 0.9, 0.65);
    const P2b = singlePhaseGasOutletP(1000, 100, 4, 5, 540, 0.9, 0.65);
    expect(P2b).toBeLessThan(P2a);
  });
});

// ─── Beggs & Brill ────────────────────────────────────────────────────────────

describe("Beggs & Brill Multiphase", () => {
  test("pressure gradient is positive (upward flow)", () => {
    const grad = beggsBrillGradient(500, 0.5, 3.0, 2000, 150, 0.85, 0.65, 90);
    expect(grad).toBeGreaterThan(0);
  });

  test("gradient increases with liquid rate (more heavy fluid)", () => {
    const g1 = beggsBrillGradient(200,  0.3, 3.0, 2000, 150, 0.85, 0.65, 90);
    const g2 = beggsBrillGradient(1000, 0.3, 3.0, 2000, 150, 0.85, 0.65, 90);
    expect(g2).toBeGreaterThan(g1);
  });

  test("gradient is zero for zero flow", () => {
    const grad = beggsBrillGradient(0, 0, 3.0, 2000, 150, 0.85, 0.65, 90);
    expect(grad).toBe(0);
  });

  test("BHP > WHP for producing well", () => {
    const Pbh = beggsBrillBHP(500, 500, 0.5, 3.0, 8000, 80, 160, 0.85, 0.65);
    expect(Pbh).toBeGreaterThan(500);
  });

  test("BHP increases with flow rate", () => {
    const Pbh1 = beggsBrillBHP(500, 200,  0.2, 3.0, 8000, 80, 160, 0.85, 0.65);
    const Pbh2 = beggsBrillBHP(500, 1000, 1.0, 3.0, 8000, 80, 160, 0.85, 0.65);
    expect(Pbh2).toBeGreaterThan(Pbh1);
  });

  test("VLP curve returns valid BHP for each rate", () => {
    const rates = [100, 300, 600, 1000];
    const vlp = vlpCurveBeggsBrill(rates, 500, 500, 3.0, 8000, 80, 160, 0.85, 0.65);
    expect(vlp.length).toBe(4);
    // All BHP values should exceed wellhead pressure
    for (const point of vlp) {
      expect(point.Pwf).toBeGreaterThan(500);
    }
  });
});

// ─── Gray Correlation ─────────────────────────────────────────────────────────

describe("Gray Gradient (gas-condensate)", () => {
  test("returns positive gradient for gas-condensate well", () => {
    const grad = grayGradient(5, 50, 2.44, 2000, 150, 0.65, 0.75, 20);
    expect(grad).toBeGreaterThan(0);
  });

  test("gradient increases with condensate rate", () => {
    const g1 = grayGradient(5,  10, 2.44, 2000, 150, 0.65, 0.75, 20);
    const g2 = grayGradient(5, 200, 2.44, 2000, 150, 0.65, 0.75, 20);
    expect(g2).toBeGreaterThan(g1);
  });
});

// ─── Hagedorn-Brown Correlation ────────────────────────────────────────────────

describe("Hagedorn-Brown Gradient", () => {
  test("returns positive gradient for oil well", () => {
    const grad = hagedornBrownGradient(500, 0.5, 3.0, 2000, 150, 0.85, 0.65, 2.0);
    expect(grad).toBeGreaterThan(0);
  });

  test("gradient increases with oil rate", () => {
    const g1 = hagedornBrownGradient(200,  0.2, 3.0, 2000, 150, 0.85, 0.65, 2.0);
    const g2 = hagedornBrownGradient(1000, 1.0, 3.0, 2000, 150, 0.85, 0.65, 2.0);
    expect(g2).toBeGreaterThan(g1);
  });
});

// ─── Liquid Loading ───────────────────────────────────────────────────────────

describe("Liquid Loading / Turner Velocity", () => {
  test("critical velocity > 0 ft/s", () => {
    const vc = turnerCriticalVelocity(500, 560, 0.65, 1.07, 60);
    expect(vc).toBeGreaterThan(0);
  });

  test("higher pressure gives higher gas density and lower critical velocity", () => {
    const vc_hi = turnerCriticalVelocity(2000, 560, 0.65, 1.07, 60);
    const vc_lo = turnerCriticalVelocity(200,  560, 0.65, 1.07, 60);
    expect(vc_lo).toBeGreaterThan(vc_hi);
  });

  test("minimum gas rate for liftoff > 0", () => {
    const qmin = minimumGasRateForLiftoff(500, 560, 2.44);
    expect(qmin).toBeGreaterThan(0);
  });

  test("larger tubing requires more gas to prevent loading", () => {
    const q1 = minimumGasRateForLiftoff(500, 560, 2.44);
    const q2 = minimumGasRateForLiftoff(500, 560, 4.00);
    expect(q2).toBeGreaterThan(q1);
  });
});
