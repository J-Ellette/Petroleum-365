/**
 * P365 — Gas Lift (GL)
 *
 * Gas lift valve design, optimization, and performance calculations.
 *
 * Units: field (bbl/d, Mscfd, psia, ft, °R).
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

const GL_K = 1.28;           // ratio of specific heats for natural gas
const GL_PI = Math.PI;

// ─── Gas Lift Rates & GLR ─────────────────────────────────────────────────────

/**
 * Compute the producing gas-liquid ratio (GLR) from field rates.
 *
 * @param q_oil_bpd    Oil rate (bbl/d)
 * @param q_gas_scfd   Total gas rate (scf/d)
 * @param q_water_bpd  Water rate (bbl/d)
 * @returns            Producing GLR (scf/bbl)
 */
export function glTargetGLR(
  q_oil_bpd: number,
  q_gas_scfd: number,
  q_water_bpd: number
): number {
  const total_liquid_bpd = q_oil_bpd + q_water_bpd;
  return q_gas_scfd / total_liquid_bpd;
}

/**
 * Required gas injection rate to achieve a target GLR.
 *
 * @param q_liquid_bpd          Total liquid rate (bbl/d)
 * @param target_GLR_scf_bbl    Target GLR (scf/bbl)
 * @param current_GLR_scf_bbl   Current formation GLR (scf/bbl)
 * @returns                     Required injection rate (Mscfd), clamped to >= 0
 */
export function glRequiredInjectionRate(
  q_liquid_bpd: number,
  target_GLR_scf_bbl: number,
  current_GLR_scf_bbl: number
): number {
  const injection_scfd = (target_GLR_scf_bbl - current_GLR_scf_bbl) * q_liquid_bpd;
  return Math.max(0, injection_scfd / 1000);
}

/**
 * Total GLR after gas injection.
 *
 * @param formation_GLR         Formation (producing) GLR (scf/bbl)
 * @param injection_rate_Mscfd  Injected gas rate (Mscfd)
 * @param q_liquid_bpd          Total liquid rate (bbl/d)
 * @returns                     Total GLR (scf/bbl)
 */
export function glTotalGLR(
  formation_GLR: number,
  injection_rate_Mscfd: number,
  q_liquid_bpd: number
): number {
  return formation_GLR + (injection_rate_Mscfd * 1000) / q_liquid_bpd;
}

// ─── Valve Throughput ─────────────────────────────────────────────────────────

/**
 * Thornhill-Craver orifice equation for gas lift valve throughput.
 *
 * Selects critical or subcritical flow regime based on the pressure ratio
 * (P_down / P_up) vs. the critical pressure ratio for k = 1.28.
 *
 * @param P_up_psia       Upstream (injection) pressure (psia)
 * @param P_down_psia     Downstream (tubing) pressure (psia)
 * @param port_size_64ths Port diameter in 64ths of an inch (e.g. 16 → 16/64 in)
 * @param SG_gas          Gas specific gravity (air = 1.0)
 * @param T_R             Gas temperature (°R)
 * @returns               Gas throughput (Mscfd), clamped to >= 0
 */
export function thornhillCraver(
  P_up_psia: number,
  P_down_psia: number,
  port_size_64ths: number,
  SG_gas: number,
  T_R: number
): number {
  const k = GL_K;
  const port_diameter_in = port_size_64ths / 64;
  const A_in2 = GL_PI * Math.pow(port_diameter_in / 2, 2);

  const critical_ratio = Math.pow(2 / (k + 1), k / (k - 1));
  const pressure_ratio = P_down_psia / P_up_psia;

  let q_Mscfd: number;

  if (pressure_ratio < critical_ratio) {
    // Critical (choked) flow
    const flow_coeff = Math.sqrt(k / (k + 1)) * Math.pow(2 / (k + 1), 1 / (k - 1));
    q_Mscfd = 155.5 * A_in2 * P_up_psia / Math.sqrt(SG_gas * T_R) * flow_coeff;
  } else {
    // Subcritical flow — isentropic expansion
    const pr_2k    = Math.pow(pressure_ratio, 2 / k);
    const pr_k1_k  = Math.pow(pressure_ratio, (k + 1) / k);
    const radicand = (2 * k / (k - 1)) * (pr_2k - pr_k1_k);
    q_Mscfd = 155.5 * A_in2 * P_up_psia / Math.sqrt(SG_gas * T_R) * Math.sqrt(Math.max(0, radicand));
  }

  return Math.max(0, q_Mscfd);
}

// ─── Valve Pressure Design ────────────────────────────────────────────────────

