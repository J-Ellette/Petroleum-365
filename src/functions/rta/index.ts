/**
 * P365 — Rate-Transient Analysis (RTA)
 *
 * Functions for rate-transient and flowing material balance analysis:
 *   Material balance time, pseudo-pressure, pseudo-time,
 *   rate-normalized pressure (RNP), flowing material balance (FMB),
 *   Blasingame b-plot diagnostic, and type-curve parameters.
 *
 * Units: field (psia, °F, mD, ft, STB/d or Mscf/d, cp).
 *
 * References:
 *   Anderson & Mattar (2003) — flowing material balance
 *   Blasingame, McCray & Lee (1991) — rate-transient type curves
 *   Agarwal, Gardner & Ruessink (1999) — RTA for gas wells
 */

// ─── Material Balance Time ─────────────────────────────────────────────────────

/**
 * Calculate material balance time for a gas well.
 *
 * tc_a = Gp / q
 *
 * where Gp is cumulative gas production (Mscf) and q is current rate (Mscf/d).
 * Material balance time transforms the variable-rate problem into an equivalent
 * constant-rate problem for type-curve analysis.
 *
 * @param Gp_Mscf  Cumulative gas production (Mscf)
 * @param q_Mscf_d Current gas rate (Mscf/d)
 * @returns        Material balance time (days)
 */
export function rtaMaterialBalanceTime(
  Gp_Mscf: number,
  q_Mscf_d: number
): number {
  if (q_Mscf_d <= 0) throw new Error("Rate must be positive");
  return Gp_Mscf / q_Mscf_d;
}

/**
 * Calculate material balance time for an oil well.
 *
 * tc = Np / q
 *
 * @param Np_STB   Cumulative oil production (STB)
 * @param q_STB_d  Current oil rate (STB/d)
 * @returns        Material balance time (days)
 */
export function rtaMaterialBalanceTimeOil(
  Np_STB: number,
  q_STB_d: number
): number {
  if (q_STB_d <= 0) throw new Error("Rate must be positive");
  return Np_STB / q_STB_d;
}

// ─── Real-Gas Pseudo-Pressure ─────────────────────────────────────────────────

/**
 * Approximate real-gas pseudo-pressure using the trapezoidal rule.
 *
 * m(p) = 2 ∫[p_base to p] (p / μg·Z) dp  (psia²/cp)
 *
 * Pressure and μZ arrays must be the same length and ordered from base pressure upward.
 *
 * @param p_arr    Pressure array (psia)
 * @param muZ_arr  Product μg·Z at each pressure (cp·dimensionless)
 * @param p_base   Base pressure for integration (psia); typically 14.7
 * @param p_eval   Pressure at which to evaluate m(p) (psia)
 * @returns        m(p) (psia²/cp)
 */
export function rtaPseudoPressure(
  p_arr: number[],
  muZ_arr: number[],
  p_base: number,
  p_eval: number
): number {
  const n = p_arr.length;
  if (n < 2 || muZ_arr.length !== n) throw new Error("Arrays must have same length >= 2");
  if (p_eval < p_base) throw new Error("p_eval must be >= p_base");

  let integral = 0;
  for (let i = 1; i < n; i++) {
    const p_lo = p_arr[i - 1];
    const p_hi = p_arr[i];
    if (p_lo < p_base) continue;
    const p_lo_eff = Math.max(p_lo, p_base);
    const p_hi_eff = Math.min(p_hi, p_eval);
    if (p_hi_eff <= p_lo_eff) continue;

    const f_lo = p_lo_eff / muZ_arr[i - 1];
    const f_hi = p_hi_eff / muZ_arr[i];
    integral += 0.5 * (f_lo + f_hi) * (p_hi_eff - p_lo_eff);

    if (p_hi >= p_eval) break;
  }

  return 2 * integral;
}

/**
 * Approximate real-gas pseudo-pressure difference Dm(p) = m(pi) - m(pwf).
 *
 * Convenience wrapper around rtaPseudoPressure for computing the flowing
 * pressure drop in pseudo-pressure units.
 *
 * @param p_arr    Pressure array (psia)
 * @param muZ_arr  Product muG times Z at each pressure (cp)
 * @param p_base   Base pressure (psia)
 * @param p_i      Initial/reservoir pressure (psia)
 * @param p_wf     Flowing wellbore pressure (psia)
 * @returns        Delta-m(p) = m(pi) - m(pwf) (psia^2/cp)
 */
