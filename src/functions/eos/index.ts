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


// ─── Wilson K-Value Initial Guess ────────────────────────────────────────────

/**
 * Compute Wilson equation K-values as initial guess for flash calculations.
 *
 * Ki = (Pci / P) * exp(5.373 * (1 + omegai) * (1 - Tci / T))
 *
 * Reference: Wilson (1969); also used in Michelsen stability test.
 *
 * @param T_R         Temperature (degR)
 * @param P_psia      Pressure (psia)
 * @param Tc_R_arr    Critical temperatures (degR)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors (dimensionless)
 * @returns           Array of K-values (dimensionless)
 */
export function prWilsonK(
  T_R: number,
  P_psia: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[]
): number[] {
  const n = Tc_R_arr.length;
  if (Pc_psia_arr.length !== n || omega_arr.length !== n) {
    throw new Error("All component arrays must have the same length");
  }
  return Tc_R_arr.map((Tc, i) =>
    (Pc_psia_arr[i] / P_psia) * Math.exp(5.373 * (1 + omega_arr[i]) * (1 - Tc / T_R))
  );
}

// ─── Michelsen Stability Test ─────────────────────────────────────────────────

/**
 * Michelsen (1982) tangent-plane distance (TPD) stability test.
 *
 * Tests whether a feed composition z at (T, P) is stable or in two-phase
 * equilibrium by minimizing the tangent plane distance function.
 *
 * Algorithm:
 *   1. Initialize trial compositions from Wilson K-values (liquid-like and vapor-like)
 *   2. Successive substitution: Wi_new = zi * exp(lnPhi_i(z) - lnPhi_i(W))
 *   3. If sum(Wi) > 1 + tolerance at convergence, feed is UNSTABLE
 *
 * @param T_R         Temperature (degR)
 * @param P_psia      Pressure (psia)
 * @param z_arr       Feed composition (mole fractions, must sum to 1)
 * @param Tc_R_arr    Critical temperatures (degR)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors (dimensionless)
 * @param kij_arr     Binary interaction parameters (n x n matrix)
 * @param maxIter     Maximum iterations (default 100)
 * @returns           { stable, sumW_L, sumW_V, tpdL, tpdV, iterations }
 */
