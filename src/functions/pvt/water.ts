/**
 * P365 — Water/Brine PVT Properties
 *
 * McCain correlations for water/brine PVT properties.
 * Units: pressure in psia, temperature in °F, salinity in ppm NaCl.
 */

// ─── Water Formation Volume Factor ────────────────────────────────────────────

/**
 * Water FVF by McCain correlation.
 *
 * @param T_F    Temperature (°F)
 * @param P_psia Pressure (psia)
 * @returns Bw (res bbl/STB)
 */
export function waterFVFByMcCain(T_F: number, P_psia: number): number {
  const deltaVwT =
    -1.0001e-2 + 1.33391e-4 * T_F + 5.50654e-7 * T_F * T_F;
  const deltaVwP =
    -1.95301e-9 * P_psia * T_F -
    1.72834e-13 * P_psia * P_psia * T_F -
    3.58922e-7 * P_psia -
    2.25341e-10 * P_psia * P_psia;
  return (1 + deltaVwT) * (1 + deltaVwP);
}

// ─── Gas solubility in water ──────────────────────────────────────────────────

/**
 * Solution gas-water ratio by McCain correlation.
 *
 * @param T_F      Temperature (°F)
 * @param P_psia   Pressure (psia)
 * @param salinity Salinity (ppm NaCl), default = 0 (fresh water)
 * @returns Rsw (scf/STB)
 */
export function solutionGasWaterByMcCain(
  T_F: number,
  P_psia: number,
  salinity = 0
): number {
  // Fresh water
  const A = 8.15839 - 6.12265e-2 * T_F + 1.91663e-4 * T_F * T_F - 2.1654e-7 * T_F * T_F * T_F;
  const B = 1.01021e-2 - 7.44241e-5 * T_F + 3.05553e-7 * T_F * T_F - 2.94883e-10 * T_F * T_F * T_F;
  const C = -(9.02505 - 0.130237 * T_F + 8.53425e-4 * T_F * T_F - 2.34122e-6 * T_F * T_F * T_F + 2.37049e-9 * T_F * T_F * T_F * T_F) * 1e-7;

  const RswFresh = A + B * P_psia + C * P_psia * P_psia;

  // Salinity correction
  const S = salinity / 1e6; // weight fraction
  const corrFactor = 1 - S * (0.0753 - 1.73e-4 * T_F);
  return RswFresh * corrFactor;
}

// ─── Water compressibility ────────────────────────────────────────────────────

/**
 * Water compressibility by McCain correlation.
 *
 * @param T_F    Temperature (°F)
 * @param P_psia Pressure (psia)
 * @param Rsw    Solution gas-water ratio (scf/STB)
 * @returns cw (psi⁻¹)
 */
export function waterCompressibilityByMcCain(
  T_F: number,
  P_psia: number,
  Rsw: number
): number {
  const cwp =
    (3.8546 -
      1.34e-4 * P_psia +
      Math.pow(10, -6) * (50.6 - 0.222 * T_F) * P_psia -
      Math.pow(10, -9) * P_psia * P_psia) *
    1e-6;

  // Gas in solution correction
  return cwp * (1 + 8.9e-3 * Rsw);
}

// ─── Water viscosity ──────────────────────────────────────────────────────────

/**
 * Water viscosity by McCain correlation.
 *
 * @param T_F    Temperature (°F)
 * @param P_psia Pressure (psia)
 * @param salinity Salinity (ppm NaCl), default = 0
 * @returns μw (cp)
 */
export function waterViscosityByMcCain(
  T_F: number,
  P_psia: number,
  salinity = 0
): number {
  // Dead brine viscosity at 1 atm
  const A = 109.574 - 8.40564 * salinity / 1e4 + 0.313314 * (salinity / 1e4) * (salinity / 1e4) + 8.72213 * (salinity / 1e4) * (salinity / 1e4) * (salinity / 1e4);
  const B = -(1.12166 - 2.63951e-2 * salinity / 1e4 + 6.79461e-4 * (salinity / 1e4) * (salinity / 1e4) + 5.47119e-5 * (salinity / 1e4) * (salinity / 1e4) * (salinity / 1e4) - 1.55586e-6 * Math.pow(salinity / 1e4, 4));

  const mu14696 = A * Math.pow(T_F, B);

  // Pressure correction
  return mu14696 * (0.9994 + 4.0295e-5 * P_psia + 3.1062e-9 * P_psia * P_psia);
}

// ─── Water density ────────────────────────────────────────────────────────────

/**
 * Water density at reservoir conditions.
 * @param Bw  Water FVF (res bbl/STB)
 * @param salinity Salinity (ppm), used for surface water density
 * @returns ρw (lbm/ft³)
 */
export function waterDensity(Bw: number, salinity = 0): number {
  // Surface water density ~ 62.4 + 0.438 * S where S is ppm/10000
  const rhoSurface = 62.4 + 0.438 * (salinity / 1e4);
  return rhoSurface / Bw;
}
