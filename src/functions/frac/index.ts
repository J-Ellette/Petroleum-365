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
