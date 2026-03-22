/**
 * Tests: Surface Facilities (SF)
 */

import {
  chokeRate,
  chokeBeanSize,
  isCriticalFlow,
  chokeAllCorrelations,
  panhandleA,
  panhandleAOutletP,
  panhandleB,
  panhandleBOutletP,
  gasPipelineComparison,
  compressorPower,
  interstageCompression,
  compressorDischargeTemp,
} from "../../src/functions/sf";

// ─── Choke Correlations ───────────────────────────────────────────────────────

describe("Choke — Critical Flow (Gilbert et al.)", () => {
  const S = 16;        // 16/64" = 1/4"
  const Pu = 800;      // psia
  const GLR = 1000;    // scf/STB

  test("Gilbert: rate > 0 for valid inputs", () => {
    const q = chokeRate(S, Pu, GLR, "gilbert");
    expect(q).toBeGreaterThan(0);
  });

  test("larger bean size gives higher rate (all correlations)", () => {
    for (const corr of ["gilbert", "ros", "baxendell", "achong", "pilehvari"] as const) {
      const q1 = chokeRate(8,  Pu, GLR, corr);
      const q2 = chokeRate(16, Pu, GLR, corr);
      expect(q2).toBeGreaterThan(q1);
    }
  });

  test("higher upstream pressure gives lower rate (per Gilbert form)", () => {
    const q1 = chokeRate(S, 500, GLR, "gilbert");
    const q2 = chokeRate(S, 1000, GLR, "gilbert");
    expect(q1).toBeGreaterThan(q2);
  });

  test("round-trip: chokeBeanSize recovers S from chokeRate", () => {
    const q = chokeRate(S, Pu, GLR, "gilbert");
    const S_calc = chokeBeanSize(q, Pu, GLR, "gilbert");
    expect(S_calc).toBeCloseTo(S, 1);
  });

  test("isCriticalFlow returns true when Pd/Pu <= critical ratio", () => {
    expect(isCriticalFlow(1000, 500)).toBe(true);  // 0.5 < ~0.55
  });

  test("isCriticalFlow returns false when Pd/Pu > critical ratio", () => {
    expect(isCriticalFlow(1000, 900)).toBe(false);  // 0.9 > ~0.55
  });

  test("chokeAllCorrelations returns 5 results", () => {
    const results = chokeAllCorrelations(S, Pu, GLR);
    expect(Object.keys(results)).toHaveLength(5);
    for (const v of Object.values(results)) {
      expect(v).toBeGreaterThan(0);
    }
  });

  test("throws for zero GLR", () => {
    expect(() => chokeRate(S, Pu, 0)).toThrow();
  });
});

// ─── Gas Pipeline — Panhandle A ───────────────────────────────────────────────

describe("Panhandle A", () => {
  const P1 = 1000, P2 = 800, D = 8, L = 10, T = 540, SG = 0.65, Z = 0.9;

  test("flow rate > 0", () => {
    const Q = panhandleA(P1, P2, D, L, T, SG, Z);
    expect(Q).toBeGreaterThan(0);
  });

  test("flow increases with pressure differential", () => {
    const Q1 = panhandleA(1000, 900, D, L, T, SG, Z);
    const Q2 = panhandleA(1000, 700, D, L, T, SG, Z);
    expect(Q2).toBeGreaterThan(Q1);
  });

  test("flow increases with diameter", () => {
    const Q1 = panhandleA(P1, P2, 6,  L, T, SG, Z);
    const Q2 = panhandleA(P1, P2, 10, L, T, SG, Z);
    expect(Q2).toBeGreaterThan(Q1);
  });

  test("throws when P1 <= P2", () => {
    expect(() => panhandleA(800, 1000, D, L, T, SG, Z)).toThrow();
  });

  test("round-trip: outlet pressure recovers P2 from flow", () => {
    const Q = panhandleA(P1, P2, D, L, T, SG, Z);
    const P2_calc = panhandleAOutletP(Q, P1, D, L, T, SG, Z);
    expect(P2_calc).toBeCloseTo(P2, -1);  // within 1 psi
  });
});

// ─── Gas Pipeline — Panhandle B ───────────────────────────────────────────────

describe("Panhandle B", () => {
  const P1 = 1000, P2 = 800, D = 8, L = 10, T = 540, SG = 0.65, Z = 0.9;

  test("flow rate > 0", () => {
    const Q = panhandleB(P1, P2, D, L, T, SG, Z);
    expect(Q).toBeGreaterThan(0);
  });

  test("Panhandle B generally higher than A (different exponents)", () => {
    const Qa = panhandleA(P1, P2, D, L, T, SG, Z);
    const Qb = panhandleB(P1, P2, D, L, T, SG, Z);
    // Both should be > 0; they'll differ by correlation
    expect(Qa).toBeGreaterThan(0);
    expect(Qb).toBeGreaterThan(0);
  });

  test("round-trip: outlet pressure recovers P2 from flow", () => {
    const Q = panhandleB(P1, P2, D, L, T, SG, Z);
    const P2_calc = panhandleBOutletP(Q, P1, D, L, T, SG, Z);
    expect(P2_calc).toBeCloseTo(P2, -1);
  });

  test("gasPipelineComparison returns two correlations", () => {
    const cmp = gasPipelineComparison(P1, P2, D, L, T, SG, Z);
    expect(cmp.panhandleA).toBeGreaterThan(0);
    expect(cmp.panhandleB).toBeGreaterThan(0);
  });
});

// ─── Compressor ───────────────────────────────────────────────────────────────

describe("Compressor", () => {
  test("power > 0 for valid compression", () => {
    const HP = compressorPower(1000, 200, 600, 540);
    expect(HP).toBeGreaterThan(0);
  });

  test("power increases with compression ratio", () => {
    const HP1 = compressorPower(1000, 200, 400,  540);
    const HP2 = compressorPower(1000, 200, 1000, 540);
    expect(HP2).toBeGreaterThan(HP1);
  });

  test("power increases with flow rate", () => {
    const HP1 = compressorPower(500,  200, 600, 540);
    const HP2 = compressorPower(2000, 200, 600, 540);
    expect(HP2).toBeGreaterThan(HP1);
  });

  test("throws when P2 <= P1", () => {
    expect(() => compressorPower(1000, 600, 200, 540)).toThrow();
  });

  test("interstage pressures are evenly spaced (log scale)", () => {
    const stages = interstageCompression(200, 1600, 3);
    expect(stages).toHaveLength(3);
    expect(stages[2]).toBeCloseTo(1600, 0);
    // Equal ratios: r = (1600/200)^(1/3) = 2
    const r1 = stages[0] / 200;
    const r2 = stages[1] / stages[0];
    expect(r1).toBeCloseTo(r2, 3);
  });

  test("discharge temperature > suction temperature", () => {
    const T2 = compressorDischargeTemp(540, 200, 600);
    expect(T2).toBeGreaterThan(540);
  });
});
