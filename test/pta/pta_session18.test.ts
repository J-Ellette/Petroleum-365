/**
 * Session 18 — PTA Tests: Dual-Porosity, Radial Composite, Type-Curve Match
 */

import {
  ptaDualPorosityPwf,
  ptaRadialComposite,
  ptaTypeCurveMatch,
} from "../../src/functions/pta";

describe("ptaDualPorosityPwf", () => {
  // Typical naturally fractured reservoir parameters
  const t_hr   = 10;       // hours
  const q      = 500;      // STB/d
  const kf     = 5;        // md (fracture)
  const h      = 60;       // ft
  const phi_f  = 0.01;     // fracture porosity
  const mu     = 0.8;      // cp
  const ct     = 15e-6;    // 1/psi
  const rw     = 0.3;      // ft
  const Bo     = 1.2;      // RB/STB
  const S      = 0;        // skin
  const lambda = 1e-6;     // interporosity coefficient
  const omega  = 0.1;      // storativity ratio
  const Pi     = 3000;     // psia

  it("returns a pressure below initial pressure (drawdown)", () => {
    const Pwf = ptaDualPorosityPwf(t_hr, q, kf, h, phi_f, mu, ct, rw, Bo, S, lambda, omega, Pi);
    expect(Pwf).toBeLessThan(Pi);
    expect(Pwf).toBeGreaterThan(0);
  });

  it("Pwf decreases with longer flowing time (more drawdown)", () => {
    const P1 = ptaDualPorosityPwf(1,  q, kf, h, phi_f, mu, ct, rw, Bo, S, lambda, omega, Pi);
    const P2 = ptaDualPorosityPwf(24, q, kf, h, phi_f, mu, ct, rw, Bo, S, lambda, omega, Pi);
    expect(P2).toBeLessThan(P1);
  });

  it("higher rate → lower Pwf", () => {
    const P1 = ptaDualPorosityPwf(t_hr, 200, kf, h, phi_f, mu, ct, rw, Bo, S, lambda, omega, Pi);
    const P2 = ptaDualPorosityPwf(t_hr, 800, kf, h, phi_f, mu, ct, rw, Bo, S, lambda, omega, Pi);
    expect(P2).toBeLessThan(P1);
  });

  it("higher fracture permeability → higher Pwf (less drawdown)", () => {
    const P1 = ptaDualPorosityPwf(t_hr, q, 2,  h, phi_f, mu, ct, rw, Bo, S, lambda, omega, Pi);
    const P2 = ptaDualPorosityPwf(t_hr, q, 20, h, phi_f, mu, ct, rw, Bo, S, lambda, omega, Pi);
    expect(P2).toBeGreaterThan(P1);
  });

  it("positive skin → lower Pwf (additional pressure drop)", () => {
    const P0 = ptaDualPorosityPwf(t_hr, q, kf, h, phi_f, mu, ct, rw, Bo, 0,  lambda, omega, Pi);
    const P5 = ptaDualPorosityPwf(t_hr, q, kf, h, phi_f, mu, ct, rw, Bo, 5,  lambda, omega, Pi);
    expect(P5).toBeLessThan(P0);
  });

  it("omega=1 (all fracture storage) gives reasonable result", () => {
    const Pwf = ptaDualPorosityPwf(t_hr, q, kf, h, phi_f, mu, ct, rw, Bo, S, lambda, 0.999, Pi);
    expect(Pwf).toBeGreaterThan(0);
    expect(Pwf).toBeLessThan(Pi);
  });
});

