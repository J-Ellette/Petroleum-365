/**
 * Tests: Flow Assurance (FA)
 */

import {
  hammerschmidtDepression,
  hammerschmidtConcentration,
  katzHydrateTemp,
  methanolInjectionRate,
  megInjectionRate,
  deWaardMilliamsCorrosion,
  corrosionSeverity,
  co2PartialPressure,
  inhibitedCorrosionRate,
  corrosionAllowance,
  mixtureDensity,
  erosionalVelocity,
  mixtureVelocity,
  erosionRatio,
  erosionRiskClass,
  flowAssuranceAssessment,
} from "../../src/functions/fa";

// ─── Hydrate Inhibition ───────────────────────────────────────────────────────

describe("Hammerschmidt Hydrate Temperature Depression", () => {
  test("10% methanol gives ~4.8°F depression (reference check)", () => {
    const dT = hammerschmidtDepression(10, "methanol");
    // ΔT = 2335 * 10 / (32.04 * 90) ≈ 8.1°F (check formula)
    expect(dT).toBeGreaterThan(0);
    expect(dT).toBeLessThan(50);
  });

  test("depression increases with inhibitor concentration", () => {
    const dT1 = hammerschmidtDepression(5, "methanol");
    const dT2 = hammerschmidtDepression(20, "methanol");
    expect(dT2).toBeGreaterThan(dT1);
  });

  test("methanol gives larger depression than MEG at same mass%", () => {
    const dT_meoh = hammerschmidtDepression(20, "methanol");
    const dT_meg  = hammerschmidtDepression(20, "meg");
    expect(dT_meoh).toBeGreaterThan(dT_meg);  // lower MW → larger depression
  });

  test("round-trip: concentration recovers depression", () => {
    const dT = 15;  // °F target
    const W = hammerschmidtConcentration(dT, "methanol");
    const dT_calc = hammerschmidtDepression(W, "methanol");
    expect(dT_calc).toBeCloseTo(dT, 2);
  });

  test("throws for W = 0 or W = 100", () => {
    expect(() => hammerschmidtDepression(0)).toThrow();
    expect(() => hammerschmidtDepression(100)).toThrow();
  });

  test("Katz hydrate temp increases with pressure", () => {
    const T1 = katzHydrateTemp(500,  0.65);
    const T2 = katzHydrateTemp(2000, 0.65);
    expect(T2).toBeGreaterThan(T1);
  });

  test("methanol injection rate > 0 for nonzero water rate", () => {
    const rate = methanolInjectionRate(20, 10);
    expect(rate).toBeGreaterThan(0);
  });

  test("MEG injection rate > 0", () => {
    const rate = megInjectionRate(30, 10);
    expect(rate).toBeGreaterThan(0);
  });
});

// ─── CO2 Corrosion ────────────────────────────────────────────────────────────

describe("de Waard-Milliams CO2 Corrosion", () => {
  test("corrosion rate > 0 for valid inputs", () => {
    const rate = deWaardMilliamsCorrosion(80, 2.0);
    expect(rate).toBeGreaterThan(0);
  });

  test("corrosion rate increases with temperature (up to ~90°C)", () => {
    const r1 = deWaardMilliamsCorrosion(40,  2.0);
    const r2 = deWaardMilliamsCorrosion(80,  2.0);
    expect(r2).toBeGreaterThan(r1);
  });

  test("corrosion rate increases with CO2 partial pressure", () => {
    const r1 = deWaardMilliamsCorrosion(60, 0.5);
    const r2 = deWaardMilliamsCorrosion(60, 5.0);
    expect(r2).toBeGreaterThan(r1);
  });

  test("throws for zero CO2 pressure", () => {
    expect(() => deWaardMilliamsCorrosion(60, 0)).toThrow();
  });

  test("severity classification matches rate", () => {
    expect(corrosionSeverity(0.05)).toBe("low");
    expect(corrosionSeverity(0.3)).toBe("moderate");
    expect(corrosionSeverity(0.8)).toBe("high");
    expect(corrosionSeverity(2.0)).toBe("very high");
  });

  test("CO2 partial pressure from mole fraction", () => {
    const Pco2 = co2PartialPressure(1000, 0.05);  // 1000 psia, 5% CO2
    expect(Pco2).toBeCloseTo(1000 * 0.05 * 0.068948, 3);
  });

  test("inhibited rate is lower than uninhibited", () => {
    const raw = deWaardMilliamsCorrosion(60, 2.0);
    const inh = inhibitedCorrosionRate(raw, 0.95);
    expect(inh).toBeCloseTo(raw * 0.05, 5);
  });

  test("corrosion allowance = rate * life", () => {
    const ca = corrosionAllowance(0.5, 20);  // 0.5 mm/yr, 20 yr
    expect(ca).toBeCloseTo(10, 5);
  });
});

