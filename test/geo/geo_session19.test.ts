import { geoDeviatedStabilityWindow } from "../../src/functions/geo";

describe("geoDeviatedStabilityWindow", () => {
  // Baseline inputs
  const sigma_h = 6000;
  const sigma_H = 8000;
  const sigma_v = 9000;
  const Pp      = 4000;
  const inc_deg = 30;
  const az_deg  = 45;
  const C0      = 8000;
  const phi_deg = 30;
  const T0      = 500;
  const MW_ppg  = 11.0;
  const TVD_ft  = 8000;
  const Q_gpm   = 400;
  const D_h_in  = 8.5;
  const D_p_in  = 5.0;
  const L_ft    = 8000;
  const mu_p    = 15;
  const tau_y   = 10;

  it("returns correct shape", () => {
    const r = geoDeviatedStabilityWindow(
      sigma_h, sigma_H, sigma_v, Pp, inc_deg, az_deg, C0, phi_deg, T0,
      MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y,
    );
    expect(typeof r.MW_min_ppg).toBe("number");
    expect(typeof r.MW_max_ppg).toBe("number");
    expect(typeof r.MW_recommended_ppg).toBe("number");
    expect(typeof r.ECD_ppg).toBe("number");
    expect(typeof r.BP_psia).toBe("number");
    expect(typeof r.CP_psia).toBe("number");
    expect(typeof r.stable).toBe("boolean");
  });

  it("MW_max > MW_min for a stable formation", () => {
    const r = geoDeviatedStabilityWindow(
      sigma_h, sigma_H, sigma_v, Pp, inc_deg, az_deg, C0, phi_deg, T0,
      MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y,
    );
    expect(r.MW_max_ppg).toBeGreaterThan(r.MW_min_ppg);
  });

  it("BP_psia > CP_psia", () => {
    const r = geoDeviatedStabilityWindow(
      sigma_h, sigma_H, sigma_v, Pp, inc_deg, az_deg, C0, phi_deg, T0,
      MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y,
    );
    expect(r.BP_psia).toBeGreaterThan(r.CP_psia);
  });

  it("recommended MW is between min and max", () => {
    const r = geoDeviatedStabilityWindow(
      sigma_h, sigma_H, sigma_v, Pp, inc_deg, az_deg, C0, phi_deg, T0,
      MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y,
    );
    expect(r.MW_recommended_ppg).toBeGreaterThanOrEqual(r.MW_min_ppg);
    expect(r.MW_recommended_ppg).toBeLessThanOrEqual(r.MW_max_ppg);
  });

  it("ECD is close to MW_ppg for typical conditions", () => {
    const r = geoDeviatedStabilityWindow(
      sigma_h, sigma_H, sigma_v, Pp, inc_deg, az_deg, C0, phi_deg, T0,
      MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y,
    );
    // ECD should be slightly above MW due to annular friction
    expect(r.ECD_ppg).toBeGreaterThanOrEqual(MW_ppg);
    expect(r.ECD_ppg).toBeLessThan(MW_ppg + 3);
  });

  it("higher inclination changes the stability window", () => {
    const r0 = geoDeviatedStabilityWindow(
      sigma_h, sigma_H, sigma_v, Pp, 0, az_deg, C0, phi_deg, T0,
      MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y,
    );
    const r60 = geoDeviatedStabilityWindow(
      sigma_h, sigma_H, sigma_v, Pp, 60, az_deg, C0, phi_deg, T0,
      MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y,
    );
    // Different inclination → different breakdown pressures
    expect(r60.BP_psia).not.toEqual(r0.BP_psia);
  });

  it("stable flag is consistent with ECD and window", () => {
    const r = geoDeviatedStabilityWindow(
      sigma_h, sigma_H, sigma_v, Pp, inc_deg, az_deg, C0, phi_deg, T0,
      MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y,
    );
    const expectedStable = r.ECD_ppg > r.MW_min_ppg && r.ECD_ppg < r.MW_max_ppg;
    expect(r.stable).toBe(expectedStable);
  });
});
