/**
 * P365 — Wellbore Integrity (WBI)
 *
 * Casing design (burst/collapse per API TR 5C3 / TR5C5),
 * cement job (volume, minimum top, slurry density),
 * shoe test / FIT / LOT / XLOT interpretation,
 * and tensile / buoyancy calculations.
 *
 * Units: field units (psia, ft, lbf, ppg, bbl) unless noted.
 */

// ─── Casing Burst ─────────────────────────────────────────────────────────────

/**
 * API Barlow internal-yield (burst) pressure rating for tubular goods.
 *
 * P_burst = 0.875 × 2 × Y_p × t / OD
 *
 * 0.875 = minimum wall tolerance factor per API 5CT.
 *
 * @param OD              Casing outer diameter (in)
 * @param t               Nominal wall thickness (in)
 * @param yield_strength  Minimum yield strength (psi) — e.g. 80000 for P-110
 * @returns               Internal yield pressure (psi)
 */
export function wbiCasingBurstRating(
  OD: number,
  t: number,
  yield_strength: number
): number {
  return 0.875 * 2 * yield_strength * t / OD;
}

/**
 * Burst design factor — ratio of casing burst rating to applied internal pressure.
 *
 * DF = P_rating / P_applied
 * API recommends DF ≥ 1.0; operators often use 1.1–1.25.
 *
 * @param P_rating   Casing burst (or collapse) rating (psi)
 * @param P_applied  Applied pressure (psi)
 * @returns          Design factor (dimensionless)
 */
export function wbiDesignFactor(P_rating: number, P_applied: number): number {
  if (P_applied <= 0) return Infinity;
  return P_rating / P_applied;
}

/**
 * Required casing burst rating given operating pressure and design factor.
 *
 * @param P_applied    Operating burst pressure (psi)
 * @param DF_required  Required design factor (e.g. 1.1)
 * @returns            Minimum required burst rating (psi)
 */
export function wbiRequiredBurstRating(P_applied: number, DF_required: number): number {
  return P_applied * DF_required;
}

// ─── Casing Collapse ──────────────────────────────────────────────────────────

/**
 * D/t ratio (OD / wall thickness) — key parameter for collapse regime selection.
 *
 * @param OD  Outer diameter (in)
 * @param t   Wall thickness (in)
 * @returns   D/t ratio (dimensionless)
 */
export function wbiDtRatio(OD: number, t: number): number {
  return OD / t;
}

/**
 * Elastic collapse pressure — governs thin-wall, lightly-loaded casings.
 *
 * P_el = 2E / (1 − ν²) · (t/OD)³
 *
 * @param OD  Outer diameter (in)
 * @param t   Wall thickness (in)
 * @param E   Young's modulus (psi), default 30e6 (steel)
 * @param nu  Poisson's ratio, default 0.3 (steel)
 * @returns   Elastic collapse pressure (psi)
 */
export function wbiElasticCollapseP(
  OD: number,
  t: number,
  E = 30e6,
  nu = 0.3
): number {
  return (2 * E / (1 - nu * nu)) * Math.pow(t / OD, 3);
}

/**
 * Yield collapse pressure — governs thick-wall casings (low D/t).
 *
 * P_yp = 2 · Y_p · (D/t − 1) / (D/t)²
 *
 * @param OD              Outer diameter (in)
 * @param t               Wall thickness (in)
 * @param yield_strength  Minimum yield strength (psi)
 * @returns               Yield collapse pressure (psi)
 */
export function wbiYieldCollapseP(
  OD: number,
  t: number,
  yield_strength: number
): number {
  const Dt = OD / t;
  return 2 * yield_strength * (Dt - 1) / (Dt * Dt);
}

/**
 * Conservative API-style collapse rating — minimum of elastic and yield values.
 *
 * @param OD              Outer diameter (in)
 * @param t               Wall thickness (in)
 * @param yield_strength  Minimum yield strength (psi)
 * @returns               Conservative collapse pressure estimate (psi)
 */
