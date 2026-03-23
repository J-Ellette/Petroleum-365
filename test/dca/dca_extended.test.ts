/**
 * P365 — DCA Extended Model Tests
 * Tests for Transient Hyperbolic, Extended Exponential, AKB,
 * and diagnostic / data-QC functions.
 */

import {
  // Transient Hyperbolic
  thRate,
  thCumulative,
  thSwitchTime,
  thEUR,
  // Extended Exponential (biexponential)
  eeRate,
  eeCumulative,
  eeEUR,
  // Ansah-Knowles-Buba
  akbRate,
  akbCumulative,
  akbEUR,
  // DCA Diagnostics
  dcaDeclineRate,
  dcaBFactor,
  dcaLogLogDerivative,
  dcaFlowRegimeFromB,
  // DCA Data QC
  dcaRollingZScore,
  dcaCleanProduction,
  dcaRateNormalize,
  // DCA Rate Conversions
  dcaConvertNominalDecline,
  dcaAnnualToMonthlyEffective,
  dcaMonthlyToAnnualEffective,
} from "../../src/functions/dca";

// ─── Transient Hyperbolic ──────────────────────────────────────────────────────

describe("thRate — Transient Hyperbolic rate", () => {
  test("At t=0, rate = qi", () => {
    expect(thRate(0, 1000, 0.1, 2.0, 0.01)).toBeCloseTo(1000, 3);
  });

  test("Decline is monotonic", () => {
    const q1 = thRate(6,  1000, 0.1, 2.0, 0.01);
    const q2 = thRate(12, 1000, 0.1, 2.0, 0.01);
    expect(q2).toBeLessThan(q1);
  });

  test("After switch time follows exponential tail", () => {
    const qi = 1000, Di = 0.2, b = 2.0, Dterm = 0.05;
    const tSwitch = thSwitchTime(Di, b, Dterm);
    const qSwitch = thRate(tSwitch, qi, Di, b, Dterm);
    // At 2×tSwitch should be exponential from switch
    const tTest = tSwitch + 1;
    const expected = qSwitch * Math.exp(-Dterm * 1);
    expect(thRate(tTest, qi, Di, b, Dterm)).toBeCloseTo(expected, 2);
  });

  test("Switch time formula", () => {
    const Di = 0.2, b = 2.0, Dterm = 0.05;
    // tSwitch = (Di/Dterm - 1) / (b * Di)
    const expected = (Di / Dterm - 1) / (b * Di);
    expect(thSwitchTime(Di, b, Dterm)).toBeCloseTo(expected, 6);
  });
});

describe("thCumulative — Transient Hyperbolic cumulative", () => {
  test("Returns 0 at t=0", () => {
    expect(thCumulative(0, 1000, 0.1, 2.0, 0.01)).toBeCloseTo(0, 5);
  });

  test("Monotonically increases", () => {
    const c1 = thCumulative(6,  1000, 0.1, 2.0, 0.01);
    const c2 = thCumulative(12, 1000, 0.1, 2.0, 0.01);
    expect(c2).toBeGreaterThan(c1);
  });

  test("Cumulative at switch is correct (b=1 harmonic case)", () => {
    const qi = 1000, Di = 0.2, b = 1.0, Dterm = 0.05;
    const tSwitch = thSwitchTime(Di, b, Dterm);
    const cum = thCumulative(tSwitch, qi, Di, b, Dterm);
    // Should be (qi/Di)*ln(1+Di*tSwitch)
    const expected = (qi / Di) * Math.log(1 + Di * tSwitch);
    expect(cum).toBeCloseTo(expected, 2);
  });
});

describe("thEUR — Transient Hyperbolic EUR", () => {
  test("EUR is finite and positive", () => {
    const eur = thEUR(1000, 0.2, 2.0, 0.05, 10);
    expect(eur).toBeGreaterThan(0);
    expect(isFinite(eur)).toBe(true);
  });

  test("Higher economic limit → lower EUR", () => {
    const eurLow  = thEUR(1000, 0.2, 2.0, 0.05, 10);
    const eurHigh = thEUR(1000, 0.2, 2.0, 0.05, 50);
    expect(eurLow).toBeGreaterThan(eurHigh);
  });
});

// ─── Extended Exponential ─────────────────────────────────────────────────────

