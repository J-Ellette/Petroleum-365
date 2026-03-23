/**
 * P365 — Well Production Allocation (WPA)
 *
 * Multi-well field-level production proration, rate allocation, and
 * injection distribution for reservoir management.
 *
 * Supports:
 *   - Proportional (equal-share) proration
 *   - PI-weighted allocation
 *   - AOF-weighted allocation (backpressure)
 *   - Capacity-limited curtailment
 *   - Injectant distribution (water/gas injection)
 *   - Reconciliation of measured vs. allocated production
 *   - Field voidage replacement calculation
 *
 * Units:
 *   - Rates in STB/d (oil/water) or Mscf/d (gas) — consistent within each call
 *   - Pressures in psia
 *
 * References:
 *   - Craft, Hawkins & Terry — Applied Petroleum Reservoir Engineering
 *   - SPE-18270 (Production allocation methodology)
 */

// ─── Types ─────────────────────────────────────────────────────────────────

/** One well's allocation result */
export interface WpaWellAllocation {
  /** Well identifier */
  wellId: string;
  /** Allocated rate */
  allocatedRate: number;
  /** Fraction of total field rate */
  fraction: number;
}

/** Result of a field-level proration */
export interface WpaProrationResult {
  /** Individual well allocations */
  wells: WpaWellAllocation[];
  /** Total field rate (sum of allocations) */
  totalRate: number;
  /** Field target rate (may differ from total if curtailment applied) */
  targetRate: number;
}

/** One well's voidage / injection data */
export interface WpaVoidageWell {
  wellId: string;
  oilRate: number;     // STB/d
  waterRate: number;   // STB/d
  gasRate: number;     // Mscf/d  (solution gas from oil wells)
  Bo: number;          // oil FVF (res bbl/STB)
  Bg: number;          // gas FVF (res bbl/Mscf)
  Bw: number;          // water FVF (res bbl/STB)
}

// ─── Proportional Proration ────────────────────────────────────────────────

/**
 * Distribute a target field rate proportionally among wells based on individual weights.
 *
 * Common use: allocate pipeline/facility capacity by PI, AOF, or historical share.
 *
 * @param wellIds     Array of well identifiers
 * @param weights     Non-negative weight for each well (e.g. PI, AOF, or historical rate)
 * @param targetRate  Total rate to distribute
 * @returns           Proration result with per-well allocations
 */
export function wpaProportional(
  wellIds: string[],
  weights: number[],
  targetRate: number,
): WpaProrationResult {
  if (wellIds.length !== weights.length) {
    throw new Error("wellIds and weights must have the same length");
  }
  const totalWeight = weights.reduce((s, w) => s + Math.max(w, 0), 0);
  const wells: WpaWellAllocation[] = wellIds.map((wellId, i) => {
    const frac = totalWeight > 0 ? Math.max(weights[i], 0) / totalWeight : 0;
    return { wellId, allocatedRate: frac * targetRate, fraction: frac };
  });
  return { wells, totalRate: targetRate, targetRate };
}

/**
 * Equal-share proration (all wells receive the same rate).
 *
 * @param wellIds     Array of well identifiers
 * @param targetRate  Total rate to distribute equally
 * @returns           Proration result
 */
export function wpaEqualShare(wellIds: string[], targetRate: number): WpaProrationResult {
  const n = wellIds.length;
  const share = n > 0 ? targetRate / n : 0;
  const wells = wellIds.map(wellId => ({
    wellId,
    allocatedRate: share,
    fraction: n > 0 ? 1 / n : 0,
  }));
  return { wells, totalRate: targetRate, targetRate };
}

// ─── PI-Weighted Allocation ────────────────────────────────────────────────

/**
 * Allocate field production based on well Productivity Indices.
 *
 * q_i / q_total = PI_i / Σ PI_j
 *
 * @param wellIds    Well identifiers
 * @param piValues   Productivity index for each well (STB/d/psi)
 * @param fieldRate  Total field production rate to allocate
 * @returns          Proration result
 */
export function wpaPIWeighted(
  wellIds: string[],
  piValues: number[],
  fieldRate: number,
): WpaProrationResult {
  return wpaProportional(wellIds, piValues, fieldRate);
}

// ─── AOF-Weighted Allocation ───────────────────────────────────────────────

/**
 * Gas well proration by Absolute Open Flow (AOF) — backpressure method.
 *
 * Backpressure: q_AOF = C · (Pr² − Pwf²)^n
 * Allocation weight = AOF_i
 *
 * @param wellIds    Well identifiers
 * @param aofValues  AOF rates (Mscf/d) for each well
 * @param fieldRate  Total gas rate to allocate
 * @returns          Proration result
 */
