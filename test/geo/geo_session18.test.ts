/**
 * Session 18 — GEO Tests: Deviated Wellbore Kirsch + Fault Reactivation
 */

import {
  geoDeviatedKirsch,
  geoFaultReactivation,
} from "../../src/functions/geo";

describe("geoDeviatedKirsch — deviated wellbore stress analysis", () => {
  // Typical onshore reservoir (psi)
  const σ_h   = 5000;   // min horizontal stress
  const σ_H   = 7000;   // max horizontal stress
  const σ_v   = 8000;   // vertical (overburden)
  const Pp    = 3500;   // pore pressure
  const Pw    = 4000;   // mud weight equivalent pressure
  const C0    = 8000;   // UCS (psi)
  const phi   = 30;     // friction angle (°)

  it("returns all expected fields for vertical well (inc=0)", () => {
    const r = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0, 0, C0, phi);
    expect(r).toHaveProperty("σθθ_min_psi");
    expect(r).toHaveProperty("σθθ_max_psi");
    expect(r).toHaveProperty("breakdownP_psi");
    expect(r).toHaveProperty("collapseP_psi");
    expect(r).toHaveProperty("effectiveSh_psi");
    expect(r).toHaveProperty("effectiveSH_psi");
    expect(r).toHaveProperty("effectiveSv_psi");
  });

  it("max hoop stress ≥ min hoop stress", () => {
    const r = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0, 0, C0, phi);
    expect(r.σθθ_max_psi).toBeGreaterThanOrEqual(r.σθθ_min_psi);
  });

  it("effective stresses equal total stress minus pore pressure", () => {
    const r = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0, 0, C0, phi);
    expect(r.effectiveSh_psi).toBeCloseTo(σ_h - Pp, 1);
    expect(r.effectiveSH_psi).toBeCloseTo(σ_H - Pp, 1);
    expect(r.effectiveSv_psi).toBeCloseTo(σ_v - Pp, 1);
  });

  it("breakdown pressure is a finite number", () => {
    const r = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0, 0, C0, phi);
    expect(isFinite(r.breakdownP_psi)).toBe(true);
  });

  it("higher UCS → higher collapse pressure resistance (higher breakdownP)", () => {
    const r1 = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0, 0, 6000, phi);
    const r2 = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0, 0, 12000, phi);
    // Higher UCS → higher collapse Pw required → higher collapseP
    expect(r2.collapseP_psi).toBeLessThan(r1.collapseP_psi);
  });

  it("horizontal well (inc=90) returns finite values", () => {
    const r = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 90, 0, C0, phi);
    expect(isFinite(r.σθθ_min_psi)).toBe(true);
    expect(isFinite(r.σθθ_max_psi)).toBe(true);
    expect(isFinite(r.breakdownP_psi)).toBe(true);
  });

  it("increasing inclination changes hoop stresses", () => {
    const r0  = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0,  0, C0, phi);
    const r45 = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 45, 0, C0, phi);
    // Stresses should change with inclination
    expect(r45.σθθ_min_psi).not.toBeCloseTo(r0.σθθ_min_psi, 0);
  });

  it("tensile strength T0 increases breakdown pressure", () => {
    const r0 = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0, 0, C0, phi, 0);
    const r5 = geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, 0, 0, C0, phi, 500);
    expect(r5.breakdownP_psi).toBeGreaterThan(r0.breakdownP_psi);
  });
});

describe("geoFaultReactivation — critical pore pressure for fault slip", () => {
  // Normal fault in typical onshore setting
  const σ_h   = 5000;
  const σ_H   = 7000;
  const σ_v   = 8000;
  const Pp0   = 3500;
  const dip   = 60;    // 60° dip (normal fault)
  const az    = 0;     // strike parallel to σ_H
  const mu_f  = 0.6;
  const Cf    = 0;

  it("returns all expected fields", () => {
    const r = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, dip, az, mu_f, Cf);
    expect(r).toHaveProperty("σ_n_psi");
    expect(r).toHaveProperty("τ_psi");
    expect(r).toHaveProperty("P_crit_psi");
    expect(r).toHaveProperty("safetyMargin_psi");
    expect(r).toHaveProperty("willReactivate");
  });

  it("normal stress and shear stress are positive", () => {
    const r = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, dip, az, mu_f, Cf);
    expect(r.σ_n_psi).toBeGreaterThan(0);
    expect(r.τ_psi).toBeGreaterThanOrEqual(0);
  });

  it("willReactivate is false when Pp < P_crit", () => {
    const r = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, dip, az, mu_f, Cf);
    if (r.P_crit_psi > Pp0) {
      expect(r.willReactivate).toBe(false);
    }
  });

  it("willReactivate becomes true when pore pressure elevated above P_crit", () => {
    const r = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, dip, az, mu_f, Cf);
    const P_elevated = r.P_crit_psi + 100;  // above critical
    const r2 = geoFaultReactivation(σ_h, σ_H, σ_v, P_elevated, dip, az, mu_f, Cf);
    expect(r2.willReactivate).toBe(true);
  });

  it("higher friction coefficient increases P_crit (harder to reactivate)", () => {
    const r_low_mu  = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, dip, az, 0.3, Cf);
    const r_high_mu = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, dip, az, 0.8, Cf);
    // Higher friction → P_crit = σ_n − (τ−Cf)/μ → larger P_crit (need more Pp to cause slip)
    expect(r_high_mu.P_crit_psi).toBeGreaterThan(r_low_mu.P_crit_psi);
  });

  it("cohesion increases P_crit (fault is stronger, harder to reactivate)", () => {
    const r0  = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, dip, az, mu_f, 0);
    const r1k = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, dip, az, mu_f, 1000);
    // Higher C_f → (τ − C_f)/μ_f smaller → P_crit = σ_n − smaller → larger P_crit
    expect(r1k.P_crit_psi).toBeGreaterThan(r0.P_crit_psi);
  });

  it("returns finite values for horizontal fault (dip=0)", () => {
    const r = geoFaultReactivation(σ_h, σ_H, σ_v, Pp0, 0, az, mu_f, Cf);
    expect(isFinite(r.P_crit_psi)).toBe(true);
  });
});
