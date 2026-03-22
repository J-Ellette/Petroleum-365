/**
 * Tests: Inflow Performance Relationship (IPR)
 */

import {
  productivityIndex,
  darcyRate,
  pssProductivityIndex,
  ssProductivityIndex,
  transientProductivityIndex,
  vogelRate,
  vogelAOF,
  vogelQmax,
  compositeIPRRate,
  fetkovichIPRRate,
  fetkovichAOF,
  klinsClarkeRate,
  gasWellDarcyRate,
  gasWellNonDarcyRate,
  horizontalWellPI_Joshi,
  horizontalWellPI_Renard,
  skinPIRatio,
  skinPressureDrop,
} from "../../src/functions/ipr";

// ─── Productivity Index ───────────────────────────────────────────────────────

describe("Productivity Index", () => {
  test("PI = q / (Pr - Pwf)", () => {
    expect(productivityIndex(500, 3000, 2500)).toBeCloseTo(1.0, 5);
  });

  test("PI proportional to rate at same drawdown", () => {
    const PI1 = productivityIndex(500, 3000, 2500);
    const PI2 = productivityIndex(1000, 3000, 2000);
    expect(PI1).toBeCloseTo(PI2, 5); // same drawdown = 500 psi
  });

  test("throws when Pr <= Pwf", () => {
    expect(() => productivityIndex(500, 2000, 2500)).toThrow();
  });

  test("darcyRate: q = PI * (Pr - Pwf)", () => {
    expect(darcyRate(1.5, 3000, 2500)).toBeCloseTo(750, 5);
  });

  test("darcyRate: AOF at Pwf = 0", () => {
    expect(darcyRate(1.0, 3000, 0)).toBeCloseTo(3000, 5);
  });
});

// ─── PSS and SS Productivity Index ───────────────────────────────────────────

describe("PSS and SS Productivity Index", () => {
  const k = 50, h = 30, mu = 0.8, Bo = 1.2, re = 1000, rw = 0.35, S = 0;

  test("PSS PI is higher than SS PI (smaller denominator in PSS formula)", () => {
    const pss = pssProductivityIndex(k, h, mu, Bo, re, rw, S);
    const ss  = ssProductivityIndex(k, h, mu, Bo, re, rw, S);
    expect(pss).toBeGreaterThan(ss);
  });

  test("PSS PI: positive value with typical inputs", () => {
    const pi = pssProductivityIndex(k, h, mu, Bo, re, rw, S);
    expect(pi).toBeGreaterThan(0);
  });

  test("PSS PI decreases with increasing skin", () => {
    const pi0 = pssProductivityIndex(k, h, mu, Bo, re, rw, 0);
    const pi5 = pssProductivityIndex(k, h, mu, Bo, re, rw, 5);
    expect(pi5).toBeLessThan(pi0);
  });

  test("Transient PI is positive and finite", () => {
    const phi = 0.2, ct = 15e-6;
    const J = transientProductivityIndex(k, h, mu, Bo, phi, ct, rw, 100, S);
    expect(J).toBeGreaterThan(0);
    expect(isFinite(J)).toBe(true);
  });
});

// ─── Vogel IPR ────────────────────────────────────────────────────────────────

describe("Vogel IPR", () => {
  const Pr = 3000, Qmax = 2000;

  test("Q = 0 at Pwf = Pr (no drawdown)", () => {
    expect(vogelRate(Pr, Qmax, Pr)).toBeCloseTo(0, 5);
  });

  test("Q = Qmax at Pwf = 0", () => {
    expect(vogelRate(Pr, Qmax, 0)).toBeCloseTo(Qmax, 5);
  });

  test("Rate at mid-drawdown (Pwf = Pr/2)", () => {
    // Q/Qmax = 1 - 0.2*0.5 - 0.8*0.25 = 1 - 0.1 - 0.2 = 0.7
    expect(vogelRate(Pr, Qmax, Pr / 2)).toBeCloseTo(0.7 * Qmax, 3);
  });

  test("Vogel AOF equals Qmax", () => {
    expect(vogelAOF(Qmax)).toBe(Qmax);
  });

  test("vogelQmax: back-calculates Qmax from a test point", () => {
    const Pwf = 1500, q = 1400; // 0.7 * 2000
    const Qmax_calc = vogelQmax(Pr, Pwf, q);
    expect(Qmax_calc).toBeCloseTo(2000, 1);
  });

  test("throws if Pwf > Pr", () => {
    expect(() => vogelRate(Pr, Qmax, Pr + 100)).toThrow();
  });
});

