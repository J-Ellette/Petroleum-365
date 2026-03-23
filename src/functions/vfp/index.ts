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
