/**
 * Tests for P365 PTA extensions — interference test and pulse test
 */
import {
  interferenceTransientPressure,
  interferencePermeability,
  interferenceStorativity,
  pulseTestAmplitude,
  pulseTestPermeability,
  pulseTestStorativity,
} from "../../src/functions/pta";

// Standard test parameters
// k=2 mD chosen so that x = 948*0.15*1*20e-6*500^2/(2*72) = 4.94 > 1
// (in the monotonically increasing region of the line-source solution)
const q_STB_d   = 200;       // production rate (STB/d)
const mu_cp     = 1.0;       // viscosity (cp)
const Bo_res    = 1.2;       // FVF (res bbl/STB)
const k_mD      = 2;         // permeability (mD) — in monotone region
const h_ft      = 30;        // thickness (ft)
const phi       = 0.15;      // porosity
const ct_psi    = 20e-6;     // total compressibility (psia^-1)
const r_ft      = 500;       // well spacing (ft)
const t_hrs     = 72;        // test duration (hours)

// ─── Interference Transient Pressure ─────────────────────────────────────────

describe("interferenceTransientPressure", () => {
  test("returns positive pressure drop for standard parameters", () => {
    const dp = interferenceTransientPressure(
      q_STB_d, mu_cp, Bo_res, k_mD, h_ft, phi, ct_psi, r_ft, t_hrs
    );
    expect(dp).toBeGreaterThan(0);
  });

  test("pressure drop increases with time", () => {
    // For x > 1 (early time), longer time means smaller x and larger |Ei|*prefix
    // At k=2, x(t=48)=9.875/2*(72/48)=7.4, x(t=144)=2.47 — dp increases with t
    const dp1 = interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, k_mD, h_ft, phi, ct_psi, r_ft, 48);
    const dp2 = interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, k_mD, h_ft, phi, ct_psi, r_ft, 144);
    expect(dp2).toBeGreaterThan(dp1);
  });

  test("pressure drop decreases with distance", () => {
    // Larger r at same t and k: x increases → dp decreases
    const dp1 = interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, k_mD, h_ft, phi, ct_psi, 200, t_hrs);
    const dp2 = interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, k_mD, h_ft, phi, ct_psi, 800, t_hrs);
    expect(dp1).toBeGreaterThan(dp2);
  });

  test("pressure drop is proportional to rate", () => {
    const dp1 = interferenceTransientPressure(100, mu_cp, Bo_res, k_mD, h_ft, phi, ct_psi, r_ft, t_hrs);
    const dp2 = interferenceTransientPressure(400, mu_cp, Bo_res, k_mD, h_ft, phi, ct_psi, r_ft, t_hrs);
    expect(dp2 / dp1).toBeCloseTo(4, 4); // strictly linear in rate
  });

  test("pressure drop increases with k in the signal-arriving phase (x > 1)", () => {
    // For k in [1, 5] mD at t=72hrs, r=500ft: x = 948*0.15*20e-6*250000/(k*72) = 9.875/k
    // k=1: x=9.875 (signal arriving slowly, small dp)
    // k=5: x=1.975 (more signal, larger dp)
    const dp1 = interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, 1, h_ft, phi, ct_psi, r_ft, t_hrs);
    const dp5 = interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, 5, h_ft, phi, ct_psi, r_ft, t_hrs);
    expect(dp5).toBeGreaterThan(dp1);
  });

  test("throws for zero permeability", () => {
    expect(() => interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, 0, h_ft, phi, ct_psi, r_ft, t_hrs)).toThrow();
  });

  test("throws for zero distance", () => {
    expect(() => interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, k_mD, h_ft, phi, ct_psi, 0, t_hrs)).toThrow();
  });

  test("throws for invalid porosity", () => {
    expect(() => interferenceTransientPressure(q_STB_d, mu_cp, Bo_res, k_mD, h_ft, 0, ct_psi, r_ft, t_hrs)).toThrow();
  });

  test("round-trip: compute dp at k=2 then recover k", () => {
    // k=2 mD, x = 9.875/2 = 4.94 > 1 — in monotone increasing region
    const k_true = 2;
    const dp = interferenceTransientPressure(
      q_STB_d, mu_cp, Bo_res, k_true, h_ft, phi, ct_psi, r_ft, t_hrs
    );
    expect(dp).toBeGreaterThan(0);
    const k_est = interferencePermeability(
      q_STB_d, mu_cp, Bo_res, h_ft, phi, ct_psi, r_ft, t_hrs, dp, k_true
    );
    expect(k_est).toBeCloseTo(k_true, 0);
  });
});

// ─── Interference Permeability ────────────────────────────────────────────────

describe("interferencePermeability", () => {
  test("converges from different initial guesses in monotone region", () => {
    const k_true = 2; // mD — x = 4.94 at t=72hrs, r=500ft
    const dp = interferenceTransientPressure(
      q_STB_d, mu_cp, Bo_res, k_true, h_ft, phi, ct_psi, r_ft, t_hrs
    );
    // Test convergence from 1/2x and 2x of true value (within monotone region)
    const k1 = interferencePermeability(q_STB_d, mu_cp, Bo_res, h_ft, phi, ct_psi, r_ft, t_hrs, dp, k_true / 2);
    const k2 = interferencePermeability(q_STB_d, mu_cp, Bo_res, h_ft, phi, ct_psi, r_ft, t_hrs, dp, k_true * 2);
    expect(k1).toBeCloseTo(k_true, 0);
    expect(k2).toBeCloseTo(k_true, 0);
  });

  test("throws for zero pressure drop", () => {
    expect(() => interferencePermeability(q_STB_d, mu_cp, Bo_res, h_ft, phi, ct_psi, r_ft, t_hrs, 0)).toThrow();
  });
});

