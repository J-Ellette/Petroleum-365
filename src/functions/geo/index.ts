/**
 * P365 — Geomechanics (GEO)
 *
 * Functions for formation evaluation and wellbore geomechanics:
 *   pore pressure prediction, fracture gradient, overburden stress,
 *   horizontal stress, effective stress, and Biot coefficient.
 *
 * References:
 *   Eaton (1975) — Fracture gradient prediction and its application
 *     in oilfield operations.  JPT, Oct 1975.
 *   Hubbert & Willis (1957) — Mechanics of hydraulic fracturing.
 *     Trans. AIME, 210, 153-166.
 *   Matthews & Kelly (1967) — How to predict formation pressure and
 *     fracture gradient.  Oil Gas J., Feb 1967.
 *   Terzaghi (1943) — Theoretical Soil Mechanics.  Wiley.
 *   Biot (1941) — General theory of three-dimensional consolidation.
 *     J. Appl. Phys., 12, 155-164.
 *
 * Unit conventions (field units unless noted):
 *   Depth  (ft TVD), pressure (psi or ppg), density (g/cm³ or ppg),
 *   stress / gradient (psi/ft or ppg equivalent).
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const PSI_PER_FT_PER_PPG = 0.052;   // 1 ppg × 0.052 = psi/ft
const SEAWATER_DENSITY_PPG = 8.55;   // seawater 1.025 g/cm³ ≈ 8.55 ppg

// ─── Unit Helpers ─────────────────────────────────────────────────────────────

/**
 * Convert equivalent mud weight (ppg) to gradient (psi/ft).
 *
 * @param ppg  Equivalent mud weight (ppg)
 * @returns    Gradient (psi/ft)
 */
export function geoEMWToGradient(ppg: number): number {
  return ppg * PSI_PER_FT_PER_PPG;
}

/**
 * Convert gradient (psi/ft) to equivalent mud weight (ppg).
 *
 * @param gradPsiPerFt  Gradient (psi/ft)
 * @returns             Equivalent mud weight (ppg)
 */
export function geoGradientToEMW(gradPsiPerFt: number): number {
  return gradPsiPerFt / PSI_PER_FT_PER_PPG;
}

// ─── Overburden Stress ────────────────────────────────────────────────────────

/**
 * Overburden (total vertical) stress at a given depth using a constant
 * average bulk density.
 *
 * σ_v = ρ_bulk × 0.052 × TVD   (field units)
 *
 * @param depth_ft       True vertical depth (ft)
 * @param bulkDensity_ppg  Average bulk density of overlying rock (ppg);
 *                         typical value 19.2 ppg (≈ 2.30 g/cm³)
 * @returns              Overburden stress (psi)
 */
export function geoOverburdenStress(depth_ft: number, bulkDensity_ppg: number): number {
  return depth_ft * bulkDensity_ppg * PSI_PER_FT_PER_PPG;
}

/**
 * Overburden gradient (psi/ft) from bulk density.
 *
 * @param bulkDensity_ppg  Average bulk density (ppg)
 * @returns                Overburden gradient (psi/ft)
 */
export function geoOverburdenGradient(bulkDensity_ppg: number): number {
  return bulkDensity_ppg * PSI_PER_FT_PER_PPG;
}

/**
 * Bulk density from interval transit time (Gardner et al. 1974 acoustic).
 *
 *   ρ_bulk = a × (1 / Δt)^b
 *
 * Default coefficients (a=0.31, b=0.25) are from Gardner et al. for shale/sand.
 *
 * @param dtUs_perFt  Interval transit time (µs/ft) from sonic log
 * @param a           Gardner coefficient a (default 0.31 for g/cm³)
 * @param b           Gardner exponent b (default 0.25)
 * @returns           Estimated bulk density (g/cm³)
 */
export function geoBulkDensityFromSonic(dtUs_perFt: number, a = 0.31, b = 0.25): number {
  return a * Math.pow(dtUs_perFt, -b);
}

// ─── Pore Pressure Prediction ─────────────────────────────────────────────────

/**
 * Normal compaction trend interval transit time (µs/ft) for Eaton's method.
 *
 * Δt_n = Δt_ml × exp(−c × TVD)
 *
 * Typical values: Δt_ml ≈ 200 µs/ft (mudline shale), c ≈ 0.000218 ft⁻¹.
 *
 * @param depth_ft     True vertical depth (ft)
 * @param dtMudline    Mudline interval transit time (µs/ft)
 * @param c            Compaction gradient constant (ft⁻¹)
 * @returns            Normal transit time at depth (µs/ft)
 */
export function geoNormalTransitTime(
  depth_ft: number,
  dtMudline: number,
  c: number,
): number {
  return dtMudline * Math.exp(-c * depth_ft);
}

/**
 * Pore pressure prediction using Eaton's sonic method (1975).
 *
 *   Pp = σ_v − (σ_v − Pp_n) × (Δt_n / Δt_obs)^Eaton_n
 *
 * where Pp_n = normal hydrostatic pore pressure.
 *
 * @param obStress_psi     Overburden stress (psi) — equal to σ_v at the depth of interest
 * @param dtObs_usPerFt    Observed sonic transit time (µs/ft)
 * @param dtNormal_usPerFt Normal compaction trend transit time (µs/ft) at the same depth
 * @param ppNormal_psi     Normal hydrostatic pore pressure (psi)
 * @param eatonExp         Eaton exponent (default 3.0 for sonic, 1.2 for resistivity)
 * @returns                Pore pressure (psi)
 */
export function geoPorePressureEaton(
  obStress_psi: number,
  dtObs_usPerFt: number,
  dtNormal_usPerFt: number,
  ppNormal_psi: number,
  eatonExp = 3.0,
): number {
  const ratio = dtNormal_usPerFt / dtObs_usPerFt;
  return obStress_psi - (obStress_psi - ppNormal_psi) * Math.pow(ratio, eatonExp);
}

/**
 * Normal (hydrostatic) pore pressure at depth.
 *
 * @param depth_ft          True vertical depth (ft)
 * @param waterDensity_ppg  Formation water density (ppg); default 8.55 ppg
 * @returns                 Normal pore pressure (psi)
 */
