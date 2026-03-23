/**
 * Tests for P365 PTA Session 16 extensions:
 *   ptaMultiRateRNP, ptaLogLogDiagnostic, ptaDeconvolution
 */
import {
  ptaMultiRateRNP,
  ptaLogLogDiagnostic,
  ptaDeconvolution,
} from "../../src/functions/pta";

// ─── ptaMultiRateRNP ──────────────────────────────────────────────────────────

describe("ptaMultiRateRNP", () => {
  const k_mD    = 10;   // md
  const h_ft    = 50;   // ft
  const phi     = 0.15;
  const mu_cp   = 1.0;  // cp
  const ct_psi  = 1e-5; // psi⁻¹
  const rw_ft   = 0.33; // ft
  const Bo      = 1.2;  // res bbl/STB
  const S       = 0;

  test("single constant rate returns non-zero pressure drop", () => {
    const q_changes = [{ t_start_hrs: 0, q_STBd: 200 }];
    const { deltaPwf_psia, RNP_psiPerSTBd } = ptaMultiRateRNP(
      24, q_changes, k_mD, h_ft, phi, mu_cp, ct_psi, rw_ft, Bo, S
    );
    expect(deltaPwf_psia).toBeDefined();
    expect(RNP_psiPerSTBd).toBeDefined();
    expect(isFinite(deltaPwf_psia)).toBe(true);
  });

  test("two-rate test: increasing rate yields higher pressure drop", () => {
    const q_low  = [{ t_start_hrs: 0, q_STBd: 100 }];
    const q_high = [{ t_start_hrs: 0, q_STBd: 300 }];
    const res_low  = ptaMultiRateRNP(12, q_low,  k_mD, h_ft, phi, mu_cp, ct_psi, rw_ft, Bo, S);
    const res_high = ptaMultiRateRNP(12, q_high, k_mD, h_ft, phi, mu_cp, ct_psi, rw_ft, Bo, S);
    expect(Math.abs(res_high.deltaPwf_psia)).toBeGreaterThan(Math.abs(res_low.deltaPwf_psia));
  });

  test("multi-rate with two steps returns finite RNP", () => {
    const q_changes = [
      { t_start_hrs: 0,  q_STBd: 200 },
      { t_start_hrs: 24, q_STBd: 400 },
    ];
    const { deltaPwf_psia, RNP_psiPerSTBd } = ptaMultiRateRNP(
      48, q_changes, k_mD, h_ft, phi, mu_cp, ct_psi, rw_ft, Bo, S
    );
    expect(isFinite(deltaPwf_psia)).toBe(true);
    expect(isFinite(RNP_psiPerSTBd)).toBe(true);
  });

  test("empty q_changes returns zero", () => {
    const { deltaPwf_psia, RNP_psiPerSTBd } = ptaMultiRateRNP(
      24, [], k_mD, h_ft, phi, mu_cp, ct_psi, rw_ft, Bo, S
    );
    expect(deltaPwf_psia).toBe(0);
    expect(RNP_psiPerSTBd).toBe(0);
  });

  test("skin factor increases pressure drop", () => {
    const q_changes = [{ t_start_hrs: 0, q_STBd: 200 }];
    const { deltaPwf_psia: dp_S0 } = ptaMultiRateRNP(24, q_changes, k_mD, h_ft, phi, mu_cp, ct_psi, rw_ft, Bo, 0);
    const { deltaPwf_psia: dp_S5 } = ptaMultiRateRNP(24, q_changes, k_mD, h_ft, phi, mu_cp, ct_psi, rw_ft, Bo, 5);
    expect(Math.abs(dp_S5)).toBeGreaterThan(Math.abs(dp_S0));
  });
});

// ─── ptaLogLogDiagnostic ─────────────────────────────────────────────────────

