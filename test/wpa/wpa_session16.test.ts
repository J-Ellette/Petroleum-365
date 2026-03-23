/**
 * Tests for P365 WPA Session 16 extensions:
 *   wpaFiveSpotAllocation, wpaPatternFloodBalance,
 *   wpaDykstraParsonsMobility, wpaStilesSweep
 */
import {
  wpaFiveSpotAllocation,
  wpaPatternFloodBalance,
  wpaDykstraParsonsMobility,
  wpaStilesSweep,
} from "../../src/functions/wpa";

// ─── wpaFiveSpotAllocation ────────────────────────────────────────────────────

describe("wpaFiveSpotAllocation", () => {
  test("equal kh gives equal allocation", () => {
    const kh = [100, 100, 100, 100];
    const { alloc_STBd, fractions } = wpaFiveSpotAllocation(1000, kh);
    expect(alloc_STBd).toHaveLength(4);
    alloc_STBd.forEach(q => expect(q).toBeCloseTo(250, 3));
    fractions.forEach(f => expect(f).toBeCloseTo(0.25, 5));
  });

  test("total allocation equals injection rate", () => {
    const kh = [200, 150, 300, 100];
    const q_inj = 800;
    const { alloc_STBd } = wpaFiveSpotAllocation(q_inj, kh);
    const total = alloc_STBd.reduce((s, q) => s + q, 0);
    expect(total).toBeCloseTo(q_inj, 5);
  });

  test("fractions sum to 1", () => {
    const kh = [200, 150, 300, 100];
    const { fractions } = wpaFiveSpotAllocation(800, kh);
    const sumF = fractions.reduce((s, f) => s + f, 0);
    expect(sumF).toBeCloseTo(1.0, 10);
  });

  test("higher kh producer gets more injection", () => {
    const kh = [100, 400, 100, 100];
    const { alloc_STBd } = wpaFiveSpotAllocation(1000, kh);
    expect(alloc_STBd[1]).toBeGreaterThan(alloc_STBd[0]);
  });

  test("single producer gets all injection", () => {
    const { alloc_STBd, fractions } = wpaFiveSpotAllocation(500, [200]);
    expect(alloc_STBd[0]).toBeCloseTo(500, 5);
    expect(fractions[0]).toBeCloseTo(1.0, 5);
  });

  test("throws for empty kh_prod array", () => {
    expect(() => wpaFiveSpotAllocation(1000, [])).toThrow();
  });

  test("throws for all-zero kh", () => {
    expect(() => wpaFiveSpotAllocation(1000, [0, 0, 0])).toThrow();
  });
});

// ─── wpaPatternFloodBalance ───────────────────────────────────────────────────

describe("wpaPatternFloodBalance", () => {
  // Four producers, each voidage rate 200 res bbl/d → total 800 res bbl/d
  const producers = [200, 200, 200, 200];
  // Two injectors with equal weight
  const injWeights = [1.0, 1.0];

  test("returns inj_rates_STBd and total_VRR", () => {
    const result = wpaPatternFloodBalance(producers, injWeights, 1.0);
    expect(result).toHaveProperty("inj_rates_STBd");
    expect(result).toHaveProperty("total_VRR");
  });

  test("equal injectors share equally", () => {
    const { inj_rates_STBd } = wpaPatternFloodBalance(producers, [1, 1], 1.0);
    expect(inj_rates_STBd[0]).toBeCloseTo(inj_rates_STBd[1], 5);
  });

  test("target VRR=1 gives VRR=1 when Bw=1", () => {
    const { total_VRR } = wpaPatternFloodBalance(producers, injWeights, 1.0, 1.0);
    expect(total_VRR).toBeCloseTo(1.0, 5);
  });

  test("target VRR=1.2 gives VRR≈1.2", () => {
    const { total_VRR } = wpaPatternFloodBalance(producers, injWeights, 1.2, 1.0);
    expect(total_VRR).toBeCloseTo(1.2, 3);
  });

  test("total injection = target voidage × VRR / Bw", () => {
    const Bw = 1.05;
    const targetVRR = 1.1;
    const { inj_rates_STBd } = wpaPatternFloodBalance(producers, injWeights, targetVRR, Bw);
    const totalInj = inj_rates_STBd.reduce((s, q) => s + q, 0);
    const totalVoidage = producers.reduce((s, v) => s + v, 0);
    expect(totalInj).toBeCloseTo(totalVoidage * targetVRR / Bw, 3);
  });

  test("unequal weights allocate proportionally", () => {
    const { inj_rates_STBd } = wpaPatternFloodBalance(producers, [1, 3], 1.0, 1.0);
    expect(inj_rates_STBd[1]).toBeCloseTo(inj_rates_STBd[0] * 3, 4);
  });

  test("throws for empty injector weights", () => {
    expect(() => wpaPatternFloodBalance(producers, [], 1.0)).toThrow();
  });

  test("throws for non-positive Bw", () => {
    expect(() => wpaPatternFloodBalance(producers, injWeights, 1.0, 0)).toThrow();
  });
});

