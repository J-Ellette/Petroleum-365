/**
 * P365 — Electric Submersible Pump (ESP)
 *
 * Sizing and performance calculations for ESP systems.
 *
 * Units: field (bbl/d, ft, psia, hp, A, V).
 */

// ─── Total Dynamic Head ────────────────────────────────────────────────────────

/**
 * Total Dynamic Head (TDH) for an ESP installation.
 *
 * TDH_ft = (Pwh + 0.433·SG·depth − Pr) · 2.31 / SG
 *
 * The 2.31/SG factor converts psi to ft of fluid head.
 *
 * @param Pr_psia      Reservoir (flowing bottomhole) pressure (psia)
 * @param Pwh_psia     Wellhead flowing pressure (psia)
 * @param depth_ft     Pump setting depth (ft)
 * @param SG_fluid     Produced fluid specific gravity (water = 1.0)
 * @param Pb_psia      Bubble-point pressure (psia) — reserved for future use
 * @param Gor_scf_bbl  Gas-oil ratio (scf/bbl) — reserved for future use
 * @param Bg           Gas formation volume factor (bbl/scf) — reserved for future use
 * @returns            Total dynamic head (ft)
 */
export function espTDH(
  Pr_psia: number,
  Pwh_psia: number,
  depth_ft: number,
  SG_fluid: number,
  Pb_psia?: number,
  Gor_scf_bbl?: number,
  Bg?: number
): number {
  // Suppress unused-parameter lint warnings; parameters reserved for future multiphase TDH
  void Pb_psia;
  void Gor_scf_bbl;
  void Bg;

  return (Pwh_psia + 0.433 * SG_fluid * depth_ft - Pr_psia) * 2.31 / SG_fluid;
}

// ─── Hydraulic Horsepower ──────────────────────────────────────────────────────

/**
 * Hydraulic (water) horsepower required by the pump.
 *
 * Converts bbl/d to gal/min (1 bbl = 42 gal, 1 d = 1440 min), then:
 * HHP = q_gpm · SG · TDH_ft / 3960
 *
 * @param q_bpd   Liquid production rate (bbl/d)
 * @param TDH_ft  Total dynamic head (ft)
 * @param SG      Produced fluid specific gravity (water = 1.0)
 * @returns       Hydraulic horsepower (hp)
 */
export function espHydraulicHP(q_bpd: number, TDH_ft: number, SG: number): number {
  const q_gpm = q_bpd * 42 / 1440;
  return q_gpm * SG * TDH_ft / 3960;
}

// ─── Brake Horsepower ─────────────────────────────────────────────────────────

/**
 * Brake (shaft) horsepower accounting for pump efficiency.
 *
 * BHP = HHP / pump_efficiency
 *
 * @param HHP              Hydraulic horsepower (hp)
 * @param pump_efficiency  Pump efficiency (fraction, e.g. 0.65)
 * @returns                Brake horsepower (hp)
 */
export function espBrakeHP(HHP: number, pump_efficiency: number): number {
  return HHP / pump_efficiency;
}

// ─── Pump Stages ──────────────────────────────────────────────────────────────

/**
 * Number of pump stages required to develop a given TDH.
 *
 * stages = ⌈TDH / head_per_stage⌉
 *
 * @param TDH_ft             Total dynamic head (ft)
 * @param head_per_stage_ft  Head developed per pump stage at operating rate (ft/stage)
 * @returns                  Number of stages (rounded up to next integer)
 */
export function espPumpStages(TDH_ft: number, head_per_stage_ft: number): number {
  return Math.ceil(TDH_ft / head_per_stage_ft);
}

// ─── Motor Horsepower ─────────────────────────────────────────────────────────

/**
 * Motor nameplate horsepower including efficiency and service factor.
 *
 * motor_hp = BHP / motor_efficiency · service_factor
 *
 * @param BHP               Brake horsepower required at pump shaft (hp)
 * @param motor_efficiency  Motor efficiency (fraction, e.g. 0.93)
 * @param service_factor    Motor service factor (default 1.15)
 * @returns                 Required motor nameplate rating (hp)
 */
export function espMotorHP(
  BHP: number,
  motor_efficiency: number,
  service_factor = 1.15
): number {
  return BHP / motor_efficiency * service_factor;
}

// ─── Motor Current ────────────────────────────────────────────────────────────

/**
 * Motor nameplate current draw.
 *
 * current_A = motor_hp · 746 / (voltage · power_factor · motor_efficiency)
 *
 * (746 W/hp converts mechanical hp to electrical watts.)
 *
 * @param motor_hp          Motor nameplate rating (hp)
 * @param voltage           Supply voltage (V)
 * @param power_factor      Motor power factor (default 0.85)
 * @param motor_efficiency  Motor efficiency (fraction, default 0.93)
 * @returns                 Motor current (A)
 */
export function espMotorCurrent(
  motor_hp: number,
  voltage: number,
  power_factor = 0.85,
  motor_efficiency = 0.93
): number {
  return motor_hp * 746 / (voltage * power_factor * motor_efficiency);
}

// ─── Cable Voltage Drop ───────────────────────────────────────────────────────