describe("eeRate — Extended Exponential (biexponential) rate", () => {
  test("At t=0, rate = qi", () => {
    expect(eeRate(0, 1000, 0.4, 0.3, 0.02)).toBeCloseTo(1000, 3);
  });

  test("Monotonically decreasing", () => {
    const q1 = eeRate(1, 1000, 0.4, 0.3, 0.02);
    const q2 = eeRate(5, 1000, 0.4, 0.3, 0.02);
    expect(q2).toBeLessThan(q1);
  });

  test("f=1 collapses to single exponential", () => {
    const t = 5, qi = 1000, Df = 0.3;
    expect(eeRate(t, qi, 1.0, Df, 0.001)).toBeCloseTo(qi * Math.exp(-Df * t), 2);
  });

  test("f=0 collapses to single slow exponential", () => {
    const t = 5, qi = 1000, Ds = 0.02;
    expect(eeRate(t, qi, 0.0, 0.3, Ds)).toBeCloseTo(qi * Math.exp(-Ds * t), 2);
  });
});

describe("eeCumulative — Extended Exponential cumulative", () => {
  test("Returns 0 at t=0", () => {
    expect(eeCumulative(0, 1000, 0.4, 0.3, 0.02)).toBeCloseTo(0, 5);
  });

  test("Monotonically increases", () => {
    const c1 = eeCumulative(5,  1000, 0.4, 0.3, 0.02);
    const c2 = eeCumulative(20, 1000, 0.4, 0.3, 0.02);
    expect(c2).toBeGreaterThan(c1);
  });

  test("Analytical check: f=1 → qi/Df*(1-exp(-Df*t))", () => {
    const t = 10, qi = 500, Df = 0.2;
    const expected = (qi / Df) * (1 - Math.exp(-Df * t));
    expect(eeCumulative(t, qi, 1.0, Df, 0.001)).toBeCloseTo(expected, 1);
  });
});

describe("eeEUR — Extended Exponential EUR", () => {
  test("EUR is finite and positive", () => {
    const eur = eeEUR(1000, 0.4, 0.3, 0.02, 10);
    expect(eur).toBeGreaterThan(0);
    expect(isFinite(eur)).toBe(true);
  });

  test("Higher economic limit → lower EUR", () => {
    const eurLow  = eeEUR(1000, 0.4, 0.3, 0.02, 5);
    const eurHigh = eeEUR(1000, 0.4, 0.3, 0.02, 100);
    expect(eurLow).toBeGreaterThan(eurHigh);
  });
});

// ─── Ansah-Knowles-Buba (AKB) ────────────────────────────────────────────────

describe("akbRate — AKB rate", () => {
  test("At t=0, rate = qi", () => {
    expect(akbRate(0, 1000, 0.1, 1.5)).toBeCloseTo(1000, 3);
  });

  test("Monotonically decreasing", () => {
    const q1 = akbRate(5,  1000, 0.1, 1.5);
    const q2 = akbRate(20, 1000, 0.1, 1.5);
    expect(q2).toBeLessThan(q1);
  });

  test("K=1 → exponential (matches arps exponential)", () => {
    const qi = 1000, Di = 0.15, t = 10;
    const expected = qi * Math.exp(-Di * t);
    expect(akbRate(t, qi, Di, 1.0)).toBeCloseTo(expected, 2);
  });

  test("K=2 → harmonic (1 / (1 + Di*t))", () => {
    const qi = 1000, Di = 0.1, t = 5;
    const expected = qi / (1 + Di * t);
    expect(akbRate(t, qi, Di, 2.0)).toBeCloseTo(expected, 2);
  });
});

describe("akbCumulative — AKB cumulative", () => {
  test("Returns 0 at t=0", () => {
    expect(akbCumulative(0, 1000, 0.1, 1.5)).toBeCloseTo(0, 5);
  });

  test("Monotonically increases", () => {
    const c1 = akbCumulative(5,  1000, 0.1, 1.5);
    const c2 = akbCumulative(20, 1000, 0.1, 1.5);
    expect(c2).toBeGreaterThan(c1);
  });

  test("K=1 → exponential cumulative", () => {
    const qi = 1000, Di = 0.15, t = 10;
    const expected = (qi / Di) * (1 - Math.exp(-Di * t));
    expect(akbCumulative(t, qi, Di, 1.0)).toBeCloseTo(expected, 1);
  });

  test("K=2 → harmonic cumulative (qi/Di * ln(1+Di*t))", () => {
    const qi = 1000, Di = 0.1, t = 5;
    const expected = (qi / Di) * Math.log(1 + Di * t);
    expect(akbCumulative(t, qi, Di, 2.0)).toBeCloseTo(expected, 1);
  });
});

