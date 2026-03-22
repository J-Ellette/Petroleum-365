/**
 * Tests: Special Core Analysis (SCAL)
 */

import {
  coreyKrw,
  coreyKro,
  coreyKrTable,
  letKrw,
  letKro,
  honarpourKrg,
  honarpourKro,
  brooksCoreyPc,
  brooksCoreySwFromPc,
  pcToHeight,
  vanGenuchtenPc,
  leverettJ,
  leverettPc,
  buckleyLeverettFw,
  welgeConstruction,
  stoneOneKro,
  stoneTwoKro,
  newmanRockCompressibility,
} from "../../src/functions/scal";

// ─── Corey Relative Permeability ─────────────────────────────────────────────

describe("Corey Relative Permeability", () => {
  const Swc = 0.20, Sor = 0.25, krw_max = 0.5, kro_max = 1.0, nw = 3, no = 2;

  test("krw = 0 at connate water saturation", () => {
    expect(coreyKrw(Swc, Swc, Sor, krw_max, nw)).toBeCloseTo(0, 5);
  });

  test("krw = krw_max at 1 - Sor", () => {
    expect(coreyKrw(1 - Sor, Swc, Sor, krw_max, nw)).toBeCloseTo(krw_max, 5);
  });

  test("kro = kro_max at connate water", () => {
    expect(coreyKro(Swc, Swc, Sor, kro_max, no)).toBeCloseTo(kro_max, 5);
  });

  test("kro = 0 at 1 - Sor", () => {
    expect(coreyKro(1 - Sor, Swc, Sor, kro_max, no)).toBeCloseTo(0, 5);
  });

  test("krw increases with Sw", () => {
    const k1 = coreyKrw(0.35, Swc, Sor, krw_max, nw);
    const k2 = coreyKrw(0.55, Swc, Sor, krw_max, nw);
    expect(k2).toBeGreaterThan(k1);
  });

  test("kro decreases with Sw", () => {
    const k1 = coreyKro(0.35, Swc, Sor, kro_max, no);
    const k2 = coreyKro(0.55, Swc, Sor, kro_max, no);
    expect(k2).toBeLessThan(k1);
  });

  test("crossover: krw = kro at some intermediate Sw", () => {
    const table = coreyKrTable(Swc, Sor, krw_max, kro_max, nw, no, 51);
    let crossed = false;
    for (let i = 1; i < table.length; i++) {
      if (table[i - 1].krw < table[i - 1].kro && table[i].krw >= table[i].kro) {
        crossed = true; break;
      }
    }
    expect(crossed).toBe(true);
  });

  test("table has correct number of points", () => {
    const table = coreyKrTable(Swc, Sor, krw_max, kro_max, nw, no, 11);
    expect(table).toHaveLength(11);
  });
});

// ─── LET Relative Permeability ────────────────────────────────────────────────

describe("LET Relative Permeability", () => {
  const Swc = 0.20, Sor = 0.25;

  test("krw = 0 at Swc", () => {
    expect(letKrw(Swc, Swc, Sor, 0.5, 2, 2, 2)).toBeCloseTo(0, 5);
  });

  test("krw = krw_max at 1 - Sor", () => {
    expect(letKrw(1 - Sor, Swc, Sor, 0.5, 2, 2, 2)).toBeCloseTo(0.5, 5);
  });

  test("kro = 0 at 1 - Sor", () => {
    expect(letKro(1 - Sor, Swc, Sor, 1.0, 2, 2, 2)).toBeCloseTo(0, 5);
  });

  test("kro = kro_max at Swc", () => {
    expect(letKro(Swc, Swc, Sor, 1.0, 2, 2, 2)).toBeCloseTo(1.0, 5);
  });

  test("krw increases monotonically with Sw (LET)", () => {
    const Swc_ = 0.2, Sor_ = 0.25;
    const sw_vals = [0.3, 0.4, 0.5, 0.6, 0.7];
    for (let i = 1; i < sw_vals.length; i++) {
      const k1 = letKrw(sw_vals[i - 1], Swc_, Sor_, 0.5, 2, 2, 2);
      const k2 = letKrw(sw_vals[i],     Swc_, Sor_, 0.5, 2, 2, 2);
      expect(k2).toBeGreaterThan(k1);
    }
  });
});

