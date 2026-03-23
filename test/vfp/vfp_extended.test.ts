/**
 * Tests: VFP Extended — Ansari / Mukherjee-Brill / Hasan-Kabir
 */

import {
  ansariGradient,
  ansariBHP,
  mukherjeebrillGradient,
  mukherjeebrillBHP,
  hasanKabirGradient,
  hasanKabirBHP,
} from "../../src/functions/vfp";

// Shared test parameters
const q_bpd   = 2000;   // liquid rate
const GOR     = 400;    // scf/STB
const D_in    = 2.992;  // 2-7/8" tubing ID
const SG_liq  = 0.85;
const SG_gas  = 0.65;
const P_psia  = 2000;
const T_F     = 150;
const L_ft    = 8000;
const Pwh     = 200;    // psia

// ─── ansariGradient ───────────────────────────────────────────────────────────

describe("ansariGradient — vertical upflow", () => {
  test("returns positive gradient for upward flow (angle=90°)", () => {
    const grad = ansariGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F);
    expect(grad).toBeGreaterThan(0);
  });

  test("gradient ≈ 0.2–0.5 psi/ft for typical oil well", () => {
    const grad = ansariGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F);
    expect(grad).toBeGreaterThan(0.15);
    expect(grad).toBeLessThan(0.55);
  });

  test("gradient decreases for horizontal flow (angle=0°)", () => {
    const gradV = ansariGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 90);
    const gradH = ansariGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 0);
    expect(gradH).toBeLessThan(gradV);
  });

  test("higher GOR → lower gradient (gas lightens mix)", () => {
    const gradLow  = ansariGradient(q_bpd, 100,  D_in, SG_liq, SG_gas, P_psia, T_F);
    const gradHigh = ansariGradient(q_bpd, 2000, D_in, SG_liq, SG_gas, P_psia, T_F);
    expect(gradHigh).toBeLessThan(gradLow);
  });

  test("heavier liquid → higher gradient", () => {
    const gradLight = ansariGradient(q_bpd, GOR, D_in, 0.75, SG_gas, P_psia, T_F);
    const gradHeavy = ansariGradient(q_bpd, GOR, D_in, 0.95, SG_gas, P_psia, T_F);
    expect(gradHeavy).toBeGreaterThan(gradLight);
  });
});

describe("ansariBHP", () => {
  test("BHP > wellhead pressure for upward flow", () => {
    const bhp = ansariBHP(Pwh, q_bpd, GOR, D_in, L_ft, 80, 180, SG_liq, SG_gas);
    expect(bhp).toBeGreaterThan(Pwh);
  });

  test("BHP increases with depth", () => {
    const bhp4000 = ansariBHP(Pwh, q_bpd, GOR, D_in, 4000, 80, 180, SG_liq, SG_gas);
    const bhp8000 = ansariBHP(Pwh, q_bpd, GOR, D_in, 8000, 80, 180, SG_liq, SG_gas);
    expect(bhp8000).toBeGreaterThan(bhp4000);
  });

  test("reasonable BHP range (200–5000 psia) for typical inputs", () => {
    const bhp = ansariBHP(Pwh, q_bpd, GOR, D_in, L_ft, 80, 180, SG_liq, SG_gas);
    expect(bhp).toBeGreaterThan(200);
    expect(bhp).toBeLessThan(5000);
  });
});

// ─── mukherjeebrillGradient ──────────────────────────────────────────────────

describe("mukherjeebrillGradient — inclined pipe", () => {
  test("returns positive gradient for vertical upflow", () => {
    const grad = mukherjeebrillGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 90);
    expect(grad).toBeGreaterThan(0);
  });

  test("gradient within physical range for typical oil well", () => {
    const grad = mukherjeebrillGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 90);
    expect(grad).toBeGreaterThan(0.1);
    expect(grad).toBeLessThan(0.6);
  });

  test("near-horizontal gradient < vertical gradient", () => {
    const gradV = mukherjeebrillGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 90);
    const gradH = mukherjeebrillGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 5);
    expect(gradH).toBeLessThan(gradV);
  });

  test("high GOR (mist flow) has lower gravity component (HL → 0)", () => {
    // At mist flow regime (NGv > 50), holdup fraction HL drops close to liquid fraction
    // Test is that the correlation runs without error and returns a positive value
    const gradMist = mukherjeebrillGradient(q_bpd, 3000, D_in, SG_liq, SG_gas, P_psia, T_F);
    expect(gradMist).toBeGreaterThan(0);
    expect(isFinite(gradMist)).toBe(true);
  });
});