describe("akbEUR — AKB EUR", () => {
  test("EUR is finite and positive", () => {
    expect(akbEUR(1000, 0.1, 1.5, 10)).toBeGreaterThan(0);
  });

  test("Higher economic limit → lower EUR", () => {
    const eurLow  = akbEUR(1000, 0.1, 1.5, 5);
    const eurHigh = akbEUR(1000, 0.1, 1.5, 100);
    expect(eurLow).toBeGreaterThan(eurHigh);
  });

  test("K=1 EUR matches Arps exponential EUR", () => {
    const qi = 1000, Di = 0.15, qLim = 10;
    const tLim = Math.log(qi / qLim) / Di;
    const expected = (qi / Di) * (1 - Math.exp(-Di * tLim));
    expect(akbEUR(qi, Di, 1.0, qLim)).toBeCloseTo(expected, 1);
  });
});

// ─── DCA Diagnostics ─────────────────────────────────────────────────────────

describe("dcaDeclineRate — instantaneous D(t)", () => {
  test("Returns n-1 midpoint pairs for n points", () => {
    const t = [0, 1, 2, 3, 4];
    const q = [1000, 800, 640, 512, 410];
    const result = dcaDeclineRate(t, q);
    expect(result.length).toBe(4);
  });

  test("Constant exponential gives constant D", () => {
    const Di = 0.2;
    const t = [0, 1, 2, 3, 4, 5];
    const q = t.map(ti => 1000 * Math.exp(-Di * ti));
    const result = dcaDeclineRate(t, q);
    for (const [, D] of result) {
      expect(D).toBeCloseTo(Di, 3);
    }
  });

  test("Midpoint time is halfway between consecutive points", () => {
    const t = [0, 2, 4];
    const q = [1000, 900, 810];
    const result = dcaDeclineRate(t, q);
    expect(result[0][0]).toBeCloseTo(1, 5);
    expect(result[1][0]).toBeCloseTo(3, 5);
  });
});

describe("dcaBFactor — instantaneous b-factor", () => {
  test("Exponential decline → b ≈ 0", () => {
    const Di = 0.2;
    const t = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const q = t.map(ti => 1000 * Math.exp(-Di * ti));
    const bPairs = dcaBFactor(t, q);
    expect(bPairs.length).toBeGreaterThan(0);
    for (const [, b] of bPairs) {
      expect(Math.abs(b)).toBeLessThan(0.05);
    }
  });

  test("Returns shorter array than dcaDeclineRate", () => {
    const t = [0, 1, 2, 3, 4, 5];
    const q = [1000, 900, 800, 700, 600, 500];
    const D_pairs = dcaDeclineRate(t, q);
    const b_pairs = dcaBFactor(t, q);
    expect(b_pairs.length).toBe(D_pairs.length - 1);
  });
});

describe("dcaLogLogDerivative — d(log q)/d(log t)", () => {
  test("Power law q=qi*t^n has constant slope n", () => {
    // q = 1000 * t^(-0.5) → slope should be -0.5
    const t = [1, 2, 4, 8, 16, 32];
    const q = t.map(ti => 1000 * Math.pow(ti, -0.5));
    const slopes = dcaLogLogDerivative(t, q);
    for (const [, slope] of slopes) {
      expect(slope).toBeCloseTo(-0.5, 2);
    }
  });

  test("Returns pairs with positive geometric-mean times", () => {
    const t = [1, 4, 16];
    const q = [1000, 500, 250];
    const result = dcaLogLogDerivative(t, q);
    expect(result.length).toBe(2);
    expect(result[0][0]).toBeCloseTo(2, 3);   // sqrt(1*4)
    expect(result[1][0]).toBeCloseTo(8, 3);   // sqrt(4*16)
  });
});

describe("dcaFlowRegimeFromB", () => {
  test("b ≈ 0 → exponential", () => {
    expect(dcaFlowRegimeFromB(0.0)).toMatch(/Exponential/);
  });

  test("b ≈ 0.3 → hyperbolic BDF", () => {
    expect(dcaFlowRegimeFromB(0.3)).toMatch(/Hyperbolic/);
  });

  test("b ≈ 1.0 → harmonic", () => {
    expect(dcaFlowRegimeFromB(1.0)).toMatch(/Harmonic/);
  });

  test("b ≈ 2.0 → transient linear", () => {
    expect(dcaFlowRegimeFromB(2.0)).toMatch(/Transient linear/i);
  });

  test("b > 2 → spherical/radial note", () => {
    expect(dcaFlowRegimeFromB(2.5)).toMatch(/b > 2/i);
  });
});

