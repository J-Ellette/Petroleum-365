/**
 * Tests: AGA-8 Z-factor
 */

import {
  aga8CharProps,
  aga8MixProps,
  aga8Z,
  aga8Density,
  aga8CompressibilityFactor,
} from "../../src/functions/aga8";

// ─── Component properties ─────────────────────────────────────────────────────

describe("aga8CharProps", () => {
  test("methane critical properties", () => {
    const p = aga8CharProps("C1");
    expect(p.Tc).toBeCloseTo(190.56, 2);
    expect(p.Pc).toBeCloseTo(4.599,  3);
    expect(p.MW).toBeCloseTo(16.043, 3);
    expect(p.omega).toBeCloseTo(0.0115, 4);
  });

  test("nitrogen critical properties", () => {
    const p = aga8CharProps("N2");
    expect(p.Tc).toBeCloseTo(126.19, 2);
    expect(p.Pc).toBeCloseTo(3.396,  3);
  });

  test("throws on unknown component", () => {
    expect(() => aga8CharProps("XX")).toThrow();
  });
});

// ─── Mixture properties ───────────────────────────────────────────────────────

describe("aga8MixProps — pipeline gas (92% C1, 5% C2, 2% C3, 1% N2)", () => {
  const yi   = [0.92, 0.05, 0.02, 0.01];
  const comp = ["C1", "C2", "C3", "N2"];

  test("Tc_mix is a weighted average of component Tc values", () => {
    const { Tc_mix } = aga8MixProps(yi, comp);
    expect(Tc_mix).toBeGreaterThan(150);
    expect(Tc_mix).toBeLessThan(250);
  });

  test("MW_mix ≈ 17.43 g/mol", () => {
    const { MW_mix } = aga8MixProps(yi, comp);
    expect(MW_mix).toBeCloseTo(17.43, 1);
  });

  test("Pc_mix is positive", () => {
    const { Pc_mix } = aga8MixProps(yi, comp);
    expect(Pc_mix).toBeGreaterThan(0);
  });

  test("throws on mismatched arrays", () => {
    expect(() => aga8MixProps([0.5, 0.5], ["C1"])).toThrow();
  });
});

// ─── Z-factor: pure methane ───────────────────────────────────────────────────

describe("aga8Z — pure methane at 1000 psia, 100°F", () => {
  // P = 1000 psia = 6.895 MPa; T = 100°F = 310.93 K
  const P_MPa = 1000 * 0.0068947572932;
  const T_K   = (100 + 459.67) / 1.8;
  const yi    = [1.0];
  const comp  = ["C1"];

  test("Z is in range 0.82–0.90 (physically reasonable)", () => {
    const Z = aga8Z(P_MPa, T_K, yi, comp);
    expect(Z).toBeGreaterThan(0.82);
    expect(Z).toBeLessThan(0.90);
  });

  test("Z < 1 at high pressure (compressibility effect)", () => {
    const Z = aga8Z(P_MPa, T_K, yi, comp);
    expect(Z).toBeLessThan(1.0);
  });
});

describe("aga8Z — pipeline gas at 800 psia, 60°F", () => {
  const P_MPa = 800 * 0.0068947572932;
  const T_K   = (60 + 459.67) / 1.8;
  const yi    = [0.92, 0.05, 0.02, 0.01];
  const comp  = ["C1", "C2", "C3", "N2"];

  test("Z in range 0.86–0.94", () => {
    const Z = aga8Z(P_MPa, T_K, yi, comp);
    expect(Z).toBeGreaterThan(0.86);
    expect(Z).toBeLessThan(0.94);
  });
});

describe("aga8Z — low pressure limit", () => {
  test("Z → 1 at near-atmospheric pressure", () => {
    const P_MPa = 0.101325;  // 1 atm
    const T_K   = 300;
    const Z = aga8Z(P_MPa, T_K, [1], ["C1"]);
    expect(Z).toBeGreaterThan(0.99);
    expect(Z).toBeLessThan(1.01);
  });
});

// ─── Molar density ────────────────────────────────────────────────────────────

describe("aga8Density — pure methane", () => {
  const P_MPa = 5.0;
  const T_K   = 300;

  test("density is positive", () => {
    const rho = aga8Density(P_MPa, T_K, [1], ["C1"]);
    expect(rho).toBeGreaterThan(0);
  });

  test("density increases with pressure", () => {
    const rho1 = aga8Density(2.0, T_K, [1], ["C1"]);
    const rho2 = aga8Density(5.0, T_K, [1], ["C1"]);
    expect(rho2).toBeGreaterThan(rho1);
  });

  test("density decreases with temperature", () => {
    const rho1 = aga8Density(P_MPa, 300, [1], ["C1"]);
    const rho2 = aga8Density(P_MPa, 400, [1], ["C1"]);
    expect(rho1).toBeGreaterThan(rho2);
  });
});

// ─── Field unit wrapper ───────────────────────────────────────────────────────

describe("aga8CompressibilityFactor — field units", () => {
  const yi   = [1.0];
  const comp = ["C1"];

  test("matches aga8Z at equivalent conditions", () => {
    const P_psia = 1000;
    const T_degF = 100;
    const P_MPa  = P_psia * 0.0068947572932;
    const T_K    = (T_degF + 459.67) / 1.8;
    const Z_field = aga8CompressibilityFactor(P_psia, T_degF, yi, comp);
    const Z_si    = aga8Z(P_MPa, T_K, yi, comp);
    expect(Z_field).toBeCloseTo(Z_si, 6);
  });

  test("Z in physical range (0.5 – 1.1) for typical field conditions", () => {
    const Z = aga8CompressibilityFactor(2000, 150, [0.9, 0.1], ["C1", "C2"]);
    expect(Z).toBeGreaterThan(0.5);
    expect(Z).toBeLessThan(1.1);
  });
});