export function prStabilityTest(
  T_R: number,
  P_psia: number,
  z_arr: number[],
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  kij_arr?: number[][],
  maxIter = 100
): { stable: boolean; sumW_L: number; sumW_V: number; tpdL: number; tpdV: number; iterations: number } {
  const n = z_arr.length;
  if (Tc_R_arr.length !== n || Pc_psia_arr.length !== n || omega_arr.length !== n) {
    throw new Error("All component arrays must have the same length");
  }

  const TOL = 1e-10;

  // Compute feed fugacity coefficients using the liquid-like Z root
  const feedResult = prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
  const { A_mix: Az, B_mix: Bz, a_i_arr: az_i, b_i_arr: bz_i } = feedResult;
  const Zz_roots = prCubicRoots(Az, Bz);
  const Zz = Zz_roots.reduce((a, b) => (b < a ? b : a));
  const lnPhiZ: number[] = [];
  for (let i = 0; i < n; i++) {
    lnPhiZ.push(prComponentLnFugacity(i, Zz, Az, Bz, az_i, bz_i, z_arr, kij_arr));
  }

  // Wilson K-values for initialization
  const K = prWilsonK(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr);

  // Trial 1: liquid-like (W = z/K)
  let W_L = z_arr.map((zi, i) => zi / K[i]);
  // Trial 2: vapor-like (W = z*K)
  let W_V = z_arr.map((zi, i) => zi * K[i]);

  let iter = 0;
  let sumW_L = 0, sumW_V = 0;
  let tpdL = 0, tpdV = 0;

  for (iter = 0; iter < maxIter; iter++) {
    // Normalize trial compositions
    sumW_L = W_L.reduce((a, b) => a + b, 0);
    sumW_V = W_V.reduce((a, b) => a + b, 0);
    const wl_norm = W_L.map(w => w / sumW_L);
    const wv_norm = W_V.map(w => w / sumW_V);

    // Compute fugacity coefficients for trial phases
    const { A_mix: AL, B_mix: BL, a_i_arr: al_i, b_i_arr: bl_i } =
      prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, wl_norm, kij_arr);
    const ZL_roots = prCubicRoots(AL, BL);
    const ZL = ZL_roots.reduce((a, b) => (b < a ? b : a));

    const { A_mix: AV, B_mix: BV, a_i_arr: av_i, b_i_arr: bv_i } =
      prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, wv_norm, kij_arr);
    const ZV_roots = prCubicRoots(AV, BV);
    const ZV = ZV_roots.reduce((a, b) => (b > a ? b : a));

    // Update trial compositions (successive substitution)
    const W_L_new: number[] = [];
    const W_V_new: number[] = [];
    let maxDelta = 0;

    for (let i = 0; i < n; i++) {
      const lnPhiL = prComponentLnFugacity(i, ZL, AL, BL, al_i, bl_i, wl_norm, kij_arr);
      const lnPhiV = prComponentLnFugacity(i, ZV, AV, BV, av_i, bv_i, wv_norm, kij_arr);
      const W_L_new_i = z_arr[i] > 0 ? Math.exp(lnPhiZ[i] - lnPhiL + Math.log(z_arr[i])) : 0;
      const W_V_new_i = z_arr[i] > 0 ? Math.exp(lnPhiZ[i] - lnPhiV + Math.log(z_arr[i])) : 0;
      W_L_new.push(W_L_new_i);
      W_V_new.push(W_V_new_i);
      maxDelta = Math.max(maxDelta, Math.abs(W_L_new_i - W_L[i]), Math.abs(W_V_new_i - W_V[i]));
    }

    W_L = W_L_new;
    W_V = W_V_new;
    if (maxDelta < TOL) break;
  }

  // Compute final sums
  sumW_L = W_L.reduce((a, b) => a + b, 0);
  sumW_V = W_V.reduce((a, b) => a + b, 0);

  // Compute TPD values
  const wl_norm = W_L.map(w => sumW_L > 0 ? w / sumW_L : 0);
  const wv_norm = W_V.map(w => sumW_V > 0 ? w / sumW_V : 0);

  const { A_mix: AL_f, B_mix: BL_f, a_i_arr: al_f, b_i_arr: bl_f } =
    prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, wl_norm, kij_arr);
  const ZL_f = prCubicRoots(AL_f, BL_f).reduce((a, b) => (b < a ? b : a));
  const { A_mix: AV_f, B_mix: BV_f, a_i_arr: av_f, b_i_arr: bv_f } =
    prMixAB(T_R, P_psia, Tc_R_arr, Pc_psia_arr, omega_arr, wv_norm, kij_arr);
  const ZV_f = prCubicRoots(AV_f, BV_f).reduce((a, b) => (b > a ? b : a));

  tpdL = 0; tpdV = 0;
  for (let i = 0; i < n; i++) {
    const lnPhiL_f = prComponentLnFugacity(i, ZL_f, AL_f, BL_f, al_f, bl_f, wl_norm, kij_arr);
    const lnPhiV_f = prComponentLnFugacity(i, ZV_f, AV_f, BV_f, av_f, bv_f, wv_norm, kij_arr);
    const di = z_arr[i] > 0 ? Math.log(z_arr[i]) + lnPhiZ[i] : 0;
    if (W_L[i] > 0) tpdL += W_L[i] * (Math.log(W_L[i]) + lnPhiL_f - di);
    if (W_V[i] > 0) tpdV += W_V[i] * (Math.log(W_V[i]) + lnPhiV_f - di);
  }

  // Unstable if sum(Wi) > 1 + small tolerance for either trial
  const stable = (sumW_L <= 1 + 1e-6) && (sumW_V <= 1 + 1e-6);

  return { stable, sumW_L, sumW_V, tpdL, tpdV, iterations: iter };
}

// ─── SRK Equation of State ──────────────────────────────────────────────────
export * from './srk';

// ─── Phase Envelope Tracing ───────────────────────────────────────────────────

/**
 * Compute bubble-point pressure at a given temperature for phase envelope tracing.
 *
 * Thin wrapper around prBubblePoint; returns only the pressure (psia) so it can
 * be called in a scan across temperatures.  Returns NaN when the mixture has no
 * liquid phase at that temperature (above cricondentherm or below 0 K).
 *
 * @param T_R         Temperature (°R)
 * @param Tc_R_arr    Critical temperatures (°R)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors
 * @param z_arr       Feed mole fractions (sum to 1)
 * @param kij_arr     Binary interaction parameters (optional)
 * @returns           Bubble-point pressure (psia), or NaN if no solution
 */