describe("mukherjeebrillBHP", () => {
  test("BHP > wellhead pressure", () => {
    const bhp = mukherjeebrillBHP(Pwh, q_bpd, GOR, D_in, L_ft, 80, 180, SG_liq, SG_gas);
    expect(bhp).toBeGreaterThan(Pwh);
  });

  test("BHP increases with depth", () => {
    const bhp1 = mukherjeebrillBHP(Pwh, q_bpd, GOR, D_in, 4000, 80, 180, SG_liq, SG_gas);
    const bhp2 = mukherjeebrillBHP(Pwh, q_bpd, GOR, D_in, 8000, 80, 180, SG_liq, SG_gas);
    expect(bhp2).toBeGreaterThan(bhp1);
  });
});

// ─── hasanKabirGradient ──────────────────────────────────────────────────────

describe("hasanKabirGradient — drift-flux", () => {
  test("returns positive gradient for upward flow", () => {
    const grad = hasanKabirGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 90);
    expect(grad).toBeGreaterThan(0);
  });

  test("gradient within physical range", () => {
    const grad = hasanKabirGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 90);
    expect(grad).toBeGreaterThan(0.1);
    expect(grad).toBeLessThan(0.6);
  });

  test("horizontal flow gradient < vertical gradient", () => {
    const gradV = hasanKabirGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 90);
    const gradH = hasanKabirGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P_psia, T_F, 0);
    expect(gradH).toBeLessThan(gradV);
  });

  test("high-GOR reduces gradient (more gas → lighter column)", () => {
    const gradLow  = hasanKabirGradient(q_bpd, 100,  D_in, SG_liq, SG_gas, P_psia, T_F);
    const gradHigh = hasanKabirGradient(q_bpd, 2000, D_in, SG_liq, SG_gas, P_psia, T_F);
    expect(gradHigh).toBeLessThan(gradLow);
  });

  test("bubble flow regime (low GOR) has HL close to lambda_L", () => {
    // At very low GOR, mostly liquid: gradient should approach pure liquid gradient
    const gradPure = SG_liq * 62.4 / 144;  // ≈ 0.368 psi/ft for SG=0.85
    const gradMix  = hasanKabirGradient(q_bpd, 10, D_in, SG_liq, SG_gas, P_psia, T_F);
    expect(gradMix).toBeGreaterThan(gradPure * 0.7);
  });
});

describe("hasanKabirBHP", () => {
  test("BHP > wellhead pressure", () => {
    const bhp = hasanKabirBHP(Pwh, q_bpd, GOR, D_in, L_ft, 80, 180, SG_liq, SG_gas);
    expect(bhp).toBeGreaterThan(Pwh);
  });

  test("deeper well → higher BHP", () => {
    const bhp1 = hasanKabirBHP(Pwh, q_bpd, GOR, D_in, 3000, 80, 180, SG_liq, SG_gas);
    const bhp2 = hasanKabirBHP(Pwh, q_bpd, GOR, D_in, 9000, 80, 180, SG_liq, SG_gas);
    expect(bhp2).toBeGreaterThan(bhp1);
  });

  test("Ansari, MB, and HK all return BHP > wellhead pressure", () => {
    const bhpA  = ansariBHP(Pwh, q_bpd, GOR, D_in, L_ft, 80, 180, SG_liq, SG_gas);
    const bhpMB = mukherjeebrillBHP(Pwh, q_bpd, GOR, D_in, L_ft, 80, 180, SG_liq, SG_gas);
    const bhpHK = hasanKabirBHP(Pwh, q_bpd, GOR, D_in, L_ft, 80, 180, SG_liq, SG_gas);
    expect(bhpA).toBeGreaterThan(Pwh);
    expect(bhpMB).toBeGreaterThan(Pwh);
    expect(bhpHK).toBeGreaterThan(Pwh);
  });
});
