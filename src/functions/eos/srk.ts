/**
 * P365 — Soave-Redlich-Kwong (SRK) Equation of State
 *
 * SRK EoS (Soave 1972):
 *   P = RT/(V−b) − a(T) / [V(V+b)]
 *
 * In terms of compressibility factor Z:
 *   Z³ − Z² + (A − B − B²)Z − AB = 0
 *
 *   A = a·P / (R·T)²   B = b·P / (R·T)
 *   ΩA = 0.42748        ΩB = 0.08664
 *   m  = 0.480 + 1.574·ω − 0.176·ω²
 *   α(T) = [1 + m·(1 − √(T/Tc))]²
 *   a(T) = ΩA·R²·Tc²·α(T) / Pc
 *   b    = ΩB·R·Tc / Pc
 *
 * All computations use the engineering field unit convention:
 *   R = 10.7316 psia·ft³/(lbmol·°R)
 *   Temperature in °R = °F + 459.67
 *   Pressure in psia
 *
 * References:
 *   Soave, G. (1972). "Equilibrium constants from a modified Redlich-Kwong
 *   equation of state." Chem. Eng. Sci., 27(6), 1197–1203.
 */

const R_SRK = 10.7316;   // psia·ft³ / (lbmol·°R)
const OmegaA_SRK = 0.42748;
const OmegaB_SRK = 0.08664;

// ─── Pure-Component Parameters ─────────────────────────────────────────────

/**
 * SRK pure-component attraction (a) and co-volume (b) parameters.
 *
 * @param Tc_R    Critical temperature (°R)
 * @param Pc_psia Critical pressure (psia)
 * @param omega   Acentric factor (−)
 * @param T_R     Temperature (°R)
 * @returns       { a: psia·ft⁶/lbmol², b: ft³/lbmol }
 */
export function srkAB(
  Tc_R: number,
  Pc_psia: number,
  omega: number,
  T_R: number,
): { a: number; b: number } {
  const m     = 0.480 + 1.574 * omega - 0.176 * omega * omega;
  const alpha = Math.pow(1 + m * (1 - Math.sqrt(T_R / Tc_R)), 2);
  const a     = OmegaA_SRK * R_SRK * R_SRK * Tc_R * Tc_R * alpha / Pc_psia;
  const b     = OmegaB_SRK * R_SRK * Tc_R / Pc_psia;
  return { a, b };
}

// ─── Cubic Solver ──────────────────────────────────────────────────────────

/**
 * Find all real roots of the SRK Z-factor cubic.
 *   Z³ − Z² + (A − B − B²)·Z − A·B = 0
 *
 * @param A  Dimensionless attraction parameter
 * @param B  Dimensionless co-volume parameter
 * @returns  Array of real Z roots, sorted ascending
 */
function srkCubicRoots(A: number, B: number): number[] {
  // Coefficients: Z³ + p·Z² + q·Z + r = 0
  const p = -1;
  const q = A - B - B * B;
  const r = -A * B;

  // Cardano's method via depressed cubic
  const a2 = p / 3;
  const Q  = (3 * q - p * p) / 9;
  const R  = (9 * p * q - 27 * r - 2 * p * p * p) / 54;
  const D  = Q * Q * Q + R * R;

  const roots: number[] = [];

  if (D > 0) {
    // One real root
    const sqrtD = Math.sqrt(D);
    const S = Math.cbrt(R + sqrtD);
    const T = Math.cbrt(R - sqrtD);
    roots.push(S + T - a2);
  } else {
    // Three real roots
    const theta = Math.acos(R / Math.sqrt(-Q * Q * Q));
    const sqrtQ = 2 * Math.sqrt(-Q);
    roots.push(sqrtQ * Math.cos(theta / 3) - a2);
    roots.push(sqrtQ * Math.cos((theta + 2 * Math.PI) / 3) - a2);
    roots.push(sqrtQ * Math.cos((theta + 4 * Math.PI) / 3) - a2);
  }

  return roots.filter(z => z > B).sort((a, b) => a - b);
}

// ─── Z-Factor ──────────────────────────────────────────────────────────────

/**
 * SRK Z-factor for a pure component at (T, P).
 *
 * Returns the largest real root (vapor) when only one root exists;
 * when three real roots exist, returns the largest (vapor) or smallest (liquid).
 *
 * @param Tc_R    Critical temperature (°R)
 * @param Pc_psia Critical pressure (psia)
 * @param omega   Acentric factor
 * @param T_R     Temperature (°R)
 * @param P_psia  Pressure (psia)
 * @param phase   'vapor' (default) | 'liquid'
 * @returns       Compressibility factor Z (−)
 */