/**
 * Gas lift valve dome pressure at depth, accounting for gas column gradient.
 *
 * @param surface_dome_pressure_psia  Dome pressure at surface (psia)
 * @param gradient_psi_ft             Gas column pressure gradient (psi/ft)
 * @param depth_ft                    Valve setting depth (ft)
 * @returns                           Dome pressure at depth (psia)
 */
export function glValveDomePressure(
  surface_dome_pressure_psia: number,
  gradient_psi_ft: number,
  depth_ft: number
): number {
  return surface_dome_pressure_psia + gradient_psi_ft * depth_ft;
}

/**
 * Test-rack opening (TRO) pressure of a nitrogen-charged gas lift valve.
 *
 * @param dome_pressure_psia  Dome (bellows) pressure at test conditions (psia)
 * @param area_ratio_Av_Ab    Port-to-bellows area ratio (Av / Ab), dimensionless
 * @returns                   Test-rack opening pressure, Ptro (psia)
 */
export function glValveTRO(
  dome_pressure_psia: number,
  area_ratio_Av_Ab: number
): number {
  return dome_pressure_psia / (1 - area_ratio_Av_Ab);
}

/**
 * Gas lift valve closing pressure at operating conditions.
 *
 * @param dome_pressure_psia        Valve dome pressure at depth (psia)
 * @param production_pressure_psia  Tubing (production) pressure at valve depth (psia)
 * @param area_ratio                Port-to-bellows area ratio (Av / Ab), dimensionless
 * @returns                         Valve closing pressure, Pvc (psia)
 */
export function glValveClosingPressure(
  dome_pressure_psia: number,
  production_pressure_psia: number,
  area_ratio: number
): number {
  return (dome_pressure_psia - area_ratio * production_pressure_psia) / (1 - area_ratio);
}

// ─── Injection Pressure Profile ───────────────────────────────────────────────

/**
 * Casing injection pressure at depth (static gas column).
 *
 * @param surface_pressure_psia  Surface casing (injection) pressure (psia)
 * @param gas_gradient_psi_ft    Gas column gradient (psi/ft), typically ~0.01–0.025
 * @param depth_ft               Depth of interest (ft)
 * @returns                      Injection pressure at depth (psia)
 */
export function glInjectionPressureAtDepth(
  surface_pressure_psia: number,
  gas_gradient_psi_ft: number,
  depth_ft: number
): number {
  return surface_pressure_psia + gas_gradient_psi_ft * depth_ft;
}

// ─── Flow Regime Check ────────────────────────────────────────────────────────

/**
 * Determine whether gas flow through a valve orifice is critical (choked).
 *
 * @param P_up   Upstream pressure (psia)
 * @param P_down Downstream pressure (psia)
 * @returns      true if flow is critical (choked), false if subcritical
 */
export function glCriticalFlowCheck(P_up: number, P_down: number): boolean {
  const k = GL_K;
  const critical_ratio = Math.pow(2 / (k + 1), k / (k - 1));
  return P_down / P_up < critical_ratio;
}

// ─── Valve Placement Optimization ─────────────────────────────────────────────

/**
 * Select the optimal (deepest feasible) gas lift valve injection depth.
 *
 * Finds the intersection of the casing injection pressure profile and a
 * tubing pressure profile assumed to originate from zero pressure at surface
 * (gradient-only model).  Returns the deepest candidate depth that is at or
 * above the intersection, i.e. where injection pressure still exceeds the
 * tubing gradient pressure.
 *
 * d_intersect = surface_casing_pressure / (tubing_gradient - casing_gradient)
 *
 * @param tubing_gradient_psi_ft         Tubing fluid pressure gradient (psi/ft)
 * @param casing_gradient_psi_ft         Injection gas column gradient (psi/ft)
 * @param surface_casing_pressure_psia   Surface casing (injection) pressure (psia)
 * @param depth_arr_ft                   Candidate valve depths (ft), any order
 * @returns                              Optimal injection depth (ft), or NaN if depth_arr_ft is empty
 */
export function glOptimalInjectionDepth(
  tubing_gradient_psi_ft: number,
  casing_gradient_psi_ft: number,
  surface_casing_pressure_psia: number,
  depth_arr_ft: number[]
): number {
  const d_intersect =
    surface_casing_pressure_psia / (tubing_gradient_psi_ft - casing_gradient_psi_ft);

  if (depth_arr_ft.length === 0) return NaN;

  const feasible = depth_arr_ft.filter(d => d <= d_intersect);

  if (feasible.length === 0) return depth_arr_ft[0];
  return Math.max(...feasible);
}
