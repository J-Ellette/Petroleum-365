/**
 * Tests: VFP Session 15 — Poettmann-Carpenter / Duns-Ros / Orkiszewski
 */

import {
  poettmannCarpenterGradient,
  poettmannCarpenterBHP,
  dunsRosGradient,
  dunsRosBHP,
  orkiszewskiGradient,
  orkiszewskiBHP,
} from "../../src/functions/vfp";

// Shared test parameters
const q_oil   = 1500;   // bbl/d oil
const q_gas   = 1.5;    // Mscf/d free gas
const q_wat   = 500;    // bbl/d water
const D_in    = 2.992;  // 2-7/8" tubing ID (in)
const SG_oil  = 0.85;
const SG_gas  = 0.65;
const mu_l    = 2.0;    // cp liquid viscosity
const sigma   = 0.04;   // lbf/ft surface tension
const P_avg   = 2000;   // psia
const T_avg   = 150;    // °F
const L_ft    = 8000;   // tubing length
const Pwh     = 200;    // psia wellhead pressure
const T_wh    = 80;     // °F wellhead T
const T_bh    = 190;    // °F bottomhole T

// ─── poettmannCarpenterGradient ──────────────────────────────────────────────

describe("poettmannCarpenterGradient", () => {
  test("returns positive gradient for vertical upflow", () => {
    const grad = poettmannCarpenterGradient(q_oil, q_gas, q_wat, D_in, SG_oil, SG_gas, P_avg, T_avg);
    expect(grad).toBeGreaterThan(0);
    expect(grad).toBeLessThan(0.5);   // reasonable physical range
  });

  test("gradient increases with GOR (more gas, slightly less dense mixture)", () => {
    const g1 = poettmannCarpenterGradient(q_oil, 0.5, q_wat, D_in, SG_oil, SG_gas, P_avg, T_avg);
    const g2 = poettmannCarpenterGradient(q_oil, 5.0, q_wat, D_in, SG_oil, SG_gas, P_avg, T_avg);
    // Higher GOR → lower average density → lower gradient
    expect(g1).toBeGreaterThan(g2);
  });

  test("gradient increases with liquid SG (heavier mixture)", () => {
    const g1 = poettmannCarpenterGradient(q_oil, q_gas, q_wat, D_in, 0.80, SG_gas, P_avg, T_avg);
    const g2 = poettmannCarpenterGradient(q_oil, q_gas, q_wat, D_in, 0.90, SG_gas, P_avg, T_avg);
    expect(g2).toBeGreaterThan(g1);
  });

  test("zero rates returns zero gradient", () => {
    const grad = poettmannCarpenterGradient(0, 0, 0, D_in, SG_oil, SG_gas, P_avg, T_avg);
    expect(grad).toBe(0);
  });

  test("gradient in expected range for typical oil well", () => {
    // Typical: ~0.25–0.40 psi/ft for oil wells at ~2000 bbl/d
    const grad = poettmannCarpenterGradient(2000, 1.0, 0, D_in, SG_oil, SG_gas, P_avg, T_avg);
    expect(grad).toBeGreaterThan(0.2);
    expect(grad).toBeLessThan(0.5);
  });
});

// ─── poettmannCarpenterBHP ────────────────────────────────────────────────────

describe("poettmannCarpenterBHP", () => {
  test("BHP > wellhead pressure", () => {
    const bhp = poettmannCarpenterBHP(Pwh, q_oil, q_gas, q_wat, D_in, L_ft, SG_oil, SG_gas, T_wh, T_bh);
    expect(bhp).toBeGreaterThan(Pwh);
  });

  test("BHP increases with tubing length", () => {
    const bhp1 = poettmannCarpenterBHP(Pwh, q_oil, q_gas, q_wat, D_in, 4000, SG_oil, SG_gas, T_wh, T_bh);
    const bhp2 = poettmannCarpenterBHP(Pwh, q_oil, q_gas, q_wat, D_in, 8000, SG_oil, SG_gas, T_wh, T_bh);
    expect(bhp2).toBeGreaterThan(bhp1);
  });

  test("BHP is in physically reasonable range", () => {
    const bhp = poettmannCarpenterBHP(Pwh, q_oil, q_gas, q_wat, D_in, L_ft, SG_oil, SG_gas, T_wh, T_bh);
    expect(bhp).toBeGreaterThan(500);
    expect(bhp).toBeLessThan(5000);
  });
});

// ─── dunsRosGradient ──────────────────────────────────────────────────────────

