/**
 * P365 — PVT Gas Condensate Properties
 *
 * Functions for gas condensate / retrograde-gas reservoir fluids:
 *   - Wellstream (recombined) specific gravity
 *   - Wet-gas gravity correction (Eilerts 1957)
 *   - Condensate formation volume factor
 *   - Condensate density
 *   - Condensate viscosity (modified Standing)
 *   - Whitson (1983) C7+ characterization via gamma distribution
 *
 * Units: field — psia, °F, STB, Mscf, lbm, cp.
 *
 * References:
 *   Standing, M.B. (1977). "Volumetric and Phase Behavior of Oil Field
 *   Hydrocarbon Systems." SPE, Richardson, TX.
 *   Eilerts, C.K. (1957). "Phase Relations of Gas-Condensate Fluids."
 *   Bureau of Mines Monograph No. 10.
 *   Whitson, C.H. (1983). "Characterizing Hydrocarbon Plus Fractions."
 *   SPEJ, August 1983, pp. 683–694.
 */

const R_GAS = 10.7316;   // psia·ft³/(lbmol·°R)

// ─── Wellstream Gravity ────────────────────────────────────────────────────

/**
 * Wellstream (recombined) specific gravity of a gas condensate stream.
 *
 * Equation (Eilerts 1957 / Standing 1977):
 *   γ_ws = (γ_g + 4.584e-3 · CGR · γ_c) / (1 + 1.327e-3 · CGR · M_c / (γ_c · 350.4))
 *
 * Simplified form commonly used in engineering:
 *   γ_ws = (γ_g × 1000 + 4.584 × CGR_stbMMscf × γ_c) / (1000 + 1.327 × CGR_stbMMscf)
 *
 * where the 1000 and 1.327 factors come from the ratio of gas volume to
 * condensate volume in the separator.
 *
 * @param gammaG_sp     Separator gas specific gravity (air = 1.0)
 * @param gammaC        Condensate specific gravity (water = 1.0)
 * @param CGR_stb_MMscf Condensate-gas ratio (STB/MMscf)
 * @returns             Wellstream (recombined) specific gravity (air = 1.0)
 */
export function wellstreamGravity(
  gammaG_sp: number,
  gammaC: number,
  CGR_stb_MMscf: number,
): number {
  // Condensate molecular weight from specific gravity (API correlation)
  const API = 141.5 / gammaC - 131.5;
  const M_c = 6084 / (API - 5.9);   // Standing liquid molecular weight (lb/lbmol)

  const numerator   = gammaG_sp + 4.584e-3 * CGR_stb_MMscf * gammaC;
  const denominator = 1 + 1.327e-3 * CGR_stb_MMscf * M_c / (gammaC * 350.4);
  return numerator / denominator;
}

/**
 * Wet-gas equivalent gravity correction factor.
 *
 * Converts separator gas gravity to an equivalent wellstream gravity
 * accounting for NGL content stripped in the separator.
 *
 * γ_eq = (1 + C_ngl · γ_ngl / γ_g) / (1 + C_ngl / γ_g)
 *
 * Simplified (Standing 1977 Eq. 2.11):
 *   γ_gg = γ_g × (1 + 5.912e-5 × API × T_sp × log10(P_sp / 114.7))
 *
 * @param gammaG_sp   Separator gas gravity (air = 1.0)
 * @param API_cond    Condensate API gravity
 * @param T_sp_F      Separator temperature (°F)
 * @param P_sp_psia   Separator pressure (psia)
 * @returns           Corrected wellstream gas gravity (air = 1.0)
 */
export function wetGasCorrectedGravity(
  gammaG_sp: number,
  API_cond: number,
  T_sp_F: number,
  P_sp_psia: number,
): number {
  const correction = 5.912e-5 * API_cond * T_sp_F * Math.log10(P_sp_psia / 114.7);
  return gammaG_sp * (1 + correction);
}

// ─── Condensate Formation Volume Factor ───────────────────────────────────

/**
 * Condensate (oil) formation volume factor (Bco) in RB/STB.
 *
 * Uses the Standing (1947) correlation for saturated oil FVF
 * adapted for condensate systems.
 *
 * Bco = 0.972 + 1.47e-4 × F^1.175
 * F   = Rsp × (γ_g / γ_c)^0.5 + 1.25 × T_F
 *
 * where Rsp = solution GOR at separator conditions (scf/STB).
 *
 * @param Rsp_scf_stb   Solution GOR at separator (scf/STB)
 * @param gammaG        Gas gravity (air = 1.0)
 * @param gammaC        Condensate (stock-tank liquid) specific gravity
 * @param T_F           Reservoir temperature (°F)
 * @returns             Condensate FVF (RB/STB)
 */
