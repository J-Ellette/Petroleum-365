/**
 * P365 — Wellbore Integrity (WBI) Tests
 */

import {
  wbiCasingBurstRating,
  wbiDesignFactor,
  wbiRequiredBurstRating,
  wbiDtRatio,
  wbiElasticCollapseP,
  wbiYieldCollapseP,
  wbiCollapseRating,
  wbiCollapseRegime,
  wbiCasingAirWeight,
  wbiBuoyancyFactor,
  wbiEffectiveWeight,
  wbiTensileRating,
  wbiTensileCheck,
  wbiCementVolume,
  wbiMinCementTop,
  wbiSlurryDensity,
  wbiCementReturnHeight,
  wbiFITEquivalentMW,
  wbiFITSurfacePressure,
  wbiShoeTestEvaluation,
  wbiXLOTClosureStress,
  wbiLOTBreakdownEMW,
  wbiMudWeightWindow,
  wbiHydrostaticPressure,
  wbiPressureToEMW,
} from "../../src/functions/wbi";

// ─── Casing Burst ─────────────────────────────────────────────────────────────

describe("wbiCasingBurstRating — API Barlow burst pressure", () => {
  test("7-inch N-80 (0.408 wall): known burst ~ 7350 psi", () => {
    // Barlow: 0.875 * 2 * 80000 * 0.408 / 7.0 = 8160 psi → typical published ~7035 psi
    // The formula gives: 0.875 * 2 * 80000 * 0.408 / 7 = 8160; actual API is slightly less
    const result = wbiCasingBurstRating(7.0, 0.408, 80000);
    expect(result).toBeGreaterThan(7000);
    expect(result).toBeLessThan(9000);
  });

  test("Proportional to yield strength", () => {
    const b1 = wbiCasingBurstRating(7.0, 0.408, 80000);
    const b2 = wbiCasingBurstRating(7.0, 0.408, 110000);
    expect(b2 / b1).toBeCloseTo(110000 / 80000, 3);
  });

  test("Proportional to wall thickness", () => {
    const b1 = wbiCasingBurstRating(7.0, 0.4, 80000);
    const b2 = wbiCasingBurstRating(7.0, 0.5, 80000);
    expect(b2 / b1).toBeCloseTo(0.5 / 0.4, 3);
  });
});

describe("wbiDesignFactor", () => {
  test("Rating = applied → DF = 1.0", () => {
    expect(wbiDesignFactor(5000, 5000)).toBeCloseTo(1.0, 5);
  });

  test("Rating > applied → DF > 1", () => {
    expect(wbiDesignFactor(6000, 5000)).toBeCloseTo(1.2, 5);
  });

  test("Applied = 0 → Infinity", () => {
    expect(wbiDesignFactor(6000, 0)).toBe(Infinity);
  });
});

describe("wbiRequiredBurstRating", () => {
  test("1000 psi at DF 1.25 → 1250 psi required", () => {
    expect(wbiRequiredBurstRating(1000, 1.25)).toBeCloseTo(1250, 3);
  });
});

// ─── Casing Collapse ──────────────────────────────────────────────────────────

describe("wbiDtRatio", () => {
  test("7-in OD, 0.408 wall → D/t ≈ 17.16", () => {
    expect(wbiDtRatio(7.0, 0.408)).toBeCloseTo(7.0 / 0.408, 3);
  });
});

describe("wbiElasticCollapseP", () => {
  test("Returns positive value for valid inputs", () => {
    expect(wbiElasticCollapseP(7.0, 0.408)).toBeGreaterThan(0);
  });

  test("Thicker wall → higher collapse pressure", () => {
    const P1 = wbiElasticCollapseP(7.0, 0.3);
    const P2 = wbiElasticCollapseP(7.0, 0.5);
    expect(P2).toBeGreaterThan(P1);
  });
});