export function wbiCollapseRating(
  OD: number,
  t: number,
  yield_strength: number
): number {
  const P_el = wbiElasticCollapseP(OD, t);
  const P_yp = wbiYieldCollapseP(OD, t, yield_strength);
  return Math.min(P_el, P_yp);
}

/**
 * Classify casing collapse regime from D/t ratio.
 *
 * @param OD              Outer diameter (in)
 * @param t               Wall thickness (in)
 * @param yield_strength  Minimum yield strength (psi)
 * @returns               Collapse regime string
 */
export function wbiCollapseRegime(
  OD: number,
  t: number,
  yield_strength: number
): string {
  const Dt = OD / t;
  const Yp = yield_strength;
  const Dt_yp = Yp > 0 ? Math.sqrt((3 * 2 * 30e6 / Yp)) / 2 : 30;
  const Dt_pl = 16 + (80000 - Yp) / 20000;
  const Dt_el = 25 + (80000 - Yp) / 10000;

  if (Dt <= Math.min(Dt_yp, 15))  return "Yield";
  if (Dt <= Math.max(Dt_pl, 20))  return "Plastic";
  if (Dt <= Math.max(Dt_el, 28))  return "Transition";
  return "Elastic";
}

// ─── Tensile and Buoyancy ─────────────────────────────────────────────────────

/**
 * Air weight of a casing section.
 *
 * @param weight_per_ft  Casing linear weight (lb/ft — from API tables)
 * @param length_ft      Casing section length (ft)
 * @returns              Air weight (lbf)
 */
export function wbiCasingAirWeight(weight_per_ft: number, length_ft: number): number {
  return weight_per_ft * length_ft;
}

/**
 * Buoyancy factor for a tubular in drilling/completion fluid.
 *
 * BF = 1 − ρ_fluid / ρ_steel   (ρ_steel ≈ 65.5 ppg)
 *
 * @param mud_weight  Fluid density (ppg)
 * @param steel_ppg   Steel density (ppg), default 65.5
 * @returns           Buoyancy factor (dimensionless, 0–1)
 */
export function wbiBuoyancyFactor(mud_weight: number, steel_ppg = 65.5): number {
  return 1 - mud_weight / steel_ppg;
}

/**
 * Effective (in-fluid) weight of a casing string.
 *
 * @param air_weight   Air weight (lbf)
 * @param mud_weight   Fluid density (ppg)
 * @param steel_ppg    Steel density (ppg), default 65.5
 * @returns            Effective weight in fluid (lbf)
 */
export function wbiEffectiveWeight(
  air_weight: number,
  mud_weight: number,
  steel_ppg = 65.5
): number {
  return air_weight * wbiBuoyancyFactor(mud_weight, steel_ppg);
}

/**
 * Pipe body tensile capacity from cross-section and yield strength.
 *
 * F_tensile = π/4 · (OD² − ID²) · Y_p
 *
 * @param OD              Outer diameter (in)
 * @param t               Wall thickness (in)
 * @param yield_strength  Minimum yield strength (psi)
 * @returns               Pipe body tensile capacity (lbf)
 */
export function wbiTensileRating(OD: number, t: number, yield_strength: number): number {
  const ID = OD - 2 * t;
  const area = Math.PI / 4 * (OD * OD - ID * ID);
  return area * yield_strength;
}

/**
 * Check if a casing design passes the tensile design factor requirement.
 *
 * @param tensile_rating   Pipe body tensile capacity (lbf)
 * @param tensile_load     Applied tensile load at top of string (lbf)
 * @param DF_required      Required design factor (e.g. 1.6–2.0)
 * @returns                Object: { df, pass }
 */
export function wbiTensileCheck(
  tensile_rating: number,
  tensile_load: number,
  DF_required: number
): { df: number; pass: boolean } {
  const df = tensile_load > 0 ? tensile_rating / tensile_load : Infinity;
  return { df, pass: df >= DF_required };
}

// ─── Cement Job ───────────────────────────────────────────────────────────────