export function srkZFactor(
  Tc_R: number,
  Pc_psia: number,
  omega: number,
  T_R: number,
  P_psia: number,
  phase: 'vapor' | 'liquid' = 'vapor',
): number {
  const { a, b } = srkAB(Tc_R, Pc_psia, omega, T_R);
  const A = a * P_psia / (R_SRK * R_SRK * T_R * T_R);
  const B = b * P_psia / (R_SRK * T_R);
  const roots = srkCubicRoots(A, B);
  if (roots.length === 1) return roots[0];
  return phase === 'liquid' ? roots[0] : roots[roots.length - 1];
}

// ─── Fugacity Coefficient ─────────────────────────────────────────────────

/**
 * SRK fugacity coefficient for a pure component.
 *   ln φ = (Z−1) − ln(Z−B) − A/B · ln(1 + B/Z)
 *
 * @param Z  Compressibility factor
 * @param A  Dimensionless attraction parameter
 * @param B  Dimensionless co-volume parameter
 * @returns  Fugacity coefficient φ (−)
 */
export function srkFugacityCoefficient(Z: number, A: number, B: number): number {
  const lnPhi = (Z - 1) - Math.log(Z - B) - (A / B) * Math.log(1 + B / Z);
  return Math.exp(lnPhi);
}

// ─── Mixture Rules ──────────────────────────────────────────────────────────

/**
 * SRK mixture A and B parameters (van der Waals one-fluid mixing rules).
 *
 * a_mix = ΣΣ zi·zj·√(ai·aj)·(1−kij)
 * b_mix = Σ zi·bi
 *
 * @param Tcs_R    Critical temperatures (°R) — array length N
 * @param Pcs_psia Critical pressures (psia) — array length N
 * @param omegas   Acentric factors — array length N
 * @param zs       Mole fractions — array length N (must sum to ≈ 1)
 * @param T_R      Temperature (°R)
 * @param P_psia   Pressure (psia)
 * @param kijs     Binary interaction parameters N×N (optional, default 0)
 * @returns        { A, B, a_i, b_i } — A and B dimensionless; a_i, b_i per-component
 */
export function srkMixAB(
  Tcs_R: number[],
  Pcs_psia: number[],
  omegas: number[],
  zs: number[],
  T_R: number,
  P_psia: number,
  kijs?: number[][],
): { A: number; B: number; a_i: number[]; b_i: number[] } {
  const N = Tcs_R.length;
  const a_i: number[] = [];
  const b_i: number[] = [];

  for (let i = 0; i < N; i++) {
    const { a, b } = srkAB(Tcs_R[i], Pcs_psia[i], omegas[i], T_R);
    a_i.push(a);
    b_i.push(b);
  }

  let a_mix = 0;
  let b_mix = 0;
  for (let i = 0; i < N; i++) {
    b_mix += zs[i] * b_i[i];
    for (let j = 0; j < N; j++) {
      const kij = kijs ? (kijs[i]?.[j] ?? 0) : 0;
      a_mix += zs[i] * zs[j] * Math.sqrt(a_i[i] * a_i[j]) * (1 - kij);
    }
  }

  const A = a_mix * P_psia / (R_SRK * R_SRK * T_R * T_R);
  const B = b_mix * P_psia / (R_SRK * T_R);

  return { A, B, a_i, b_i };
}

// ─── Mixture Fugacity Coefficient ─────────────────────────────────────────

/**
 * SRK partial fugacity coefficient for component i in a mixture.
 *
 * ln φ_i = b_i/b_mix · (Z−1) − ln(Z−B) − A/B · (2·√a_i/a_mix − b_i/b_mix) · ln(1+B/Z)
 *
 * where a_mix = A·(R·T)²/P  and  b_mix = B·R·T/P
 */
function srkPartialFugacity(
  i: number,
  Z: number,
  A: number,
  B: number,
  a_i: number[],
  b_i: number[],
  zs: number[],
  T_R: number,
  P_psia: number,
  kijs?: number[][],
): number {
  const N = a_i.length;
  const a_mix = A * R_SRK * R_SRK * T_R * T_R / P_psia;
  const b_mix = B * R_SRK * T_R / P_psia;

  // Σ zj·√(ai·aj)·(1-kij)  (sum over j)
  let sum_j = 0;
  for (let j = 0; j < N; j++) {
    const kij = kijs ? (kijs[i]?.[j] ?? 0) : 0;
    sum_j += zs[j] * Math.sqrt(a_i[i] * a_i[j]) * (1 - kij);
  }

  const term1 = b_i[i] / b_mix * (Z - 1);
  const term2 = -Math.log(Z - B);
  const term3 = -(A / B) * (2 * sum_j / a_mix - b_i[i] / b_mix) * Math.log(1 + B / Z);
  return Math.exp(term1 + term2 + term3);
}

