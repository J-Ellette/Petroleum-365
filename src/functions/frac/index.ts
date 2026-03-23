/**
 * P365 — Hydraulic Fracturing (FRAC)
 *
 * Fracture geometry, proppant transport, and production enhancement:
 *   PKN (Perkins-Kern-Nordgren) fracture geometry
 *   KGD (Khristianovic-Geertsma-de Klerk) fracture geometry
 *   Radial fracture geometry
 *   Carter leakoff model
 *   Proppant settling velocity (modified Stokes law)
 *   Dimensionless conductivity CfD
 *   Fractured well equivalent skin factor
 *
 * Units: field (bbl/min, psi, ft, md, cp, in).
 */

// ─── Material Constants ────────────────────────────────────────────────────────

/** Plane-strain modulus from Young's modulus and Poisson's ratio. */
function planStrainModulus(E_psi: number, nu: number): number {
  return E_psi / (1 - nu * nu);
}

// ─── PKN Fracture Geometry ─────────────────────────────────────────────────────

/**
 * PKN (Perkins-Kern-Nordgren) fracture — average width.
 *
 * w̄ = 2.31 · (μ · qi · xf / E')^0.25
 *
 * Reference: Nolte-Smith (1981); PKN geometry assumes fixed height hf.
 * Field units: μ in cp, qi in bbl/min, xf in ft, E' in psi → w in inches.
 *
 * @param mu_cp     Fracturing fluid viscosity (cp)
 * @param qi_bpm    Injection rate (bbl/min)
 * @param xf_ft     Fracture half-length (ft)
 * @param E_psi     Young's modulus (psi)
 * @param nu        Poisson's ratio
 * @returns         Average fracture width (in)
 */
export function pknAverageWidth(mu_cp: number, qi_bpm: number, xf_ft: number, E_psi: number, nu: number): number {
  const Ep = planStrainModulus(E_psi, nu);
  // Field-unit derivation: convert qi to ft³/s, μ to lb·s/ft², result to inches
  // w̄ (in) = 2.31 * (μ(cp) * qi(bbl/min) * xf(ft) / E'(psi))^0.25
  return 2.31 * Math.pow((mu_cp * qi_bpm * xf_ft) / Ep, 0.25);
}

/**
 * PKN fracture — maximum wellbore width (at wellbore, perpendicular to fracture face).
 *
 * w_max = (4/π) · w̄   (PKN elliptical cross-section)
 *
 * @param w_avg_in  Average fracture width (in)
 * @returns         Maximum width at wellbore (in)
 */
export function pknMaxWidth(w_avg_in: number): number {
  return (4 / Math.PI) * w_avg_in;
}

/**
 * PKN fracture volume.
 *
 * V_frac = (π/4) · w_max · hf · xf · 2  (both wings, elliptical cross-section)
 *        = π · w_avg · hf · xf  (gallons)
 *
 * @param xf_ft     Fracture half-length (ft)
 * @param hf_ft     Fracture height (ft)
 * @param w_avg_in  Average fracture width (in)
 * @returns         Fracture volume (gal) — one wing
 */
export function pknFractureVolume(xf_ft: number, hf_ft: number, w_avg_in: number): number {
  // Convert in → ft: w_avg_ft = w_avg_in / 12
  const Vf_ft3 = (Math.PI / 4) * (w_avg_in / 12) * hf_ft * xf_ft;  // one wing, elliptical
  return Vf_ft3 * 7.48052;  // ft³ → gal (7.48 gal/ft³)
}

/**
 * PKN fluid efficiency.
 *
 * η = V_fracture / V_pumped
 *
 * @param Vf_gal    Fracture volume (gal)
 * @param Vt_gal    Total pumped volume (gal)
 * @returns         Fluid efficiency (0–1)
 */
export function pknFluidEfficiency(Vf_gal: number, Vt_gal: number): number {
  if (Vt_gal <= 0) throw new Error("Pumped volume must be positive");
  return Math.min(1.0, Vf_gal / Vt_gal);
}

/**
 * PKN fracture net pressure (pressure above fracture closure).
 *
 * ΔP_net = (E' · w̄) / (2 · xf)    (at wellbore)
 *
 * @param w_avg_in  Average fracture width (in)
 * @param xf_ft     Fracture half-length (ft)
 * @param E_psi     Young's modulus (psi)
 * @param nu        Poisson's ratio
 * @returns         Net pressure (psi)
 */
