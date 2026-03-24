/**
 * P365 — Vertical Flow Performance (VFP)
 *
 * Pressure-drop correlations for flow in wellbores and pipes:
 *   Single-phase liquid (Fanning/Darcy-Weisbach)
 *   Single-phase gas (average T-Z method)
 *   Beggs & Brill (1973) multiphase — any inclination
 *   Gray (1974) — gas-condensate wells
 *   Hagedorn & Brown (1965) — oil wells
 *   Orkiszewski (1967) — oil wells
 *
 * Units: field (bbl/d, Mscf/d, psia, ft, °F, cp, in).
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

const G_FT_S2 = 32.174;      // gravitational acceleration ft/s²
const PI_CONST = Math.PI;
const SCFM_TO_FT3S = 1.0 / 60.0;
/** Default oil-gas surface tension (lbf/ft) ≈ 30 dyne/cm — typical crude oil at reservoir conditions. */
const DEFAULT_OIL_GAS_SIGMA_LBF_FT = 0.04;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Moody friction factor from Colebrook-White (Churchill approximation). */
function moodyFriction(Re: number, roughness: number, D: number): number {
  if (Re < 2100) return 64 / Re;  // laminar
  const relRough = roughness / D;
  // Swamee-Jain explicit approximation
  const f = 0.25 / Math.pow(Math.log10(relRough / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
  return f;
}

/** Area of a circle (ft²) from diameter in inches. */
function areaFt2(D_in: number): number {
  const D_ft = D_in / 12;
  return PI_CONST * D_ft * D_ft / 4;
}

// ─── Single-Phase Liquid ───────────────────────────────────────────────────────

/**
 * Single-phase liquid pressure drop in a pipe (Fanning/Darcy-Weisbach).
 *
 * Includes friction and gravity components.
 * Darcy-Weisbach: ΔPf = f * (L/D) * (ρ·v²/2) / 144  (psi)
 * Gravity:        ΔPel = ρ * L * sin(θ) / 144          (psi)
 *
 * @param q_bpd      Liquid flow rate (bbl/d)
 * @param D_in       Pipe inside diameter (in)
 * @param L_ft       Pipe length (ft)
 * @param SG         Liquid specific gravity (water = 1.0)
 * @param angle_deg  Inclination from horizontal (°), 90 = vertical upward
 * @param roughness  Absolute roughness (ft), default bare steel 0.00015
 * @returns          Total pressure drop (psi), positive = downward (pump work)
 */
export function singlePhaseLiquidDeltaP(
  q_bpd: number,
  D_in: number,
  L_ft: number,
  SG: number,
  angle_deg = 90,
  roughness = 0.00015
): number {
  const rho_lb_ft3 = SG * 62.4;                 // lb/ft³
  const A_ft2      = areaFt2(D_in);
  const q_ft3s     = q_bpd * 5.615 / 86400;     // bbl/d → ft³/s
  const v_fts      = q_ft3s / A_ft2;            // ft/s
  const D_ft       = D_in / 12;
  const mu_cp      = 1.0;                        // default water viscosity
  const Re         = rho_lb_ft3 * v_fts * D_ft / (mu_cp * 6.72e-4);
  const f          = moodyFriction(Re, roughness, D_ft);
  // Darcy friction loss (Darcy-Weisbach uses 4f for Fanning, we use Darcy f directly)
  const dPf_psi    = f * (L_ft / D_ft) * rho_lb_ft3 * v_fts * v_fts / (2 * G_FT_S2 * 144);
  const dPel_psi   = rho_lb_ft3 * L_ft * Math.sin(angle_deg * PI_CONST / 180) / 144;
  return dPf_psi + dPel_psi;
}

/**
 * Single-phase liquid outlet pressure.
 *
 * @param P_inlet_psia  Inlet (surface) pressure (psia)
 * @param q_bpd         Liquid flow rate (bbl/d)
 * @param D_in          Pipe inside diameter (in)
 * @param L_ft          Pipe length (ft)
 * @param SG            Liquid specific gravity
 * @param angle_deg     Inclination from horizontal (°), 90 = vertical downward flow
 * @returns             Outlet pressure (psia) — bottomhole if flowing down
 */
export function singlePhaseLiquidBHP(
  P_inlet_psia: number,
  q_bpd: number,
  D_in: number,
  L_ft: number,
  SG: number,
  angle_deg = 90,
  roughness = 0.00015
): number {
  return P_inlet_psia + singlePhaseLiquidDeltaP(q_bpd, D_in, L_ft, SG, angle_deg, roughness);
}

// ─── Single-Phase Gas ──────────────────────────────────────────────────────────

/**
 * Single-phase gas bottomhole pressure — average T-Z method.
 *
 * P_wf² = P_wh² · e^(2s) + (f · Q² · γg · T̄² · z̄² · L) / (K · D^5) · (e^(2s) − 1) / (2s)
 * where s = 0.0375 · γg · L / (T̄ · z̄)   (for vertical well, 0.0375 for field units)
 *
 * Reference: Lee & Wattenbarger (1996) "Gas Reservoir Engineering"
 * Field units: Q in Mscf/d, P in psia, T in °R, L in ft, D in in.
 *
 * @param Pwh_psia   Wellhead (inlet) pressure (psia)
 * @param q_mscfd    Gas flow rate (Mscf/d)
 * @param D_in       Tubing inside diameter (in)
 * @param L_ft       Well depth / pipe length (ft)
 * @param T_avg_R    Average temperature (°R)
 * @param z_avg      Average gas compressibility factor
 * @param SG_gas     Gas specific gravity (air = 1.0)
 * @param roughness  Absolute roughness (ft), default 0.00015
 * @returns          Bottomhole flowing pressure (psia)
 */
export function singlePhaseGasBHP(
  Pwh_psia: number,
  q_mscfd: number,
  D_in: number,
  L_ft: number,
  T_avg_R: number,
  z_avg: number,
  SG_gas: number,
  roughness = 0.00015
): number {
  const s = 0.0375 * SG_gas * L_ft / (T_avg_R * z_avg);
  const es2 = Math.exp(2 * s);

  // Friction factor (gas flow, Colebrook-White)
  const D_ft = D_in / 12;
  // Reynolds number estimate (gas at avg conditions): Re = 20.09 * γg * Q / (D * μg)
  // Use μg ≈ 0.012 cp for typical gas; iterate if needed
  const mu_est = 0.012;
  const Re = 20.09 * SG_gas * q_mscfd / (D_in * mu_est);
  const f = moodyFriction(Re, roughness, D_ft);

  // Field-unit constant: (1e3 * 4.35e-4)²/pi² ≈ use direct derivation
  // Friction term: f * q² * γg * T̄² * z̄² * L / (d^5) * (e^2s - 1) / 2s
  // Standard derivation constant: K = 6.67e-4 (Craft-Hawkins form)
  // Pwf² = Pwh² * e^2s + (f * q^2 * γg * z̄² * T̄² * L) / (1.1096e10 * D^5) * (e^2s - 1)/(2s)
  // where q in Mscfd, D in in, T in °R, L in ft
  // Numerator constant from unit analysis: (Mscfd→scfd = 1000) field units combine
  const K = 1.1096e10;  // field-unit combination constant
  const frictionTerm = (f * q_mscfd * q_mscfd * SG_gas * z_avg * z_avg * T_avg_R * T_avg_R * L_ft)
    / (K * Math.pow(D_in, 5));

  const Pwf2 = Pwh_psia * Pwh_psia * es2 + frictionTerm * (es2 - 1) / (2 * s > 1e-10 ? 2 * s : 1e-10);
  return Math.sqrt(Math.max(Pwf2, 0));
}

/**
 * Pressure drop for single-phase gas pipe segment.
 *
 * @param P1_psia    Inlet pressure (psia)
 * @param q_mscfd    Gas flow rate (Mscf/d)
 * @param D_in       Inside diameter (in)
 * @param L_ft       Pipe length (ft)
 * @param T_avg_R    Average temperature (°R)
 * @param z_avg      Average Z-factor
 * @param SG_gas     Gas specific gravity
 * @returns          Outlet pressure (psia)
 */
export function singlePhaseGasOutletP(
  P1_psia: number,
  q_mscfd: number,
  D_in: number,
  L_ft: number,
  T_avg_R: number,
  z_avg: number,
  SG_gas: number,
  roughness = 0.00015
): number {
  // For horizontal pipe (no gravity term), use simplified form
  const D_ft = D_in / 12;
  const mu_est = 0.012;
  const Re = 20.09 * SG_gas * q_mscfd / (D_in * mu_est);
  const f = moodyFriction(Re, roughness, D_ft);
  const K = 1.1096e10;
  const frictionTerm = (f * q_mscfd * q_mscfd * SG_gas * z_avg * z_avg * T_avg_R * T_avg_R * L_ft)
    / (K * Math.pow(D_in, 5));
  const P2_sq = P1_psia * P1_psia - frictionTerm;
  return Math.sqrt(Math.max(P2_sq, 0));
}

// ─── Beggs & Brill (1973) Multiphase ──────────────────────────────────────────

/**
 * Beggs & Brill (1973) multiphase pressure gradient.
 *
 * Returns the total pressure gradient (psi/ft) including gravity and friction
 * components. Valid for any inclination angle.
 *
 * @param q_liq_bpd   Liquid (oil+water) flow rate (bbl/d)
 * @param q_gas_mscfd Gas flow rate (Mscf/d)
 * @param D_in        Inside diameter (in)
 * @param P_psia      Local pressure (psia)
 * @param T_F         Temperature (°F)
 * @param SG_liq      Liquid specific gravity (water = 1.0)
 * @param SG_gas      Gas specific gravity (air = 1.0)
 * @param angle_deg   Inclination from horizontal (°), 90 = vertical upward
 * @returns           Pressure gradient (psi/ft), positive = flowing upward (BHP > WHP)
 */
export function beggsBrillGradient(
  q_liq_bpd: number,
  q_gas_mscfd: number,
  D_in: number,
  P_psia: number,
  T_F: number,
  SG_liq: number,
  SG_gas: number,
  angle_deg = 90
): number {
  const T_R = T_F + 459.67;
  const D_ft = D_in / 12;
  const A_ft2 = areaFt2(D_in);

  // Liquid and gas volumetric flow rates at in-situ conditions
  const rho_liq  = SG_liq * 62.4;                               // lb/ft³
  const rho_gas  = (SG_gas * 28.97 * P_psia) / (10.73 * T_R);  // lb/ft³ (ideal gas approx)
  const q_liq_ft3s = q_liq_bpd * 5.615 / 86400;
  const q_gas_ft3s = q_gas_mscfd * 1000 * T_R * 14.7 / (520 * P_psia * 86400); // actual ft³/s

  const Vsl = q_liq_ft3s / A_ft2;  // superficial liquid velocity (ft/s)
  const Vsg = q_gas_ft3s / A_ft2;  // superficial gas velocity (ft/s)
  const Vm  = Vsl + Vsg;           // mixture velocity (ft/s)

  if (Vm < 1e-10) return 0;

  const lambda_L = Vsl / Vm;       // no-slip liquid holdup

  // ─── Flow Pattern Determination (Beggs-Brill 1973) ───────────────────────
  const NFr = Vm * Vm / (G_FT_S2 * D_ft);   // Froude number
  const NLv = Vsl * Math.pow(rho_liq / (G_FT_S2 * 0.00694), 0.25);  // liquid velocity number

  // Flow pattern boundaries (horizontal)
  const L1 = 316 * Math.pow(lambda_L, 0.302);
  const L2 = 0.0009252 * Math.pow(lambda_L, -2.4684);
  const L3 = 0.10 * Math.pow(lambda_L, -1.4516);
  const L4 = 0.5 * Math.pow(lambda_L, 6.738);

  let pattern: "segregated" | "intermittent" | "distributed";
  if ((lambda_L < 0.01 && NFr < L1) || (lambda_L >= 0.01 && NFr < L2)) {
    pattern = "segregated";
  } else if (lambda_L >= 0.01 && NFr > L3 && NFr <= L1) {
    pattern = "intermittent";
  } else if ((lambda_L < 0.01 && NFr >= L1) || (lambda_L >= 0.01 && NFr > L4)) {
    pattern = "distributed";
  } else {
    pattern = "intermittent";
  }

  // ─── Horizontal Liquid Holdup H_L(0) ─────────────────────────────────────
  let a: number, b: number, c: number;
  if (pattern === "segregated") {
    a = 0.980; b = 0.4846; c = 0.0868;
  } else if (pattern === "intermittent") {
    a = 0.845; b = 0.5351; c = 0.0173;
  } else {  // distributed
    a = 1.065; b = 0.5824; c = 0.0609;
  }

  let HL0 = a * Math.pow(lambda_L, b) / Math.pow(NFr, c);
  HL0 = Math.max(lambda_L, Math.min(1.0, HL0));

  // ─── Inclination Correction ────────────────────────────────────────────────
  const theta = angle_deg * PI_CONST / 180;

  let e: number, f_coef: number, g_coef: number, h_coef: number;
  if (angle_deg >= 0) {
    // Uphill
    if (pattern === "segregated")    { e = 0.011; f_coef = -3.768; g_coef = 3.539; h_coef = -1.614; }
    else if (pattern === "intermittent") { e = 2.96; f_coef = 0.305; g_coef = -0.4473; h_coef = 0.0978; }
    else { e = 1.0; f_coef = 0.0; g_coef = 0.0; h_coef = 0.0; }  // distributed: no correction
  } else {
    // Downhill
    if (pattern === "segregated")    { e = 4.70; f_coef = -0.3692; g_coef = 0.1244; h_coef = -0.5056; }
    else if (pattern === "intermittent") { e = 4.70; f_coef = -0.3692; g_coef = 0.1244; h_coef = -0.5056; }
    else { e = 4.70; f_coef = -0.3692; g_coef = 0.1244; h_coef = -0.5056; }
  }

  const C = Math.max(0, (1 - lambda_L) * Math.log(e * Math.pow(lambda_L, f_coef) * Math.pow(NLv, g_coef) * Math.pow(NFr, h_coef)));
  const psi_bb = 1 + C * (Math.sin(1.8 * theta) - Math.pow(Math.sin(1.8 * theta), 3) / 3);
  const HL = Math.min(1.0, HL0 * psi_bb);

  // ─── Mixture Properties ───────────────────────────────────────────────────
  const rho_mix = rho_liq * HL + rho_gas * (1 - HL);    // lb/ft³
  const rho_ns  = rho_liq * lambda_L + rho_gas * (1 - lambda_L);  // no-slip density

  // ─── Friction Factor ──────────────────────────────────────────────────────
  const mu_liq = 1.0;  // cp liquid (default water)
  const mu_gas = 0.012; // cp gas
  const mu_ns  = Math.pow(mu_liq, lambda_L) * Math.pow(mu_gas, 1 - lambda_L);  // no-slip viscosity cp
  const Re_ns  = rho_ns * Vm * D_ft / (mu_ns * 6.72e-4);
  const fn     = moodyFriction(Re_ns, 0.00015, D_ft);

  // Beggs-Brill friction ratio
  const y = lambda_L / (HL * HL);
  let fRatio: number;
  if (y > 1 && y < 1.2) {
    fRatio = Math.exp(2.2 * y - 2.5);
  } else {
    const lnY = Math.log(y);
    const s = lnY / (-0.0523 + 3.182 * lnY - 0.8725 * lnY * lnY + 0.01853 * Math.pow(lnY, 4));
    fRatio = Math.exp(s);
  }
  const fm = fn * fRatio;

  // ─── Pressure Gradient (psi/ft) ───────────────────────────────────────────
  const dPdL_grav = rho_mix * G_FT_S2 * Math.sin(theta) / (G_FT_S2 * 144);  // psi/ft
  const dPdL_fric = fm * rho_ns * Vm * Vm / (2 * G_FT_S2 * D_ft * 144);     // psi/ft

  return dPdL_grav + dPdL_fric;
}

/**
 * Beggs & Brill bottomhole flowing pressure (integrated average method).
 *
 * Divides the well into segments, computes the gradient at mid-point conditions.
 *
 * @param Pwh_psia    Wellhead pressure (psia)
 * @param q_liq_bpd   Liquid rate (bbl/d)
 * @param q_gas_mscfd Gas rate (Mscf/d)
 * @param D_in        Tubing inside diameter (in)
 * @param L_ft        Well depth (ft)
 * @param T_wh_F      Wellhead temperature (°F)
 * @param T_bh_F      Bottomhole temperature (°F)
 * @param SG_liq      Liquid specific gravity
 * @param SG_gas      Gas specific gravity
 * @param n_seg       Number of integration segments (default 10)
 * @returns           Bottomhole flowing pressure (psia)
 */
export function beggsBrillBHP(
  Pwh_psia: number,
  q_liq_bpd: number,
  q_gas_mscfd: number,
  D_in: number,
  L_ft: number,
  T_wh_F: number,
  T_bh_F: number,
  SG_liq: number,
  SG_gas: number,
  n_seg = 10
): number {
  const dL = L_ft / n_seg;
  let P = Pwh_psia;

  for (let i = 0; i < n_seg; i++) {
    const frac = (i + 0.5) / n_seg;
    const T_F = T_wh_F + frac * (T_bh_F - T_wh_F);
    const grad = beggsBrillGradient(q_liq_bpd, q_gas_mscfd, D_in, P, T_F, SG_liq, SG_gas, 90);
    P += grad * dL;
  }
  return P;
}

// ─── Gray (1974) Gas-Condensate Correlation ────────────────────────────────────

/**
 * Gray (1974) pressure gradient for gas-condensate wells.
 *
 * Semi-empirical; computes liquid holdup from a dimensionless surface tension
 * group. Applicable to near-vertical gas-condensate wells with low liquid rates.
 *
 * @param q_gas_mscfd  Gas flow rate (Mscf/d)
 * @param q_liq_bpd    Condensate/water rate (bbl/d)
 * @param D_in         Tubing inside diameter (in)
 * @param P_psia       Local pressure (psia)
 * @param T_F          Temperature (°F)
 * @param SG_gas       Gas specific gravity
 * @param SG_liq       Liquid specific gravity (condensate ≈ 0.80)
 * @param sigma_dyn_cm Surface tension (dyn/cm), default 20
 * @returns            Pressure gradient (psi/ft)
 */
export function grayGradient(
  q_gas_mscfd: number,
  q_liq_bpd: number,
  D_in: number,
  P_psia: number,
  T_F: number,
  SG_gas: number,
  SG_liq = 0.80,
  sigma_dyn_cm = 20
): number {
  const T_R   = T_F + 459.67;
  const D_ft  = D_in / 12;
  const A_ft2 = areaFt2(D_in);

  const rho_liq = SG_liq * 62.4;
  const rho_gas = (SG_gas * 28.97 * P_psia) / (10.73 * T_R);

  const q_gas_ft3s = q_gas_mscfd * 1000 * T_R * 14.7 / (520 * P_psia * 86400);
  const q_liq_ft3s = q_liq_bpd * 5.615 / 86400;
  const Vsg = q_gas_ft3s / A_ft2;
  const Vsl = q_liq_ft3s / A_ft2;
  const Vm  = Vsl + Vsg;

  if (Vm < 1e-10) return rho_gas * G_FT_S2 / (G_FT_S2 * 144);

  // Gray dimensionless liquid holdup correlation
  const N_v = 1e4 * Vm * (rho_gas / (G_FT_S2 * sigma_dyn_cm * 6.7197e-3)) * Math.pow(rho_liq - rho_gas, -0.25);
  const N_d = 1e4 * D_ft * Math.pow((rho_liq - rho_gas) / (G_FT_S2 * sigma_dyn_cm * 6.7197e-3), 0.25);
  const lambda_L = Vsl / Vm;

  // Gray holdup correlation (simplified form)
  const HL = Math.max(lambda_L, Math.min(1.0,
    lambda_L / (lambda_L + (Vsg / Vm) * Math.exp(-2.314 * Math.pow(N_v * (1 + N_d) / 1e4, 0.302)))
  ));

  const rho_mix = rho_liq * HL + rho_gas * (1 - HL);

  // Friction (Moody, no-slip)
  const mu_mix = 0.018;  // cp gas-condensate mixture estimate
  const Re = rho_mix * Vm * D_ft / (mu_mix * 6.72e-4);
  const f  = moodyFriction(Re, 0.00015, D_ft);
  const dPdL_fric = f * rho_mix * Vm * Vm / (2 * G_FT_S2 * D_ft * 144);
  const dPdL_grav = rho_mix / 144;

  return dPdL_grav + dPdL_fric;
}

// ─── Hagedorn & Brown (1965) ───────────────────────────────────────────────────

/**
 * Hagedorn & Brown (1965) pressure gradient for oil wells.
 *
 * Uses correlating parameters to determine liquid holdup, then computes
 * mixture density and friction pressure drop.
 *
 * @param q_liq_bpd   Liquid rate (bbl/d)
 * @param q_gas_mscfd Gas rate (Mscf/d)
 * @param D_in        Tubing inside diameter (in)
 * @param P_psia      Local pressure (psia)
 * @param T_F         Temperature (°F)
 * @param SG_liq      Liquid specific gravity
 * @param SG_gas      Gas specific gravity
 * @param mu_liq_cp   Liquid viscosity (cp), default 2.0 (light oil)
 * @param sigma_dyn   Surface tension (dyn/cm), default 30
 * @returns           Pressure gradient (psi/ft)
 */
export function hagedornBrownGradient(
  q_liq_bpd: number,
  q_gas_mscfd: number,
  D_in: number,
  P_psia: number,
  T_F: number,
  SG_liq: number,
  SG_gas: number,
  mu_liq_cp = 2.0,
  sigma_dyn = 30.0
): number {
  const T_R   = T_F + 459.67;
  const D_ft  = D_in / 12;
  const A_ft2 = areaFt2(D_in);

  const rho_liq = SG_liq * 62.4;
  const rho_gas = (SG_gas * 28.97 * P_psia) / (10.73 * T_R);

  const q_liq_ft3s = q_liq_bpd * 5.615 / 86400;
  const q_gas_ft3s = q_gas_mscfd * 1000 * T_R * 14.7 / (520 * P_psia * 86400);
  const Vsl = q_liq_ft3s / A_ft2;
  const Vsg = q_gas_ft3s / A_ft2;
  const Vm  = Vsl + Vsg;

  if (Vm < 1e-10) return rho_liq / 144;

  const lambda_L = Vsl / Vm;

  // Dimensionless numbers for H&B correlations
  const Cnl = mu_liq_cp * Math.pow(G_FT_S2 / (rho_liq * Math.pow(sigma_dyn * 6.7197e-3, 3)), 0.25);
  const NLv = Vsl * Math.pow(rho_liq / (G_FT_S2 * sigma_dyn * 6.7197e-3), 0.25);
  const NGv = Vsg * Math.pow(rho_liq / (G_FT_S2 * sigma_dyn * 6.7197e-3), 0.25);
  const Nd  = D_ft  * Math.pow(rho_liq * G_FT_S2 / (sigma_dyn * 6.7197e-3), 0.5);

  // H&B holdup correlations (simplified polynomial approximations of chart readings)
  // CNL correction from Griffith-Wallis
  const CNL_corr = Math.max(0.001, Math.min(0.1, Cnl));

  // Holdup factor from primary correlation
  const x1 = NLv * Math.pow(P_psia, 0.1) * CNL_corr / NGv * 0.575;
  let HL0: number;
  if (x1 < 0.01) {
    HL0 = 0.3 * x1;
  } else if (x1 < 1.0) {
    HL0 = 0.75 * Math.pow(x1, 0.45);
  } else {
    HL0 = Math.min(0.98, 0.9 * Math.pow(x1, 0.15));
  }
  HL0 = Math.max(lambda_L, Math.min(1.0, HL0));

  // Second holdup factor for correction
  const x2 = NGv * Math.pow(NLv, 0.38) / Math.pow(Nd, 2.14);
  const SHL = x2 < 1e-3 ? 0.0 : Math.min(0.05, 0.01 * Math.pow(x2, 0.5));
  const HL = Math.min(1.0, HL0 + SHL);

  const rho_mix = rho_liq * HL + rho_gas * (1 - HL);

  // Friction factor
  const mu_gas = 0.012;
  const mu_mix_cp = Math.pow(mu_liq_cp, HL) * Math.pow(mu_gas, 1 - HL);
  const Re = rho_mix * Vm * D_ft / (mu_mix_cp * 6.72e-4);
  const f  = moodyFriction(Re, 0.00015, D_ft);

  const dPdL_grav = rho_mix / 144;
  const dPdL_fric = f * rho_liq * Vsl * Vm / (2 * G_FT_S2 * D_ft * 144);  // H&B form

  return dPdL_grav + dPdL_fric;
}

// ─── Liquid Loading Velocity ────────────────────────────────────────────────────

/**
 * Critical (liquid loading) velocity for gas wells — Turner et al. (1969).
 *
 * v_crit = 1.787 · σ^0.25 · (ρl - ρg)^0.25 / ρg^0.5   (ft/s)
 *
 * @param P_psia      Wellhead pressure (psia)
 * @param T_R         Temperature (°R)
 * @param SG_gas      Gas specific gravity
 * @param SG_liq      Liquid specific gravity (1.07 for brine, 0.75 for condensate)
 * @param sigma_dyn   Surface tension (dyn/cm)
 * @returns           Critical gas velocity to lift liquids (ft/s)
 */
export function turnerCriticalVelocity(
  P_psia: number,
  T_R: number,
  SG_gas: number,
  SG_liq = 1.07,
  sigma_dyn = 60
): number {
  const rho_gas = (SG_gas * 28.97 * P_psia) / (10.73 * T_R);
  const rho_liq = SG_liq * 62.4;
  // Turner equation (field units)
  return 1.787 * Math.pow(sigma_dyn, 0.25) * Math.pow(rho_liq - rho_gas, 0.25) / Math.pow(rho_gas, 0.5);
}

/**
 * Minimum gas rate to prevent liquid loading — Coleman et al. modification.
 *
 * @param P_psia     Wellhead pressure (psia)
 * @param T_R        Temperature (°R)
 * @param D_in       Tubing inside diameter (in)
 * @param SG_gas     Gas specific gravity
 * @param SG_liq     Liquid specific gravity
 * @param sigma_dyn  Surface tension (dyn/cm)
 * @returns          Minimum gas rate (Mscf/d)
 */
export function minimumGasRateForLiftoff(
  P_psia: number,
  T_R: number,
  D_in: number,
  SG_gas = 0.65,
  SG_liq = 1.07,
  sigma_dyn = 60
): number {
  const v_crit = turnerCriticalVelocity(P_psia, T_R, SG_gas, SG_liq, sigma_dyn);
  // Convert to Mscf/d: q = v_crit * A * P_psia / (14.7 * T_R / 520) / 1000 * 86400
  const A_ft2 = areaFt2(D_in);
  const z_avg = 0.9;  // approximate Z at wellhead conditions
  const q_scf_s = v_crit * A_ft2 * P_psia / (14.7 * z_avg * T_R / 520);
  return q_scf_s * 86400 / 1000;
}

// ─── Nodal Analysis Helper ─────────────────────────────────────────────────────

/**
 * Compute VLP (tubing performance) curve — Pwf vs rate using Beggs-Brill.
 *
 * @param rates_bpd   Array of liquid rates to evaluate (bbl/d)
 * @param GOR         Gas-oil ratio (scf/STB)
 * @param Pwh_psia    Wellhead pressure (psia)
 * @param D_in        Tubing inside diameter (in)
 * @param L_ft        Well depth (ft)
 * @param T_wh_F      Wellhead temperature (°F)
 * @param T_bh_F      Bottomhole temperature (°F)
 * @param SG_liq      Liquid SG
 * @param SG_gas      Gas SG
 * @returns           Array of {rate, Pwf} pairs
 */
export function vlpCurveBeggsBrill(
  rates_bpd: number[],
  GOR: number,
  Pwh_psia: number,
  D_in: number,
  L_ft: number,
  T_wh_F: number,
  T_bh_F: number,
  SG_liq: number,
  SG_gas: number
): Array<{ rate: number; Pwf: number }> {
  return rates_bpd.map(q => {
    const q_gas_mscfd = q * GOR / 1000;
    const Pwf = beggsBrillBHP(Pwh_psia, q, q_gas_mscfd, D_in, L_ft, T_wh_F, T_bh_F, SG_liq, SG_gas);
    return { rate: q, Pwf };
  });
}

// ─── Ansari (1994) Mechanistic Model ─────────────────────────────────────────

/**
 * Ansari et al. (1994) mechanistic two-phase pressure gradient for vertical
 * upward flow in wellbores.
 *
 * Flow-pattern determination (bubble / slug / annular mist) uses the Ansari
 * transition boundaries.  Pressure gradient is the sum of gravity, friction,
 * and acceleration components.
 *
 * Reference: Ansari A.M. et al. (1994) — A Comprehensive Mechanistic Model
 * for Upward Two-Phase Flow in Wellbores.  SPE Production & Facilities, May.
 *
 * @param q_bpd      Liquid rate (bbl/d)
 * @param GOR        Gas-oil ratio (scf/STB)
 * @param D_in       Tubing inner diameter (in)
 * @param SG_liq     Liquid specific gravity (water = 1.0)
 * @param SG_gas     Gas specific gravity (air = 1.0)
 * @param P_psia     Average pressure (psia)
 * @param T_F        Average temperature (°F)
 * @param angle_deg  Inclination from horizontal (°), 90 = vertical upward
 * @returns          Pressure gradient (psi/ft)
 */
export function ansariGradient(
  q_bpd: number,
  GOR: number,
  D_in: number,
  SG_liq: number,
  SG_gas: number,
  P_psia: number,
  T_F: number,
  angle_deg = 90,
): number {
  const D_ft    = D_in / 12;
  const A_ft2   = PI_CONST * D_ft * D_ft / 4;
  const T_R     = T_F + 459.67;
  const sinTh   = Math.sin(angle_deg * PI_CONST / 180);

  // Phase densities (lb/ft³)
  const rhoL    = SG_liq * 62.4;
  const Z       = 0.9;                            // simplified Z at avg conditions
  const rhoG    = SG_gas * 28.97 * P_psia / (Z * 10.732 * T_R);  // lb/ft³

  // Superficial velocities (ft/s)
  const qL_ft3s = q_bpd * 5.615 / 86400;
  const qG_scfs = q_bpd * GOR / 86400;           // scf/s
  const Bg_fac  = Z * T_R * 14.7 / (P_psia * 520.0);  // res ft³ / scf
  const qG_ft3s = qG_scfs * Bg_fac;
  const vsL     = qL_ft3s / A_ft2;
  const vsG     = qG_ft3s / A_ft2;
  const vm      = vsL + vsG;
  const lambda_L = vsL / Math.max(vm, 1e-9);     // no-slip liquid fraction

  // Drift-flux bubble rise velocity (Harmathy 1960)
  const g       = G_FT_S2;
  const sigma   = DEFAULT_OIL_GAS_SIGMA_LBF_FT;     // surface tension lbf/ft (≈30 dyne/cm)
  const rho_diff = Math.max(rhoL - rhoG, 0.1);
  const vbub    = 1.53 * Math.pow(g * sigma * rho_diff / (rhoL * rhoL), 0.25);

  // Bubble-to-slug transition: vsG / vm < 0.25 AND vm < vbub/0.25
  const slug_frac = vsG / Math.max(vm, 1e-9);
  let HL: number;
  if (slug_frac < 0.25 && vm < vbub * 4) {
    // Bubble flow — drift-flux HL
    const C0 = 1.2;
    const vGift = C0 * vm + vbub;
    HL = Math.min(0.98, Math.max(lambda_L, 1 - vsG / Math.max(vGift, 1e-9)));
  } else if (vsG > 0.52 * Math.pow(g * D_ft * rho_diff / rhoG, 0.5)) {
    // Annular mist — Wallis film model
    HL = Math.max(0.01, lambda_L * 0.15);
  } else {
    // Slug flow — Fernandes slug HL correlation
    HL = Math.min(0.95, 0.845 * Math.pow(lambda_L, 0.26));
  }

  // Mixture density
  const rhoM = rhoL * HL + rhoG * (1 - HL);

  // Friction factor (Moody at mixture Re)
  const muL   = SG_liq * 1.0;                    // cp → simplified
  const muG   = 0.012;                            // gas viscosity cp
  const muM   = muL * lambda_L + muG * (1 - lambda_L);
  const Re    = rhoM * vm * D_ft / (muM * 6.72e-4);
  const f     = Re < 2100 ? 64 / Re : moodyFriction(Re, 0.00015, D_ft);

  // Pressure gradient components (psi/ft)
  const dP_grav = rhoM * sinTh / 144;
  const dP_fric = f * rhoM * vm * vm / (2 * g * D_ft * 144);
  const dP_acc  = rhoM * vm * vsG * (rhoL - rhoG) / (rhoL * P_psia * 144); // small

  return dP_grav + dP_fric + dP_acc;
}

/**
 * Ansari BHP: integrate gradient over depth.
 *
 * @param Pwh_psia  Wellhead flowing pressure (psia)
 * @param q_bpd     Liquid rate (bbl/d)
 * @param GOR       Gas-oil ratio (scf/STB)
 * @param D_in      Tubing inner diameter (in)
 * @param L_ft      Tubing length (ft)
 * @param T_wh_F    Wellhead temperature (°F)
 * @param T_bh_F    Bottomhole temperature (°F)
 * @param SG_liq    Liquid specific gravity
 * @param SG_gas    Gas specific gravity
 * @returns         BHP (psia)
 */
export function ansariBHP(
  Pwh_psia: number,
  q_bpd: number,
  GOR: number,
  D_in: number,
  L_ft: number,
  T_wh_F: number,
  T_bh_F: number,
  SG_liq: number,
  SG_gas: number,
): number {
  const nSeg = 10;
  let P = Pwh_psia;
  const dL = L_ft / nSeg;
  for (let i = 0; i < nSeg; i++) {
    const T_F = T_wh_F + (T_bh_F - T_wh_F) * (i + 0.5) / nSeg;
    const grad = ansariGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P, T_F);
    P += grad * dL;
  }
  return P;
}

// ─── Mukherjee-Brill (1985) Mechanistic Model ────────────────────────────────

/**
 * Mukherjee & Brill (1985) two-phase pressure gradient correlation for
 * inclined and horizontal pipes.
 *
 * Uses empirical flow-pattern map (bubble / slug / stratified / mist) and
 * holdup correlations for each pattern.
 *
 * Reference: Mukherjee H. & Brill J.P. (1985) — Pressure Drop Correlations
 * for Inclined Two-Phase Flow. J. Energy Res. Tech., 107, 549-554.
 *
 * @param q_bpd      Liquid rate (bbl/d)
 * @param GOR        Gas-oil ratio (scf/STB)
 * @param D_in       Tubing inner diameter (in)
 * @param SG_liq     Liquid specific gravity
 * @param SG_gas     Gas specific gravity
 * @param P_psia     Average pressure (psia)
 * @param T_F        Average temperature (°F)
 * @param angle_deg  Inclination from horizontal (°); 90 = vertical, 0 = horizontal
 * @returns          Pressure gradient (psi/ft)
 */
export function mukherjeebrillGradient(
  q_bpd: number,
  GOR: number,
  D_in: number,
  SG_liq: number,
  SG_gas: number,
  P_psia: number,
  T_F: number,
  angle_deg = 90,
): number {
  const D_ft    = D_in / 12;
  const A_ft2   = PI_CONST * D_ft * D_ft / 4;
  const T_R     = T_F + 459.67;
  const theta   = angle_deg * PI_CONST / 180;
  const sinTh   = Math.sin(theta);
  const g       = G_FT_S2;

  const rhoL    = SG_liq * 62.4;
  const Z       = 0.9;
  const rhoG    = SG_gas * 28.97 * P_psia / (Z * 10.732 * T_R);

  const qL_ft3s = q_bpd * 5.615 / 86400;
  const qG_scfs = q_bpd * GOR / 86400;
  const Bg_fac  = Z * T_R * 14.7 / (P_psia * 520.0);
  const qG_ft3s = qG_scfs * Bg_fac;
  const vsL     = qL_ft3s / A_ft2;
  const vsG     = qG_ft3s / A_ft2;
  const vm      = vsL + vsG;
  const lambda_L = vsL / Math.max(vm, 1e-9);

  // Mukherjee-Brill dimensionless groups
  const sigma_lbf   = DEFAULT_OIL_GAS_SIGMA_LBF_FT; // lbf/ft (≈30 dyne/cm for crude oil)
  const rho_diff    = Math.max(rhoL - rhoG, 0.1);

  // Liquid velocity number NLv and gas velocity number NGv
  const NLv = vsL * Math.pow(rhoL / (g * sigma_lbf), 0.25);
  const NGv = vsG * Math.pow(rhoL / (g * sigma_lbf), 0.25);

  // Flow-pattern map: Mukherjee-Brill empirical transitions
  // Bubble-slug: NLv > 0.1, NGv < 10
  // Stratified: small NLv, small inclination, large NGv
  let HL: number;
  if (Math.abs(angle_deg) < 10 && NGv > 4 && lambda_L < 0.3) {
    // Stratified or mist
    HL = Math.max(0.02, lambda_L * 0.5);
  } else if (NGv > 50 || (NGv > 10 && lambda_L < 0.05)) {
    // Mist flow
    HL = Math.max(0.01, lambda_L * 0.12);
  } else {
    // Slug/bubble — Mukherjee-Brill holdup correlation
    // HL = exp[(C1 + C2·sinθ + C3·sin²θ + C4·NL²)·NGv^C5 / NLv^C6]
    // Upward bubble/slug coefficients (Table 1 in M-B 1985):
    const C1 = -0.380113, C2 = 0.129875, C3 = -0.119788;
    const C4 = 2.343227,  C5 = 0.475686, C6 = 0.288657;
    const NL  = Math.max(0.01, lambda_L);
    const arg = C1 + C2 * sinTh + C3 * sinTh * sinTh
              + C4 * NL * NL + C5 * Math.log(Math.max(NGv, 0.01))
              - C6 * Math.log(Math.max(NLv, 0.01));
    HL = Math.min(0.98, Math.max(lambda_L, Math.exp(arg)));
  }

  const rhoM   = rhoL * HL + rhoG * (1 - HL);
  const muL    = SG_liq * 1.0;
  const muG    = 0.012;
  const muM    = muL * lambda_L + muG * (1 - lambda_L);
  const Re     = rhoM * vm * D_ft / (muM * 6.72e-4);
  const f      = Re < 2100 ? 64 / Re : moodyFriction(Re, 0.00015, D_ft);

  const dP_grav = rhoM * sinTh / 144;
  const dP_fric = f * rhoM * vm * vm / (2 * g * D_ft * 144);

  return dP_grav + dP_fric;
}

/**
 * Mukherjee-Brill BHP: integrate gradient over depth.
 *
 * @param Pwh_psia  Wellhead flowing pressure (psia)
 * @param q_bpd     Liquid rate (bbl/d)
 * @param GOR       Gas-oil ratio (scf/STB)
 * @param D_in      Tubing inner diameter (in)
 * @param L_ft      Tubing length (ft)
 * @param T_wh_F    Wellhead temperature (°F)
 * @param T_bh_F    Bottomhole temperature (°F)
 * @param SG_liq    Liquid specific gravity
 * @param SG_gas    Gas specific gravity
 * @param angle_deg Inclination from horizontal (°)
 * @returns         BHP (psia)
 */
export function mukherjeebrillBHP(
  Pwh_psia: number,
  q_bpd: number,
  GOR: number,
  D_in: number,
  L_ft: number,
  T_wh_F: number,
  T_bh_F: number,
  SG_liq: number,
  SG_gas: number,
  angle_deg = 90,
): number {
  const nSeg = 10;
  let P = Pwh_psia;
  const dL = L_ft / nSeg;
  for (let i = 0; i < nSeg; i++) {
    const T_F = T_wh_F + (T_bh_F - T_wh_F) * (i + 0.5) / nSeg;
    const grad = mukherjeebrillGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P, T_F, angle_deg);
    P += grad * dL;
  }
  return P;
}

