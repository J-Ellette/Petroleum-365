/**
 * Tests: Heating Value (HV)
 */

import {
  hvMolecularWeight,
  hvSpecificGravity,
  hvHHV,
  hvLHV,
  hvWobbeIndex,
  hvHHV_MJNm3,
  hvLHV_MJNm3,
  hvAnalysis,
} from "../../src/functions/hv";

// ─── Typical pipeline gas: 92% C1, 5% C2, 2% C3, 1% N2 ─────────────────────

const yi   = [0.92, 0.05, 0.02, 0.01];
const comp = ["C1", "C2", "C3", "N2"];

describe("hvMolecularWeight — pipeline gas", () => {
  test("returns expected MW ≈ 17.43 g/mol", () => {
    const mw = hvMolecularWeight(yi, comp);
    expect(mw).toBeCloseTo(17.43, 1);
  });

  test("pure methane → MW = 16.043", () => {
    expect(hvMolecularWeight([1], ["C1"])).toBeCloseTo(16.043, 3);
  });

  test("throws on unknown component", () => {
    expect(() => hvMolecularWeight([1], ["XX"])).toThrow();
  });

  test("throws on mismatched arrays", () => {
    expect(() => hvMolecularWeight([0.5, 0.5], ["C1"])).toThrow();
  });
});

describe("hvSpecificGravity — pipeline gas", () => {
  test("returns SG ≈ 0.617 for pipeline gas", () => {
    const sg = hvSpecificGravity(yi, comp);
    expect(sg).toBeGreaterThan(0.60);
    expect(sg).toBeLessThan(0.65);
  });

  test("pure air → SG = 1.0 (MW = 28.9625)", () => {
    // N2 used as air proxy — not exactly 1.0 but check ratio
    const sg = hvSpecificGravity([1], ["N2"]);
    expect(sg).toBeCloseTo(28.013 / 28.9625, 3);
  });
});

describe("hvHHV — pipeline gas", () => {
  test("HHV ≈ 1070 BTU/scf for pipeline gas", () => {
    const hhv = hvHHV(yi, comp);
    expect(hhv).toBeGreaterThan(1050);
    expect(hhv).toBeLessThan(1090);
  });

  test("pure methane HHV = 1012.0", () => {
    expect(hvHHV([1], ["C1"])).toBeCloseTo(1012.0, 1);
  });

  test("pure nitrogen HHV = 0", () => {
    expect(hvHHV([1], ["N2"])).toBe(0);
  });

  test("HHV > LHV for combustible gases", () => {
    expect(hvHHV(yi, comp)).toBeGreaterThan(hvLHV(yi, comp));
  });
});

describe("hvLHV — pipeline gas", () => {
  test("LHV < HHV", () => {
    expect(hvLHV(yi, comp)).toBeLessThan(hvHHV(yi, comp));
  });

  test("pure methane LHV = 909.4", () => {
    expect(hvLHV([1], ["C1"])).toBeCloseTo(909.4, 1);
  });
});

describe("hvWobbeIndex", () => {
  test("Wobbe Index > HHV (since SG < 1)", () => {
    const sg  = hvSpecificGravity(yi, comp);
    const hhv = hvHHV(yi, comp);
    const wi  = hvWobbeIndex(hhv, sg);
    expect(wi).toBeGreaterThan(hhv);
  });

  test("WI = HHV/sqrt(SG)", () => {
    const sg  = 0.617;
    const hhv = 1027;
    expect(hvWobbeIndex(hhv, sg)).toBeCloseTo(hhv / Math.sqrt(sg), 4);
  });

  test("throws on non-positive SG", () => {
    expect(() => hvWobbeIndex(1000, 0)).toThrow();
  });
});

describe("hvHHV_MJNm3 / hvLHV_MJNm3", () => {
  test("HHV in MJ/Nm³ ≈ 38.3 for pipeline gas", () => {
    const hhv = hvHHV_MJNm3(yi, comp);
    expect(hhv).toBeGreaterThan(36);
    expect(hhv).toBeLessThan(41);
  });

  test("LHV_MJNm3 < HHV_MJNm3", () => {
    expect(hvLHV_MJNm3(yi, comp)).toBeLessThan(hvHHV_MJNm3(yi, comp));
  });

  test("conversion factor: BTU/scf * 0.037259 = MJ/Nm³", () => {
    const hhv_btu = hvHHV(yi, comp);
    const hhv_mj  = hvHHV_MJNm3(yi, comp);
    expect(hhv_mj).toBeCloseTo(hhv_btu * 0.037259, 5);
  });
});

describe("hvAnalysis", () => {
  const result = hvAnalysis(yi, comp);

  test("mw ≈ 17.43", () => expect(result.mw).toBeCloseTo(17.43, 1));
  test("sg in (0.60, 0.65)", () => {
    expect(result.sg).toBeGreaterThan(0.60);
    expect(result.sg).toBeLessThan(0.65);
  });
  test("hhv_BTUscf > lhv_BTUscf", () => {
    expect(result.hhv_BTUscf).toBeGreaterThan(result.lhv_BTUscf);
  });
  test("hhv_MJNm3 consistent with BTU/scf", () => {
    expect(result.hhv_MJNm3).toBeCloseTo(result.hhv_BTUscf * 0.037259, 5);
  });
  test("wobbeIndex > hhv_BTUscf", () => {
    expect(result.wobbeIndex).toBeGreaterThan(result.hhv_BTUscf);
  });
  test("all fields present", () => {
    expect(typeof result.mw).toBe("number");
    expect(typeof result.sg).toBe("number");
    expect(typeof result.hhv_BTUscf).toBe("number");
    expect(typeof result.lhv_BTUscf).toBe("number");
    expect(typeof result.hhv_MJNm3).toBe("number");
    expect(typeof result.lhv_MJNm3).toBe("number");
    expect(typeof result.wobbeIndex).toBe("number");
  });
});

describe("hvAnalysis — richer gas (adds heavier components)", () => {
  const yi2   = [0.80, 0.10, 0.05, 0.03, 0.02];
  const comp2 = ["C1", "C2", "C3", "nC4", "N2"];

  test("HHV increases with heavier composition", () => {
    const hhv_lean  = hvHHV(yi, comp);
    const hhv_rich  = hvHHV(yi2, comp2);
    expect(hhv_rich).toBeGreaterThan(hhv_lean);
  });
});
