/**
 * Session 18 — SIM Tests: CMG STARS Keyword Generators
 */

import {
  simStarsGrid,
  simStarsPoro,
  simStarsPerm,
  simStarsTemp,
} from "../../src/functions/sim";

describe("simStarsGrid", () => {
  it("generates GRID CART header with correct dimensions", () => {
    const result = simStarsGrid(10, 8, 5, 100, 100, 20);
    expect(result).toContain("GRID CART 10 8 5");
  });

  it("generates DI, DJ, DK sections", () => {
    const result = simStarsGrid(3, 3, 2, 100, 100, 20);
    expect(result).toContain("DI CON");
    expect(result).toContain("DJ CON");
    expect(result).toContain("DK CON");
  });

  it("uniform DI contains correct count of values", () => {
    const result = simStarsGrid(5, 4, 3, 100, 150, 25);
    const lines  = result.split("\n");
    // DI line followed by values line
    const diIdx  = lines.findIndex(l => l === "DI CON");
    const diVals = lines[diIdx + 1].trim().split(/\s+/);
    expect(diVals.length).toBe(5);
    expect(parseFloat(diVals[0])).toBeCloseTo(100, 2);
  });

  it("heterogeneous DX array is written correctly", () => {
    const dx = [50, 100, 200, 100, 50];
    const result = simStarsGrid(5, 1, 1, dx, 100, 10);
    const lines  = result.split("\n");
    const diIdx  = lines.findIndex(l => l === "DI CON");
    const diVals = lines[diIdx + 1].trim().split(/\s+/).map(Number);
    expect(diVals).toHaveLength(5);
    expect(diVals[0]).toBeCloseTo(50, 2);
    expect(diVals[2]).toBeCloseTo(200, 2);
  });

  it("throws if DX array length mismatches nx", () => {
    expect(() => simStarsGrid(5, 1, 1, [100, 200], 100, 10)).toThrow();
  });
});

describe("simStarsPoro", () => {
  it("generates PORO CON keyword", () => {
    const result = simStarsPoro(5, 4, 3, 0.25);
    expect(result).toContain("PORO CON");
  });

  it("uniform value — all cells have the same porosity", () => {
    const result = simStarsPoro(2, 2, 1, 0.20);
    const lines  = result.split("\n").slice(1);  // skip PORO CON
    const vals   = lines.join(" ").trim().split(/\s+/).map(Number);
    expect(vals.length).toBe(4); // 2×2×1
    vals.forEach(v => expect(v).toBeCloseTo(0.20, 4));
  });

  it("array input — writes all values", () => {
    const poroArr = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35];
    const result  = simStarsPoro(2, 3, 1, poroArr);
    const lines   = result.split("\n").slice(1);
    const vals    = lines.join(" ").trim().split(/\s+/).map(Number);
    expect(vals.length).toBe(6);
    expect(vals[0]).toBeCloseTo(0.10, 4);
    expect(vals[5]).toBeCloseTo(0.35, 4);
  });

  it("throws if array length does not match grid size", () => {
    expect(() => simStarsPoro(2, 2, 2, [0.1, 0.2])).toThrow();
  });

  it("chunks values into rows of 10", () => {
    const result = simStarsPoro(11, 1, 1, 0.22);
    const lines  = result.split("\n").slice(1);  // first row should have 10, second 1
    const firstRowVals = lines[0].trim().split(/\s+/);
    const secondRowVals = lines[1].trim().split(/\s+/);
    expect(firstRowVals.length).toBe(10);
    expect(secondRowVals.length).toBe(1);
  });
});

describe("simStarsPerm", () => {
  it("generates PERMI, PERMJ, PERMK blocks", () => {
    const result = simStarsPerm(3, 3, 2, 100, 100, 10);
    expect(result).toContain("PERMI CON");
    expect(result).toContain("PERMJ CON");
    expect(result).toContain("PERMK CON");
  });

  it("uniform permeability — correct value in each direction", () => {
    const result = simStarsPerm(2, 2, 1, 200, 200, 20);
    const blocks = result.split("PERMI CON\n")[1]
      || result.split("PERMK CON\n")[1];
    // Check that 200 appears in PERMI block
    expect(result).toContain("200.0000");
  });

  it("kv/kh ratio — PERMK is different from PERMI", () => {
    const result = simStarsPerm(2, 2, 1, 100, 100, 10);
    const permi_line = result.split("\n").find(l => l.includes("100.0000"));
    const permk_line = result.split("\n").find(l => l.includes("10.0000"));
    expect(permi_line).toBeDefined();
    expect(permk_line).toBeDefined();
  });

  it("throws if any array length mismatches grid", () => {
    expect(() => simStarsPerm(3, 3, 2, [100, 200], 100, 10)).toThrow();
  });
});

describe("simStarsTemp", () => {
  it("generates TEMPI CON keyword", () => {
    const result = simStarsTemp(5, 4, 3, 150);
    expect(result).toContain("TEMPI CON");
  });

  it("uniform value — all cells have the same temperature", () => {
    const result = simStarsTemp(2, 2, 1, 200);
    const lines  = result.split("\n").slice(1);
    const vals   = lines.join(" ").trim().split(/\s+/).map(Number);
    expect(vals.length).toBe(4);
    vals.forEach(v => expect(v).toBeCloseTo(200, 1));
  });

  it("temperature array — writes all values", () => {
    const temps = [150, 160, 170, 180];
    const result = simStarsTemp(2, 2, 1, temps);
    const lines  = result.split("\n").slice(1);
    const vals   = lines.join(" ").trim().split(/\s+/).map(Number);
    expect(vals.length).toBe(4);
    expect(vals[0]).toBeCloseTo(150, 1);
    expect(vals[3]).toBeCloseTo(180, 1);
  });

  it("throws if array length does not match grid size", () => {
    expect(() => simStarsTemp(2, 2, 2, [150, 160])).toThrow();
  });

  it("temperature values formatted to 2 decimal places", () => {
    const result = simStarsTemp(1, 1, 1, 212.5678);
    expect(result).toContain("212.57");
  });
});