// ─── Interference Storativity ─────────────────────────────────────────────────

describe("interferenceStorativity", () => {
  test("returns positive storativity", () => {
    const storativity = interferenceStorativity(k_mD, mu_cp, r_ft, t_hrs, 0.5);
    expect(storativity).toBeGreaterThan(0);
  });

  test("recover phi*ct from known parameters using 948 factor", () => {
    // interferenceStorativity returns x * k * t / (948 * mu * r^2)
    // So: x = 948 * phiCt * mu * r^2 / (k * t)
    const x_ei = 0.3;
    const phiCt_true = phi * ct_psi;
    // Compute x that gives phiCt_true using the correct factor 948
    const x = 948 * phiCt_true * mu_cp * r_ft * r_ft / (k_mD * t_hrs);
    const phiCt_est = interferenceStorativity(k_mD, mu_cp, r_ft, t_hrs, x);
    expect(phiCt_est).toBeCloseTo(phiCt_true, 8);
  });

  test("throws for non-positive inputs", () => {
    expect(() => interferenceStorativity(0, mu_cp, r_ft, t_hrs, 0.5)).toThrow();
    expect(() => interferenceStorativity(k_mD, 0, r_ft, t_hrs, 0.5)).toThrow();
  });
});

// ─── Pulse Test Amplitude ─────────────────────────────────────────────────────

describe("pulseTestAmplitude", () => {
  // Use k=50 mD so that Ei arguments yield meaningful pressure differences
  // At k=50, t_total=9: x = 948*0.15*20e-6*250000/(50*9) = 0.198 — Ei(-0.198) ≈ -1.23
  test("returns positive amplitude", () => {
    const amp = pulseTestAmplitude(
      q_STB_d, mu_cp, Bo_res, 50, h_ft, phi, ct_psi, r_ft,
      6,   // t_pulse_hrs
      3    // t_lag_hrs
    );
    expect(amp).toBeGreaterThan(0);
  });

  test("larger pulse duration gives larger amplitude", () => {
    const amp1 = pulseTestAmplitude(q_STB_d, mu_cp, Bo_res, 50, h_ft, phi, ct_psi, r_ft, 4, 2);
    const amp2 = pulseTestAmplitude(q_STB_d, mu_cp, Bo_res, 50, h_ft, phi, ct_psi, r_ft, 12, 2);
    expect(amp2).toBeGreaterThan(amp1);
  });

  test("amplitude is strictly positive for valid inputs", () => {
    // At k=10, t_total=9hrs, r=500ft: x = 948*0.15*20e-6*250000/(10*9) = 0.988
    // dp_total = 56.48 * |Ei(-0.988)| > 0
    const amp = pulseTestAmplitude(q_STB_d, mu_cp, Bo_res, 10, h_ft, phi, ct_psi, r_ft, 6, 3);
    expect(amp).toBeGreaterThan(0);
  });
});

// ─── Pulse Test Permeability ──────────────────────────────────────────────────

describe("pulseTestPermeability", () => {
  test("recovers known permeability (k=50 mD)", () => {
    const k_true = 50;
    const dp_observed = pulseTestAmplitude(
      q_STB_d, mu_cp, Bo_res, k_true, h_ft, phi, ct_psi, r_ft, 6, 3
    );
    expect(dp_observed).toBeGreaterThan(0);
    const k_est = pulseTestPermeability(
      q_STB_d, mu_cp, Bo_res, h_ft, phi, ct_psi, r_ft, 6, 3, dp_observed, k_true
    );
    expect(k_est).toBeCloseTo(k_true, 0);
  });

  test("throws for non-positive pressure response", () => {
    expect(() => pulseTestPermeability(
      q_STB_d, mu_cp, Bo_res, h_ft, phi, ct_psi, r_ft, 6, 3, 0
    )).toThrow();
  });
});

// ─── Pulse Test Storativity ───────────────────────────────────────────────────

describe("pulseTestStorativity", () => {
  test("returns positive storativity", () => {
    const phiCt = pulseTestStorativity(k_mD, mu_cp, r_ft, t_hrs);
    expect(phiCt).toBeGreaterThan(0);
  });

  test("round-trip storativity recovery using 948 factor", () => {
    // pulseTestStorativity returns 948 * k * t_lag / (mu * r^2 * x_L)
    // So: t_lag = phiCt * mu * r^2 * x_L / (948 * k)
    const x_L = 0.28;
    const phiCt_true = phi * ct_psi;
    // Correct factor is 948 (not 1688.9)
    const t_lag = phiCt_true * mu_cp * r_ft * r_ft * x_L / (948 * k_mD);
    const phiCt_est = pulseTestStorativity(k_mD, mu_cp, r_ft, t_lag, x_L);
    expect(phiCt_est).toBeCloseTo(phiCt_true, 8);
  });

  test("throws for non-positive inputs", () => {
    expect(() => pulseTestStorativity(0, mu_cp, r_ft, t_hrs)).toThrow();
  });
});