// ─── Hasan-Kabir (1988) Drift-Flux Mechanistic Model ─────────────────────────

/**
 * Hasan & Kabir (1988) drift-flux mechanistic model for two-phase flow in
 * inclined wellbores.
 *
 * Uses drift-flux void fraction equation and pattern-specific friction.
 *
 * Reference: Hasan A.R. & Kabir C.S. (1988) — A Study of Multiphase Flow
 * Behavior in Vertical Wells. SPE Production Engineering, May.
 *
 * @param q_bpd      Liquid rate (bbl/d)
 * @param GOR        Gas-oil ratio (scf/STB)
 * @param D_in       Tubing inner diameter (in)
 * @param SG_liq     Liquid specific gravity
 * @param SG_gas     Gas specific gravity
 * @param P_psia     Average pressure (psia)
 * @param T_F        Average temperature (°F)
 * @param angle_deg  Inclination from horizontal (°); 90 = vertical
 * @returns          Pressure gradient (psi/ft)
 */
export function hasanKabirGradient(
  q_bpd: number,
  GOR: number,
  D_in: number,
  SG_liq: number,
  SG_gas: number,
  P_psia: number,
  T_F: number,
  angle_deg = 90,
): number {
  const D_ft    = D_in / 12;
  const A_ft2   = PI_CONST * D_ft * D_ft / 4;
  const T_R     = T_F + 459.67;
  const theta   = angle_deg * PI_CONST / 180;
  const sinTh   = Math.sin(theta);
  const g       = G_FT_S2;

  const rhoL    = SG_liq * 62.4;
  const Z       = 0.9;
  const rhoG    = SG_gas * 28.97 * P_psia / (Z * 10.732 * T_R);
  const rho_diff = Math.max(rhoL - rhoG, 0.1);

  const qL_ft3s = q_bpd * 5.615 / 86400;
  const qG_scfs = q_bpd * GOR / 86400;
  const Bg_fac  = Z * T_R * 14.7 / (P_psia * 520.0);
  const qG_ft3s = qG_scfs * Bg_fac;
  const vsL     = qL_ft3s / A_ft2;
  const vsG     = qG_ft3s / A_ft2;
  const vm      = vsL + vsG;
  const lambda_L = vsL / Math.max(vm, 1e-9);

  // Hasan-Kabir drift velocity (v∞) — angle-corrected
  const sigma   = DEFAULT_OIL_GAS_SIGMA_LBF_FT;     // surface tension lbf/ft (≈30 dyne/cm)
  const v_inf   = 1.53 * Math.pow(g * sigma * rho_diff / (rhoL * rhoL), 0.25)
                * Math.pow(Math.abs(sinTh), 0.5); // HK inclination factor

  // Profile parameter C0 (bubble: 1.2, slug: 1.15, mist: 1.0)
  const NGv     = vsG * Math.pow(rhoL / (g * sigma), 0.25);
  let C0: number;
  let voidFrac: number;
  if (NGv < 0.5) {
    // Bubble flow
    C0 = 1.2;
    voidFrac = vsG / Math.max(C0 * vm + v_inf, 1e-9);
  } else if (NGv < 3.0) {
    // Slug / churn
    C0 = 1.15;
    voidFrac = vsG / Math.max(C0 * vm + v_inf, 1e-9);
  } else {
    // Annular mist — Wallis entrainment
    C0 = 1.0;
    voidFrac = vsG / Math.max(C0 * vm + v_inf, 1e-9);
    voidFrac = Math.min(voidFrac * 1.15, 0.99);  // HK mist correction
  }
  voidFrac = Math.min(0.99, Math.max(1 - lambda_L * 1.05, voidFrac));
  const HL     = Math.max(0.01, 1 - voidFrac);
  const rhoM   = rhoL * HL + rhoG * (1 - HL);

  const muL    = SG_liq * 1.0;
  const muG    = 0.012;
  const muM    = muL * lambda_L + muG * (1 - lambda_L);
  const Re     = rhoM * vm * D_ft / (muM * 6.72e-4);
  const f      = Re < 2100 ? 64 / Re : moodyFriction(Re, 0.00015, D_ft);

  const dP_grav = rhoM * sinTh / 144;
  const dP_fric = f * rhoM * vm * vm / (2 * g * D_ft * 144);

  return dP_grav + dP_fric;
}

