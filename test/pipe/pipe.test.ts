/**
 * Tests: Pipe Sizing Calculator
 */

import {
  weymouthFlowSCFH,
  weymouthOutletPressure,
  weymouthMaxLength,
  pipeForward,
  pipeReverse,
  calcFittingEL,
  calcMultiSegment,
  gasVelocity,
  getInsideDiameter,
  recommendPipeSize,
  STEEL_SCH40_ID,
  PE_SDR11_ID,
  PipeMaterial,
} from "../../src/functions/pipe";

describe("Weymouth equation — consistency checks", () => {
  const P1 = 50;    // psig → psia = 64.73
  const P2 = 0.5;   // psig → psia = 15.23
  const L  = 500;   // ft
  const D  = 2.067; // 2" Sch 40 ID
  const SG = 0.60;
  const T  = 60;    // °F
  const Patm = 14.73;

  const P1_psia = P1 + Patm;
  const P2_psia = P2 + Patm;

  test("Flow → MaxLength → Pressure consistency", () => {
    const Q = weymouthFlowSCFH(P1_psia, P2_psia, L, D, SG, T);
    const L_calc = weymouthMaxLength(P1_psia, P2_psia, Q, D, SG, T);
    expect(L_calc).toBeCloseTo(L, 0);
  });

  test("Flow → OutletPressure → Length consistency", () => {
    const Q = weymouthFlowSCFH(P1_psia, P2_psia, L, D, SG, T);
    const P2_calc = weymouthOutletPressure(P1_psia, Q, L, D, SG, T);
    expect(P2_calc).toBeCloseTo(P2_psia, 0);
  });

  test("Flow increases with diameter", () => {
    const Q2 = weymouthFlowSCFH(P1_psia, P2_psia, L, 2.067, SG, T);
    const Q3 = weymouthFlowSCFH(P1_psia, P2_psia, L, 3.068, SG, T);
    expect(Q3).toBeGreaterThan(Q2);
  });

  test("Flow increases with pressure differential", () => {
    const Q1 = weymouthFlowSCFH(P1_psia, P2_psia, L, D, SG, T);
    const Q2 = weymouthFlowSCFH(P1_psia + 10, P2_psia, L, D, SG, T);
    expect(Q2).toBeGreaterThan(Q1);
  });

  test("Throws when P2 ≥ P1", () => {
    expect(() => weymouthFlowSCFH(P2_psia, P1_psia + 10, L, D, SG, T)).toThrow();
  });
});

describe("Pipe forward calculation", () => {
  test("Returns all expected fields", () => {
    const result = pipeForward(50, 0.5, 50000, 2.067);
    expect(result).toHaveProperty("maxLength_ft");
    expect(result).toHaveProperty("Q_BTUh");
    expect(result).toHaveProperty("velocity_fps");
    expect(result).toHaveProperty("velocityOK");
    expect(result.Q_BTUh).toBeCloseTo(50000 * 1020, -3);
  });

  test("Higher flow → longer max length (same pressure)", () => {
    const r1 = pipeForward(50, 0.5, 30000, 2.067);
    const r2 = pipeForward(50, 0.5, 50000, 2.067);
    // Longer flow actually uses up more pressure → shorter max length
    expect(r1.maxLength_ft).toBeGreaterThan(r2.maxLength_ft);
  });

  test("BTUh = SCFH * HHV", () => {
    const result = pipeForward(50, 0.5, 100000, 2.067, 0.60, 60, 1020);
    expect(result.Q_BTUh).toBeCloseTo(100000 * 1020, -2);
  });
});

describe("Pipe reverse calculation", () => {
  test("Returns valid pipe size recommendation", () => {
    const result = pipeReverse(500000, 50, 0.5, 200);
    expect(result.requiredID_in).toBeGreaterThan(0);
    expect(result.steel_nps).toBeTruthy();
    expect(result.pe_nps).toBeTruthy();
    expect(result.steel_id_in).toBeGreaterThanOrEqual(result.requiredID_in);
    expect(result.pe_id_in).toBeGreaterThanOrEqual(result.requiredID_in);
  });

  test("Higher BTUh → larger recommended pipe", () => {
    const r1 = pipeReverse(200000, 50, 0.5, 200);
    const r2 = pipeReverse(2000000, 50, 0.5, 200);
    expect(r2.requiredID_in).toBeGreaterThan(r1.requiredID_in);
  });
});