export function geoNormalPorePressure(
  depth_ft: number,
  waterDensity_ppg = 8.55,
): number {
  return depth_ft * waterDensity_ppg * PSI_PER_FT_PER_PPG;
}

// ─── Effective Stress ─────────────────────────────────────────────────────────

/**
 * Effective vertical stress (Terzaghi effective stress, 1943).
 *
 *   σ'_v = σ_v − α × Pp
 *
 * @param totalStress_psi  Total vertical (overburden) stress (psi)
 * @param porePressure_psi Pore pressure (psi)
 * @param biot             Biot coefficient α (0–1, default 1.0)
 * @returns                Effective vertical stress (psi)
 */
export function geoEffectiveVerticalStress(
  totalStress_psi: number,
  porePressure_psi: number,
  biot = 1.0,
): number {
  return totalStress_psi - biot * porePressure_psi;
}

/**
 * Biot coefficient from bulk moduli (poroelastic).
 *
 *   α = 1 − K_dry / K_grain
 *
 * @param kDry_GPa    Dry frame bulk modulus (GPa)
 * @param kGrain_GPa  Mineral grain bulk modulus (GPa); quartz ≈ 38 GPa
 * @returns           Biot coefficient (dimensionless, 0–1)
 */
export function geoBiotCoefficient(kDry_GPa: number, kGrain_GPa: number): number {
  return 1.0 - kDry_GPa / kGrain_GPa;
}

// ─── Minimum Horizontal Stress ────────────────────────────────────────────────

/**
 * Minimum horizontal stress using Eaton's stress equation (1975).
 *
 *   σ_h = (ν / (1 − ν)) × (σ'_v) + α × Pp
 *
 * where ν is Poisson's ratio and α is the Biot coefficient.
 *
 * @param effectiveVertStress_psi  Effective vertical stress (psi)
 * @param porePressure_psi         Pore pressure (psi)
 * @param poissonRatio             Poisson's ratio ν (0.15–0.35 typical)
 * @param biot                     Biot coefficient α (default 1.0)
 * @returns                        Minimum horizontal stress (psi)
 */
export function geoMinHorizontalStress(
  effectiveVertStress_psi: number,
  porePressure_psi: number,
  poissonRatio: number,
  biot = 1.0,
): number {
  const nuRatio = poissonRatio / (1.0 - poissonRatio);
  return nuRatio * effectiveVertStress_psi + biot * porePressure_psi;
}

// ─── Fracture Gradient ────────────────────────────────────────────────────────

/**
 * Fracture gradient using the Hubbert-Willis (1957) method.
 *
 *   G_f = (1/3) × (σ_v/TVD + 2 × Pp/TVD)   [psi/ft]
 *
 * @param depth_ft         True vertical depth (ft)
 * @param obStress_psi     Overburden stress (psi)
 * @param porePressure_psi Pore pressure (psi)
 * @returns                Fracture gradient (psi/ft)
 */
export function geoFractureGradientHubbertWillis(
  depth_ft: number,
  obStress_psi: number,
  porePressure_psi: number,
): number {
  return (1 / 3) * (obStress_psi / depth_ft + 2 * porePressure_psi / depth_ft);
}

/**
 * Fracture gradient using the Matthews-Kelly (1967) method.
 *
 *   G_f = Ki × σ'_v / TVD + Pp / TVD
 *
 * Ki (matrix stress coefficient) varies with depth and rock type; a common
 * Gulf Coast trend is Ki = 0.69 + 0.000017 × TVD (for TVD in feet).
 *
 * @param depth_ft             True vertical depth (ft)
 * @param effectiveVertStress_psi Effective vertical stress (psi)
 * @param porePressure_psi     Pore pressure (psi)
 * @param ki                   Matrix stress coefficient Ki (default uses Gulf Coast trend)
 * @returns                    Fracture gradient (psi/ft)
 */
export function geoFractureGradientMatthewsKelly(
  depth_ft: number,
  effectiveVertStress_psi: number,
  porePressure_psi: number,
  ki?: number,
): number {
  const Ki = ki ?? (0.69 + 0.000017 * depth_ft);
  return (Ki * effectiveVertStress_psi + porePressure_psi) / depth_ft;
}

/**
 * Fracture gradient using Eaton's (1975) method.
 *
 *   G_f = (ν / (1 − ν)) × σ'_v / TVD + Pp / TVD
 *
 * This is the most widely used method for fracture gradient prediction.
 *
 * @param depth_ft             True vertical depth (ft)
 * @param effectiveVertStress_psi Effective vertical stress (psi)
 * @param porePressure_psi     Pore pressure (psi)
 * @param poissonRatio         Poisson's ratio ν (0.15–0.35; default 0.25)
 * @returns                    Fracture gradient (psi/ft)
 */
export function geoFractureGradientEaton(
  depth_ft: number,
  effectiveVertStress_psi: number,
  porePressure_psi: number,
  poissonRatio = 0.25,
): number {
  const nuRatio = poissonRatio / (1.0 - poissonRatio);
  return (nuRatio * effectiveVertStress_psi + porePressure_psi) / depth_ft;
}

/**
 * Fracture closure pressure (FCP) — minimum stress test (XLOT/LOT leak-off test).
 * Uses Eaton's horizontal stress as the fracture closure pressure estimate.
 *
 * @param effectiveVertStress_psi  Effective vertical stress at depth (psi)
 * @param porePressure_psi         Pore pressure (psi)
 * @param poissonRatio             Poisson's ratio ν
 * @param biot                     Biot coefficient (default 1.0)
 * @returns                        Fracture closure pressure (psi)
 */
export function geoFractureClosurePressure(
  effectiveVertStress_psi: number,
  porePressure_psi: number,
  poissonRatio: number,
  biot = 1.0,
): number {
  return geoMinHorizontalStress(effectiveVertStress_psi, porePressure_psi, poissonRatio, biot);
}

// ─── Mud Window ───────────────────────────────────────────────────────────────

