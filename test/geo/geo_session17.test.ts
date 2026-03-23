/**
 * Session 17 — GEO Tests: Mohr-Coulomb failure envelope, ECD, mud weight window
 */

import {
  geoMohrCoulombFailureEnvelope,
  geoECD,
  geoMudWeightWindowECD,
} from "../../src/functions/geo";

describe("geoMohrCoulombFailureEnvelope", () => {
  // Typical sandstone: C0=500 psi, φ=30°
  const C0  = 500;   // psi
  const phi = 30;    // degrees

  test("returns object with expected keys", () => {
    const res = geoMohrCoulombFailureEnvelope(1000, C0, phi);
    expect(res).toHaveProperty("tau_f_psi");
    expect(res).toHaveProperty("theta_f_deg");
    expect(res).toHaveProperty("diff_stress_failure_psi");
    expect(res).toHaveProperty("UCS_psi");
  });

  test("shear strength τ_f increases with normal stress", () => {
    const { tau_f_psi: tau1 } = geoMohrCoulombFailureEnvelope(500,  C0, phi);
    const { tau_f_psi: tau2 } = geoMohrCoulombFailureEnvelope(2000, C0, phi);
    expect(tau2).toBeGreaterThan(tau1);
  });

  test("failure angle is 45+φ/2 degrees", () => {
    const { theta_f_deg } = geoMohrCoulombFailureEnvelope(1000, C0, phi);
    expect(theta_f_deg).toBeCloseTo(45 + phi / 2, 5);
  });

  test("UCS ≈ 2C0·cos(φ)/(1-sin(φ)) for φ=30°", () => {
    const { UCS_psi } = geoMohrCoulombFailureEnvelope(1000, C0, phi);
    // φ=30°: UCS = 2*500*cos(30°)/(1-sin(30°)) = 1000*0.8660/0.5 = 1732 psi
    expect(UCS_psi).toBeCloseTo(1732, -1);
  });

  test("UCS = diff stress at failure when sigma3=0", () => {
    const { UCS_psi, diff_stress_failure_psi } = geoMohrCoulombFailureEnvelope(1000, C0, phi, 0);
    expect(diff_stress_failure_psi).toBeCloseTo(UCS_psi, 0);
  });

  test("diff stress at failure increases with confining stress", () => {
    const { diff_stress_failure_psi: df1 } = geoMohrCoulombFailureEnvelope(1000, C0, phi, 0);
    const { diff_stress_failure_psi: df2 } = geoMohrCoulombFailureEnvelope(1000, C0, phi, 1000);
    expect(df2).toBeGreaterThan(df1);
  });

  test("zero cohesion gives tau_f = sigma_n * tan(phi)", () => {
    const sigma_n = 2000;
    const { tau_f_psi } = geoMohrCoulombFailureEnvelope(sigma_n, 0, phi);
    const expected = sigma_n * Math.tan(phi * Math.PI / 180);
    expect(tau_f_psi).toBeCloseTo(expected, 3);
  });
});

