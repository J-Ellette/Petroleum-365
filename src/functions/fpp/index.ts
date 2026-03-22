/**
 * P365 — Field Production Profile (FPP)
 *
 * Field-level production forecasting:
 *   Buildup-plateau-decline (BPD) model for a single field
 *   Multi-well schedule aggregation (convolution of well profiles)
 *   Peak rate timing, plateau duration, and EUR
 *
 * Units: time in months; rate in Mscf/d or bbl/d (caller's choice).
 */

import { arpsRate, arpsCumulative } from "../dca";

// ─── Buildup-Plateau-Decline (BPD) Model ──────────────────────────────────────

/**
 * Buildup-Plateau-Decline field production rate at time t.
 *
 * Three phases:
 *  1. Ramp-up (0 ≤ t < t_ramp):    q = q_peak · t / t_ramp  (linear)
 *  2. Plateau  (t_ramp ≤ t < t_end): q = q_peak
 *  3. Decline  (t ≥ t_end):          q = Arps hyperbolic from q_peak
 *
 * @param t_months       Time from start of production (months)
 * @param q_peak         Peak/plateau rate (Mscf/d or bbl/d)
 * @param t_ramp_months  Ramp-up duration (months), 0 = starts at plateau immediately
 * @param t_plat_months  Plateau duration after ramp-up ends (months)
 * @param b              Arps b-factor (0 = exponential, 1 = harmonic)
 * @param Di_month       Initial nominal decline rate during decline phase (1/month)
 * @returns              Rate at time t (same units as q_peak)
 */
export function fieldProductionRate(
  t_months: number,
  q_peak: number,
  t_ramp_months: number,
  t_plat_months: number,
  b: number,
  Di_month: number
): number {
  if (t_months < 0) return 0;

  // Phase 1: Ramp-up
  if (t_months < t_ramp_months) {
    return q_peak * (t_months / Math.max(t_ramp_months, 1e-10));
  }

  // Phase 2: Plateau
  const t_end_plat = t_ramp_months + t_plat_months;
  if (t_months < t_end_plat) {
    return q_peak;
  }

  // Phase 3: Arps decline from plateau end
  const t_decline = t_months - t_end_plat;  // time since start of decline
  // Convert nominal monthly decline to annual for arpsRate (expects Di in 1/yr)
  // arpsRate expects t in years and Di in 1/yr (nominal)
  const t_yr = t_decline / 12;
  const Di_yr = Di_month * 12;
  return arpsRate(q_peak, Di_yr, b, t_yr);
}

/**
 * Buildup-Plateau-Decline cumulative production up to time t.
 *
 * Integrates the BPD rate profile numerically.
 *
 * @param t_months       Time from first production (months)
 * @param q_peak         Peak rate
 * @param t_ramp_months  Ramp-up duration (months)
 * @param t_plat_months  Plateau duration (months)
 * @param b              Arps b-factor
 * @param Di_month       Decline rate (1/month nominal)
 * @param dt_months      Integration step (months), default 0.5
 * @returns              Cumulative production (rate-units × months)
 */
export function fieldCumulativeProduction(
  t_months: number,
  q_peak: number,
  t_ramp_months: number,
  t_plat_months: number,
  b: number,
  Di_month: number,
  dt_months = 0.5
): number {
  // Analytical ramp-up contribution
  const t_ramp_actual = Math.min(t_months, t_ramp_months);
  const Gp_ramp = 0.5 * q_peak * t_ramp_actual;  // triangle area

  if (t_months <= t_ramp_months) return Gp_ramp;

  // Analytical plateau contribution
  const t_end_plat = t_ramp_months + t_plat_months;
  const t_plat_actual = Math.min(t_months, t_end_plat) - t_ramp_months;
  const Gp_plat = q_peak * t_plat_actual;

  if (t_months <= t_end_plat) return Gp_ramp + Gp_plat;

  // Analytical Arps decline contribution
  const t_decline = t_months - t_end_plat;
  const t_yr = t_decline / 12;
  const Di_yr = Di_month * 12;
  const Gp_decline = arpsCumulative(q_peak, Di_yr, b, t_yr) * 12;  // convert yr→months

  return Gp_ramp + Gp_plat + Gp_decline;
}

/**
 * Generate a full production rate profile over time.
 *
 * @param t_start_months  Start time (months)
 * @param t_end_months    End time (months)
 * @param dt_months       Time step (months)
 * @param q_peak          Peak rate
 * @param t_ramp          Ramp-up duration (months)
 * @param t_plat          Plateau duration (months)
 * @param b               Arps b-factor
 * @param Di_month        Decline rate (1/month)
 * @param q_min           Economic limit (cutoff), 0 = no limit; only applied after peak is reached
 * @returns               Array of {t, rate} pairs
 */
export function fieldRateProfile(
  t_start_months: number,
  t_end_months: number,
  dt_months: number,
  q_peak: number,
  t_ramp: number,
  t_plat: number,
  b: number,
  Di_month: number,
  q_min = 0
): Array<{ t: number; rate: number }> {
  const result: Array<{ t: number; rate: number }> = [];
  const t_end_plat = t_ramp + t_plat;
  for (let t = t_start_months; t <= t_end_months + 1e-9; t += dt_months) {
    const rate = fieldProductionRate(t, q_peak, t_ramp, t_plat, b, Di_month);
    // Only apply economic limit once past the plateau end (decline phase)
    if (q_min > 0 && t > t_end_plat && rate < q_min) break;
    result.push({ t, rate });
  }
  return result;
}