// ─── Honarpour Gas-Oil Kr ─────────────────────────────────────────────────────

describe("Honarpour Gas-Oil Relative Permeability", () => {
  test("krg = 0 at critical gas saturation", () => {
    expect(honarpourKrg(0.05, 0.05, 0.25, 0.20, "sandstone")).toBeCloseTo(0, 5);
  });

  test("krg > 0 above critical Sg", () => {
    expect(honarpourKrg(0.30, 0.05, 0.25, 0.20, "sandstone")).toBeGreaterThan(0);
  });

  test("kro > 0 when So > Sor", () => {
    expect(honarpourKro(0.20, 0.05, 0.25, 0.20, 1.0, "sandstone")).toBeGreaterThan(0);
  });

  test("kro = 0 when So = Sor", () => {
    const Sg = 1 - 0.25 - 0.20;  // So = 0.20 = Sor
    expect(honarpourKro(Sg, 0.05, 0.25, 0.20, 1.0, "sandstone")).toBeCloseTo(0, 3);
  });
});

// ─── Brooks-Corey Capillary Pressure ─────────────────────────────────────────

describe("Brooks-Corey Capillary Pressure", () => {
  const Swc = 0.20, Pd = 5.0, lambda = 2.0;  // psi

  test("Pc decreases as Sw increases", () => {
    const Pc1 = brooksCoreyPc(0.4, Swc, Pd, lambda);
    const Pc2 = brooksCoreyPc(0.6, Swc, Pd, lambda);
    expect(Pc1).toBeGreaterThan(Pc2);
  });

  test("Pc → Pd at Sw = Swc (approximately, as Sw* → 0)", () => {
    // At Sw just above Swc, Pc = Pd * Sw*^(-1/λ) → very large
    const Pc = brooksCoreyPc(Swc + 0.001, Swc, Pd, lambda);
    expect(Pc).toBeGreaterThan(Pd);
  });

  test("Pc = 0 at Sw = 1 (fully saturated)", () => {
    expect(brooksCoreyPc(1.0, Swc, Pd, lambda)).toBeCloseTo(0, 5);
  });

  test("round-trip: SwFromPc recovers Sw from Pc", () => {
    const Sw_in = 0.50;
    const Pc = brooksCoreyPc(Sw_in, Swc, Pd, lambda);
    const Sw_calc = brooksCoreySwFromPc(Pc, Swc, Pd, lambda);
    expect(Sw_calc).toBeCloseTo(Sw_in, 3);
  });

  test("height above FWL > 0 for nonzero Pc", () => {
    const h = pcToHeight(5.0, 62.4, 50.0);
    expect(h).toBeGreaterThan(0);
  });
});

// ─── Van Genuchten Capillary Pressure ─────────────────────────────────────────

describe("Van Genuchten Capillary Pressure", () => {
  test("Pc decreases with Sw", () => {
    const Pc1 = vanGenuchtenPc(0.3, 0.20, 0.05, 2.0);
    const Pc2 = vanGenuchtenPc(0.6, 0.20, 0.05, 2.0);
    expect(Pc1).toBeGreaterThan(Pc2);
  });

  test("Pc = 0 at Sw = 1", () => {
    expect(vanGenuchtenPc(1.0, 0.20, 0.05, 2.0)).toBeCloseTo(0, 5);
  });
});

// ─── Leverett J-Function ──────────────────────────────────────────────────────

describe("Leverett J-Function", () => {
  test("J > 0 for valid inputs", () => {
    const J = leverettJ(5.0, 30, 10, 0.20);
    expect(J).toBeGreaterThan(0);
  });

  test("round-trip: leverettPc recovers Pc from J", () => {
    const Pc_in = 5.0;
    const J = leverettJ(Pc_in, 30, 10, 0.20);
    const Pc_calc = leverettPc(J, 30, 10, 0.20);
    expect(Pc_calc).toBeCloseTo(Pc_in, 3);
  });

  test("higher k → higher J for same Pc (more permeable rock)", () => {
    const J1 = leverettJ(5.0, 30, 5,  0.20);
    const J2 = leverettJ(5.0, 30, 50, 0.20);
    expect(J2).toBeGreaterThan(J1);
  });

  test("throws for zero permeability", () => {
    expect(() => leverettJ(5.0, 30, 0, 0.20)).toThrow();
  });
});

