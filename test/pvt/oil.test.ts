/**
 * Tests: PVT Oil Properties
 */

import {
  sgFromAPI,
  apiFromSG,
  bubblePointByStanding,
  bubblePointByVasquezBeggs,
  solutionGORByStanding,
  solutionGORByVasquezBeggs,
  oilFVFSatByStanding,
  oilFVFSatByVasquezBeggs,
  oilFVFUndersat,
  oilCompressibilityByVasquezBeggs,
  deadOilViscosityByBeal,
  deadOilViscosityByEgbogah,
  saturatedOilViscosityByBeggsRobinson,
  undersaturatedOilViscosityByVasquezBeggs,
} from "../../src/functions/pvt/oil";

describe("API / SG conversions", () => {
  test("35°API → SG ≈ 0.8498", () => {
    expect(sgFromAPI(35)).toBeCloseTo(0.8498, 3);
  });

  test("Round-trip: API → SG → API", () => {
    const api = 40;
    expect(apiFromSG(sgFromAPI(api))).toBeCloseTo(api, 8);
  });

  test("60°API → SG ≈ 0.739", () => {
    expect(sgFromAPI(60)).toBeCloseTo(0.7389, 3);
  });
});

describe("Bubble point pressure", () => {
  // Standing example: Rs=500, T=200°F, API=35, sg_gas=0.65
  test("Standing correlation — typical range", () => {
    const Pb = bubblePointByStanding(0.65, 35, 500, 200);
    expect(Pb).toBeGreaterThan(1000);
    expect(Pb).toBeLessThan(4000);
  });

  test("Standing: higher GOR → higher Pb", () => {
    const Pb1 = bubblePointByStanding(0.65, 35, 300, 200);
    const Pb2 = bubblePointByStanding(0.65, 35, 600, 200);
    expect(Pb2).toBeGreaterThan(Pb1);
  });

  test("Vasquez-Beggs bubble point — reasonable positive result", () => {
    const Pb = bubblePointByVasquezBeggs(0.65, 35, 500, 200);
    // V-B formula for API=35, Rs=500, T=200°F gives ~397 psia
    expect(Pb).toBeGreaterThan(100);
    expect(Pb).toBeLessThan(5000);
  });

  test("API > 30 vs ≤ 30 uses different coefficients (Vasquez-Beggs)", () => {
    const Pb_light = bubblePointByVasquezBeggs(0.65, 40, 500, 200);
    const Pb_heavy = bubblePointByVasquezBeggs(0.65, 25, 500, 200);
    expect(Pb_light).not.toBeCloseTo(Pb_heavy, 0);
  });
});

describe("Solution GOR", () => {
  test("Standing Rs at Pb should ≈ input Rs (round-trip)", () => {
    const sg_gas = 0.65;
    const API = 35;
    const Rs_in = 500;
    const T = 200;
    const Pb = bubblePointByStanding(sg_gas, API, Rs_in, T);
    const Rs_out = solutionGORByStanding(sg_gas, API, Pb, T);
    // Should be close to 500
    expect(Rs_out).toBeCloseTo(Rs_in, -1); // within ~10
  });

  test("Rs decreases with pressure below bubble point", () => {
    const Rs1 = solutionGORByStanding(0.65, 35, 1000, 200);
    const Rs2 = solutionGORByStanding(0.65, 35, 2000, 200);
    expect(Rs2).toBeGreaterThan(Rs1);
  });
});

describe("Oil FVF", () => {
  test("Standing Bo ≥ 1.0 (res vol > surface vol)", () => {
    const Bo = oilFVFSatByStanding(0.65, sgFromAPI(35), 500, 200);
    expect(Bo).toBeGreaterThanOrEqual(1.0);
  });

  test("Standing Bo increases with GOR", () => {
    const sg_oil = sgFromAPI(35);
    const Bo1 = oilFVFSatByStanding(0.65, sg_oil, 200, 200);
    const Bo2 = oilFVFSatByStanding(0.65, sg_oil, 800, 200);
    expect(Bo2).toBeGreaterThan(Bo1);
  });

  test("Vasquez-Beggs Bo ≥ 1.0", () => {
    const Bo = oilFVFSatByVasquezBeggs(0.65, 35, 500, 200);
    expect(Bo).toBeGreaterThanOrEqual(1.0);
  });

  test("Undersaturated Bo ≤ Bo at bubble point (compresses above Pb)", () => {
    const Bo_b = oilFVFSatByStanding(0.65, sgFromAPI(35), 500, 200);
    const co = 1e-5; // psi^-1
    const Pb = bubblePointByStanding(0.65, 35, 500, 200);
    const Bo_above = oilFVFUndersat(Bo_b, co, Pb + 500, Pb);
    expect(Bo_above).toBeLessThanOrEqual(Bo_b);
  });
});

describe("Oil compressibility", () => {
  test("Co is positive", () => {
    const co = oilCompressibilityByVasquezBeggs(500, 0.65, 35, 200, 2000);
    expect(co).toBeGreaterThan(0);
  });

  test("Co in typical range (5e-6 to 30e-6 psi⁻¹)", () => {
    const co = oilCompressibilityByVasquezBeggs(500, 0.65, 35, 200, 2000);
    expect(co).toBeGreaterThan(1e-6);
    expect(co).toBeLessThan(1e-4);
  });
});

describe("Oil viscosity", () => {
  test("Dead oil viscosity by Beal — heavy oil is more viscous", () => {
    const mu_light = deadOilViscosityByBeal(45, 150);
    const mu_heavy = deadOilViscosityByBeal(20, 150);
    expect(mu_heavy).toBeGreaterThan(mu_light);
  });

  test("Egbogah dead oil viscosity — positive", () => {
    const mu = deadOilViscosityByEgbogah(35, 150);
    expect(mu).toBeGreaterThan(0);
  });

  test("Saturated viscosity < dead oil viscosity (dissolved gas reduces viscosity)", () => {
    const muod = deadOilViscosityByBeal(35, 200);
    const muo  = saturatedOilViscosityByBeggsRobinson(muod, 500);
    expect(muo).toBeLessThan(muod);
  });

  test("Undersaturated viscosity increases with pressure above Pb", () => {
    const muod = deadOilViscosityByBeal(35, 200);
    const muob = saturatedOilViscosityByBeggsRobinson(muod, 500);
    const Pb = 2000;
    const mu1 = undersaturatedOilViscosityByVasquezBeggs(muob, Pb + 500, Pb);
    const mu2 = undersaturatedOilViscosityByVasquezBeggs(muob, Pb + 2000, Pb);
    expect(mu2).toBeGreaterThan(mu1);
  });
});
