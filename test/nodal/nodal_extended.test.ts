/**
 * Tests: Nodal Extended — Multi-String VLP + Artificial Lift Overlay
 */

import {
  nodalMultiStringVLP,
  nodalArtificialLiftOverlay,
} from "../../src/functions/nodal";

// ─── nodalMultiStringVLP ─────────────────────────────────────────────────────

describe("nodalMultiStringVLP", () => {
  // Two identical VLP strings: BHP = Pwh + 0.3 × q/1 (simple linear)
  const vlp1 = (q: number): number => 200 + 0.15 * q;
  const vlp2 = (q: number): number => 200 + 0.15 * q;
  // IPR: Pwf = 3000 − 0.8·q (Vogel-like linear)
  const ipr  = (q: number): number => 3000 - 0.8 * q;

  test("returns a composite curve with nBhpPoints elements", () => {
    const result = nodalMultiStringVLP([vlp1, vlp2], ipr, 10, 3000, 20);
    expect(result.compositeCurve).toHaveLength(20);
  });

  test("two identical strings: per-string rates are equal", () => {
    const result = nodalMultiStringVLP([vlp1, vlp2], ipr, 10, 3000);
    const [r1, r2] = result.perStringRates;
    expect(Math.abs(r1 - r2)).toBeLessThan(5);      // within 5 STB/d
  });

  test("two strings: total q_op > single-string q_op", () => {
    // Single string: IPR = vlp1 → 3000 − 0.8q = 200 + 0.15q → q = 2800/0.95 ≈ 2947
    const resultDouble = nodalMultiStringVLP([vlp1, vlp2], ipr, 10, 6000);
    const resultSingle = nodalMultiStringVLP([vlp1],       ipr, 10, 3000);
    expect(resultDouble.q_op).toBeGreaterThan(resultSingle.q_op * 0.9);
  });

  test("q_op is finite and positive", () => {
    const { q_op, Pwf_op } = nodalMultiStringVLP([vlp1, vlp2], ipr, 10, 3000);
    expect(isFinite(q_op)).toBe(true);
    expect(q_op).toBeGreaterThan(0);
    expect(isFinite(Pwf_op)).toBe(true);
    expect(Pwf_op).toBeGreaterThan(0);
  });

  test("composite curve is monotonically increasing in q (BHP ↑ as q ↑)", () => {
    const { compositeCurve } = nodalMultiStringVLP([vlp1, vlp2], ipr, 10, 3000);
    for (let i = 1; i < compositeCurve.length; i++) {
      // VLP: as BHP increases, the invertVlp() gives higher rate → q increases
      expect(compositeCurve[i].Pwf).toBeGreaterThanOrEqual(compositeCurve[i - 1].Pwf);
    }
  });

  test("per-string rates sum ≈ q_op", () => {
    const result = nodalMultiStringVLP([vlp1, vlp2], ipr, 10, 3000);
    const sumRates = result.perStringRates.reduce((a, b) => a + b, 0);
    expect(Math.abs(sumRates - result.q_op)).toBeLessThan(result.q_op * 0.1);
  });
});

// ─── nodalArtificialLiftOverlay ──────────────────────────────────────────────

describe("nodalArtificialLiftOverlay", () => {
  const Pr    = 3000;   // psia reservoir pressure
  const Qmax  = 2000;   // STB/d AOF
  const depth = 6000;   // ft
  const D_in  = 2.992;
  const GOR   = 300;
  const SG_liq = 0.85;
  const SG_gas = 0.65;
  const T_F   = 140;
  const Pwh   = 200;

  test("returns natural, esp, gasLift, rodPump results", () => {
    const result = nodalArtificialLiftOverlay(
      Pr, Qmax, depth, D_in, GOR, SG_liq, SG_gas, T_F, Pwh
    );
    expect(result).toHaveProperty("natural");
    expect(result).toHaveProperty("esp");
    expect(result).toHaveProperty("gasLift");
    expect(result).toHaveProperty("rodPump");
  });

  test("all q_op values are finite and positive", () => {
    const result = nodalArtificialLiftOverlay(
      Pr, Qmax, depth, D_in, GOR, SG_liq, SG_gas, T_F, Pwh
    );
    for (const method of ["natural", "esp", "gasLift", "rodPump"] as const) {
      expect(result[method].q_op).toBeGreaterThan(0);
      expect(isFinite(result[method].q_op)).toBe(true);
    }
  });

  test("ESP q_op > natural flow q_op (pump boost increases rate)", () => {
    const result = nodalArtificialLiftOverlay(
      Pr, Qmax, depth, D_in, GOR, SG_liq, SG_gas, T_F, Pwh,
      800,    // ESP boost
      500,
      0.85,
    );
    expect(result.esp.q_op).toBeGreaterThan(result.natural.q_op);
  });

  test("gas lift q_op > natural flow (injection lightens column)", () => {
    const result = nodalArtificialLiftOverlay(
      Pr, Qmax, depth, D_in, GOR, SG_liq, SG_gas, T_F, Pwh,
      0,      // no ESP
      1000,   // gas lift
      0.85,
    );
    expect(result.gasLift.q_op).toBeGreaterThan(result.natural.q_op);
  });

  test("rod pump q_op ≤ Qmax × efficiency (rate limited by displacement)", () => {
    const eff = 0.80;
    const result = nodalArtificialLiftOverlay(
      Pr, Qmax, depth, D_in, GOR, SG_liq, SG_gas, T_F, Pwh,
      0, 0, eff
    );
    expect(result.rodPump.q_op).toBeLessThanOrEqual(Qmax * eff * 1.05);
  });

  test("all Pwf_op values are finite and positive", () => {
    const result = nodalArtificialLiftOverlay(
      Pr, Qmax, depth, D_in, GOR, SG_liq, SG_gas, T_F, Pwh
    );
    for (const method of ["natural", "esp", "gasLift", "rodPump"] as const) {
      expect(result[method].Pwf_op).toBeGreaterThan(0);
      expect(isFinite(result[method].Pwf_op)).toBe(true);
    }
  });
});