// ─── Composite IPR ────────────────────────────────────────────────────────────

describe("Composite IPR (Darcy + Vogel)", () => {
  const Pr = 3000, Pb = 2000, J = 1.0; // STB/d/psi above Pb

  test("Above bubble point: linear (Darcy)", () => {
    // Pwf = 2500 > Pb: q = J * (Pr - Pwf) = 1.0 * 500 = 500
    expect(compositeIPRRate(Pr, Pb, J, 2500)).toBeCloseTo(500, 3);
  });

  test("At bubble point: Qb = J*(Pr-Pb)", () => {
    const Qb = J * (Pr - Pb);  // = 1000
    expect(compositeIPRRate(Pr, Pb, J, Pb)).toBeCloseTo(Qb, 2);
  });

  test("Below bubble point: rate > Qb (Vogel bonus)", () => {
    const q_atPb = compositeIPRRate(Pr, Pb, J, Pb);
    const q_below = compositeIPRRate(Pr, Pb, J, 1000);
    expect(q_below).toBeGreaterThan(q_atPb);
  });

  test("At Pwf = 0: maximum rate", () => {
    const q_max = compositeIPRRate(Pr, Pb, J, 0);
    expect(q_max).toBeGreaterThan(J * (Pr - Pb));
  });
});

// ─── Fetkovich IPR ───────────────────────────────────────────────────────────

describe("Fetkovich IPR", () => {
  const C = 0.001, n = 0.8, Pr = 3000;

  test("Rate = 0 at Pwf = Pr", () => {
    expect(fetkovichIPRRate(C, n, Pr, Pr)).toBeCloseTo(0, 5);
  });

  test("Rate increases as Pwf decreases", () => {
    const q1 = fetkovichIPRRate(C, n, Pr, 2000);
    const q2 = fetkovichIPRRate(C, n, Pr, 1000);
    expect(q2).toBeGreaterThan(q1);
  });

  test("AOF = C * Pr^(2n)", () => {
    const aof = fetkovichAOF(C, n, Pr);
    expect(aof).toBeCloseTo(C * Math.pow(Pr * Pr, n), 5);
  });

  test("n=1 Darcy-like (linear p²): exact check", () => {
    const q = fetkovichIPRRate(0.0001, 1, 3000, 2000);
    expect(q).toBeCloseTo(0.0001 * (3000 * 3000 - 2000 * 2000), 3);
  });
});

// ─── Klins-Clark Modified Vogel ───────────────────────────────────────────────

describe("Klins-Clark Modified Vogel IPR", () => {
  const Pr = 3000, Pb = 2500, Qmax = 1500;

  test("Rate is 0 at Pwf = Pr", () => {
    expect(klinsClarkeRate(Pr, Pb, Qmax, Pr)).toBeCloseTo(0, 5);
  });

  test("Rate = Qmax at Pwf = 0", () => {
    expect(klinsClarkeRate(Pr, Pb, Qmax, 0)).toBeCloseTo(Qmax, 3);
  });

  test("Rate decreases monotonically with Pwf", () => {
    const q1 = klinsClarkeRate(Pr, Pb, Qmax, 500);
    const q2 = klinsClarkeRate(Pr, Pb, Qmax, 1500);
    const q3 = klinsClarkeRate(Pr, Pb, Qmax, 2500);
    expect(q1).toBeGreaterThan(q2);
    expect(q2).toBeGreaterThan(q3);
  });
});

// ─── Gas Well Deliverability ──────────────────────────────────────────────────

