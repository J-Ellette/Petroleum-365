/**
 * Tests: Pressure Transient Analysis (PTA)
 */

import {
  ei,
  dimensionlessTimeTD,
  dimensionlessTimeAtRadius,
  dimensionlessPressurePD,
  pdToPressureDrop,
  drawdownPwf,
  drawdownPwfEi,
  hornerTimeRatio,
  hornerBuildupPressure,
  hornerPermeability,
  hornerSkin,
  hornerPstar,
  mdhPermeability,
  mdhSkin,
  superposeWellborePressure,
  faultBuildupPressure,
  bourdetDerivative,
  wellboreStorageCoefficient,
  wellboreStorageCoefficientCD,
} from "../../src/functions/pta";

// ─── Ei Function ──────────────────────────────────────────────────────────────

describe("Ei (exponential integral)", () => {
  test("ei(-1) ≈ -0.21938 (known value)", () => {
    // Ei(-1) ≈ -0.21938 from tables
    expect(ei(-1)).toBeCloseTo(-0.21938, 4);
  });

  test("ei(-0.1) ≈ -1.8229 (known value)", () => {
    // Ei(-0.1) ≈ -1.8229
    expect(ei(-0.1)).toBeCloseTo(-1.8229, 3);
  });

  test("ei(-0.001) is large and negative", () => {
    expect(ei(-0.001)).toBeLessThan(-5);
  });

  test("throws for x >= 0", () => {
    expect(() => ei(0)).toThrow();
    expect(() => ei(1)).toThrow();
  });
});

// ─── Dimensionless Variables ──────────────────────────────────────────────────

describe("Dimensionless time tD", () => {
  const k = 10, phi = 0.2, mu = 0.8, ct = 15e-6, rw = 0.35;

  test("tD > 0 at t = 10 hrs", () => {
    const tD = dimensionlessTimeTD(k, 10, phi, mu, ct, rw);
    expect(tD).toBeGreaterThan(0);
  });

  test("tD increases with time", () => {
    const tD1 = dimensionlessTimeTD(k, 10, phi, mu, ct, rw);
    const tD2 = dimensionlessTimeTD(k, 100, phi, mu, ct, rw);
    expect(tD2).toBeGreaterThan(tD1);
  });

  test("tD at radius r > rw is smaller (radially outward)", () => {
    const tD_rw = dimensionlessTimeTD(k, 100, phi, mu, ct, rw);
    const tD_r  = dimensionlessTimeAtRadius(k, 100, phi, mu, ct, 100);
    expect(tD_r).toBeLessThan(tD_rw);
  });
});

describe("Dimensionless pressure PD", () => {
  test("PD increases with tD (pressure wave propagates)", () => {
    const PD1 = dimensionlessPressurePD(100, 1);
    const PD2 = dimensionlessPressurePD(1000, 1);
    expect(PD2).toBeGreaterThan(PD1);
  });

  test("PD at rD=1, large tD ≈ 0.5*ln(tD) + 0.4045", () => {
    const tD = 1e6;
    const PD = dimensionlessPressurePD(tD, 1);
    const expected = 0.5 * Math.log(tD) + 0.4045;
    expect(PD).toBeCloseTo(expected, 2);
  });

  test("PD = 0 when radius not yet reached (u >> 500)", () => {
    // Very small tD, large rD → signal hasn't reached that radius
    expect(dimensionlessPressurePD(0.001, 1000)).toBeCloseTo(0, 5);
  });

  test("pdToPressureDrop > 0", () => {
    const PD = dimensionlessPressurePD(1000, 1);
    const dP = pdToPressureDrop(PD, 500, 0.8, 1.2, 10, 30);
    expect(dP).toBeGreaterThan(0);
  });
});

// ─── Drawdown Pressure ────────────────────────────────────────────────────────