/**
 * Hasan-Kabir BHP: integrate gradient over depth.
 *
 * @param Pwh_psia  Wellhead flowing pressure (psia)
 * @param q_bpd     Liquid rate (bbl/d)
 * @param GOR       Gas-oil ratio (scf/STB)
 * @param D_in      Tubing inner diameter (in)
 * @param L_ft      Tubing length (ft)
 * @param T_wh_F    Wellhead temperature (°F)
 * @param T_bh_F    Bottomhole temperature (°F)
 * @param SG_liq    Liquid specific gravity
 * @param SG_gas    Gas specific gravity
 * @param angle_deg Inclination from horizontal (°)
 * @returns         BHP (psia)
 */
export function hasanKabirBHP(
  Pwh_psia: number,
  q_bpd: number,
  GOR: number,
  D_in: number,
  L_ft: number,
  T_wh_F: number,
  T_bh_F: number,
  SG_liq: number,
  SG_gas: number,
  angle_deg = 90,
): number {
  const nSeg = 10;
  let P = Pwh_psia;
  const dL = L_ft / nSeg;
  for (let i = 0; i < nSeg; i++) {
    const T_F = T_wh_F + (T_bh_F - T_wh_F) * (i + 0.5) / nSeg;
    const grad = hasanKabirGradient(q_bpd, GOR, D_in, SG_liq, SG_gas, P, T_F, angle_deg);
    P += grad * dL;
  }
  return P;
}

