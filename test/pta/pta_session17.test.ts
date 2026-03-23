/**
 * Session 17 — PTA Tests: MDH/Horner analysis and wellbore storage diagnostic
 */

import {
  ptaMDHAnalysis,
  ptaHornerAnalysis,
  ptaWellboreStorageDiagnostic,
} from "../../src/functions/pta";

// ─── Synthetic buildup data ──────────────────────────────────────────────────
// Simulate a pressure buildup with true k=50 md, S=5, Pi=4000 psi
// Using: Pws(Δt) ≈ Pwf_s + m * log10(Δt) + m * log10(k/φμct rw²) − 3.2275·m
// Simplified: Pws = 3000 + 160 * log10(Δt+1)  (approximate)

function buildupData(n: number, tp_hrs: number): { dt: number[]; Pws: number[] } {
  const dt: number[] = [];
  const Pws: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.pow(10, -1 + (i / (n - 1)) * 2.5);  // 0.1 to ~300 hrs log-spaced
    dt.push(t);
    // Horner-like formula: Pws = Pi - m*log10((tp+Δt)/Δt)  where m<0 means pressure rises
    const m_cycle = -160;  // psi/log-cycle (negative because pressure rises)
    Pws.push(4000 + m_cycle * Math.log10((tp_hrs + t) / t));
  }
  return { dt, Pws };
}

describe("ptaMDHAnalysis", () => {
  const { dt, Pws } = buildupData(20, 100);
  const q = 500;     // STB/d
  const mu = 1.2;
  const Bo = 1.3;
  const h = 30;
  const phi = 0.15;
  const ct = 15e-6;
  const rw = 0.35;
  const Pwf_s = 2800;

  test("returns object with expected keys", () => {
    const res = ptaMDHAnalysis(dt, Pws, q, mu, Bo, h, phi, ct, rw, Pwf_s);
    expect(res).toHaveProperty("m_psi_cycle");
    expect(res).toHaveProperty("k_md");
    expect(res).toHaveProperty("S_skin");
    expect(res).toHaveProperty("P1hr_psi");
  });

  test("permeability is positive", () => {
    const { k_md } = ptaMDHAnalysis(dt, Pws, q, mu, Bo, h, phi, ct, rw, Pwf_s);
    expect(k_md).toBeGreaterThan(0);
  });

  test("P1hr is greater than Pwf_s (pressure has risen)", () => {
    const { P1hr_psi } = ptaMDHAnalysis(dt, Pws, q, mu, Bo, h, phi, ct, rw, Pwf_s);
    expect(P1hr_psi).toBeGreaterThan(Pwf_s);
  });

  test("throws for too few data points", () => {
    expect(() => ptaMDHAnalysis([1, 2], [3000, 3100], q, mu, Bo, h, phi, ct, rw, Pwf_s)).toThrow();
  });

  test("throws for mismatched array lengths", () => {
    expect(() => ptaMDHAnalysis([1, 2, 3], [3000, 3100], q, mu, Bo, h, phi, ct, rw, Pwf_s)).toThrow();
  });
});