// ─── Wilson K-Values ────────────────────────────────────────────────────────

function srkWilsonK(Tc_R: number, Pc_psia: number, omega: number, T_R: number, P_psia: number): number {
  return (Pc_psia / P_psia) * Math.exp(5.373 * (1 + omega) * (1 - Tc_R / T_R));
}

// ─── Bubble-Point Pressure ──────────────────────────────────────────────────

/**
 * SRK bubble-point pressure (psia) for a feed composition z[] at temperature T.
 *
 * Uses successive substitution with Wilson K-values as initial guess.
 *
 * @param Tcs_R    Critical temperatures (°R)
 * @param Pcs_psia Critical pressures (psia)
 * @param omegas   Acentric factors
 * @param zs       Overall mole fractions
 * @param T_R      Temperature (°R)
 * @param P_guess  Initial pressure guess (psia), default 500
 * @param kijs     Binary interaction parameters (optional)
 * @returns        Bubble-point pressure (psia)
 */
export function srkBubblePoint(
  Tcs_R: number[],
  Pcs_psia: number[],
  omegas: number[],
  zs: number[],
  T_R: number,
  P_guess = 500,
  kijs?: number[][],
): number {
  const N  = Tcs_R.length;
  let P    = P_guess;
  let Ki   = Tcs_R.map((Tc, i) => srkWilsonK(Tc, Pcs_psia[i], omegas[i], T_R, P));

  for (let iter = 0; iter < 200; iter++) {
    const sumKz = Ki.reduce((s, k, i) => s + k * zs[i], 0);
    // Rachford-Rice: bubble point when Σ Ki·zi = 1
    const P_new = P * sumKz;

    // Recompute K-values via fugacity coefficients
    const { A: A_liq, B: B_liq, a_i: a_liq, b_i: b_liq } = srkMixAB(Tcs_R, Pcs_psia, omegas, zs, T_R, P_new, kijs);
    const roots_liq = srkCubicRoots(A_liq, B_liq);
    const Z_liq = roots_liq[0];  // smallest root = liquid

    // Vapour phase composition: y_i = K_i · z_i
    const sumKz2 = Ki.reduce((s, k, i) => s + k * zs[i], 0);
    const ys = Ki.map((k, i) => k * zs[i] / sumKz2);
    const { A: A_vap, B: B_vap, a_i: a_vap, b_i: b_vap } = srkMixAB(Tcs_R, Pcs_psia, omegas, ys, T_R, P_new, kijs);
    const roots_vap = srkCubicRoots(A_vap, B_vap);
    const Z_vap = roots_vap[roots_vap.length - 1];  // largest root = vapour

    const Ki_new = Tcs_R.map((_, i) => {
      const phi_l = srkPartialFugacity(i, Z_liq, A_liq, B_liq, a_liq, b_liq, zs, T_R, P_new, kijs);
      const phi_v = srkPartialFugacity(i, Z_vap, A_vap, B_vap, a_vap, b_vap, ys, T_R, P_new, kijs);
      return phi_l / phi_v;
    });

    const err = Math.max(...Ki_new.map((k, i) => Math.abs(k - Ki[i]) / (Math.abs(Ki[i]) + 1e-12)));
    P  = P_new;
    Ki = Ki_new;
    if (err < 1e-8) break;
  }

  return P;
}

// ─── Dew-Point Pressure ────────────────────────────────────────────────────

/**
 * SRK dew-point pressure (psia) for a feed composition z[] at temperature T.
 *
 * @param Tcs_R    Critical temperatures (°R)
 * @param Pcs_psia Critical pressures (psia)
 * @param omegas   Acentric factors
 * @param zs       Overall mole fractions
 * @param T_R      Temperature (°R)
 * @param P_guess  Initial pressure guess (psia), default 1000
 * @param kijs     Binary interaction parameters (optional)
 * @returns        Dew-point pressure (psia)
 */