// ─── Poettmann-Carpenter (1952) ───────────────────────────────────────────────
//  Classic empirical model for multiphase vertical flow in oil wells.
//  No liquid holdup assumed — mixture is treated as a homogeneous fluid.
//  Friction factor read from a log-log chart (approximated with a curve-fit).
//
//  Reference: Poettmann & Carpenter, "The Multiphase Flow of Gas, Oil, and Water
//  Through Vertical Flow Strings with Application to the Design of Gas-Lift
//  Installations", Drilling and Production Practice, API, 1952.

/**
 * Compute the Poettmann-Carpenter empirical friction factor from chart data.
 * @param rho_m  No-slip mixture density (lb/ft³)
 * @param v_m    Mixture velocity (ft/s)
 * @param D_ft   Pipe inside diameter (ft)
 * @returns      Dimensionless friction factor f_PC
 */
function poettmannCarpenterFriction(rho_m: number, v_m: number, D_ft: number): number {
  // Mass flux parameter ρ·v·D in lb/(ft·s) — basis for chart lookup.
  const x = rho_m * v_m * D_ft;
  // Curve-fit to original Poettmann-Carpenter chart (Brill & Mukherjee 1999):
  //   f_PC = 10^(1.444 − 2.5 · log10(ρ·v·D))  (approximately valid for x ≈ 0.1–1000)
  const logX = Math.log10(Math.max(x, 1e-6));
  return Math.pow(10, 1.444 - 2.5 * logX);
}

/**
 * Poettmann-Carpenter (1952) multiphase pressure gradient (psi/ft).
 *
 * Homogeneous (no-slip) model suitable for high-rate wells where liquid holdup
 * is negligible or unknown.  Computes a single-segment average gradient.
 *
 * @param q_oil_bpd    Oil rate (bbl/d)
 * @param q_gas_Mscfd  Gas rate (Mscf/d)
 * @param q_wat_bpd    Water rate (bbl/d)
 * @param D_in         Tubing inside diameter (in)
 * @param SG_oil       Oil specific gravity (water = 1.0)
 * @param SG_gas       Gas specific gravity (air = 1.0)
 * @param P_avg_psia   Average pressure (psia)
 * @param T_avg_F      Average temperature (°F)
 * @param GOR          Producing GOR (scf/STB) — used to determine in-situ gas fraction
 * @returns            Pressure gradient (psi/ft), positive = increasing downward
 */