export function condensateFVF(
  Rsp_scf_stb: number,
  gammaG: number,
  gammaC: number,
  T_F: number,
): number {
  const F   = Rsp_scf_stb * Math.pow(gammaG / gammaC, 0.5) + 1.25 * T_F;
  return 0.972 + 1.47e-4 * Math.pow(F, 1.175);
}

/**
 * Condensate density at reservoir conditions (lb/ft³).
 *
 * ρ_co = (ρ_st + 0.01357 × Rsp × γ_g) / Bco
 *
 * where ρ_st = surface condensate density = 62.4 × γ_c (lb/ft³)
 *       Rsp  = solution GOR (scf/STB)
 *       Bco  = condensate FVF (RB/STB)
 *
 * @param gammaC      Condensate specific gravity
 * @param Rsp_scf_stb Solution GOR (scf/STB)
 * @param gammaG      Gas specific gravity
 * @param Bco_RB_STB  Condensate FVF (RB/STB)
 * @returns           Density (lb/ft³)
 */
export function condensateDensity(
  gammaC: number,
  Rsp_scf_stb: number,
  gammaG: number,
  Bco_RB_STB: number,
): number {
  const rho_st = 62.4 * gammaC;          // surface density (lb/ft³)
  const rho_g_dissolved = 0.01357 * Rsp_scf_stb * gammaG;  // dissolved gas mass (lb/STB) / (5.615 ft³/STB)
  // Numerator in lb/bbl → divide by 5.615 for ft³/STB → multiply by Bco (RB/STB)
  return (rho_st + rho_g_dissolved) / (5.615 * Bco_RB_STB) * 5.615;
  // Simplified: rho_res = (rho_st·5.615 + 0.01357·Rsp·γg) / (5.615·Bco)
}

/**
 * Condensate viscosity at reservoir conditions (cp).
 *
 * Uses the Beggs-Robinson (1975) dead oil viscosity model
 * corrected for solution gas (Chew-Connally 1959):
 *
 * μ_od = 10^(10^(3.0324 - 0.02023·API) / T_F^1.163) − 1   [Beggs-Robinson dead oil]
 * a    = 10^(2.2e-7·Rsp^2 − 7.4e-4·Rsp)
 * b    = 0.68/10^(8.62e-5·Rsp) + 0.25/10^(1.1e-3·Rsp) + 0.062/10^(3.74e-3·Rsp)
 * μ_o  = a · μ_od^b
 *
 * @param API_cond    Condensate API gravity
 * @param T_F         Reservoir temperature (°F)
 * @param Rsp_scf_stb Solution GOR (scf/STB)
 * @returns           Condensate viscosity (cp)
 */
export function condensateViscosity(
  API_cond: number,
  T_F: number,
  Rsp_scf_stb: number,
): number {
  // Dead oil viscosity (Beggs-Robinson 1975)
  const loglog = 3.0324 - 0.02023 * API_cond;
  const mu_od  = Math.pow(10, Math.pow(10, loglog) * Math.pow(T_F, -1.163)) - 1;
  const mu_od_pos = Math.max(mu_od, 0.01);

  // Chew-Connally (1959) live oil correction
  const Rsp = Rsp_scf_stb;
  const a = Math.pow(10, 2.2e-7 * Rsp * Rsp - 7.4e-4 * Rsp);
  const b = 0.68 / Math.pow(10, 8.62e-5 * Rsp)
          + 0.25 / Math.pow(10, 1.1e-3 * Rsp)
          + 0.062 / Math.pow(10, 3.74e-3 * Rsp);

  return a * Math.pow(mu_od_pos, b);
}

// ─── Whitson C7+ Characterization ──────────────────────────────────────────

/**
 * Whitson (1983) C7+ gamma-distribution split into pseudocomponent fractions.
 *
 * The molar distribution P(M) follows a three-parameter gamma distribution:
 *   P(M) = (M − η)^(α−1) · exp(−(M − η)/β) / (β^α · Γ(α))
 *
 * where:
 *   η = minimum molecular weight of C7+ fraction (~96 lbm/lbmol for C7)
 *   α = distribution shape parameter (Whitson recommends 1 < α < 3)
 *   β = (M_C7plus − η) / α
 *
 * Splits the C7+ into `nComp` pseudocomponents with equal mole fractions.
 * Returns arrays of: molecular weight, specific gravity, critical properties
 * (estimated via Riazi-Daubert and Lee-Kesler correlations).
 *
 * @param M_C7plus      C7+ average molecular weight (lbm/lbmol)
 * @param gamma_C7plus  C7+ specific gravity (water = 1.0)
 * @param nComp         Number of pseudocomponents (1–10), default 3
 * @param alpha         Gamma distribution shape parameter (default 1.5)
 * @returns             Array of { Mw, gamma, Tc_R, Pc_psia, omega, z_frac }
 */