export function rtaPseudoPressureDiff(
  p_arr: number[],
  muZ_arr: number[],
  p_base: number,
  p_i: number,
  p_wf: number
): number {
  const mp_i  = rtaPseudoPressure(p_arr, muZ_arr, p_base, p_i);
  const mp_wf = rtaPseudoPressure(p_arr, muZ_arr, p_base, p_wf);
  return mp_i - mp_wf;
}

// ─── Pseudo-Time ──────────────────────────────────────────────────────────────

/**
 * Approximate real-gas pseudo-time using the trapezoidal rule.
 *
 * t_a = (muGi * cti) * integral[0 to t] dt / (muG * ct)
 *
 * where muGi*cti is the product at initial conditions and muG*ct varies with time.
 *
 * @param t_arr     Time array (days)
 * @param muCt_arr  Product muG*ct at each time step (cp/psia)
 * @param muCt_i    Initial muGi*cti (cp/psia)
 * @param t_eval    Time at which to evaluate ta (days)
 * @returns         Pseudo-time ta (days)
 */
export function rtaPseudoTime(
  t_arr: number[],
  muCt_arr: number[],
  muCt_i: number,
  t_eval: number
): number {
  const n = t_arr.length;
  if (n < 2 || muCt_arr.length !== n) throw new Error("Arrays must have same length >= 2");
  if (muCt_i <= 0) throw new Error("muCt_i must be positive");

  let integral = 0;
  for (let i = 1; i < n; i++) {
    const t_lo = t_arr[i - 1];
    const t_hi = Math.min(t_arr[i], t_eval);
    if (t_lo >= t_eval) break;
    const dt = t_hi - t_lo;
    const f_lo = 1 / muCt_arr[i - 1];
    const f_hi = 1 / muCt_arr[i];
    integral += 0.5 * (f_lo + f_hi) * dt;
    if (t_arr[i] >= t_eval) break;
  }

  return muCt_i * integral;
}

// ─── Rate-Normalized Pressure (RNP) ──────────────────────────────────────────

/**
 * Calculate rate-normalized pressure (RNP) for a gas well.
 *
 * RNP = Delta-m(p) / q  (psia^2/cp / Mscf/d = psia^2*d/(cp*Mscf))
 *
 * RNP vs. material balance time is analogous to a constant-rate pressure
 * buildup, enabling conventional straight-line analysis.
 *
 * @param delta_mp  Pseudo-pressure difference m(pi) - m(pwf) (psia^2/cp)
 * @param q_Mscf_d  Gas rate (Mscf/d)
 * @returns         Rate-normalized pressure (psia^2*d/(cp*Mscf))
 */
export function rtaRateNormalizedPressure(
  delta_mp: number,
  q_Mscf_d: number
): number {
  if (q_Mscf_d <= 0) throw new Error("Rate must be positive");
  return delta_mp / q_Mscf_d;
}

/**
 * Calculate rate-normalized pressure for an oil well using pressure difference.
 *
 * RNP_oil = (pi - pwf) / q  (psia / STB/d = psia*d/STB)
 *
 * @param pi_psia   Initial reservoir pressure (psia)
 * @param pwf_psia  Flowing wellbore pressure (psia)
 * @param q_STB_d   Oil rate (STB/d)
 * @returns         Rate-normalized pressure (psia*d/STB)
 */
export function rtaRateNormalizedPressureOil(
  pi_psia: number,
  pwf_psia: number,
  q_STB_d: number
): number {
  if (q_STB_d <= 0) throw new Error("Rate must be positive");
  return (pi_psia - pwf_psia) / q_STB_d;
}

// ─── Flowing Material Balance (FMB) ──────────────────────────────────────────

