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
