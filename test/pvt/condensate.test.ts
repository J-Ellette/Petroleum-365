/**
 * Tests: PVT Gas Condensate Properties (Session 15)
 */

import {
  wellstreamGravity,
  wetGasCorrectedGravity,
  condensateFVF,
  condensateDensity,
  condensateViscosity,
  whitsonC7PlusSplit,
} from "../../src/functions/pvt/condensate";

// ─── wellstreamGravity ────────────────────────────────────────────────────────

describe("wellstreamGravity", () => {
  test("returns value between separator gas gravity and condensate gravity", () => {
    // Separator gas γ = 0.65, condensate γ = 0.75, CGR = 100 STB/MMscf
    const ws = wellstreamGravity(0.65, 0.75, 100);
    // Wellstream gravity is heavier than separator gas (condensate adds weight)
    expect(ws).toBeGreaterThan(0.65);
    // And within a physically reasonable range (less than 1.1 for light condensate)
    expect(ws).toBeLessThan(1.1);
  });

  test("wellstream gravity increases with higher CGR", () => {
    const ws1 = wellstreamGravity(0.65, 0.75, 50);
    const ws2 = wellstreamGravity(0.65, 0.75, 200);
    expect(ws2).toBeGreaterThan(ws1);
  });

  test("zero CGR → wellstream gravity ≈ separator gas gravity", () => {
    const ws = wellstreamGravity(0.65, 0.75, 0);
    expect(ws).toBeCloseTo(0.65, 3);
  });

  test("returns finite positive value for typical gas condensate", () => {
    // Typical: γ_g = 0.65, γ_c = 0.77 (API≈52), CGR = 80 STB/MMscf
    const ws = wellstreamGravity(0.65, 0.77, 80);
    expect(ws).toBeGreaterThan(0);
    expect(ws).toBeLessThan(1.5);
    expect(isFinite(ws)).toBe(true);
  });
});

// ─── wetGasCorrectedGravity ───────────────────────────────────────────────────

describe("wetGasCorrectedGravity", () => {
  test("returns value close to separator gas gravity", () => {
    const corr = wetGasCorrectedGravity(0.65, 50, 80, 200);
    expect(corr).toBeGreaterThan(0.5);
    expect(corr).toBeLessThan(0.9);
  });

  test("higher API condensate → larger correction", () => {
    const corr1 = wetGasCorrectedGravity(0.65, 40, 80, 200);
    const corr2 = wetGasCorrectedGravity(0.65, 60, 80, 200);
    expect(corr2).toBeGreaterThan(corr1);
  });

  test("higher separator pressure → larger correction (more gas dissolved)", () => {
    const corr1 = wetGasCorrectedGravity(0.65, 50, 80, 100);
    const corr2 = wetGasCorrectedGravity(0.65, 50, 80, 500);
    expect(corr2).toBeGreaterThan(corr1);
  });

  test("returns finite value for standard separator conditions", () => {
    // Standard: P_sp = 114.7 psia → correction term = 0 → γ_gg = γ_g
    const corr = wetGasCorrectedGravity(0.65, 50, 80, 114.7);
    expect(corr).toBeCloseTo(0.65, 4);
  });
});

// ─── condensateFVF ────────────────────────────────────────────────────────────

describe("condensateFVF", () => {
  test("returns value > 1.0 (reservoir volume > surface volume)", () => {
    const Bco = condensateFVF(1000, 0.65, 0.77, 200);
    expect(Bco).toBeGreaterThan(1.0);
  });

  test("FVF increases with temperature", () => {
    const Bco1 = condensateFVF(1000, 0.65, 0.77, 150);
    const Bco2 = condensateFVF(1000, 0.65, 0.77, 250);
    expect(Bco2).toBeGreaterThan(Bco1);
  });

  test("FVF increases with GOR (more dissolved gas)", () => {
    const Bco1 = condensateFVF(500, 0.65, 0.77, 200);
    const Bco2 = condensateFVF(2000, 0.65, 0.77, 200);
    expect(Bco2).toBeGreaterThan(Bco1);
  });

  test("in physically reasonable range for condensate", () => {
    // Typical condensate FVF: 1.1 – 3.0 RB/STB
    const Bco = condensateFVF(1200, 0.65, 0.77, 200);
    expect(Bco).toBeGreaterThan(1.0);
    expect(Bco).toBeLessThan(5.0);
  });
});

// ─── condensateDensity ────────────────────────────────────────────────────────