export function pknNetPressure(w_avg_in: number, xf_ft: number, E_psi: number, nu: number): number {
  const Ep = planStrainModulus(E_psi, nu);
  return (Ep * (w_avg_in / 12)) / (2 * xf_ft);
}

// ─── KGD Fracture Geometry ─────────────────────────────────────────────────────

/**
 * KGD (Khristianovic-Geertsma-de Klerk) fracture — average width.
 *
 * KGD assumes a fixed fracture length (plane-strain in the horizontal plane).
 * w̄_KGD = 2.51 · (μ · qi · xf² / (E' · hf))^0.25
 *
 * @param mu_cp     Fracturing fluid viscosity (cp)
 * @param qi_bpm    Injection rate (bbl/min)
 * @param xf_ft     Fracture half-length (ft)
 * @param hf_ft     Fracture height (ft)
 * @param E_psi     Young's modulus (psi)
 * @param nu        Poisson's ratio
 * @returns         Average fracture width (in)
 */
export function kgdAverageWidth(
  mu_cp: number,
  qi_bpm: number,
  xf_ft: number,
  hf_ft: number,
  E_psi: number,
  nu: number
): number {
  const Ep = planStrainModulus(E_psi, nu);
  return 2.51 * Math.pow((mu_cp * qi_bpm * xf_ft * xf_ft) / (Ep * hf_ft), 0.25);
}

/**
 * KGD fracture volume (both wings).
 *
 * V_KGD = (π/4) · w_avg · hf · 2·xf   (rectangular cross-section, width varies)
 *
 * @param xf_ft     Fracture half-length (ft)
 * @param hf_ft     Fracture height (ft)
 * @param w_avg_in  Average fracture width (in)
 * @returns         Fracture volume (gal), one wing
 */
export function kgdFractureVolume(xf_ft: number, hf_ft: number, w_avg_in: number): number {
  const Vf_ft3 = (w_avg_in / 12) * hf_ft * xf_ft;  // rectangular approximation, one wing
  return Vf_ft3 * 7.48052;
}

// ─── Radial Fracture Geometry ─────────────────────────────────────────────────

/**
 * Radial (penny-shaped) fracture — radius.
 *
 * R = [E' · V_frac / (8 · (1-ν) · ΔP_net)]^(1/3)   — plane-strain formulation
 * Simplified field form: R (ft) ≈ 0.52 · (E'·V_gal / ΔP_psi)^(1/3)
 *
 * @param V_gal      Fracture volume (gal)
 * @param E_psi      Young's modulus (psi)
 * @param nu         Poisson's ratio
 * @param dPnet_psi  Net pressure (psi)
 * @returns          Fracture radius (ft)
 */
export function radialFractureRadius(V_gal: number, E_psi: number, nu: number, dPnet_psi: number): number {
  const Ep = planStrainModulus(E_psi, nu);
  const V_ft3 = V_gal / 7.48052;
  return Math.pow((3 * Ep * V_ft3) / (16 * dPnet_psi), 1 / 3);
}

// ─── Carter Leakoff ───────────────────────────────────────────────────────────

/**
 * Carter (1957) fluid leakoff coefficient.
 *
 * Total leakoff coefficient: 1/C_total = 1/C_w + 1/C_v + 1/C_c
 *
 * @param C_w   Wall-building coefficient (ft/√min)
 * @param C_v   Viscosity-controlled coefficient (ft/√min)
 * @param C_c   Compressibility-controlled coefficient (ft/√min)
 * @returns     Total leakoff coefficient (ft/√min)
 */
export function carterLeakoffCoeff(C_w: number, C_v: number, C_c: number): number {
  return 1 / (1 / C_w + 1 / C_v + 1 / C_c);
}

/**
 * Cumulative fluid loss by Carter model.
 *
 * V_loss = 2 · C_total · A_frac · √t + S_p · A_frac
 *
 * @param C_total   Total leakoff coefficient (ft/√min)
 * @param A_frac    Fracture surface area (ft²), one face
 * @param t_min     Pumping time (min)
 * @param Sp        Spurt loss coefficient (ft³/ft²)
 * @returns         Volume lost (gal)
 */
export function carterCumulativeLoss(C_total: number, A_frac: number, t_min: number, Sp = 0): number {
  const V_ft3 = 2 * C_total * A_frac * Math.sqrt(t_min) + Sp * A_frac;
  return V_ft3 * 7.48052;
}