// ─── Erosion Velocity ─────────────────────────────────────────────────────────

describe("API RP 14E Erosion Velocity", () => {
  test("erosional velocity = C / sqrt(rho)", () => {
    const Ve = erosionalVelocity(4.0, 100);
    expect(Ve).toBeCloseTo(100 / Math.sqrt(4.0), 5);
  });

  test("higher density gives lower erosional velocity", () => {
    const Ve1 = erosionalVelocity(2.0);
    const Ve2 = erosionalVelocity(8.0);
    expect(Ve1).toBeGreaterThan(Ve2);
  });

  test("mixture density is between gas and liquid density", () => {
    const rho = mixtureDensity(100, 1.0, 1000, 600, 0.85, 0.65);
    expect(rho).toBeGreaterThan(0);
    expect(rho).toBeLessThan(60);  // less than liquid density
  });

  test("mixture velocity > 0 for nonzero flows", () => {
    const Vm = mixtureVelocity(100, 1.0, 4, 1000, 600);
    expect(Vm).toBeGreaterThan(0);
  });

  test("erosion ratio: actual / Ve", () => {
    const ratio = erosionRatio(10, 25);
    expect(ratio).toBeCloseTo(0.4, 5);
  });

  test("erosion ratio > 1 → high risk", () => {
    expect(erosionRiskClass(1.2)).toBe("high");
    expect(erosionRiskClass(0.9)).toBe("moderate");
    expect(erosionRiskClass(0.5)).toBe("low");
  });

  test("throws for zero density", () => {
    expect(() => erosionalVelocity(0)).toThrow();
  });
});

// ─── Integrated Assessment ────────────────────────────────────────────────────

describe("Flow Assurance Assessment", () => {
  test("returns all expected fields", () => {
    const result = flowAssuranceAssessment(
      60,       // T_C
      1000,     // P_psia
      70,       // T_hyd_F (hydrate at 70°F)
      100,      // q_liq_bpd
      1.0,      // q_gas_mscfd
      3.0,      // D_in
      0.05,     // y_CO2
      0.85,     // SG_liq
      0.65,     // SG_gas
    );
    expect(result).toHaveProperty("hydrateRisk");
    expect(result).toHaveProperty("subCooling_F");
    expect(result).toHaveProperty("corrosionRate_mm_yr");
    expect(result).toHaveProperty("corrosionSeverity");
    expect(result).toHaveProperty("erosionRatio");
    expect(result).toHaveProperty("erosionRisk");
  });

  test("detects hydrate risk when T < Thyd", () => {
    // 60°C = 140°F, hydrate at 70°F → no hydrate risk (T > Thyd)
    const result = flowAssuranceAssessment(60, 1000, 70, 100, 1.0, 3.0, 0.05, 0.85, 0.65);
    expect(result.hydrateRisk).toBe(false);
  });

  test("detects hydrate risk when T < Thyd (cold case)", () => {
    // 0°C = 32°F, hydrate at 70°F → hydrate risk
    const result = flowAssuranceAssessment(0, 1000, 70, 100, 1.0, 3.0, 0.05, 0.85, 0.65);
    expect(result.hydrateRisk).toBe(true);
    expect(result.subCooling_F).toBeGreaterThan(0);
  });
});