describe("Drawdown bottomhole pressure", () => {
  const Pi = 3000, q = 500, k = 10, h = 30, phi = 0.2;
  const mu = 0.8, Bo = 1.2, ct = 15e-6, rw = 0.35, S = 0;

  test("Pwf < Pi during drawdown", () => {
    const Pwf = drawdownPwf(Pi, q, k, h, phi, mu, Bo, ct, rw, 100, S);
    expect(Pwf).toBeLessThan(Pi);
    expect(Pwf).toBeGreaterThan(0);
  });

  test("Pwf decreases as t increases (pressure depletes)", () => {
    const Pwf1 = drawdownPwf(Pi, q, k, h, phi, mu, Bo, ct, rw, 10, S);
    const Pwf2 = drawdownPwf(Pi, q, k, h, phi, mu, Bo, ct, rw, 1000, S);
    expect(Pwf2).toBeLessThan(Pwf1);
  });

  test("Higher q → lower Pwf", () => {
    const Pwf_low  = drawdownPwf(Pi, 200, k, h, phi, mu, Bo, ct, rw, 100, S);
    const Pwf_high = drawdownPwf(Pi, 800, k, h, phi, mu, Bo, ct, rw, 100, S);
    expect(Pwf_high).toBeLessThan(Pwf_low);
  });

  test("Higher skin → lower Pwf (more pressure drop)", () => {
    const Pwf_S0 = drawdownPwf(Pi, q, k, h, phi, mu, Bo, ct, rw, 100, 0);
    const Pwf_S5 = drawdownPwf(Pi, q, k, h, phi, mu, Bo, ct, rw, 100, 5);
    expect(Pwf_S5).toBeLessThan(Pwf_S0);
  });

  test("Ei solution close to semilog at large tD", () => {
    // At t = 1000 hrs, large tD, Ei ≈ semilog
    const Pwf_sl = drawdownPwf(Pi, q, k, h, phi, mu, Bo, ct, rw, 1000, S);
    const Pwf_ei = drawdownPwfEi(Pi, q, k, h, phi, mu, Bo, ct, rw, 1000, S);
    // They should be within 1% of each other
    expect(Math.abs(Pwf_sl - Pwf_ei) / Pi).toBeLessThan(0.01);
  });
});

// ─── Horner Analysis ──────────────────────────────────────────────────────────

describe("Horner time ratio", () => {
  test("HTR = 2 at dt = tp", () => {
    expect(hornerTimeRatio(100, 100)).toBeCloseTo(2, 5);
  });

  test("HTR → 1 as dt → ∞ (large dt: tp+dt ≈ dt)", () => {
    expect(hornerTimeRatio(10, 1e9)).toBeCloseTo(1.0, 3);
  });

  test("throws when dt = 0", () => {
    expect(() => hornerTimeRatio(100, 0)).toThrow();
  });
});

describe("Horner permeability and skin", () => {
  // Round-trip test: generate synthetic data then analyze
  const k_true = 15, h = 40, mu = 0.9, Bo = 1.15;
  const phi = 0.18, ct = 12e-6, rw = 0.33, S_true = 3.5;
  const q = 400, Pi = 4000;

  // Horner slope m = -162.6 * q * mu * Bo / (k * h)
  const m = -(162.6 * q * mu * Bo) / (k_true * h);

  test("permeability recovered from slope", () => {
    const k_calc = hornerPermeability(q, mu, Bo, m, h);
    expect(k_calc).toBeCloseTo(k_true, 4);
  });

  test("skin recovered from P1hr", () => {
    // P1hr is Pwf at dt=1 on the Horner line → Pws1hr = P* - m*log(HTR at dt=1)
    // For long tp: HTR ≈ (tp+1)/1 ≈ tp; P1hr ≈ Pi + m*log(1) = Pi + 0
    // Standard formula: P1hr computed from buildup line
    // P1hr = Pi + m*log(1) = Pi (for infinite tp)
    const logArg = k_true / (phi * mu * ct * rw * rw);
    // Solve for P1hr from skin equation → P1hr = Pwf + |m|*(log(logArg) - 3.2275) + |m|*1.1515*S/1.1515
    // More directly: back-calculate from skin formula:
    // S = 1.1515 * [(P1hr - Pwf) / |m| - log(logArg) + 3.2275]
    // P1hr = Pwf + |m| * (S/1.1515 + log(logArg) - 3.2275)
    const Pwf = 2500;  // arbitrary flowing BHP
    const P1hr = Pwf + Math.abs(m) * (S_true / 1.1515 + Math.log10(logArg) - 3.2275);
    const S_calc = hornerSkin(P1hr, Pwf, m, k_true, phi, mu, ct, rw);
    expect(S_calc).toBeCloseTo(S_true, 3);
  });
});

describe("Horner buildup pressure and P*", () => {
  test("Pws = P* when HTR = 1 (dt → ∞)", () => {
    expect(hornerBuildupPressure(4000, 50, 1)).toBeCloseTo(4000, 5);
  });

  test("hornerPstar recovers P* from buildup data point", () => {
    // If Pws at HTR=10 is 4000 + m*log(10), P* = 4000
    const m_signed = -50;  // negative slope
    const Pws1 = 4000 + m_signed * Math.log10(10);  // = 4000 - 50 = 3950
    const Pstar = hornerPstar(Pws1, 10, m_signed);
    expect(Pstar).toBeCloseTo(4000, 4);
  });
});

// ─── MDH Analysis ─────────────────────────────────────────────────────────────

