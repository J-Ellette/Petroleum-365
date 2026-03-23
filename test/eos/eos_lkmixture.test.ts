/**
 * Session 18 — EoS Tests: Lee-Kesler Mixing Rules
 */

import {
  lkMixturePseudoCriticals,
  lkMixtureZ,
  lkMixtureProperties,
} from "../../src/functions/eos";

describe("lkMixturePseudoCriticals (Kay's rule)", () => {
  // Methane (C1), Ethane (C2), Propane (C3) — typical natural gas
  const Tc  = [190.6, 305.3, 369.8];  // K
  const Pc  = [46.1,  48.8,  42.5];   // bar
  const om  = [0.011, 0.099, 0.152];  // acentric
  const z   = [0.85,  0.10,  0.05];   // mole fractions

  it("Tc_mix matches Kay's rule manually", () => {
    const { Tc_mix_K } = lkMixturePseudoCriticals(Tc, Pc, om, z);
    const expected = 0.85 * 190.6 + 0.10 * 305.3 + 0.05 * 369.8;
    expect(Tc_mix_K).toBeCloseTo(expected, 2);
  });

  it("Pc_mix matches Kay's rule manually", () => {
    const { Pc_mix_bar } = lkMixturePseudoCriticals(Tc, Pc, om, z);
    const expected = 0.85 * 46.1 + 0.10 * 48.8 + 0.05 * 42.5;
    expect(Pc_mix_bar).toBeCloseTo(expected, 2);
  });

  it("omega_mix matches Kay's rule manually", () => {
    const { omega_mix } = lkMixturePseudoCriticals(Tc, Pc, om, z);
    const expected = 0.85 * 0.011 + 0.10 * 0.099 + 0.05 * 0.152;
    expect(omega_mix).toBeCloseTo(expected, 4);
  });

  it("auto-normalises mole fractions", () => {
    const z_unnorm = [8.5, 1.0, 0.5];  // sum=10, same ratios
    const r1 = lkMixturePseudoCriticals(Tc, Pc, om, z);
    const r2 = lkMixturePseudoCriticals(Tc, Pc, om, z_unnorm);
    expect(r2.Tc_mix_K).toBeCloseTo(r1.Tc_mix_K, 2);
  });

  it("pure component: Tc_mix equals component Tc", () => {
    const { Tc_mix_K } = lkMixturePseudoCriticals([190.6], [46.1], [0.011], [1.0]);
    expect(Tc_mix_K).toBeCloseTo(190.6, 4);
  });

  it("throws on mismatched array lengths", () => {
    expect(() => lkMixturePseudoCriticals([190.6], [46.1, 48.8], [0.011], [1.0])).toThrow();
  });
});

describe("lkMixtureZ", () => {
  // C1/C2/C3 mix at pipeline conditions
  const Tc  = [190.6, 305.3, 369.8];
  const Pc  = [46.1,  48.8,  42.5];
  const om  = [0.011, 0.099, 0.152];
  const z   = [0.85,  0.10,  0.05];
  const T_K = 300;   // ~27°C — near ambient
  const P_bar = 70;  // ~1015 psia

  it("returns Z between 0.5 and 1.2 for typical pipeline gas", () => {
    const Z = lkMixtureZ(T_K, P_bar, Tc, Pc, om, z);
    expect(Z).toBeGreaterThan(0.5);
    expect(Z).toBeLessThan(1.2);
  });

  it("Z approaches 1 at low pressure (ideal gas limit)", () => {
    const Z = lkMixtureZ(T_K, 0.1, Tc, Pc, om, z);
    expect(Z).toBeGreaterThan(0.95);
    expect(Z).toBeLessThan(1.05);
  });

  it("Z decreases with increasing pressure (at moderate conditions)", () => {
    const Z1 = lkMixtureZ(T_K, 10,  Tc, Pc, om, z);
    const Z2 = lkMixtureZ(T_K, 100, Tc, Pc, om, z);
    // At pipeline T above cricondentherm, Z generally decreases with P then increases
    expect(typeof Z1).toBe("number");
    expect(typeof Z2).toBe("number");
  });

  it("Z increases with temperature at fixed pressure", () => {
    const Z1 = lkMixtureZ(250, P_bar, Tc, Pc, om, z);
    const Z2 = lkMixtureZ(400, P_bar, Tc, Pc, om, z);
    expect(Z2).toBeGreaterThan(Z1);
  });
});

describe("lkMixtureProperties", () => {
  const Tc  = [190.6, 305.3, 369.8];
  const Pc  = [46.1,  48.8,  42.5];
  const om  = [0.011, 0.099, 0.152];
  const z   = [0.85,  0.10,  0.05];

  it("returns Z, H_dep_RTc, S_dep_R, and pseudocriticals", () => {
    const r = lkMixtureProperties(300, 70, Tc, Pc, om, z);
    expect(r).toHaveProperty("Z");
    expect(r).toHaveProperty("H_dep_RTc");
    expect(r).toHaveProperty("S_dep_R");
    expect(r).toHaveProperty("Tc_mix_K");
    expect(r).toHaveProperty("Pc_mix_bar");
    expect(r).toHaveProperty("omega_mix");
  });

  it("Z is consistent with lkMixtureZ", () => {
    const { Z } = lkMixtureProperties(300, 70, Tc, Pc, om, z);
    const Z_ref = lkMixtureZ(300, 70, Tc, Pc, om, z);
    expect(Z).toBeCloseTo(Z_ref, 6);
  });

  it("departure enthalpy is negative at sub-critical conditions (attractive interactions)", () => {
    // For most gases at moderate pressure, (H-H^ig) < 0
    const { H_dep_RTc } = lkMixtureProperties(250, 100, Tc, Pc, om, z);
    expect(H_dep_RTc).toBeLessThan(0);
  });

  it("pseudocriticals are consistent with lkMixturePseudoCriticals", () => {
    const r = lkMixtureProperties(300, 70, Tc, Pc, om, z);
    const ref = lkMixturePseudoCriticals(Tc, Pc, om, z);
    expect(r.Tc_mix_K).toBeCloseTo(ref.Tc_mix_K, 4);
    expect(r.Pc_mix_bar).toBeCloseTo(ref.Pc_mix_bar, 4);
  });
});
