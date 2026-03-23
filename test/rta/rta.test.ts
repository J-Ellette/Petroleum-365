/**
 * Tests for P365 Rate-Transient Analysis (RTA) module
 */
import {
  rtaMaterialBalanceTime,
  rtaMaterialBalanceTimeOil,
  rtaPseudoPressure,
  rtaPseudoPressureDiff,
  rtaPseudoTime,
  rtaRateNormalizedPressure,
  rtaRateNormalizedPressureOil,
  rtaFlowingMaterialBalanceGas,
  rtaFlowingMaterialBalanceOil,
  rtaBPlot,
  rtaBlassingameDimensionlessRate,
  rtaBlassingameDimensionlessTime,
  rtaRecoveryFactorFMB,
  rtaPermeabilityFromRNP,
  rtaSkinFromRNP,
  rtaArpsBExponent,
  rtaKhFromPSSRNP,
} from "../../src/functions/rta";

// ─── Material Balance Time ────────────────────────────────────────────────────

describe("rtaMaterialBalanceTime", () => {
  test("basic calculation: Gp=1000 Mscf, q=10 Mscf/d => 100 days", () => {
    expect(rtaMaterialBalanceTime(1000, 10)).toBeCloseTo(100, 6);
  });

  test("throws for zero rate", () => {
    expect(() => rtaMaterialBalanceTime(1000, 0)).toThrow();
  });

  test("throws for negative rate", () => {
    expect(() => rtaMaterialBalanceTime(1000, -5)).toThrow();
  });
});

describe("rtaMaterialBalanceTimeOil", () => {
  test("basic calculation: Np=5000 STB, q=100 STB/d => 50 days", () => {
    expect(rtaMaterialBalanceTimeOil(5000, 100)).toBeCloseTo(50, 6);
  });

  test("throws for zero rate", () => {
    expect(() => rtaMaterialBalanceTimeOil(5000, 0)).toThrow();
  });
});

// ─── Pseudo-Pressure ──────────────────────────────────────────────────────────

describe("rtaPseudoPressure", () => {
  test("returns zero when p_eval equals p_base", () => {
    const p = [0, 500, 1000, 1500, 2000];
    const muZ = [0.014, 0.015, 0.016, 0.017, 0.018];
    // When p_eval == p_base, should return 0
    const result = rtaPseudoPressure(p, muZ, 0, 0);
    expect(result).toBeCloseTo(0, 4);
  });

  test("returns positive value for p_eval > p_base", () => {
    const p = [0, 500, 1000, 2000];
    const muZ = [0.010, 0.012, 0.014, 0.018];
    const mp = rtaPseudoPressure(p, muZ, 0, 2000);
    expect(mp).toBeGreaterThan(0);
  });

  test("larger pressure yields larger pseudo-pressure", () => {
    const p = [0, 500, 1000, 1500, 2000];
    const muZ = [0.012, 0.013, 0.014, 0.015, 0.016];
    const mp1 = rtaPseudoPressure(p, muZ, 0, 1000);
    const mp2 = rtaPseudoPressure(p, muZ, 0, 2000);
    expect(mp2).toBeGreaterThan(mp1);
  });

  test("throws for mismatched arrays", () => {
    expect(() => rtaPseudoPressure([0, 1000], [0.01], 0, 1000)).toThrow();
  });

  test("throws when p_eval < p_base", () => {
    expect(() => rtaPseudoPressure([0, 1000], [0.01, 0.015], 100, 50)).toThrow();
  });
});

describe("rtaPseudoPressureDiff", () => {
  test("returns positive value for pi > pwf", () => {
    const p = [0, 500, 1000, 2000, 3000];
    const muZ = [0.010, 0.012, 0.014, 0.016, 0.018];
    const diff = rtaPseudoPressureDiff(p, muZ, 0, 3000, 1000);
    expect(diff).toBeGreaterThan(0);
  });
});

// ─── Pseudo-Time ──────────────────────────────────────────────────────────────

describe("rtaPseudoTime", () => {
  test("constant muCt gives ta = t (scaled by muCt_i/muCt)", () => {
    // If muCt is constant and equals muCt_i, ta = t
    const t = [0, 100, 200, 300];
    const muCt = [0.01, 0.01, 0.01, 0.01];
    const ta = rtaPseudoTime(t, muCt, 0.01, 300);
    expect(ta).toBeCloseTo(300, 2);
  });

  test("increasing muCt gives ta < t", () => {
    const t = [0, 100, 200, 300];
    const muCt = [0.01, 0.012, 0.014, 0.016];
    // muCt_i = 0.01 but muCt increases, so 1/muCt decreases
    const ta = rtaPseudoTime(t, muCt, 0.01, 300);
    expect(ta).toBeLessThan(300);
    expect(ta).toBeGreaterThan(0);
  });

  test("throws for mismatched arrays", () => {
    expect(() => rtaPseudoTime([0, 100], [0.01], 0.01, 100)).toThrow();
  });
});