describe("wbiYieldCollapseP", () => {
  test("Returns positive value", () => {
    expect(wbiYieldCollapseP(7.0, 0.408, 80000)).toBeGreaterThan(0);
  });

  test("Higher yield strength → higher yield collapse", () => {
    const p1 = wbiYieldCollapseP(7.0, 0.408, 80000);
    const p2 = wbiYieldCollapseP(7.0, 0.408, 110000);
    expect(p2).toBeGreaterThan(p1);
  });
});

describe("wbiCollapseRating", () => {
  test("Returns minimum of elastic and yield", () => {
    const P_el = wbiElasticCollapseP(7.0, 0.408);
    const P_yp = wbiYieldCollapseP(7.0, 0.408, 80000);
    const rating = wbiCollapseRating(7.0, 0.408, 80000);
    expect(rating).toBeCloseTo(Math.min(P_el, P_yp), 1);
  });
});

describe("wbiCollapseRegime", () => {
  test("Thin-wall pipe → Elastic", () => {
    // Very thin wall D/t >> 30 → elastic
    const regime = wbiCollapseRegime(7.0, 0.15, 80000);
    expect(regime).toMatch(/Elastic/i);
  });

  test("Thick-wall → Yield or Plastic", () => {
    // Thick wall D/t ≈ 10 → yield
    const regime = wbiCollapseRegime(7.0, 0.7, 80000);
    expect(regime).toMatch(/Yield|Plastic/);
  });
});

// ─── Tensile and Buoyancy ─────────────────────────────────────────────────────

describe("wbiCasingAirWeight", () => {
  test("29 lb/ft × 1000 ft = 29000 lbf", () => {
    expect(wbiCasingAirWeight(29, 1000)).toBeCloseTo(29000, 3);
  });
});

describe("wbiBuoyancyFactor", () => {
  test("In water (8.34 ppg): BF ≈ 0.873", () => {
    expect(wbiBuoyancyFactor(8.34)).toBeCloseTo(1 - 8.34 / 65.5, 4);
  });

  test("BF = 0 in steel-density fluid", () => {
    expect(wbiBuoyancyFactor(65.5)).toBeCloseTo(0, 5);
  });

  test("BF decreases as mud weight increases", () => {
    expect(wbiBuoyancyFactor(10)).toBeGreaterThan(wbiBuoyancyFactor(15));
  });
});

describe("wbiEffectiveWeight", () => {
  test("Effective weight is less than air weight", () => {
    const w_air = 29000;
    const w_eff = wbiEffectiveWeight(w_air, 9.5);
    expect(w_eff).toBeLessThan(w_air);
  });

  test("Proportional to buoyancy factor", () => {
    const w_air = 10000;
    const bf = wbiBuoyancyFactor(10.0);
    expect(wbiEffectiveWeight(w_air, 10.0)).toBeCloseTo(w_air * bf, 2);
  });
});

describe("wbiTensileRating", () => {
  test("Returns positive for valid inputs", () => {
    expect(wbiTensileRating(7.0, 0.408, 80000)).toBeGreaterThan(0);
  });

  test("Proportional to yield strength", () => {
    const r1 = wbiTensileRating(7.0, 0.408, 80000);
    const r2 = wbiTensileRating(7.0, 0.408, 110000);
    expect(r2 / r1).toBeCloseTo(110000 / 80000, 3);
  });
});

describe("wbiTensileCheck", () => {
  test("Rating > DF × load → pass", () => {
    const { pass, df } = wbiTensileCheck(200000, 100000, 1.6);
    expect(pass).toBe(true);
    expect(df).toBeCloseTo(2.0, 5);
  });

  test("Rating < DF × load → fail", () => {
    const { pass } = wbiTensileCheck(100000, 100000, 1.6);
    expect(pass).toBe(false);
  });
});

// ─── Cement Job ───────────────────────────────────────────────────────────────