describe("condensateDensity", () => {
  test("returns positive density", () => {
    const rho = condensateDensity(0.77, 1000, 0.65, 1.5);
    expect(rho).toBeGreaterThan(0);
  });

  test("heavier condensate → higher density", () => {
    const rho1 = condensateDensity(0.72, 1000, 0.65, 1.5);
    const rho2 = condensateDensity(0.82, 1000, 0.65, 1.5);
    expect(rho2).toBeGreaterThan(rho1);
  });

  test("density decreases with higher FVF (more expansion)", () => {
    const rho1 = condensateDensity(0.77, 1000, 0.65, 1.2);
    const rho2 = condensateDensity(0.77, 1000, 0.65, 2.0);
    expect(rho1).toBeGreaterThan(rho2);
  });

  test("in reasonable range for reservoir condensate", () => {
    // Reservoir condensate: 25–50 lb/ft³
    const rho = condensateDensity(0.77, 1000, 0.65, 1.4);
    expect(rho).toBeGreaterThan(10);
    expect(rho).toBeLessThan(70);
  });
});

// ─── condensateViscosity ──────────────────────────────────────────────────────

describe("condensateViscosity", () => {
  test("returns positive viscosity", () => {
    const mu = condensateViscosity(50, 200, 800);
    expect(mu).toBeGreaterThan(0);
  });

  test("viscosity decreases with temperature (common for liquids)", () => {
    const mu1 = condensateViscosity(50, 100, 800);
    const mu2 = condensateViscosity(50, 250, 800);
    expect(mu1).toBeGreaterThan(mu2);
  });

  test("viscosity decreases with higher GOR (more light ends in solution)", () => {
    const mu1 = condensateViscosity(50, 200, 200);
    const mu2 = condensateViscosity(50, 200, 2000);
    expect(mu1).toBeGreaterThan(mu2);
  });

  test("higher API (lighter condensate) → lower dead oil viscosity", () => {
    const mu1 = condensateViscosity(35, 200, 800);  // 35°API
    const mu2 = condensateViscosity(55, 200, 800);  // 55°API (lighter)
    expect(mu1).toBeGreaterThan(mu2);
  });

  test("viscosity in reasonable range for condensate (0.1–2 cp typical)", () => {
    const mu = condensateViscosity(52, 200, 1000);
    expect(mu).toBeGreaterThan(0.01);
    expect(mu).toBeLessThan(5.0);
  });
});

// ─── whitsonC7PlusSplit ───────────────────────────────────────────────────────

describe("whitsonC7PlusSplit", () => {
  test("returns nComp fractions summing to 1", () => {
    const result = whitsonC7PlusSplit(200, 0.80, 3);
    const sumZ = result.reduce((s, r) => s + r.z_frac, 0);
    expect(sumZ).toBeCloseTo(1, 4);
    expect(result).toHaveLength(3);
  });

  test("molecular weights are increasing (heavier fractions)", () => {
    const result = whitsonC7PlusSplit(200, 0.80, 4);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].Mw).toBeGreaterThan(result[i - 1].Mw);
    }
  });

  test("molecular weights span a wide range relative to average Mw", () => {
    const result = whitsonC7PlusSplit(200, 0.80, 3);
    const Mw_min = Math.min(...result.map(r => r.Mw));
    const Mw_max = Math.max(...result.map(r => r.Mw));
    // Range should be significant (gamma distribution is right-skewed)
    expect(Mw_min).toBeGreaterThan(96);     // all above heptane
    expect(Mw_max).toBeGreaterThan(Mw_min); // strictly increasing
    expect(Mw_max - Mw_min).toBeGreaterThan(20); // meaningful spread
  });

  test("all fractions have positive critical properties", () => {
    const result = whitsonC7PlusSplit(250, 0.85, 3);
    result.forEach(r => {
      expect(r.Tc_R).toBeGreaterThan(0);
      expect(r.Pc_psia).toBeGreaterThan(0);
      expect(r.omega).toBeGreaterThanOrEqual(0);
      expect(r.gamma).toBeGreaterThan(0);
      expect(r.gamma).toBeLessThan(1.2);
    });
  });

  test("nComp=1 returns single fraction with Mw ≈ average M", () => {
    const result = whitsonC7PlusSplit(200, 0.80, 1);
    expect(result).toHaveLength(1);
    expect(result[0].z_frac).toBeCloseTo(1, 4);
    // Single component midpoint Mw should be near 200
    expect(result[0].Mw).toBeGreaterThan(96);
    expect(result[0].Mw).toBeLessThan(600);
  });

  test("heavier C7+ (higher Mw) → heavier pseudocomponents", () => {
    const r1 = whitsonC7PlusSplit(180, 0.80, 3);
    const r2 = whitsonC7PlusSplit(280, 0.85, 3);
    const avgMw1 = r1.reduce((s, r) => s + r.Mw * r.z_frac, 0);
    const avgMw2 = r2.reduce((s, r) => s + r.Mw * r.z_frac, 0);
    expect(avgMw2).toBeGreaterThan(avgMw1);
  });

  test("supports 5 pseudocomponents", () => {
    const result = whitsonC7PlusSplit(220, 0.82, 5);
    expect(result).toHaveLength(5);
    const sumZ = result.reduce((s, r) => s + r.z_frac, 0);
    expect(sumZ).toBeCloseTo(1, 4);
  });
});
