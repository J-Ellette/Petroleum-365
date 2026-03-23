/**
 * Tests: Well Production Allocation (WPA)
 */

import {
  wpaProportional,
  wpaEqualShare,
  wpaPIWeighted,
  wpaAOFWeighted,
  wpaCapacityCurtailment,
  wpaReconcile,
  wpaInjectorsProportional,
  wpaVoidageRate,
  wpaRequiredInjectionRate,
  wpaActualVRR,
  wpaFieldSummary,
  wpaFieldPI,
  WpaVoidageWell,
} from "../../src/functions/wpa";

// ─── wpaProportional ──────────────────────────────────────────────────────

describe("wpaProportional", () => {
  test("basic 3-well proportional split", () => {
    const r = wpaProportional(["W1", "W2", "W3"], [1, 2, 3], 600);
    expect(r.wells[0].allocatedRate).toBeCloseTo(100, 5);
    expect(r.wells[1].allocatedRate).toBeCloseTo(200, 5);
    expect(r.wells[2].allocatedRate).toBeCloseTo(300, 5);
  });

  test("fractions sum to 1", () => {
    const r = wpaProportional(["W1", "W2", "W3"], [1, 2, 3], 600);
    const sum = r.wells.reduce((s, w) => s + w.fraction, 0);
    expect(sum).toBeCloseTo(1, 8);
  });

  test("total rate matches target", () => {
    const r = wpaProportional(["W1", "W2"], [3, 7], 1000);
    expect(r.totalRate).toBeCloseTo(1000, 8);
  });

  test("zero-weight wells get zero allocation", () => {
    const r = wpaProportional(["W1", "W2"], [0, 10], 500);
    expect(r.wells[0].allocatedRate).toBeCloseTo(0, 8);
    expect(r.wells[1].allocatedRate).toBeCloseTo(500, 8);
  });

  test("throws on mismatched array lengths", () => {
    expect(() => wpaProportional(["W1", "W2"], [1], 100)).toThrow();
  });
});

// ─── wpaEqualShare ────────────────────────────────────────────────────────

describe("wpaEqualShare", () => {
  test("each well gets equal fraction", () => {
    const r = wpaEqualShare(["W1", "W2", "W3", "W4"], 400);
    r.wells.forEach(w => expect(w.allocatedRate).toBeCloseTo(100, 8));
  });

  test("fractions all equal 1/n", () => {
    const r = wpaEqualShare(["W1", "W2", "W3"], 300);
    r.wells.forEach(w => expect(w.fraction).toBeCloseTo(1 / 3, 8));
  });

  test("single well gets entire rate", () => {
    const r = wpaEqualShare(["W1"], 500);
    expect(r.wells[0].allocatedRate).toBeCloseTo(500, 8);
  });
});

// ─── wpaPIWeighted ────────────────────────────────────────────────────────

describe("wpaPIWeighted", () => {
  test("higher PI gets more allocation", () => {
    const r = wpaPIWeighted(["W1", "W2"], [1.0, 3.0], 400);
    expect(r.wells[1].allocatedRate).toBeGreaterThan(r.wells[0].allocatedRate);
  });

  test("sum of allocations equals field rate", () => {
    const r = wpaPIWeighted(["W1", "W2", "W3"], [2, 3, 5], 1000);
    const sum = r.wells.reduce((s, w) => s + w.allocatedRate, 0);
    expect(sum).toBeCloseTo(1000, 5);
  });
});

// ─── wpaAOFWeighted ───────────────────────────────────────────────────────

describe("wpaAOFWeighted", () => {
  test("allocates proportionally to AOF", () => {
    const r = wpaAOFWeighted(["G1", "G2"], [2000, 8000], 5000);
    expect(r.wells[0].allocatedRate).toBeCloseTo(1000, 5);
    expect(r.wells[1].allocatedRate).toBeCloseTo(4000, 5);
  });
});

// ─── wpaCapacityCurtailment ───────────────────────────────────────────────

