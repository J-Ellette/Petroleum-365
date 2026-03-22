/**
 * Tests: Rod Pump (RP)
 */

import {
  rpPumpDisplacement,
  rpFluidLoad,
  rpRodWeight,
  rpPolishedRodLoadUp,
  rpPolishedRodLoadDown,
  rpPeakTorque,
  rpCounterbalanceEffect,
  rpMotorHP,
  rpStrokeLength,
  rpPumpingUnitClass,
} from "../../src/functions/rp";

describe("rpPumpDisplacement — pump volumetric rate", () => {
  test("Returns positive bbl/d", () => {
    const q = rpPumpDisplacement(2.0, 72, 12, 0.85);
    expect(q).toBeGreaterThan(0);
  });

  test("Increases with bore diameter (area squared effect)", () => {
    const q1 = rpPumpDisplacement(1.5, 72, 12, 0.85);
    const q2 = rpPumpDisplacement(2.5, 72, 12, 0.85);
    expect(q2).toBeGreaterThan(q1);
  });

  test("Proportional to stroke length", () => {
    const q1 = rpPumpDisplacement(2.0, 48,  12, 1.0);
    const q2 = rpPumpDisplacement(2.0, 96, 12, 1.0);
    expect(q2).toBeCloseTo(2 * q1, 5);
  });

  test("Proportional to strokes per minute", () => {
    const q1 = rpPumpDisplacement(2.0, 72, 10, 1.0);
    const q2 = rpPumpDisplacement(2.0, 72, 20, 1.0);
    expect(q2).toBeCloseTo(2 * q1, 5);
  });

  test("Pump efficiency reduces displacement linearly", () => {
    const q_full = rpPumpDisplacement(2.0, 72, 12, 1.0);
    const q_eff  = rpPumpDisplacement(2.0, 72, 12, 0.7);
    expect(q_eff).toBeCloseTo(0.7 * q_full, 5);
  });
});

describe("rpFluidLoad — hydrostatic load on pump", () => {
  test("Returns positive load", () => {
    const load = rpFluidLoad(2.0, 72, 0.433, 5000);
    expect(load).toBeGreaterThan(0);
  });

  test("Increases with pump depth", () => {
    const L1 = rpFluidLoad(2.0, 72, 0.433, 4000);
    const L2 = rpFluidLoad(2.0, 72, 0.433, 8000);
    expect(L2).toBeCloseTo(2 * L1, 5);
  });

  test("Increases with bore diameter", () => {
    const L1 = rpFluidLoad(1.5, 72, 0.433, 5000);
    const L2 = rpFluidLoad(2.5, 72, 0.433, 5000);
    expect(L2).toBeGreaterThan(L1);
  });
});

describe("rpRodWeight — rod string air weight", () => {
  test("Returns positive weight", () => {
    const W = rpRodWeight(0.75, 6000);
    expect(W).toBeGreaterThan(0);
  });

  test("Proportional to length", () => {
    const W1 = rpRodWeight(0.75, 4000);
    const W2 = rpRodWeight(0.75, 8000);
    expect(W2).toBeCloseTo(2 * W1, 5);
  });

  test("Larger OD gives more weight", () => {
    const W1 = rpRodWeight(0.625, 6000);
    const W2 = rpRodWeight(0.875, 6000);
    expect(W2).toBeGreaterThan(W1);
  });
});

describe("rpPolishedRodLoadUp — PPRL", () => {
  test("Returns finite PPRL", () => {
    const PPRL = rpPolishedRodLoadUp(15000, 12000, 8000);
    expect(isFinite(PPRL)).toBe(true);
  });

  test("PPRL increases with fluid load", () => {
    const P1 = rpPolishedRodLoadUp(10000, 12000, 8000);
    const P2 = rpPolishedRodLoadUp(20000, 12000, 8000);
    expect(P2).toBeGreaterThan(P1);
  });

  test("PPRL decreases with counterbalance", () => {
    const P1 = rpPolishedRodLoadUp(15000, 12000, 6000);
    const P2 = rpPolishedRodLoadUp(15000, 12000, 10000);
    expect(P2).toBeLessThan(P1);
  });
});

describe("rpPolishedRodLoadDown — MPRL", () => {
  test("Returns finite MPRL", () => {
    const MPRL = rpPolishedRodLoadDown(12000, 8000);
    expect(isFinite(MPRL)).toBe(true);
  });

  test("MPRL decreases with higher buoyancy factor", () => {
    const M1 = rpPolishedRodLoadDown(12000, 8000, 0.85);
    const M2 = rpPolishedRodLoadDown(12000, 8000, 0.95);
    // Higher buoyancy → rod weight reduced more → MPRL = CB - W*bf → higher bf reduces MPRL
    expect(M2).toBeLessThan(M1);
  });
});

describe("rpPeakTorque — gear box peak torque", () => {
  test("Returns positive torque when PPRL > MPRL", () => {
    const T = rpPeakTorque(20000, 8000, 72, 1.0);
    expect(T).toBeGreaterThan(0);
  });

  test("Exact formula: (PPRL - MPRL) * stroke / 4", () => {
    expect(rpPeakTorque(20000, 8000, 72, 1.0)).toBeCloseTo((20000 - 8000) * 72 / 4, 3);
  });
});

describe("rpCounterbalanceEffect — CBE at crank angle", () => {
  test("Zero CBE at 0 degrees", () => {
    expect(rpCounterbalanceEffect(10000, 0, 72)).toBeCloseTo(0, 5);
  });

  test("Maximum CBE at 90 degrees", () => {
    const cbe = rpCounterbalanceEffect(10000, 90, 72);
    expect(cbe).toBeCloseTo(10000, 3);
  });
});

describe("rpMotorHP — motor horsepower", () => {
  test("Returns positive HP", () => {
    expect(rpMotorHP(100000, 10)).toBeGreaterThan(0);
  });

  test("Proportional to torque", () => {
    const h1 = rpMotorHP(100000, 10);
    const h2 = rpMotorHP(200000, 10);
    expect(h2).toBeCloseTo(2 * h1, 5);
  });
});

describe("rpStrokeLength — stroke from crank", () => {
  test("Stroke = 2 * crank radius", () => {
    expect(rpStrokeLength(42)).toBeCloseTo(84, 5);
    expect(rpStrokeLength(30)).toBeCloseTo(60, 5);
  });
});

describe("rpPumpingUnitClass", () => {
  test("Returns a string class designation", () => {
    const cls = rpPumpingUnitClass(20000, 72);
    expect(typeof cls).toBe('string');
    expect(cls.length).toBeGreaterThan(0);
  });

  test("Larger load gives higher class", () => {
    const cls1 = rpPumpingUnitClass(5000, 36);   // small torque → Class I
    const cls2 = rpPumpingUnitClass(50000, 120);  // large torque → higher class
    expect(cls2).not.toBe(cls1);
  });
});
