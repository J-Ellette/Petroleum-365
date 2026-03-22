/**
 * P365 — Flow Assurance (FA)
 *
 * Hydrate prediction, inhibitor dosing, CO2 corrosion, erosion analysis:
 *   Hydrate temperature depression (Hammerschmidt equation)
 *   CO2 corrosion rate (de Waard-Milliams 1991)
 *   Erosion velocity (API RP 14E)
 *
 * Units: field (psia, °F, °C, bbl/d, Mscf/d, in) or SI where noted.
 */

// ─── Hydrate Prediction ────────────────────────────────────────────────────────

/**
 * Molecular weights and hydrate depression constants for common inhibitors.
 */
const INHIBITOR_PROPS: Record<string, { M: number; label: string }> = {
  methanol: { M: 32.04,  label: "Methanol (MeOH)" },
  meg:      { M: 62.07,  label: "Monoethylene Glycol (MEG)" },
  deg:      { M: 106.12, label: "Diethylene Glycol (DEG)" },
  teg:      { M: 150.17, label: "Triethylene Glycol (TEG)" },
  cacl2:    { M: 110.98, label: "Calcium Chloride (CaCl₂)" },
};

/**
 * Hydrate temperature depression — Hammerschmidt (1934) equation.
 *
 * ΔT = (K_H · W) / [M · (100 - W)]
 *
 * where K_H = 2335 for methanol/glycols (°F·lb·mol/lb).
 * W = mass fraction of inhibitor in aqueous phase (%).
 *
 * @param W_mass_pct     Inhibitor concentration in water (mass %)
 * @param inhibitor      Inhibitor type: "methanol"|"meg"|"deg"|"teg"|"cacl2"
 * @returns              Temperature depression (°F)
 */
export function hammerschmidtDepression(W_mass_pct: number, inhibitor: keyof typeof INHIBITOR_PROPS = "methanol"): number {
  if (W_mass_pct <= 0 || W_mass_pct >= 100) throw new Error("W_mass_pct must be between 0 and 100");
  const { M } = INHIBITOR_PROPS[inhibitor];
  const K_H = 2335;
  return (K_H * W_mass_pct) / (M * (100 - W_mass_pct));
}

/**
 * Required inhibitor concentration for target temperature depression.
 *
 * Inverted Hammerschmidt: W = M · ΔT · 100 / (K_H + M · ΔT)
 *
 * @param deltaT_F   Required temperature depression (°F)
 * @param inhibitor  Inhibitor type
 * @returns          Required inhibitor concentration (mass %)
 */
export function hammerschmidtConcentration(deltaT_F: number, inhibitor: keyof typeof INHIBITOR_PROPS = "methanol"): number {
  if (deltaT_F <= 0) throw new Error("Temperature depression must be positive");
  const { M } = INHIBITOR_PROPS[inhibitor];
  const K_H = 2335;
  return (M * deltaT_F * 100) / (K_H + M * deltaT_F);
}

/**
 * Katz (1945) hydrate formation temperature estimate from specific gravity.
 *
 * Simplified polynomial fit to the Katz chart:
 * T_hyd ≈ a + b·log(P_psia) where a,b depend on SG.
 *
 * @param P_psia     System pressure (psia)
 * @param SG_gas     Gas specific gravity (air = 1.0), typically 0.55–0.75
 * @returns          Hydrate formation temperature (°F)
 */
export function katzHydrateTemp(P_psia: number, SG_gas: number): number {
  // Polynomial approximation of Katz correlation chart
  // T_hyd = A * SG^B + C * log(P)^D — fitted constants
  const logP = Math.log10(P_psia);
  // Approximate: T_hyd(°F) = -16.9 + 76.3*SG + 23.5*log10(P/14.7)
  const T_hyd = -16.9 + 76.3 * SG_gas + 23.5 * Math.log10(P_psia / 14.7);
  return T_hyd;
}

/**
 * Methanol injection rate required to prevent hydrates.
 *
 * m_inj = W · q_water / (1 - W/100)
 * where q_water is in bbl/d and m_inj is in lb/d.
 *
 * @param W_mass_pct    Required methanol concentration (mass %)
 * @param q_water_bpd   Water production rate (bbl/d)
 * @returns             Methanol injection rate (lb/d)
 */
export function methanolInjectionRate(W_mass_pct: number, q_water_bpd: number): number {
  const W = W_mass_pct / 100;
  const q_water_lb_d = q_water_bpd * 5.615 * 62.4;  // bbl/d → lb/d (water density ~62.4 lb/ft³)
  return W * q_water_lb_d / (1 - W);
}

/**
 * MEG injection rate for target concentration.
 *
 * @param W_mass_pct    Required MEG concentration (mass %)
 * @param q_water_bpd   Water rate (bbl/d)
 * @param SG_meg        MEG specific gravity (default 1.113)
 * @returns             MEG injection rate (bbl/d)
 */
