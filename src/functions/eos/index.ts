/**
 * P365 — Equation of State (EoS)
 *
 * Peng-Robinson (1976) equation of state for pure components and mixtures.
 * Includes flash calculations and phase equilibrium.
 *
 * Units: field (psia, °R, ft³/lb-mol).
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

const R_PR  = 10.7316;    // psia·ft³/(lb-mol·°R)
const SQRT2 = Math.SQRT2;

// ─── Pure-Component Parameters ────────────────────────────────────────────────

/**
 * Compute dimensionless Peng-Robinson A and B parameters for a pure component.
 *
 * kappa  = 0.37464 + 1.54226·ω − 0.26992·ω²
 * alpha  = [1 + kappa·(1 − √Tr)]²
 * a      = 0.45724 · R² · Tc² / Pc · alpha
 * b      = 0.07780 · R  · Tc  / Pc
 * A      = a·P / (R²·T²)
 * B      = b·P / (R·T)
 *
 * @param T_R      Temperature (°R)
 * @param P_psia   Pressure (psia)
 * @param Tc_R     Critical temperature (°R)
 * @param Pc_psia  Critical pressure (psia)
 * @param omega    Acentric factor (dimensionless)
 * @returns        Dimensionless {A, B} for use in the cubic Z-factor equation
 */
export function prAB(
  T_R: number,
  P_psia: number,
  Tc_R: number,
  Pc_psia: number,
  omega: number
): { A: number; B: number } {
  const kappa = 0.37464 + 1.54226 * omega - 0.26992 * omega * omega;
  const Tr    = T_R / Tc_R;
  const alpha = Math.pow(1 + kappa * (1 - Math.sqrt(Tr)), 2);
  const a     = 0.45724 * R_PR * R_PR * Tc_R * Tc_R / Pc_psia * alpha;
  const b     = 0.07780  * R_PR * Tc_R / Pc_psia;
  const A     = a * P_psia / (R_PR * R_PR * T_R * T_R);
  const B     = b * P_psia / (R_PR * T_R);
  return { A, B };
}

// ─── Cubic Solver ─────────────────────────────────────────────────────────────

/**
 * Solve the Peng-Robinson cubic equation for compressibility factor Z.
 *
 * The cubic is:
 *   Z³ − (1−B)·Z² + (A − 3B² − 2B)·Z − (AB − B² − B³) = 0
 *
 * Uses Cardano's analytical method (depressed cubic via substitution Z = t + h).
 * Returns only physically meaningful roots (Z > B).
 *
 * @param A  Dimensionless PR parameter A
 * @param B  Dimensionless PR parameter B
 * @returns  Array of real roots greater than B (1 or 3 elements)
 */
export function prCubicRoots(A: number, B: number): number[] {
  // Coefficients of Z³ + a2·Z² + a1·Z + a0 = 0
  const a2 = -(1 - B);
  const a1 =  A - 3 * B * B - 2 * B;
  const a0 = -(A * B - B * B - B * B * B);

  // Depress: Z = t + h, h = -a2/3
  const h = -a2 / 3;
  const p = a1 - a2 * a2 / 3;
  const q = 2 * a2 * a2 * a2 / 27 - a2 * a1 / 3 + a0;

  const D = (q / 2) * (q / 2) + (p / 3) * (p / 3) * (p / 3); // discriminant

  let roots: number[];

  if (D > 1e-12) {
    // One real root
    const sqrtD = Math.sqrt(D);
    const u = Math.cbrt(-q / 2 + sqrtD);
    const v = Math.cbrt(-q / 2 - sqrtD);
    roots = [u + v + h];
  } else if (D < -1e-12) {
    // Three distinct real roots — trigonometric method
    const r     = Math.sqrt(-(p / 3) * (p / 3) * (p / 3));
    const theta = Math.acos(Math.max(-1, Math.min(1, (-q / 2) / r)));
    const m     = 2 * Math.cbrt(r);
    roots = [
      m * Math.cos(theta / 3)             + h,
      m * Math.cos((theta + 2 * Math.PI) / 3) + h,
      m * Math.cos((theta + 4 * Math.PI) / 3) + h,
    ];
  } else {
    // Repeated root
    const u = Math.cbrt(-q / 2);
    roots = [2 * u + h, -u + h];
  }

  // Keep only physically meaningful roots (Z > B)
  return roots.filter(z => z > B && isFinite(z));
}