/**
 * Drilling mud weight window (ppg).
 *
 * Returns the minimum (pore pressure), kick margin, and maximum (fracture
 * gradient) mud weight equivalents, plus the available window width.
 *
 * @param depth_ft           True vertical depth (ft)
 * @param porePressure_psi   Pore pressure (psi)
 * @param fractureGrad_psiPerFt Fracture gradient (psi/ft)
 * @param kickMargin_ppg     Safety margin above pore pressure (ppg, default 0.5)
 * @param lossCushion_ppg    Safety margin below frac gradient (ppg, default 0.5)
 * @returns                  { minMW_ppg, lowerBound_ppg, upperBound_ppg,
 *                             maxMW_ppg, window_ppg }
 */
export function geoMudWindow(
  depth_ft: number,
  porePressure_psi: number,
  fractureGrad_psiPerFt: number,
  kickMargin_ppg = 0.5,
  lossCushion_ppg = 0.5,
): {
  minMW_ppg: number;
  lowerBound_ppg: number;
  upperBound_ppg: number;
  maxMW_ppg: number;
  window_ppg: number;
} {
  const minMW_ppg   = geoGradientToEMW(porePressure_psi / depth_ft);
  const maxMW_ppg   = geoGradientToEMW(fractureGrad_psiPerFt);
  const lowerBound  = minMW_ppg + kickMargin_ppg;
  const upperBound  = maxMW_ppg - lossCushion_ppg;
  return {
    minMW_ppg,
    lowerBound_ppg: lowerBound,
    upperBound_ppg: upperBound,
    maxMW_ppg,
    window_ppg: Math.max(0, upperBound - lowerBound),
  };
}

// ─── Uniaxial Compressive Strength ───────────────────────────────────────────

/**
 * Uniaxial Compressive Strength (UCS) from Young's Modulus (correlations).
 *
 * Chang et al. (2006) — Evaluating static and dynamic measurements of
 * unconfined compressive strength of sandstones.
 *   UCS = 0.0045 × E_dynamic    (MPa, with E in MPa)
 *
 * @param dynamicYoungsModulus_GPa  Dynamic Young's modulus from sonic log (GPa)
 * @returns                         UCS estimate (MPa)
 */
export function geoUCSFromYoungsModulus(dynamicYoungsModulus_GPa: number): number {
  const E_MPa = dynamicYoungsModulus_GPa * 1000;
  return 0.0045 * E_MPa;
}

/**
 * Mohr-Coulomb failure criterion: shear strength at a given normal stress.
 *
 *   τ = C₀ + σ'_n × tan(φ)
 *
 * @param normalEffectiveStress_psi  Effective normal stress (psi)
 * @param cohesion_psi               Rock cohesion C₀ (psi)
 * @param frictionAngle_deg          Internal friction angle φ (degrees)
 * @returns                          Shear strength τ (psi)
 */
export function geoMohrCoulombShearStrength(
  normalEffectiveStress_psi: number,
  cohesion_psi: number,
  frictionAngle_deg: number,
): number {
  const phi = frictionAngle_deg * (Math.PI / 180);
  return cohesion_psi + normalEffectiveStress_psi * Math.tan(phi);
}

/**
 * Wellbore stability: collapse pressure (mud weight below which borehole
 * caves in) using Mohr-Coulomb criterion in vertical well.
 *
 * Effective stress criterion (Fjaer et al. 2008, Zoback 2007):
 *   σ'θθ = q × σ'rr + UCS
 *   where σ'θθ = (2σ_h - Pw) - α×Pp,  σ'rr = Pw - α×Pp
 *   q = (1 + sin φ) / (1 - sin φ)
 *
 * Solving for Pw (minimum wellbore pressure to prevent collapse):
 *   Pw_collapse = [2σ_h - UCS - α×Pp×(2-q)] / (1 + q)
 *
 * @param minHorizStress_psi  Minimum horizontal stress (psi)
 * @param ucs_psi             Uniaxial compressive strength (psi)
 * @param porePressure_psi    Pore pressure (psi)
 * @param frictionAngle_deg   Internal friction angle (degrees)
 * @param biot                Biot coefficient (default 1.0)
 * @returns                   Wellbore collapse (minimum) pressure (psi)
 */
export function geoWellboreCollapseGradient(
  minHorizStress_psi: number,
  ucs_psi: number,
  porePressure_psi: number,
  frictionAngle_deg: number,
  biot = 1.0,
): number {
  const phi = frictionAngle_deg * (Math.PI / 180);
  const sinPhi = Math.sin(phi);
  const q = (1 + sinPhi) / (1 - sinPhi);        // Mohr-Coulomb q factor
  return (2 * minHorizStress_psi - ucs_psi - biot * porePressure_psi * (2 - q)) / (1 + q);
}

/**
 * Dynamic-to-static Poisson's ratio conversion (Eissa & Kazi 1988).
 * Provides a static Poisson's ratio from acoustic log measurements.
 *
 *   ν_static = 0.77 × ν_dynamic − 0.15
 *
 * @param nuDynamic  Dynamic Poisson's ratio from sonic log (dimensionless)
 * @returns          Static Poisson's ratio estimate (clamped to 0.05–0.45)
 */
export function geoStaticPoissonRatio(nuDynamic: number): number {
  const result = 0.77 * nuDynamic - 0.15;
  return Math.min(0.45, Math.max(0.05, result));
}

/**
 * Compressive wave (Vp) to shear wave (Vs) ratio for sandstones.
 * Castagna et al. (1985) mudrock line:
 *
 *   Vs = 0.8621 × Vp − 1.1724   (km/s)
 *
 * @param vp_kms  Compressive wave velocity (km/s)
 * @returns       Shear wave velocity (km/s)
 */
export function geoCastagnaVs(vp_kms: number): number {
  return 0.8621 * vp_kms - 1.1724;
}

/**
 * Dynamic Young's modulus and Poisson's ratio from sonic logs.
 *
 *   ν_dyn = (Vp² − 2 Vs²) / (2(Vp² − Vs²))
 *   E_dyn = ρ × Vs² × (3 Vp² − 4 Vs²) / (Vp² − Vs²)
 *
 * @param vp_ms         Compressive wave velocity (m/s)
 * @param vs_ms         Shear wave velocity (m/s)
 * @param density_kgm3  Bulk density (kg/m³)
 * @returns             { nu_dynamic, E_dynamic_GPa }
 */