export function megInjectionRate(W_mass_pct: number, q_water_bpd: number, SG_meg = 1.113): number {
  const lb_per_day = methanolInjectionRate(W_mass_pct, q_water_bpd);
  // Override: use MEG molecular weight correction factor (MEG heavier than methanol)
  const W = W_mass_pct / 100;
  const q_water_lb_d = q_water_bpd * 5.615 * 62.4;
  const meg_lb_d = W * q_water_lb_d / (1 - W);
  const meg_gal_d = meg_lb_d / (SG_meg * 8.34);   // 8.34 lb/gal water
  return meg_gal_d / 42;  // bbl/d (42 gal/bbl)
}

// ─── CO2 Corrosion ────────────────────────────────────────────────────────────

/**
 * de Waard-Milliams (1991) CO2 corrosion rate for carbon steel.
 *
 * log(Vcorr) = 5.8 − 1710/T_K + 0.67·log(P_CO2)
 * where T_K = temperature in Kelvin, P_CO2 in bar.
 *
 * @param T_C          Temperature (°C)
 * @param P_CO2_bar    Partial pressure of CO2 (bar)
 * @returns            Corrosion rate (mm/year)
 */
export function deWaardMilliamsCorrosion(T_C: number, P_CO2_bar: number): number {
  if (P_CO2_bar <= 0) throw new Error("CO2 partial pressure must be positive");
  const T_K = T_C + 273.15;
  const logVcorr = 5.8 - 1710 / T_K + 0.67 * Math.log10(P_CO2_bar);
  return Math.pow(10, logVcorr);
}

/**
 * CO2 corrosion severity classification.
 *
 * @param rate_mm_yr   Corrosion rate (mm/year)
 * @returns            Severity: "low"|"moderate"|"high"|"very high"
 */
export function corrosionSeverity(rate_mm_yr: number): string {
  if (rate_mm_yr < 0.1)  return "low";
  if (rate_mm_yr < 0.5)  return "moderate";
  if (rate_mm_yr < 1.0)  return "high";
  return "very high";
}

/**
 * CO2 partial pressure from system pressure and mole fraction.
 *
 * @param P_total_psia  Total system pressure (psia)
 * @param y_CO2         CO2 mole fraction (0–1)
 * @returns             CO2 partial pressure (bar)
 */
export function co2PartialPressure(P_total_psia: number, y_CO2: number): number {
  return P_total_psia * y_CO2 * 0.068948;  // psia → bar
}

/**
 * Inhibited corrosion rate from uninhibited rate and inhibitor efficiency.
 *
 * @param rate_mm_yr    Uninhibited corrosion rate (mm/year)
 * @param efficiency    Inhibitor efficiency (0–1, e.g., 0.95 for 95%)
 * @returns             Inhibited corrosion rate (mm/year)
 */
export function inhibitedCorrosionRate(rate_mm_yr: number, efficiency: number): number {
  if (efficiency < 0 || efficiency > 1) throw new Error("Efficiency must be 0–1");
  return rate_mm_yr * (1 - efficiency);
}

/**
 * Required corrosion allowance based on design life and corrosion rate.
 *
 * @param rate_mm_yr    Corrosion rate (mm/year)
 * @param design_life_yr Design life (years)
 * @returns             Corrosion allowance (mm)
 */
export function corrosionAllowance(rate_mm_yr: number, design_life_yr: number): number {
  return rate_mm_yr * design_life_yr;
}

// ─── Erosion Velocity ─────────────────────────────────────────────────────────

/**
 * Mixture density for multiphase erosion calculation (API RP 14E).
 *
 * ρ_mix = (q_liq · ρ_liq + q_gas · ρ_gas) / (q_liq + q_gas_actual)
 *
 * @param q_liq_bpd    Liquid rate (bbl/d)
 * @param q_gas_mscfd  Gas rate (Mscf/d)
 * @param P_psia       Operating pressure (psia)
 * @param T_R          Temperature (°R)
 * @param SG_liq       Liquid specific gravity
 * @param SG_gas       Gas specific gravity
 * @param Z            Gas Z-factor
 * @returns            Mixture density (lb/ft³)
 */
export function mixtureDensity(
  q_liq_bpd: number,
  q_gas_mscfd: number,
  P_psia: number,
  T_R: number,
  SG_liq: number,
  SG_gas: number,
  Z = 0.9
): number {
  const rho_liq = SG_liq * 62.4;
  const rho_gas = (SG_gas * 28.97 * P_psia) / (10.73 * T_R * Z);
  const q_liq_ft3s = q_liq_bpd * 5.615 / 86400;
  const q_gas_ft3s = q_gas_mscfd * 1000 * T_R * 14.7 / (520 * P_psia * 86400) * Z;
  const q_total = q_liq_ft3s + q_gas_ft3s;
  if (q_total < 1e-12) return rho_liq;
  return (q_liq_ft3s * rho_liq + q_gas_ft3s * rho_gas) / q_total;
}