// ─── Z-Factor ─────────────────────────────────────────────────────────────────

/**
 * Peng-Robinson compressibility factors for vapor and liquid phases.
 *
 * Returns the maximum root as the vapor Z-factor and the minimum root as the
 * liquid Z-factor. When only one root exists (single phase), Zl equals Zv.
 *
 * @param T_R      Temperature (°R)
 * @param P_psia   Pressure (psia)
 * @param Tc_R     Critical temperature (°R)
 * @param Pc_psia  Critical pressure (psia)
 * @param omega    Acentric factor (dimensionless)
 * @returns        {Zv: vapor Z-factor, Zl: liquid Z-factor}
 */
export function prZFactor(
  T_R: number,
  P_psia: number,
  Tc_R: number,
  Pc_psia: number,
  omega: number
): { Zv: number; Zl: number } {
  const { A, B } = prAB(T_R, P_psia, Tc_R, Pc_psia, omega);
  const roots     = prCubicRoots(A, B);
  const Zv        = Math.max(...roots);
  const Zl        = Math.min(...roots);
  return { Zv, Zl };
}

// ─── Fugacity Coefficient ─────────────────────────────────────────────────────

/**
 * Natural log of the Peng-Robinson fugacity coefficient for a pure component.
 *
 * ln(φ) = (Z−1) − ln(Z−B) − A/(2√2·B) · ln[(Z+(1+√2)B) / (Z+(1−√2)B)]
 *
 * @param Z  Compressibility factor
 * @param A  Dimensionless PR parameter A
 * @param B  Dimensionless PR parameter B
 * @returns  ln(φ) — natural log of fugacity coefficient
 */
export function prFugacityCoefficient(Z: number, A: number, B: number): number {
  return (
    (Z - 1) -
    Math.log(Z - B) -
    (A / (2 * SQRT2 * B)) *
      Math.log((Z + (1 + SQRT2) * B) / (Z + (1 - SQRT2) * B))
  );
}

// ─── Mixture Rules ─────────────────────────────────────────────────────────────

/**
 * Peng-Robinson mixture A and B using van der Waals mixing rules.
 *
 * a_i  = 0.45724·R²·Tci²/Pci · alpha_i
 * b_i  = 0.07780·R·Tci/Pci
 * a_mix = Σ_i Σ_j yi·yj·√(ai·aj)·(1−kij)
 * b_mix = Σ_i yi·bi
 * A_mix = a_mix·P / (R²·T²)
 * B_mix = b_mix·P / (R·T)
 *
 * @param T_R         Temperature (°R)
 * @param P_psia      Pressure (psia)
 * @param Tc_R_arr    Critical temperatures for each component (°R)
 * @param Pc_psia_arr Critical pressures for each component (psia)
 * @param omega_arr   Acentric factors for each component
 * @param y_arr       Mole fractions for each component (must sum to 1)
 * @param kij_arr     Binary interaction parameters (n×n matrix), defaults to zeros
 * @returns           {A_mix, B_mix, a_i_arr, b_i_arr}
 */