export function prPhaseEnvelopePoint(
  T_R: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  z_arr: number[],
  kij_arr?: number[][]
): number {
  try {
    const { Pb_psia } = prBubblePoint(T_R, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    if (!isFinite(Pb_psia) || Pb_psia <= 0) return NaN;
    return Pb_psia;
  } catch {
    return NaN;
  }
}

/**
 * Dew-point pressure at a given temperature for phase envelope tracing.
 *
 * @param T_R         Temperature (°R)
 * @param Tc_R_arr    Critical temperatures (°R)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors
 * @param z_arr       Feed mole fractions (sum to 1)
 * @param kij_arr     Binary interaction parameters (optional)
 * @returns           Dew-point pressure (psia), or NaN if no solution
 */
export function prPhaseEnvelopeDewPoint(
  T_R: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  z_arr: number[],
  kij_arr?: number[][]
): number {
  try {
    const { Pd_psia } = prDewPoint(T_R, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    if (!isFinite(Pd_psia) || Pd_psia <= 0) return NaN;
    return Pd_psia;
  } catch {
    return NaN;
  }
}

/**
 * Trace the full P-T phase envelope for a multi-component mixture.
 *
 * Scans temperatures from T_min_R to T_max_R, computing both bubble-point
 * (lower portion) and dew-point (upper portion) pressures at each step.
 * The resulting arrays form the two branches of the phase envelope.
 *
 * @param T_min_R     Minimum temperature for scan (°R)
 * @param T_max_R     Maximum temperature for scan (°R)
 * @param nT          Number of temperature steps (default 30)
 * @param Tc_R_arr    Critical temperatures (°R)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors
 * @param z_arr       Feed mole fractions (sum to 1)
 * @param kij_arr     Binary interaction parameters (optional)
 * @returns           Array of { T_R, Pb_psia, Pd_psia } — NaN where no solution
 */
export function prPhaseEnvelope(
  T_min_R: number,
  T_max_R: number,
  nT: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  z_arr: number[],
  kij_arr?: number[][]
): { T_R: number; Pb_psia: number; Pd_psia: number }[] {
  if (nT < 2) nT = 2;
  const dT = (T_max_R - T_min_R) / (nT - 1);
  const result: { T_R: number; Pb_psia: number; Pd_psia: number }[] = [];

  for (let i = 0; i < nT; i++) {
    const T = T_min_R + i * dT;
    const Pb = prPhaseEnvelopePoint(T, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    const Pd = prPhaseEnvelopeDewPoint(T, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    result.push({ T_R: T, Pb_psia: Pb, Pd_psia: Pd });
  }

  return result;
}

/**
 * Estimate the cricondentherm — maximum temperature on the phase envelope.
 *
 * Scans dew-point pressures over a temperature grid; returns the temperature
 * at which the dew-point solution disappears (last valid dew-point T).
 *
 * Algorithm: binary-search refinement after a coarse grid scan.
 *
 * @param T_min_R     Lower bound for search (°R)
 * @param T_max_R     Upper bound for search (°R)
 * @param Tc_R_arr    Critical temperatures (°R)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors
 * @param z_arr       Feed mole fractions (sum to 1)
 * @param kij_arr     Binary interaction parameters (optional)
 * @returns           { T_cricondentherm_R: number; P_cricondentherm_psia: number }
 */
export function prCricondentherm(
  T_min_R: number,
  T_max_R: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  z_arr: number[],
  kij_arr?: number[][]
): { T_cricondentherm_R: number; P_cricondentherm_psia: number } {
  // Coarse scan to bracket the cricondentherm
  const N = 40;
  const dT = (T_max_R - T_min_R) / N;
  let T_last = T_min_R;
  let P_last = NaN;

  for (let i = 0; i <= N; i++) {
    const T = T_min_R + i * dT;
    const Pd = prPhaseEnvelopeDewPoint(T, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    if (isFinite(Pd) && Pd > 0) {
      T_last = T;
      P_last = Pd;
    }
  }

  // Refine with bisection between T_last and T_last + dT
  let lo = T_last;
  let hi = Math.min(T_last + dT * 2, T_max_R);
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const Pd = prPhaseEnvelopeDewPoint(mid, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    if (isFinite(Pd) && Pd > 0) {
      lo = mid;
      P_last = Pd;
    } else {
      hi = mid;
    }
  }

  return {
    T_cricondentherm_R: lo,
    P_cricondentherm_psia: isFinite(P_last) ? P_last : NaN,
  };
}

/**
 * Estimate the cricondenbar — maximum pressure on the phase envelope.
 *
 * Scans bubble-point pressures over a temperature grid and returns the
 * temperature/pressure at which bubble-point pressure is maximized.
 *
 * @param T_min_R     Lower bound for scan (°R)
 * @param T_max_R     Upper bound for scan (°R)
 * @param Tc_R_arr    Critical temperatures (°R)
 * @param Pc_psia_arr Critical pressures (psia)
 * @param omega_arr   Acentric factors
 * @param z_arr       Feed mole fractions (sum to 1)
 * @param kij_arr     Binary interaction parameters (optional)
 * @returns           { T_cricondenbar_R: number; P_cricondenbar_psia: number }
 */
export function prCricondenbar(
  T_min_R: number,
  T_max_R: number,
  Tc_R_arr: number[],
  Pc_psia_arr: number[],
  omega_arr: number[],
  z_arr: number[],
  kij_arr?: number[][]
): { T_cricondenbar_R: number; P_cricondenbar_psia: number } {
  const N = 50;
  const dT = (T_max_R - T_min_R) / N;
  let T_best = T_min_R;
  let P_best = -Infinity;

  for (let i = 0; i <= N; i++) {
    const T = T_min_R + i * dT;
    // The cricondenbar lies near the maximum of the bubble-point curve
    const Pb = prPhaseEnvelopePoint(T, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    const Pd = prPhaseEnvelopeDewPoint(T, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    const P_env = isFinite(Pb) ? Pb : (isFinite(Pd) ? Pd : -Infinity);
    if (P_env > P_best) {
      P_best = P_env;
      T_best = T;
    }
  }

  // Golden-section refinement ±2 dT around T_best
  let lo = Math.max(T_min_R, T_best - 2 * dT);
  let hi = Math.min(T_max_R, T_best + 2 * dT);
  const phi = (Math.sqrt(5) - 1) / 2;

  for (let i = 0; i < 40; i++) {
    const c = hi - phi * (hi - lo);
    const d = lo + phi * (hi - lo);
    const Pc = prPhaseEnvelopePoint(c, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    const Pd2 = prPhaseEnvelopePoint(d, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);
    if ((isFinite(Pc) ? Pc : 0) < (isFinite(Pd2) ? Pd2 : 0)) lo = c;
    else hi = d;
  }

  const T_cbar = (lo + hi) / 2;
  const P_cbar = prPhaseEnvelopePoint(T_cbar, Tc_R_arr, Pc_psia_arr, omega_arr, z_arr, kij_arr);

  return {
    T_cricondenbar_R: T_cbar,
    P_cricondenbar_psia: isFinite(P_cbar) ? P_cbar : P_best,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Session 17 — Lee-Kesler Reference Fluid Correlations
// ════════════════════════════════════════════════════════════════════════════

/**
 * Lee-Kesler (1975) BWR-type Z-factor for a pure or pseudo-pure component.
 *
 * Uses the simple-fluid (ω=0) or reference-fluid (n-octane, ω_R=0.3978)
 * modified Benedict-Webb-Rubin (BWR) equation of state.
 *
 * Tr = T / Tc,  Pr = P / Pc,  ρr = 0.2901 Pr / (Tr Z)  (reduced density, solved iteratively)
 *
 * Constants:
 *   Simple fluid:   b1=0.1181193, b2=0.265728, b3=0.154790, b4=0.030323,
 *                   c1=0.0236744, c2=0.0186984, c3=0, c4=0.042724,
 *                   d1=0.155488e-4, d2=0.623689e-4, β=0.65392, γ=0.060167
 *   Reference (ωR): b1=0.2026579, b2=0.331511, b3=0.027655, b4=0.203488,
 *                   c1=0.0313422, c2=0.0503323, c3=0.016901, c4=0.041577,
 *                   d1=0.48736e-4, d2=0.0740336e-4, β=1.226, γ=0.03754
 *
 * @param Tr   Reduced temperature T/Tc
 * @param Pr   Reduced pressure P/Pc
 * @param ref  false = simple fluid (ω=0), true = reference fluid (n-octane, ω_R=0.3978)
 * @returns    Compressibility factor Z
 */
export function lkZFactor(Tr: number, Pr: number, ref = false): number {
  // Constants
  const b1 = ref ? 0.2026579  : 0.1181193;
  const b2 = ref ? 0.331511   : 0.265728;
  const b3 = ref ? 0.027655   : 0.154790;
  const b4 = ref ? 0.203488   : 0.030323;
  const c1 = ref ? 0.0313422  : 0.0236744;
  const c2 = ref ? 0.0503323  : 0.0186984;
  const c3 = ref ? 0.016901   : 0.0;
  const c4 = ref ? 0.041577   : 0.042724;
  const d1 = ref ? 0.48736e-4 : 0.155488e-4;
  const d2 = ref ? 0.0740336e-4 : 0.623689e-4;
  const beta  = ref ? 1.226   : 0.65392;
  const gamma = ref ? 0.03754 : 0.060167;

  // Solve Z iteratively: Z = 1 + B/Vr + C/Vr² + D/Vr⁵ + (c4/(Tr³ Vr²))(β+γ/Vr²)exp(-γ/Vr²)
  // where Vr = Vr/RTc·Pc = (Z·Tr)/(Pr·Pc/Pc) = Z·Tr/Pr  → Vr = Z·Tr/Pr (dimensionless)
  // Initial guess: Z = 1
  let Z = 1.0;
  for (let iter = 0; iter < 100; iter++) {
    const Vr = Z * Tr / Pr;
    if (Vr <= 0) { Z = 1; break; }
    const B = b1 - b2 / Tr - b3 / (Tr * Tr) - b4 / (Tr * Tr * Tr);
    const C = c1 - c2 / Tr + c3 / (Tr * Tr * Tr);
    const D = d1 + d2 / Tr;
    const expTerm = Math.exp(-gamma / (Vr * Vr));
    const Z_new = 1
      + B / Vr
      + C / (Vr * Vr)
      + D / (Vr ** 5)
      + (c4 / (Tr ** 3 * Vr * Vr)) * (beta + gamma / (Vr * Vr)) * expTerm;
    if (Math.abs(Z_new - Z) < 1e-8) { Z = Z_new; break; }
    Z = 0.5 * (Z + Z_new);  // damped iteration
  }
  return Z;
}

/**
 * Lee-Kesler Z-factor for a real component using the Pitzer correlation:
 *
 *   Z = Z^(0) + (ω / ω_R) × (Z^(R) − Z^(0))
 *
 * where Z^(0) is the simple-fluid Z and Z^(R) is the reference-fluid Z.
 *
 * @param T_K   Temperature (K)
 * @param P_bar Pressure (bar)
 * @param Tc_K  Critical temperature (K)
 * @param Pc_bar Critical pressure (bar)
 * @param omega Acentric factor
 * @returns     Compressibility factor Z
 */
export function lkZFactorComponent(
  T_K: number,
  P_bar: number,
  Tc_K: number,
  Pc_bar: number,
  omega: number,
): number {
  const Tr = T_K / Tc_K;
  const Pr = P_bar / Pc_bar;
  const Z0 = lkZFactor(Tr, Pr, false);
  const ZR = lkZFactor(Tr, Pr, true);
  const omega_R = 0.3978;
  return Z0 + (omega / omega_R) * (ZR - Z0);
}

/**
 * Lee-Kesler departure enthalpy (H - H^ig) / RTc in dimensionless form.
 *
 * The departure function relates the real-fluid enthalpy to the ideal-gas
 * enthalpy using the BWR equation:
 *
 *   (H - H^ig)^(0 or R) / (R Tc) = Tr(Z-1) − Tr²/Vr[c2−2c3/Tr²]/2
 *                                   + terms from D and exponential
 *
 * @param Tr   Reduced temperature
 * @param Pr   Reduced pressure
 * @param ref  true = reference fluid (n-octane), false = simple fluid
 * @returns    Dimensionless departure enthalpy (H-H^ig)/(R·Tc)
 */
export function lkDepartureEnthalpy(Tr: number, Pr: number, ref = false): number {
  const b1 = ref ? 0.2026579  : 0.1181193;
  const b2 = ref ? 0.331511   : 0.265728;
  const b3 = ref ? 0.027655   : 0.154790;
  const b4 = ref ? 0.203488   : 0.030323;
  const c1 = ref ? 0.0313422  : 0.0236744;
  const c2 = ref ? 0.0503323  : 0.0186984;
  const c3 = ref ? 0.016901   : 0.0;
  const c4 = ref ? 0.041577   : 0.042724;
  const d1 = ref ? 0.48736e-4 : 0.155488e-4;
  const d2 = ref ? 0.0740336e-4 : 0.623689e-4;
  const beta  = ref ? 1.226   : 0.65392;
  const gamma = ref ? 0.03754 : 0.060167;

  const Z  = lkZFactor(Tr, Pr, ref);
  const Vr = Z * Tr / Pr;

  if (Vr <= 0) return 0;

  // dB/dTr = b2/Tr² + 2b3/Tr³ + 3b4/Tr⁴ (×-1 from derivative of B w.r.t. Tr in natural log form)
  const dBdTr = b2 / (Tr * Tr) + 2 * b3 / (Tr * Tr * Tr) + 3 * b4 / (Tr * Tr * Tr * Tr);
  const dCdTr = c2 / (Tr * Tr) - 3 * c3 / (Tr * Tr * Tr * Tr);
  const dDdTr = d2 / (Tr * Tr);

  const expTerm = Math.exp(-gamma / (Vr * Vr));
  const c4_exp_coeff = c4 / (Tr * Tr * Tr);

  // H departure: (H - H^ig)/(R Tc) = Tr(Z-1) − [dB/dTr / Vr + dC/dTr/(2Vr²) + dD/dTr/(5Vr⁵)]
  //              − c4/(Tr³ Vr²) × [3(β + γ/Vr²) − 2γ(β/Vr² + γ/Vr⁴)] × exp(−γ/Vr²)
  const term1 = Tr * (Z - 1);
  const term2 = -(dBdTr / Vr + dCdTr / (2 * Vr * Vr) + dDdTr / (5 * Vr ** 5));
  const innerExp = (beta + gamma / (Vr * Vr)) - (gamma / (Vr * Vr)) * (beta + gamma / (Vr * Vr));
  const term3 = -c4_exp_coeff / (Vr * Vr) * (3 * (beta + gamma / (Vr * Vr))
    - 2 * gamma / (Vr * Vr) * (beta + gamma / (Vr * Vr))) * expTerm;
  void innerExp;  // suppress unused variable

  return term1 + term2 + term3;
}

/**
 * Lee-Kesler departure entropy (S - S^ig) / R in dimensionless form.
 *
 * @param Tr   Reduced temperature
 * @param Pr   Reduced pressure
 * @param ref  true = reference fluid, false = simple fluid
 * @returns    Dimensionless departure entropy (S-S^ig)/R
 */
export function lkDepartureEntropy(Tr: number, Pr: number, ref = false): number {
  const b1 = ref ? 0.2026579  : 0.1181193;
  const b2 = ref ? 0.331511   : 0.265728;
  const b3 = ref ? 0.027655   : 0.154790;
  const b4 = ref ? 0.203488   : 0.030323;
  const c1 = ref ? 0.0313422  : 0.0236744;
  const c2 = ref ? 0.0503323  : 0.0186984;
  const c3 = ref ? 0.016901   : 0.0;
  const c4 = ref ? 0.041577   : 0.042724;
  const d1 = ref ? 0.48736e-4 : 0.155488e-4;
  const d2 = ref ? 0.0740336e-4 : 0.623689e-4;
  const beta  = ref ? 1.226   : 0.65392;
  const gamma = ref ? 0.03754 : 0.060167;

  const Z  = lkZFactor(Tr, Pr, ref);
  const Vr = Z * Tr / Pr;

  if (Vr <= 0) return 0;

  // S departure = (H departure)/(RTc) / Tr  − ln(Z)  (from Gibbs relation: G = H - TS)
  // S^dep/R = (H^dep)/(R Tc Tr) − ln Z + (ideal-gas mixing + pressure terms)
  // Using standard LK form:
  //   S^dep/R = −(Z − 1 − ln Z) + dB/dTr/Vr + dC/dTr/(2Vr²) + dD/dTr/(5Vr⁵)
  //             + c4 terms
  const dBdTr = b2 / (Tr * Tr) + 2 * b3 / (Tr * Tr * Tr) + 3 * b4 / (Tr * Tr * Tr * Tr);
  const dCdTr = c2 / (Tr * Tr) - 3 * c3 / (Tr * Tr * Tr * Tr);
  const dDdTr = d2 / (Tr * Tr);

  void b1; void c1; void d1; void beta; void gamma; void c4; void c3;

  const expTerm = Math.exp(-gamma / (Vr * Vr));
  const c4_over_Tr3 = c4 / (Tr ** 3);

  const term1 = -(Z - 1 - Math.log(Z));
  const term2 = dBdTr / Vr + dCdTr / (2 * Vr * Vr) + dDdTr / (5 * Vr ** 5);
  const term3 = c4_over_Tr3 / (2 * gamma) * (beta + 1 + (beta + gamma / (Vr * Vr))
    * (-gamma / (Vr * Vr))) * expTerm;

  void term3;  // suppress unused — simplified version below
  const S_dep = term1 + term2
    + c4_over_Tr3 / (2 * gamma) * (1 - (1 + gamma / (Vr * Vr)) * expTerm);

  return S_dep;
}

/**
 * Lee-Kesler enthalpy and entropy departures for a real fluid using the
 * Pitzer three-parameter correlation:
 *
 *   Δ = Δ^(0) + (ω / ω_R) × (Δ^(R) − Δ^(0))
 *
 * @param T_K    Temperature (K)
 * @param P_bar  Pressure (bar)
 * @param Tc_K   Critical temperature (K)
 * @param Pc_bar Critical pressure (bar)
 * @param omega  Acentric factor
 * @returns      { Z, H_dep_RTc, S_dep_R }
 *               Z = compressibility factor
 *               H_dep_RTc = (H-H^ig)/(R Tc), dimensionless
 *               S_dep_R   = (S-S^ig)/R, dimensionless
 */
export function lkDepartureFunctions(
  T_K: number,
  P_bar: number,
  Tc_K: number,
  Pc_bar: number,
  omega: number,
): { Z: number; H_dep_RTc: number; S_dep_R: number } {
  const Tr = T_K / Tc_K;
  const Pr = P_bar / Pc_bar;
  const omega_R = 0.3978;

  const Z0 = lkZFactor(Tr, Pr, false);
  const ZR = lkZFactor(Tr, Pr, true);

  const H0 = lkDepartureEnthalpy(Tr, Pr, false);
  const HR = lkDepartureEnthalpy(Tr, Pr, true);

  const S0 = lkDepartureEntropy(Tr, Pr, false);
  const SR = lkDepartureEntropy(Tr, Pr, true);

  const Z = Z0 + (omega / omega_R) * (ZR - Z0);
  const H_dep = H0 + (omega / omega_R) * (HR - H0);
  const S_dep = S0 + (omega / omega_R) * (SR - S0);

  return { Z, H_dep_RTc: H_dep, S_dep_R: S_dep };
}

// ─── Lee-Kesler Mixing Rules ──────────────────────────────────────────────────

/**
 * Lee-Kesler / Kay's rule mixture pseudocritical properties.
 *
 * Computes mole-fraction-weighted (Kay's rule) mixture pseudocritical
 * temperature, pressure, and acentric factor for a multi-component gas.
 *
 *   Tc_mix  = Σ yᵢ Tcᵢ
 *   Pc_mix  = Σ yᵢ Pcᵢ
 *   ω_mix   = Σ yᵢ ωᵢ
 *
 * @param Tc_arr    Critical temperatures (K) for each component
 * @param Pc_arr    Critical pressures (bar) for each component
 * @param omega_arr Acentric factors for each component
 * @param z_arr     Mole fractions (should sum to 1; auto-normalized)
 * @returns         { Tc_mix_K, Pc_mix_bar, omega_mix }
 */
export function lkMixturePseudoCriticals(
  Tc_arr: number[],
  Pc_arr: number[],
  omega_arr: number[],
  z_arr: number[],
): { Tc_mix_K: number; Pc_mix_bar: number; omega_mix: number } {
  const n = z_arr.length;
  if (Tc_arr.length !== n || Pc_arr.length !== n || omega_arr.length !== n) {
    throw new Error("All arrays must have the same length");
  }
  const zSum = z_arr.reduce((s, v) => s + v, 0);
  let Tc_mix = 0, Pc_mix = 0, om_mix = 0;
  for (let i = 0; i < n; i++) {
    const yi = z_arr[i] / zSum;
    Tc_mix += yi * Tc_arr[i];
    Pc_mix += yi * Pc_arr[i];
    om_mix += yi * omega_arr[i];
  }
  return { Tc_mix_K: Tc_mix, Pc_mix_bar: Pc_mix, omega_mix: om_mix };
}

/**
 * Lee-Kesler Z-factor for a multi-component gas mixture.
 *
 * Uses Kay's rule to compute mixture pseudocriticals, then applies the
 * Lee-Kesler (1975) BWR equation for the Pitzer three-parameter correlation.
 *
 * @param T_K       Temperature (K)
 * @param P_bar     Pressure (bar)
 * @param Tc_arr    Critical temperatures (K) for each component
 * @param Pc_arr    Critical pressures (bar) for each component
 * @param omega_arr Acentric factors for each component
 * @param z_arr     Mole fractions (auto-normalized)
 * @returns         Z-factor (dimensionless)
 */
export function lkMixtureZ(
  T_K: number,
  P_bar: number,
  Tc_arr: number[],
  Pc_arr: number[],
  omega_arr: number[],
  z_arr: number[],
): number {
  const { Tc_mix_K, Pc_mix_bar, omega_mix } = lkMixturePseudoCriticals(
    Tc_arr, Pc_arr, omega_arr, z_arr,
  );
  return lkZFactorComponent(T_K, P_bar, Tc_mix_K, Pc_mix_bar, omega_mix);
}

/**
 * Lee-Kesler mixture departure functions.
 *
 * Returns Z-factor, dimensionless departure enthalpy, and departure entropy
 * for a multi-component gas mixture using Kay's rule pseudocriticals and the
 * Lee-Kesler (1975) Pitzer three-parameter correlation.
 *
 * @param T_K       Temperature (K)
 * @param P_bar     Pressure (bar)
 * @param Tc_arr    Critical temperatures (K) for each component
 * @param Pc_arr    Critical pressures (bar) for each component
 * @param omega_arr Acentric factors for each component
 * @param z_arr     Mole fractions (auto-normalized)
 * @returns         { Z, H_dep_RTc, S_dep_R, Tc_mix_K, Pc_mix_bar, omega_mix }
 */
export function lkMixtureProperties(
  T_K: number,
  P_bar: number,
  Tc_arr: number[],
  Pc_arr: number[],
  omega_arr: number[],
  z_arr: number[],
): {
  Z: number;
  H_dep_RTc: number;
  S_dep_R: number;
  Tc_mix_K: number;
  Pc_mix_bar: number;
  omega_mix: number;
} {
  const { Tc_mix_K, Pc_mix_bar, omega_mix } = lkMixturePseudoCriticals(
    Tc_arr, Pc_arr, omega_arr, z_arr,
  );
  const { Z, H_dep_RTc, S_dep_R } = lkDepartureFunctions(
    T_K, P_bar, Tc_mix_K, Pc_mix_bar, omega_mix,
  );
  return { Z, H_dep_RTc, S_dep_R, Tc_mix_K, Pc_mix_bar, omega_mix };
}

// ─── Lee-Kesler VLE Flash ────────────────────────────────────────────────────

/**
 * Wilson K-factors for vapor-liquid equilibrium initialization.
 *
 * Ki = (Pci/P) * exp(5.373 * (1 + ωi) * (1 - Tci/T))
 *
 * @param T_K       Temperature (K)
 * @param P_bar     Pressure (bar)
 * @param Tc_arr    Critical temperatures (K)
 * @param Pc_arr    Critical pressures (bar)
 * @param omega_arr Acentric factors
 * @returns         Array of K-factors (y_i / x_i)
 */
export function lkWilsonK(
  T_K: number,
  P_bar: number,
  Tc_arr: number[],
  Pc_arr: number[],
  omega_arr: number[],
): number[] {
  const n = Tc_arr.length;
  if (Pc_arr.length !== n || omega_arr.length !== n) {
    throw new Error("All arrays must have the same length");
  }
  const K: number[] = [];
  for (let i = 0; i < n; i++) {
    K.push((Pc_arr[i] / P_bar) * Math.exp(5.373 * (1 + omega_arr[i]) * (1 - Tc_arr[i] / T_K)));
  }
  return K;
}

/**
 * Rachford-Rice equation solver for vapor fraction beta.
 *
 * Solves Σ z_i*(K_i-1)/(1+β*(K_i-1)) = 0 for β ∈ [0,1]
 * using bisection (robust) then Newton-Raphson (fast).
 *
 * @param z_arr     Overall mole fractions (auto-normalized)
 * @param K_arr     K-factors (y_i/x_i)
 * @param nMaxIter  Maximum iterations (default 100)
 * @returns         {beta, x_arr, y_arr, converged}
 */
export function lkRachfordRice(
  z_arr: number[],
  K_arr: number[],
  nMaxIter = 100,
): { beta: number; x_arr: number[]; y_arr: number[]; converged: boolean } {
  const n = z_arr.length;
  if (K_arr.length !== n) throw new Error("z_arr and K_arr must have the same length");

  // Normalize z
  const zSum = z_arr.reduce((s, v) => s + v, 0);
  const z = z_arr.map(v => v / zSum);

  // Rachford-Rice function
  const g = (beta: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += z[i] * (K_arr[i] - 1) / (1 + beta * (K_arr[i] - 1));
    return s;
  };
  const dg = (beta: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const denom = 1 + beta * (K_arr[i] - 1);
      s -= z[i] * (K_arr[i] - 1) * (K_arr[i] - 1) / (denom * denom);
    }
    return s;
  };

  // Bisection bounds
  const Kmax = Math.max(...K_arr);
  const Kmin = Math.min(...K_arr);
  let lo = 1 / (1 - Kmax + 1e-10);
  let hi = 1 / (1 - Kmin + 1e-10);
  if (lo > hi) { const tmp = lo; lo = hi; hi = tmp; }
  lo = Math.max(lo, -0.01);
  hi = Math.min(hi,  1.01);

  // Check trivial cases
  if (g(1e-10) < 0) {
    // All liquid
    return { beta: 0, x_arr: [...z], y_arr: K_arr.map((K, i) => K * z[i]), converged: true };
  }
  if (g(1 - 1e-10) > 0) {
    // All vapor
    return { beta: 1, x_arr: z.map((zi, i) => zi / K_arr[i]), y_arr: [...z], converged: true };
  }

  // Bisection
  let beta = 0.5;
  let converged = false;
  for (let iter = 0; iter < nMaxIter; iter++) {
    const f = g(beta);
    if (Math.abs(f) < 1e-10) { converged = true; break; }
    // Newton step
    const df = dg(beta);
    const betaNew = beta - f / df;
    if (betaNew > lo && betaNew < hi) {
      beta = betaNew;
    } else {
      // Bisection fallback
      if (g(lo) * f < 0) hi = beta;
      else lo = beta;
      beta = (lo + hi) / 2;
    }
    if (Math.abs(hi - lo) < 1e-12) { converged = true; break; }
  }

  // Compute x and y
  const x_arr: number[] = [];
  const y_arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = z[i] / (1 + beta * (K_arr[i] - 1));
    x_arr.push(xi);
    y_arr.push(K_arr[i] * xi);
  }

  return { beta, x_arr, y_arr, converged };
}

/**
 * Full VLE flash using Lee-Kesler EoS with successive substitution.
 *
 * Uses Wilson K-factors as initial guess, then iterates:
 *   1. Solve Rachford-Rice for beta, x, y
 *   2. Compute Z_L (liquid) and Z_V (vapor) from LK EoS
 *   3. Update K from fugacity coefficients (simplified: use LK Z ratio)
 *   4. Repeat until convergence
 *
 * @param T_K       Temperature (K)
 * @param P_bar     Pressure (bar)
 * @param z_arr     Overall mole fractions
 * @param Tc_arr    Critical temperatures (K)
 * @param Pc_arr    Critical pressures (bar)
 * @param omega_arr Acentric factors
 * @param nMaxIter  Maximum outer iterations (default 50)
 * @returns         {beta, x_arr, y_arr, K_arr, Z_L, Z_V, converged, iterations}
 */
export function lkVLEFlash(
  T_K: number,
  P_bar: number,
  z_arr: number[],
  Tc_arr: number[],
  Pc_arr: number[],
  omega_arr: number[],
  nMaxIter = 50,
): {
  beta: number;
  x_arr: number[];
  y_arr: number[];
  K_arr: number[];
  Z_L: number;
  Z_V: number;
  converged: boolean;
  iterations: number;
} {
  // Initial K from Wilson correlation
  let K_arr = lkWilsonK(T_K, P_bar, Tc_arr, Pc_arr, omega_arr);

  let beta = 0.5;
  let x_arr = [...z_arr];
  let y_arr = [...z_arr];
  let Z_L = 0.3;
  let Z_V = 0.85;
  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < nMaxIter; iter++) {
    iterations = iter + 1;

    // Solve Rachford-Rice
    const rr = lkRachfordRice(z_arr, K_arr, 100);
    beta  = rr.beta;
    x_arr = rr.x_arr;
    y_arr = rr.y_arr;

    // Compute Z for liquid phase (Kay's rule with x)
    Z_L = lkMixtureZ(T_K, P_bar, Tc_arr, Pc_arr, omega_arr, x_arr);
    // Compute Z for vapor phase (Kay's rule with y)
    Z_V = lkMixtureZ(T_K, P_bar, Tc_arr, Pc_arr, omega_arr, y_arr);

    // Update K using simplified fugacity ratio: phi_L/phi_V ≈ Z_V/Z_L
    const K_new: number[] = [];
    let maxRelChange = 0;
    for (let i = 0; i < K_arr.length; i++) {
      const K_new_i = K_arr[i] * (Z_V / Z_L);
      K_new.push(K_new_i);
      maxRelChange = Math.max(maxRelChange, Math.abs(K_new_i - K_arr[i]) / (Math.abs(K_arr[i]) + 1e-10));
    }

    K_arr = K_new;
    if (maxRelChange < 1e-6) { converged = true; break; }
  }

  return { beta, x_arr, y_arr, K_arr, Z_L, Z_V, converged, iterations };
}