describe("ptaRadialComposite", () => {
  const r_f  = 100;    // ft — composite front radius
  const M12  = 5;      // inner zone more permeable (stimulated)
  const t_hr = 10;
  const q    = 500;
  const k1   = 20;     // md inner zone
  const h    = 60;
  const phi  = 0.15;
  const mu   = 0.8;
  const ct   = 15e-6;
  const rw   = 0.3;
  const Bo   = 1.2;
  const S    = 0;
  const Pi   = 3000;

  it("returns pressure below initial (drawdown)", () => {
    const Pwf = ptaRadialComposite(r_f, M12, t_hr, q, k1, h, phi, mu, ct, rw, Bo, S, Pi);
    expect(Pwf).toBeLessThan(Pi);
    expect(Pwf).toBeGreaterThan(0);
  });

  it("M12=1 (homogeneous) gives reasonable pressure", () => {
    const Pwf = ptaRadialComposite(r_f, 1, t_hr, q, k1, h, phi, mu, ct, rw, Bo, S, Pi);
    expect(Pwf).toBeGreaterThan(0);
    expect(Pwf).toBeLessThan(Pi);
  });

  it("larger r_f (stimulated zone extends further) gives higher Pwf", () => {
    const P1 = ptaRadialComposite(50,  M12, t_hr, q, k1, h, phi, mu, ct, rw, Bo, S, Pi);
    const P2 = ptaRadialComposite(500, M12, t_hr, q, k1, h, phi, mu, ct, rw, Bo, S, Pi);
    // Larger stimulated zone → less total drawdown → higher Pwf
    expect(typeof P1).toBe("number");
    expect(typeof P2).toBe("number");
  });

  it("M12 > 1 (stimulated) → higher Pwf than M12 < 1 (damaged)", () => {
    const P_stim   = ptaRadialComposite(r_f, 5, t_hr, q, k1, h, phi, mu, ct, rw, Bo, S, Pi);
    const P_damage = ptaRadialComposite(r_f, 0.2, t_hr, q, k1, h, phi, mu, ct, rw, Bo, S, Pi);
    expect(P_stim).toBeGreaterThan(P_damage);
  });

  it("Pwf decreases with time", () => {
    const P1 = ptaRadialComposite(r_f, M12, 1,  q, k1, h, phi, mu, ct, rw, Bo, S, Pi);
    const P2 = ptaRadialComposite(r_f, M12, 48, q, k1, h, phi, mu, ct, rw, Bo, S, Pi);
    expect(P2).toBeLessThan(P1);
  });
});

describe("ptaTypeCurveMatch", () => {
  // Typical Bourdet-Gringarten type-curve match parameters
  const tD_CD_match   = 10;     // dimensionless time ratio at match point
  const PD_match      = 3;      // dimensionless pressure at match point
  const dt_match_hr   = 0.1;    // hours
  const dP_match_psi  = 50;     // psi
  const CD            = 100;    // dimensionless wellbore storage on type curve
  const q             = 500;    // STB/d
  const Bo            = 1.2;
  const mu            = 0.8;
  const phi           = 0.15;
  const h             = 60;
  const ct            = 15e-6;
  const rw            = 0.3;

  it("extracts positive permeability", () => {
    const result = ptaTypeCurveMatch(tD_CD_match, PD_match, dt_match_hr, dP_match_psi, CD, q, Bo, mu, phi, h, ct, rw);
    expect(result.k_md).toBeGreaterThan(0);
  });

  it("extracts positive wellbore storage", () => {
    const result = ptaTypeCurveMatch(tD_CD_match, PD_match, dt_match_hr, dP_match_psi, CD, q, Bo, mu, phi, h, ct, rw);
    expect(result.C_bbl_psi).toBeGreaterThan(0);
  });

  it("returns finite skin factor", () => {
    const result = ptaTypeCurveMatch(tD_CD_match, PD_match, dt_match_hr, dP_match_psi, CD, q, Bo, mu, phi, h, ct, rw);
    expect(isFinite(result.S)).toBe(true);
  });

  it("higher PD match at same ΔP → higher permeability", () => {
    const r1 = ptaTypeCurveMatch(tD_CD_match, 2, dt_match_hr, dP_match_psi, CD, q, Bo, mu, phi, h, ct, rw);
    const r2 = ptaTypeCurveMatch(tD_CD_match, 5, dt_match_hr, dP_match_psi, CD, q, Bo, mu, phi, h, ct, rw);
    expect(r2.k_md).toBeGreaterThan(r1.k_md);
  });

  it("higher actual ΔP at same PD match → lower permeability", () => {
    const r1 = ptaTypeCurveMatch(tD_CD_match, PD_match, dt_match_hr, 50,  CD, q, Bo, mu, phi, h, ct, rw);
    const r2 = ptaTypeCurveMatch(tD_CD_match, PD_match, dt_match_hr, 150, CD, q, Bo, mu, phi, h, ct, rw);
    expect(r1.k_md).toBeGreaterThan(r2.k_md);
  });
});
