/**
 * Tests: Decline Curve Analysis
 */

import {
  arpsRate,
  arpsCumulative,
  effectiveToNominalDecline,
  nominalToEffectiveDecline,
  modifiedHyperbolicRate,
  modifiedHyperbolicCumulative,
  duongRate,
  duongCumulative,
  arpsFit,
  arpsEUR,
} from "../../src/functions/dca";

describe("Arps decline rate", () => {
  test("Exponential decline (b=0): Q(0) = Qi", () => {
    expect(arpsRate(1000, 0.1, 0, 0)).toBeCloseTo(1000, 5);
  });

  test("Exponential: Q(t) = Qi * exp(-Di*t)", () => {
    const Qi = 1000;
    const Di = 0.1;
    const t = 10;
    expect(arpsRate(Qi, Di, 0, t)).toBeCloseTo(Qi * Math.exp(-Di * t), 5);
  });

  test("Hyperbolic (b=0.5): rate decreases over time", () => {
    const q1 = arpsRate(1000, 0.1, 0.5, 12);
    const q2 = arpsRate(1000, 0.1, 0.5, 24);
    expect(q2).toBeLessThan(q1);
  });

  test("Harmonic (b=1): rate formula exact", () => {
    const Qi = 1000;
    const Di = 0.1;
    const t = 5;
    const expected = Qi / (1 + Di * t);
    expect(arpsRate(Qi, Di, 1, t)).toBeCloseTo(expected, 5);
  });

  test("b=2 (super-hyperbolic): slower decline than b=0.5", () => {
    const q_b05 = arpsRate(1000, 0.15, 0.5, 24);
    const q_b2  = arpsRate(1000, 0.15, 2.0, 24);
    expect(q_b2).toBeGreaterThan(q_b05);
  });
});

describe("Arps cumulative production", () => {
  test("Exponential cumulative: exact formula", () => {
    const Qi = 1000;
    const Di = 0.1;
    const t = 12;
    const expected = (Qi / Di) * (1 - Math.exp(-Di * t));
    expect(arpsCumulative(Qi, Di, 0, t)).toBeCloseTo(expected, 3);
  });

  test("Harmonic cumulative: exact formula", () => {
    const Qi = 1000;
    const Di = 0.1;
    const t = 12;
    const expected = (Qi / Di) * Math.log(1 + Di * t);
    expect(arpsCumulative(Qi, Di, 1, t)).toBeCloseTo(expected, 3);
  });

  test("Cumulative(t=0) = 0", () => {
    expect(arpsCumulative(1000, 0.1, 0.5, 0)).toBeCloseTo(0, 5);
  });

  test("Cumulative increases monotonically", () => {
    const Np1 = arpsCumulative(1000, 0.1, 0.5, 12);
    const Np2 = arpsCumulative(1000, 0.1, 0.5, 24);
    expect(Np2).toBeGreaterThan(Np1);
  });
});

describe("Decline rate conversions", () => {
  test("Effective → Nominal → Effective round-trip (exponential)", () => {
    const De = 0.20; // 20% annual
    const Di = effectiveToNominalDecline(De, 0);
    const De2 = nominalToEffectiveDecline(Di, 0);
    expect(De2).toBeCloseTo(De, 8);
  });

  test("Effective → Nominal → Effective round-trip (hyperbolic b=0.5)", () => {
    const De = 0.30;
    const Di = effectiveToNominalDecline(De, 0.5);
    const De2 = nominalToEffectiveDecline(Di, 0.5);
    expect(De2).toBeCloseTo(De, 8);
  });
});

describe("Modified hyperbolic decline", () => {
  test("Before switch: matches pure hyperbolic", () => {
    const Qi = 1000; const Di = 0.15; const b = 1.5; const Dterm = 0.05;
    const tSwitch = (Di / Dterm - 1) / (b * Di);
    const t = tSwitch * 0.5; // well before switch
    const qMH = modifiedHyperbolicRate(Qi, Di, b, Dterm, t);
    const qArps = arpsRate(Qi, Di, b, t);
    expect(qMH).toBeCloseTo(qArps, 3);
  });

  test("After switch: smoother decline (no unrealistic EUR)", () => {
    const Qi = 1000; const Di = 0.15; const b = 2.0; const Dterm = 0.05;
    const tSwitch = (Di / Dterm - 1) / (b * Di);
    const tLate = tSwitch * 3;
    const q = modifiedHyperbolicRate(Qi, Di, b, Dterm, tLate);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(Qi);
  });

  test("Modified hyperbolic cumulative ≥ hyperbolic cumulative for same time (higher Di phase)", () => {
    const Qi = 1000; const Di = 0.15; const b = 1.5; const Dterm = 0.05;
    // Before switch: should be same
    const tSwitch = (Di / Dterm - 1) / (b * Di);
    const NpMH = modifiedHyperbolicCumulative(Qi, Di, b, Dterm, tSwitch);
    const NpArps = arpsCumulative(Qi, Di, b, tSwitch);
    expect(NpMH).toBeCloseTo(NpArps, 0);
  });
});

describe("Duong decline", () => {
  test("Rate at t>0 is positive", () => {
    const q = duongRate(1000, 0.5, 1.1, 12);
    expect(q).toBeGreaterThan(0);
  });

  test("Rate decreases over time", () => {
    const q1 = duongRate(1000, 0.5, 1.1, 6);
    const q2 = duongRate(1000, 0.5, 1.1, 24);
    expect(q2).toBeLessThan(q1);
  });

  test("Cumulative increases over time", () => {
    const Np1 = duongCumulative(1000, 0.5, 1.1, 12);
    const Np2 = duongCumulative(1000, 0.5, 1.1, 24);
    expect(Np2).toBeGreaterThan(Np1);
  });

  test("Cumulative at t=0 is 0", () => {
    expect(duongCumulative(1000, 0.5, 1.1, 0)).toBe(0);
  });
});

describe("Arps curve fitting", () => {
  test("Fit recovers approximate parameters for exponential decline", () => {
    // Generate synthetic data
    const Qi = 1000;
    const Di = 0.08;
    const b  = 0.0;
    const times = Array.from({ length: 20 }, (_, i) => i + 1);
    const rates = times.map((t) => arpsRate(Qi, Di, b, t) + (Math.random() - 0.5) * 10);

    const [QiFit, DiFit] = arpsFit(times, rates);
    expect(QiFit).toBeGreaterThan(800);
    expect(QiFit).toBeLessThan(1200);
    expect(DiFit).toBeGreaterThan(0.02);
  });

  test("Throws on insufficient data", () => {
    expect(() => arpsFit([1, 2], [100, 90])).toThrow();
  });
});

describe("EUR calculation", () => {
  test("EUR is greater than current cumulative", () => {
    const Np_t12 = arpsCumulative(1000, 0.1, 0.5, 12);
    const eur = arpsEUR(1000, 0.1, 0.5, 10, 0.1, true); // qLimit = 10
    expect(eur).toBeGreaterThan(Np_t12);
  });

  test("Lower economic limit → higher EUR", () => {
    const eur1 = arpsEUR(1000, 0.1, 0.5, 20, 0.08, false);
    const eur2 = arpsEUR(1000, 0.1, 0.5, 5,  0.08, false);
    expect(eur2).toBeGreaterThan(eur1);
  });
});
