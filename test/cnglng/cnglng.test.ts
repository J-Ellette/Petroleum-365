/**
 * Tests: CNG / LNG
 */

import {
  cngDensity,
  cngCylinderCapacity,
  cngGGE,
  cngDGE,
  cngFillTime,
  cngCascadeDesign,
  lngDensityGIIGNL,
  lngDensityFromComposition,
  lngBOGRate,
  lngVaporizationEnthalpy,
  lngHeelCalculation,
  lngToMMBtu,
  lngPriceToHenryHub,
  lngTonneToMMBtu,
} from "../../src/functions/cnglng";

// ─── CNG ────────────────────────────────────────────────────────────────────

describe("cngDensity — CNG gas density", () => {
  test("Returns positive density (lb/ft³)", () => {
    const rho = cngDensity(3600, 540, 0.6, 1.0);
    expect(rho).toBeGreaterThan(0);
  });

  test("Density increases with pressure", () => {
    const r1 = cngDensity(1800, 540, 0.6, 1.0);
    const r2 = cngDensity(3600, 540, 0.6, 1.0);
    expect(r2).toBeGreaterThan(r1);
  });

  test("Density decreases with temperature", () => {
    const r1 = cngDensity(3600, 500, 0.6, 1.0);
    const r2 = cngDensity(3600, 600, 0.6, 1.0);
    expect(r2).toBeLessThan(r1);
  });
});

describe("cngCylinderCapacity — usable CNG", () => {
  test("Returns positive usable scf", () => {
    const cap = cngCylinderCapacity(10, 3600, 200, 540, 0.6, 1.0);
    expect(cap).toBeGreaterThan(0);
  });

  test("Larger cylinder holds more gas", () => {
    const c1 = cngCylinderCapacity(5,  3600, 200, 540, 0.6, 1.0);
    const c2 = cngCylinderCapacity(10, 3600, 200, 540, 0.6, 1.0);
    expect(c2).toBeCloseTo(2 * c1, 3);
  });

  test("Higher working pressure increases capacity", () => {
    const c1 = cngCylinderCapacity(10, 2400, 200, 540, 0.6, 1.0);
    const c2 = cngCylinderCapacity(10, 3600, 200, 540, 0.6, 1.0);
    expect(c2).toBeGreaterThan(c1);
  });
});

describe("cngGGE — gasoline gallon equivalents", () => {
  test("1 GGE = 126.67 scf", () => {
    expect(cngGGE(126.67)).toBeCloseTo(1, 3);
  });

  test("Proportional to scf", () => {
    expect(cngGGE(2534)).toBeCloseTo(20, 1);
  });
});

describe("cngDGE — diesel gallon equivalents", () => {
  test("1 DGE = 139 scf", () => {
    expect(cngDGE(139)).toBeCloseTo(1, 3);
  });
});

describe("cngFillTime — time to fill", () => {
  test("1000 scf at 10 scfm = 100 minutes", () => {
    expect(cngFillTime(1000, 10)).toBeCloseTo(100, 5);
  });

  test("Decreases with higher compressor capacity", () => {
    const t1 = cngFillTime(5000, 10);
    const t2 = cngFillTime(5000, 20);
    expect(t2).toBeLessThan(t1);
  });
});

describe("cngCascadeDesign — cascade bank capacities", () => {
  test("Returns array of correct length", () => {
    const banks = cngCascadeDesign(5000, 2, [3600, 2400, 1200], 10, 540, 0.6);
    expect(banks.length).toBe(3);
  });

  test("Higher pressure bank holds more gas", () => {
    const banks = cngCascadeDesign(5000, 2, [3600, 2400, 1200], 10, 540, 0.6);
    expect(banks[0]).toBeGreaterThan(banks[1]);
    expect(banks[1]).toBeGreaterThan(banks[2]);
  });
});

// ─── LNG ────────────────────────────────────────────────────────────────────