// ─── Proppant Settling ────────────────────────────────────────────────────────

/**
 * Proppant settling velocity — modified Stokes law (accounting for non-sphericity).
 *
 * Stokes: v_s = [d_p² · (ρ_p − ρ_f) · g] / [18 · μ]
 * Modified for field units:
 * v_s (ft/min) = 0.1925 · d_p(in)² · (ρ_p − ρ_f)(lb/ft³) / μ(cp)
 *
 * Valid for Re_p < 1 (Stokes regime).
 *
 * @param dp_in         Proppant diameter (in), e.g., 0.022 for 20/40 mesh
 * @param rho_prop      Proppant density (lb/ft³), e.g., 165 for sand
 * @param rho_fluid     Fluid density (lb/ft³)
 * @param mu_cp         Fluid viscosity (cp)
 * @returns             Settling velocity (ft/min), positive = downward
 */
export function proppantSettlingVelocity(
  dp_in: number,
  rho_prop: number,
  rho_fluid: number,
  mu_cp: number
): number {
  if (mu_cp <= 0) throw new Error("Viscosity must be positive");
  // Stokes law in field units: v (ft/min) = 7.744e4 * d(ft)² * (Δρ lb/ft³) / μ(cp) / 3600... simplified:
  // v_s (ft/s) = d_p²(ft²) * g(ft/s²) * Δρ(lb/ft³) / (18 * μ(lb/(ft·s)))
  const dp_ft = dp_in / 12;
  const mu_lbfts = mu_cp * 6.72e-4;  // cp → lb/(ft·s)
  const g = 32.174;
  const Drho = rho_prop - rho_fluid;
  if (Drho <= 0) return 0;
  const vs_fts = dp_ft * dp_ft * Drho * g / (18 * mu_lbfts);  // ft/s
  return vs_fts * 60;  // ft/min
}

/**
 * Corrected settling velocity using the Walton (1986) hindered settling factor.
 *
 * v_hindered = v_s · (1 - C_p)^4.65
 * where C_p = proppant volumetric concentration (0–0.65).
 *
 * @param vs_ftmin      Stokes settling velocity (ft/min)
 * @param C_prop        Proppant volume concentration (0–0.65)
 * @returns             Hindered settling velocity (ft/min)
 */
export function hinderedSettlingVelocity(vs_ftmin: number, C_prop: number): number {
  if (C_prop < 0 || C_prop > 0.65) throw new Error("Proppant concentration must be 0–0.65");
  return vs_ftmin * Math.pow(1 - C_prop, 4.65);
}

// ─── Dimensionless Conductivity ────────────────────────────────────────────────

/**
 * Dimensionless fracture conductivity CfD.
 *
 * CfD = (kf · w) / (k · xf)
 *
 * CfD > 30: highly conductive; < 1: choked fracture.
 *
 * @param kf_md     Fracture permeability (md)
 * @param w_in      Fracture width (in)
 * @param k_md      Formation permeability (md)
 * @param xf_ft     Fracture half-length (ft)
 * @returns         Dimensionless fracture conductivity CfD
 */
export function dimensionlessConductivity(kf_md: number, w_in: number, k_md: number, xf_ft: number): number {
  if (k_md <= 0 || xf_ft <= 0) throw new Error("Formation permeability and xf must be positive");
  const w_ft = w_in / 12;
  return (kf_md * w_ft) / (k_md * xf_ft);
}

// ─── Fractured Well Skin ──────────────────────────────────────────────────────

/**
 * Equivalent skin factor for a hydraulically fractured well.
 *
 * For an infinite-conductivity fracture (CfD → ∞):
 *   S_f = −ln(xf / rw)    [Prats 1961]
 *
 * For finite conductivity (Cinco-Ley & Samaniego, 1978):
 *   S_f ≈ −ln(xf/rw) + f(CfD)
 * Approximation: S_f ≈ −ln(x_f') where x_f' is effective wellbore radius
 *   x_f' = xf / 2  for CfD >> 1 (∞ conductivity)
 *   x_f' decreases as CfD decreases
 *
 * @param xf_ft     Fracture half-length (ft)
 * @param rw_ft     Wellbore radius (ft)
 * @param CfD       Dimensionless fracture conductivity
 * @returns         Equivalent skin factor (negative = stimulation)
 */