/**
 * Annular cement volume between two concentric tubulars (bbl).
 *
 * V = π/4 · (ID_outer² − OD_inner²) · h × (1 + excess_fraction) / 183.35
 *
 * @param ID_outer        Inner diameter of outer casing (in)
 * @param OD_inner        Outer diameter of inner casing/pipe (in)
 * @param h_ft            Interval height to cement (ft)
 * @param excess_fraction Excess factor for washouts (e.g. 0.25 = 25%)
 * @returns               Cement slurry volume (bbl)
 */
export function wbiCementVolume(
  ID_outer: number,
  OD_inner: number,
  h_ft: number,
  excess_fraction = 0.25
): number {
  const annular_area_in2 = Math.PI / 4 * (ID_outer * ID_outer - OD_inner * OD_inner);
  const vol_bbl = annular_area_in2 * h_ft / 183.35;
  return vol_bbl * (1 + excess_fraction);
}

/**
 * Minimum cement return height (minimum depth-to-TOC) from pressure balance.
 *
 * TOC_depth = shoe_depth × pore_grad / cement_grad
 *
 * @param shoe_depth       Casing shoe depth (ft TVD)
 * @param pore_grad_ppg    Pore pressure gradient at shoe (ppg EMW)
 * @param cement_grad_ppg  Cement slurry density (ppg); typical 15.8 ppg (Class G neat)
 * @returns                Minimum top of cement depth (ft TVD from surface)
 */
export function wbiMinCementTop(
  shoe_depth: number,
  pore_grad_ppg: number,
  cement_grad_ppg = 15.8
): number {
  const toc = shoe_depth * pore_grad_ppg / cement_grad_ppg;
  return Math.max(0, toc);
}

/**
 * Cement slurry density from water content.
 *
 * Based on Class G neat cement (94 lb/sack, abs. density 26.3 ppg).
 *
 * @param gal_water_per_sack  Fresh water per 94-lb sack (gal/sack)
 *                            Class G neat: 4.3 gal/sack
 * @returns                   Slurry density (ppg)
 */
export function wbiSlurryDensity(gal_water_per_sack: number): number {
  const W_cement = 94;
  const W_water  = 8.34 * gal_water_per_sack;
  const V_cement = 94 / 26.3;
  const V_water  = gal_water_per_sack;
  return (W_cement + W_water) / (V_cement + V_water);
}

/**
 * Cement column height from placed volume.
 *
 * @param V_slurry_bbl   Volume of cement slurry pumped (bbl)
 * @param ID_outer_in    ID of outer casing (in)
 * @param OD_inner_in    OD of inner string (in)
 * @returns              Cement column height (ft)
 */
export function wbiCementReturnHeight(
  V_slurry_bbl: number,
  ID_outer_in: number,
  OD_inner_in: number
): number {
  const annular_area_in2 = Math.PI / 4 * (ID_outer_in * ID_outer_in - OD_inner_in * OD_inner_in);
  if (annular_area_in2 <= 0) return 0;
  return (V_slurry_bbl * 183.35) / annular_area_in2;
}

// ─── Shoe Test / FIT / LOT / XLOT ────────────────────────────────────────────

/**
 * Equivalent mud weight from surface pressure during FIT / LOT.
 *
 * EMW (ppg) = MW + P_surface / (0.052 × TVD)
 *
 * @param P_surface  Surface pressure reached during test (psi)
 * @param TVD_ft     True vertical depth of shoe (ft)
 * @param MW_ppg     Current mud weight (ppg)
 * @returns          Equivalent mud weight (ppg) at test pressure
 */
export function wbiFITEquivalentMW(
  P_surface: number,
  TVD_ft: number,
  MW_ppg: number
): number {
  return MW_ppg + P_surface / (0.052 * TVD_ft);
}

/**
 * Surface pressure required to achieve a target FIT equivalent density.
 *
 * P_surface = (FIT_EMW − MW) × 0.052 × TVD
 *
 * @param FIT_EMW_ppg  Target FIT/LOT pressure (ppg EMW)
 * @param TVD_ft       Shoe depth (ft TVD)
 * @param MW_ppg       Current mud weight (ppg)
 * @returns            Required surface pressure (psi)
 */