export function geoDynamicElasticModuli(
  vp_ms: number,
  vs_ms: number,
  density_kgm3: number,
): { nu_dynamic: number; E_dynamic_GPa: number } {
  const vp2 = vp_ms * vp_ms;
  const vs2 = vs_ms * vs_ms;
  const nu  = (vp2 - 2 * vs2) / (2 * (vp2 - vs2));
  const E   = density_kgm3 * vs2 * (3 * vp2 - 4 * vs2) / (vp2 - vs2) / 1e9; // Pa → GPa
  return { nu_dynamic: nu, E_dynamic_GPa: E };
}

// ─── Offshore Mud Weight Correction ──────────────────────────────────────────

/**
 * Equivalent mud weight correction for offshore (water depth).
 *
 * The overburden gradient at total depth includes both the seawater column
 * and the sediment column.  This function returns the effective overburden
 * gradient corrected for water depth.
 *
 * @param waterDepth_ft      Water depth (ft)
 * @param sedimentDepth_ft   Sediment/formation depth below mudline (ft)
 * @param sedimentDensity_ppg Average sediment bulk density (ppg)
 * @param waterDensity_ppg   Seawater density (ppg, default 8.55)
 * @returns                  { obGrad_psiPerFt, obStress_psi,
 *                             totalDepth_ft } at the reservoir level
 */
export function geoOffshoreOverburden(
  waterDepth_ft: number,
  sedimentDepth_ft: number,
  sedimentDensity_ppg: number,
  waterDensity_ppg = SEAWATER_DENSITY_PPG,
): { obGrad_psiPerFt: number; obStress_psi: number; totalDepth_ft: number } {
  const totalDepth = waterDepth_ft + sedimentDepth_ft;
  const waterStress = waterDepth_ft * waterDensity_ppg * PSI_PER_FT_PER_PPG;
  const sedStress   = sedimentDepth_ft * sedimentDensity_ppg * PSI_PER_FT_PER_PPG;
  const totalStress = waterStress + sedStress;
  return {
    obGrad_psiPerFt: totalStress / totalDepth,
    obStress_psi:    totalStress,
    totalDepth_ft:   totalDepth,
  };
}

// ─── Elastic Moduli Conversion ────────────────────────────────────────────────

/**
 * Convert Young's modulus and Poisson's ratio to bulk, shear, and Lamé
 * parameters (all in same units as E input, typically GPa).
 *
 * Relations:
 *   K = E / (3·(1 − 2ν))          Bulk modulus
 *   G = E / (2·(1 + ν))           Shear modulus
 *   λ = E·ν / ((1+ν)·(1−2ν))      First Lamé parameter
 *   M = K + 4G/3 = λ + 2G         P-wave modulus
 *
 * @param E_GPa  Young's modulus (GPa)
 * @param nu     Poisson's ratio (dimensionless, 0 < ν < 0.5)
 * @returns      { K_GPa, G_GPa, lambda_GPa, M_GPa }
 */
export function geoElasticModuliConvert(
  E_GPa: number,
  nu: number,
): { K_GPa: number; G_GPa: number; lambda_GPa: number; M_GPa: number } {
  const K      = E_GPa / (3 * (1 - 2 * nu));
  const G      = E_GPa / (2 * (1 + nu));
  const lambda = E_GPa * nu / ((1 + nu) * (1 - 2 * nu));
  const M      = lambda + 2 * G;
  return { K_GPa: K, G_GPa: G, lambda_GPa: lambda, M_GPa: M };
}

/**
 * Convert bulk modulus K and shear modulus G to Young's modulus and
 * Poisson's ratio.
 *
 *   E = 9KG / (3K + G)
 *   ν = (3K − 2G) / (2·(3K + G))
 *
 * @param K_GPa  Bulk modulus (GPa)
 * @param G_GPa  Shear modulus (GPa)
 * @returns      { E_GPa, nu }
 */
export function geoElasticModuliFromKG(
  K_GPa: number,
  G_GPa: number,
): { E_GPa: number; nu: number } {
  const denom = 3 * K_GPa + G_GPa;
  const E     = 9 * K_GPa * G_GPa / denom;
  const nu    = (3 * K_GPa - 2 * G_GPa) / (2 * denom);
  return { E_GPa: E, nu };
}

/**
 * Static Young's modulus from dynamic Young's modulus (Eissa & Kazi 1988).
 *
 *   E_static = 0.74 × E_dynamic − 0.82   (GPa)
 *
 * @param E_dynamic_GPa  Dynamic Young's modulus (GPa)
 * @returns              Static Young's modulus (GPa)
 */
export function geoStaticYoungsModulus(E_dynamic_GPa: number): number {
  return Math.max(0.1, 0.74 * E_dynamic_GPa - 0.82);
}

// ─── 3D Wellbore Stress State (Kirsch Equations) ─────────────────────────────

/**
 * Kirsch (1898) solution for in-situ stresses around a cylindrical borehole
 * in a linear-elastic medium.
 *
 * Gives the effective stresses at the borehole wall (r = Rw) as a function
 * of far-field principal stresses and wellbore pressure.
 *
 *   σ_r     = Pw − Pp               (radial = mud pressure − pore pressure)
 *   σ_θ     = SHmax + Shmin − 2(SHmax−Shmin)cos(2θ) − Pw − 2Pp·α·(1−2ν)/(1−ν)
 *   σ_z     = Sv − 2ν(SHmax−Shmin)cos(2θ) − α(1−2ν)Pp/(1−ν)
 *   τ_θz    = 0 (at borehole wall for vertical well)
 *
 * All stresses in psi.  θ = 0° is the SHmax azimuth direction.
 *
 * @param SHmax_psi   Maximum horizontal stress (psi)
 * @param Shmin_psi   Minimum horizontal stress (psi)
 * @param Sv_psi      Vertical (overburden) stress (psi)
 * @param Pp_psi      Pore pressure (psi)
 * @param Pw_psi      Wellbore mud pressure (psi)
 * @param nu          Poisson's ratio
 * @param alpha_biot  Biot coefficient (0–1)
 * @param theta_deg   Azimuthal angle from SHmax (°)
 * @returns           { sigma_r, sigma_theta, sigma_z, tau_eff_psi, P_eff }
 *                    All effective stresses at the borehole wall (psi).
 */