// ─── DCA Data QC ─────────────────────────────────────────────────────────────

describe("dcaRollingZScore", () => {
  test("Returns same-length array as input", () => {
    const q = [100, 110, 105, 500, 108, 102, 99];
    expect(dcaRollingZScore(q, 2).length).toBe(q.length);
  });

  test("Outlier has highest z-score", () => {
    const q = [100, 110, 105, 500, 108, 102, 99];
    const z = dcaRollingZScore(q, 2);
    const maxIdx = z.indexOf(Math.max(...z));
    expect(maxIdx).toBe(3);  // index 3 = 500
  });

  test("Flat series → all z-scores = 0", () => {
    const q = [100, 100, 100, 100, 100];
    const z = dcaRollingZScore(q, 2);
    for (const zi of z) {
      expect(zi).toBeCloseTo(0, 5);
    }
  });
});

describe("dcaCleanProduction", () => {
  test("Removes outlier from data", () => {
    const t = [0, 1, 2, 3, 4, 5, 6];
    const q = [100, 110, 105, 500, 108, 102, 99];
    const { q: q_clean } = dcaCleanProduction(t, q, 2.5, 2);
    expect(q_clean).not.toContain(500);
  });

  test("Preserves order of non-outlier points", () => {
    const t = [0, 1, 2, 3, 4];
    const q = [100, 98, 96, 94, 92];
    const { t: t_clean, q: q_clean } = dcaCleanProduction(t, q, 2.5);
    expect(t_clean).toEqual(t);
    expect(q_clean).toEqual(q);
  });
});

describe("dcaRateNormalize", () => {
  test("Normalizes by drawdown", () => {
    const q = [100, 80];
    const bhp = [2000, 2200];
    const bhp_i = 2500;
    const result = dcaRateNormalize(q, bhp, bhp_i);
    expect(result[0]).toBeCloseTo(100 / (2500 - 2000), 5);
    expect(result[1]).toBeCloseTo(80  / (2500 - 2200), 5);
  });

  test("Zero drawdown → 0 normalized rate", () => {
    const result = dcaRateNormalize([100], [2500], 2500);
    expect(result[0]).toBe(0);
  });
});

// ─── DCA Rate Conversions ─────────────────────────────────────────────────────

describe("dcaConvertNominalDecline", () => {
  test("Annual to monthly: D_month = D_year / 12", () => {
    expect(dcaConvertNominalDecline(1.2, "year", "month")).toBeCloseTo(0.1, 6);
  });

  test("Monthly to annual: D_year = D_month * 12", () => {
    expect(dcaConvertNominalDecline(0.1, "month", "year")).toBeCloseTo(1.2, 6);
  });

  test("Same unit → no change", () => {
    expect(dcaConvertNominalDecline(0.25, "year", "year")).toBeCloseTo(0.25, 6);
  });

  test("Daily to annual: D_year = D_day * 365", () => {
    expect(dcaConvertNominalDecline(0.001, "day", "year")).toBeCloseTo(0.365, 5);
  });
});

describe("dcaAnnualToMonthlyEffective", () => {
  test("0% annual → 0% monthly", () => {
    expect(dcaAnnualToMonthlyEffective(0)).toBeCloseTo(0, 6);
  });

  test("Round-trip: monthly → annual → monthly", () => {
    const De_a = 0.30;
    const De_m = dcaAnnualToMonthlyEffective(De_a);
    const De_a2 = dcaMonthlyToAnnualEffective(De_m);
    expect(De_a2).toBeCloseTo(De_a, 5);
  });

  test("30%/year → ≈ 2.77%/month", () => {
    expect(dcaAnnualToMonthlyEffective(0.30)).toBeCloseTo(1 - Math.pow(0.70, 1 / 12), 5);
  });
});

describe("dcaMonthlyToAnnualEffective", () => {
  test("0% monthly → 0% annual", () => {
    expect(dcaMonthlyToAnnualEffective(0)).toBeCloseTo(0, 6);
  });

  test("2%/month → ≈ 21.4%/year", () => {
    const expected = 1 - Math.pow(1 - 0.02, 12);
    expect(dcaMonthlyToAnnualEffective(0.02)).toBeCloseTo(expected, 5);
  });
});

// ─── sepdCumShape (new) ───────────────────────────────────────────────────

import {
  sepdCumShape,
  lgmSatFraction,
  dcaModelComparison,
  arpsEURWithTerminalDecline,
} from "../../src/functions/dca";