export function wpaAOFWeighted(
  wellIds: string[],
  aofValues: number[],
  fieldRate: number,
): WpaProrationResult {
  return wpaProportional(wellIds, aofValues, fieldRate);
}

// ─── Capacity-Limited Curtailment ─────────────────────────────────────────

/**
 * Apply capacity constraints (max rate per well) to a proportional allocation.
 *
 * Algorithm:
 *  1. Allocate proportionally by weight.
 *  2. If any well exceeds its capacity, cap it and redistribute the remainder.
 *  3. Repeat until no well is capped or all uncapped wells are satisfied.
 *
 * @param wellIds     Well identifiers
 * @param weights     Allocation weights (PI, AOF, etc.)
 * @param maxRates    Maximum capacity for each well
 * @param targetRate  Total field target rate
 * @returns           Curtailed proration result
 */
export function wpaCapacityCurtailment(
  wellIds: string[],
  weights: number[],
  maxRates: number[],
  targetRate: number,
): WpaProrationResult {
  if (wellIds.length !== weights.length || wellIds.length !== maxRates.length) {
    throw new Error("wellIds, weights, and maxRates must have the same length");
  }
  const n = wellIds.length;
  const allocated = new Array<number>(n).fill(0);
  const capped    = new Array<boolean>(n).fill(false);
  let remaining   = targetRate;

  for (let pass = 0; pass < n + 1; pass++) {
    const activeWeights = weights.map((w, i) => capped[i] ? 0 : Math.max(w, 0));
    const totalW = activeWeights.reduce((s, w) => s + w, 0);
    if (totalW === 0 || remaining <= 0) break;

    let newCap = false;
    for (let i = 0; i < n; i++) {
      if (capped[i]) continue;
      const propose = (activeWeights[i] / totalW) * remaining;
      if (propose >= maxRates[i]) {
        allocated[i] = maxRates[i];
        capped[i]    = true;
        newCap       = true;
      }
    }

    if (!newCap) {
      // Final distribution — no more cappings
      for (let i = 0; i < n; i++) {
        if (!capped[i]) allocated[i] = (activeWeights[i] / totalW) * remaining;
      }
      break;
    }

    // Recalculate remaining for next pass
    remaining = targetRate - capped.reduce((s, cap, i) => s + (cap ? allocated[i] : 0), 0);
  }

  const totalAllocated = allocated.reduce((s, a) => s + a, 0);
  const wells: WpaWellAllocation[] = wellIds.map((wellId, i) => ({
    wellId,
    allocatedRate: allocated[i],
    fraction: totalAllocated > 0 ? allocated[i] / totalAllocated : 0,
  }));
  return { wells, totalRate: totalAllocated, targetRate };
}

// ─── Measured vs. Allocated Reconciliation ────────────────────────────────

/**
 * Reconcile metered well rates with a field-measured total.
 *
 * When individual well meters are inaccurate, scale each well's metered rate
 * by the ratio (field_measured / Σ metered_well_rates).
 *
 * @param wellIds        Well identifiers
 * @param meteredRates   Raw metered rates per well
 * @param fieldMeasured  Accurately measured total field rate
 * @returns              Reconciled proration result
 */
export function wpaReconcile(
  wellIds: string[],
  meteredRates: number[],
  fieldMeasured: number,
): WpaProrationResult {
  const totalMetered = meteredRates.reduce((s, r) => s + r, 0);
  const scaleFactor  = totalMetered > 0 ? fieldMeasured / totalMetered : 0;
  const wells: WpaWellAllocation[] = wellIds.map((wellId, i) => {
    const allocatedRate = meteredRates[i] * scaleFactor;
    return {
      wellId,
      allocatedRate,
      fraction: totalMetered > 0 ? meteredRates[i] / totalMetered : 0,
    };
  });
  return { wells, totalRate: fieldMeasured, targetRate: fieldMeasured };
}

// ─── Injection Distribution ───────────────────────────────────────────────

/**
 * Distribute injection (water or gas) among injectors by pore volume weight.
 *
 * @param wellIds    Injector well identifiers
 * @param pvWeights  Pore volume weight for each injector (e.g. connected PV)
 * @param totalInj   Total injection rate to distribute
 * @returns          Proration result for injectors
 */
export function wpaInjectorsProportional(
  wellIds: string[],
  pvWeights: number[],
  totalInj: number,
): WpaProrationResult {
  return wpaProportional(wellIds, pvWeights, totalInj);
}

// ─── Voidage Replacement ──────────────────────────────────────────────────

