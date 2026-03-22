/**
 * P365 — Wellbore Heat Transfer (WHT)
 *
 * Implements geothermal temperature profile, overall heat transfer coefficient,
 * Ramey (1962) fluid temperature model, insulation sizing, and heat loss rate.
 *
 * Units: field (°F, BTU, hr, ft, in, bbl/d, lb).
 */

// ─── Exported Functions ───────────────────────────────────────────────────────

/**
 * Formation (geothermal) temperature at a given depth.
 *
 * T(depth) = surface_T + gradient · depth / 100
 *
 * @param depth_ft               Depth (ft)
 * @param surface_T_degF         Surface temperature (°F)
 * @param gradient_degF_per_100ft Geothermal gradient (°F/100 ft)
 * @returns                      Temperature at depth (°F)
 */
export function whtGeothermalTemp(
  depth_ft: number,
  surface_T_degF: number,
  gradient_degF_per_100ft: number
): number {
  return surface_T_degF + gradient_degF_per_100ft * depth_ft / 100;
}

/**
 * Overall heat transfer coefficient based on tubing outer surface.
 *
 * Cylindrical resistance model (per unit length then converted to per ft²):
 *   U_to = 1 / [ r_to/r_ti/h_i
 *                + r_to·ln(r_to/r_ti)/k_tubing
 *                + r_to/(r_ci·h_ann)
 *                + r_to·ln(r_co/r_ci)/k_cement ]
 *
 * @param r_ti        Tubing inner radius (in)
 * @param r_to        Tubing outer radius (in)
 * @param r_ci        Casing inner radius (in)
 * @param r_co        Casing outer radius (in)
 * @param k_tubing    Tubing thermal conductivity (BTU/hr/ft/°F), default 26
 * @param k_cement    Cement thermal conductivity (BTU/hr/ft/°F), default 0.5
 * @param h_ann       Annulus convection coefficient (BTU/hr/ft²/°F), default 10
 * @returns           Overall HTC referenced to tubing OD (BTU/hr/ft²/°F)
 */
export function whtOHTC(
  r_ti: number,
  r_to: number,
  r_ci: number,
  r_co: number,
  k_tubing = 26,
  k_cement = 0.5,
  h_ann = 10
): number {
  const h_i = 200;  // inner convection coefficient, BTU/hr/ft²/°F (flowing fluid)

  // All radii in consistent units (in — ratios are dimensionless)
  const R_inner   = r_to / (r_ti * h_i);
  const R_tubing  = r_to * Math.log(r_to / r_ti) / k_tubing;
  const R_ann     = r_to / (r_ci * h_ann);
  const R_cement  = r_to * Math.log(r_co / r_ci) / k_cement;

  return 1.0 / (R_inner + R_tubing + R_ann + R_cement);
}

/**
 * Fluid temperature profile along wellbore using Ramey's (1962) model.
 *
 * T_f(z) = T_s(z) + A·g_T − [T_s(0) + A·g_T − T_in] · exp(−z/A)
 *
 * where:
 *   T_s(z) = surface_T + gradient·z/100  (formation temperature)
 *   g_T    = gradient/100                 (°F/ft)
 *   A      = ṁ·Cp / (π·d·U)              (relaxation length, ft)
 *   ṁ      = mass flow rate (lb/hr)
 *   d      = tubing ID (ft)
 *
 * @param q_bbl_d                  Liquid flow rate (bbl/d)
 * @param T_surf_degF              Surface temperature (°F)
 * @param depth_ft                 Total depth (ft)
 * @param gradient_degF_per_100ft  Geothermal gradient (°F/100 ft)
 * @param U_BTU_hr_ft2_F           Overall HTC (BTU/hr/ft²/°F)
 * @param tubing_id_in             Tubing inner diameter (in)
 * @param rho_lb_ft3               Fluid density (lb/ft³)
 * @param Cp_BTU_lb_F              Fluid heat capacity (BTU/lb/°F)
 * @returns                        { T_bhf, T_profile }
 */