/**
 * Erosional velocity limit — API RP 14E.
 *
 * v_e = C / √ρ_mix   (ft/s)
 *
 * where C = 100 for continuous service, 125 for intermittent service.
 *
 * @param rho_mix_lb_ft3  Mixture density (lb/ft³)
 * @param C_factor         Empirical constant: 100 (continuous) or 125 (intermittent)
 * @returns               Erosional velocity (ft/s)
 */
export function erosionalVelocity(rho_mix_lb_ft3: number, C_factor = 100): number {
  if (rho_mix_lb_ft3 <= 0) throw new Error("Density must be positive");
  return C_factor / Math.sqrt(rho_mix_lb_ft3);
}

/**
 * Actual mixture velocity in pipe.
 *
 * @param q_liq_bpd    Liquid rate (bbl/d)
 * @param q_gas_mscfd  Gas rate (Mscf/d)
 * @param D_in         Pipe inside diameter (in)
 * @param P_psia       Pressure (psia)
 * @param T_R          Temperature (°R)
 * @param Z            Z-factor
 * @returns            Mixture velocity (ft/s)
 */
export function mixtureVelocity(
  q_liq_bpd: number,
  q_gas_mscfd: number,
  D_in: number,
  P_psia: number,
  T_R: number,
  Z = 0.9
): number {
  const A_ft2 = Math.PI * Math.pow(D_in / 12, 2) / 4;
  const q_liq_ft3s = q_liq_bpd * 5.615 / 86400;
  const q_gas_ft3s = q_gas_mscfd * 1000 * T_R * 14.7 / (520 * P_psia * 86400) * Z;
  return (q_liq_ft3s + q_gas_ft3s) / A_ft2;
}

/**
 * Erosion ratio (actual velocity / erosional velocity limit).
 *
 * @param Vm_fts   Actual mixture velocity (ft/s)
 * @param Ve_fts   Erosional velocity limit (ft/s)
 * @returns        Erosion ratio (>1 = above limit = erosion risk)
 */
export function erosionRatio(Vm_fts: number, Ve_fts: number): number {
  if (Ve_fts <= 0) throw new Error("Erosional velocity must be positive");
  return Vm_fts / Ve_fts;
}

/**
 * Erosion risk classification.
 *
 * @param ratio  Erosion ratio (Vm / Ve)
 * @returns      Risk level: "low"|"moderate"|"high"
 */
export function erosionRiskClass(ratio: number): string {
  if (ratio < 0.8)  return "low";
  if (ratio < 1.0)  return "moderate";
  return "high";
}

// ─── Integrated Flow Assurance Assessment ─────────────────────────────────────

/**
 * Perform a combined hydrate + corrosion + erosion assessment.
 *
 * @param T_C             Operating temperature (°C)
 * @param P_psia          Operating pressure (psia)
 * @param T_hyd_F         Hydrate formation temperature (°F)
 * @param q_liq_bpd       Liquid rate (bbl/d)
 * @param q_gas_mscfd     Gas rate (Mscf/d)
 * @param D_in            Pipe inside diameter (in)
 * @param y_CO2           CO2 mole fraction
 * @param SG_liq          Liquid SG
 * @param SG_gas          Gas SG
 * @param Z               Gas Z-factor
 * @param C_erosion       Erosion C factor (100 or 125)
 * @returns               Assessment object with all risk flags
 */
export function flowAssuranceAssessment(
  T_C: number,
  P_psia: number,
  T_hyd_F: number,
  q_liq_bpd: number,
  q_gas_mscfd: number,
  D_in: number,
  y_CO2: number,
  SG_liq: number,
  SG_gas: number,
  Z = 0.9,
  C_erosion = 100
): {
  hydrateRisk: boolean;
  subCooling_F: number;
  corrosionRate_mm_yr: number;
  corrosionSeverity: string;
  erosionRatio: number;
  erosionRisk: string;
} {
  const T_F = T_C * 9 / 5 + 32;
  const subCooling_F = T_hyd_F - T_F;
  const hydrateRisk = subCooling_F > 0;

  const P_CO2_bar = co2PartialPressure(P_psia, y_CO2);
  const corrRate  = deWaardMilliamsCorrosion(T_C, P_CO2_bar);
  const corrSev   = corrosionSeverity(corrRate);

  const T_R   = T_F + 459.67;
  const rhoM  = mixtureDensity(q_liq_bpd, q_gas_mscfd, P_psia, T_R, SG_liq, SG_gas, Z);
  const Ve    = erosionalVelocity(rhoM, C_erosion);
  const Vm    = mixtureVelocity(q_liq_bpd, q_gas_mscfd, D_in, P_psia, T_R, Z);
  const ratio = erosionRatio(Vm, Ve);

  return {
    hydrateRisk,
    subCooling_F,
    corrosionRate_mm_yr: corrRate,
    corrosionSeverity: corrSev,
    erosionRatio: ratio,
    erosionRisk: erosionRiskClass(ratio),
  };
}