describe("lngDensityGIIGNL — LNG density", () => {
  test("Methane at NBP (111.6 K) ≈ 422.5 kg/m³", () => {
    const rho = lngDensityGIIGNL(111.6, 16.04);
    expect(rho).toBeCloseTo(422.5, 0);
  });

  test("Density decreases at higher temperature", () => {
    const r1 = lngDensityGIIGNL(111.6, 16.04);
    const r2 = lngDensityGIIGNL(120.0, 16.04);
    expect(r2).toBeLessThan(r1);
  });

  test("Higher MW mixture has higher density", () => {
    const r1 = lngDensityGIIGNL(111.6, 16.04);
    const r2 = lngDensityGIIGNL(111.6, 18.0);
    expect(r2).toBeGreaterThan(r1);
  });
});

describe("lngDensityFromComposition — composition-based density", () => {
  test("Pure methane returns ~422.5 kg/m³ at 111.6 K", () => {
    const rho = lngDensityFromComposition([1.0], 111.6);
    expect(rho).toBeCloseTo(422.5, 0);
  });

  test("Heavier mixture has higher density", () => {
    const r1 = lngDensityFromComposition([1.0, 0.0, 0.0], 111.6);
    const r2 = lngDensityFromComposition([0.7, 0.2, 0.1], 111.6);
    expect(r2).toBeGreaterThan(r1);
  });
});

describe("lngBOGRate — boil-off gas rate", () => {
  test("Returns positive bog_kg_per_day and bog_MJ_per_day", () => {
    const result = lngBOGRate(160000, 0.1, 450, 54.0);
    expect(result.bog_kg_per_day).toBeGreaterThan(0);
    expect(result.bog_MJ_per_day).toBeGreaterThan(0);
  });

  test("BOG = BOR% × total mass / 100 (kg/day)", () => {
    const vol = 100, bor = 0.15, rho = 450;
    const result = lngBOGRate(vol, bor, rho, 54.0);
    expect(result.bog_kg_per_day).toBeCloseTo(vol * rho * bor / 100, 5);
  });
});

describe("lngVaporizationEnthalpy — latent heat", () => {
  test("Returns positive kJ/kg for methane at NBP", () => {
    const Hv = lngVaporizationEnthalpy(111.6, 16.04);
    expect(Hv).toBeGreaterThan(300);
    expect(Hv).toBeLessThan(700);
  });

  test("Decreases as temperature approaches critical", () => {
    const H1 = lngVaporizationEnthalpy(111.6, 16.04);
    const H2 = lngVaporizationEnthalpy(170.0, 16.04);
    expect(H2).toBeLessThan(H1);
  });
});

describe("lngHeelCalculation — remaining LNG after voyage", () => {
  test("Volume decreases over time", () => {
    const v = lngHeelCalculation(200000, 20, 0.1);
    expect(v).toBeLessThan(200000);
  });

  test("No boiloff returns original volume", () => {
    expect(lngHeelCalculation(200000, 20, 0)).toBeCloseTo(200000, 3);
  });
});

describe("lngToMMBtu — energy content", () => {
  test("Returns positive MMBtu", () => {
    const e = lngToMMBtu(1000, 450, 54.0);
    expect(e).toBeGreaterThan(0);
  });

  test("Scales linearly with volume", () => {
    const e1 = lngToMMBtu(500,  450, 54.0);
    const e2 = lngToMMBtu(1000, 450, 54.0);
    expect(e2).toBeCloseTo(2 * e1, 5);
  });
});

describe("lngPriceToHenryHub — netback price", () => {
  test("Returns correct netback", () => {
    const netback = lngPriceToHenryHub(10, 3, 2, 0.5);
    expect(netback).toBeCloseTo(4.5, 5);
  });
});

describe("lngTonneToMMBtu — conversion", () => {
  test("Returns positive MMBtu", () => {
    expect(lngTonneToMMBtu(1000)).toBeGreaterThan(0);
  });

  test("1000 tonnes LNG at 54 MJ/kg = 51.13 MMBtu/tonne × 1000", () => {
    const energy = lngTonneToMMBtu(1000, 54.0);
    // 1000 t × 1000 kg/t × 54 MJ/kg / 1055.06 MJ/MMBtu
    const expected = 1000 * 1000 * 54 / 1055.06;
    expect(energy).toBeCloseTo(expected, 1);
  });
});