export function whtFluidTemp(
  q_bbl_d: number,
  T_surf_degF: number,
  depth_ft: number,
  gradient_degF_per_100ft: number,
  U_BTU_hr_ft2_F: number,
  tubing_id_in: number,
  rho_lb_ft3: number,
  Cp_BTU_lb_F: number
): {
  T_bhf: number;
  T_profile: Array<{ depth_ft: number; T_fluid_degF: number; T_formation_degF: number }>;
} {
  const g_T = gradient_degF_per_100ft / 100;  // °F/ft
  const d_ft = tubing_id_in / 12;              // tubing ID in ft

  // Mass flow rate: bbl/d → ft³/d → ft³/hr → lb/hr
  const q_ft3_d  = q_bbl_d * 5.61458;
  const q_ft3_hr = q_ft3_d / 24;
  const w_dot    = q_ft3_hr * rho_lb_ft3;     // lb/hr

  // Relaxation length A (ft)
  const A = w_dot * Cp_BTU_lb_F / (Math.PI * d_ft * U_BTU_hr_ft2_F);

  const T_in = T_surf_degF;  // fluid enters at surface temperature

  // Ramey profile at depth z (injection-style: surface → bottom, T_in at z=0)
  // T_f(z) = T_s(z) - A·g_T + (T_in - T_s0 + A·g_T)·exp(-z/A)
  const T_fluid = (z: number): number => {
    const T_s_z = T_surf_degF + g_T * z;
    return T_s_z - A * g_T + (T_in - T_surf_degF + A * g_T) * Math.exp(-z / A);
  };

  const nPts = 10;
  const T_profile = Array.from({ length: nPts }, (_, i) => {
    const z = depth_ft * i / (nPts - 1);
    return {
      depth_ft: z,
      T_fluid_degF: T_fluid(z),
      T_formation_degF: T_surf_degF + g_T * z,
    };
  });

  return { T_bhf: T_fluid(depth_ft), T_profile };
}

/**
 * Required insulation thickness to achieve U ≤ U_max.
 *
 * Based on cylindrical conduction: U = k_insul / (r_pipe · ln(1 + t/r_pipe))
 * Solved for t: t = r_pipe · (exp(k_insul / (U_max · r_pipe)) − 1)
 *
 * @param T_fluid         Fluid temperature (°F) — for reference, not used in formula
 * @param T_ambient       Ambient temperature (°F) — for reference, not used in formula
 * @param U_max           Maximum allowable HTC (BTU/hr/ft²/°F)
 * @param r_pipe_outer_in Pipe outer radius (in)
 * @param k_insul         Insulation thermal conductivity (BTU/hr/ft/°F)
 * @returns               Required insulation thickness (in)
 */
export function whtInsulationThickness(
  T_fluid: number,
  T_ambient: number,
  U_max: number,
  r_pipe_outer_in: number,
  k_insul: number
): number {
  void T_fluid; void T_ambient;  // available for extended heat-loss constraint models
  if (U_max <= 0) throw new Error("U_max must be positive");
  if (r_pipe_outer_in <= 0) throw new Error("Pipe radius must be positive");
  return r_pipe_outer_in * (Math.exp(k_insul / (U_max * r_pipe_outer_in)) - 1);
}

/**
 * Total heat loss from tubing to surroundings.
 *
 * Q_loss = U · π · d_o · depth · (T_fluid_avg − T_ambient)
 *
 * @param q_bbl_d        Liquid rate (bbl/d) — reserved for future velocity effects
 * @param T_fluid_avg    Average fluid temperature (°F)
 * @param T_ambient      Ambient/formation temperature (°F)
 * @param U              Overall HTC (BTU/hr/ft²/°F)
 * @param tubing_od_in   Tubing outer diameter (in)
 * @param depth_ft       Wellbore length (ft)
 * @returns              Heat loss rate (BTU/hr)
 */
export function whtHeatLoss(
  q_bbl_d: number,
  T_fluid_avg: number,
  T_ambient: number,
  U: number,
  tubing_od_in: number,
  depth_ft: number
): number {
  void q_bbl_d;  // reserved
  const d_o_ft = tubing_od_in / 12;
  return U * Math.PI * d_o_ft * depth_ft * (T_fluid_avg - T_ambient);
}