/**
 * Flowing Material Balance (FMB) for a gas well - Agarwal-Gardner method.
 *
 * The FMB straight line is plotted as:
 *   m(pi)/q  vs.  Gp/q  (which is material balance time tc)
 *
 * The x-intercept gives OGIP (OGIP = G):
 *   G = -intercept / slope   where slope < 0
 *
 * This function estimates OGIP from pairs of (Gp, RNP) using linear regression.
 *
 * @param Gp_arr     Cumulative gas production at each observation (Mscf)
 * @param RNP_arr    Rate-normalized pseudo-pressure at each observation (psia^2*d/(cp*Mscf))
 * @param q_arr      Gas rates at each observation (Mscf/d)
 * @returns          { OGIP_Mscf, slope, intercept, R2 }
 */
export function rtaFlowingMaterialBalanceGas(
  Gp_arr: number[],
  RNP_arr: number[],
  q_arr: number[]
): { OGIP_Mscf: number; slope: number; intercept: number; R2: number } {
  const n = Gp_arr.length;
  if (n < 2 || RNP_arr.length !== n || q_arr.length !== n) {
    throw new Error("All input arrays must have the same length >= 2");
  }

  // x = material balance time = Gp / q
  // y = RNP = Delta-m(p) / q
  const x = Gp_arr.map((g, i) => g / q_arr[i]);
  const y = RNP_arr;

  // Linear regression y = m*x + b
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += x[i];
    sumY  += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-30) throw new Error("Degenerate regression (all x equal)");
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  if (Math.abs(slope) < 1e-30) throw new Error("Slope is zero - cannot estimate OGIP");
  const OGIP_Mscf = -intercept / slope;

  // R^2
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = slope * x[i] + intercept;
    ssTot += (y[i] - yMean) ** 2;
    ssRes += (y[i] - yHat) ** 2;
  }
  const R2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  return { OGIP_Mscf, slope, intercept, R2 };
}

/**
 * Flowing Material Balance (FMB) for an oil well.
 *
 * FMB straight line:
 *   (pi - pwf)/q  vs.  Np/q  (material balance time)
 *
 * X-intercept = N (OOIP in STB).
 *
 * @param Np_arr   Cumulative oil production at each observation (STB)
 * @param RNP_arr  Rate-normalized pressure difference (psia*d/STB)
 * @param q_arr    Oil rates at each observation (STB/d)
 * @returns        { OOIP_STB, slope, intercept, R2 }
 */
export function rtaFlowingMaterialBalanceOil(
  Np_arr: number[],
  RNP_arr: number[],
  q_arr: number[]
): { OOIP_STB: number; slope: number; intercept: number; R2: number } {
  const n = Np_arr.length;
  if (n < 2 || RNP_arr.length !== n || q_arr.length !== n) {
    throw new Error("All input arrays must have the same length >= 2");
  }

  const x = Np_arr.map((np, i) => np / q_arr[i]);
  const y = RNP_arr;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += x[i];
    sumY  += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-30) throw new Error("Degenerate regression (all x equal)");
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  if (Math.abs(slope) < 1e-30) throw new Error("Slope is zero - cannot estimate OOIP");
  const OOIP_STB = -intercept / slope;

  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = slope * x[i] + intercept;
    ssTot += (y[i] - yMean) ** 2;
    ssRes += (y[i] - yHat) ** 2;
  }
  const R2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  return { OOIP_STB, slope, intercept, R2 };
}

// ─── Blasingame b-Plot Diagnostic ─────────────────────────────────────────────

/**
 * Compute Blasingame loss-ratio b-plot data for flow regime identification.
 *
 * Loss ratio:  b = -q / (dq/dt)
 * b derivative: bDot = db/dt
 *
 * Flow regime indicators:
 *   b -> constant   = boundary-dominated flow (BDF)
 *   bDot > 0        = transient flow (boundaries not seen)
 *   b ~ 0.5         = linear transient flow
 *   b ~ 1           = exponential BDF (b-factor = 0)
 *
 * @param t_arr  Time array (days)
 * @param q_arr  Rate array (Mscf/d or STB/d)
 * @returns      Array of { t, b, bDot } loss-ratio and derivative
 */
