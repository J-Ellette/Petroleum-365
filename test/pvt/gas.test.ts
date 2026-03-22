/**
 * Tests: PVT Gas Properties
 */

import {
  pseudoCriticalByLeeKesler,
  pseudoCriticalByKays,
  wichertAzizCorrection,
  zFactorByDAK,
  zFactorByBrillBeggs,
  zFactorByHallYarborough,
  gasViscosityByLeeGonzalez,
  gasDensity,
  gasFVF,
  gasCompressibility,
} from "../../src/functions/pvt/gas";

describe("Pseudo-critical properties", () => {
  test("Lee-Kesler: SG=0.65 natural gas", () => {
    const [Tpc, Ppc] = pseudoCriticalByLeeKesler(0.65);
    // Lee-Kesler correlation: Tpc = 169.2 + 349.5*sg - 74*sg²
    // For sg=0.65: Tpc = 169.2 + 227.175 - 31.265 = 365.11 °R
    // Ppc = 756.8 - 131*0.65 - 3.6*0.65² = 670.1 psia
    expect(Tpc).toBeCloseTo(365.1, 0);
    expect(Ppc).toBeCloseTo(670.1, 0);
  });

  test("Lee-Kesler: SG=0.7", () => {
    const [Tpc, Ppc] = pseudoCriticalByLeeKesler(0.70);
    expect(Tpc).toBeGreaterThan(370);
    expect(Ppc).toBeGreaterThan(650);
  });

  test("Kay's mixing rule: pure methane approximation", () => {
    // Methane: Tc = 343.1 °R, Pc = 667.8 psia; propane: Tc=665.7, Pc=616.3
    // 90% methane, 10% propane
    const [Tpc, Ppc] = pseudoCriticalByKays(
      [0.9, 0.1],
      [343.1, 665.7],
      [667.8, 616.3]
    );
    expect(Tpc).toBeCloseTo(0.9 * 343.1 + 0.1 * 665.7, 1);
    expect(Ppc).toBeCloseTo(0.9 * 667.8 + 0.1 * 616.3, 1);
  });

  test("Wichert-Aziz sour gas correction reduces Tpc", () => {
    const [Tpc, Ppc] = pseudoCriticalByLeeKesler(0.65);
    const [TpcC, PpcC] = wichertAzizCorrection(Tpc, Ppc, 0.05, 0.10); // 5% CO2, 10% H2S
    expect(TpcC).toBeLessThan(Tpc);
    expect(PpcC).not.toBeNaN();
  });

  test("Kay's rule throws on mismatched array lengths", () => {
    expect(() => pseudoCriticalByKays([0.5, 0.5], [300], [650, 700])).toThrow();
  });
});

describe("Z-factor — Dranchuk-Abou-Kassem (DAK)", () => {
  // Reference values from Standing & Katz charts and published examples
  const sg = 0.65;
  const [Tpc, Ppc] = pseudoCriticalByLeeKesler(sg);

  test("Low pressure (P=500 psia, T=200°F) → Z near 1.0", () => {
    const Z = zFactorByDAK(200, 500, Tpc, Ppc);
    expect(Z).toBeGreaterThan(0.9);
    expect(Z).toBeLessThan(1.05);
  });

  test("Moderate pressure (P=2000 psia, T=200°F)", () => {
    const Z = zFactorByDAK(200, 2000, Tpc, Ppc);
    expect(Z).toBeGreaterThan(0.6);
    expect(Z).toBeLessThan(1.0);
  });

  test("High pressure (P=5000 psia, T=250°F)", () => {
    const Z = zFactorByDAK(250, 5000, Tpc, Ppc);
    expect(Z).toBeGreaterThan(0.8);
    expect(Z).toBeLessThan(1.5);
  });

  test("Very low pressure → Z near 1.0", () => {
    const Z = zFactorByDAK(60, 100, Tpc, Ppc);
    expect(Z).toBeGreaterThan(0.95);
  });
});

describe("Z-factor — Brill-Beggs", () => {
  const [Tpc, Ppc] = pseudoCriticalByLeeKesler(0.65);

  test("Returns positive value", () => {
    const Z = zFactorByBrillBeggs(200, 1000, Tpc, Ppc);
    expect(Z).toBeGreaterThan(0);
    expect(Z).toBeLessThan(2);
  });

  test("Agrees with DAK within 10% at moderate conditions", () => {
    const Zdak = zFactorByDAK(200, 1500, Tpc, Ppc);
    const Zbb  = zFactorByBrillBeggs(200, 1500, Tpc, Ppc);
    expect(Math.abs(Zdak - Zbb) / Zdak).toBeLessThan(0.10);
  });
});

describe("Z-factor — Hall-Yarborough", () => {
  const [Tpc, Ppc] = pseudoCriticalByLeeKesler(0.65);

  test("Returns positive value", () => {
    const Z = zFactorByHallYarborough(200, 2000, Tpc, Ppc);
    expect(Z).toBeGreaterThan(0);
    expect(Z).toBeLessThan(2);
  });

  test("Agrees with DAK within 5% at standard conditions", () => {
    const Zdak = zFactorByDAK(200, 2000, Tpc, Ppc);
    const Zhy  = zFactorByHallYarborough(200, 2000, Tpc, Ppc);
    expect(Math.abs(Zdak - Zhy) / Zdak).toBeLessThan(0.05);
  });
});

describe("Gas viscosity — Lee-Gonzalez", () => {
  const [Tpc, Ppc] = pseudoCriticalByLeeKesler(0.65);

  test("Returns physically reasonable viscosity (0.01 – 0.1 cp)", () => {
    const mu = gasViscosityByLeeGonzalez(200, 2000, 0.65);
    expect(mu).toBeGreaterThan(0.005);
    expect(mu).toBeLessThan(0.2);
  });

  test("Viscosity increases with pressure", () => {
    const mu1 = gasViscosityByLeeGonzalez(200, 1000, 0.65);
    const mu2 = gasViscosityByLeeGonzalez(200, 5000, 0.65);
    expect(mu2).toBeGreaterThan(mu1);
  });

  test("Accepts pre-computed Z-factor", () => {
    const Z = zFactorByDAK(200, 2000, Tpc, Ppc);
    const mu = gasViscosityByLeeGonzalez(200, 2000, 0.65, Z);
    expect(mu).toBeGreaterThan(0);
  });
});

describe("Gas FVF and density", () => {
  test("gasFVF at standard conditions ≈ 0.00503/1 = small number", () => {
    // At very low pressure, Bg → Psc*Z*T / (P*Tsc) / 5.615
    const Bg = gasFVF(60, 100, 1.0); // ~sc conditions
    expect(Bg).toBeGreaterThan(0.001);
  });

  test("gasFVF decreases with increasing pressure", () => {
    const Bg1 = gasFVF(200, 1000, 0.9);
    const Bg2 = gasFVF(200, 3000, 0.85);
    expect(Bg2).toBeLessThan(Bg1);
  });

  test("gasDensity is positive and reasonable", () => {
    const rho = gasDensity(200, 2000, 0.65, 0.85);
    expect(rho).toBeGreaterThan(1);
    expect(rho).toBeLessThan(30);
  });

  test("gasCompressibility is positive", () => {
    const [Tpc, Ppc] = pseudoCriticalByLeeKesler(0.65);
    const Z = zFactorByDAK(200, 2000, Tpc, Ppc);
    const cg = gasCompressibility(200, 2000, Tpc, Ppc, Z);
    expect(cg).toBeGreaterThan(0);
  });
});