export function poettmannCarpenterGradient(
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_in: number,
  SG_oil: number,
  SG_gas: number,
  P_avg_psia: number,
  T_avg_F: number,
): number {
  const D_ft = D_in / 12;
  const A_ft2 = PI_CONST * D_ft * D_ft / 4;
  const T_R = T_avg_F + 459.67;

  // In-situ volumetric rates (ft³/s)
  const Bg_ft3_scf = 0.02827 * T_R / P_avg_psia;                    // ft³/scf at P,T (no Z correction — PC model)
  const q_l_ft3s = (q_oil_bpd + q_wat_bpd) * 5.615 / 86400;        // ft³/s (liquid at surface ≈ in-situ for incompressible)
  const q_g_ft3s = (q_gas_Mscfd * 1000) * Bg_ft3_scf / 86400;      // ft³/s (gas at P,T)

  const q_m_ft3s = q_l_ft3s + q_g_ft3s;
  if (q_m_ft3s <= 0) return 0;

  // No-slip mixture density (lb/ft³)
  const rho_oil = SG_oil * 62.4;                       // lb/ft³
  const rho_wat = 62.4;                                // lb/ft³
  const rho_gas = SG_gas * 29 * P_avg_psia / (10.7316 * T_R);  // lb/ft³ (ideal gas)

  const q_l_total = q_oil_bpd + q_wat_bpd;
  const rho_liq  = q_l_total > 0
    ? (rho_oil * q_oil_bpd + rho_wat * q_wat_bpd) / q_l_total
    : rho_oil;

  const rho_m = (rho_liq * q_l_ft3s + rho_gas * q_g_ft3s) / q_m_ft3s;
  const v_m   = q_m_ft3s / A_ft2;

  const f_PC  = poettmannCarpenterFriction(rho_m, v_m, D_ft);

  // Gradient: gravity + friction  (no acceleration term in original PC model)
  const grad_grav = rho_m / 144;                                    // psi/ft
  const grad_fric = f_PC * rho_m * rho_m * v_m * v_m
                    / (7.413e10 * Math.pow(D_ft, 5) * 86400 * 86400 * 144);
  return grad_grav + grad_fric;
}

/**
 * Poettmann-Carpenter (1952) bottomhole pressure (psia).
 *
 * Integrates the gradient in 10 equal segments using average pressure
 * at each step (iterative).
 *
 * @param Pwh_psia     Wellhead (tubing) pressure (psia)
 * @param q_oil_bpd    Oil rate (bbl/d)
 * @param q_gas_Mscfd  Gas rate (Mscf/d)
 * @param q_wat_bpd    Water rate (bbl/d)
 * @param D_in         Tubing inside diameter (in)
 * @param L_ft         Tubing length (ft)
 * @param SG_oil       Oil specific gravity
 * @param SG_gas       Gas specific gravity
 * @param T_wh_F       Wellhead temperature (°F)
 * @param T_bh_F       Bottomhole temperature (°F)
 * @returns            BHP (psia)
 */
export function poettmannCarpenterBHP(
  Pwh_psia: number,
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_in: number,
  L_ft: number,
  SG_oil: number,
  SG_gas: number,
  T_wh_F: number,
  T_bh_F: number,
): number {
  const nSeg = 10;
  let P = Pwh_psia;
  const dL = L_ft / nSeg;
  for (let i = 0; i < nSeg; i++) {
    const T_F = T_wh_F + (T_bh_F - T_wh_F) * (i + 0.5) / nSeg;
    const grad = poettmannCarpenterGradient(
      q_oil_bpd, q_gas_Mscfd, q_wat_bpd, D_in,
      SG_oil, SG_gas, P, T_F,
    );
    P += grad * dL;
  }
  return P;
}

// ─── Duns-Ros (1963) ─────────────────────────────────────────────────────────
//  Empirical correlation for vertical multiphase flow in oil wells.
//  Uses dimensionless velocity, diameter, and viscosity numbers.
//  Three flow regions: I (bubble/slug), II (slug-to-mist transition), III (mist).
//
//  Reference: Duns, H. and Ros, N.C.J., "Vertical Flow of Gas and Liquid Mixtures
//  in Wells", Proc. 6th World Petroleum Congress, Section II, Paper 22-PD6, 1963.

/**
 * Duns-Ros dimensionless liquid velocity number.
 * NLv = v_sl · (ρ_l / (g · σ))^0.25
 *
 * @param v_sl     Superficial liquid velocity (ft/s)
 * @param rho_l    Liquid density (lb/ft³)
 * @param sigma    Liquid-gas surface tension (lbf/ft)
 * @returns        NLv (dimensionless)
 */
function dunsRosNLv(v_sl: number, rho_l: number, sigma: number): number {
  return v_sl * Math.pow(rho_l / (G_FT_S2 * sigma), 0.25);
}

/**
 * Duns-Ros dimensionless gas velocity number.
 * NGv = v_sg · (ρ_l / (g · σ))^0.25
 */
function dunsRosNGv(v_sg: number, rho_l: number, sigma: number): number {
  return v_sg * Math.pow(rho_l / (G_FT_S2 * sigma), 0.25);
}

/**
 * Duns-Ros pipe diameter number.
 * Nd = D · (ρ_l · g / σ)^0.5
 */
function dunsRosNd(D_ft: number, rho_l: number, sigma: number): number {
  return D_ft * Math.pow(rho_l * G_FT_S2 / sigma, 0.5);
}

/**
 * Duns-Ros liquid viscosity number.
 * NL = μ_l · (g / (ρ_l · σ^3))^0.25
 *
 * @param mu_l  Liquid viscosity (cp)
 */
function dunsRosNL(mu_l: number, rho_l: number, sigma: number): number {
  const mu_lbft = mu_l * 6.72e-4;   // cp → lb/(ft·s)
  return mu_lbft * Math.pow(G_FT_S2 / (rho_l * Math.pow(sigma, 3)), 0.25);
}

/**
 * Duns-Ros (1963) multiphase pressure gradient (psi/ft).
 *
 * Implements the three-region flow correlation:
 *   Region I  (bubble/slug):   NGv < NGv_I
 *   Region II (slug/mist):     NGv_I ≤ NGv ≤ NGv_II
 *   Region III (mist):         NGv > NGv_II
 *
 * @param q_oil_bpd    Oil rate (bbl/d)
 * @param q_gas_Mscfd  Free gas rate (Mscf/d)
 * @param q_wat_bpd    Water rate (bbl/d)
 * @param D_in         Tubing inside diameter (in)
 * @param SG_oil       Oil specific gravity (water = 1.0)
 * @param SG_gas       Gas specific gravity (air = 1.0)
 * @param mu_l_cp      Liquid viscosity (cp)
 * @param sigma_lbf_ft Liquid-gas surface tension (lbf/ft)
 * @param P_avg_psia   Average pressure (psia)
 * @param T_avg_F      Average temperature (°F)
 * @returns            Pressure gradient (psi/ft), positive = downward
 */
export function dunsRosGradient(
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_in: number,
  SG_oil: number,
  SG_gas: number,
  mu_l_cp: number,
  sigma_lbf_ft: number,
  P_avg_psia: number,
  T_avg_F: number,
): number {
  const D_ft  = D_in / 12;
  const A_ft2 = PI_CONST * D_ft * D_ft / 4;
  const T_R   = T_avg_F + 459.67;

  // In-situ volumetric flow rates (ft³/s)
  const Bg = 0.02827 * T_R / P_avg_psia;               // gas FVF (ft³/scf, ideal)
  const q_l_ft3s = (q_oil_bpd + q_wat_bpd) * 5.615 / 86400;
  const q_g_ft3s = (q_gas_Mscfd * 1000) * Bg / 86400;

  // Superficial velocities (ft/s)
  const v_sl = q_l_ft3s / A_ft2;
  const v_sg = q_g_ft3s / A_ft2;
  const v_m  = v_sl + v_sg;
  if (v_m <= 0) return 0;

  // Fluid densities
  const rho_oil = SG_oil * 62.4;
  const rho_wat = 62.4;
  const rho_gas = SG_gas * 0.0764 * P_avg_psia / 14.7 * 520 / T_R;  // lb/ft³
  const q_l_total = q_oil_bpd + q_wat_bpd;
  const rho_l = q_l_total > 0
    ? (rho_oil * q_oil_bpd + rho_wat * q_wat_bpd) / q_l_total
    : rho_oil;

  const sigma = Math.max(sigma_lbf_ft, 1e-6);

  // Dimensionless numbers
  const NLv = dunsRosNLv(v_sl, rho_l, sigma);
  const NGv = dunsRosNGv(v_sg, rho_l, sigma);
  const Nd  = dunsRosNd(D_ft, rho_l, sigma);
  const NL  = dunsRosNL(mu_l_cp, rho_l, sigma);

  // Flow regime boundaries (simplified Duns-Ros Fig. 1):
  const NGv_I  = 0.5 + 2.5 * NLv;          // Region I / II boundary ≈ bubble→slug
  const NGv_II = 13.0 + 1.5 * NLv;         // Region II / III boundary ≈ slug→mist

  let HL: number;      // liquid holdup (fraction)
  let f_DR: number;    // Darcy friction factor

  if (NGv <= NGv_I) {
    // ── Region I: bubble/slug flow ────────────────────────────────────────────
    // Slip velocity correlation (Duns-Ros F-coefficients from Table 1):
    // S = F1 + NLv · F2 + F3 · NLv / (1 + F4·NLv²)
    // For NL < 0.002 (typical light oils/water):
    const F1 = 0.029 * Nd + 0.430;
    const F2 = (0.789 * Math.pow(Nd, 0.3)) / (1 + NL);
    const F3 = 0.0;
    const F4 = 0.0;
    const S  = F1 + NLv * F2 + F3 * NLv / (1 + F4 * NLv * NLv);
    // Bubble rise velocity (ft/s) from slip
    const v_s = S * Math.pow(sigma * G_FT_S2 / rho_l, 0.25);
    // Holdup from continuity: v_sg = HL_g * v_m + HL_g * v_s → solve for HL
    //   HL = 1 - HL_g ; v_sg = HL_g * (v_m + v_s) → HL_g = v_sg/(v_m + v_s)
    const HL_g = v_sg / (v_m + Math.max(v_s, 0));
    HL = Math.max(0, Math.min(1, 1 - HL_g));
    // Friction factor: Moody with liquid viscosity
    const Re_l = rho_l * v_m * D_ft / (mu_l_cp * 6.72e-4);
    f_DR = moodyFriction(Re_l, 0.00015, D_ft);

  } else if (NGv > NGv_II) {
    // ── Region III: mist flow ─────────────────────────────────────────────────
    // No liquid holdup — all liquid entrained in gas core
    HL = 0;
    const rho_m_mist = rho_gas + (rho_l - rho_gas) * v_sl / v_m;   // no-slip in mist
    const mu_g = 0.01 + 0.0001 * SG_gas;   // approximate gas viscosity (cp)
    const Re_g = rho_m_mist * v_m * D_ft / (mu_g * 6.72e-4);
    f_DR = moodyFriction(Re_g, 0.00015, D_ft);

  } else {
    // ── Region II: slug/transition ────────────────────────────────────────────
    // Linearly interpolate holdup between Region I (at NGv_I) and Region III (at NGv_II)
    const t = (NGv - NGv_I) / (NGv_II - NGv_I);
    // Region I holdup at NGv = NGv_I
    const F1 = 0.029 * Nd + 0.430;
    const F2 = (0.789 * Math.pow(Nd, 0.3)) / (1 + NL);
    const S_I = F1 + NLv * F2;
    const v_s_I = S_I * Math.pow(sigma * G_FT_S2 / rho_l, 0.25);
    const v_sg_I = NGv_I * Math.pow(G_FT_S2 * sigma / rho_l, 0.25);
    const v_m_I  = v_sl + v_sg_I;
    const HL_g_I = v_sg_I / (v_m_I + Math.max(v_s_I, 0));
    const HL_I   = Math.max(0, Math.min(1, 1 - HL_g_I));
    HL = HL_I * (1 - t);  // linearly blend to 0
    const Re_t = rho_l * v_m * D_ft / (mu_l_cp * 6.72e-4);
    f_DR = moodyFriction(Re_t, 0.00015, D_ft);
  }

  // Mixture density with holdup
  const rho_s = rho_l * HL + rho_gas * (1 - HL);

  // Gravity gradient (psi/ft)
  const grad_grav = rho_s / 144;

  // Friction gradient (psi/ft): use no-slip mixture density for friction
  const rho_ns = rho_l * (v_sl / v_m) + rho_gas * (v_sg / v_m);
  const grad_fric = f_DR * rho_ns * v_m * v_m / (2 * G_FT_S2 * D_ft * 144);

  return grad_grav + grad_fric;
}