describe("geoECD", () => {
  // 12.5 ppg mud, 8000 ft TVD, 700 gpm, 12.25-in hole, 5-in drill pipe
  // PV=20 cp, YP=15 lb/100ft²
  const MW = 12.5;
  const TVD = 8000;
  const Q = 700;
  const D_h = 12.25;
  const D_p = 5.0;
  const L = 8000;
  const mu_p = 20;
  const tau_y = 15;

  test("returns object with expected keys", () => {
    const res = geoECD(MW, TVD, Q, D_h, D_p, L, mu_p, tau_y);
    expect(res).toHaveProperty("ECD_ppg");
    expect(res).toHaveProperty("dP_annulus_psi");
    expect(res).toHaveProperty("ECD_gradient_psi_ft");
  });

  test("ECD is greater than mud weight (annular losses add to hydrostatic)", () => {
    const { ECD_ppg } = geoECD(MW, TVD, Q, D_h, D_p, L, mu_p, tau_y);
    expect(ECD_ppg).toBeGreaterThan(MW);
  });

  test("ECD increases with flow rate (more friction)", () => {
    const { ECD_ppg: ecd_low  } = geoECD(MW, TVD, 300, D_h, D_p, L, mu_p, tau_y);
    const { ECD_ppg: ecd_high } = geoECD(MW, TVD, 1000, D_h, D_p, L, mu_p, tau_y);
    expect(ecd_high).toBeGreaterThan(ecd_low);
  });

  test("ECD increases with viscosity", () => {
    const { ECD_ppg: ecd_low  } = geoECD(MW, TVD, Q, D_h, D_p, L, 10, tau_y);
    const { ECD_ppg: ecd_high } = geoECD(MW, TVD, Q, D_h, D_p, L, 50, tau_y);
    expect(ecd_high).toBeGreaterThan(ecd_low);
  });

  test("annular pressure loss is positive", () => {
    const { dP_annulus_psi } = geoECD(MW, TVD, Q, D_h, D_p, L, mu_p, tau_y);
    expect(dP_annulus_psi).toBeGreaterThan(0);
  });

  test("ECD gradient = ECD × 0.052", () => {
    const { ECD_ppg, ECD_gradient_psi_ft } = geoECD(MW, TVD, Q, D_h, D_p, L, mu_p, tau_y);
    expect(ECD_gradient_psi_ft).toBeCloseTo(ECD_ppg * 0.052, 6);
  });

  test("throws if hole diameter <= pipe diameter", () => {
    expect(() => geoECD(MW, TVD, Q, 4.0, 5.0, L, mu_p, tau_y)).toThrow();
  });

  test("zero flow rate gives ECD equal to mud weight", () => {
    const { ECD_ppg } = geoECD(MW, TVD, 0, D_h, D_p, L, 0, 0);
    expect(ECD_ppg).toBeCloseTo(MW, 3);
  });
});

describe("geoMudWeightWindowECD", () => {
  // PP=4000 psi, FG=7000 psi, TVD=8000 ft → PP_ppg≈9.6, FG_ppg≈16.8
  const PP  = 4000;
  const FG  = 7000;
  const TVD = 8000;
  const margin = 0.5;  // ppg
  const Q    = 500;
  const D_h  = 12.25;
  const D_p  = 5.0;
  const L    = 8000;
  const mu_p = 20;
  const tau_y = 15;

  test("returns object with expected keys", () => {
    const res = geoMudWeightWindowECD(PP, FG, TVD, margin, Q, D_h, D_p, L, mu_p, tau_y);
    expect(res).toHaveProperty("MW_min_ppg");
    expect(res).toHaveProperty("MW_max_ppg");
    expect(res).toHaveProperty("MW_recommended_ppg");
    expect(res).toHaveProperty("ECD_ppg");
    expect(res).toHaveProperty("window_safe");
  });

  test("MW_min < MW_recommended < MW_max", () => {
    const { MW_min_ppg, MW_recommended_ppg, MW_max_ppg } = geoMudWeightWindowECD(
      PP, FG, TVD, margin, Q, D_h, D_p, L, mu_p, tau_y,
    );
    expect(MW_min_ppg).toBeLessThan(MW_recommended_ppg);
    expect(MW_recommended_ppg).toBeLessThan(MW_max_ppg);
  });

  test("ECD_ppg is positive", () => {
    const { ECD_ppg } = geoMudWeightWindowECD(PP, FG, TVD, margin, Q, D_h, D_p, L, mu_p, tau_y);
    expect(ECD_ppg).toBeGreaterThan(0);
  });

  test("window_safe is boolean", () => {
    const { window_safe } = geoMudWeightWindowECD(PP, FG, TVD, margin, Q, D_h, D_p, L, mu_p, tau_y);
    expect(typeof window_safe).toBe("boolean");
  });

  test("narrow window (large margin) reduces safe range", () => {
    const { MW_max_ppg: max_small, MW_min_ppg: min_small } = geoMudWeightWindowECD(
      PP, FG, TVD, 0.5, Q, D_h, D_p, L, mu_p, tau_y,
    );
    const { MW_max_ppg: max_large, MW_min_ppg: min_large } = geoMudWeightWindowECD(
      PP, FG, TVD, 2.0, Q, D_h, D_p, L, mu_p, tau_y,
    );
    expect(max_large - min_large).toBeLessThan(max_small - min_small);
  });
});
