/**
 * Tests: PVT Interfacial Tension (IFT) + EoS Tuning Helpers
 */

import {
  pvtDeadOilIFT,
  pvtGasOilIFTByBakerSwerdloff,
  pvtGasOilIFTByMacleodSugden,
  pvtGasBrineIFT,
  pvtPenelouxShift,
  pvtEoSVolumeShiftRegress,
  pvtBinaryInteractionParam,
} from "../../src/functions/pvt/ift";

// ─── pvtDeadOilIFT ────────────────────────────────────────────────────────────

describe("pvtDeadOilIFT", () => {
  test("30 API at 68°F ≈ 31.3 dyne/cm (Baker-Swerdloff 1956)", () => {
    // σ_dead_68 = 39.0 − 0.2571 × 30 = 39.0 − 7.713 = 31.287
    expect(pvtDeadOilIFT(30, 68)).toBeCloseTo(31.287, 2);
  });

  test("30 API at 100°F < value at 68°F (IFT decreases with temperature)", () => {
    expect(pvtDeadOilIFT(30, 100)).toBeLessThan(pvtDeadOilIFT(30, 68));
  });

  test("higher API → lower IFT (lighter oil)", () => {
    expect(pvtDeadOilIFT(50, 68)).toBeLessThan(pvtDeadOilIFT(30, 68));
  });

  test("very high API still returns positive IFT (clamped at 1)", () => {
    expect(pvtDeadOilIFT(150, 68)).toBeGreaterThanOrEqual(1);
  });
});

// ─── pvtGasOilIFTByBakerSwerdloff ────────────────────────────────────────────

describe("pvtGasOilIFTByBakerSwerdloff", () => {
  test("zero Rs: live IFT equals dead IFT", () => {
    const dead = pvtDeadOilIFT(35, 120);
    const live = pvtGasOilIFTByBakerSwerdloff(35, 120, 0);
    expect(live).toBeCloseTo(dead, 6);
  });

  test("increasing Rs reduces IFT", () => {
    const ift_low = pvtGasOilIFTByBakerSwerdloff(35, 120, 200);
    const ift_high = pvtGasOilIFTByBakerSwerdloff(35, 120, 800);
    expect(ift_high).toBeLessThan(ift_low);
  });

  test("IFT ≥ 0.1 dyne/cm (clamped)", () => {
    expect(pvtGasOilIFTByBakerSwerdloff(35, 200, 5000)).toBeGreaterThanOrEqual(0.1);
  });

  test("IFT at Rs=500 is between dead-oil value and 0.1", () => {
    const live = pvtGasOilIFTByBakerSwerdloff(35, 120, 500);
    const dead = pvtDeadOilIFT(35, 120);
    expect(live).toBeLessThan(dead);
    expect(live).toBeGreaterThanOrEqual(0.1);
  });
});

// ─── pvtGasOilIFTByMacleodSugden ─────────────────────────────────────────────

describe("pvtGasOilIFTByMacleodSugden", () => {
  // Example: n-C4 parachor ≈ 189, mole fraction split
  const parachors = [77, 108, 150, 189];   // C1, C2, C3, nC4
  const xi = [0.0, 0.1, 0.3, 0.6];        // liquid
  const yi = [0.7, 0.2, 0.08, 0.02];      // vapor
  const rhoL = 0.006;                      // mol/cm³ (~liquid density)
  const rhoG = 0.0005;                     // mol/cm³ (~gas density)

  test("returns positive IFT", () => {
    const ift = pvtGasOilIFTByMacleodSugden(parachors, xi, yi, rhoL, rhoG);
    expect(ift).toBeGreaterThan(0);
  });

  test("higher liquid density → higher IFT", () => {
    const ift1 = pvtGasOilIFTByMacleodSugden(parachors, xi, yi, rhoL, rhoG);
    const ift2 = pvtGasOilIFTByMacleodSugden(parachors, xi, yi, rhoL * 2, rhoG);
    expect(ift2).toBeGreaterThan(ift1);
  });

  test("throws on mismatched array lengths", () => {
    expect(() =>
      pvtGasOilIFTByMacleodSugden([77, 108], [0.5], [0.5, 0.5], 0.006, 0.0005)
    ).toThrow();
  });

  test("zero density difference → zero IFT", () => {
    // If xi·rhoL = yi·rhoG for each component, sum → 0
    const ift = pvtGasOilIFTByMacleodSugden([100], [0], [0], rhoL, rhoG);
    expect(ift).toBe(0);
  });
});

// ─── pvtGasBrineIFT ──────────────────────────────────────────────────────────

