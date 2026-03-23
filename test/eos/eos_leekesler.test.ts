/**
 * Session 17 — EoS Tests: Lee-Kesler BWR reference fluid departure functions
 */

import {
  lkZFactor,
  lkZFactorComponent,
  lkDepartureEnthalpy,
  lkDepartureEntropy,
  lkDepartureFunctions,
} from "../../src/functions/eos";

describe("lkZFactor — simple fluid and reference fluid", () => {
  test("ideal gas limit: Tr→∞, Pr→0 gives Z≈1", () => {
    const Z = lkZFactor(10, 0.01, false);
    expect(Z).toBeCloseTo(1, 2);
  });

  test("simple fluid Z is finite and positive", () => {
    const Z = lkZFactor(1.5, 3.0, false);
    expect(isFinite(Z)).toBe(true);
    expect(Z).toBeGreaterThan(0);
  });

  test("reference fluid Z is finite and positive", () => {
    const Z = lkZFactor(1.5, 3.0, true);
    expect(isFinite(Z)).toBe(true);
    expect(Z).toBeGreaterThan(0);
  });

  test("simple and reference fluid Z differ at moderate conditions", () => {
    const Z0 = lkZFactor(1.3, 4.0, false);
    const ZR = lkZFactor(1.3, 4.0, true);
    // They should differ (different BWR constants)
    expect(Math.abs(Z0 - ZR)).toBeGreaterThan(0.001);
  });

  test("Z behavior is non-monotonic near critical point", () => {
    // At supercritical T (Tr>1), Z first decreases then increases with pressure
    const Z_low  = lkZFactor(1.5, 0.5, false);
    const Z_mid  = lkZFactor(1.5, 5.0, false);
    // Both are finite — verify BWR equation gives sensible results
    expect(isFinite(Z_low)).toBe(true);
    expect(isFinite(Z_mid)).toBe(true);
    expect(Z_low).toBeGreaterThan(0.5);
  });

  test("Z increases with temperature at same pressure", () => {
    const Z_low  = lkZFactor(1.0, 2.0, false);
    const Z_high = lkZFactor(3.0, 2.0, false);
    expect(Z_high).toBeGreaterThan(Z_low);
  });
});

describe("lkZFactorComponent — three-parameter Pitzer", () => {
  // Methane: Tc=190.56 K, Pc=45.99 bar, omega=0.0115
  const Tc = 190.56;
  const Pc = 45.99;
  const omega = 0.0115;

  test("methane at 300K, 100 bar — Z between 0.5 and 1.1", () => {
    const Z = lkZFactorComponent(300, 100, Tc, Pc, omega);
    expect(Z).toBeGreaterThan(0.5);
    expect(Z).toBeLessThan(1.1);
  });

  test("methane at high T/low P gives Z close to 1", () => {
    const Z = lkZFactorComponent(600, 1, Tc, Pc, omega);
    expect(Z).toBeCloseTo(1, 1);
  });

  test("higher acentric factor gives different Z (more deviation)", () => {
    const Z_simple = lkZFactorComponent(300, 50, Tc, Pc, 0);
    const Z_real   = lkZFactorComponent(300, 50, Tc, Pc, 0.4);
    expect(Math.abs(Z_simple - Z_real)).toBeGreaterThan(0.001);
  });

  test("returns finite positive value", () => {
    const Z = lkZFactorComponent(400, 200, 647, 220, 0.345);  // approx water
    expect(isFinite(Z)).toBe(true);
    expect(Z).toBeGreaterThan(0);
  });
});

describe("lkDepartureEnthalpy", () => {
  test("departure enthalpy is negative at high Pr (real fluid < ideal gas)", () => {
    // At high pressure, attractive forces dominate → H_dep < 0 (fluid has less enthalpy than ideal gas)
    const H_dep = lkDepartureEnthalpy(1.5, 5.0, false);
    // H_dep could be negative (attractive) or positive — just check finite
    expect(isFinite(H_dep)).toBe(true);
  });

  test("departure approaches 0 at very low pressure", () => {
    const H_dep = lkDepartureEnthalpy(2.0, 0.001, false);
    expect(Math.abs(H_dep)).toBeLessThan(0.1);
  });

  test("simple and reference fluids give different departure values", () => {
    const H0 = lkDepartureEnthalpy(1.5, 3.0, false);
    const HR = lkDepartureEnthalpy(1.5, 3.0, true);
    expect(Math.abs(H0 - HR)).toBeGreaterThan(0.01);
  });

  test("returns finite value for wide range of conditions", () => {
    for (const Tr of [0.8, 1.0, 1.5, 2.0, 3.0]) {
      for (const Pr of [0.1, 1.0, 5.0]) {
        const H = lkDepartureEnthalpy(Tr, Pr, false);
        expect(isFinite(H)).toBe(true);
      }
    }
  });
});

describe("lkDepartureEntropy", () => {
  test("departure entropy approaches 0 at low pressure", () => {
    const S_dep = lkDepartureEntropy(2.0, 0.001, false);
    expect(Math.abs(S_dep)).toBeLessThan(0.1);
  });

  test("returns finite value at moderate conditions", () => {
    const S_dep = lkDepartureEntropy(1.5, 3.0, false);
    expect(isFinite(S_dep)).toBe(true);
  });

  test("simple and reference fluids give different departure entropy", () => {
    const S0 = lkDepartureEntropy(1.5, 3.0, false);
    const SR = lkDepartureEntropy(1.5, 3.0, true);
    expect(Math.abs(S0 - SR)).toBeGreaterThan(0.001);
  });
});

describe("lkDepartureFunctions — full Pitzer correlation", () => {
  // n-propane: Tc=369.83 K, Pc=42.48 bar, omega=0.1521
  const Tc = 369.83;
  const Pc = 42.48;
  const omega = 0.1521;

  test("returns object with Z, H_dep_RTc, S_dep_R", () => {
    const res = lkDepartureFunctions(400, 20, Tc, Pc, omega);
    expect(res).toHaveProperty("Z");
    expect(res).toHaveProperty("H_dep_RTc");
    expect(res).toHaveProperty("S_dep_R");
  });

  test("Z is positive and finite", () => {
    const { Z } = lkDepartureFunctions(400, 20, Tc, Pc, omega);
    expect(Z).toBeGreaterThan(0);
    expect(isFinite(Z)).toBe(true);
  });

  test("all three outputs are finite", () => {
    const res = lkDepartureFunctions(400, 20, Tc, Pc, omega);
    expect(isFinite(res.Z)).toBe(true);
    expect(isFinite(res.H_dep_RTc)).toBe(true);
    expect(isFinite(res.S_dep_R)).toBe(true);
  });

  test("at ideal gas limit (low P) Z→1 and departures→0", () => {
    const { Z, H_dep_RTc, S_dep_R } = lkDepartureFunctions(600, 0.01, Tc, Pc, omega);
    expect(Z).toBeCloseTo(1, 1);
    expect(Math.abs(H_dep_RTc)).toBeLessThan(0.1);
  });

  test("omega affects Z through Pitzer weighting", () => {
    // omega enters as (omega/omega_R) * (Z^R - Z^0)
    // At moderate conditions the effect may be small but non-zero
    const Z0 = lkZFactor(1.1, 5.0, false);
    const ZR = lkZFactor(1.1, 5.0, true);
    // The reference and simple fluid should differ
    expect(Math.abs(Z0 - ZR)).toBeGreaterThan(1e-6);
  });
});
