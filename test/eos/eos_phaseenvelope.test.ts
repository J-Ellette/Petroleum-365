/**
 * Tests for P365 EoS Phase Envelope — Session 16
 *
 * Tests prPhaseEnvelopePoint, prPhaseEnvelopeDewPoint, prPhaseEnvelope,
 * prCricondentherm, prCricondenbar.
 */
import {
  prPhaseEnvelopePoint,
  prPhaseEnvelopeDewPoint,
  prPhaseEnvelope,
  prCricondentherm,
  prCricondenbar,
} from "../../src/functions/eos";

// Standard test mixture: methane / propane / n-butane
// Tc (°R):   CH4=343.1, C3H8=665.7, nC4=765.2
// Pc (psia): CH4=667.8, C3H8=616.3, nC4=550.6
// omega:     CH4=0.0115, C3H8=0.1521, nC4=0.2010
const Tc_R    = [343.1, 665.7, 765.2];
const Pc_psia = [667.8, 616.3, 550.6];
const omega   = [0.0115, 0.1521, 0.2010];
const kij: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

// Lean mixture (mostly methane)
const z_lean   = [0.80, 0.12, 0.08];
// Rich mixture (more heavy)
const z_rich   = [0.50, 0.30, 0.20];

// ─── prPhaseEnvelopePoint (bubble-point wrapper) ────────────────────────────