describe("pvtGasBrineIFT", () => {
  test("fresh water at 68°F, 14.7 psia ≈ near surface tension of water", () => {
    const ift = pvtGasBrineIFT(68, 14.7, 0);
    expect(ift).toBeGreaterThan(50);   // fresh water near 72 dyne/cm at STP
    expect(ift).toBeLessThan(85);
  });

  test("IFT decreases with higher pressure (gas compresses, closer density)", () => {
    const iftLow = pvtGasBrineIFT(150, 500, 50000);
    const iftHigh = pvtGasBrineIFT(150, 5000, 50000);
    expect(iftHigh).toBeLessThan(iftLow);
  });

  test("salinity increases IFT slightly at low pressure", () => {
    const fresh = pvtGasBrineIFT(100, 100, 0);
    const salty = pvtGasBrineIFT(100, 100, 100000);
    expect(salty).toBeGreaterThan(fresh);
  });

  test("returns positive value", () => {
    expect(pvtGasBrineIFT(200, 3000, 150000)).toBeGreaterThan(0);
  });
});

// ─── pvtPenelouxShift ────────────────────────────────────────────────────────

describe("pvtPenelouxShift", () => {
  // Methane: Tc=343.1 R, Pc=667.8 psia, omega=0.0115
  test("methane shift is small and positive", () => {
    const s = pvtPenelouxShift(343.1, 667.8, 0.0115);
    // Expect small correction, typically |c| < 0.5 ft³/lb-mol for light gas
    expect(Math.abs(s)).toBeLessThan(1.0);
  });

  // n-Heptane: Tc=972.5 R, Pc=396.8 psia, omega=0.350
  test("n-heptane shift is larger (heavy component)", () => {
    const s_methane = pvtPenelouxShift(343.1, 667.8, 0.0115);
    const s_c7      = pvtPenelouxShift(972.5, 396.8, 0.350);
    expect(Math.abs(s_c7)).toBeGreaterThan(Math.abs(s_methane));
  });

  test("returns a finite number", () => {
    expect(isFinite(pvtPenelouxShift(500, 500, 0.2))).toBe(true);
  });
});

// ─── pvtEoSVolumeShiftRegress ────────────────────────────────────────────────

describe("pvtEoSVolumeShiftRegress", () => {
  test("identical arrays → shift=0, rmse=0", () => {
    const { shift, rmse } = pvtEoSVolumeShiftRegress([1, 2, 3], [1, 2, 3]);
    expect(shift).toBeCloseTo(0, 10);
    expect(rmse).toBeCloseTo(0, 10);
  });

  test("calc always +0.5 above obs → shift=0.5, rmse=0", () => {
    const { shift, rmse } = pvtEoSVolumeShiftRegress([1.5, 2.5, 3.5], [1, 2, 3]);
    expect(shift).toBeCloseTo(0.5, 10);
    expect(rmse).toBeCloseTo(0, 10);
  });

  test("noisy data: rmse > 0", () => {
    const { rmse } = pvtEoSVolumeShiftRegress([1.0, 2.1, 2.9, 4.2], [1.1, 1.9, 3.1, 3.9]);
    expect(rmse).toBeGreaterThan(0);
  });

  test("throws on empty arrays", () => {
    expect(() => pvtEoSVolumeShiftRegress([], [])).toThrow();
  });

  test("throws on mismatched lengths", () => {
    expect(() => pvtEoSVolumeShiftRegress([1, 2], [1])).toThrow();
  });
});

// ─── pvtBinaryInteractionParam ────────────────────────────────────────────────

describe("pvtBinaryInteractionParam", () => {
  test("identical Vc → kij = 0 (no asymmetry)", () => {
    const k = pvtBinaryInteractionParam(1.0, 1.0);
    expect(k).toBeCloseTo(0, 8);
  });

  test("very different Vc → kij > 0", () => {
    const k = pvtBinaryInteractionParam(0.1, 10.0);
    expect(k).toBeGreaterThan(0);
  });

  test("kij in [0, 1) for reasonable inputs", () => {
    const k = pvtBinaryInteractionParam(0.5, 3.0);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(k).toBeLessThan(1);
  });

  test("symmetric: kij(i,j) = kij(j,i)", () => {
    const k1 = pvtBinaryInteractionParam(0.8, 2.5);
    const k2 = pvtBinaryInteractionParam(2.5, 0.8);
    expect(k1).toBeCloseTo(k2, 10);
  });

  test("larger exponent n → larger kij (stronger correction)", () => {
    const k6  = pvtBinaryInteractionParam(0.5, 5.0, 6);
    const k3  = pvtBinaryInteractionParam(0.5, 5.0, 3);
    expect(k6).toBeGreaterThan(k3);
  });
});