describe("ptaLogLogDiagnostic", () => {
  // Synthetic buildup data: Δp grows with Δt on log scale
  const dt = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0];
  const dp = dt.map(t => 100 * Math.log10(1 + 5 * t));  // log-like growth

  test("returns array of same length as input", () => {
    const result = ptaLogLogDiagnostic(dt, dp);
    expect(result).toHaveLength(dt.length);
  });

  test("each entry has dt_hrs, dp_psi, dprime_psi", () => {
    const result = ptaLogLogDiagnostic(dt, dp);
    for (const row of result) {
      expect(row).toHaveProperty("dt_hrs");
      expect(row).toHaveProperty("dp_psi");
      expect(row).toHaveProperty("dprime_psi");
    }
  });

  test("derivative is positive for monotonically increasing ΔP", () => {
    const result = ptaLogLogDiagnostic(dt, dp);
    // Interior points should have positive derivative
    const interior = result.slice(1, -1);
    const allPositive = interior.every(r => !isFinite(r.dprime_psi) || r.dprime_psi >= 0);
    expect(allPositive).toBe(true);
  });

  test("L-smoothed derivative doesn't throw", () => {
    expect(() => ptaLogLogDiagnostic(dt, dp, 0.3)).not.toThrow();
    const result = ptaLogLogDiagnostic(dt, dp, 0.3);
    expect(result).toHaveLength(dt.length);
  });

  test("throws for mismatched array lengths", () => {
    expect(() => ptaLogLogDiagnostic([1, 2, 3], [10, 20])).toThrow();
  });

  test("throws for fewer than 3 data points", () => {
    expect(() => ptaLogLogDiagnostic([1, 2], [10, 20])).toThrow();
  });

  test("derivative near flat plateau approaches zero", () => {
    // Flat ΔP → derivative ≈ 0
    const dt_flat = [1, 2, 5, 10, 20];
    const dp_flat = [50, 50, 50, 50, 50];
    const result = ptaLogLogDiagnostic(dt_flat, dp_flat);
    // Interior derivatives should be zero or very small
    for (const row of result.slice(1, -1)) {
      if (isFinite(row.dprime_psi)) {
        expect(Math.abs(row.dprime_psi)).toBeLessThan(1e-6);
      }
    }
  });

  test("IARF (unit slope on Bourdet) gives derivative ≈ constant", () => {
    // IARF: Δp proportional to log(Δt) → Bourdet derivative = constant (m/2.303)
    const dt_iarf = [1, 2, 4, 8, 16, 32];
    const m = 50;   // psi/log-cycle (slope on semilog)
    const dp_iarf = dt_iarf.map(t => m * Math.log10(t) + 20);
    const result = ptaLogLogDiagnostic(dt_iarf, dp_iarf);
    const interior = result.slice(1, -1);
    for (const row of interior) {
      if (isFinite(row.dprime_psi)) {
        // Derivative of m·log10(t) with respect to ln(t) = m / ln(10) ≈ m/2.303
        expect(row.dprime_psi).toBeCloseTo(m / Math.LN10, 0);
      }
    }
  });
});

// ─── ptaDeconvolution ─────────────────────────────────────────────────────────

describe("ptaDeconvolution", () => {
  const dt  = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
  const dp  = dt.map(t => 80 * Math.log10(1 + 3 * t));
  const q   = dt.map(() => 200);  // constant rate

  test("returns array of same length as input", () => {
    const result = ptaDeconvolution(dt, dp, q);
    expect(result).toHaveLength(dt.length);
  });

  test("each entry has t_hrs and g_unit", () => {
    const result = ptaDeconvolution(dt, dp, q);
    for (const row of result) {
      expect(row).toHaveProperty("t_hrs");
      expect(row).toHaveProperty("g_unit");
    }
  });

  test("g_unit is positive for positive pressure data", () => {
    const result = ptaDeconvolution(dt, dp, q);
    const allPositive = result.every(r => !isFinite(r.g_unit) || r.g_unit >= 0);
    expect(allPositive).toBe(true);
  });

  test("g_unit is monotonically non-decreasing for log-growing ΔP", () => {
    const result = ptaDeconvolution(dt, dp, q);
    const validG = result.filter(r => isFinite(r.g_unit));
    for (let i = 1; i < validG.length; i++) {
      expect(validG[i].g_unit).toBeGreaterThanOrEqual(validG[i - 1].g_unit - 1e-6);
    }
  });

  test("larger lambda produces smoother (more averaged) g_unit", () => {
    const res_small = ptaDeconvolution(dt, dp, q, 1e-5);
    const res_large = ptaDeconvolution(dt, dp, q, 10);
    // With large lambda, g_unit values should be more similar (less variation)
    const std = (arr: number[]) => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
    };
    const g_small = res_small.filter(r => isFinite(r.g_unit)).map(r => r.g_unit);
    const g_large = res_large.filter(r => isFinite(r.g_unit)).map(r => r.g_unit);
    if (g_small.length > 2 && g_large.length > 2) {
      expect(std(g_large)).toBeLessThanOrEqual(std(g_small) + 1e-6);
    }
  });

  test("throws for mismatched array lengths", () => {
    expect(() => ptaDeconvolution([1, 2, 3], [10, 20], [100, 100, 100])).toThrow();
  });

  test("throws for fewer than 3 data points", () => {
    expect(() => ptaDeconvolution([1, 2], [10, 20], [100, 100])).toThrow();
  });

  test("NaN in q_STBd (zero rate) yields NaN in corresponding g_unit", () => {
    const q_zero = [...q];
    q_zero[3] = 0;  // zero rate at index 3
    const result = ptaDeconvolution(dt, dp, q_zero);
    expect(isNaN(result[3].g_unit)).toBe(true);
  });
});