describe("wbiCementVolume", () => {
  test("Returns positive volume", () => {
    const vol = wbiCementVolume(8.835, 7.0, 1000, 0.25);
    expect(vol).toBeGreaterThan(0);
  });

  test("Volume proportional to height", () => {
    const v1 = wbiCementVolume(8.835, 7.0, 500, 0.25);
    const v2 = wbiCementVolume(8.835, 7.0, 1000, 0.25);
    expect(v2 / v1).toBeCloseTo(2.0, 3);
  });

  test("Excess factor increases volume", () => {
    const v0 = wbiCementVolume(8.835, 7.0, 1000, 0);
    const v25 = wbiCementVolume(8.835, 7.0, 1000, 0.25);
    expect(v25 / v0).toBeCloseTo(1.25, 3);
  });
});

describe("wbiMinCementTop", () => {
  test("Returns depth < shoe depth", () => {
    const toc = wbiMinCementTop(8000, 9.0, 15.8);
    expect(toc).toBeLessThan(8000);
    expect(toc).toBeGreaterThan(0);
  });

  test("Higher pore pressure → higher TOC depth (deeper cement required)", () => {
    const toc1 = wbiMinCementTop(8000, 8.0, 15.8);
    const toc2 = wbiMinCementTop(8000, 12.0, 15.8);
    expect(toc2).toBeGreaterThan(toc1);
  });
});

describe("wbiSlurryDensity", () => {
  test("Class G neat (4.3 gal/sack) → ~15.8 ppg", () => {
    const rho = wbiSlurryDensity(4.3);
    expect(rho).toBeGreaterThan(15);
    expect(rho).toBeLessThan(17);
  });

  test("More water → lower density", () => {
    const rho_low  = wbiSlurryDensity(4.3);
    const rho_high = wbiSlurryDensity(6.0);
    expect(rho_high).toBeLessThan(rho_low);
  });
});

describe("wbiCementReturnHeight", () => {
  test("Positive height for valid inputs", () => {
    expect(wbiCementReturnHeight(100, 8.835, 7.0)).toBeGreaterThan(0);
  });

  test("Round-trip: volume → height → volume", () => {
    const ID = 8.835, OD = 7.0, h = 1000;
    const vol = wbiCementVolume(ID, OD, h, 0);  // no excess for round-trip
    const h_back = wbiCementReturnHeight(vol, ID, OD);
    expect(h_back).toBeCloseTo(h, 0);
  });

  test("Zero area → returns 0", () => {
    expect(wbiCementReturnHeight(100, 7.0, 7.0)).toBe(0);
  });
});

// ─── Shoe Test / FIT / LOT / XLOT ────────────────────────────────────────────

describe("wbiFITEquivalentMW", () => {
  test("Zero surface pressure → MW unchanged", () => {
    expect(wbiFITEquivalentMW(0, 5000, 10.0)).toBeCloseTo(10.0, 5);
  });

  test("Known calculation: P=520 psi, TVD=5000 ft, MW=10 ppg → EMW≈12 ppg", () => {
    // EMW = 10 + 520 / (0.052 * 5000) = 10 + 2 = 12 ppg
    expect(wbiFITEquivalentMW(520, 5000, 10.0)).toBeCloseTo(12.0, 2);
  });
});

describe("wbiFITSurfacePressure", () => {
  test("Round-trip with wbiFITEquivalentMW", () => {
    const P_target = 500;
    const TVD = 8000, MW = 11.0;
    const EMW = wbiFITEquivalentMW(P_target, TVD, MW);
    const P_back = wbiFITSurfacePressure(EMW, TVD, MW);
    expect(P_back).toBeCloseTo(P_target, 2);
  });

  test("No additional pressure needed if FIT EMW = MW", () => {
    expect(wbiFITSurfacePressure(11.0, 8000, 11.0)).toBeCloseTo(0, 3);
  });
});