export function fracturedWellSkin(xf_ft: number, rw_ft: number, CfD: number): number {
  // Effective wellbore radius correlation (Cinco-Ley & Samaniego approximation)
  let f_CfD: number;
  if (CfD >= 30) {
    f_CfD = 0;  // infinite conductivity: S_f = -ln(xf/(2*rw))
    return -Math.log(xf_ft / (2 * rw_ft));
  } else if (CfD > 1) {
    // Intermediate conductivity (Economides et al. approximation)
    f_CfD = Math.log(1 + 1 / CfD) * 0.5;
    return -Math.log(xf_ft / (2 * rw_ft)) + f_CfD;
  } else {
    // Low conductivity (choked fracture)
    f_CfD = Math.PI / (2 * CfD);
    return -Math.log(xf_ft / (2 * rw_ft)) + f_CfD;
  }
}

/**
 * Production rate uplift ratio due to fracture stimulation.
 *
 * q_frac / q_unfrac = [ln(re/rw) + S_unfrac] / [ln(re/rw) + S_frac]
 *
 * @param re_ft       Drainage radius (ft)
 * @param rw_ft       Wellbore radius (ft)
 * @param S_frac      Fracture equivalent skin
 * @param S_damage    Pre-stimulation skin factor (positive = damage)
 * @returns           Folds of increase (q_frac / q_pre)
 */
export function fractureStimulationRatio(
  re_ft: number,
  rw_ft: number,
  S_frac: number,
  S_damage: number
): number {
  const ln_re_rw = Math.log(re_ft / rw_ft);
  return (ln_re_rw + S_damage) / (ln_re_rw + S_frac);
}

// ─── Proppant Properties Reference ────────────────────────────────────────────

/** Standard proppant density values (lb/ft³). */
export const PROPPANT_DENSITY = {
  "Ottawa 20/40 sand":       165,
  "Resin-coated sand":       170,
  "Intermediate-strength":  198,
  "High-strength ceramic":  212,
  "Bauxite":                210,
} as const;

/** Approximate fracture permeability at 4000 psi closure (md). */
export const PROPPANT_KF_MD = {
  "Ottawa 20/40 sand":       80000,
  "Resin-coated sand":       70000,
  "Intermediate-strength":  100000,
  "High-strength ceramic":  150000,
  "Bauxite":                200000,
} as const;

// ─── Poroelastic Closure Stress (Uniaxial Strain Model) ───────────────────────

/**
 * Minimum horizontal stress from the uniaxial strain / poroelastic model.
 *
 * σ_h = [ν/(1-ν)] × (σ_v − α·P_p) + α·P_p + Δσ_tectonic
 *
 * This is the standard reservoir geomechanics model (Eaton-style uniaxial strain)
 * that accounts for both the tectonic stress component and the poroelastic effect
 * of pore pressure. For a tectonic-stress-free basin, Δσ_tectonic = 0.
 *
 * Reference: Zoback (2007) "Reservoir Geomechanics", Chapter 3.
 *
 * @param sigma_v_psi       Vertical (overburden) stress (psi)
 * @param P_pore_psi        Pore pressure (psi)
 * @param nu                Poisson's ratio (unitless)
 * @param alpha             Biot coefficient (0–1, typically 0.6–1.0)
 * @param dSigma_tect_psi   Tectonic stress offset (psi); 0 for uniaxial-strain only
 * @returns                 Minimum horizontal stress σ_h (psi)
 */
export function fracPoroelasticClosure(
  sigma_v_psi: number,
  P_pore_psi: number,
  nu: number,
  alpha: number,
  dSigma_tect_psi: number
): number {
  if (nu <= 0 || nu >= 1) throw new Error("Poisson's ratio must be between 0 and 1 (exclusive)");
  if (alpha < 0 || alpha > 1) throw new Error("Biot coefficient must be between 0 and 1");
  const k = nu / (1 - nu);
  return k * (sigma_v_psi - alpha * P_pore_psi) + alpha * P_pore_psi + dSigma_tect_psi;
}

/**
 * Net treating pressure at fracture initiation.
 *
 * P_net = P_treating − σ_closure − P_friction
 *
 * P_net represents the pressure above closure that drives fracture opening.
 * Positive P_net → fracture is open; P_net ≤ 0 → no fracture growth.
 *
 * @param P_treating_psi    Bottomhole treating pressure (psi)
 * @param sigma_closure_psi Fracture closure / minimum horizontal stress (psi)
 * @param P_friction_psi    Near-wellbore and perforation friction pressure (psi); default 0
 * @returns                 Net pressure (psi)
 */