/**
 * Voltage drop along the power cable from surface to motor.
 *
 * Accounts for both the downward and return conductors (factor of 2).
 * voltage_drop = current · cable_resistance_per_1000ft · depth / 1000 · 2
 *
 * @param current_A                     Motor current (A)
 * @param cable_resistance_ohm_per_1000ft  Cable resistance (Ω per 1000 ft)
 * @param depth_ft                      Pump setting depth (ft)
 * @returns                             Total cable voltage drop (V)
 */
export function espCableVoltageDrop(
  current_A: number,
  cable_resistance_ohm_per_1000ft: number,
  depth_ft: number
): number {
  const total_resistance = cable_resistance_ohm_per_1000ft * depth_ft / 1000 * 2;
  return current_A * total_resistance;
}

// ─── Void Fraction ────────────────────────────────────────────────────────────

/**
 * In-situ gas void fraction at pump intake conditions.
 *
 * Converts free-gas rate to reservoir bbl/d using the provided Bg, then:
 * void_fraction = q_gas_bpd / (q_liquid_bpd + q_gas_bpd)
 *
 * @param q_liquid_bpd  Liquid production rate at pump intake (bbl/d)
 * @param q_gas_scfd    Free-gas rate at standard conditions (scf/d)
 * @param Bg_bbl_scf    Gas formation volume factor at pump intake conditions (bbl/scf)
 * @param P_psia        Pump intake pressure (psia) — reserved for future use
 * @param T_R           Pump intake temperature (°R) — reserved for future use
 * @returns             Void fraction (0–1, dimensionless)
 */
export function espVoidFraction(
  q_liquid_bpd: number,
  q_gas_scfd: number,
  Bg_bbl_scf: number,
  P_psia: number,
  T_R: number
): number {
  // Suppress unused-parameter warnings; P_psia and T_R reserved for future in-situ Bg calculation
  void P_psia;
  void T_R;

  const q_gas_bpd    = q_gas_scfd * Bg_bbl_scf;
  const void_fraction = q_gas_bpd / (q_liquid_bpd + q_gas_bpd);
  return Math.max(0, Math.min(1, void_fraction));
}

// ─── Gas Handling Assessment ──────────────────────────────────────────────────

/**
 * Assess gas handling requirements based on pump intake void fraction.
 *
 *  void_fraction < 0.10 → Low risk, no separator needed
 *  void_fraction < 0.30 → Medium risk, separator recommended
 *  void_fraction ≥ 0.30 → High risk, separator required
 *
 * @param void_fraction  Gas void fraction at pump intake (0–1)
 * @returns              {needs_separator, risk_level}
 */
export function espGasHandling(void_fraction: number): {
  needs_separator: boolean;
  risk_level: string;
} {
  if (void_fraction < 0.10) return { needs_separator: false, risk_level: 'Low' };
  if (void_fraction < 0.30) return { needs_separator: true,  risk_level: 'Medium' };
  return                           { needs_separator: true,  risk_level: 'High' };
}

// ─── Operating Point ──────────────────────────────────────────────────────────

/**
 * Locate the ESP operating point where the pump head curve crosses the TDH line.
 *
 * Scans the head curve for the first interval where head transitions across TDH,
 * then linearly interpolates to find the exact crossover flow rate.
 *
 *  - If TDH > all heads (pump undersized): returns {q_op: 0, head_op: head_arr[0]}
 *  - If TDH < all heads (pump oversized):  returns {q_op: q_last, head_op: head_last}
 *
 * @param q_bpd_arr  Flow rates along the pump curve (bbl/d), ascending
 * @param head_arr   Pump heads at each flow rate (ft), typically descending
 * @param TDH_ft     System total dynamic head (ft)
 * @returns          {q_op: operating flow rate (bbl/d), head_op: operating head (ft)}
 */
export function espOperatingPoint(
  q_bpd_arr: number[],
  head_arr: number[],
  TDH_ft: number
): { q_op: number; head_op: number } {
  const n = q_bpd_arr.length;

  if (n === 0) return { q_op: 0, head_op: 0 };

  // TDH above the entire curve — pump cannot develop enough head
  if (TDH_ft > Math.max(...head_arr)) {
    return { q_op: 0, head_op: head_arr[0] };
  }

  // TDH below the entire curve — operating point is beyond the curve end
  if (TDH_ft < Math.min(...head_arr)) {
    return { q_op: q_bpd_arr[n - 1], head_op: head_arr[n - 1] };
  }

  // Find crossover interval and interpolate
  for (let i = 0; i < n - 1; i++) {
    const h0 = head_arr[i];
    const h1 = head_arr[i + 1];
    if ((h0 >= TDH_ft && h1 < TDH_ft) || (h0 <= TDH_ft && h1 > TDH_ft)) {
      const frac  = (TDH_ft - h0) / (h1 - h0);
      const q_op  = q_bpd_arr[i] + frac * (q_bpd_arr[i + 1] - q_bpd_arr[i]);
      return { q_op, head_op: TDH_ft };
    }
  }

  // Exact match at a data point
  const idx = head_arr.indexOf(TDH_ft);
  return { q_op: q_bpd_arr[idx], head_op: TDH_ft };
}