export function rtaBPlot(
  t_arr: number[],
  q_arr: number[]
): { t: number; b: number; bDot: number }[] {
  const n = t_arr.length;
  if (n < 3) throw new Error("Need at least 3 data points for b-plot");
  if (q_arr.length !== n) throw new Error("Arrays must have same length");

  // Compute loss ratio b = -q / (dq/dt) using central differences
  const result: { t: number; b: number; bDot: number }[] = [];

  for (let i = 1; i < n - 1; i++) {
    const dt_span = t_arr[i + 1] - t_arr[i - 1];
    if (dt_span <= 0) continue;

    // Central difference dq/dt
    const dqdt = (q_arr[i + 1] - q_arr[i - 1]) / dt_span;
    if (dqdt >= 0) continue; // skip non-declining points

    const b_i = -q_arr[i] / dqdt;
    result.push({ t: t_arr[i], b: b_i, bDot: 0 });
  }

  // Compute b' = db/dt using central differences on b values
  for (let j = 1; j < result.length - 1; j++) {
    const dt = result[j + 1].t - result[j - 1].t;
    if (dt > 0) {
      result[j].bDot = (result[j + 1].b - result[j - 1].b) / dt;
    }
  }

  return result;
}

// ─── Blasingame Type-Curve Parameters ─────────────────────────────────────────

/**
 * Compute Blasingame dimensionless decline rate q_Dd for a vertical well.
 *
 * q_Dd = [141.2 q B mu / (k h delta_p)] * [ln(re/rw) - 0.75]
 *
 * @param q_STB_d   Flow rate (STB/d)
 * @param B_res     Formation volume factor (res bbl/STB)
 * @param mu_cp     Viscosity (cp)
 * @param k_mD      Permeability (mD)
 * @param h_ft      Net pay thickness (ft)
 * @param pi_psia   Initial pressure (psia)
 * @param pwf_psia  Flowing wellbore pressure (psia)
 * @param re_ft     Drainage radius (ft)
 * @param rw_ft     Wellbore radius (ft)
 * @returns         Dimensionless decline rate q_Dd
 */
export function rtaBlassingameDimensionlessRate(
  q_STB_d: number,
  B_res: number,
  mu_cp: number,
  k_mD: number,
  h_ft: number,
  pi_psia: number,
  pwf_psia: number,
  re_ft: number,
  rw_ft: number
): number {
  const delta_p = pi_psia - pwf_psia;
  if (delta_p <= 0) throw new Error("pi must exceed pwf");
  if (k_mD <= 0 || h_ft <= 0) throw new Error("k and h must be positive");
  const lnRatio = Math.log(re_ft / rw_ft) - 0.75;
  const q_ref = k_mD * h_ft * delta_p / (141.2 * B_res * mu_cp);
  return (q_STB_d / q_ref) * lnRatio;
}

/**
 * Compute Blasingame dimensionless decline time t_Dd.
 *
 * t_Dd = 0.00633 k t / (phi mu ct re^2)
 *
 * @param k_mD    Permeability (mD)
 * @param t_days  Producing time (days)
 * @param phi     Porosity (fraction)
 * @param mu_cp   Viscosity (cp)
 * @param ct_psi  Total compressibility (psia^-1)
 * @param re_ft   Drainage radius (ft)
 * @returns       Dimensionless decline time t_Dd
 */
export function rtaBlassingameDimensionlessTime(
  k_mD: number,
  t_days: number,
  phi: number,
  mu_cp: number,
  ct_psi: number,
  re_ft: number
): number {
  if (phi <= 0 || phi > 1) throw new Error("Porosity must be between 0 and 1");
  if (ct_psi <= 0) throw new Error("ct must be positive");
  return 0.00633 * k_mD * t_days / (phi * mu_cp * ct_psi * re_ft * re_ft);
}

// ─── Recovery Factor from FMB ─────────────────────────────────────────────────

/**
 * Compute instantaneous gas recovery factor from FMB.
 *
 * RF = Gp / G
 *
 * @param Gp_Mscf   Cumulative gas production (Mscf)
 * @param OGIP_Mscf Original gas in place (Mscf)
 * @returns         Recovery factor (fraction, 0-1)
 */
export function rtaRecoveryFactorFMB(
  Gp_Mscf: number,
  OGIP_Mscf: number
): number {
  if (OGIP_Mscf <= 0) throw new Error("OGIP must be positive");
  return Math.min(1, Gp_Mscf / OGIP_Mscf);
}

// ─── Permeability and Skin from RNP Straight Line ────────────────────────────

