/**
 * P365 — Rod Pump (RP)
 *
 * Sucker rod pumping system design and analysis.
 *
 * Units: field (in, ft, bbl/d, lb, in-lb, hp).
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

const RP_PI = Math.PI;
const BBL_IN3 = 9702;          // cubic inches per barrel
const MIN_PER_DAY = 1440;      // minutes per day

// ─── Pump Displacement & Fluid Load ──────────────────────────────────────────

/**
 * Pump displacement (volumetric rate) corrected for pump efficiency.
 *
 * @param pump_bore_in      Pump barrel bore diameter (in)
 * @param stroke_length_in  Plunger stroke length (in)
 * @param strokes_per_min   Pump strokes per minute (spm)
 * @param pump_efficiency   Volumetric efficiency (fraction, default 0.85)
 * @returns                 Gross pump rate (bbl/d)
 */
export function rpPumpDisplacement(
  pump_bore_in: number,
  stroke_length_in: number,
  strokes_per_min: number,
  pump_efficiency = 0.85
): number {
  const A_in2 = RP_PI * Math.pow(pump_bore_in / 2, 2);
  const displacement_in3_per_stroke = A_in2 * stroke_length_in;
  const vol_in3_per_day = displacement_in3_per_stroke * strokes_per_min * MIN_PER_DAY;
  const vol_bbl_per_day = vol_in3_per_day / BBL_IN3;
  return vol_bbl_per_day * pump_efficiency;
}

/**
 * Fluid load on the pump plunger due to hydrostatic column weight.
 *
 * @param pump_bore_in         Pump barrel bore diameter (in)
 * @param pump_stroke_in       Plunger stroke length (in) — reserved for future use
 * @param fluid_gradient_psi_ft  Fluid pressure gradient (psi/ft)
 * @param pump_depth_ft        Pump setting depth (ft)
 * @returns                    Fluid load (lb)
 */
export function rpFluidLoad(
  pump_bore_in: number,
  pump_stroke_in: number,   // eslint-disable-line @typescript-eslint/no-unused-vars
  fluid_gradient_psi_ft: number,
  pump_depth_ft: number
): number {
  const A_in2 = RP_PI * Math.pow(pump_bore_in / 2, 2);
  const fluid_pressure_psi = fluid_gradient_psi_ft * pump_depth_ft;
  return fluid_pressure_psi * A_in2;
}

// ─── Rod String ───────────────────────────────────────────────────────────────

/**
 * Air weight of a solid steel sucker rod string.
 *
 * @param rod_OD_in    Rod body outside diameter (in)
 * @param rod_length_ft  Rod string length (ft)
 * @param rod_SG       Rod material specific gravity (default 7.85 for carbon steel)
 * @returns            Rod air weight (lb)
 */
export function rpRodWeight(
  rod_OD_in: number,
  rod_length_ft: number,
  rod_SG = 7.85
): number {
  const density_lb_ft3 = rod_SG * 62.4;
  const A_ft2 = RP_PI * Math.pow(rod_OD_in / 2 / 12, 2);
  const vol_ft3 = A_ft2 * rod_length_ft;
  return vol_ft3 * density_lb_ft3;
}

// ─── Polished Rod Loads ───────────────────────────────────────────────────────

/**
 * Peak polished rod load (PPRL) on the upstroke.
 *
 * Buoyancy reduces the effective rod weight in fluid.
 *
 * @param fluid_load_lb     Fluid load (lb)
 * @param rod_weight_lb     Rod string air weight (lb)
 * @param counterbalance_lb Counterbalance effect at surface (lb)
 * @param buoyancy_factor   Buoyancy correction factor (fraction, default 0.9)
 * @returns                 Peak polished rod load on upstroke (lb)
 */
export function rpPolishedRodLoadUp(
  fluid_load_lb: number,
  rod_weight_lb: number,
  counterbalance_lb: number,
  buoyancy_factor = 0.9
): number {
  return fluid_load_lb + rod_weight_lb * buoyancy_factor - counterbalance_lb;
}