// ─── Multi-Well Schedule Aggregation ──────────────────────────────────────────

/**
 * A single well entry in a drilling schedule.
 */
export interface WellScheduleEntry {
  /** Month when the well comes on production (0 = first month) */
  t_start_months: number;
  /** Peak production rate for this well (same units as total rate) */
  q_peak: number;
  /** Ramp-up duration for this well (months) */
  t_ramp_months: number;
  /** Plateau duration (months) */
  t_plat_months: number;
  /** Arps b-factor */
  b: number;
  /** Decline rate (1/month nominal) */
  Di_month: number;
}

/**
 * Aggregate field production rate from a multi-well drilling schedule.
 *
 * Total_q(t) = Σ_{k: t_k ≤ t} q_well(t − t_k)
 *
 * @param t_months     Evaluation time (months from project start)
 * @param schedule     Array of well schedule entries
 * @returns            Total field rate at time t
 */
export function multiWellRate(t_months: number, schedule: WellScheduleEntry[]): number {
  let total = 0;
  for (const well of schedule) {
    const dt = t_months - well.t_start_months;
    if (dt < 0) continue;  // well not yet on production
    total += fieldProductionRate(dt, well.q_peak, well.t_ramp_months, well.t_plat_months, well.b, well.Di_month);
  }
  return total;
}

/**
 * Generate a multi-well field production profile over time.
 *
 * @param t_start_months  Start time (months)
 * @param t_end_months    End time (months)
 * @param dt_months       Time step (months)
 * @param schedule        Well drilling schedule
 * @returns               Array of {t, rate} pairs
 */
export function multiWellRateProfile(
  t_start_months: number,
  t_end_months: number,
  dt_months: number,
  schedule: WellScheduleEntry[]
): Array<{ t: number; rate: number }> {
  const result: Array<{ t: number; rate: number }> = [];
  for (let t = t_start_months; t <= t_end_months + 1e-9; t += dt_months) {
    result.push({ t, rate: multiWellRate(t, schedule) });
  }
  return result;
}

/**
 * EUR for a single field BPD model.
 *
 * @param q_peak         Peak rate
 * @param t_ramp         Ramp-up (months)
 * @param t_plat         Plateau (months)
 * @param b              Arps b-factor
 * @param Di_month       Decline rate (1/month)
 * @param q_min          Economic limit (cutoff)
 * @param t_max_months   Max evaluation time (months), default 600 (50 yr)
 * @returns              EUR in rate-units × months
 */
export function fieldEUR(
  q_peak: number,
  t_ramp: number,
  t_plat: number,
  b: number,
  Di_month: number,
  q_min: number,
  t_max_months = 600
): number {
  // Find economic limit time
  let t_eco = t_max_months;
  const t_end_plat = t_ramp + t_plat;
  if (q_min > 0 && q_min < q_peak) {
    // Economic limit only applies in decline phase
    const Di_yr = Di_month * 12;
    if (b === 0) {
      // Exponential: q = qi * e^(-Di*t) → t = -ln(q/qi)/Di
      const t_yr = -Math.log(q_min / q_peak) / Di_yr;
      t_eco = t_end_plat + t_yr * 12;
    } else {
      // Hyperbolic: q = qi / (1 + b*Di*t)^(1/b) → solve numerically
      let tl = 0, tr = 10000;
      for (let i = 0; i < 80; i++) {
        const tm = (tl + tr) / 2;
        const qm = arpsRate(q_peak, Di_yr, b, tm / 12);
        if (qm > q_min) tl = tm; else tr = tm;
      }
      t_eco = t_end_plat + (tl + tr) / 2;
    }
  }

  return fieldCumulativeProduction(Math.min(t_eco, t_max_months), q_peak, t_ramp, t_plat, b, Di_month);
}

// ─── Production Profile Statistics ────────────────────────────────────────────

/**
 * Compute peak rate, peak time, and total EUR from a rate profile.
 *
 * @param profile   Array of {t, rate} pairs
 * @returns         Summary statistics
 */
export function profileStats(profile: Array<{ t: number; rate: number }>): {
  peakRate: number;
  peakTime_months: number;
  plateauAvgRate: number;
  totalEUR: number;
} {
  if (profile.length === 0) return { peakRate: 0, peakTime_months: 0, plateauAvgRate: 0, totalEUR: 0 };

  let peakRate = 0;
  let peakTime_months = 0;
  let sum = 0;
  let peakRates: number[] = [];

  for (let i = 0; i < profile.length; i++) {
    const { t, rate } = profile[i];
    if (rate > peakRate) {
      peakRate = rate;
      peakTime_months = t;
    }
    // Trapezoidal integration
    if (i > 0) {
      const dt = t - profile[i - 1].t;
      sum += 0.5 * (rate + profile[i - 1].rate) * dt;
    }
  }

  // Plateau average rate = average of rates within 5% of peak
  for (const { rate } of profile) {
    if (rate >= 0.95 * peakRate) peakRates.push(rate);
  }
  const plateauAvgRate = peakRates.length > 0
    ? peakRates.reduce((a, b) => a + b, 0) / peakRates.length
    : peakRate;

  return { peakRate, peakTime_months, plateauAvgRate, totalEUR: sum };
}
