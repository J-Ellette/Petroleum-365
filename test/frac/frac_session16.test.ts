/**
 * Tests for P365 FRAC Session 16 extensions:
 *   fracTSODesign, fracProppantConcentration, fracRefracScore
 */
import {
  fracTSODesign,
  fracProppantConcentration,
  fracRefracScore,
} from "../../src/functions/frac";

// ─── fracTSODesign ────────────────────────────────────────────────────────────

describe("fracTSODesign", () => {
  // Typical TSO treatment parameters
  const qi_bpm      = 30;       // bbl/min
  const h_ft        = 100;      // ft fracture height
  const E_prime_psi = 3_500_000; // psi plane-strain modulus
  const mu_cp       = 100;      // cp fracturing fluid viscosity
  const CL          = 0.004;    // ft/√min Carter leakoff coeff
  const Vpad_bbl    = 500;      // bbl pad volume
  const conc_ppg    = 6;        // lbm/gal proppant concentration

  test("returns correct shape of result object", () => {
    const result = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg);
    expect(result).toHaveProperty("L_so_ft");
    expect(result).toHaveProperty("w_avg_in");
    expect(result).toHaveProperty("A_so_ft2");
    expect(result).toHaveProperty("t_so_min");
    expect(result).toHaveProperty("packingFraction");
  });

  test("fracture half-length is positive", () => {
    const { L_so_ft } = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg);
    expect(L_so_ft).toBeGreaterThan(0);
  });

  test("average width is positive and in reasonable range (0.01 - 2 in)", () => {
    const { w_avg_in } = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg);
    expect(w_avg_in).toBeGreaterThan(0);
    // Width should be in engineering range for typical parameters
    expect(w_avg_in).toBeLessThan(10);
  });

  test("fracture area equals 2 × h × L (two wings)", () => {
    const { L_so_ft, A_so_ft2 } = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg);
    expect(A_so_ft2).toBeCloseTo(2 * h_ft * L_so_ft, 3);
  });

  test("pump time equals pad time (V_pad / qi)", () => {
    const { t_so_min } = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg);
    const Vpad_ft3 = Vpad_bbl * 5.61458;
    const qi_ft3min = qi_bpm * 5.61458;
    expect(t_so_min).toBeCloseTo(Vpad_ft3 / qi_ft3min, 3);
  });

  test("packing fraction ≤ 1", () => {
    const { packingFraction } = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg);
    expect(packingFraction).toBeLessThanOrEqual(1.0);
    expect(packingFraction).toBeGreaterThanOrEqual(0);
  });

  test("packing fraction = 1 when conc ≥ max pack (12 ppg)", () => {
    const { packingFraction } = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, 12);
    expect(packingFraction).toBe(1.0);
  });

  test("larger pad volume gives longer fracture (more fluid = more extension)", () => {
    const { L_so_ft: L_small } = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, 300, conc_ppg);
    const { L_so_ft: L_large } = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, CL, 800, conc_ppg);
    expect(L_large).toBeGreaterThan(L_small);
  });

  test("higher injection rate gives wider fracture (width ∝ qi^0.25)", () => {
    const { w_avg_in: w_low  } = fracTSODesign(15,  h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg);
    const { w_avg_in: w_high } = fracTSODesign(60,  h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg);
    expect(w_high).toBeGreaterThan(w_low);
  });

  test("throws for non-positive qi", () => {
    expect(() => fracTSODesign(0, h_ft, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg)).toThrow();
  });

  test("throws for non-positive h", () => {
    expect(() => fracTSODesign(qi_bpm, 0, E_prime_psi, mu_cp, CL, Vpad_bbl, conc_ppg)).toThrow();
  });

  test("zero leakoff falls back gracefully", () => {
    const result = fracTSODesign(qi_bpm, h_ft, E_prime_psi, mu_cp, 0, Vpad_bbl, conc_ppg);
    expect(result.L_so_ft).toBeGreaterThan(0);
  });
});

// ─── fracProppantConcentration ────────────────────────────────────────────────