export function prMixAB(
  T_R: number,
  P_psia: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  y_arr: number[],
  kij_arr?: number[][]
): { A_mix: number; B_mix: number; a_i_arr: number[]; b_i_arr: number[] } {
  const n = Tc_R_arr.length;

  const a_i_arr: number[] = [];
  const b_i_arr: number[] = [];

  for (let i = 0; i < n; i++) {
    const kappa_i = 0.37464 + 1.54226 * omega_arr[i] - 0.26992 * omega_arr[i] * omega_arr[i];
    const Tr_i    = T_R / Tc_R_arr[i];
    const alpha_i = Math.pow(1 + kappa_i * (1 - Math.sqrt(Tr_i)), 2);
    a_i_arr.push(0.45724 * R_PR * R_PR * Tc_R_arr[i] * Tc_R_arr[i] / Pc_psia_arr[i] * alpha_i);
    b_i_arr.push(0.07780 * R_PR * Tc_R_arr[i] / Pc_psia_arr[i]);
  }

  let a_mix = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const kij = kij_arr ? (kij_arr[i]?.[j] ?? 0) : 0;
      a_mix += y_arr[i] * y_arr[j] * Math.sqrt(a_i_arr[i] * a_i_arr[j]) * (1 - kij);
    }
  }

  let b_mix = 0;
  for (let i = 0; i < n; i++) {
    b_mix += y_arr[i] * b_i_arr[i];
  }

  const A_mix = a_mix * P_psia / (R_PR * R_PR * T_R * T_R);
  const B_mix = b_mix * P_psia / (R_PR * T_R);

  return { A_mix, B_mix, a_i_arr, b_i_arr };
}

// ─── Mixture Fugacity Coefficient ─────────────────────────────────────────────

/**
 * Natural log of the fugacity coefficient for component i in a PR mixture.
 *
 * Full PR departure-function expression using van der Waals mixing rules:
 *
 * ln(φ_i) = (bi/b_mix)·(Z−1) − ln(Z−B_mix)
 *           − A_mix/(2√2·B_mix) · (2·Σ_j[yj·√(ai·aj)·(1−kij)]/a_mix − bi/b_mix)
 *             · ln[(Z+(1+√2)·B_mix) / (Z+(1−√2)·B_mix)]
 *
 * @param i        Component index
 * @param Z_mix    Mixture compressibility factor (vapor or liquid)
 * @param A_mix    Dimensionless mixture A parameter
 * @param B_mix    Dimensionless mixture B parameter
 * @param a_i_arr  Dimensional attractive parameter for each component (psia·ft⁶/lb-mol²)
 * @param b_i_arr  Dimensional covolume for each component (ft³/lb-mol)
 * @param y_arr    Mole fractions for the phase being evaluated
 * @param kij_arr  Binary interaction parameters (optional)
 * @returns        ln(φ_i) — natural log of fugacity coefficient for component i in mixture
 */
function prComponentLnFugacity(
  i: number,
  Z_mix: number,
  A_mix: number,
  B_mix: number,
  a_i_arr: number[],
  b_i_arr: number[],
  y_arr: number[],
  kij_arr?: number[][]
): number {
  const n = a_i_arr.length;

  // Σ_j yj·√(ai·aj)·(1−kij) — cross-term sum for component i
  let sum_aij = 0;
  for (let j = 0; j < n; j++) {
    const kij = kij_arr ? (kij_arr[i]?.[j] ?? 0) : 0;
    sum_aij  += y_arr[j] * Math.sqrt(a_i_arr[i] * a_i_arr[j]) * (1 - kij);
  }

  // Dimensional a_mix and b_mix (needed for ratios)
  let a_mix = 0;
  for (let ii = 0; ii < n; ii++) {
    for (let jj = 0; jj < n; jj++) {
      const kij = kij_arr ? (kij_arr[ii]?.[jj] ?? 0) : 0;
      a_mix += y_arr[ii] * y_arr[jj] * Math.sqrt(a_i_arr[ii] * a_i_arr[jj]) * (1 - kij);
    }
  }

  let b_mix = 0;
  for (let j = 0; j < n; j++) b_mix += y_arr[j] * b_i_arr[j];

  const bi_over_bmix = b_i_arr[i] / b_mix;
  const aij_ratio    = 2 * sum_aij / a_mix;

  return (
    bi_over_bmix * (Z_mix - 1) -
    Math.log(Z_mix - B_mix) -
    (A_mix / (2 * SQRT2 * B_mix)) *
      (aij_ratio - bi_over_bmix) *
      Math.log((Z_mix + (1 + SQRT2) * B_mix) / (Z_mix + (1 - SQRT2) * B_mix))
  );
}

// ─── Wilson K-Values ──────────────────────────────────────────────────────────