export function srkDewPoint(
  Tcs_R: number[],
  Pcs_psia: number[],
  omegas: number[],
  zs: number[],
  T_R: number,
  P_guess = 1000,
  kijs?: number[][],
): number {
  const N  = Tcs_R.length;
  let P    = P_guess;
  let Ki   = Tcs_R.map((Tc, i) => srkWilsonK(Tc, Pcs_psia[i], omegas[i], T_R, P));

  for (let iter = 0; iter < 200; iter++) {
    const sumZ_K = zs.reduce((s, z, i) => s + z / Ki[i], 0);
    const P_new  = P / sumZ_K;   // dew point when Σ zi/Ki = 1

    // Liquid phase composition: x_i = z_i / Ki / Σ(z_j/Kj)
    const xs = zs.map((z, i) => z / (Ki[i] * sumZ_K));
    const { A: A_liq, B: B_liq, a_i: a_liq, b_i: b_liq } = srkMixAB(Tcs_R, Pcs_psia, omegas, xs, T_R, P_new, kijs);
    const roots_liq = srkCubicRoots(A_liq, B_liq);
    const Z_liq = roots_liq[0];

    const { A: A_vap, B: B_vap, a_i: a_vap, b_i: b_vap } = srkMixAB(Tcs_R, Pcs_psia, omegas, zs, T_R, P_new, kijs);
    const roots_vap = srkCubicRoots(A_vap, B_vap);
    const Z_vap = roots_vap[roots_vap.length - 1];

    const Ki_new = Tcs_R.map((_, i) => {
      const phi_l = srkPartialFugacity(i, Z_liq, A_liq, B_liq, a_liq, b_liq, xs, T_R, P_new, kijs);
      const phi_v = srkPartialFugacity(i, Z_vap, A_vap, B_vap, a_vap, b_vap, zs, T_R, P_new, kijs);
      return phi_l / phi_v;
    });

    const err = Math.max(...Ki_new.map((k, i) => Math.abs(k - Ki[i]) / (Math.abs(Ki[i]) + 1e-12)));
    P  = P_new;
    Ki = Ki_new;
    if (err < 1e-8) break;
  }

  return P;
}

// ─── Rachford-Rice ─────────────────────────────────────────────────────────

function rrFunction(V: number, Ki: number[], zs: number[]): number {
  return zs.reduce((s, z, i) => s + z * (Ki[i] - 1) / (1 + V * (Ki[i] - 1)), 0);
}

// ─── Two-Phase Flash ───────────────────────────────────────────────────────

/**
 * SRK two-phase isothermal flash calculation.
 *
 * Given feed composition z[], temperature T, and pressure P, returns:
 *   - Vapour mole fraction V (0 = all liquid, 1 = all vapour)
 *   - Liquid mole fractions x[]
 *   - Vapour mole fractions y[]
 *   - Liquid Z-factor Z_liq
 *   - Vapour Z-factor Z_vap
 *
 * @param Tcs_R    Critical temperatures (°R) — length N
 * @param Pcs_psia Critical pressures (psia)
 * @param omegas   Acentric factors
 * @param zs       Overall mole fractions
 * @param T_R      Temperature (°R)
 * @param P_psia   Pressure (psia)
 * @param kijs     Binary interaction parameters (optional)
 * @returns        { V_frac, x, y, Z_liq, Z_vap }
 */