export function fracNetPressure(
  P_treating_psi: number,
  sigma_closure_psi: number,
  P_friction_psi = 0
): number {
  return P_treating_psi - sigma_closure_psi - P_friction_psi;
}

/**
 * Fluid efficiency at end of pumping.
 *
 * η = V_frac / V_injected = 1 − (2 × V_leakoff) / V_injected
 *
 * Derived from mass balance: V_injected = V_fracture + V_leakoff,
 * and the Carter leakoff model assumes V_leakoff ≈ 2·CL·A·√t (integrated).
 *
 * @param V_frac_bbl      Fracture volume at end-of-pump (bbl) — from geometry
 * @param V_inj_bbl       Total injected fluid volume (bbl)
 * @returns               Fluid efficiency (0–1)
 */
export function fracFluidEfficiency(V_frac_bbl: number, V_inj_bbl: number): number {
  if (V_inj_bbl <= 0) throw new Error("Injected volume must be positive");
  return Math.min(1, Math.max(0, V_frac_bbl / V_inj_bbl));
}

/**
 * Instantaneous Shut-In Pressure (ISIP) from surface pressure.
 *
 * ISIP_BH = P_surface + ρ·g·TVD − P_pipe_friction
 *
 * P_pipe_friction ≈ 0 at shut-in (no flow).
 * Fluid gradient: γ_fluid (psi/ft) = fluid_density_ppg × 0.052
 *
 * @param P_surface_psi       Surface ISIP (psi) — read immediately at shut-in
 * @param TVD_ft              True vertical depth to mid-perforation (ft)
 * @param fluid_density_ppg   Fluid density in pounds per gallon
 * @returns                   Bottomhole ISIP (psi)
 */
export function fracISIP(
  P_surface_psi: number,
  TVD_ft: number,
  fluid_density_ppg: number
): number {
  const hydrostatic = fluid_density_ppg * 0.052 * TVD_ft;
  return P_surface_psi + hydrostatic;
}

// ─── Nolte-G Function Analysis ────────────────────────────────────────────────

/**
 * Nolte G-function value at dimensionless shut-in time Δt_D.
 *
 * G(Δt_D) = (4/3) × [(1 + Δt_D)^(3/2) − Δt_D^(3/2) − 1]
 *
 * Where Δt_D = Δt / t_p  (shut-in time / pump time).
 *
 * Reference: Nolte (1979); Valkó & Economides (1995) Chapter 11.
 *
 * @param deltaT_D    Dimensionless shut-in time Δt/t_p (≥ 0)
 * @returns           G-function value (dimensionless)
 */
export function fracNolteG(deltaT_D: number): number {
  if (deltaT_D < 0) throw new Error("Dimensionless shut-in time must be ≥ 0");
  return (4 / 3) * (Math.pow(1 + deltaT_D, 1.5) - Math.pow(deltaT_D, 1.5) - 1);
}

/**
 * Closure pressure from Nolte G-function analysis.
 *
 * At closure, the G*dP/dG vs G plot deviates from linearity.
 * The y-intercept of the linear portion extrapolated to G=0 gives P_closure.
 *
 * P_closure = P_isip − (dP/dG)_linear × G_closure
 *
 * This function computes P_closure given the ISIP, the linear slope
 * dP/dG (psi/unit G), and the G value at which closure is identified.
 *
 * @param P_isip_psi    Instantaneous shut-in pressure (psi)
 * @param dPdG_psi      Slope of P vs G during linear (fracture-open) period (psi/unit G)
 * @param G_closure     G-function value at closure (typically 0.5–5)
 * @returns             Fracture closure pressure (psi)
 */
export function fracGDerivedClosure(
  P_isip_psi: number,
  dPdG_psi: number,
  G_closure: number
): number {
  return P_isip_psi - dPdG_psi * G_closure;
}

/**
 * Leakoff coefficient from Nolte G-function slope.
 *
 * CL = (dP/dG) × (E' × V_inj) / (π² × rp × hp² × G_p)
 *
 * Simplified field approximation for radial leakoff (Carter model):
 *   CL ≈ (dP/dG × Vp) / (E' × rp × hp)
 *
 * Standard form (after Nolte 1986):
 *   CL = (qi / (2 · rp · Af)) × (dG/dCL)^-1
 *
 * Practical direct form from linear G-function plot:
 *   CL = (dP/dG × qi × t_p) / (E' × Af)
 *
 * @param dPdG_psi      Slope of P vs G (psi/unit G)
 * @param E_prime_psi   Plane-strain modulus E' = E/(1-ν²) (psi)
 * @param qi_bpm        Injection rate (bbl/min)
 * @param tp_min        Pump time (min)
 * @param Af_ft2        Fracture area (one wing, ft²)
 * @returns             Carter leakoff coefficient CL (ft/√min)
 */