/** Compute Wilson initial K-values: Ki = (Pci/P)·exp(5.373·(1+ωi)·(1−Tci/T)). */
function wilsonK(
  P_psia: number,
  T_R: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[]
): number[] {
  return Tc_R_arr.map((Tci, i) =>
    (Pc_psia_arr[i] / P_psia) * Math.exp(5.373 * (1 + omega_arr[i]) * (1 - Tci / T_R))
  );
}

// ─── Bubble-Point Pressure ────────────────────────────────────────────────────

/**
 * Peng-Robinson bubble-point pressure calculation at fixed temperature.
 *
 * Uses Wilson K-values as initial estimates and successive substitution.
 * Convergence criterion: |Σ(Ki·zi) − 1| < tol
 *
 * @param T_R         Temperature (°R)
 * @param Tc_R_arr    Critical temperatures (°R)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors
 * @param z_arr       Overall mole fractions (must sum to 1)
 * @param kij_arr     Binary interaction parameters (optional)
 * @returns           {Pb_psia: bubble-point pressure, K_i: equilibrium ratios}
 */
export function prBubblePoint(
  T_R: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  z_arr: number[],
  kij_arr?: number[][]
): { Pb_psia: number; K_i: number[] } {
  const MAX_ITER = 200;
  const TOL      = 1e-6;
  const n        = z_arr.length;

  // Initial pressure guess from Wilson K-values (P where sum(Ki*zi)=1)
  let P = Pc_psia_arr.reduce((s, Pc, i) => s + z_arr[i] * Pc, 0) / 5;
  let K = wilsonK(P, T_R, Tc_R_arr, Pc_psia_arr, omega_arr);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const sumKz = K.reduce((s, Ki, i) => s + Ki * z_arr[i], 0);
    if (Math.abs(sumKz - 1) < TOL) break;

    P = P * sumKz;
    K = wilsonK(P, T_R, Tc_R_arr, Pc_psia_arr, omega_arr);

    // PR fugacity-based K update every 10 iterations for stability
    if (iter > 0 && iter % 10 === 0) {
      const y_arr = K.map((Ki, i) => Ki * z_arr[i]);
      const sumY  = y_arr.reduce((s, y) => s + y, 0);
      const yNorm = y_arr.map(y => y / sumY);

      const { A_mix: Av, B_mix: Bv, a_i_arr: av_i, b_i_arr: bv_i } =
        prMixAB(T_R, P, Tc_R_arr, Pc_psia_arr, omega_arr, yNorm, kij_arr);
      const { A_mix: Al, B_mix: Bl, a_i_arr: al_i, b_i_arr: bl_i } =
        prMixAB(T_R, P, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);

      const rootsV = prCubicRoots(Av, Bv);
      const rootsL = prCubicRoots(Al, Bl);
      const Zv = Math.max(...rootsV);
      const Zl = Math.min(...rootsL);

      for (let i = 0; i < n; i++) {
        const lnPhiV = prComponentLnFugacity(i, Zv, Av, Bv, av_i, bv_i, yNorm, kij_arr);
        const lnPhiL = prComponentLnFugacity(i, Zl, Al, Bl, al_i, bl_i, z_arr, kij_arr);
        K[i] = Math.exp(lnPhiL - lnPhiV);
      }
    }
  }

  return { Pb_psia: P, K_i: K };
}

// ─── Dew-Point Pressure ───────────────────────────────────────────────────────

/**
 * Peng-Robinson dew-point pressure calculation at fixed temperature.
 *
 * Uses Wilson K-values as initial estimates and successive substitution.
 * Convergence criterion: |Σ(zi/Ki) − 1| < tol
 *
 * @param T_R         Temperature (°R)
 * @param Tc_R_arr    Critical temperatures (°R)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors
 * @param z_arr       Overall mole fractions (must sum to 1)
 * @param kij_arr     Binary interaction parameters (optional)
 * @returns           {Pd_psia: dew-point pressure, K_i: equilibrium ratios}
 */