/**
 * Estimate permeability from the slope of the RNP vs. log(tc) straight line.
 *
 * During IARF: m* = 1637 T / (k h)   (gas, pseudo-pressure form)
 *
 * @param slope_RNP  Slope of RNP vs. log10(tc) line (psia^2*d/(cp*Mscf per log-cycle))
 * @param T_R        Reservoir temperature (degR)
 * @param h_ft       Net pay thickness (ft)
 * @returns          Permeability (mD)
 */
export function rtaPermeabilityFromRNP(
  slope_RNP: number,
  T_R: number,
  h_ft: number
): number {
  if (slope_RNP <= 0) throw new Error("Slope must be positive");
  return 1637 * T_R / (slope_RNP * h_ft);
}

/**
 * Estimate skin from RNP straight-line analysis.
 *
 * S = 1.151 [RNP(tc=1hr) / m* - log(k/(phi muGi cti rw^2)) + 3.2275]
 *
 * @param RNP_1hr    RNP at tc = 1 hour, from the IARF line
 * @param m_star     Slope of RNP vs. log10(tc)
 * @param k_mD       Permeability (mD)
 * @param phi        Porosity (fraction)
 * @param mu_cp      Initial gas viscosity (cp)
 * @param ct_psi     Total compressibility (psia^-1)
 * @param rw_ft      Wellbore radius (ft)
 * @returns          Skin factor (dimensionless)
 */
export function rtaSkinFromRNP(
  RNP_1hr: number,
  m_star: number,
  k_mD: number,
  phi: number,
  mu_cp: number,
  ct_psi: number,
  rw_ft: number
): number {
  const logTerm = Math.log10(k_mD / (phi * mu_cp * ct_psi * rw_ft * rw_ft));
  return 1.151 * (RNP_1hr / m_star - logTerm + 3.2275);
}

// ─── Arps b-Exponent Estimation ──────────────────────────────────────────────

/**
 * Estimate Arps b-factor from three rate-time data points.
 *
 * Uses finite differences on log(q):
 *   b = -d2(lnq)/dt2 / [d(lnq)/dt]^2
 *
 * @param t1_days   Time of first observation (days)
 * @param q1        Rate at t1
 * @param t2_days   Time of second observation (days)
 * @param q2        Rate at t2
 * @param t3_days   Time of third observation (days)
 * @param q3        Rate at t3
 * @returns         Estimated Arps b-factor (dimensionless)
 */
export function rtaArpsBExponent(
  t1_days: number,
  q1: number,
  t2_days: number,
  q2: number,
  t3_days: number,
  q3: number
): number {
  const lnq1 = Math.log(q1), lnq2 = Math.log(q2), lnq3 = Math.log(q3);
  const dt1 = t2_days - t1_days, dt2 = t3_days - t2_days;
  if (dt1 <= 0 || dt2 <= 0) throw new Error("Times must be strictly increasing");
  const d1 = (lnq2 - lnq1) / dt1;
  const d2 = (lnq3 - lnq2) / dt2;
  const d2dt2 = (d2 - d1) / (0.5 * (dt1 + dt2));
  // For Arps hyperbolic: b = d²(lnq)/dt² / [d(lnq)/dt]²
  return d2dt2 / (d1 * d1);
}

// ─── Gas Well PSS kh from RNP ─────────────────────────────────────────────────

/**
 * Compute kh product from PSS RNP for a gas well.
 *
 * At PSS:  Delta-m(p) / q = (1422 T / (kh)) * [ln(re/rw) - 0.75 + S]
 *
 * @param RNP_PSS  Rate-normalized pressure at PSS (psia^2*d/(cp*Mscf))
 * @param T_R      Reservoir temperature (degR)
 * @param re_ft    Drainage radius (ft)
 * @param rw_ft    Wellbore radius (ft)
 * @param S        Skin factor (dimensionless)
 * @returns        kh product (mD*ft)
 */
export function rtaKhFromPSSRNP(
  RNP_PSS: number,
  T_R: number,
  re_ft: number,
  rw_ft: number,
  S: number
): number {
  if (RNP_PSS <= 0) throw new Error("RNP_PSS must be positive");
  const lnTerm = Math.log(re_ft / rw_ft) - 0.75 + S;
  return 1422 * T_R * lnTerm / RNP_PSS;
}