/**
 * Duns-Ros (1963) bottomhole pressure (psia).
 *
 * @param Pwh_psia      Wellhead pressure (psia)
 * @param q_oil_bpd     Oil rate (bbl/d)
 * @param q_gas_Mscfd   Free gas rate (Mscf/d)
 * @param q_wat_bpd     Water rate (bbl/d)
 * @param D_in          Tubing inside diameter (in)
 * @param L_ft          Tubing length (ft)
 * @param SG_oil        Oil specific gravity
 * @param SG_gas        Gas specific gravity
 * @param mu_l_cp       Liquid viscosity (cp)
 * @param sigma_lbf_ft  Surface tension (lbf/ft)
 * @param T_wh_F        Wellhead temperature (°F)
 * @param T_bh_F        Bottomhole temperature (°F)
 * @returns             BHP (psia)
 */
export function dunsRosBHP(
  Pwh_psia: number,
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_in: number,
  L_ft: number,
  SG_oil: number,
  SG_gas: number,
  mu_l_cp: number,
  sigma_lbf_ft: number,
  T_wh_F: number,
  T_bh_F: number,
): number {
  const nSeg = 10;
  let P = Pwh_psia;
  const dL = L_ft / nSeg;
  for (let i = 0; i < nSeg; i++) {
    const T_F = T_wh_F + (T_bh_F - T_wh_F) * (i + 0.5) / nSeg;
    const grad = dunsRosGradient(
      q_oil_bpd, q_gas_Mscfd, q_wat_bpd, D_in,
      SG_oil, SG_gas, mu_l_cp, sigma_lbf_ft, P, T_F,
    );
    P += grad * dL;
  }
  return P;
}

// ─── Orkiszewski (1967) ───────────────────────────────────────────────────────
//  Composite multiphase flow correlation using Griffith-Wallis (1961) for bubble
//  and slug flow, and Duns-Ros (1963) for mist flow.
//
//  Reference: Orkiszewski, J., "Predicting Two-Phase Pressure Drops in Vertical
//  Pipes", J. Petroleum Technology, June 1967, pp. 829–838.

/**
 * Griffith-Wallis slug bubble-rise velocity (ft/s).
 * v_b = 0.8 × √(g·D)   (Taylor bubble velocity in slug)
 */
function griffithWallisSlugVelocity(D_ft: number): number {
  return 0.8 * Math.sqrt(G_FT_S2 * D_ft);
}

/**
 * Orkiszewski (1967) multiphase pressure gradient (psi/ft).
 *
 * Flow regime classification (after Griffith & Wallis 1961):
 *   Bubble:  λ_g < L_B  (gas voidage fraction below bubble/slug boundary)
 *   Slug:    L_B ≤ λ_g < L_S
 *   Mist:    λ_g ≥ L_S  (delegated to Duns-Ros mist model)
 *
 * @param q_oil_bpd    Oil rate (bbl/d)
 * @param q_gas_Mscfd  Free gas rate (Mscf/d)
 * @param q_wat_bpd    Water rate (bbl/d)
 * @param D_in         Tubing inside diameter (in)
 * @param SG_oil       Oil specific gravity
 * @param SG_gas       Gas specific gravity
 * @param mu_l_cp      Liquid viscosity (cp)
 * @param sigma_lbf_ft Liquid-gas surface tension (lbf/ft)
 * @param P_avg_psia   Average pressure (psia)
 * @param T_avg_F      Average temperature (°F)
 * @returns            Pressure gradient (psi/ft)
 */
export function orkiszewskiGradient(
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_in: number,
  SG_oil: number,
  SG_gas: number,
  mu_l_cp: number,
  sigma_lbf_ft: number,
  P_avg_psia: number,
  T_avg_F: number,
): number {
  const D_ft  = D_in / 12;
  const A_ft2 = PI_CONST * D_ft * D_ft / 4;
  const T_R   = T_avg_F + 459.67;

  // In-situ flow rates
  const Bg        = 0.02827 * T_R / P_avg_psia;
  const q_l_ft3s  = (q_oil_bpd + q_wat_bpd) * 5.615 / 86400;
  const q_g_ft3s  = (q_gas_Mscfd * 1000) * Bg / 86400;
  const v_sl      = q_l_ft3s / A_ft2;
  const v_sg      = q_g_ft3s / A_ft2;
  const v_m       = v_sl + v_sg;
  if (v_m <= 0) return 0;

  // Liquid input ratio (no-slip gas void fraction)
  const lambda_g  = v_sg / v_m;

  // Fluid properties
  const rho_oil = SG_oil * 62.4;
  const rho_wat = 62.4;
  const rho_gas = SG_gas * 0.0764 * P_avg_psia / 14.7 * 520 / T_R;
  const q_l_total = q_oil_bpd + q_wat_bpd;
  const rho_l = q_l_total > 0
    ? (rho_oil * q_oil_bpd + rho_wat * q_wat_bpd) / q_l_total
    : rho_oil;

  // ── Flow regime boundaries (Orkiszewski 1967, Table 1) ──────────────────────
  // Bubble/slug boundary: v_sg < v_sb (bubble limit)
  const v_b  = griffithWallisSlugVelocity(D_ft);          // Taylor bubble velocity
  const L_B  = 1 - Math.min(0.25, 0.1333 * D_ft);        // λ_g < L_B → bubble
  // Mist boundary: λ_g ≥ L_S
  const L_S  = (v_b >= 1.15 * v_m) ? 0.9 : 0.65;         // adjusted mist boundary

  let HL: number;
  let f_orki: number;

  if (lambda_g < L_B) {
    // ── Bubble flow: Griffith-Wallis (1961) bubble model ──────────────────────
    // Liquid holdup: solve v_sg = (1-HL) × (v_m + v_b) → HL = 1 - v_sg/(v_m+v_b)
    HL = Math.max(0, Math.min(1, 1 - v_sg / (v_m + v_b)));
    const Re = rho_l * v_m * D_ft / (mu_l_cp * 6.72e-4);
    f_orki = moodyFriction(Re, 0.00015, D_ft);

  } else if (lambda_g < L_S) {
    // ── Slug flow: Griffith-Wallis (1961) slug model ──────────────────────────
    // Slug unit: gas bubble rises at v_b; liquid fills slug body.
    // Liquid velocity in slug body: v_sl_body = v_m - v_sg_bubble
    // Taylor bubble void in slug body: α_b = v_sg / (v_b + v_m × (1-delta_b))
    // Simplified: HL = v_sl / (v_m + v_b)  (Griffith-Wallis Eq. 7)
    HL = Math.max(0, Math.min(0.99, v_sl / (v_m + v_b)));
    // Friction: liquid film around slug controls
    const Re_slug = rho_l * v_m * D_ft / (mu_l_cp * 6.72e-4);
    f_orki = moodyFriction(Re_slug, 0.00015, D_ft);

  } else {
    // ── Mist flow: use Duns-Ros Region III approach ────────────────────────────
    HL = 0;
    const mu_g_cp = 0.01 + 0.0001 * SG_gas;
    const rho_ns  = rho_l * v_sl / v_m + rho_gas * v_sg / v_m;
    const Re_mist = rho_ns * v_m * D_ft / (mu_g_cp * 6.72e-4);
    f_orki = moodyFriction(Re_mist, 0.00015, D_ft);
  }

  // Mixture density with holdup
  const rho_s = rho_l * HL + rho_gas * (1 - HL);

  // Gradient: gravity + friction
  const grad_grav = rho_s / 144;
  const rho_ns    = rho_l * v_sl / v_m + rho_gas * v_sg / v_m;
  const grad_fric = f_orki * rho_ns * v_m * v_m / (2 * G_FT_S2 * D_ft * 144);

  return grad_grav + grad_fric;
}

/**
 * Orkiszewski (1967) bottomhole pressure (psia).
 *
 * @param Pwh_psia      Wellhead pressure (psia)
 * @param q_oil_bpd     Oil rate (bbl/d)
 * @param q_gas_Mscfd   Free gas rate (Mscf/d)
 * @param q_wat_bpd     Water rate (bbl/d)
 * @param D_in          Tubing inside diameter (in)
 * @param L_ft          Tubing length (ft)
 * @param SG_oil        Oil specific gravity
 * @param SG_gas        Gas specific gravity
 * @param mu_l_cp       Liquid viscosity (cp)
 * @param sigma_lbf_ft  Surface tension (lbf/ft)
 * @param T_wh_F        Wellhead temperature (°F)
 * @param T_bh_F        Bottomhole temperature (°F)
 * @returns             BHP (psia)
 */
export function orkiszewskiBHP(
  Pwh_psia: number,
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_in: number,
  L_ft: number,
  SG_oil: number,
  SG_gas: number,
  mu_l_cp: number,
  sigma_lbf_ft: number,
  T_wh_F: number,
  T_bh_F: number,
): number {
  const nSeg = 10;
  let P = Pwh_psia;
  const dL = L_ft / nSeg;
  for (let i = 0; i < nSeg; i++) {
    const T_F = T_wh_F + (T_bh_F - T_wh_F) * (i + 0.5) / nSeg;
    const grad = orkiszewskiGradient(
      q_oil_bpd, q_gas_Mscfd, q_wat_bpd, D_in,
      SG_oil, SG_gas, mu_l_cp, sigma_lbf_ft, P, T_F,
    );
    P += grad * dL;
  }
  return P;
}

// ════════════════════════════════════════════════════════════════════════════
// Session 17 — Aziz-Govier-Fogarasi (AGF) mechanistic multiphase correlation
// ════════════════════════════════════════════════════════════════════════════

/**
 * Aziz-Govier-Fogarasi (1972) multiphase pressure gradient in a vertical pipe.
 *
 * Uses dimensionless velocity numbers (Ngv, Nlv, Nd, Nl) and the flow-pattern
 * map of Aziz et al. to identify bubble, slug, churn, or mist flow and compute
 * the two-phase pressure gradient (psi/ft).
 *
 * @param q_oil_bpd     Oil flow rate (bbl/d)
 * @param q_gas_Mscfd   Total gas rate (Mscf/d)
 * @param q_wat_bpd     Water flow rate (bbl/d)
 * @param D_in          Tubing inside diameter (inches)
 * @param SG_oil        Oil specific gravity (water=1)
 * @param SG_gas        Gas specific gravity (air=1)
 * @param mu_l_cp       Liquid viscosity (cp)
 * @param sigma_dyn_cm  Liquid-gas surface tension (dyne/cm)
 * @param P_avg_psia    Average pressure (psia)
 * @param T_avg_F       Average temperature (°F)
 * @returns             Two-phase pressure gradient (psi/ft)
 */