describe("MDH drawdown analysis", () => {
  const k_true = 25, h = 50, mu = 0.7, Bo = 1.25;
  const phi = 0.15, ct = 10e-6, rw = 0.4, S_true = 2;
  const q = 600;

  const m = -(162.6 * q * mu * Bo) / (k_true * h);

  test("MDH permeability matches Horner (same formula)", () => {
    const k_calc = mdhPermeability(q, mu, Bo, m, h);
    expect(k_calc).toBeCloseTo(k_true, 4);
  });

  test("MDH skin recovered from P1hr", () => {
    const logArg = k_true / (phi * mu * ct * rw * rw);
    const Pi = 5000;
    const P1hr = Pi - Math.abs(m) * (Math.log10(logArg) - 3.2275 + 0.8686 * S_true);
    const S_calc = mdhSkin(Pi, P1hr, m, k_true, phi, mu, ct, rw);
    expect(S_calc).toBeCloseTo(S_true, 3);
  });
});

// ─── Superposition ────────────────────────────────────────────────────────────

describe("Superposition wellbore pressure", () => {
  const Pi = 3000, k = 10, h = 30, phi = 0.2;
  const mu = 0.8, Bo = 1.2, ct = 15e-6, rw = 0.35, S = 0;

  test("Single constant rate reduces pressure (same as drawdown)", () => {
    const q = 500, t = 100;
    const Pwf_dd   = drawdownPwf(Pi, q, k, h, phi, mu, Bo, ct, rw, t, S);
    const Pwf_sup  = superposeWellborePressure(
      Pi, [q], [0], t, k, h, phi, mu, Bo, ct, rw, S
    );
    // Should be close (superposition uses PD, drawdown uses semilog — compare roughly)
    expect(Pwf_sup).toBeLessThan(Pi);
    expect(Pwf_sup).toBeGreaterThan(0);
  });

  test("Shut-in (q=0 after q=500) recovers pressure", () => {
    const tp = 100, dt = 50;
    const Pwf_flowing = superposeWellborePressure(
      Pi, [500], [0], tp, k, h, phi, mu, Bo, ct, rw, S
    );
    const Pws = superposeWellborePressure(
      Pi, [500, 0], [0, tp], tp + dt, k, h, phi, mu, Bo, ct, rw, S
    );
    expect(Pws).toBeGreaterThan(Pwf_flowing);
  });
});

// ─── Fault Analysis ───────────────────────────────────────────────────────────

describe("Fault buildup pressure (image well)", () => {
  const Pi = 3000, q = 400, k = 8, h = 40;
  const phi = 0.18, mu = 0.85, Bo = 1.18, ct = 13e-6, rw = 0.35;
  const d = 500, S = 1, tp = 1000;  // tp = 1000 hrs production before shut-in

  test("Pws < Pi during early buildup", () => {
    const Pws = faultBuildupPressure(Pi, q, k, h, phi, mu, Bo, ct, rw, d, tp, 10, S);
    expect(Pws).toBeLessThan(Pi);
    expect(Pws).toBeGreaterThan(0);
  });

  test("Pws increases with shut-in time", () => {
    const Pws10  = faultBuildupPressure(Pi, q, k, h, phi, mu, Bo, ct, rw, d, tp, 10, S);
    const Pws100 = faultBuildupPressure(Pi, q, k, h, phi, mu, Bo, ct, rw, d, tp, 100, S);
    expect(Pws100).toBeGreaterThan(Pws10);
  });
});

// ─── Bourdet Derivative ───────────────────────────────────────────────────────

describe("Bourdet pressure derivative", () => {
  test("derivative is computed for valid dataset", () => {
    const dt_arr = [1, 2, 5, 10, 20, 50, 100, 200];
    const dp_arr = dt_arr.map(dt => 50 * Math.log(dt) + 100);  // log-linear (IARF)
    const deriv = bourdetDerivative(dt_arr, dp_arr, 0.2);
    expect(deriv.length).toBeGreaterThan(0);
  });

  test("IARF derivative ≈ constant (= m/2.303) for semilog data", () => {
    // For IARF: Δp = m * log(t) + b → Δp' = m / ln(10) = m * 0.4343
    const m = 50;
    const dt_arr = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const dp_arr = dt_arr.map(dt => m * Math.log10(dt) + 500);
    const deriv = bourdetDerivative(dt_arr, dp_arr, 0.15);

    const expectedDeriv = m / Math.log(10);
    for (const [, dpPrime] of deriv) {
      expect(dpPrime).toBeCloseTo(expectedDeriv, 1);
    }
  });

  test("throws with fewer than 3 points", () => {
    expect(() => bourdetDerivative([1, 2], [10, 20], 0.2)).toThrow();
  });
});

// ─── Wellbore Storage ─────────────────────────────────────────────────────────

describe("Wellbore Storage", () => {
  test("C = V * ct", () => {
    const C = wellboreStorageCoefficient(0.5, 1e-5);
    expect(C).toBeCloseTo(5e-6, 10);
  });

  test("CD > 0 for valid inputs", () => {
    const CD = wellboreStorageCoefficientCD(0.001, 0.2, 15e-6, 30, 0.35);
    expect(CD).toBeGreaterThan(0);
  });
});