export function whitsonC7PlusSplit(
  M_C7plus: number,
  gamma_C7plus: number,
  nComp = 3,
  alpha = 1.5,
): Array<{ Mw: number; gamma: number; Tc_R: number; Pc_psia: number; omega: number; z_frac: number }> {
  const eta  = 96.0;     // minimum M for C7+ (heptane Mw ≈ 100, use 96 for light C7)
  const beta = (M_C7plus - eta) / alpha;

  // Equal-probability split: find molecular weight at equal probability intervals.
  // Use incomplete gamma function via Lanczos approximation.
  const gammaLn = (x: number): number => {
    // Lanczos approximation for ln Γ(x)
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
               771.32342877765313, -176.61502916214059, 12.507343278686905,
               -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    let x2 = x;
    let sum = c[0];
    for (let i = 1; i < g + 2; i++) sum += c[i] / (x2 + i);
    x2 -= 1;
    const t = x2 + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (x2 + 0.5) * Math.log(t) - t + Math.log(sum);
  };

  // Regularized incomplete gamma function P(a, x) using series expansion
  const incompleteGamma = (a: number, x: number): number => {
    if (x < 0) return 0;
    if (x === 0) return 0;
    // Series expansion
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n <= 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-12 * Math.abs(sum)) break;
    }
    return Math.exp(-x + a * Math.log(x) - gammaLn(a)) * sum;
  };

  // Find quantiles of the gamma distribution: equal mole fraction intervals
  const probs = Array.from({ length: nComp + 1 }, (_, k) => k / nComp);
  const quantiles: number[] = [0];  // M - η at each probability

  for (let k = 1; k <= nComp; k++) {
    // Bisect: find x such that P(α, x) = probs[k]
    const target = probs[k];
    let lo = 0, hi = Math.max(5 * alpha * beta, 10 * beta);
    for (let bi = 0; bi < 80; bi++) {
      const mid = (lo + hi) / 2;
      const p   = incompleteGamma(alpha, mid / beta);
      if (p < target) lo = mid; else hi = mid;
    }
    quantiles.push((lo + hi) / 2);
  }

  const result: Array<{ Mw: number; gamma: number; Tc_R: number; Pc_psia: number; omega: number; z_frac: number }> = [];

  for (let k = 0; k < nComp; k++) {
    const M_lo = quantiles[k] + eta;
    const M_hi = quantiles[k + 1] + eta;
    const Mw   = (M_lo + M_hi) / 2;   // midpoint molecular weight

    // Specific gravity for pseudocomponent (linear interpolation along MW-gamma curve)
    // Katz-Firoozabadi table interpolation (simplified linear fit):
    //   γ = 0.2855 + 0.3545e-3 · Mw   (valid for Mw ≈ 100–600)
    const gamma = Math.min(0.92, Math.max(0.72, 0.2855 + 3.545e-4 * Mw));

    // Riazi-Daubert (1987) critical properties:
    //   Tc (°R) = 544.2 × Mw^0.2998 × γ^1.0555 × exp(1.3478e-4·Mw - 0.61641·γ)
    //   Pc (psia) = 4.5203e4 × Mw^-0.8063 × γ^1.6015 × exp(-1.8078e-3·Mw - 0.3084·γ)
    const Tc_R    = 544.2 * Math.pow(Mw, 0.2998) * Math.pow(gamma, 1.0555)
                  * Math.exp(1.3478e-4 * Mw - 0.61641 * gamma);
    const Pc_psia = 4.5203e4 * Math.pow(Mw, -0.8063) * Math.pow(gamma, 1.6015)
                  * Math.exp(-1.8078e-3 * Mw - 0.3084 * gamma);

    // Lee-Kesler (1975) acentric factor:
    //   ω = (-ln(Pc/14.696) − 5.92714 + 6.09648/Tbr + 1.28862·ln(Tbr) − 0.169347·Tbr^6)
    //       / (15.2518 − 15.6875/Tbr − 13.4721·ln(Tbr) + 0.43577·Tbr^6)
    // Estimate Tb from Tc and Pc via Ahmed (1989): Tb_R ≈ Tc_R × (3.32195 − 1.21322·ln(Pc_psia))^-1
    const Tb_R = Tc_R * 0.5 * (1 + Math.exp(-Mw / 200));   // rough approximation
    const Tbr  = Math.max(0.3, Math.min(0.999, Tb_R / Tc_R));
    const A1   = -5.92714 + 6.09648 / Tbr + 1.28862 * Math.log(Tbr) - 0.169347 * Math.pow(Tbr, 6);
    const A2   = 15.2518 - 15.6875 / Tbr - 13.4721 * Math.log(Tbr) + 0.43577 * Math.pow(Tbr, 6);
    const omega = Math.max(0, (-Math.log(Pc_psia / 14.696) - A1) / A2);

    result.push({
      Mw,
      gamma,
      Tc_R,
      Pc_psia,
      omega: Math.min(omega, 2.0),
      z_frac: 1 / nComp,
    });
  }

  return result;
}