/**
 * Minimum polished rod load (MPRL) on the downstroke.
 *
 * @param rod_weight_lb     Rod string air weight (lb)
 * @param counterbalance_lb Counterbalance effect at surface (lb)
 * @param buoyancy_factor   Buoyancy correction factor (fraction, default 0.9)
 * @returns                 Minimum polished rod load on downstroke (lb)
 */
export function rpPolishedRodLoadDown(
  rod_weight_lb: number,
  counterbalance_lb: number,
  buoyancy_factor = 0.9
): number {
  return counterbalance_lb - rod_weight_lb * buoyancy_factor;
}

// ─── Torque & Power ───────────────────────────────────────────────────────────

/**
 * Peak torque on the pumping unit gear reducer.
 *
 * Simplified API peak torque: T = (PPRL − MPRL) × stroke / 4
 *
 * @param PPRL              Peak polished rod load, upstroke (lb)
 * @param MPRL              Minimum polished rod load, downstroke (lb)
 * @param stroke_length_in  Polished rod stroke length (in)
 * @param gear_reducer_ratio  Gear reducer ratio (reserved for compatibility)
 * @returns                 Peak gear reducer torque (in-lb)
 */
export function rpPeakTorque(
  PPRL: number,
  MPRL: number,
  stroke_length_in: number,
  gear_reducer_ratio: number  // eslint-disable-line @typescript-eslint/no-unused-vars
): number {
  return (PPRL - MPRL) * stroke_length_in / 4;
}

/**
 * Counterbalance effect at a given crank angle.
 *
 * @param CBE              Counterbalance effect at 90° crank angle (lb)
 * @param crank_angle_deg  Crank position (°), 90° = top of stroke
 * @param stroke_length_in Stroke length (in) — reserved for future use
 * @returns                Effective counterbalance force at the given angle (lb)
 */
export function rpCounterbalanceEffect(
  CBE: number,
  crank_angle_deg: number,
  stroke_length_in: number  // eslint-disable-line @typescript-eslint/no-unused-vars
): number {
  return CBE * Math.sin(crank_angle_deg * RP_PI / 180);
}

/**
 * Required prime mover nameplate horsepower.
 *
 * HP = T (in-lb) × spm / 63 025
 *
 * @param torque_in_lb  Peak gear reducer torque (in-lb)
 * @param spm           Pump speed (strokes per minute)
 * @returns             Motor horsepower (hp)
 */
export function rpMotorHP(torque_in_lb: number, spm: number): number {
  return torque_in_lb * spm / 63025;
}

/**
 * Polished rod stroke length from crank radius.
 *
 * For a conventional unit the stroke length is twice the pitman crank radius.
 *
 * @param prime_mover_crank_radius_in  Crank arm radius (in)
 * @returns                            Polished rod stroke length (in)
 */
export function rpStrokeLength(prime_mover_crank_radius_in: number): number {
  return 2 * prime_mover_crank_radius_in;
}

// ─── Unit Classification ──────────────────────────────────────────────────────

/**
 * Classify a pumping unit by peak torque rating (simplified API class).
 *
 * Torque is estimated as PPRL × stroke / 4.
 *
 * | Class | Peak torque            |
 * |-------|------------------------|
 * | I     | < 40 000 in-lb         |
 * | II    | 40 000 – 114 000 in-lb |
 * | III   | 114 000 – 320 000 in-lb|
 * | IV    | > 320 000 in-lb        |
 *
 * @param PPRL             Peak polished rod load (lb)
 * @param stroke_length_in Polished rod stroke length (in)
 * @returns                Pumping unit class designation string
 */
export function rpPumpingUnitClass(PPRL: number, stroke_length_in: number): string {
  const torque_in_lb = PPRL * stroke_length_in / 4;
  if (torque_in_lb < 40_000)  return 'Class I (< 40K in-lb)';
  if (torque_in_lb < 114_000) return 'Class II (40K-114K in-lb)';
  if (torque_in_lb < 320_000) return 'Class III (114K-320K in-lb)';
  return 'Class IV (> 320K in-lb)';
}
