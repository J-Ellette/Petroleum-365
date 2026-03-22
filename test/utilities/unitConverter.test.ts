/**
 * Tests: Unit Converter
 */

import { unitConverter, getCategories, getUnitsForCategory } from "../../src/functions/utilities/unitConverter";

describe("Unit Converter — pressure", () => {
  test("psia → psia (identity)", () => {
    expect(unitConverter(100, "psia", "psia")).toBeCloseTo(100, 6);
  });

  test("1 atm = 14.696 psia", () => {
    expect(unitConverter(1, "atm", "psia")).toBeCloseTo(14.696, 2);
  });

  test("100 psia → bar", () => {
    // 1 psia = 0.0689476 bar → 100 psia = 6.895 bar
    expect(unitConverter(100, "psia", "bar")).toBeCloseTo(100 / 14.5038, 2);
  });

  test("1 MPa → psia ≈ 145.04", () => {
    expect(unitConverter(1, "MPa", "psia")).toBeCloseTo(145.038, 1);
  });

  test("1 bar → kPa = 100", () => {
    // 1 bar = 14.5038 psia; 1 psia = 6.894757 kPa; 14.5038 * 6.894757 ≈ 100.0
    const result = unitConverter(1, "bar", "kPa");
    expect(result).toBeCloseTo(100.0, 0);
  });
});

describe("Unit Converter — temperature", () => {
  test("32°F = 0°C", () => {
    expect(unitConverter(32, "degF", "degC")).toBeCloseTo(0, 5);
  });

  test("0°C = 273.15 K", () => {
    expect(unitConverter(0, "degC", "K")).toBeCloseTo(273.15, 3);
  });

  test("212°F = 100°C (boiling point)", () => {
    expect(unitConverter(212, "degF", "degC")).toBeCloseTo(100, 5);
  });

  test("60°F = 519.67°R", () => {
    expect(unitConverter(60, "degF", "degR")).toBeCloseTo(519.67, 2);
  });

  test("Round-trip: °F → °C → °F", () => {
    const T = 250;
    const roundTrip = unitConverter(unitConverter(T, "degF", "degC"), "degC", "degF");
    expect(roundTrip).toBeCloseTo(T, 5);
  });
});

describe("Unit Converter — length", () => {
  test("1 ft = 12 in", () => {
    expect(unitConverter(1, "ft", "in")).toBeCloseTo(12, 5);
  });

  test("1 m = 3.28084 ft", () => {
    expect(unitConverter(1, "m", "ft")).toBeCloseTo(3.28084, 3);
  });

  test("1 mile = 5280 ft", () => {
    expect(unitConverter(1, "mi", "ft")).toBeCloseTo(5280, 1);
  });
});

describe("Unit Converter — volume", () => {
  test("1 bbl = 42 gal", () => {
    expect(unitConverter(1, "bbl", "gal")).toBeCloseTo(42, 4);
  });

  test("1 bbl = 5.615 ft³", () => {
    expect(unitConverter(1, "bbl", "ft3")).toBeCloseTo(5.615, 2);
  });

  test("1 m³ = 6.2898 bbl", () => {
    expect(unitConverter(1, "m3", "bbl")).toBeCloseTo(6.2898, 2);
  });
});

describe("Unit Converter — energy", () => {
  test("1 MMBTU = 1000 MBTU", () => {
    expect(unitConverter(1, "MMBTU", "MBTU")).toBeCloseTo(1000, 5);
  });

  test("1 MMBTU → GJ ≈ 1.0551", () => {
    // 1 BTU = 1.05505e-3 kJ = 1.05505e-6 GJ; 1 MMBTU = 1e6 BTU = 1.05505 GJ
    expect(unitConverter(1, "MMBTU", "GJ")).toBeCloseTo(1.05505, 2);
  });

  test("1 kWh = 3412 BTU", () => {
    expect(unitConverter(1, "kWh", "BTU")).toBeCloseTo(3412.14, 0);
  });
});

describe("Unit Converter — mass", () => {
  test("1 tonne = 2204.62 lbm", () => {
    expect(unitConverter(1, "tonne", "lbm")).toBeCloseTo(2204.62, 1);
  });

  test("1 kg = 2.20462 lbm", () => {
    expect(unitConverter(1, "kg", "lbm")).toBeCloseTo(2.20462, 3);
  });
});

describe("Unit Converter — scaled units", () => {
  test("640 acre → ft² ≈ 27.9M ft²", () => {
    const result = unitConverter(1, "640 acre", "ft2");
    expect(result).toBeCloseTo(640 * 43560, -2);
  });
});

describe("Unit Converter — error handling", () => {
  test("Unknown unit throws error", () => {
    expect(() => unitConverter(1, "xyz_unknown", "psia")).toThrow();
  });
});

describe("Unit registry", () => {
  test("getCategories returns non-empty array", () => {
    const cats = getCategories();
    expect(cats.length).toBeGreaterThan(5);
    expect(cats).toContain("pressure");
    expect(cats).toContain("temperature");
  });

  test("getUnitsForCategory('pressure') contains psia", () => {
    const units = getUnitsForCategory("pressure");
    expect(units).toContain("psia");
    expect(units).toContain("bar");
    expect(units).toContain("MPa");
  });
});