export function fracNolteLeakoff(
  dPdG_psi: number,
  E_prime_psi: number,
  qi_bpm: number,
  tp_min: number,
  Af_ft2: number
): number {
  if (E_prime_psi <= 0 || Af_ft2 <= 0) throw new Error("E' and Af must be positive");
  // Convert bbl/min → ft³/min
  const qi_ft3min = qi_bpm * 5.61458;
  return (dPdG_psi * qi_ft3min * tp_min) / (E_prime_psi * Af_ft2);
}

/**
 * Surface treating pressure during fracture pumping.
 *
 * P_surface = P_BH − Hydrostatic + Pipe_friction + Perf_friction + Near-WB friction
 *
 * P_surface = BHTP − γ_fluid·TVD + ΔP_pipe + ΔP_perf
 *
 * @param P_BH_psi        Bottomhole treating pressure (psi)
 * @param TVD_ft          True vertical depth to perforations (ft)
 * @param fluid_ppg       Fluid density during pumping (ppg)
 * @param dP_pipe_psi     Pipe friction pressure loss (psi)
 * @param dP_perf_psi     Perforation friction pressure loss (psi)
 * @returns               Wellhead / surface treating pressure (psi)
 */
export function fracSurfaceTreatingPressure(
  P_BH_psi: number,
  TVD_ft: number,
  fluid_ppg: number,
  dP_pipe_psi: number,
  dP_perf_psi: number
): number {
  const hydrostatic = fluid_ppg * 0.052 * TVD_ft;
  return P_BH_psi - hydrostatic + dP_pipe_psi + dP_perf_psi;
}

/**
 * Fracture breakdown pressure from tensile failure.
 *
 * P_breakdown = σ_h + T₀ − P_pore
 *
 * Where σ_h = minimum horizontal stress, T₀ = tensile strength.
 * Assumes vertical wellbore in a standard stress regime.
 *
 * Reference: Hubbert & Willis (1957), modified for poroelastic effect.
 *
 * @param sigma_h_psi     Minimum horizontal stress (psi)
 * @param T0_psi          Rock tensile strength (psi); typical 500–2000 psi
 * @param P_pore_psi      Pore pressure (psi)
 * @returns               Fracture breakdown pressure (psi)
 */
export function fracBreakdownPressure(
  sigma_h_psi: number,
  T0_psi: number,
  P_pore_psi: number
): number {
  return sigma_h_psi + T0_psi - P_pore_psi;
}

// ─── Tip Screen-Out (TSO) Design ──────────────────────────────────────────────

/**
 * Tip screen-out (TSO) fracture design — estimate volumes at screenout.
 *
 * A TSO treatment is designed to screen out at the fracture tip, creating a
 * packed, wide fracture rather than a long, narrow one.  The key design outputs
 * are the pad volume (before proppant addition), the proppant slurry volume,
 * and the expected fracture dimensions at screenout.
 *
 * Procedure (after Nolte, 1986 and Smith et al., 1987):
 *   1. Compute fluid-loss dominated fracture area at screenout: A_so = V_inj / (2·CL·√t_p)
 *   2. For PKN geometry: half-length at screenout L_so = A_so / (2·h_f)
 *   3. Average width at screenout (PKN): w_avg = 0.3048 * (2.05 × 10⁻⁵ · q · μ / E')^0.25 · L_so^0.25 · h_f^0.5
 *   4. Proppant concentration at screenout: max packing in the fracture
 *
 * @param qi_bpm      Injection rate (bbl/min)
 * @param h_ft        Fracture height (ft)
 * @param E_prime_psi Plane-strain modulus E' = E/(1−ν²) (psi)
 * @param mu_cp       Fracturing fluid viscosity (cp)
 * @param CL_ftSqrtMin  Carter leakoff coefficient (ft/√min)
 * @param Vpad_bbl    Pad volume (bbl) — pumped before proppant
 * @param conc_ppg    Proppant concentration in slurry (lbm/gal)
 * @returns           { L_so_ft, w_avg_in, A_so_ft2, t_so_min, packingFraction }
 */