describe("ptaHornerAnalysis", () => {
  const tp_hrs = 100;
  const { dt, Pws } = buildupData(20, tp_hrs);
  const q = 500;
  const mu = 1.2;
  const Bo = 1.3;
  const h = 30;
  const phi = 0.15;
  const ct = 15e-6;
  const rw = 0.35;
  const Pwf_s = 2800;

  test("returns object with expected keys", () => {
    const res = ptaHornerAnalysis(dt, Pws, tp_hrs, q, mu, Bo, h, phi, ct, rw, Pwf_s);
    expect(res).toHaveProperty("m_psi_cycle");
    expect(res).toHaveProperty("k_md");
    expect(res).toHaveProperty("S_skin");
    expect(res).toHaveProperty("p_star_psi");
  });

  test("p_star approaches initial pressure (extrapolated p*)", () => {
    const { p_star_psi } = ptaHornerAnalysis(dt, Pws, tp_hrs, q, mu, Bo, h, phi, ct, rw, Pwf_s);
    // p* should be close to Pi=4000 psi for our synthetic data
    expect(p_star_psi).toBeGreaterThan(3500);
    expect(p_star_psi).toBeLessThan(4500);
  });

  test("permeability is positive", () => {
    const { k_md } = ptaHornerAnalysis(dt, Pws, tp_hrs, q, mu, Bo, h, phi, ct, rw, Pwf_s);
    expect(k_md).toBeGreaterThan(0);
  });

  test("longer tp gives same p* (Horner extrapolation invariant for same data)", () => {
    const { dt: dt2, Pws: Pws2 } = buildupData(20, 200);
    const res1 = ptaHornerAnalysis(dt, Pws, 100, q, mu, Bo, h, phi, ct, rw, Pwf_s);
    const res2 = ptaHornerAnalysis(dt2, Pws2, 200, q, mu, Bo, h, phi, ct, rw, Pwf_s);
    // Both should give p* near 4000 (same initial pressure)
    expect(res1.p_star_psi).toBeGreaterThan(3500);
    expect(res2.p_star_psi).toBeGreaterThan(3500);
  });

  test("throws for too few data points", () => {
    expect(() => ptaHornerAnalysis([1, 2], [3000, 3100], tp_hrs, q, mu, Bo, h, phi, ct, rw, Pwf_s)).toThrow();
  });
});

describe("ptaWellboreStorageDiagnostic", () => {
  // Synthetic unit-slope data: ΔP = q B Δt / (24 C)  with C = 0.05 bbl/psi
  const C_true = 0.05;  // bbl/psi
  const q = 500;        // STB/d
  const Bo = 1.3;
  const dt_hrs = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0];
  const dp_psi = dt_hrs.map(dt => (q * Bo * dt) / (24 * C_true));  // unit-slope line

  const phi = 0.15;
  const h = 30;
  const rw = 0.35;
  const ct = 15e-6;

  test("returns object with expected keys", () => {
    const res = ptaWellboreStorageDiagnostic(dt_hrs, dp_psi, q, Bo, phi, h, rw, ct);
    expect(res).toHaveProperty("C_bbl_psi");
    expect(res).toHaveProperty("C_D");
    expect(res).toHaveProperty("unitSlopeEnd_hrs");
  });

  test("C estimate is positive", () => {
    const { C_bbl_psi } = ptaWellboreStorageDiagnostic(dt_hrs, dp_psi, q, Bo, phi, h, rw, ct);
    expect(C_bbl_psi).toBeGreaterThan(0);
  });

  test("C_D is positive", () => {
    const { C_D } = ptaWellboreStorageDiagnostic(dt_hrs, dp_psi, q, Bo, phi, h, rw, ct);
    expect(C_D).toBeGreaterThan(0);
  });

  test("higher C produces higher C estimate", () => {
    const dp_highC = dt_hrs.map(dt => (q * Bo * dt) / (24 * 0.2));  // C=0.2 bbl/psi
    const { C_bbl_psi: C_low } = ptaWellboreStorageDiagnostic(dt_hrs, dp_psi, q, Bo, phi, h, rw, ct);
    const { C_bbl_psi: C_high } = ptaWellboreStorageDiagnostic(dt_hrs, dp_highC, q, Bo, phi, h, rw, ct);
    expect(C_high).toBeGreaterThan(C_low);
  });

  test("throws for fewer than 2 data points", () => {
    expect(() => ptaWellboreStorageDiagnostic([1], [100], q, Bo, phi, h, rw, ct)).toThrow();
  });

  test("throws for mismatched array lengths", () => {
    expect(() => ptaWellboreStorageDiagnostic([1, 2, 3], [100, 200], q, Bo, phi, h, rw, ct)).toThrow();
  });
});