/**
 * Calculate reservoir voidage rate for a set of producing wells.
 *
 * Voidage (res bbl/d) = Σ (q_o · Bo + q_w · Bw + q_g_free · Bg)
 *
 * where free gas = total gas − solution gas
 *       q_g_free [res bbl/d] = max(0, gas_rate − q_o · Rs) · Bg
 *
 * @param wells  Array of producing well data
 * @param Rs     Solution gas-oil ratio (scf/STB), used to separate free gas
 * @returns      Total reservoir voidage (res bbl/d)
 */
export function wpaVoidageRate(wells: WpaVoidageWell[], Rs: number): number {
  return wells.reduce((sum, w) => {
    const freeGas = Math.max(0, w.gasRate - w.oilRate * Rs / 1000); // Mscf/d
    return sum
      + w.oilRate   * w.Bo
      + w.waterRate * w.Bw
      + freeGas     * w.Bg * 1000;  // Bg in res bbl/Mscf → res bbl/d
  }, 0);
}

/**
 * Required injection rate to achieve a target voidage replacement ratio (VRR).
 *
 * VRR = total_injection_res / total_voidage_res
 * Injection_res = voidage × VRR
 * Injection_surface = Injection_res / Bw_inj  (for water)
 *
 * @param voidageResBbld  Total voidage (res bbl/d) from wpaVoidageRate
 * @param targetVRR       Target voidage replacement ratio (e.g. 1.0 = 100%)
 * @param Bw_inj          Water FVF at injection conditions (res bbl/STB)
 * @returns               Required water injection rate (STB/d at surface)
 */
export function wpaRequiredInjectionRate(
  voidageResBbld: number,
  targetVRR: number,
  Bw_inj: number,
): number {
  if (Bw_inj <= 0) throw new Error("Bw_inj must be positive");
  return (voidageResBbld * targetVRR) / Bw_inj;
}

/**
 * Actual voidage replacement ratio for a field.
 *
 * VRR = (water_inj · Bw_inj + gas_inj · Bg_inj) / voidage_res
 *
 * @param waterInjSurface  Water injection rate at surface (STB/d)
 * @param Bw_inj           Injected water FVF (res bbl/STB)
 * @param gasInjSurface    Gas injection rate at surface (Mscf/d)
 * @param Bg_inj           Injected gas FVF (res bbl/Mscf)
 * @param voidageResBbld   Total producer voidage (res bbl/d)
 * @returns                Actual VRR (dimensionless)
 */
export function wpaActualVRR(
  waterInjSurface: number,
  Bw_inj: number,
  gasInjSurface: number,
  Bg_inj: number,
  voidageResBbld: number,
): number {
  if (voidageResBbld <= 0) return 0;
  const injRes = waterInjSurface * Bw_inj + gasInjSurface * Bg_inj * 1000;
  return injRes / voidageResBbld;
}

// ─── Field Production Summary ──────────────────────────────────────────────

/**
 * Aggregate field-level production summary from individual well data.
 *
 * @param wells  Array of per-well production data
 * @returns      Field totals: oil, water, gas, water cut, GOR
 */
export function wpaFieldSummary(wells: {
  wellId: string;
  oilRate: number;
  waterRate: number;
  gasRate: number;
}[]): {
  totalOil: number;
  totalWater: number;
  totalGas: number;
  totalLiquid: number;
  waterCut: number;
  GOR: number;
} {
  const totalOil   = wells.reduce((s, w) => s + w.oilRate,   0);
  const totalWater = wells.reduce((s, w) => s + w.waterRate, 0);
  const totalGas   = wells.reduce((s, w) => s + w.gasRate,   0);
  const totalLiquid = totalOil + totalWater;
  return {
    totalOil,
    totalWater,
    totalGas,
    totalLiquid,
    waterCut: totalLiquid > 0 ? totalWater / totalLiquid : 0,
    GOR: totalOil > 0 ? totalGas / totalOil : 0,
  };
}

/**
 * Decline-weighted PI estimate for reservoir pressure maintenance.
 *
 * Computes the effective composite PI for the field at current reservoir
 * pressure assuming linear superposition of individual well PIs.
 *
 * @param piValues  Productivity indices (STB/d/psi)
 * @param skinValues  Skin factors for each well (dimensionless)
 * @returns          Equivalent field PI with skin-correction factor
 */
export function wpaFieldPI(piValues: number[], skinValues: number[]): number {
  if (piValues.length !== skinValues.length) {
    throw new Error("piValues and skinValues must have the same length");
  }
  // PI_corrected_i = PI_i / (1 + S_i / (ln(re/rw) − 0.75))
  // Simplified: use 7.08 as typical ln(re/rw)−0.75 ≈ 7
  const BASE_LOG = 7.0;
  return piValues.reduce((sum, pi, i) => sum + pi / (1 + skinValues[i] / BASE_LOG), 0);
}