describe("Fitting equivalent lengths", () => {
  test("Returns valid result for 2-inch pipe", () => {
    const result = calcFittingEL("2", {
      elbow_90: 2,
      tee_branch: 1,
      gate_valve: 3,
    }, 100);
    expect(result.totalFittingEL_ft).toBeGreaterThan(0);
    expect(result.totalEffectiveLength_ft).toBeGreaterThan(100);
    expect(result.fittingPct).toBeGreaterThan(0);
  });

  test("No fittings → zero EL", () => {
    const result = calcFittingEL("2", {}, 100);
    expect(result.totalFittingEL_ft).toBe(0);
    expect(result.totalEffectiveLength_ft).toBe(100);
  });

  test("Throws for unknown NPS", () => {
    expect(() => calcFittingEL("99", { elbow_90: 1 }, 100)).toThrow();
  });
});

describe("Gas velocity", () => {
  test("Velocity is positive", () => {
    const v = gasVelocity(50000, 2.067, 14.73 + 50, 60);
    expect(v).toBeGreaterThan(0);
  });

  test("Larger pipe → lower velocity (same flow)", () => {
    const v2 = gasVelocity(100000, 2.067, 64.73, 60);
    const v3 = gasVelocity(100000, 3.068, 64.73, 60);
    expect(v3).toBeLessThan(v2);
  });
});

describe("Pipe size tables and lookup", () => {
  test("2-inch Sch 40 ID = 2.067 in", () => {
    expect(getInsideDiameter("2", "bare_steel")).toBeCloseTo(2.067, 3);
  });

  test("2-inch PE SDR-11 ID = 1.943 in", () => {
    expect(getInsideDiameter("2", "PE")).toBeCloseTo(1.943, 3);
  });

  test("recommendPipeSize finds next size up for steel", () => {
    const { nps, id_in } = recommendPipeSize(1.5, "bare_steel");
    expect(id_in).toBeGreaterThanOrEqual(1.5);
  });

  test("recommendPipeSize for PE", () => {
    const { nps, id_in } = recommendPipeSize(2.0, "PE");
    expect(id_in).toBeGreaterThanOrEqual(2.0);
  });
});

describe("Multi-segment pipe run", () => {
  test("Single segment: outlet pressure < inlet pressure", () => {
    const segments = [{
      description: "Main run",
      material: "bare_steel" as PipeMaterial,
      nps: "2",
      actualLength_ft: 300,
      fittingEL_ft: 20,
      Q_SCFH: 50000,
    }];
    const result = calcMultiSegment(64.73, segments);
    expect(result.finalPressure_psia).toBeLessThan(64.73);
    expect(result.totalPressureDrop_psi).toBeGreaterThan(0);
  });

  test("Multiple segments: final pressure < inlet pressure", () => {
    const segments = [
      { description: "Seg 1", material: "bare_steel" as PipeMaterial, nps: "2", actualLength_ft: 200, fittingEL_ft: 10, Q_SCFH: 50000 },
      { description: "Seg 2", material: "bare_steel" as PipeMaterial, nps: "1-1/2", actualLength_ft: 150, fittingEL_ft: 5, Q_SCFH: 30000 },
    ];
    const inletPressure = 64.73;
    const result = calcMultiSegment(inletPressure, segments);
    expect(result.finalPressure_psia).toBeLessThan(inletPressure);
    expect(result.totalPressureDrop_psi).toBeGreaterThan(0);
  });

  test("Throws when more than 15 segments", () => {
    const seg = { description: "x", material: "bare_steel" as PipeMaterial, nps: "2", actualLength_ft: 100, fittingEL_ft: 0, Q_SCFH: 1000 };
    const segs = Array(16).fill(seg);
    expect(() => calcMultiSegment(100, segs)).toThrow();
  });

  test("BTUh is calculated for each segment", () => {
    const segments = [{
      description: "Main", material: "bare_steel" as PipeMaterial, nps: "2", actualLength_ft: 100, fittingEL_ft: 0, Q_SCFH: 10000,
    }];
    const result = calcMultiSegment(64.73, segments);
    expect(result.segments[0].Q_BTUh).toBeCloseTo(10000 * 1020, -2);
  });
});