export function azizGovierFogarasiGradient(
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_in: number,
  SG_oil: number,
  SG_gas: number,
  mu_l_cp: number,
  sigma_dyn_cm: number,
  P_avg_psia: number,
  T_avg_F: number,
): number {
  const D_ft   = D_in / 12;
  const A      = Math.PI / 4 * D_ft * D_ft;
  const T_R    = T_avg_F + 459.67;

  // Superficial velocities (ft/s) — convert field rates to ft³/s
  const q_l_ft3s = (q_oil_bpd + q_wat_bpd) * 5.615 / 86400;
  const z_factor = 0.9;  // approximate z for gradient calculation
  const q_g_ft3s = q_gas_Mscfd * 1000 * (14.7 / P_avg_psia) * (T_R / 520) * z_factor / 86400;
  const v_sl = q_l_ft3s / A;
  const v_sg = q_g_ft3s / A;
  const v_m  = v_sl + v_sg;

  // Fluid properties
  const rho_oil = SG_oil * 62.4;          // lb/ft³
  const rho_wat = 62.4;
  const rho_gas = SG_gas * 0.0764 * P_avg_psia / 14.7 * 520 / T_R;   // lb/ft³
  const rho_l   = (q_oil_bpd * rho_oil + q_wat_bpd * rho_wat) / Math.max(q_oil_bpd + q_wat_bpd, 1e-9);
  const sigma_lbf_ft = sigma_dyn_cm * 6.852e-3;  // dyne/cm → lbf/ft

  // Aziz-Govier-Fogarasi dimensionless numbers
  // Ngv = v_sg * (rho_l / (g * sigma))^0.25
  // Nlv = v_sl * (rho_l / (g * sigma))^0.25
  // Nd  = D * (rho_l * g / sigma)^0.5
  // Nl  = mu_l * (g / (rho_l * sigma^3))^0.25
  const g = 32.174;  // ft/s²
  const sigma_lbf_ft2 = sigma_lbf_ft;  // lbf/ft is consistent with ft/s units
  const refTerm  = Math.pow(rho_l / (g * sigma_lbf_ft2 + 1e-9), 0.25);
  const Ngv = v_sg * refTerm;
  const Nlv = v_sl * refTerm;
  const Nd  = D_ft * Math.sqrt(rho_l * g / (sigma_lbf_ft2 + 1e-9));
  const mu_l_lbf_s = mu_l_cp * 2.0885e-5;   // cp → lbf·s/ft²
  const Nl  = mu_l_lbf_s * Math.pow(g / (rho_l * sigma_lbf_ft2 ** 3 + 1e-27), 0.25);

  // Flow pattern boundaries (Aziz et al. 1972 Figs 1-2)
  // Bubble/slug boundary:   Ngv_bs = 0.51 * (100 * Nlv)^0.172
  // Slug/churn boundary:    Ngv_sc = 0.35 + Nlv
  // Transition/mist:        Ngv_tm = 75  (approx.)
  const Ngv_bs = 0.51 * Math.pow(Math.max(1, 100 * Nlv), 0.172);
  const Ngv_sc = 0.35 + Nlv;
  const Ngv_tm = 75.0;

  let HL: number;
  let regime: string;

  if (Ngv < Ngv_bs) {
    // ── Bubble flow ─────────────────────────────────────────────────────────
    regime = "bubble";
    // Liquid holdup: Aziz et al. bubble correlation
    // HL = 1 - Ngv / (Ngv + 3.0 * refTerm * v_sg_slip)
    // Simplified: HL ≈ 1 - v_sg / (v_m + v_slip)  with v_slip = 0.8 ft/s
    const v_slip = 0.8;
    HL = Math.max(0.5, Math.min(1.0, 1 - v_sg / (v_m + v_slip)));
  } else if (Ngv < Ngv_sc) {
    // ── Slug flow ────────────────────────────────────────────────────────────
    regime = "slug";
    // Griffith-Wallis slug model
    const v_Taylor = 0.35 * Math.sqrt(g * D_ft);  // Taylor bubble velocity
    HL = Math.max(0.1, Math.min(0.95, v_sl / (v_m + v_Taylor)));
  } else if (Ngv < Ngv_tm) {
    // ── Churn / transition flow ───────────────────────────────────────────────
    regime = "churn";
    // Transition between slug and mist: interpolate linearly in Ngv
    const frac = (Ngv - Ngv_sc) / (Ngv_tm - Ngv_sc);
    const HL_slug = Math.max(0.1, v_sl / (v_m + 0.35 * Math.sqrt(g * D_ft)));
    const HL_mist = v_sl / v_m;
    HL = (1 - frac) * HL_slug + frac * HL_mist;
  } else {
    // ── Annular-mist flow ────────────────────────────────────────────────────
    regime = "mist";
    // Lockhart-Martinelli no-slip fraction
    HL = v_sl / v_m;
  }

  // Mixture density
  const rho_s = rho_l * HL + rho_gas * (1 - HL);

  // Friction factor (Moody)
  const Re_mix = rho_l * v_m * D_ft / (mu_l_cp * 6.72e-4 + 1e-12);
  const f_mix  = moodyFriction(Re_mix, 0.00015, D_ft);

  // No-slip density for friction
  const rho_ns = rho_l * (v_sl / v_m) + rho_gas * (v_sg / v_m);

  // Two-phase friction factor correction (Aziz et al. suggest Φ²_l from HL)
  const phi2_l  = Math.pow(1 + (1 - HL) / (HL + 1e-9), 0.25);

  const grad_grav = rho_s / 144;            // psi/ft
  const grad_fric = f_mix * phi2_l * rho_ns * v_m * v_m / (2 * g * D_ft * 144);

  void regime;  // suppress unused-variable warning
  return grad_grav + grad_fric;
}

/**
 * Aziz-Govier-Fogarasi (1972) bottomhole pressure.
 *
 * Integrates the AGF two-phase gradient over the tubing length using
 * 10 equal depth segments with linear temperature interpolation.
 *
 * @param Pwh_psia      Wellhead pressure (psia)
 * @param q_oil_bpd     Oil rate (bbl/d)
 * @param q_gas_Mscfd   Free gas rate (Mscf/d)
 * @param q_wat_bpd     Water rate (bbl/d)
 * @param D_in          Tubing inside diameter (inches)
 * @param L_ft          Tubing length / depth (ft)
 * @param SG_oil        Oil specific gravity (water=1)
 * @param SG_gas        Gas specific gravity (air=1)
 * @param mu_l_cp       Liquid viscosity (cp)
 * @param sigma_dyn_cm  Liquid-gas surface tension (dyne/cm)
 * @param T_wh_F        Wellhead temperature (°F)
 * @param T_bh_F        Bottomhole temperature (°F)
 * @returns             Bottomhole pressure (psia)
 */
export function azizGovierFogarasiBHP(
  Pwh_psia: number,
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_in: number,
  L_ft: number,
  SG_oil: number,
  SG_gas: number,
  mu_l_cp: number,
  sigma_dyn_cm: number,
  T_wh_F: number,
  T_bh_F: number,
): number {
  const nSeg = 10;
  let P = Pwh_psia;
  const dL = L_ft / nSeg;
  for (let i = 0; i < nSeg; i++) {
    const T_F = T_wh_F + (T_bh_F - T_wh_F) * (i + 0.5) / nSeg;
    const P_avg = P + 0.5 * azizGovierFogarasiGradient(
      q_oil_bpd, q_gas_Mscfd, q_wat_bpd, D_in,
      SG_oil, SG_gas, mu_l_cp, sigma_dyn_cm, P, T_F,
    ) * dL;
    const grad = azizGovierFogarasiGradient(
      q_oil_bpd, q_gas_Mscfd, q_wat_bpd, D_in,
      SG_oil, SG_gas, mu_l_cp, sigma_dyn_cm, P_avg, T_F,
    );
    P += grad * dL;
  }
  return P;
}

// ─── VFP System Optimization ──────────────────────────────────────────────────

/**
 * Optimal tubing inner diameter selection.
 *
 * Scans a list of candidate tubing IDs and returns the BHP for each,
 * identifying the ID that minimizes BHP (maximum deliverability) for
 * given production rates.  Uses the Beggs & Brill correlation internally.
 *
 * @param q_oil_bpd      Oil flow rate (bbl/d)
 * @param q_gas_Mscfd    Free gas rate (Mscf/d)
 * @param q_wat_bpd      Water flow rate (bbl/d)
 * @param D_candidates   Array of candidate tubing IDs (inches)
 * @param L_ft           Tubing depth / length (ft)
 * @param Pwh_psia       Wellhead pressure (psia)
 * @param SG_oil         Oil specific gravity (water=1)
 * @param SG_gas         Gas specific gravity (air=1)
 * @param mu_l_cp        Liquid viscosity (cp)
 * @param T_avg_F        Average tubing temperature (°F)
 * @returns              Array of {D_in, BHP_psia} plus bestD_in (lowest BHP)
 */
export function vfpOptimalTubing(
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  q_wat_bpd: number,
  D_candidates: number[],
  L_ft: number,
  Pwh_psia: number,
  SG_oil: number,
  SG_gas: number,
  mu_l_cp: number,
  T_avg_F: number,
): { results: { D_in: number; BHP_psia: number }[]; bestD_in: number } {
  if (D_candidates.length === 0) throw new Error("D_candidates must not be empty");
  const results: { D_in: number; BHP_psia: number }[] = [];
  let bestD_in = D_candidates[0];
  let bestBHP = Infinity;
  const q_liq_bpd = q_oil_bpd + q_wat_bpd;
  // Use a blended liquid SG weighted by flow rate
  const SG_liq = q_liq_bpd > 0
    ? (q_oil_bpd * SG_oil + q_wat_bpd * 1.0) / q_liq_bpd
    : SG_oil;
  for (const D of D_candidates) {
    const BHP = beggsBrillBHP(
      Pwh_psia, q_liq_bpd, q_gas_Mscfd,
      D, L_ft, T_avg_F, T_avg_F, SG_liq, SG_gas,
    );
    results.push({ D_in: D, BHP_psia: BHP });
    if (BHP < bestBHP) { bestBHP = BHP; bestD_in = D; }
  }
  return { results, bestD_in };
}

/**
 * Optimal Gas-Liquid Ratio (GLR) for a flowing well system.
 *
 * Scans GLR values from glr_min to glr_max (scf/bbl) and computes the VLP
 * BHP at each GLR.  A lower BHP at a given IPR corresponds to a higher
 * production rate.  Returns the GLR that minimises BHP (optimal lift).
 *
 * @param q_liq_bpd      Liquid rate (bbl/d) — held constant in scan
 * @param glr_min        Minimum GLR to scan (scf/bbl)
 * @param glr_max        Maximum GLR to scan (scf/bbl)
 * @param nScan          Number of scan points (default 20)
 * @param D_in           Tubing inside diameter (inches)
 * @param L_ft           Tubing depth (ft)
 * @param Pwh_psia       Wellhead pressure (psia)
 * @param SG_oil         Oil specific gravity (water=1)
 * @param SG_gas         Gas specific gravity (air=1)
 * @param mu_l_cp        Liquid viscosity (cp)
 * @param T_avg_F        Average tubing temperature (°F)
 * @returns              {glr_scan, bhp_scan, optGLR_scf_bbl, minBHP_psia}
 */
export function vfpGLROptimal(
  q_liq_bpd: number,
  glr_min: number,
  glr_max: number,
  nScan: number,
  D_in: number,
  L_ft: number,
  Pwh_psia: number,
  SG_oil: number,
  SG_gas: number,
  mu_l_cp: number,
  T_avg_F: number,
): { glr_scan: number[]; bhp_scan: number[]; optGLR_scf_bbl: number; minBHP_psia: number } {
  if (nScan < 2) nScan = 20;
  const glr_scan: number[] = [];
  const bhp_scan: number[] = [];
  let optGLR = glr_min;
  let minBHP = Infinity;
  for (let i = 0; i < nScan; i++) {
    const glr = glr_min + (glr_max - glr_min) * i / (nScan - 1);
    const q_gas_Mscfd = q_liq_bpd * glr / 1000;
    const BHP = beggsBrillBHP(
      Pwh_psia, q_liq_bpd, q_gas_Mscfd,
      D_in, L_ft, T_avg_F, T_avg_F, SG_oil, SG_gas,
    );
    glr_scan.push(glr);
    bhp_scan.push(BHP);
    if (BHP < minBHP) { minBHP = BHP; optGLR = glr; }
  }
  return { glr_scan, bhp_scan, optGLR_scf_bbl: optGLR, minBHP_psia: minBHP };
}

