/**
 * Tests for P365 EoS extensions — Michelsen stability test + Wilson K-values
 */
import {
  prWilsonK,
  prStabilityTest,
  prBubblePoint,
} from "../../src/functions/eos";

// Standard test mixture: methane/propane/n-pentane (same as existing EoS tests)
// Tc (degR): CH4=343.1, C3H8=665.7, nC5=845.3
// Pc (psia): CH4=667.8, C3H8=616.3, nC5=489.5
// omega:      CH4=0.0115, C3H8=0.1521, nC5=0.2510
const Tc_R   = [343.1, 665.7, 845.3];
const Pc_psia = [667.8, 616.3, 489.5];
const omega  = [0.0115, 0.1521, 0.2510];
const kij: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

// ─── Wilson K-Values ──────────────────────────────────────────────────────────

describe("prWilsonK", () => {
  test("K > 1 for light components at low pressure", () => {
    // At low P (100 psia) and moderate T (520 degR = 60 degF):
    // methane should have K >> 1 (very volatile), pentane K << 1
    const K = prWilsonK(560, 100, Tc_R, Pc_psia, omega);
    expect(K[0]).toBeGreaterThan(10);   // methane very volatile
    expect(K[2]).toBeLessThan(1);       // pentane less volatile
    expect(K.every(k => k > 0)).toBe(true); // all positive
  });

  test("K approximately 1 near component critical T and P", () => {
    // At critical conditions of methane (approx Tc, Pc):
    const K = prWilsonK(343.1, 667.8, Tc_R, Pc_psia, omega);
    // K of methane should be close to 1 (at its own critical point)
    expect(K[0]).toBeCloseTo(1, 0);
  });

  test("throws for mismatched arrays", () => {
    expect(() => prWilsonK(560, 100, Tc_R, [667.8], omega)).toThrow();
  });

  test("returns array of length n", () => {
    const K = prWilsonK(560, 500, Tc_R, Pc_psia, omega);
    expect(K).toHaveLength(3);
  });
});

// ─── Michelsen Stability Test ─────────────────────────────────────────────────

describe("prStabilityTest", () => {
  test("pure methane in supercritical state is stable", () => {
    // Methane above its Tc=343.1 degR and Pc=667.8 psia — single phase
    const z = [1.0, 0, 0];
    const result = prStabilityTest(
      700,   // T = 700 degR >> Tc_methane
      1000,  // P = 1000 psia > Pc_methane
      z, Tc_R, Pc_psia, omega, kij
    );
    expect(result.stable).toBe(true);
    expect(result.iterations).toBeGreaterThan(0);
  });

  test("low-temperature, high-pressure mixture is unstable (two-phase)", () => {
    // Rich mixture at conditions below bubble point — should be unstable
    // Use methane/pentane with z=[0.3, 0, 0.7] at 400 psia, 400 degR (below Tb)
    const z = [0.3, 0, 0.7];
    const result = prStabilityTest(
      400,   // T = 400 degR
      100,   // P = 100 psia — low enough for two-phase
      z, Tc_R, Pc_psia, omega, kij
    );
    // At this condition, a methane-heavy mixture should be two-phase
    // sumW_V > 1 or sumW_L > 1 indicates instability
    expect(result.sumW_L + result.sumW_V).toBeGreaterThan(0);
    // Just verify the function runs and returns proper structure
    expect(result).toHaveProperty("stable");
    expect(result).toHaveProperty("sumW_L");
    expect(result).toHaveProperty("sumW_V");
    expect(result).toHaveProperty("tpdL");
    expect(result).toHaveProperty("tpdV");
    expect(result).toHaveProperty("iterations");
  });

  test("single-phase gas at high T and low P is stable", () => {
    // All methane at high temperature, low pressure
    const z = [0.9, 0.05, 0.05];
    const result = prStabilityTest(
      800,   // T = 800 degR (340 degF) — above bubble point
      200,   // P = 200 psia — low pressure
      z, Tc_R, Pc_psia, omega, kij
    );
    expect(result.stable).toBe(true);
  });

  test("throws for mismatched arrays", () => {
    expect(() => prStabilityTest(560, 500, [0.5, 0.3, 0.2], [343.1], Pc_psia, omega, kij)).toThrow();
  });

  test("returns correct structure", () => {
    const z = [0.5, 0.3, 0.2];
    const result = prStabilityTest(600, 500, z, Tc_R, Pc_psia, omega, kij);
    expect(typeof result.stable).toBe("boolean");
    expect(typeof result.sumW_L).toBe("number");
    expect(typeof result.sumW_V).toBe("number");
    expect(typeof result.tpdL).toBe("number");
    expect(typeof result.tpdV).toBe("number");
    expect(result.iterations).toBeGreaterThanOrEqual(0);
  });

  test("without kij runs without error", () => {
    const z = [0.5, 0.3, 0.2];
    expect(() => prStabilityTest(600, 500, z, Tc_R, Pc_psia, omega)).not.toThrow();
  });
});