export function wbiFITSurfacePressure(
  FIT_EMW_ppg: number,
  TVD_ft: number,
  MW_ppg: number
): number {
  return (FIT_EMW_ppg - MW_ppg) * 0.052 * TVD_ft;
}

/**
 * Evaluate a FIT/LOT result against a required equivalent density.
 *
 * @param EMW_achieved   Achieved test EMW (ppg)
 * @param EMW_required   Required minimum test EMW (ppg)
 * @returns              Object: { pass, margin_ppg, assessment }
 */
export function wbiShoeTestEvaluation(
  EMW_achieved: number,
  EMW_required: number
): { pass: boolean; margin_ppg: number; assessment: string } {
  const margin = EMW_achieved - EMW_required;
  const pass = margin >= 0;
  let assessment: string;
  if (margin >= 0.5)       assessment = "Excellent — wide margin";
  else if (margin >= 0.1)  assessment = "Pass — adequate margin";
  else if (margin >= 0)    assessment = "Pass — tight margin; monitor closely";
  else if (margin >= -0.3) assessment = "Marginal — consider remediation";
  else                     assessment = "Fail — cement squeeze or abandon section";
  return { pass, margin_ppg: margin, assessment };
}

/**
 * XLOT closure stress from instantaneous shut-in pressure (ISIP).
 *
 * σ_h_min ≈ ISIP (minimum horizontal stress)
 *
 * @param ISIP_psi  Instantaneous shut-in pressure (psi)
 * @param TVD_ft    Depth (ft TVD)
 * @returns         { gradient_psi_per_ft, EMW_ppg }
 */
export function wbiXLOTClosureStress(
  ISIP_psi: number,
  TVD_ft: number
): { gradient_psi_per_ft: number; EMW_ppg: number } {
  const gradient = ISIP_psi / TVD_ft;
  const EMW = gradient / 0.052;
  return { gradient_psi_per_ft: gradient, EMW_ppg: EMW };
}

/**
 * LOT breakdown EMW from peak surface pressure before leak-off.
 *
 * @param P_breakdown_psi  Peak surface pressure at leak-off (psi)
 * @param TVD_ft           Shoe depth (ft TVD)
 * @param MW_ppg           Mud weight (ppg)
 * @returns                Breakdown EMW (ppg)
 */
export function wbiLOTBreakdownEMW(
  P_breakdown_psi: number,
  TVD_ft: number,
  MW_ppg: number
): number {
  return wbiFITEquivalentMW(P_breakdown_psi, TVD_ft, MW_ppg);
}

// ─── Mud Weight Window ────────────────────────────────────────────────────────

/**
 * Drilling mud weight window for wellbore stability.
 *
 * @param pore_pressure_ppg      Pore pressure EMW (ppg)
 * @param collapse_pressure_ppg  Wellbore collapse EMW (ppg)
 * @param fracture_gradient_ppg  Fracture gradient EMW (ppg)
 * @param frac_safety_ppg        Safety below fracture gradient (ppg), default 0.5
 * @param collapse_safety_ppg    Safety above collapse (ppg), default 0.3
 * @returns                      { MW_min_ppg, MW_max_ppg, window_ppg, adequate }
 */
export function wbiMudWeightWindow(
  pore_pressure_ppg: number,
  collapse_pressure_ppg: number,
  fracture_gradient_ppg: number,
  frac_safety_ppg = 0.5,
  collapse_safety_ppg = 0.3
): {
  MW_min_ppg: number;
  MW_max_ppg: number;
  window_ppg: number;
  adequate: boolean;
} {
  const MW_min = Math.max(pore_pressure_ppg, collapse_pressure_ppg) + collapse_safety_ppg;
  const MW_max = fracture_gradient_ppg - frac_safety_ppg;
  const window = MW_max - MW_min;
  return {
    MW_min_ppg: MW_min,
    MW_max_ppg: MW_max,
    window_ppg: window,
    adequate: window > 0
  };
}