export function geo3DWellboreStress(
  SHmax_psi: number,
  Shmin_psi: number,
  Sv_psi: number,
  Pp_psi: number,
  Pw_psi: number,
  nu: number,
  alpha_biot: number,
  theta_deg: number,
): {
  sigma_r_psi:     number;
  sigma_theta_psi: number;
  sigma_z_psi:     number;
  tau_eff_psi:     number;
  P_eff_mud_psi:   number;
} {
  const theta = theta_deg * (Math.PI / 180);
  const cos2t = Math.cos(2 * theta);
  const biotStressTerm = (1 - 2 * nu) / (1 - nu);  // Biot effective stress correction (1−2ν)/(1−ν)

  // Kirsch equations at borehole wall (r = Rw)
  const sigma_r     = Pw_psi - alpha_biot * Pp_psi;                              // effective radial
  const sigma_theta = (SHmax_psi + Shmin_psi)
                    - 2 * (SHmax_psi - Shmin_psi) * cos2t
                    - Pw_psi
                    - 2 * alpha_biot * Pp_psi * biotStressTerm;                    // effective hoop
  const sigma_z     = Sv_psi
                    - 2 * nu * (SHmax_psi - Shmin_psi) * cos2t
                    - alpha_biot * Pp_psi * biotStressTerm;                        // effective axial

  // Maximum shear stress (Tresca)
  const tau_eff     = 0.5 * Math.abs(sigma_theta - sigma_r);
  const P_eff_mud   = Pw_psi - Pp_psi;

  return {
    sigma_r_psi:     sigma_r,
    sigma_theta_psi: sigma_theta,
    sigma_z_psi:     sigma_z,
    tau_eff_psi:     tau_eff,
    P_eff_mud_psi:   P_eff_mud,
  };
}

/**
 * Critical wellbore collapse pressure using Mohr-Coulomb criterion and
 * the Kirsch minimum hoop stress (at θ = 0°, in the SHmax azimuth).
 *
 * The collapse pressure is the minimum mud weight required to prevent
 * shear failure at the borehole wall.
 *
 *   Pw_collapse = [q·(SHmax + Shmin) − UCS − (q−1)·α·Pp] / (1 + q)
 *   where q = (1 + sinφ) / (1 − sinφ)
 *
 * @param SHmax_psi       Maximum horizontal stress (psi)
 * @param Shmin_psi       Minimum horizontal stress (psi)
 * @param Pp_psi          Pore pressure (psi)
 * @param UCS_psi         Unconfined compressive strength (psi)
 * @param frictionAngle_deg Internal friction angle (°)
 * @param alpha_biot      Biot coefficient
 * @returns               Minimum collapse pressure (psi)
 */
export function geo3DCollapsePressure(
  SHmax_psi: number,
  Shmin_psi: number,
  Pp_psi: number,
  UCS_psi: number,
  frictionAngle_deg: number,
  alpha_biot = 1.0,
): number {
  const phi  = frictionAngle_deg * (Math.PI / 180);
  const sinP = Math.sin(phi);
  const q    = (1 + sinP) / (1 - sinP);
  const num  = q * (SHmax_psi + Shmin_psi) - UCS_psi - (q - 1) * alpha_biot * Pp_psi;
  return Math.max(0, num / (1 + q));
}

// ════════════════════════════════════════════════════════════════════════════
// Session 17 — Mohr-Coulomb failure envelope and ECD
// ════════════════════════════════════════════════════════════════════════════

/**
 * Mohr-Coulomb shear failure envelope.
 *
 * Computes the shear strength (τ_f) at a given effective normal stress (σ_n)
 * and the failure angle (θ_f from maximum principal stress) for a rock with
 * cohesion C0 and internal friction angle φ.
 *
 *   τ_f = C0 + σ_n × tan(φ)
 *   θ_f = 45° + φ/2   (angle of failure plane from σ₁)
 *
 * Also computes the differential stress at failure (σ₁ - σ₃) for a given
 * confining stress σ₃:
 *
 *   (σ₁ - σ₃)_f = 2C0 cos(φ)/(1-sin(φ)) + 2σ₃ sin(φ)/(1-sin(φ))
 *               = UCS + σ₃ × (q - 1)
 *   where q = (1+sinφ)/(1-sinφ)
 *
 * @param sigma_n_eff_psi   Effective normal stress on failure plane (psi)
 * @param C0_psi            Cohesion (psi)
 * @param frictionAngle_deg Internal friction angle (°)
 * @param sigma3_eff_psi    Minimum effective principal stress (confining, psi) — optional, used for diff stress
 * @returns                 { tau_f_psi, theta_f_deg, diff_stress_failure_psi, UCS_psi }
 */
export function geoMohrCoulombFailureEnvelope(
  sigma_n_eff_psi: number,
  C0_psi: number,
  frictionAngle_deg: number,
  sigma3_eff_psi = 0,
): {
  tau_f_psi: number;
  theta_f_deg: number;
  diff_stress_failure_psi: number;
  UCS_psi: number;
} {
  const phi  = frictionAngle_deg * (Math.PI / 180);
  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);
  const tanP = Math.tan(phi);

  const tau_f   = C0_psi + sigma_n_eff_psi * tanP;
  const theta_f = 45 + frictionAngle_deg / 2;     // degrees

  // q-factor (slope of σ₁ vs σ₃ at failure)
  const q   = (1 + sinP) / (1 - sinP);
  const UCS = 2 * C0_psi * cosP / (1 - sinP);
  const diff_stress_f = UCS + sigma3_eff_psi * (q - 1);

  return {
    tau_f_psi: tau_f,
    theta_f_deg: theta_f,
    diff_stress_failure_psi: diff_stress_f,
    UCS_psi: UCS,
  };
}