export function prDewPoint(
  T_R: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  z_arr: number[],
  kij_arr?: number[][]
): { Pd_psia: number; K_i: number[] } {
  const MAX_ITER = 200;
  const TOL      = 1e-6;
  const n        = z_arr.length;

  let P = Pc_psia_arr.reduce((s, Pc, i) => s + z_arr[i] * Pc, 0) / 5;
  let K = wilsonK(P, T_R, Tc_R_arr, Pc_psia_arr, omega_arr);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const sumZK = K.reduce((s, Ki, i) => s + z_arr[i] / Ki, 0);
    if (Math.abs(sumZK - 1) < TOL) break;

    P = P / sumZK;
    K = wilsonK(P, T_R, Tc_R_arr, Pc_psia_arr, omega_arr);

    if (iter > 0 && iter % 10 === 0) {
      const x_arr = K.map((Ki, i) => z_arr[i] / Ki);
      const sumX  = x_arr.reduce((s, x) => s + x, 0);
      const xNorm = x_arr.map(x => x / sumX);

      const { A_mix: Av, B_mix: Bv, a_i_arr: av_i, b_i_arr: bv_i } =
        prMixAB(T_R, P, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
      const { A_mix: Al, B_mix: Bl, a_i_arr: al_i, b_i_arr: bl_i } =
        prMixAB(T_R, P, Tc_R_arr, Pc_psia_arr, omega_arr, xNorm, kij_arr);

      const rootsV = prCubicRoots(Av, Bv);
      const rootsL = prCubicRoots(Al, Bl);
      const Zv = Math.max(...rootsV);
      const Zl = Math.min(...rootsL);

      for (let i = 0; i < n; i++) {
        const lnPhiV = prComponentLnFugacity(i, Zv, Av, Bv, av_i, bv_i, z_arr, kij_arr);
        const lnPhiL = prComponentLnFugacity(i, Zl, Al, Bl, al_i, bl_i, xNorm, kij_arr);
        K[i] = Math.exp(lnPhiL - lnPhiV);
      }
    }
  }

  return { Pd_psia: P, K_i: K };
}

// ─── Rachford-Rice Flash ───────────────────────────────────────────────────────

/**
 * Solve the Rachford-Rice equation f(V) = Σ[zi·(Ki−1)/(1+V·(Ki−1))] = 0
 * via bisection over V ∈ (Vmin, Vmax) to guarantee a root bracket.
 */