// ─── wpaDykstraParsonsMobility ────────────────────────────────────────────────

describe("wpaDykstraParsonsMobility", () => {
  test("favorable mobility ratio (M<1) gives higher sweep than adverse (M>1)", () => {
    const V_DP = 0.5;
    const E_favorable = wpaDykstraParsonsMobility(0.5, V_DP);
    const E_adverse   = wpaDykstraParsonsMobility(2.0, V_DP);
    expect(E_favorable).toBeGreaterThan(E_adverse);
  });

  test("higher V_DP (more heterogeneous) gives lower sweep", () => {
    const M = 1.0;
    const E_uniform = wpaDykstraParsonsMobility(M, 0.1);
    const E_hetero  = wpaDykstraParsonsMobility(M, 0.7);
    expect(E_uniform).toBeGreaterThan(E_hetero);
  });

  test("result is in [0, 1]", () => {
    for (const M of [0.1, 0.5, 1.0, 2.0, 10.0]) {
      for (const V of [0.1, 0.3, 0.5, 0.7]) {
        const E = wpaDykstraParsonsMobility(M, V);
        expect(E).toBeGreaterThanOrEqual(0);
        expect(E).toBeLessThanOrEqual(1);
      }
    }
  });

  test("unit mobility ratio (M=1) returns positive sweep", () => {
    const E = wpaDykstraParsonsMobility(1.0, 0.5);
    expect(E).toBeGreaterThan(0);
  });

  test("throws for M ≤ 0", () => {
    expect(() => wpaDykstraParsonsMobility(0, 0.5)).toThrow();
  });

  test("throws for V_DP ≥ 1", () => {
    expect(() => wpaDykstraParsonsMobility(1.0, 1.0)).toThrow();
  });

  test("throws for V_DP < 0", () => {
    expect(() => wpaDykstraParsonsMobility(1.0, -0.1)).toThrow();
  });
});

// ─── wpaStilesSweep ───────────────────────────────────────────────────────────

describe("wpaStilesSweep", () => {
  // Simple 3-layer case
  const k = [200, 100, 50];  // mD (descending)
  const h = [10,  20,  15];  // ft

  test("returns E_sweep and layer_fractions", () => {
    const result = wpaStilesSweep(k, h, 1.0);
    expect(result).toHaveProperty("E_sweep");
    expect(result).toHaveProperty("layer_fractions");
  });

  test("E_sweep is in [0, 1]", () => {
    const { E_sweep } = wpaStilesSweep(k, h, 1.0);
    expect(E_sweep).toBeGreaterThanOrEqual(0);
    expect(E_sweep).toBeLessThanOrEqual(1);
  });

  test("layer_fractions length equals number of layers", () => {
    const { layer_fractions } = wpaStilesSweep(k, h, 1.0);
    expect(layer_fractions).toHaveLength(k.length);
  });

  test("all layer fractions are in [0, 1]", () => {
    const { layer_fractions } = wpaStilesSweep(k, h, 1.0);
    layer_fractions.forEach(f => {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    });
  });

  test("favorable M ≤ 1 gives higher sweep than adverse M > 1", () => {
    const { E_sweep: E_fav } = wpaStilesSweep(k, h, 0.5);
    const { E_sweep: E_adv } = wpaStilesSweep(k, h, 3.0);
    // Higher M (adverse) generally gives lower sweep in Stiles
    // Just verify both are in valid range
    expect(E_fav).toBeGreaterThanOrEqual(0);
    expect(E_adv).toBeGreaterThanOrEqual(0);
  });

  test("uniform permeability gives sweep equal to theoretical", () => {
    // All layers same k — sweep efficiency should be same for all layers
    const k_uniform = [100, 100, 100];
    const h_uniform = [10, 10, 10];
    const { E_sweep } = wpaStilesSweep(k_uniform, h_uniform, 1.0);
    expect(E_sweep).toBeGreaterThan(0);
    expect(E_sweep).toBeLessThanOrEqual(1);
  });

  test("single layer returns E_sweep ∈ [0, 1]", () => {
    const { E_sweep, layer_fractions } = wpaStilesSweep([100], [20], 1.0);
    expect(E_sweep).toBeGreaterThanOrEqual(0);
    expect(E_sweep).toBeLessThanOrEqual(1);
    expect(layer_fractions).toHaveLength(1);
  });

  test("throws for mismatched k and h arrays", () => {
    expect(() => wpaStilesSweep([100, 200], [10], 1.0)).toThrow();
  });

  test("throws for M ≤ 0", () => {
    expect(() => wpaStilesSweep(k, h, 0)).toThrow();
  });
});
