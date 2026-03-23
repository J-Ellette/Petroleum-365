/**
 * P365 — PVT Interfacial Tension (IFT)
 *
 * Interfacial tension functions for:
 *   Gas-oil IFT (Baker-Swerdloff correlation)
 *   Gas-oil IFT from parachors (Macleod-Sugden)
 *   Gas-brine IFT (Jennings & Patzek)
 *
 * Units: IFT in dyne/cm (= mN/m).  Temperature in °F, pressure in psia.
 */

// ─── Gas-Oil IFT — Baker & Swerdloff (1956) ──────────────────────────────────

/**
 * Dead oil surface tension at atmospheric pressure via Baker-Swerdloff (1956).
 *
 *   σ_dead_68  = 39.0 − 0.2571 × API          (at 68°F)
 *   σ_dead_100 = 37.5 − 0.2571 × API          (at 100°F)
 *   Interpolate/extrapolate linearly for other temperatures.
 *
 * @param API    Oil API gravity
 * @param T_F    Temperature (°F)
 * @returns      Dead-oil surface tension (dyne/cm)
 */
export function pvtDeadOilIFT(API: number, T_F: number): number {
  const sigma_68  = Math.max(1, 39.0  - 0.2571 * API);
  const sigma_100 = Math.max(1, 37.5  - 0.2571 * API);
  // Linear interpolation / extrapolation
  const frac = (T_F - 68) / (100 - 68);
  return sigma_68 + frac * (sigma_100 - sigma_68);
}

/**
 * Live (gas-saturated) oil–gas IFT via Baker-Swerdloff correction for
 * dissolved gas (1956).
 *
 *   σ_live = σ_dead × exp(−1.328e-3 × Rs)
 *
 * @param API    Oil API gravity
 * @param T_F    Temperature (°F)
 * @param Rs     Solution GOR (scf/STB)
 * @returns      Live-oil/gas IFT (dyne/cm)
 */
export function pvtGasOilIFTByBakerSwerdloff(
  API: number,
  T_F: number,
  Rs: number,
): number {
  const sigma_dead = pvtDeadOilIFT(API, T_F);
  const correction = Math.exp(-1.328e-3 * Rs);
  return Math.max(0.1, sigma_dead * correction);
}

// ─── Gas-Oil IFT — Macleod-Sugden (Parachor Method) ─────────────────────────

/**
 * Gas-oil IFT from parachors (Macleod-Sugden equation).
 *
 *   σ^(1/4) = Σ_i P_i (x_i · ρ_L − y_i · ρ_G)
 *
 * where P_i are component parachors, x_i liquid mole fractions,
 * y_i vapor mole fractions, ρ_L and ρ_G are molar densities (mol/cm³).
 *
 * @param parachors  Array of component parachors (cm³·dyne^(1/4)/mol)
 * @param xi_liquid  Array of liquid-phase mole fractions
 * @param yi_vapor   Array of vapor-phase mole fractions
 * @param rhoL_gcc   Liquid molar density (mol/cm³)
 * @param rhoG_gcc   Vapor molar density (mol/cm³)
 * @returns          IFT (dyne/cm)
 */
export function pvtGasOilIFTByMacleodSugden(
  parachors:  number[],
  xi_liquid:  number[],
  yi_vapor:   number[],
  rhoL_gcc:   number,
  rhoG_gcc:   number,
): number {
  if (parachors.length !== xi_liquid.length || parachors.length !== yi_vapor.length) {
    throw new Error("parachors, xi_liquid, and yi_vapor must have equal length");
  }
  let sum = 0;
  for (let i = 0; i < parachors.length; i++) {
    sum += parachors[i] * (xi_liquid[i] * rhoL_gcc - yi_vapor[i] * rhoG_gcc);
  }
  return Math.pow(Math.max(0, sum), 4);
}

// ─── Gas-Brine IFT — Jennings & Patzek (1993) ────────────────────────────────

/**
 * Gas-brine interfacial tension via the Jennings & Patzek (1993) empirical
 * correlation for natural gas / methane-dominated systems.
 *
 *   σ_brine_gas = σ_water_gas × (1 + 1.766e-6 × salinity_ppm^1.5 × T_K^0.5 / P_MPa)
 *
 * The base gas-water IFT uses the Massoudi-King (1974) equation:
 *   σ_water_gas = 72.8 − 0.1715 × (T_F − 32) × 5/9    (for pure water)
 *   corrected for pressure: σ = σ_atm × exp(−0.0003 × P_psia)
 *
 * Reference: Jennings H.Y. & Patzek T.W. (1993) — Correlation of interfacial
 * tension of gas-brine systems. SPE 26192.
 *
 * @param T_F           Temperature (°F)
 * @param P_psia        Pressure (psia)
 * @param salinity_ppm  Total dissolved solids (mg/L = ppm)
 * @returns             Gas-brine IFT (dyne/cm)
 */