// ─── Hydrostatic Pressure Helpers ─────────────────────────────────────────────

/**
 * Hydrostatic pressure at depth from a column of fluid.
 *
 * P = 0.052 × MW × TVD
 *
 * @param MW_ppg  Fluid density (ppg)
 * @param TVD_ft  True vertical depth (ft)
 * @returns       Hydrostatic pressure (psia)
 */
export function wbiHydrostaticPressure(MW_ppg: number, TVD_ft: number): number {
  return 0.052 * MW_ppg * TVD_ft;
}

/**
 * Equivalent mud weight from a pressure at depth.
 *
 * @param P_psia  Pressure (psia)
 * @param TVD_ft  True vertical depth (ft)
 * @returns       Equivalent mud weight (ppg)
 */
export function wbiPressureToEMW(P_psia: number, TVD_ft: number): number {
  if (TVD_ft <= 0) return 0;
  return P_psia / (0.052 * TVD_ft);
}

// ─── Session 19: Tubing Design & Casing Wear ──────────────────────────────────

/**
 * Tubing burst rating — API 5C3 formula.
 *
 * P_burst = 0.875 × 2 × Fy × wall / OD
 *
 * @param OD_in   Tubing outside diameter (in)
 * @param wall_in Wall thickness (in)
 * @param Fy_psi  Yield strength (psi)
 * @param SF      Safety factor (default 1.0)
 * @returns       Allowable burst pressure (psia) = P_burst / SF
 */
export function wbiTubingBurst(
  OD_in: number,
  wall_in: number,
  Fy_psi: number,
  SF = 1.0,
): number {
  const P_burst = 0.875 * 2 * Fy_psi * wall_in / OD_in;
  return P_burst / SF;
}

/**
 * Tubing collapse rating — API 5C3 simplified (elastic vs yield governs).
 *
 * Elastic: P_e = 46.95e6 / (D/t × (D/t − 1)²)
 * Yield:   P_y = 2 × Fy × (D/t − 1) / (D/t)²
 * Returns min(P_e, P_y).
 *
 * @param OD_in   Tubing outside diameter (in)
 * @param wall_in Wall thickness (in)
 * @param Fy_psi  Yield strength (psi)
 * @param _E_psi  Young's modulus (psi); unused in simplified formula
 * @param _nu     Poisson's ratio; unused in simplified formula
 * @returns       Collapse pressure (psia)
 */
export function wbiTubingCollapse(
  OD_in: number,
  wall_in: number,
  Fy_psi: number,
  _E_psi = 30e6,
  _nu    = 0.3,
): number {
  const Dt = OD_in / wall_in;
  const P_e = 46.95e6 / (Dt * (Dt - 1) * (Dt - 1));
  const P_y = 2 * Fy_psi * (Dt - 1) / (Dt * Dt);
  return Math.min(P_e, P_y);
}

/**
 * Tubing tensile capacity — API axial yield load.
 *
 * Cross-section area A = π/4 × (OD² − ID²), ID = OD − 2×wall
 * P_yield = Fy × A
 * P_allowable = P_yield × buoyancy_factor / SF
 *
 * @param OD_in           Tubing outside diameter (in)
 * @param wall_in         Wall thickness (in)
 * @param Fy_psi          Yield strength (psi)
 * @param buoyancy_factor Buoyancy reduction factor (default 1.0 = in air)
 * @param SF              Safety factor (default 1.0)
 * @returns               {P_yield_lbf, P_allowable_lbf}
 */
export function wbiTubingTension(
  OD_in: number,
  wall_in: number,
  Fy_psi: number,
  buoyancy_factor = 1.0,
  SF = 1.0,
): { P_yield_lbf: number; P_allowable_lbf: number } {
  const ID_in    = OD_in - 2 * wall_in;
  const A_in2    = Math.PI / 4 * (OD_in * OD_in - ID_in * ID_in);
  const P_yield  = Fy_psi * A_in2;
  const P_allow  = P_yield * buoyancy_factor / SF;
  return { P_yield_lbf: P_yield, P_allowable_lbf: P_allow };
}