// ─── Rate-Normalized Pressure ─────────────────────────────────────────────────

describe("rtaRateNormalizedPressure", () => {
  test("basic calculation: dm=1e6, q=500 => 2000", () => {
    expect(rtaRateNormalizedPressure(1e6, 500)).toBeCloseTo(2000, 4);
  });

  test("throws for zero rate", () => {
    expect(() => rtaRateNormalizedPressure(1e6, 0)).toThrow();
  });
});

describe("rtaRateNormalizedPressureOil", () => {
  test("basic: pi=3000, pwf=2000, q=200 => 5", () => {
    expect(rtaRateNormalizedPressureOil(3000, 2000, 200)).toBeCloseTo(5, 4);
  });
});

// ─── Flowing Material Balance ─────────────────────────────────────────────────

describe("rtaFlowingMaterialBalanceGas", () => {
  test("recovers known OGIP from synthetic data", () => {
    // Simulate a simple depletion: RNP = a + b*(Gp/q)
    // where b = slope, a = intercept
    // OGIP = -a/b
    const OGIP_true = 1e6; // 1000 MMscf
    const slope = -0.001;
    const intercept = 1000;

    const q = [500, 400, 300, 250, 200];
    const Gp = [50000, 150000, 250000, 330000, 400000];
    const RNP = Gp.map((g, i) => slope * (g / q[i]) + intercept);

    const result = rtaFlowingMaterialBalanceGas(Gp, RNP, q);
    // OGIP = -intercept/slope = 1000/0.001 = 1e6
    expect(result.OGIP_Mscf).toBeCloseTo(OGIP_true, -2); // within 1% of 1e6
    expect(result.R2).toBeGreaterThan(0.99);
  });

  test("throws for mismatched arrays", () => {
    expect(() => rtaFlowingMaterialBalanceGas([1, 2], [1, 2, 3], [1, 2])).toThrow();
  });

  test("throws for single data point", () => {
    expect(() => rtaFlowingMaterialBalanceGas([1], [1], [1])).toThrow();
  });
});

describe("rtaFlowingMaterialBalanceOil", () => {
  test("recovers known OOIP from synthetic data", () => {
    const OOIP_true = 500000; // 500000 STB
    const slope = -0.002;
    const intercept = 1000;

    const q = [200, 150, 120, 100, 80];
    const Np = [10000, 30000, 50000, 65000, 80000];
    const RNP = Np.map((np, i) => slope * (np / q[i]) + intercept);

    const result = rtaFlowingMaterialBalanceOil(Np, RNP, q);
    expect(result.OOIP_STB).toBeCloseTo(OOIP_true, -2);
    expect(result.R2).toBeGreaterThan(0.99);
  });
});

// ─── b-Plot Diagnostic ────────────────────────────────────────────────────────

describe("rtaBPlot", () => {
  test("exponential decline gives near-constant b = 1/Di", () => {
    // Exponential decline: q = qi * exp(-Di * t), Di = 0.01/day
    // b = -q/(dq/dt) = q/(q*Di) = 1/Di = 100 days
    const Di = 0.01;
    const qi = 1000;
    const t = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const q = t.map(ti => qi * Math.exp(-Di * ti));

    const result = rtaBPlot(t, q);
    expect(result.length).toBeGreaterThan(0);
    // Each b value should be close to 1/Di = 100
    for (const pt of result) {
      expect(pt.b).toBeCloseTo(1 / Di, 0); // within 1 day
    }
  });

  test("requires at least 3 points", () => {
    expect(() => rtaBPlot([0, 1], [1000, 900])).toThrow();
  });

  test("returns empty for monotonically increasing rate", () => {
    const t = [0, 10, 20, 30, 40];
    const q = [100, 200, 300, 400, 500]; // increasing
    const result = rtaBPlot(t, q);
    expect(result.length).toBe(0);
  });
});

// ─── Blasingame Type-Curve Parameters ─────────────────────────────────────────

describe("rtaBlassingameDimensionlessRate", () => {
  test("basic calculation returns positive value", () => {
    const qDd = rtaBlassingameDimensionlessRate(
      100,    // q_STB_d
      1.2,    // B_res
      0.5,    // mu_cp
      10,     // k_mD
      50,     // h_ft
      3000,   // pi_psia
      2000,   // pwf_psia
      1000,   // re_ft
      0.333   // rw_ft
    );
    expect(qDd).toBeGreaterThan(0);
  });

  test("throws when pwf >= pi", () => {
    expect(() => rtaBlassingameDimensionlessRate(100, 1.2, 0.5, 10, 50, 2000, 2000, 1000, 0.333)).toThrow();
  });
});

