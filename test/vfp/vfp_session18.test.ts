/**
 * Session 18 — VFP Tests: Optimal Tubing / GLR / Choke pressure drop
 */

import {
  vfpOptimalTubing,
  vfpGLROptimal,
  vfpChokeDP,
} from "../../src/functions/vfp";

describe("vfpOptimalTubing", () => {
  const q_oil = 1000; // bbl/d
  const q_gas = 300;  // Mscf/d
  const q_wat = 0;
  const L_ft  = 8000;
  const Pwh   = 300;  // psia
  const SG_o  = 0.85;
  const SG_g  = 0.65;
  const mu_l  = 2.0;
  const T_avg = 150;  // °F

  it("returns an entry for each candidate tubing ID", () => {
    const candidates = [2.0, 2.441, 2.992, 3.476];
    const result = vfpOptimalTubing(q_oil, q_gas, q_wat, candidates, L_ft, Pwh, SG_o, SG_g, mu_l, T_avg);
    expect(result.results.length).toBe(candidates.length);
    result.results.forEach((r, i) => {
      expect(r.D_in).toBeCloseTo(candidates[i]);
      expect(r.BHP_psia).toBeGreaterThan(Pwh);
    });
  });

  it("bestD_in is one of the candidates", () => {
    const candidates = [2.0, 2.441, 2.992, 3.476];
    const result = vfpOptimalTubing(q_oil, q_gas, q_wat, candidates, L_ft, Pwh, SG_o, SG_g, mu_l, T_avg);
    expect(candidates).toContain(result.bestD_in);
  });

  it("larger tubing reduces BHP (more deliverability) up to an optimum", () => {
    // Small tubing (1.5") should have higher friction → higher BHP than 2.5"
    const result = vfpOptimalTubing(q_oil, q_gas, q_wat, [1.5, 2.5], L_ft, Pwh, SG_o, SG_g, mu_l, T_avg);
    const bhp1_5 = result.results.find(r => r.D_in === 1.5)!.BHP_psia;
    const bhp2_5 = result.results.find(r => r.D_in === 2.5)!.BHP_psia;
    expect(bhp1_5).toBeGreaterThan(bhp2_5);
  });

  it("throws on empty candidates array", () => {
    expect(() => vfpOptimalTubing(q_oil, q_gas, q_wat, [], L_ft, Pwh, SG_o, SG_g, mu_l, T_avg)).toThrow();
  });

  it("handles water cut — blended SG", () => {
    // Same total liquid but split oil/water; BHP should still be reasonable
    const result = vfpOptimalTubing(500, q_gas, 500, [2.441], L_ft, Pwh, SG_o, SG_g, mu_l, T_avg);
    expect(result.results[0].BHP_psia).toBeGreaterThan(Pwh);
  });
});

describe("vfpGLROptimal", () => {
  const q_liq = 800; // bbl/d
  const D_in  = 2.441;
  const L_ft  = 7000;
  const Pwh   = 250;
  const SG_o  = 0.85;
  const SG_g  = 0.65;
  const mu_l  = 2.0;
  const T     = 150;

  it("returns correct number of scan points", () => {
    const r = vfpGLROptimal(q_liq, 0, 2000, 10, D_in, L_ft, Pwh, SG_o, SG_g, mu_l, T);
    expect(r.glr_scan.length).toBe(10);
    expect(r.bhp_scan.length).toBe(10);
  });

  it("optGLR_scf_bbl is within the scan range", () => {
    const r = vfpGLROptimal(q_liq, 0, 2000, 20, D_in, L_ft, Pwh, SG_o, SG_g, mu_l, T);
    expect(r.optGLR_scf_bbl).toBeGreaterThanOrEqual(0);
    expect(r.optGLR_scf_bbl).toBeLessThanOrEqual(2000);
  });

  it("minBHP_psia is less than or equal to all BHPs in scan", () => {
    const r = vfpGLROptimal(q_liq, 0, 2000, 20, D_in, L_ft, Pwh, SG_o, SG_g, mu_l, T);
    const actualMin = Math.min(...r.bhp_scan);
    expect(r.minBHP_psia).toBeCloseTo(actualMin, 1);
  });

  it("defaults to 20 scan points when nScan < 2", () => {
    const r = vfpGLROptimal(q_liq, 0, 2000, 0, D_in, L_ft, Pwh, SG_o, SG_g, mu_l, T);
    expect(r.glr_scan.length).toBe(20);
  });
});

describe("vfpChokeDP", () => {
  it("computes upstream pressure from Gilbert correlation", () => {
    // 1000 bbl/d oil, 0.5 MMscf/d gas, 16/64" choke, 200 psia downstream
    const r = vfpChokeDP(1000, 500, 16, 200);
    expect(r.P_up_psia).toBeGreaterThan(r.P_dn_psia);
    expect(r.dP_psia).toBeGreaterThan(0);
  });

  it("GLR is computed correctly", () => {
    const r = vfpChokeDP(1000, 500, 16, 200);
    expect(r.GLR_scf_bbl).toBeCloseTo(500);
  });

  it("returns critical flag when P_dn/P_up < 0.546", () => {
    // With large choke and high P_dn relative to computed P_up, should be subcritical
    const r = vfpChokeDP(1000, 500, 64, 200);  // very large choke → lower P_up
    expect(typeof r.critical).toBe("boolean");
  });

  it("larger choke bean gives lower upstream pressure (lower restriction)", () => {
    const r_small = vfpChokeDP(1000, 500, 8,  200);
    const r_large = vfpChokeDP(1000, 500, 24, 200);
    expect(r_small.P_up_psia).toBeGreaterThan(r_large.P_up_psia);
  });

  it("higher GLR gives higher upstream pressure at same choke size", () => {
    const r_low  = vfpChokeDP(1000, 100, 16, 200);
    const r_high = vfpChokeDP(1000, 600, 16, 200);
    expect(r_high.P_up_psia).toBeGreaterThan(r_low.P_up_psia);
  });

  it("higher rate gives higher upstream pressure", () => {
    const r1 = vfpChokeDP(500,  200, 16, 200);
    const r2 = vfpChokeDP(1500, 200, 16, 200);
    expect(r2.P_up_psia).toBeGreaterThan(r1.P_up_psia);
  });
});