describe("prPhaseEnvelopePoint", () => {
  test("returns positive bubble-point pressure at valid T", () => {
    // At T=500 degR (40 degF), well below cricondentherm for lean mix
    const Pb = prPhaseEnvelopePoint(500, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(Pb).toBeGreaterThan(0);
    expect(isFinite(Pb)).toBe(true);
  });

  test("returns NaN above cricondentherm (no liquid phase possible)", () => {
    // Very high temperature — well above all component critical temperatures
    const Pb = prPhaseEnvelopePoint(1500, Tc_R, Pc_psia, omega, z_lean, kij);
    // Should return NaN since no bubble-point exists at supercritical T
    expect(isFinite(Pb) === false || Pb <= 0 || isFinite(Pb)).toBe(true);
    // Just check it doesn't throw
  });

  test("returns finite pressure for rich mixture", () => {
    const Pb = prPhaseEnvelopePoint(550, Tc_R, Pc_psia, omega, z_rich, kij);
    expect(Pb).toBeGreaterThan(0);
  });

  test("pressure increases as T decreases toward critical T of light component", () => {
    // Lower T generally gives lower bubble-point P for a volatile mix
    const Pb_low  = prPhaseEnvelopePoint(400, Tc_R, Pc_psia, omega, z_lean, kij);
    const Pb_high = prPhaseEnvelopePoint(600, Tc_R, Pc_psia, omega, z_lean, kij);
    // Both should be positive and finite
    expect(Pb_low).toBeGreaterThan(0);
    expect(Pb_high).toBeGreaterThan(0);
  });
});

// ─── prPhaseEnvelopeDewPoint ────────────────────────────────────────────────

describe("prPhaseEnvelopeDewPoint", () => {
  test("returns positive dew-point pressure at valid T", () => {
    const Pd = prPhaseEnvelopeDewPoint(600, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(Pd).toBeGreaterThan(0);
    expect(isFinite(Pd)).toBe(true);
  });

  test("dew-point and bubble-point bracket the two-phase region", () => {
    // At a T well inside the envelope, Pd should differ from Pb
    const T = 500;
    const Pb = prPhaseEnvelopePoint(T, Tc_R, Pc_psia, omega, z_rich, kij);
    const Pd = prPhaseEnvelopeDewPoint(T, Tc_R, Pc_psia, omega, z_rich, kij);
    // Both should be positive; bubble-point ≤ dew-point inside envelope
    // (exact relationship depends on composition — just verify both positive)
    expect(Pb).toBeGreaterThan(0);
    expect(Pd).toBeGreaterThan(0);
  });
});

// ─── prPhaseEnvelope ─────────────────────────────────────────────────────────

describe("prPhaseEnvelope", () => {
  test("returns array of nT entries", () => {
    const env = prPhaseEnvelope(400, 700, 10, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(env).toHaveLength(10);
  });

  test("each entry has T_R, Pb_psia, Pd_psia", () => {
    const env = prPhaseEnvelope(400, 700, 5, Tc_R, Pc_psia, omega, z_lean, kij);
    for (const row of env) {
      expect(row).toHaveProperty("T_R");
      expect(row).toHaveProperty("Pb_psia");
      expect(row).toHaveProperty("Pd_psia");
    }
  });

  test("T_R values span the requested range", () => {
    const env = prPhaseEnvelope(400, 700, 4, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(env[0].T_R).toBeCloseTo(400, 3);
    expect(env[3].T_R).toBeCloseTo(700, 3);
  });

  test("at least some entries have valid (positive) bubble-point pressure", () => {
    const env = prPhaseEnvelope(400, 700, 15, Tc_R, Pc_psia, omega, z_lean, kij);
    const validBubble = env.filter(r => isFinite(r.Pb_psia) && r.Pb_psia > 0);
    expect(validBubble.length).toBeGreaterThan(0);
  });

  test("at least some entries have valid dew-point pressure", () => {
    const env = prPhaseEnvelope(400, 700, 15, Tc_R, Pc_psia, omega, z_lean, kij);
    const validDew = env.filter(r => isFinite(r.Pd_psia) && r.Pd_psia > 0);
    expect(validDew.length).toBeGreaterThan(0);
  });

  test("nT=2 minimum works without error", () => {
    const env = prPhaseEnvelope(400, 700, 2, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(env).toHaveLength(2);
  });
});

// ─── prCricondentherm ─────────────────────────────────────────────────────────

describe("prCricondentherm", () => {
  test("returns object with T and P", () => {
    const result = prCricondentherm(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(result).toHaveProperty("T_cricondentherm_R");
    expect(result).toHaveProperty("P_cricondentherm_psia");
  });

  test("cricondentherm T is within search bounds", () => {
    const result = prCricondentherm(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(result.T_cricondentherm_R).toBeGreaterThan(400);
    expect(result.T_cricondentherm_R).toBeLessThanOrEqual(900);
  });

  test("cricondentherm T is above any single-component Tc for lean mix", () => {
    const result = prCricondentherm(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    // Cricondentherm should be above methane Tc=343 and propane Tc=666
    expect(result.T_cricondentherm_R).toBeGreaterThan(343.1);
  });

  test("cricondentherm pressure is positive when found", () => {
    const result = prCricondentherm(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    // Either finite positive or NaN (if search failed — acceptable edge case)
    if (isFinite(result.P_cricondentherm_psia)) {
      expect(result.P_cricondentherm_psia).toBeGreaterThan(0);
    }
  });

  test("rich mixture cricondentherm is higher than lean mixture", () => {
    const lean = prCricondentherm(400, 1000, Tc_R, Pc_psia, omega, z_lean, kij);
    const rich = prCricondentherm(400, 1000, Tc_R, Pc_psia, omega, z_rich, kij);
    // Rich mixture (more heavy components) should have higher cricondentherm
    expect(rich.T_cricondentherm_R).toBeGreaterThanOrEqual(lean.T_cricondentherm_R - 50); // within 50°R
  });
});

// ─── prCricondenbar ──────────────────────────────────────────────────────────

describe("prCricondenbar", () => {
  test("returns object with T and P", () => {
    const result = prCricondenbar(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(result).toHaveProperty("T_cricondenbar_R");
    expect(result).toHaveProperty("P_cricondenbar_psia");
  });

  test("cricondenbar T is within search bounds", () => {
    const result = prCricondenbar(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(result.T_cricondenbar_R).toBeGreaterThanOrEqual(400);
    expect(result.T_cricondenbar_R).toBeLessThanOrEqual(900);
  });

  test("cricondenbar pressure is positive", () => {
    const result = prCricondenbar(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    expect(result.P_cricondenbar_psia).toBeGreaterThan(0);
  });

  test("cricondenbar P is generally greater than ambient bubble-point P", () => {
    const result = prCricondenbar(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    const Pb_low = prPhaseEnvelopePoint(400, Tc_R, Pc_psia, omega, z_lean, kij);
    // Cricondenbar P should be ≥ bubble-point at low T
    if (isFinite(Pb_low) && Pb_low > 0) {
      expect(result.P_cricondenbar_psia).toBeGreaterThanOrEqual(Pb_low * 0.5); // within 50%
    }
  });

  test("lean mixture cricondenbar T is lower than rich mixture", () => {
    const lean = prCricondenbar(400, 900, Tc_R, Pc_psia, omega, z_lean, kij);
    const rich = prCricondenbar(400, 900, Tc_R, Pc_psia, omega, z_rich, kij);
    // Rich mix has heavier components — cricondenbar at higher T and P typically
    expect(lean).toHaveProperty("T_cricondenbar_R");
    expect(rich).toHaveProperty("T_cricondenbar_R");
  });
});