/**
 * Choke (bean) pressure drop — Gilbert critical-flow correlation.
 *
 * Gilbert (1954) equation for critical multiphase flow through a choke:
 *
 *   q_oil = (1 / 10) · (P_up · d^1.89) / (GLR^0.546)
 *
 * Re-arranged for pressure drop: ΔP = P_up – P_dn  where P_up is solved
 * from the measured rates and bean size (critical flow assumed):
 *
 *   P_up = 10 · q_oil · GLR^0.546 / d^1.89
 *
 * Returns upstream pressure, downstream pressure, pressure drop, and a
 * flag indicating whether flow is critical (sonic) or subcritical.
 *
 * @param q_oil_bpd      Oil rate (bbl/d)
 * @param q_gas_Mscfd    Gas rate (Mscf/d)
 * @param d_choke_64ths  Bean/choke size in 64ths of an inch (e.g. 16 = 16/64" = 1/4")
 * @param P_dn_psia      Downstream (tubing head) pressure (psia)
 * @returns              {P_up_psia, P_dn_psia, dP_psia, GLR_scf_bbl, critical}
 */
export function vfpChokeDP(
  q_oil_bpd: number,
  q_gas_Mscfd: number,
  d_choke_64ths: number,
  P_dn_psia: number,
): { P_up_psia: number; P_dn_psia: number; dP_psia: number; GLR_scf_bbl: number; critical: boolean } {
  const GLR = (q_gas_Mscfd * 1000) / Math.max(q_oil_bpd, 0.001); // scf/bbl
  const d = d_choke_64ths;                                         // 64ths of inch
  // Gilbert: P_up = 10 · q · GLR^0.546 / d^1.89 (field units, q in bbl/d)
  const P_up = 10 * q_oil_bpd * Math.pow(GLR, 0.546) / Math.pow(d, 1.89);
  const dP = P_up - P_dn_psia;
  // Critical flow condition: P_dn / P_up < 0.546 (approximate critical ratio for natural gas)
  const critical = P_dn_psia / P_up < 0.546;
  return { P_up_psia: P_up, P_dn_psia, dP_psia: dP, GLR_scf_bbl: GLR, critical };
}

/**
 * Nodal analysis — gas well IPR meets VLP intersection.
 *
 * Builds a gas IPR curve (Darcy flow) and a VLP curve (Weymouth) for each q
 * in q_arr, then finds the intersection (operating point) by bisection.
 *
 * IPR: q_g = (kh / (1422 * T_R * mu * Z)) * (Pr² - Pwf²) / (ln(re/rw) - 0.75 + S)
 * VLP: uses singlePhaseGasBHP (average T-Z method) to compute Pwf from Pwh
 *
 * @param Pr          Reservoir pressure (psia)
 * @param k           Permeability (md)
 * @param h           Net pay (ft)
 * @param re          Drainage radius (ft)
 * @param rw          Wellbore radius (ft)
 * @param S           Skin factor
 * @param T_R         Reservoir temperature (°R)
 * @param gamma_g     Gas specific gravity (air=1)
 * @param q_arr       Flow rate array to evaluate (Mscf/d)
 * @param Pwh_psia    Wellhead pressure (psia)
 * @param D_in        Tubing ID (in)
 * @param L_ft        Tubing length (ft)
 * @param T_avg_F     Average temperature (°F)
 * @param SG_gas      Gas SG for VLP calculation
 * @returns           {q_intersection_Mscfd, Pwf_intersection_psia, IPR_Pwf_arr, VLP_Pwf_arr}
 */
export function vfpNodalIPRGasVLP(
  Pr: number,
  k: number,
  h: number,
  re: number,
  rw: number,
  S: number,
  T_R: number,
  gamma_g: number,
  q_arr: number[],
  Pwh_psia: number,
  D_in: number,
  L_ft: number,
  T_avg_F: number,
  SG_gas: number,
): {
  q_intersection_Mscfd: number;
  Pwf_intersection_psia: number;
  IPR_Pwf_arr: number[];
  VLP_Pwf_arr: number[];
} {
  // Default viscosity and Z — approximate for lean natural gas at typical reservoir conditions.
  // Valid for SG ~0.6-0.7 natural gas, Pr 1000-5000 psia, T_R 550-700 °R.
  // Accuracy ~±15%; use component-level EoS for sour/rich gas.
  const mu = 0.02;  // cp, typical lean gas reservoir viscosity
  const Z  = 0.85;  // Z-factor at approximate mid-conditions

  const lnPart = Math.log(re / rw) - 0.75 + S;
  const C_ipr  = (k * h) / (1422 * T_R * mu * Z * lnPart); // Mscfd/psia²

  const IPR_Pwf_arr: number[] = [];
  const VLP_Pwf_arr: number[] = [];

  for (const q_g of q_arr) {
    // IPR: Pwf² = Pr² - q_g / C_ipr  → Pwf
    const Pwf2_ipr = Pr * Pr - q_g / C_ipr;
    IPR_Pwf_arr.push(Pwf2_ipr > 0 ? Math.sqrt(Pwf2_ipr) : 0);

    // VLP: compute Pwf given Pwh and q_g using average T-Z gas BHP
    const T_avg_R = T_avg_F + 460; // convert °F to °R
    const z_avg   = 0.85;          // approximate Z at mid-conditions
    const Pwf_vlp = singlePhaseGasBHP(Pwh_psia, q_g, D_in, L_ft, T_avg_R, z_avg, SG_gas);
    VLP_Pwf_arr.push(Pwf_vlp);
  }

  // Find intersection: where IPR_Pwf - VLP_Pwf changes sign
  let q_int = q_arr[0];
  let Pwf_int = (IPR_Pwf_arr[0] + VLP_Pwf_arr[0]) / 2;
  for (let i = 0; i < q_arr.length - 1; i++) {
    const diff1 = IPR_Pwf_arr[i]   - VLP_Pwf_arr[i];
    const diff2 = IPR_Pwf_arr[i+1] - VLP_Pwf_arr[i+1];
    if (diff1 * diff2 <= 0) {
      // Linear interpolation for crossing
      const frac = Math.abs(diff1) / (Math.abs(diff1) + Math.abs(diff2));
      q_int   = q_arr[i] + frac * (q_arr[i+1] - q_arr[i]);
      Pwf_int = IPR_Pwf_arr[i] + frac * (IPR_Pwf_arr[i+1] - IPR_Pwf_arr[i]);
      break;
    }
  }

  return {
    q_intersection_Mscfd:   q_int,
    Pwf_intersection_psia:  Pwf_int,
    IPR_Pwf_arr,
    VLP_Pwf_arr,
  };
}

/**
 * Nodal analysis — oil well composite IPR meets VLP (Beggs-Brill).
 *
 * Builds composite Vogel/Darcy oil IPR and Beggs-Brill VLP curves,
 * finds the nodal intersection (operating point).
 *
 * @param Pr          Reservoir pressure (psia)
 * @param PI          Productivity index above bubble point (bpd/psi)
 * @param Pb          Bubble point pressure (psia)
 * @param q_arr       Flow rate array to evaluate (bpd)
 * @param Pwh_psia    Wellhead pressure (psia)
 * @param D_in        Tubing ID (in)
 * @param L_ft        Tubing length (ft)
 * @param T_avg_F     Average temperature (°F)
 * @param SG_oil      Oil specific gravity
 * @param SG_gas      Gas specific gravity
 * @param GOR         Solution GOR (scf/bbl)
 * @returns           {q_intersection_bpd, Pwf_intersection_psia, IPR_arr, VLP_arr}
 */
export function vfpNodalIPROilVLP(
  Pr: number,
  PI: number,
  Pb: number,
  q_arr: number[],
  Pwh_psia: number,
  D_in: number,
  L_ft: number,
  T_avg_F: number,
  SG_oil: number,
  SG_gas: number,
  GOR: number,
): {
  q_intersection_bpd:    number;
  Pwf_intersection_psia: number;
  IPR_arr:               number[];
  VLP_arr:               number[];
} {
  // Max flow rate at Pwf = 0 (composite Vogel)
  const q_b = PI * (Pr - Pb);          // rate at bubble point
  const q_max_vogel = q_b + PI * Pb / 1.8; // Vogel extension
  const IPR_arr: number[] = [];
  const VLP_arr: number[] = [];

  for (const q_o of q_arr) {
    let Pwf_ipr: number;
    if (q_o <= q_b) {
      // Above bubble point (Darcy)
      Pwf_ipr = Pr - q_o / PI;
    } else {
      // Below bubble point (Vogel)
      const q_rel = (q_o - q_b) / Math.max(q_max_vogel - q_b, 1e-6);
      // Vogel: q/q_max = 1 - 0.2*(Pwf/Pb) - 0.8*(Pwf/Pb)²
      // Solve for Pwf/Pb: 0.8x² + 0.2x + (q_rel - 1) = 0
      const disc = 0.04 + 4 * 0.8 * (1 - q_rel);
      const x    = disc > 0 ? (-0.2 + Math.sqrt(disc)) / (2 * 0.8) : 0;
      Pwf_ipr = Math.max(0, x * Pb);
    }
    IPR_arr.push(Pwf_ipr);

    // VLP: Beggs-Brill BHP
    const q_gas_Mscfd = q_o * GOR / 1000;
    const Pwf_vlp = beggsBrillBHP(Pwh_psia, q_o, q_gas_Mscfd, D_in, L_ft, T_avg_F, T_avg_F, SG_oil, SG_gas);
    VLP_arr.push(Pwf_vlp);
  }

  // Find intersection
  let q_int   = q_arr[0];
  let Pwf_int = (IPR_arr[0] + VLP_arr[0]) / 2;
  for (let i = 0; i < q_arr.length - 1; i++) {
    const diff1 = IPR_arr[i]   - VLP_arr[i];
    const diff2 = IPR_arr[i+1] - VLP_arr[i+1];
    if (diff1 * diff2 <= 0) {
      const frac = Math.abs(diff1) / (Math.abs(diff1) + Math.abs(diff2));
      q_int   = q_arr[i] + frac * (q_arr[i+1] - q_arr[i]);
      Pwf_int = IPR_arr[i] + frac * (IPR_arr[i+1] - IPR_arr[i]);
      break;
    }
  }

  return { q_intersection_bpd: q_int, Pwf_intersection_psia: Pwf_int, IPR_arr, VLP_arr };
}

/**
 * Choke sensitivity analysis — Gilbert upstream pressure for each flow rate.
 *
 * For each q_oil in q_oil_arr, uses the Gilbert critical-flow correlation to
 * compute upstream (tubing head) pressure for a given choke size and GOR.
 * GOR is constant (fixed GLR scenario).
 *
 * Gilbert: P_up = 10 * q_oil * GLR^0.546 / d^1.89
 *
 * @param q_oil_arr      Oil rate array (bpd)
 * @param GLR_scf_bbl    Gas-liquid ratio (scf/bbl)
 * @param d_choke_64ths  Choke bean size in 64ths of an inch
 * @param P_dn_psia      Downstream (separator / flowline) pressure (psia)
 * @returns              {q_arr, P_up_arr, dP_arr}
 */
export function vfpChokeSensitivity(
  q_oil_arr: number[],
  GLR_scf_bbl: number,
  d_choke_64ths: number,
  P_dn_psia: number,
): { q_arr: number[]; P_up_arr: number[]; dP_arr: number[] } {
  const P_up_arr: number[] = [];
  const dP_arr:   number[] = [];
  const GLR = Math.max(GLR_scf_bbl, 1);

  for (const q_o of q_oil_arr) {
    const P_up = 10 * q_o * Math.pow(GLR, 0.546) / Math.pow(d_choke_64ths, 1.89);
    P_up_arr.push(P_up);
    dP_arr.push(P_up - P_dn_psia);
  }

  return { q_arr: q_oil_arr, P_up_arr, dP_arr };
}