describe("wpaCapacityCurtailment", () => {
  test("no capping when all wells below max", () => {
    const r = wpaCapacityCurtailment(
      ["W1", "W2"],
      [1, 1],
      [1000, 1000],
      200,
    );
    expect(r.wells[0].allocatedRate).toBeCloseTo(100, 5);
    expect(r.wells[1].allocatedRate).toBeCloseTo(100, 5);
  });

  test("one well capped: remainder redistributed", () => {
    // W1 has capacity 100, W2 has capacity 1000
    // Proportional: both weight 1, target 300 → W1 would get 150 → capped at 100
    // Remaining 200 goes to W2
    const r = wpaCapacityCurtailment(
      ["W1", "W2"],
      [1, 1],
      [100, 1000],
      300,
    );
    expect(r.wells[0].allocatedRate).toBeCloseTo(100, 2);
    expect(r.wells[1].allocatedRate).toBeCloseTo(200, 2);
  });

  test("total does not exceed target", () => {
    const r = wpaCapacityCurtailment(
      ["W1", "W2", "W3"],
      [1, 2, 3],
      [50, 200, 300],
      500,
    );
    const sum = r.wells.reduce((s, w) => s + w.allocatedRate, 0);
    expect(sum).toBeLessThanOrEqual(500 + 1e-6);
  });

  test("throws on mismatched arrays", () => {
    expect(() =>
      wpaCapacityCurtailment(["W1", "W2"], [1], [100, 100], 200)
    ).toThrow();
  });
});

// ─── wpaReconcile ─────────────────────────────────────────────────────────

describe("wpaReconcile", () => {
  test("scales metered rates to field total", () => {
    // Metered: W1=400, W2=600 (total=1000), field measured=900
    const r = wpaReconcile(["W1", "W2"], [400, 600], 900);
    expect(r.wells[0].allocatedRate).toBeCloseTo(360, 5);
    expect(r.wells[1].allocatedRate).toBeCloseTo(540, 5);
  });

  test("total equals field measured", () => {
    const r = wpaReconcile(["W1", "W2", "W3"], [300, 400, 300], 850);
    const sum = r.wells.reduce((s, w) => s + w.allocatedRate, 0);
    expect(sum).toBeCloseTo(850, 5);
  });

  test("fractions preserved from metered distribution", () => {
    const r = wpaReconcile(["W1", "W2"], [250, 750], 500);
    expect(r.wells[0].fraction).toBeCloseTo(0.25, 8);
    expect(r.wells[1].fraction).toBeCloseTo(0.75, 8);
  });
});

// ─── wpaInjectorsProportional ─────────────────────────────────────────────

describe("wpaInjectorsProportional", () => {
  test("distributes injection by PV weight", () => {
    const r = wpaInjectorsProportional(["I1", "I2"], [3000, 7000], 10000);
    expect(r.wells[0].allocatedRate).toBeCloseTo(3000, 5);
    expect(r.wells[1].allocatedRate).toBeCloseTo(7000, 5);
  });
});

// ─── wpaVoidageRate ───────────────────────────────────────────────────────

describe("wpaVoidageRate", () => {
  test("oil-only: voidage = oil_rate * Bo", () => {
    const wells: WpaVoidageWell[] = [{
      wellId: "W1",
      oilRate: 500,
      waterRate: 0,
      gasRate: 0,
      Bo: 1.2,
      Bg: 0.0,
      Bw: 1.0,
    }];
    expect(wpaVoidageRate(wells, 500)).toBeCloseTo(600, 5);
  });

  test("water-only: voidage = water_rate * Bw", () => {
    const wells: WpaVoidageWell[] = [{
      wellId: "W1",
      oilRate: 0,
      waterRate: 200,
      gasRate: 0,
      Bo: 1.2,
      Bg: 0.0,
      Bw: 1.02,
    }];
    expect(wpaVoidageRate(wells, 0)).toBeCloseTo(204, 5);
  });

  test("total voidage is positive for producing wells", () => {
    const wells: WpaVoidageWell[] = [
      { wellId: "W1", oilRate: 300, waterRate: 100, gasRate: 200, Bo: 1.2, Bg: 0.005, Bw: 1.01 },
      { wellId: "W2", oilRate: 200, waterRate: 50,  gasRate: 100, Bo: 1.15, Bg: 0.005, Bw: 1.01 },
    ];
    const voidage = wpaVoidageRate(wells, 500);
    expect(voidage).toBeGreaterThan(0);
  });
});