describe("fracProppantConcentration", () => {
  const qi_bpm     = 30;
  const conc_ppg   = 4;    // lbm/gal
  const t_pump_min = 30;   // min
  const L_ft       = 500;  // ft half-length
  const h_ft       = 100;  // ft height
  const rho_prop   = 105;  // lbm/ft³ (sand)

  test("returns correct shape of result object", () => {
    const result = fracProppantConcentration(qi_bpm, conc_ppg, t_pump_min, L_ft, h_ft, rho_prop);
    expect(result).toHaveProperty("Ca_lbmFt2");
    expect(result).toHaveProperty("vol_prop_lbm");
    expect(result).toHaveProperty("prop_fill_fraction");
  });

  test("proppant mass is positive", () => {
    const { vol_prop_lbm } = fracProppantConcentration(qi_bpm, conc_ppg, t_pump_min, L_ft, h_ft, rho_prop);
    expect(vol_prop_lbm).toBeGreaterThan(0);
  });

  test("areal concentration is positive", () => {
    const { Ca_lbmFt2 } = fracProppantConcentration(qi_bpm, conc_ppg, t_pump_min, L_ft, h_ft, rho_prop);
    expect(Ca_lbmFt2).toBeGreaterThan(0);
  });

  test("fill fraction is in [0, 1]", () => {
    const { prop_fill_fraction } = fracProppantConcentration(qi_bpm, conc_ppg, t_pump_min, L_ft, h_ft, rho_prop);
    expect(prop_fill_fraction).toBeGreaterThanOrEqual(0);
    expect(prop_fill_fraction).toBeLessThanOrEqual(1);
  });

  test("doubling pumping time doubles proppant mass", () => {
    const { vol_prop_lbm: mass1 } = fracProppantConcentration(qi_bpm, conc_ppg, 20, L_ft, h_ft, rho_prop);
    const { vol_prop_lbm: mass2 } = fracProppantConcentration(qi_bpm, conc_ppg, 40, L_ft, h_ft, rho_prop);
    expect(mass2).toBeCloseTo(mass1 * 2, 3);
  });

  test("doubling fracture area halves areal concentration", () => {
    const { Ca_lbmFt2: Ca1 } = fracProppantConcentration(qi_bpm, conc_ppg, t_pump_min, 500, h_ft, rho_prop);
    const { Ca_lbmFt2: Ca2 } = fracProppantConcentration(qi_bpm, conc_ppg, t_pump_min, 1000, h_ft, rho_prop);
    expect(Ca1).toBeCloseTo(Ca2 * 2, 3);
  });

  test("proppant mass = conc × qi × t (in consistent units)", () => {
    const { vol_prop_lbm } = fracProppantConcentration(qi_bpm, conc_ppg, t_pump_min, L_ft, h_ft, rho_prop);
    const qi_galmin = qi_bpm * 42;
    const expected = conc_ppg * qi_galmin * t_pump_min;
    expect(vol_prop_lbm).toBeCloseTo(expected, 0);
  });
});

// ─── fracRefracScore ──────────────────────────────────────────────────────────

describe("fracRefracScore", () => {
  test("returns correct shape", () => {
    const result = fracRefracScore(5, 1, 2000, 4000, 10, 8);
    expect(result).toHaveProperty("score_0_100");
    expect(result).toHaveProperty("recommendation");
    expect(result).toHaveProperty("pi_score");
    expect(result).toHaveProperty("pressure_score");
    expect(result).toHaveProperty("skin_score");
    expect(result).toHaveProperty("age_score");
  });

  test("score is in [0, 100]", () => {
    const result = fracRefracScore(5, 1, 2000, 4000, 10, 8);
    expect(result.score_0_100).toBeGreaterThanOrEqual(0);
    expect(result.score_0_100).toBeLessThanOrEqual(100);
  });

  test("ideal candidate (high decline, good pressure, high skin, old) scores high", () => {
    // PI dropped from 5 to 0.5, pressure maintained (P_si/P_i=0.9), skin=20, age=12 yrs
    const result = fracRefracScore(5, 0.5, 3600, 4000, 20, 12);
    expect(result.score_0_100).toBeGreaterThan(55);
    expect(result.recommendation).toContain("candidate");
  });

  test("poor candidate scores low (no PI decline, low pressure, no skin, new well)", () => {
    const result = fracRefracScore(5, 5, 500, 4000, 0, 1);
    expect(result.score_0_100).toBeLessThan(40);
  });

  test("pi_score increases as current PI declines relative to initial", () => {
    const r1 = fracRefracScore(5, 4, 2000, 4000, 5, 5);  // mild decline
    const r2 = fracRefracScore(5, 1, 2000, 4000, 5, 5);  // strong decline
    expect(r2.pi_score).toBeGreaterThan(r1.pi_score);
  });

  test("skin_score increases with higher skin", () => {
    const r1 = fracRefracScore(5, 2, 2000, 4000, 2, 5);
    const r2 = fracRefracScore(5, 2, 2000, 4000, 15, 5);
    expect(r2.skin_score).toBeGreaterThan(r1.skin_score);
  });

  test("recommendation string is non-empty", () => {
    const { recommendation } = fracRefracScore(5, 1, 2000, 4000, 10, 8);
    expect(recommendation.length).toBeGreaterThan(5);
  });

  test("individual scores are all in [0, 10]", () => {
    const result = fracRefracScore(5, 1, 2000, 4000, 10, 8);
    expect(result.pi_score).toBeGreaterThanOrEqual(0);
    expect(result.pi_score).toBeLessThanOrEqual(10);
    expect(result.pressure_score).toBeGreaterThanOrEqual(0);
    expect(result.pressure_score).toBeLessThanOrEqual(10);
    expect(result.skin_score).toBeGreaterThanOrEqual(0);
    expect(result.skin_score).toBeLessThanOrEqual(10);
    expect(result.age_score).toBeGreaterThanOrEqual(0);
    expect(result.age_score).toBeLessThanOrEqual(10);
  });

  test("old well (15+ years) gets max age score", () => {
    const { age_score } = fracRefracScore(5, 1, 2000, 4000, 10, 20);
    expect(age_score).toBe(10);
  });
});