export function fracTSODesign(
  qi_bpm: number,
  h_ft: number,
  E_prime_psi: number,
  mu_cp: number,
  CL_ftSqrtMin: number,
  Vpad_bbl: number,
  conc_ppg: number
): {
  L_so_ft: number;
  w_avg_in: number;
  A_so_ft2: number;
  t_so_min: number;
  packingFraction: number;
} {
  if (qi_bpm <= 0 || h_ft <= 0 || E_prime_psi <= 0) {
    throw new Error("qi, h, and E' must be positive");
  }

  // Time to pump pad (min)
  const Vpad_ft3 = Vpad_bbl * 5.61458;
  const qi_ft3min = qi_bpm * 5.61458;
  const t_pad_min = Vpad_ft3 / qi_ft3min;

  // Fluid-loss efficiency: fracture area at end of pad stage
  // Carter leakoff: V_loss = 2·CL·A·√t  (one side)
  // A_so estimated from mass balance: V_inj = V_frac + V_loss
  // For efficiency η: A = (qi_ft3min · t) / (w_avg_ft · h_ft + 2·CL·A·√t)
  // Simplified: treat pad as creating the fracture, screened-out by proppant

  // PKN fracture half-length from pad volume (Carter 1957):
  //   Vf = Kf · h · L · w  (narrow fracture model)
  //   L_pad ≈ (V_pad / (π·h·w_0))^0.5 — use simplified PKN width
  // Simpler: L_so ≈ (V_pad_ft3) / (2 · CL_ftSqrtMin · √t_pad · h_ft * 2 + h_ft * w0_ft)
  // Use the Nordgren (1972) zero-leakoff reference length and scale by CL:
  // L_so = (q_i · t_p)^0.5 / (2 · CL · h_f)  [approximate, from Nolte 1979]

  const t_so_min = t_pad_min;
  const L_so_ft = CL_ftSqrtMin > 0
    ? (qi_ft3min * t_so_min) / (2 * CL_ftSqrtMin * Math.sqrt(t_so_min) * h_ft)
    : Math.sqrt(qi_ft3min * t_so_min / h_ft) * 5;  // zero-leakoff fallback

  const A_so_ft2 = 2 * h_ft * L_so_ft;  // two wings

  // PKN average width (Perkins and Kern, 1961; Nordgren, 1972):
  //   w_avg (ft) = 2.05e-5 · (qi · mu / E')^0.25 · L_so^0.25 · h^0.5
  //   (field units: qi [ft³/min], mu [cp], E' [psi], L [ft], h [ft])
  const w_avg_ft = 2.05e-5 * Math.pow(qi_ft3min * mu_cp / E_prime_psi, 0.25) *
    Math.pow(L_so_ft, 0.25) * Math.pow(h_ft, 0.5);
  const w_avg_in = w_avg_ft * 12;

  // Packing fraction: proppant concentration relative to maximum pack
  // Max pack density ≈ 12 lbm/gal (for sand: ~100 lbm/ft³ ≈ 12.3 ppg in slurry)
  const maxConc_ppg = 12.0;
  const packingFraction = Math.min(1.0, conc_ppg / maxConc_ppg);

  return { L_so_ft, w_avg_in, A_so_ft2, t_so_min, packingFraction };
}

/**
 * Proppant concentration profile in the fracture during pumping.
 *
 * Computes the proppant concentration (lbm/ft²) in the fracture at time t,
 * accounting for slurry injection and fluid loss.
 *
 * The in-fracture proppant areal concentration (lbm/ft²):
 *   Ca = (V_proppant_lbm) / (A_fracture_ft2)
 *
 * where A_fracture = fracture area at time t from PKN or user-supplied.
 *
 * @param qi_bpm         Injection rate (bbl/min)
 * @param conc_ppg       Surface proppant concentration in slurry (lbm/gal)
 * @param t_pump_min     Pumping time (min) since first proppant
 * @param L_ft           Current fracture half-length (ft)
 * @param h_ft           Fracture height (ft)
 * @param rho_prop_pcf   Proppant bulk density (lbm/ft³; e.g. sand ≈ 105)
 * @returns              { Ca_lbmFt2, vol_prop_lbm, prop_fill_fraction }
 */