/**
 * Equivalent Circulating Density (ECD) calculation.
 *
 * The ECD accounts for the additional annular pressure loss during circulation
 * on top of the hydrostatic mud column:
 *
 *   ECD (ppg) = MW (ppg) + ΔP_annulus (psi) / (0.052 × TVD_ft)
 *
 * Annular pressure loss uses the simplified Bingham plastic model:
 *
 *   ΔP_annulus = [48 μ_p Q / (300 (D_h-D_p)² (D_h+D_p))]
 *              + [τ_y × L / (200 (D_h - D_p))]   (psi/100ft × L/100)
 *
 * where μ_p = plastic viscosity (cp), τ_y = yield point (lb/100ft²),
 * Q = flow rate (gal/min), D_h = hole diameter (in), D_p = drill pipe OD (in).
 *
 * @param MW_ppg        Mud weight (lb/gal)
 * @param TVD_ft        True vertical depth (ft)
 * @param Q_gpm         Circulation flow rate (gal/min)
 * @param D_hole_in     Hole (borehole) diameter (inches)
 * @param D_pipe_in     Drill pipe outside diameter (inches)
 * @param L_annulus_ft  Annular length (ft) — typically same as TVD
 * @param mu_p_cp       Plastic viscosity (cp)
 * @param tau_y_lb      Yield point (lb/100ft²)
 * @returns             { ECD_ppg, dP_annulus_psi, ECD_gradient_psi_ft }
 */
export function geoECD(
  MW_ppg: number,
  TVD_ft: number,
  Q_gpm: number,
  D_hole_in: number,
  D_pipe_in: number,
  L_annulus_ft: number,
  mu_p_cp: number,
  tau_y_lb: number,
): {
  ECD_ppg: number;
  dP_annulus_psi: number;
  ECD_gradient_psi_ft: number;
} {
  const D_annulus = D_hole_in - D_pipe_in;  // annular clearance (in)

  if (D_annulus <= 0) throw new Error("Hole diameter must be greater than pipe diameter");

  // Bingham plastic annular pressure loss (psi per 100 ft):
  // ΔP/100ft = (48 μ_p Q) / (300 (D_h-D_p)² (D_h+D_p)) + τ_y / (200 (D_h-D_p))
  const dP_per100ft = (48 * mu_p_cp * Q_gpm)
    / (300 * D_annulus * D_annulus * (D_hole_in + D_pipe_in))
    + tau_y_lb / (200 * D_annulus);

  // Total annular pressure loss
  const dP_annulus = dP_per100ft * L_annulus_ft / 100;

  // ECD: MW + annular losses referenced to TVD
  const ECD = MW_ppg + dP_annulus / (0.052 * TVD_ft);

  const ECD_grad = ECD * 0.052;  // psi/ft

  return {
    ECD_ppg: ECD,
    dP_annulus_psi: dP_annulus,
    ECD_gradient_psi_ft: ECD_grad,
  };
}

/**
 * Safe drilling mud weight window including ECD check.
 *
 * Returns the minimum MW (pore pressure gradient + safety margin),
 * maximum MW (fracture gradient − safety margin), the ECD, and a
 * stability flag indicating whether the ECD is within the window.
 *
 * @param PP_psi          Pore pressure (psi)
 * @param FG_psi          Fracture gradient pressure (psi)
 * @param TVD_ft          True vertical depth (ft)
 * @param margin_ppg      Safety margin on each side (ppg)
 * @param Q_gpm           Circulation flow rate (gal/min) — for ECD
 * @param D_hole_in       Hole diameter (in)
 * @param D_pipe_in       Drill pipe OD (in)
 * @param L_annulus_ft    Annular length (ft)
 * @param mu_p_cp         Plastic viscosity (cp)
 * @param tau_y_lb        Yield point (lb/100ft²)
 * @returns               { MW_min_ppg, MW_max_ppg, MW_recommended_ppg, ECD_ppg, window_safe }
 */
export function geoMudWeightWindowECD(
  PP_psi: number,
  FG_psi: number,
  TVD_ft: number,
  margin_ppg: number,
  Q_gpm: number,
  D_hole_in: number,
  D_pipe_in: number,
  L_annulus_ft: number,
  mu_p_cp: number,
  tau_y_lb: number,
): {
  MW_min_ppg: number;
  MW_max_ppg: number;
  MW_recommended_ppg: number;
  ECD_ppg: number;
  window_safe: boolean;
} {
  // Convert pore pressure and fracture gradient to ppg (EMW)
  const PP_ppg  = PP_psi  / (0.052 * TVD_ft);
  const FG_ppg  = FG_psi  / (0.052 * TVD_ft);

  const MW_min = PP_ppg + margin_ppg;
  const MW_max = FG_ppg - margin_ppg;
  const MW_rec = (MW_min + MW_max) / 2;

  // Compute ECD at recommended MW
  const { ECD_ppg } = geoECD(MW_rec, TVD_ft, Q_gpm, D_hole_in, D_pipe_in,
    L_annulus_ft, mu_p_cp, tau_y_lb);

  const safe = ECD_ppg >= MW_min && ECD_ppg <= MW_max;

  return {
    MW_min_ppg:         MW_min,
    MW_max_ppg:         MW_max,
    MW_recommended_ppg: MW_rec,
    ECD_ppg,
    window_safe:        safe,
  };
}

// ─── Deviated Wellbore Stress Analysis ───────────────────────────────────────

/**
 * Deviated wellbore Kirsch equations — stress concentration around a borehole.
 *
 * Extends the vertical wellbore Kirsch solution to an arbitrarily deviated
 * borehole using the transformation of Fjaer et al. (2008):
 *
 *   σ_xx' = σ_H cos²α sin²β + σ_h sin²α + σ_v cos²α cos²β  (in-plane h)
 *   σ_zz' = σ_H sin²α + σ_h cos²α  (axial; simplified for azimuth effect)
 *
 * Hoop stresses at the borehole wall (θ measured from σ_H' direction):
 *   σ_θθ = σ_xx' + σ_yy' − 2(σ_xx' − σ_yy') cos(2θ) − 4τ_xy' sin(2θ) − P_w
 *
 * The function returns: minimum and maximum hoop stresses around the borehole,
 * wellbore breakdown pressure (tensile fracture: σ_θθ_min + T0 = P_w),
 * and collapse pressure (shear failure: Mohr-Coulomb at max compression).
 *
 * @param σ_h_psi    Minimum horizontal stress (psi)
 * @param σ_H_psi    Maximum horizontal stress (psi)
 * @param σ_v_psi    Vertical (overburden) stress (psi)
 * @param Pp_psi     Pore pressure (psi)
 * @param Pw_psi     Wellbore pressure (mud pressure) (psi)
 * @param inc_deg    Wellbore inclination from vertical (°): 0 = vertical, 90 = horizontal
 * @param az_deg     Wellbore azimuth from σ_H direction (°)
 * @param C0_psi     Unconfined compressive strength (psi)
 * @param phi_fr_deg Internal friction angle (°)
 * @param T0_psi     Tensile strength (psi), default 0 (natural fractures assumed)
 * @returns          { σθθ_min_psi, σθθ_max_psi, breakdownP_psi, collapseP_psi,
 *                     effectiveSh_psi, effectiveSH_psi, effectiveSv_psi }
 */