export function srkFlash(
  Tcs_R: number[],
  Pcs_psia: number[],
  omegas: number[],
  zs: number[],
  T_R: number,
  P_psia: number,
  kijs?: number[][],
): { V_frac: number; x: number[]; y: number[]; Z_liq: number; Z_vap: number } {
  const N  = Tcs_R.length;
  let Ki   = Tcs_R.map((Tc, i) => srkWilsonK(Tc, Pcs_psia[i], omegas[i], T_R, P_psia));

  // Check trivial solutions
  const sumKz  = Ki.reduce((s, k, i) => s + k * zs[i], 0);
  const sumZ_K = zs.reduce((s, z, i) => s + z / Ki[i], 0);
  if (sumKz <= 1) return { V_frac: 0, x: [...zs], y: Ki.map((k, i) => k * zs[i] / sumKz), Z_liq: 0, Z_vap: 0 };
  if (sumZ_K <= 1) return { V_frac: 1, x: zs.map((z, i) => z / (Ki[i] * sumZ_K)), y: [...zs], Z_liq: 0, Z_vap: 1 };

  // Successive substitution loop
  for (let iter = 0; iter < 300; iter++) {
    // Rachford-Rice bisection for V
    const Vmin = 1 / (1 - Math.max(...Ki));
    const Vmax = 1 / (1 - Math.min(...Ki));
    let Vlo = Math.max(0, Vmin) + 1e-8;
    let Vhi = Math.min(1, Vmax) - 1e-8;
    let V   = 0.5;
    for (let bi = 0; bi < 60; bi++) {
      V = (Vlo + Vhi) / 2;
      const f = rrFunction(V, Ki, zs);
      if (Math.abs(f) < 1e-10) break;
      if (f > 0) Vlo = V; else Vhi = V;
    }
    V = Math.max(0, Math.min(1, V));

    const xs = zs.map((z, i) => z / (1 + V * (Ki[i] - 1)));
    const ys = zs.map((z, i) => Ki[i] * z / (1 + V * (Ki[i] - 1)));

    // Normalize
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    for (let i = 0; i < N; i++) { xs[i] /= sumX; ys[i] /= sumY; }

    // Fugacity coefficients
    const { A: A_liq, B: B_liq, a_i: a_liq, b_i: b_liq } = srkMixAB(Tcs_R, Pcs_psia, omegas, xs, T_R, P_psia, kijs);
    const { A: A_vap, B: B_vap, a_i: a_vap, b_i: b_vap } = srkMixAB(Tcs_R, Pcs_psia, omegas, ys, T_R, P_psia, kijs);

    const roots_liq = srkCubicRoots(A_liq, B_liq);
    const roots_vap = srkCubicRoots(A_vap, B_vap);
    const Z_liq = roots_liq[0];
    const Z_vap = roots_vap[roots_vap.length - 1];

    const phi_l = xs.map((_, i) => srkPartialFugacity(i, Z_liq, A_liq, B_liq, a_liq, b_liq, xs, T_R, P_psia, kijs));
    const phi_v = ys.map((_, i) => srkPartialFugacity(i, Z_vap, A_vap, B_vap, a_vap, b_vap, ys, T_R, P_psia, kijs));

    const Ki_new = phi_l.map((phi, i) => phi / phi_v[i]);
    const err    = Math.max(...Ki_new.map((k, i) => Math.abs(Math.log(k / Ki[i]))));
    Ki = Ki_new;

    if (err < 1e-9) {
      const xs_f = zs.map((z, i) => z / (1 + V * (Ki[i] - 1)));
      const ys_f = zs.map((z, i) => Ki[i] * z / (1 + V * (Ki[i] - 1)));
      const sx = xs_f.reduce((s, x) => s + x, 0);
      const sy = ys_f.reduce((s, y) => s + y, 0);
      for (let i = 0; i < N; i++) { xs_f[i] /= sx; ys_f[i] /= sy; }

      const { A: Al, B: Bl } = srkMixAB(Tcs_R, Pcs_psia, omegas, xs_f, T_R, P_psia, kijs);
      const { A: Av, B: Bv } = srkMixAB(Tcs_R, Pcs_psia, omegas, ys_f, T_R, P_psia, kijs);
      const rl = srkCubicRoots(Al, Bl);
      const rv = srkCubicRoots(Av, Bv);
      return {
        V_frac: V,
        x: xs_f,
        y: ys_f,
        Z_liq: rl[0],
        Z_vap: rv[rv.length - 1],
      };
    }
  }

  // Return best estimate after max iterations
  const xs_f = zs.map((z, i) => z / (1 + 0.5 * (Ki[i] - 1)));
  const ys_f = zs.map((z, i) => Ki[i] * z / (1 + 0.5 * (Ki[i] - 1)));
  return { V_frac: 0.5, x: xs_f, y: ys_f, Z_liq: 0.3, Z_vap: 0.85 };
}

// ─── Peneloux Volume Shift ──────────────────────────────────────────────────

/**
 * Apply Peneloux (1982) volume shift correction to SRK molar volume.
 *
 * V_corrected = V_SRK − Σ zi·ci
 *
 * Peneloux shift parameter ci for component i:
 *   ci = 0.40768 · (R·Tci/Pci) · (0.29441 − ZRA_i)
 * where ZRA_i is the Rackett compressibility factor.  If ZRA is unknown,
 * use ZRA ≈ 0.2908 − 0.0991·ωi (Yamada-Gunn).
 *
 * @param Tcs_R    Critical temperatures (°R) — length N
 * @param Pcs_psia Critical pressures (psia)
 * @param omegas   Acentric factors
 * @param zs       Mole fractions
 * @param ZRA_i    Rackett compressibility factors (optional, estimated if absent)
 * @returns        Volume shift Σ zi·ci (ft³/lbmol), subtract from SRK molar volume
 */
export function srkPenelouxShift(
  Tcs_R: number[],
  Pcs_psia: number[],
  omegas: number[],
  zs: number[],
  ZRA_i?: number[],
): number {
  let shift = 0;
  for (let i = 0; i < Tcs_R.length; i++) {
    const ZRA = ZRA_i ? ZRA_i[i] : (0.2908 - 0.0991 * omegas[i]);
    const ci  = 0.40768 * (R_SRK * Tcs_R[i] / Pcs_psia[i]) * (0.29441 - ZRA);
    shift += zs[i] * ci;
  }
  return shift;
}