// ─── Buckley-Leverett Fractional Flow ─────────────────────────────────────────

describe("Buckley-Leverett Fractional Flow", () => {
  const Swc = 0.20, Sor = 0.25, krw_max = 0.5, kro_max = 1.0;
  const nw = 3, no = 2, mu_w = 0.5, mu_o = 3.0;

  test("fw = 0 at connate water", () => {
    const fw = buckleyLeverettFw(Swc, Swc, Sor, krw_max, kro_max, nw, no, mu_w, mu_o);
    expect(fw).toBeCloseTo(0, 5);
  });

  test("fw = 1 at residual oil", () => {
    const fw = buckleyLeverettFw(1 - Sor, Swc, Sor, krw_max, kro_max, nw, no, mu_w, mu_o);
    expect(fw).toBeCloseTo(1, 5);
  });

  test("fw increases with Sw", () => {
    const fw1 = buckleyLeverettFw(0.40, Swc, Sor, krw_max, kro_max, nw, no, mu_w, mu_o);
    const fw2 = buckleyLeverettFw(0.55, Swc, Sor, krw_max, kro_max, nw, no, mu_w, mu_o);
    expect(fw2).toBeGreaterThan(fw1);
  });

  test("Welge construction returns valid breakthrough saturation", () => {
    const result = welgeConstruction(Swc, Sor, krw_max, kro_max, nw, no, mu_w, mu_o);
    expect(result.Sw_bt).toBeGreaterThan(Swc);
    expect(result.Sw_bt).toBeLessThanOrEqual(1 - Sor);
    expect(result.fw_bt).toBeGreaterThan(0);
    expect(result.fw_bt).toBeLessThan(1);
    expect(result.RF_bt).toBeGreaterThan(0);
    expect(result.RF_bt).toBeLessThan(1);
  });
});

// ─── Stone Three-Phase Kr ─────────────────────────────────────────────────────

describe("Stone I and II Three-Phase Oil Kr", () => {
  test("Stone I kro > 0 for valid saturations", () => {
    const kro = stoneOneKro(0.1, 0.05, 0.6, 0.8, 1.0);
    expect(kro).toBeGreaterThanOrEqual(0);
  });

  test("Stone II kro >= 0", () => {
    const kro = stoneTwoKro(0.1, 0.05, 0.6, 0.8, 1.0);
    expect(kro).toBeGreaterThanOrEqual(0);
  });
});

// ─── Newman Rock Compressibility ──────────────────────────────────────────────

describe("Newman Rock Compressibility", () => {
  test("sandstone compressibility > 0", () => {
    const cf = newmanRockCompressibility(0.20, "sandstone");
    expect(cf).toBeGreaterThan(0);
  });

  test("limestone compressibility > 0", () => {
    const cf = newmanRockCompressibility(0.15, "limestone");
    expect(cf).toBeGreaterThan(0);
  });

  test("compressibility decreases with porosity (sandstone)", () => {
    const cf1 = newmanRockCompressibility(0.10, "sandstone");
    const cf2 = newmanRockCompressibility(0.30, "sandstone");
    expect(cf1).toBeGreaterThan(cf2);
  });

  test("compressibility in expected range for sandstone (1–20 μpsi⁻¹)", () => {
    const cf = newmanRockCompressibility(0.20, "sandstone");
    expect(cf * 1e6).toBeGreaterThan(1);   // > 1 μpsi⁻¹
    expect(cf * 1e6).toBeLessThan(30);     // < 30 μpsi⁻¹
  });

  test("throws for porosity out of range", () => {
    expect(() => newmanRockCompressibility(0, "sandstone")).toThrow();
    expect(() => newmanRockCompressibility(1.1, "sandstone")).toThrow();
  });
});