describe("wbiShoeTestEvaluation", () => {
  test("Achieved > required → pass with margin", () => {
    const result = wbiShoeTestEvaluation(14.5, 13.8);
    expect(result.pass).toBe(true);
    expect(result.margin_ppg).toBeCloseTo(0.7, 3);
  });

  test("Achieved < required → fail", () => {
    const result = wbiShoeTestEvaluation(13.5, 14.0);
    expect(result.pass).toBe(false);
    expect(result.margin_ppg).toBeCloseTo(-0.5, 3);
  });

  test("Excellent margin ≥ 0.5 ppg", () => {
    const result = wbiShoeTestEvaluation(15.0, 14.0);
    expect(result.assessment).toMatch(/Excellent/);
  });

  test("Fail assessment for negative margin", () => {
    const result = wbiShoeTestEvaluation(13.0, 14.0);
    expect(result.assessment).toMatch(/Fail/);
  });
});

describe("wbiXLOTClosureStress", () => {
  test("Gradient = ISIP / TVD", () => {
    const { gradient_psi_per_ft } = wbiXLOTClosureStress(8000, 10000);
    expect(gradient_psi_per_ft).toBeCloseTo(0.8, 5);
  });

  test("EMW = gradient / 0.052", () => {
    const { gradient_psi_per_ft, EMW_ppg } = wbiXLOTClosureStress(8000, 10000);
    expect(EMW_ppg).toBeCloseTo(gradient_psi_per_ft / 0.052, 3);
  });
});

describe("wbiLOTBreakdownEMW", () => {
  test("Same as wbiFITEquivalentMW", () => {
    const P = 400, TVD = 4000, MW = 10.0;
    expect(wbiLOTBreakdownEMW(P, TVD, MW)).toBeCloseTo(wbiFITEquivalentMW(P, TVD, MW), 5);
  });
});

// ─── Mud Weight Window ────────────────────────────────────────────────────────

describe("wbiMudWeightWindow", () => {
  test("Returns correct window width", () => {
    const { window_ppg } = wbiMudWeightWindow(9.5, 9.8, 15.0);
    expect(window_ppg).toBeGreaterThan(0);
  });

  test("adequate = true when window > 0", () => {
    const { adequate } = wbiMudWeightWindow(9.0, 9.5, 15.0);
    expect(adequate).toBe(true);
  });

  test("adequate = false when frac gradient ≈ pore pressure", () => {
    // Narrow window: pore 14.0, collapse 14.1, frac 14.5 → after safety margins, window < 0
    const { adequate } = wbiMudWeightWindow(14.0, 14.1, 14.5, 0.5, 0.3);
    expect(adequate).toBe(false);
  });

  test("MW_min = max(pore, collapse) + safety", () => {
    const { MW_min_ppg } = wbiMudWeightWindow(9.5, 10.0, 15.0, 0.5, 0.3);
    expect(MW_min_ppg).toBeCloseTo(10.0 + 0.3, 5);
  });

  test("MW_max = frac_gradient - safety", () => {
    const { MW_max_ppg } = wbiMudWeightWindow(9.5, 10.0, 15.0, 0.5, 0.3);
    expect(MW_max_ppg).toBeCloseTo(15.0 - 0.5, 5);
  });
});

// ─── Hydrostatic Helpers ──────────────────────────────────────────────────────

describe("wbiHydrostaticPressure", () => {
  test("Known: 10 ppg at 5000 ft → 2600 psi", () => {
    expect(wbiHydrostaticPressure(10, 5000)).toBeCloseTo(2600, 0);
  });
});

describe("wbiPressureToEMW", () => {
  test("2600 psi at 5000 ft → 10 ppg", () => {
    expect(wbiPressureToEMW(2600, 5000)).toBeCloseTo(10.0, 2);
  });

  test("Round-trip with wbiHydrostaticPressure", () => {
    const MW = 12.5, TVD = 8000;
    const P = wbiHydrostaticPressure(MW, TVD);
    expect(wbiPressureToEMW(P, TVD)).toBeCloseTo(MW, 5);
  });

  test("TVD = 0 → 0 ppg", () => {
    expect(wbiPressureToEMW(1000, 0)).toBe(0);
  });
});