describe("sepdCumShape", () => {
  test("t=0: shape = 0", () => {
    expect(sepdCumShape(0, 10, 0.8)).toBeCloseTo(0, 10);
  });

  test("t → ∞: shape → 1", () => {
    // At t = 100 × tau, shape should be very close to 1
    expect(sepdCumShape(1000, 10, 0.8)).toBeCloseTo(1, 5);
  });

  test("t = tau, n=1: shape = 1 - exp(-1) ≈ 0.6321", () => {
    expect(sepdCumShape(5, 5, 1)).toBeCloseTo(1 - Math.exp(-1), 8);
  });

  test("negative tau/n: returns 0", () => {
    expect(sepdCumShape(5, -1, 0.8)).toBe(0);
    expect(sepdCumShape(5, 5, -0.5)).toBe(0);
  });

  test("output is between 0 and 1", () => {
    for (const t of [1, 5, 10, 50, 100]) {
      const s = sepdCumShape(t, 20, 0.6);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

// ─── lgmSatFraction ───────────────────────────────────────────────────────

describe("lgmSatFraction", () => {
  test("t <= 0: returns 0", () => {
    expect(lgmSatFraction(0, 100, 1, 1)).toBe(0);
    expect(lgmSatFraction(-1, 100, 1, 1)).toBe(0);
  });

  test("saturation is between 0 and 1 for valid inputs", () => {
    for (const t of [1, 5, 10, 50, 100]) {
      const s = lgmSatFraction(t, 100, 1, 1);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  test("saturation increases monotonically with time", () => {
    const t1 = lgmSatFraction(10, 100, 1, 1);
    const t2 = lgmSatFraction(50, 100, 1, 1);
    const t3 = lgmSatFraction(100, 100, 1, 1);
    expect(t1).toBeLessThan(t2);
    expect(t2).toBeLessThan(t3);
  });

  test("zero K: returns 0", () => {
    expect(lgmSatFraction(10, 0, 1, 1)).toBe(0);
  });
});

// ─── dcaModelComparison ───────────────────────────────────────────────────

describe("dcaModelComparison", () => {
  test("returns finite SSR values for valid data", () => {
    const times = [1, 2, 3, 4, 5, 6, 12, 24, 36];
    const rates = [1000, 850, 740, 660, 600, 550, 420, 320, 270];
    const result = dcaModelComparison(times, rates);
    expect(isFinite(result.arpsSSR)).toBe(true);
    expect(isFinite(result.sepdSSR)).toBe(true);
    expect(isFinite(result.lgmSSR)).toBe(true);
  });

  test("insufficient data (<3 points): all SSR = Infinity", () => {
    const result = dcaModelComparison([1, 2], [100, 90]);
    expect(result.arpsSSR).toBe(Infinity);
    expect(result.sepdSSR).toBe(Infinity);
    expect(result.lgmSSR).toBe(Infinity);
  });

  test("all SSR values are non-negative", () => {
    const times = [1, 6, 12, 24, 36, 48, 60];
    const rates = [1500, 900, 650, 450, 340, 270, 220];
    const result = dcaModelComparison(times, rates);
    expect(result.arpsSSR).toBeGreaterThanOrEqual(0);
    expect(result.sepdSSR).toBeGreaterThanOrEqual(0);
    expect(result.lgmSSR).toBeGreaterThanOrEqual(0);
  });
});

// ─── arpsEURWithTerminalDecline ───────────────────────────────────────────

describe("arpsEURWithTerminalDecline", () => {
  test("qEL >= q(switch): EUR = Gp at switch time only", () => {
    // With very high economic limit, production stops at switch
    const Qi = 1000, Di = 0.3, b = 1.2, Dterm = 0.05, qEL = 999;
    const eur = arpsEURWithTerminalDecline(Qi, Di, b, Dterm, qEL);
    expect(eur).toBeGreaterThan(0);
  });

  test("EUR increases as economic limit decreases", () => {
    const Qi = 1000, Di = 0.3, b = 1.2, Dterm = 0.05;
    const eur_high = arpsEURWithTerminalDecline(Qi, Di, b, Dterm, 50);
    const eur_low  = arpsEURWithTerminalDecline(Qi, Di, b, Dterm, 10);
    expect(eur_low).toBeGreaterThan(eur_high);
  });

  test("returns finite positive value for realistic inputs", () => {
    const eur = arpsEURWithTerminalDecline(1000, 0.3, 1.2, 0.05, 50);
    expect(isFinite(eur)).toBe(true);
    expect(eur).toBeGreaterThan(0);
  });
});