export function fracProppantConcentration(
  qi_bpm: number,
  conc_ppg: number,
  t_pump_min: number,
  L_ft: number,
  h_ft: number,
  rho_prop_pcf: number
): { Ca_lbmFt2: number; vol_prop_lbm: number; prop_fill_fraction: number } {
  const qi_galmin = qi_bpm * 42;           // bbl/min → gal/min
  const qi_ft3min = qi_bpm * 5.61458;

  // Proppant mass pumped (lbm)
  const vol_prop_lbm = conc_ppg * qi_galmin * t_pump_min;  // lbm

  // Fracture area (both wings, one face)
  const A_ft2 = 2 * L_ft * h_ft;  // ft²

  // Areal concentration (lbm/ft²)
  const Ca_lbmFt2 = A_ft2 > 0 ? vol_prop_lbm / A_ft2 : 0;

  // Proppant fill fraction: fraction of fracture volume filled by proppant pack
  // Proppant volume (ft³) = lbm / rho_prop
  const vol_prop_ft3 = vol_prop_lbm / rho_prop_pcf;
  // Fracture volume ≈ A * average width (simplified to 0.01 ft if not given)
  const assumed_width_ft = 0.02;  // ~0.25 in average fracture width during pumping
  const frac_vol_ft3 = A_ft2 * assumed_width_ft;
  const prop_fill_fraction = Math.min(1.0, frac_vol_ft3 > 0 ? vol_prop_ft3 / frac_vol_ft3 : 0);

  void qi_ft3min;
  return { Ca_lbmFt2, vol_prop_lbm, prop_fill_fraction };
}

/**
 * Refrac candidate scoring — score a well's suitability for re-fracturing.
 *
 * Uses a weighted scorecard approach combining reservoir quality, wellbore
 * condition, and production performance metrics.
 *
 * Scoring criteria (each 0–10, weighted sum normalized to 0–100):
 *   1. PI decline ratio (PI_current / PI_initial): high decline → good candidate
 *   2. Shut-in pressure ratio (P_si / P_i): high SIWHP ratio → good connectivity
 *   3. Skin severity: high skin → stimulation opportunity
 *   4. Well age: older well → more likely to benefit from modern completion
 *
 * @param PI_initial      Original productivity index (STB/d/psi)
 * @param PI_current      Current productivity index (STB/d/psi)
 * @param P_si_psia       Current shut-in wellhead/BH pressure (psia)
 * @param P_i_psia        Initial reservoir pressure (psia)
 * @param skin            Current skin factor (dimensionless)
 * @param age_yrs         Well age (years)
 * @returns               { score_0_100, recommendation, pi_score, pressure_score, skin_score, age_score }
 */
export function fracRefracScore(
  PI_initial: number,
  PI_current: number,
  P_si_psia: number,
  P_i_psia: number,
  skin: number,
  age_yrs: number
): {
  score_0_100: number;
  recommendation: string;
  pi_score: number;
  pressure_score: number;
  skin_score: number;
  age_score: number;
} {
  // 1. PI decline score: (1 − PI_current/PI_initial) × 10
  const pi_ratio = PI_initial > 0 ? Math.min(1, PI_current / PI_initial) : 0;
  const pi_score = Math.max(0, Math.min(10, (1 - pi_ratio) * 10));

  // 2. Pressure retention score: P_si/P_i × 10
  const p_ratio = P_i_psia > 0 ? Math.min(1, P_si_psia / P_i_psia) : 0;
  const pressure_score = Math.max(0, Math.min(10, p_ratio * 10));

  // 3. Skin score: skin > 0 means damage; clip at 50
  const skin_score = Math.max(0, Math.min(10, Math.min(skin, 50) / 5));

  // 4. Age score: older wells score higher (15 yr max)
  const age_score = Math.max(0, Math.min(10, age_yrs / 1.5));

  // Weighted composite (PI 35%, pressure 25%, skin 25%, age 15%)
  const raw = 0.35 * pi_score + 0.25 * pressure_score + 0.25 * skin_score + 0.15 * age_score;
  const score_0_100 = Math.round(raw * 10);

  let recommendation: string;
  if (score_0_100 >= 70)      recommendation = "Strong candidate — refrac recommended";
  else if (score_0_100 >= 50) recommendation = "Moderate candidate — further evaluation needed";
  else if (score_0_100 >= 30) recommendation = "Weak candidate — may not justify refrac cost";
  else                        recommendation = "Poor candidate — refrac not recommended";

  return { score_0_100, recommendation, pi_score, pressure_score, skin_score, age_score };
}