function rachfordRice(K: number[], z: number[]): number {
  const eps = 1e-8;

  // Safe bounds to avoid poles
  const Vmin = 1 / (1 - Math.max(...K)) + eps;
  const Vmax = 1 / (1 - Math.min(...K)) - eps;

  const lo = Math.max(eps, Vmin);
  const hi = Math.min(1 - eps, Vmax);

  const f = (V: number) =>
    K.reduce((s, Ki, i) => s + z[i] * (Ki - 1) / (1 + V * (Ki - 1)), 0);

  let a = lo;
  let b = hi;

  // Bisection
  for (let iter = 0; iter < 100; iter++) {
    const mid  = (a + b) / 2;
    const fmid = f(mid);
    if (Math.abs(fmid) < 1e-10 || (b - a) / 2 < 1e-12) return mid;
    if (Math.sign(fmid) === Math.sign(f(a))) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

// ─── Two-Phase Flash ──────────────────────────────────────────────────────────

/**
 * Peng-Robinson two-phase flash calculation at fixed T and P.
 *
 * Algorithm:
 *  1. Wilson K-values → Rachford-Rice for initial V (vapor mole fraction).
 *  2. Compute x_i, y_i from K and V.
 *  3. Update K from PR fugacity coefficients (successive substitution).
 *  4. Repeat until max |ln(Ki_new/Ki)| < tol.
 *
 * @param T_R         Temperature (°R)
 * @param P_psia      Pressure (psia)
 * @param Tc_R_arr    Critical temperatures (°R)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors
 * @param z_arr       Overall mole fractions (must sum to 1)
 * @param kij_arr     Binary interaction parameters (optional)
 * @returns           {V_frac, x_i, y_i, Zv, Zl}
 */
export function prFlash(
  T_R: number,
  P_psia: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  z_arr: number[],
  kij_arr?: number[][]
): { V_frac: number; x_i: number[]; y_i: number[]; Zv: number; Zl: number } {
  const MAX_ITER = 200;
  const TOL      = 1e-8;
  const n        = z_arr.length;

  let K = wilsonK(P_psia, T_R, Tc_R_arr, Pc_psia_arr, omega_arr);

  // Single-phase checks using Wilson K-values
  const sumKz  = z_arr.reduce((s, zi, i) => s + K[i] * zi, 0);
  const sumZoK = z_arr.reduce((s, zi, i) => s + zi / K[i], 0);

  // Helper to compute Z-factors for a given composition
  const getZ = (comp: number[], getMax: boolean) => {
    const { A_mix, B_mix } = prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, comp, kij_arr);
    const roots = prCubicRoots(A_mix, B_mix);
    return getMax ? Math.max(...roots) : Math.min(...roots);
  };

  if (sumKz <= 1.0) {
    // All liquid (P above bubble point)
    const Zl = getZ(z_arr, false);
    const Zv = getZ(z_arr, true);
    return { V_frac: 0, x_i: z_arr.slice(), y_i: z_arr.slice(), Zv, Zl };
  }
  if (sumZoK <= 1.0) {
    // All vapor (P below dew point)
    const Zv = getZ(z_arr, true);
    const Zl = getZ(z_arr, false);
    return { V_frac: 1, x_i: z_arr.slice(), y_i: z_arr.slice(), Zv, Zl };
  }

  let V     = 0.5;
  let x_i   = z_arr.slice();
  let y_i   = z_arr.slice();

  for (let iter = 0; iter < MAX_ITER; iter++) {
    V   = rachfordRice(K, z_arr);
    // Clamp V to [0,1] for numerical stability
    V   = Math.max(0, Math.min(1, V));
    x_i = z_arr.map((zi, i) => zi / (1 + V * (K[i] - 1)));
    y_i = x_i.map((xi, i) => K[i] * xi);

    // Normalize
    const sumX = x_i.reduce((s, x) => s + x, 0);
    const sumY = y_i.reduce((s, y) => s + y, 0);
    x_i = x_i.map(x => x / sumX);
    y_i = y_i.map(y => y / sumY);

    // PR Z-factors and mixture parameters for each phase
    const { A_mix: Av, B_mix: Bv, a_i_arr: av_i, b_i_arr: bv_i } =
      prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, y_i, kij_arr);
    const { A_mix: Al, B_mix: Bl, a_i_arr: al_i, b_i_arr: bl_i } =
      prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, x_i, kij_arr);

    const rootsV = prCubicRoots(Av, Bv);
    const rootsL = prCubicRoots(Al, Bl);
    const Zv_cur = Math.max(...rootsV);
    const Zl_cur = Math.min(...rootsL);

    // Fugacity-based K update using proper mixture departure functions
    const K_new: number[] = [];
    let maxDelta = 0;

    for (let i = 0; i < n; i++) {
      const lnPhiV = prComponentLnFugacity(i, Zv_cur, Av, Bv, av_i, bv_i, y_i, kij_arr);
      const lnPhiL = prComponentLnFugacity(i, Zl_cur, Al, Bl, al_i, bl_i, x_i, kij_arr);
      const Ki_new = Math.exp(lnPhiL - lnPhiV);
      maxDelta     = Math.max(maxDelta, Math.abs(Math.log(Ki_new / K[i])));
      K_new.push(Ki_new);
    }

    K = K_new;
    if (maxDelta < TOL) {
      return { V_frac: V, x_i, y_i, Zv: Zv_cur, Zl: Zl_cur };
    }
  }

  // Return best available result after max iterations
  const { A_mix: Av_f, B_mix: Bv_f } =
    prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, y_i, kij_arr);
  const { A_mix: Al_f, B_mix: Bl_f } =
    prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, x_i, kij_arr);
  return {
    V_frac: V,
    x_i,
    y_i,
    Zv: Math.max(...prCubicRoots(Av_f, Bv_f)),
    Zl: Math.min(...prCubicRoots(Al_f, Bl_f)),
  };
}