export function pvtGasBrineIFT(
  T_F: number,
  P_psia: number,
  salinity_ppm: number,
): number {
  const T_C   = (T_F - 32) * 5 / 9;
  const T_K   = T_C + 273.15;
  const P_MPa = P_psia * 0.006895;

  // Base water-gas IFT at atmospheric pressure (Massoudi-King simplification)
  const sigma_atm = 72.8 - 0.1715 * T_C;

  // Pressure correction (exponential decay)
  const sigma_water_gas = Math.max(5, sigma_atm * Math.exp(-0.003 * P_MPa));

  // Salinity enhancement (Jennings-Patzek)
  const salinity_factor = 1 + 1.766e-6 * Math.pow(salinity_ppm, 1.5)
                              * Math.sqrt(T_K)
                              / Math.max(P_MPa, 0.1);
  return sigma_water_gas * Math.min(salinity_factor, 2.5);
}

// ─── EoS Tuning Helpers ───────────────────────────────────────────────────────

/**
 * Peneloux volume-shift parameter for Peng-Robinson EoS.
 *
 * The volume shift c_i adjusts the molar volume without affecting VLE:
 *   V_corrected = V_PR − Σ(zi · c_i)
 *
 * Peneloux et al. (1982) give a group-contribution estimate based on
 * the Rackett compressibility factor (Z_RA):
 *   c_i = R·Tc / Pc · (0.29441 − Z_RA)
 * with Z_RA ≈ 0.29056 − 0.08775 · ω  (Watson 1943 approximation)
 *
 * @param Tc_R   Critical temperature (°R)
 * @param Pc_psia Critical pressure (psia)
 * @param omega  Acentric factor
 * @returns      Volume shift c (ft³/lb-mol)
 */
export function pvtPenelouxShift(
  Tc_R: number,
  Pc_psia: number,
  omega: number,
): number {
  const R     = 10.732;              // psia·ft³ / (lb-mol·°R)
  const Z_RA  = 0.29056 - 0.08775 * omega;
  return R * Tc_R / Pc_psia * (0.29441 - Z_RA);
}

/**
 * Regress volume-shift parameters from observed and calculated molar volumes
 * (least-squares minimisation).
 *
 * Finds the single scalar shift s such that:
 *   Σ (V_calc_i − s − V_obs_i)² is minimised
 *   → s = mean(V_calc_i − V_obs_i)
 *
 * @param V_calc  Calculated molar volumes (any consistent unit, e.g. ft³/lb-mol)
 * @param V_obs   Observed molar volumes (same unit)
 * @returns       Optimal volume shift s and residual RMSE
 */
export function pvtEoSVolumeShiftRegress(
  V_calc: number[],
  V_obs:  number[],
): { shift: number; rmse: number } {
  if (V_calc.length !== V_obs.length || V_calc.length === 0) {
    throw new Error("V_calc and V_obs must be non-empty and equal length");
  }
  const n     = V_calc.length;
  const shift = V_calc.reduce((sum, v, i) => sum + (v - V_obs[i]), 0) / n;
  const sse   = V_calc.reduce((sum, v, i) => {
    const r = v - shift - V_obs[i];
    return sum + r * r;
  }, 0);
  return { shift, rmse: Math.sqrt(sse / n) };
}

/**
 * Binary interaction parameter (kij) estimation using the Chueh-Prausnitz
 * correlation (1967) for non-polar component pairs.
 *
 *   kij = 1 − [2·√(Vci^(1/3)·Vcj^(1/3)) / (Vci^(1/3) + Vcj^(1/3))]^n
 *
 * Recommended n = 6 for hydrocarbon pairs.
 *
 * @param Vc_i_ft3permol  Critical volume of component i (ft³/lb-mol)
 * @param Vc_j_ft3permol  Critical volume of component j (ft³/lb-mol)
 * @param n               Exponent (default 6 for hydrocarbons)
 * @returns               Estimated kij (dimensionless, > 0 means repulsion)
 */
export function pvtBinaryInteractionParam(
  Vc_i_ft3permol: number,
  Vc_j_ft3permol: number,
  n = 6,
): number {
  const Vi13  = Math.cbrt(Vc_i_ft3permol);
  const Vj13  = Math.cbrt(Vc_j_ft3permol);
  const term  = 2 * Math.sqrt(Vi13 * Vj13) / (Vi13 + Vj13);
  return 1 - Math.pow(term, n);
}