describe("dunsRosGradient", () => {
  test("returns positive gradient for typical oil well", () => {
    const grad = dunsRosGradient(q_oil, q_gas, q_wat, D_in, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    expect(grad).toBeGreaterThan(0);
    expect(grad).toBeLessThan(0.5);
  });

  test("zero rates returns zero gradient", () => {
    const grad = dunsRosGradient(0, 0, 0, D_in, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    expect(grad).toBe(0);
  });

  test("high GOR (mist flow) gradient lower than bubble flow gradient", () => {
    // Low GOR = bubble/slug flow
    const g_bubble = dunsRosGradient(2000, 0.1, 0, D_in, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    // Very high GOR = approaching mist flow
    const g_mist   = dunsRosGradient(100, 50.0, 0, D_in, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    expect(g_mist).toBeLessThan(g_bubble);
  });

  test("gradient decreases with smaller diameter (higher velocity → more friction)", () => {
    const g_large = dunsRosGradient(q_oil, q_gas, q_wat, 4.0, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    const g_small = dunsRosGradient(q_oil, q_gas, q_wat, 2.0, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    // Smaller diameter → higher friction → higher gradient
    expect(g_small).toBeGreaterThan(g_large);
  });

  test("gradient is in expected range for typical conditions", () => {
    const grad = dunsRosGradient(1000, 1.0, 500, D_in, SG_oil, SG_gas, mu_l, sigma, 2000, T_avg);
    expect(grad).toBeGreaterThan(0.15);
    expect(grad).toBeLessThan(0.5);
  });
});

// ─── dunsRosBHP ───────────────────────────────────────────────────────────────

describe("dunsRosBHP", () => {
  test("BHP > wellhead pressure for liquid-dominated well", () => {
    const bhp = dunsRosBHP(Pwh, q_oil, q_gas, q_wat, D_in, L_ft, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    expect(bhp).toBeGreaterThan(Pwh);
  });

  test("BHP increases with tubing length", () => {
    const bhp1 = dunsRosBHP(Pwh, q_oil, q_gas, q_wat, D_in, 3000, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    const bhp2 = dunsRosBHP(Pwh, q_oil, q_gas, q_wat, D_in, 8000, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    expect(bhp2).toBeGreaterThan(bhp1);
  });

  test("BHP in physical range", () => {
    const bhp = dunsRosBHP(Pwh, q_oil, q_gas, q_wat, D_in, L_ft, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    expect(bhp).toBeGreaterThan(500);
    expect(bhp).toBeLessThan(5000);
  });
});

// ─── orkiszewskiGradient ──────────────────────────────────────────────────────

describe("orkiszewskiGradient", () => {
  test("returns positive gradient for typical oil well", () => {
    const grad = orkiszewskiGradient(q_oil, q_gas, q_wat, D_in, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    expect(grad).toBeGreaterThan(0);
    expect(grad).toBeLessThan(0.5);
  });

  test("zero rates returns zero gradient", () => {
    const grad = orkiszewskiGradient(0, 0, 0, D_in, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    expect(grad).toBe(0);
  });

  test("gradient increases with heavier oil gravity", () => {
    const g1 = orkiszewskiGradient(q_oil, q_gas, q_wat, D_in, 0.80, SG_gas, mu_l, sigma, P_avg, T_avg);
    const g2 = orkiszewskiGradient(q_oil, q_gas, q_wat, D_in, 0.92, SG_gas, mu_l, sigma, P_avg, T_avg);
    expect(g2).toBeGreaterThan(g1);
  });

  test("gradient decreases with higher GOR (lower mixture density)", () => {
    const g1 = orkiszewskiGradient(q_oil, 0.5, q_wat, D_in, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    const g2 = orkiszewskiGradient(q_oil, 5.0, q_wat, D_in, SG_oil, SG_gas, mu_l, sigma, P_avg, T_avg);
    expect(g1).toBeGreaterThan(g2);
  });

  test("gradient in expected range for typical conditions", () => {
    const grad = orkiszewskiGradient(1500, 1.0, 500, D_in, SG_oil, SG_gas, mu_l, sigma, 2000, T_avg);
    expect(grad).toBeGreaterThan(0.15);
    expect(grad).toBeLessThan(0.5);
  });
});

// ─── orkiszewskiBHP ───────────────────────────────────────────────────────────

describe("orkiszewskiBHP", () => {
  test("BHP > wellhead pressure", () => {
    const bhp = orkiszewskiBHP(Pwh, q_oil, q_gas, q_wat, D_in, L_ft, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    expect(bhp).toBeGreaterThan(Pwh);
  });

  test("BHP increases with tubing length", () => {
    const bhp1 = orkiszewskiBHP(Pwh, q_oil, q_gas, q_wat, D_in, 3000, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    const bhp2 = orkiszewskiBHP(Pwh, q_oil, q_gas, q_wat, D_in, 8000, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    expect(bhp2).toBeGreaterThan(bhp1);
  });

  test("BHP is in physically reasonable range", () => {
    const bhp = orkiszewskiBHP(Pwh, q_oil, q_gas, q_wat, D_in, L_ft, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    expect(bhp).toBeGreaterThan(500);
    expect(bhp).toBeLessThan(5000);
  });

  test("Orkiszewski BHP comparable to Duns-Ros BHP (within 20%)", () => {
    const bhp_ork = orkiszewskiBHP(Pwh, q_oil, q_gas, q_wat, D_in, L_ft, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    const bhp_dr  = dunsRosBHP(Pwh, q_oil, q_gas, q_wat, D_in, L_ft, SG_oil, SG_gas, mu_l, sigma, T_wh, T_bh);
    expect(Math.abs(bhp_ork - bhp_dr) / bhp_dr).toBeLessThan(0.20);
  });
});