describe("Gas Well Deliverability", () => {
  const k = 5, h = 50, mu = 0.02, Z = 0.85, T = 620;
  const Pr = 3000, Pwf = 1000, re = 2000, rw = 0.35, S = 0;

  test("Darcy rate > 0", () => {
    const q = gasWellDarcyRate(k, h, mu, Z, T, Pr, Pwf, re, rw, S);
    expect(q).toBeGreaterThan(0);
  });

  test("Rate = 0 at Pwf = Pr", () => {
    expect(gasWellDarcyRate(k, h, mu, Z, T, Pr, Pr, re, rw, S)).toBeCloseTo(0, 5);
  });

  test("Non-Darcy rate < Darcy rate (turbulence reduces rate)", () => {
    const D = 0.001;  // Small non-Darcy coefficient
    const qDarcy = gasWellDarcyRate(k, h, mu, Z, T, Pr, Pwf, re, rw, S);
    const qNonDarcy = gasWellNonDarcyRate(k, h, mu, Z, T, Pr, Pwf, re, rw, S, D);
    expect(qNonDarcy).toBeLessThan(qDarcy);
  });

  test("Non-Darcy rate approaches Darcy at D→0", () => {
    const qDarcy = gasWellDarcyRate(k, h, mu, Z, T, Pr, Pwf, re, rw, S);
    const qNonDarcy = gasWellNonDarcyRate(k, h, mu, Z, T, Pr, Pwf, re, rw, S, 1e-12);
    expect(qNonDarcy).toBeCloseTo(qDarcy, 2);
  });
});

// ─── Horizontal Well PI ───────────────────────────────────────────────────────

describe("Horizontal Well PI", () => {
  const kH = 50, h = 50, mu = 0.8, Bo = 1.2, rw = 0.35, L = 2000, reh = 2000, S = 0;

  test("Joshi PI > 0", () => {
    const J = horizontalWellPI_Joshi(kH, h, mu, Bo, rw, L, reh, S);
    expect(J).toBeGreaterThan(0);
  });

  test("Renard PI > 0", () => {
    const J = horizontalWellPI_Renard(kH, h, mu, Bo, rw, L, reh, S);
    expect(J).toBeGreaterThan(0);
  });

  test("Horizontal PI > vertical well PSS PI (higher kH, larger L)", () => {
    const { pssProductivityIndex: pssPI } = require("../../src/functions/ipr");
    const Jv = pssProductivityIndex(kH, h, mu, Bo, reh, rw, S);
    const Jh = horizontalWellPI_Joshi(kH, h, mu, Bo, rw, L, reh, S);
    expect(Jh).toBeGreaterThan(Jv);
  });

  test("PI decreases with skin", () => {
    const J0 = horizontalWellPI_Joshi(kH, h, mu, Bo, rw, L, reh, 0);
    const J5 = horizontalWellPI_Joshi(kH, h, mu, Bo, rw, L, reh, 5);
    expect(J5).toBeLessThan(J0);
  });
});

// ─── Skin Damage ──────────────────────────────────────────────────────────────

describe("Skin Damage", () => {
  const re = 1000, rw = 0.35;

  test("skinPIRatio = 1 when S = 0", () => {
    expect(skinPIRatio(re, rw, 0)).toBeCloseTo(1.0, 5);
  });

  test("skinPIRatio < 1 for positive skin (damage)", () => {
    expect(skinPIRatio(re, rw, 5)).toBeLessThan(1.0);
  });

  test("skinPIRatio > 1 for negative skin (stimulation)", () => {
    expect(skinPIRatio(re, rw, -2)).toBeGreaterThan(1.0);
  });

  test("skinPressureDrop = 0 when S = 0", () => {
    expect(skinPressureDrop(500, 0.8, 1.2, 50, 30, 0)).toBeCloseTo(0, 5);
  });

  test("skinPressureDrop > 0 for damage (S > 0)", () => {
    expect(skinPressureDrop(500, 0.8, 1.2, 50, 30, 5)).toBeGreaterThan(0);
  });

  test("skinPressureDrop < 0 for stimulation (S < 0)", () => {
    expect(skinPressureDrop(500, 0.8, 1.2, 50, 30, -2)).toBeLessThan(0);
  });
});