describe("rtaBlassingameDimensionlessTime", () => {
  test("basic calculation returns positive value", () => {
    const tDd = rtaBlassingameDimensionlessTime(
      10,      // k_mD
      365,     // t_days
      0.15,    // phi
      0.5,     // mu_cp
      15e-6,   // ct_psi
      1000     // re_ft
    );
    expect(tDd).toBeGreaterThan(0);
  });

  test("throws for invalid porosity", () => {
    expect(() => rtaBlassingameDimensionlessTime(10, 365, 0, 0.5, 15e-6, 1000)).toThrow();
  });
});

// ─── Recovery Factor ──────────────────────────────────────────────────────────

describe("rtaRecoveryFactorFMB", () => {
  test("50% depletion gives RF=0.5", () => {
    expect(rtaRecoveryFactorFMB(500000, 1000000)).toBeCloseTo(0.5, 6);
  });

  test("over-production caps at 1.0", () => {
    expect(rtaRecoveryFactorFMB(2000000, 1000000)).toBe(1);
  });

  test("throws for zero OGIP", () => {
    expect(() => rtaRecoveryFactorFMB(100, 0)).toThrow();
  });
});

// ─── Permeability and Skin ────────────────────────────────────────────────────

describe("rtaPermeabilityFromRNP", () => {
  test("basic calculation", () => {
    // k = 1637 * T_R / (slope * h)
    // T_R = 660 degR (200 degF), h = 50 ft, slope = 1637*660/(10*50) = 2160.84
    const slope = 1637 * 660 / (10 * 50);
    const k = rtaPermeabilityFromRNP(slope, 660, 50);
    expect(k).toBeCloseTo(10, 3);
  });

  test("throws for non-positive slope", () => {
    expect(() => rtaPermeabilityFromRNP(0, 660, 50)).toThrow();
    expect(() => rtaPermeabilityFromRNP(-1, 660, 50)).toThrow();
  });
});

describe("rtaSkinFromRNP", () => {
  test("zero skin when conditions align", () => {
    // For S=0: RNP_1hr/m* = log(k/(phi*mu*ct*rw^2)) - 3.2275
    const k = 10, phi = 0.15, mu = 0.02, ct = 15e-6, rw = 0.333;
    const logTerm = Math.log10(k / (phi * mu * ct * rw * rw));
    const ratio = logTerm - 3.2275; // RNP_1hr/m* when S=0
    const S = rtaSkinFromRNP(ratio, 1, k, phi, mu, ct, rw);
    expect(S).toBeCloseTo(0, 3);
  });

  test("positive skin for RNP higher than undamaged", () => {
    const S = rtaSkinFromRNP(10, 1, 10, 0.15, 0.02, 15e-6, 0.333);
    expect(S).toBeGreaterThan(0);
  });
});

// ─── Arps b-Exponent ─────────────────────────────────────────────────────────

describe("rtaArpsBExponent", () => {
  test("exponential decline gives b ~ 0", () => {
    // q = 1000 * exp(-0.01 * t) => b = 0
    const Di = 0.01;
    const q = (t: number) => 1000 * Math.exp(-Di * t);
    const t1 = 0, t2 = 100, t3 = 200;
    const b = rtaArpsBExponent(t1, q(t1), t2, q(t2), t3, q(t3));
    expect(Math.abs(b)).toBeLessThan(0.05);
  });

  test("hyperbolic decline (b=1) gives b > 0", () => {
    // q = qi / (1 + Di*t) => b = 1 (harmonic)
    // With finite differences, the estimate is approximate; verify b > 0 and close to expected
    const Di = 0.01, qi = 1000;
    const q = (t: number) => qi / (1 + Di * t);
    // Use tighter spacing for better finite-difference approximation
    const t1 = 100, t2 = 101, t3 = 102;
    const b = rtaArpsBExponent(t1, q(t1), t2, q(t2), t3, q(t3));
    expect(b).toBeGreaterThan(0.5); // b should be positive and roughly 1
  });

  test("throws for non-strictly-increasing times", () => {
    expect(() => rtaArpsBExponent(0, 100, 0, 90, 10, 80)).toThrow();
  });
});

// ─── kh from PSS RNP ─────────────────────────────────────────────────────────

describe("rtaKhFromPSSRNP", () => {
  test("recovers kh from known parameters", () => {
    // kh = 1422 * T * [ln(re/rw) - 0.75 + S] / RNP_PSS
    const T_R = 660, re = 1000, rw = 0.333, S = 0;
    const lnTerm = Math.log(re / rw) - 0.75 + S;
    const kh_true = 10 * 50; // k=10 mD, h=50 ft => kh=500
    const RNP = 1422 * T_R * lnTerm / kh_true;
    const kh = rtaKhFromPSSRNP(RNP, T_R, re, rw, S);
    expect(kh).toBeCloseTo(kh_true, 2);
  });

  test("throws for non-positive RNP", () => {
    expect(() => rtaKhFromPSSRNP(0, 660, 1000, 0.333, 0)).toThrow();
  });
});