/**
 * Triaxial (Von Mises) stress check for tubing/casing.
 *
 * Thick-wall Lamé equations at the inner radius:
 *   ri = ID/2 = (OD - 2t)/2,  ro = OD/2
 *   σ_hoop   = (Pi·ri² − Po·ro²)/(ro²−ri²) + ri²·ro²·(Pi−Po)/((ro²−ri²)·ri²)
 *   σ_radial = −Pi  (compressive at inner wall)
 *   σ_axial  = F_axial / A
 *
 * Von Mises: σ_VM = √[½((σh−σr)²+(σr−σa)²+(σa−σh)²)]
 * Utilization = σ_VM / Fy
 *
 * @param P_i       Internal pressure (psia)
 * @param P_o       External pressure (psia)
 * @param OD_in     Outside diameter (in)
 * @param wall_in   Wall thickness (in)
 * @param F_axial   Axial force (lbf, positive = tension)
 * @param Fy_psi    Yield strength (psi)
 * @returns         {sigma_hoop_psi, sigma_radial_psi, sigma_axial_psi, sigma_VM_psi, utilization}
 */
export function wbiTriaxial(
  P_i: number,
  P_o: number,
  OD_in: number,
  wall_in: number,
  F_axial: number,
  Fy_psi: number,
): {
  sigma_hoop_psi:   number;
  sigma_radial_psi: number;
  sigma_axial_psi:  number;
  sigma_VM_psi:     number;
  utilization:      number;
} {
  const ri = (OD_in - 2 * wall_in) / 2;
  const ro = OD_in / 2;
  const ri2 = ri * ri;
  const ro2 = ro * ro;
  const A_in2 = Math.PI * (ro2 - ri2);

  // Lamé at inner wall
  const sigma_h = (P_i * ri2 - P_o * ro2) / (ro2 - ri2)
                + ri2 * ro2 * (P_i - P_o) / ((ro2 - ri2) * ri2);
  const sigma_r = -P_i;
  const sigma_a = F_axial / A_in2;

  const VM = Math.sqrt(0.5 * (
    (sigma_h - sigma_r) ** 2 +
    (sigma_r - sigma_a) ** 2 +
    (sigma_a - sigma_h) ** 2
  ));

  return {
    sigma_hoop_psi:   sigma_h,
    sigma_radial_psi: sigma_r,
    sigma_axial_psi:  sigma_a,
    sigma_VM_psi:     VM,
    utilization:      VM / Fy_psi,
  };
}

/**
 * Casing wear — derated burst and collapse ratings.
 *
 * Reduces wall thickness by wear_pct percent, then recomputes burst and
 * collapse using the worn wall thickness.
 *
 * @param OD_in    Casing outside diameter (in)
 * @param wall_in  Original wall thickness (in)
 * @param Fy_psi   Yield strength (psi)
 * @param wear_pct Wall thickness wear as a percentage (e.g. 20 = 20%)
 * @returns        {new_wall_in, burst_psi, collapse_psi, burst_derated, collapse_derated}
 */
export function wbiCasingWear(
  OD_in: number,
  wall_in: number,
  Fy_psi: number,
  wear_pct: number,
): {
  new_wall_in:      number;
  burst_psi:        number;
  collapse_psi:     number;
  burst_derated:    number;
  collapse_derated: number;
} {
  const new_wall = wall_in * (1 - wear_pct / 100);
  const burst_new    = wbiTubingBurst(OD_in, new_wall, Fy_psi, 1.0);
  const collapse_new = wbiTubingCollapse(OD_in, new_wall, Fy_psi);
  const burst_orig    = wbiTubingBurst(OD_in, wall_in, Fy_psi, 1.0);
  const collapse_orig = wbiTubingCollapse(OD_in, wall_in, Fy_psi);
  return {
    new_wall_in:      new_wall,
    burst_psi:        burst_orig,
    collapse_psi:     collapse_orig,
    burst_derated:    burst_new,
    collapse_derated: collapse_new,
  };
}