export function geoDeviatedKirsch(
  σ_h_psi: number,
  σ_H_psi: number,
  σ_v_psi: number,
  Pp_psi: number,
  Pw_psi: number,
  inc_deg: number,
  az_deg: number,
  C0_psi: number,
  phi_fr_deg: number,
  T0_psi = 0,
): {
  σθθ_min_psi: number;
  σθθ_max_psi: number;
  breakdownP_psi: number;
  collapseP_psi: number;
  effectiveSh_psi: number;
  effectiveSH_psi: number;
  effectiveSv_psi: number;
} {
  const inc = inc_deg * Math.PI / 180;
  const az  = az_deg  * Math.PI / 180;

  // Effective stresses (Biot α = 1 assumed)
  const sSh = σ_h_psi - Pp_psi;
  const sSH = σ_H_psi - Pp_psi;
  const sSv = σ_v_psi - Pp_psi;

  // Transform to borehole frame (Fjaer et al. 2008 simplified)
  // σ_x'x' (across borehole, in horizontal plane)
  const Sx = sSH * Math.pow(Math.cos(az), 2) * Math.pow(Math.cos(inc), 2)
           + sSh * Math.pow(Math.sin(az), 2)
           + sSv * Math.pow(Math.cos(az), 2) * Math.pow(Math.sin(inc), 2);
  // σ_y'y' (across borehole, normal to azimuth)
  const Sy = sSH * Math.pow(Math.sin(az), 2) * Math.pow(Math.cos(inc), 2)
           + sSh * Math.pow(Math.cos(az), 2)
           + sSv * Math.pow(Math.sin(az), 2) * Math.pow(Math.sin(inc), 2);
  // Shear (x'y')
  const Txy = (sSH - sSh) * Math.sin(az) * Math.cos(az) * Math.pow(Math.cos(inc), 2);

  // Hoop stress at angle θ (Kirsch): σθθ(θ) = Sx+Sy − 2(Sx−Sy)cos2θ − 4τ sin2θ − ΔPw
  // ΔPw = Pw − Pp (excess mud pressure above pore pressure)
  const dPw = Pw_psi - Pp_psi;
  // Min/max hoop: dσ/dθ=0 → tan2θ* = −2τ/(Sx−Sy)
  const theta_star = 0.5 * Math.atan2(-2 * Txy, Sx - Sy);
  const eval_hoop = (θ: number): number =>
    Sx + Sy - 2 * (Sx - Sy) * Math.cos(2 * θ) - 4 * Txy * Math.sin(2 * θ) - dPw;

  const h1 = eval_hoop(theta_star);
  const h2 = eval_hoop(theta_star + Math.PI / 2);
  const σθθ_min = Math.min(h1, h2);
  const σθθ_max = Math.max(h1, h2);

  // Breakdown pressure (tensile fracture): σθθ_min = −T0 → P_w at failure
  // σθθ_min(Pw) = σθθ_min(Pw=Pp) − (Pw−Pp) = σθθ_min_ref − ΔPw
  // At breakdown: σθθ_min_ref − (Pb − Pp) = −T0
  const σθθ_min_at_ref = Sx + Sy - 2 * Math.abs(Sx - Sy) - Math.sqrt(4 * Txy * Txy + (Sx - Sy) * (Sx - Sy));
  const breakdownP = Pp_psi + σθθ_min_at_ref + T0_psi;

  // Collapse pressure (Mohr-Coulomb shear failure at max compression θθ)
  // Collapse when (σθθ_max − σ_r) exceeds UCS equivalent
  const phi = phi_fr_deg * Math.PI / 180;
  const q_mc = (1 + Math.sin(phi)) / (1 - Math.sin(phi)); // Mohr-Coulomb q
  // σr ≈ Pw at borehole wall; failure when σθθ_max ≥ q·σr + C0 (effective)
  // Collapse Pw: σθθ_max(Pw) = q · Pw + C0  (effective stresses)
  // σθθ_max = (Sx+Sy) + 2|...| − (Pw−Pp) = const_max − ΔPw
  const const_max = Sx + Sy + 2 * Math.abs(Sx - Sy) + Math.sqrt(4 * Txy * Txy + (Sx - Sy) * (Sx - Sy));
  // Failure: const_max − ΔPwc = q·ΔPwc + C0  → ΔPwc(1+q) = const_max − C0
  const ΔPwc = (const_max - C0_psi) / (1 + q_mc);
  const collapseP = Pp_psi + ΔPwc;

  return {
    σθθ_min_psi: σθθ_min,
    σθθ_max_psi: σθθ_max,
    breakdownP_psi: breakdownP,
    collapseP_psi: collapseP,
    effectiveSh_psi: sSh,
    effectiveSH_psi: sSH,
    effectiveSv_psi: sSv,
  };
}

/**
 * Fault reactivation — critical pore pressure (Mohr-Coulomb on fault plane).
 *
 * Computes the pore pressure at which a pre-existing fault reactivates
 * (slides) under the current stress state.  Uses the Mohr-Coulomb
 * criterion on the fault plane resolved from the principal stresses:
 *
 *   τ_f = μ_f (σ_n − P_crit) + C_f
 *
 * where σ_n and τ_f are the normal and shear stress on the fault plane.
 *
 * @param σ_h_psi    Minimum horizontal stress (psi)
 * @param σ_H_psi    Maximum horizontal stress (psi)
 * @param σ_v_psi    Vertical stress (psi)
 * @param P_p0_psi   In-situ pore pressure (psi)
 * @param fault_dip_deg   Fault dip angle (°) from horizontal (e.g. 60° for steep normal fault)
 * @param fault_strike_az Fault strike azimuth from σ_H (°)
 * @param mu_f       Fault friction coefficient (μ_f = tan φ_f); typical 0.6
 * @param C_f_psi    Fault cohesion (psi); typically 0 for natural faults
 * @returns          { σ_n_psi, τ_psi, P_crit_psi, safetyMargin_psi, willReactivate }
 */