// ─── wpaRequiredInjectionRate ─────────────────────────────────────────────

describe("wpaRequiredInjectionRate", () => {
  test("VRR=1: injection = voidage / Bw_inj", () => {
    const rate = wpaRequiredInjectionRate(1000, 1.0, 1.0);
    expect(rate).toBeCloseTo(1000, 8);
  });

  test("VRR=1.05: injection slightly above voidage", () => {
    const rate = wpaRequiredInjectionRate(1000, 1.05, 1.0);
    expect(rate).toBeCloseTo(1050, 5);
  });

  test("throws on zero Bw_inj", () => {
    expect(() => wpaRequiredInjectionRate(1000, 1.0, 0)).toThrow();
  });
});

// ─── wpaActualVRR ─────────────────────────────────────────────────────────

describe("wpaActualVRR", () => {
  test("VRR = 1 when injection equals voidage", () => {
    const vrr = wpaActualVRR(1000, 1.0, 0, 0, 1000);
    expect(vrr).toBeCloseTo(1.0, 8);
  });

  test("VRR > 1 when over-injecting", () => {
    const vrr = wpaActualVRR(1200, 1.0, 0, 0, 1000);
    expect(vrr).toBeCloseTo(1.2, 5);
  });

  test("VRR = 0 when voidage is zero", () => {
    expect(wpaActualVRR(500, 1.0, 0, 0, 0)).toBe(0);
  });
});

// ─── wpaFieldSummary ──────────────────────────────────────────────────────

describe("wpaFieldSummary", () => {
  const wells = [
    { wellId: "W1", oilRate: 300, waterRate: 100, gasRate: 300 },
    { wellId: "W2", oilRate: 200, waterRate: 200, gasRate: 200 },
  ];

  test("totals are correct", () => {
    const s = wpaFieldSummary(wells);
    expect(s.totalOil).toBeCloseTo(500, 8);
    expect(s.totalWater).toBeCloseTo(300, 8);
    expect(s.totalGas).toBeCloseTo(500, 8);
    expect(s.totalLiquid).toBeCloseTo(800, 8);
  });

  test("water cut = waterRate / liquidRate", () => {
    const s = wpaFieldSummary(wells);
    expect(s.waterCut).toBeCloseTo(300 / 800, 8);
  });

  test("GOR = gas / oil", () => {
    const s = wpaFieldSummary(wells);
    expect(s.GOR).toBeCloseTo(500 / 500, 8);
  });

  test("empty wells: zeros", () => {
    const s = wpaFieldSummary([]);
    expect(s.totalOil).toBe(0);
    expect(s.waterCut).toBe(0);
    expect(s.GOR).toBe(0);
  });
});

// ─── wpaFieldPI ───────────────────────────────────────────────────────────

describe("wpaFieldPI", () => {
  test("zero skin: field PI = sum of PIs", () => {
    const piVals = [2, 3, 5];
    const result = wpaFieldPI(piVals, [0, 0, 0]);
    expect(result).toBeCloseTo(10, 5);
  });

  test("positive skin reduces effective PI", () => {
    const noSkin = wpaFieldPI([5], [0]);
    const withSkin = wpaFieldPI([5], [5]);
    expect(withSkin).toBeLessThan(noSkin);
  });

  test("throws on mismatched arrays", () => {
    expect(() => wpaFieldPI([1, 2], [0])).toThrow();
  });
});
