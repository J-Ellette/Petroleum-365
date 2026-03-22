/**
 * Tests: Gas Lift (GL)
 */

import {
  glTargetGLR,
  glRequiredInjectionRate,
  glTotalGLR,
  thornhillCraver,
  glValveDomePressure,
  glValveTRO,
  glValveClosingPressure,
  glInjectionPressureAtDepth,
  glCriticalFlowCheck,
  glOptimalInjectionDepth,
} from "../../src/functions/gl";

describe("glTargetGLR — producing GLR", () => {
  test("Returns scf/bbl ratio", () => {
    const GLR = glTargetGLR(300, 150000, 200);
    expect(GLR).toBeCloseTo(150000 / 500, 5);
  });

  test("Increases with gas rate", () => {
    const g1 = glTargetGLR(300, 100000, 200);
    const g2 = glTargetGLR(300, 200000, 200);
    expect(g2).toBeGreaterThan(g1);
  });

  test("Decreases with more liquid", () => {
    const g1 = glTargetGLR(500, 150000, 200);
    const g2 = glTargetGLR(500, 150000, 600);
    expect(g2).toBeLessThan(g1);
  });
});

describe("glRequiredInjectionRate — injection gas rate", () => {
  test("Returns positive Mscfd when target > current", () => {
    const rate = glRequiredInjectionRate(500, 400, 200);
    expect(rate).toBeGreaterThan(0);
  });

  test("Returns 0 (or ≤ 0) when target ≤ current GLR", () => {
    const rate = glRequiredInjectionRate(500, 200, 400);
    expect(rate).toBeLessThanOrEqual(0);
  });

  test("Linear with liquid rate", () => {
    const r1 = glRequiredInjectionRate(500,  400, 200);
    const r2 = glRequiredInjectionRate(1000, 400, 200);
    expect(r2).toBeCloseTo(2 * r1, 5);
  });
});

describe("glTotalGLR — combined GLR", () => {
  test("Total GLR ≥ formation GLR", () => {
    const total = glTotalGLR(200, 100, 500);
    expect(total).toBeGreaterThan(200);
  });

  test("Exact calculation: 200 + 100*1000/500 = 400", () => {
    expect(glTotalGLR(200, 100, 500)).toBeCloseTo(400, 5);
  });
});

describe("thornhillCraver — orifice throughput", () => {
  test("Returns positive Mscfd for valid inputs", () => {
    const q = thornhillCraver(1000, 500, 16, 0.65, 620);
    expect(q).toBeGreaterThan(0);
  });

  test("Critical flow gives higher rate than subcritical for same ΔP ratio", () => {
    const q_crit = thornhillCraver(1000, 300, 16, 0.65, 620);  // Pd/Pu = 0.3 < 0.55
    const q_sub  = thornhillCraver(1000, 700, 16, 0.65, 620);  // Pd/Pu = 0.7 > 0.55
    expect(q_crit).toBeGreaterThan(q_sub);
  });

  test("Rate increases with upstream pressure", () => {
    const q1 = thornhillCraver(800,  300, 16, 0.65, 620);
    const q2 = thornhillCraver(1200, 300, 16, 0.65, 620);
    expect(q2).toBeGreaterThan(q1);
  });

  test("Rate increases with port size", () => {
    const q1 = thornhillCraver(1000, 300, 12, 0.65, 620);
    const q2 = thornhillCraver(1000, 300, 20, 0.65, 620);
    expect(q2).toBeGreaterThan(q1);
  });
});

describe("glValveDomePressure — dome pressure at depth", () => {
  test("Increases with depth", () => {
    const P1 = glValveDomePressure(1000, 0.05, 3000);
    const P2 = glValveDomePressure(1000, 0.05, 6000);
    expect(P2).toBeGreaterThan(P1);
  });

  test("Exact calculation", () => {
    expect(glValveDomePressure(1000, 0.05, 4000)).toBeCloseTo(1200, 5);
  });
});

describe("glValveTRO — test rack opening pressure", () => {
  test("TRO > dome pressure for Av/Ab < 0.5", () => {
    const Ptro = glValveTRO(1000, 0.1);
    expect(Ptro).toBeGreaterThan(1000);
  });

  test("Exact formula: 1000/(1-0.1) = 1111.1", () => {
    expect(glValveTRO(1000, 0.1)).toBeCloseTo(1000 / 0.9, 3);
  });
});

describe("glValveClosingPressure", () => {
  test("Returns a finite pressure", () => {
    const Pvc = glValveClosingPressure(1200, 800, 0.1);
    expect(isFinite(Pvc)).toBe(true);
  });
});

describe("glInjectionPressureAtDepth", () => {
  test("Increases with depth", () => {
    const P1 = glInjectionPressureAtDepth(1000, 0.05, 3000);
    const P2 = glInjectionPressureAtDepth(1000, 0.05, 6000);
    expect(P2).toBeGreaterThan(P1);
  });

  test("Exact: 1000 + 0.05 * 4000 = 1200", () => {
    expect(glInjectionPressureAtDepth(1000, 0.05, 4000)).toBeCloseTo(1200, 5);
  });
});

describe("glCriticalFlowCheck", () => {
  test("Returns true for Pdown/Pup < 0.55", () => {
    expect(glCriticalFlowCheck(1000, 400)).toBe(true);
  });

  test("Returns false for Pdown/Pup > 0.55", () => {
    expect(glCriticalFlowCheck(1000, 700)).toBe(false);
  });
});

describe("glOptimalInjectionDepth", () => {
  test("Returns a depth from the candidate array", () => {
    const depths = [2000, 4000, 6000, 8000];
    const result = glOptimalInjectionDepth(0.45, 0.05, 1000, depths);
    expect(depths).toContain(result);
  });

  test("Returns shallower depth when injection pressure is limited", () => {
    const depths = [1000, 3000, 5000, 7000];
    // Low surface pressure: can't reach deep valves
    const d1 = glOptimalInjectionDepth(0.45, 0.05, 500,  depths);
    const d2 = glOptimalInjectionDepth(0.45, 0.05, 2000, depths);
    expect(d2).toBeGreaterThanOrEqual(d1);
  });
});