export function geoFaultReactivation(
  σ_h_psi: number,
  σ_H_psi: number,
  σ_v_psi: number,
  P_p0_psi: number,
  fault_dip_deg: number,
  fault_strike_az: number,
  mu_f: number,
  C_f_psi: number,
): {
  σ_n_psi: number;
  τ_psi: number;
  P_crit_psi: number;
  safetyMargin_psi: number;
  willReactivate: boolean;
} {
  const dip = fault_dip_deg * Math.PI / 180;
  const az  = fault_strike_az * Math.PI / 180;

  // Resolve normal and shear stress on the fault plane.
  // The fault pole (normal vector) is perpendicular to the fault plane.
  // For a fault with strike azimuth and dip:
  //   n = (−sin(az)·sin(dip), cos(az)·sin(dip), cos(dip))
  // Traction vector t_i = σ_ij n_j (principal stress coords: σ1=σ_H, σ2=σ_h, σ3=σ_v)
  const nx = -Math.sin(az) * Math.sin(dip);
  const ny =  Math.cos(az) * Math.sin(dip);
  const nz =  Math.cos(dip);

  // Total normal stress on fault plane
  const σ_n = σ_H_psi * nx * nx + σ_h_psi * ny * ny + σ_v_psi * nz * nz;

  // Traction magnitude²
  const T2 = σ_H_psi * σ_H_psi * nx * nx
            + σ_h_psi * σ_h_psi * ny * ny
            + σ_v_psi * σ_v_psi * nz * nz;
  const τ = Math.sqrt(Math.max(0, T2 - σ_n * σ_n));

  // Effective normal stress at current pore pressure
  const σ_n_eff = σ_n - P_p0_psi;

  // Mohr-Coulomb shear strength at current conditions
  const τ_strength = mu_f * σ_n_eff + C_f_psi;

  // Critical pore pressure for reactivation: τ = mu_f (σ_n − P_crit) + C_f
  // → P_crit = σ_n − (τ − C_f) / mu_f
  const P_crit = σ_n - (τ - C_f_psi) / Math.max(mu_f, 1e-9);

  // Safety margin: positive = stable, negative = already reactivated
  const safetyMargin = P_crit - P_p0_psi;
  const willReactivate = τ > τ_strength;

  return { σ_n_psi: σ_n, τ_psi: τ, P_crit_psi: P_crit, safetyMargin_psi: safetyMargin, willReactivate };
}

/**
 * Deviated wellbore stability mud weight window combining Kirsch and ECD.
 *
 * Uses geoDeviatedKirsch to compute breakdown and collapse pressures for a
 * deviated well, then uses geoECD to compute the equivalent circulating
 * density, and returns the recommended mud weight with stability assessment.
 *
 * @param sigma_h     Min horizontal stress (psi)
 * @param sigma_H     Max horizontal stress (psi)
 * @param sigma_v     Vertical stress (psi)
 * @param Pp          Pore pressure (psi)
 * @param inc_deg     Wellbore inclination (°)
 * @param az_deg      Wellbore azimuth from σH (°)
 * @param C0          Unconfined compressive strength (psi)
 * @param phi_deg     Friction angle (°)
 * @param T0          Tensile strength (psi)
 * @param MW_ppg      Mud weight (ppg) — used for ECD calculation
 * @param TVD_ft      True vertical depth (ft)
 * @param Q_gpm       Circulation rate (gpm)
 * @param D_h_in      Hole diameter (in)
 * @param D_p_in      Drill pipe OD (in)
 * @param L_ft        Interval length (ft)
 * @param mu_p        Plastic viscosity (cp)
 * @param tau_y       Yield point (lbf/100ft²)
 * @returns           {MW_min_ppg, MW_max_ppg, MW_recommended_ppg, ECD_ppg, BP_psia, CP_psia, stable}
 */
export function geoDeviatedStabilityWindow(
  sigma_h: number,
  sigma_H: number,
  sigma_v: number,
  Pp: number,
  inc_deg: number,
  az_deg: number,
  C0: number,
  phi_deg: number,
  T0: number,
  MW_ppg: number,
  TVD_ft: number,
  Q_gpm: number,
  D_h_in: number,
  D_p_in: number,
  L_ft: number,
  mu_p: number,
  tau_y: number,
): {
  MW_min_ppg: number;
  MW_max_ppg: number;
  MW_recommended_ppg: number;
  ECD_ppg: number;
  BP_psia: number;
  CP_psia: number;
  stable: boolean;
} {
  // Compute wellbore pressure from mud weight
  const Pw_psia = 0.052 * MW_ppg * TVD_ft;
  // Get Kirsch pressures for the deviated wellbore
  const kirsch = geoDeviatedKirsch(sigma_h, sigma_H, sigma_v, Pp, Pw_psia, inc_deg, az_deg, C0, phi_deg, T0);
  const BP_psia = kirsch.breakdownP_psi;
  const CP_psia = kirsch.collapseP_psi;

  // Convert pressures to mud weight equivalent (ppg)
  const psiToEMW = (P_psi: number) => P_psi / (0.052 * TVD_ft);
  const MW_min_ppg = psiToEMW(CP_psia);
  const MW_max_ppg = psiToEMW(BP_psia);

  // Compute ECD (correct arg order: MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y)
  const ecdResult = geoECD(MW_ppg, TVD_ft, Q_gpm, D_h_in, D_p_in, L_ft, mu_p, tau_y);
  const ecd = ecdResult.ECD_ppg;

  // Recommended MW: midpoint of stability window, biased 40% toward the collapse side
  // (conservative: stay closer to collapse pressure than to fracture gradient)
  const MW_recommended_ppg = MW_min_ppg + 0.4 * (MW_max_ppg - MW_min_ppg);

  const stable = ecd > MW_min_ppg && ecd < MW_max_ppg;

  return {
    MW_min_ppg,
    MW_max_ppg,
    MW_recommended_ppg,
    ECD_ppg: ecd,
    BP_psia,
    CP_psia,
    stable,
  };
}
