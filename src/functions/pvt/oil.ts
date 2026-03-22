/**
 * P365 — Oil PVT Properties
 *
 * Correlations for crude oil pressure-volume-temperature properties.
 * Units: pressure in psia, temperature in °F, volume in bbl or scf/STB.
 */

// ─── API / Specific gravity conversion ──────────────────────────────────────

/** Convert API gravity to oil specific gravity. */
export function sgFromAPI(API: number): number {
  return 141.5 / (API + 131.5);
}

/** Convert oil specific gravity to API gravity. */
export function apiFromSG(sg: number): number {
  return 141.5 / sg - 131.5;
}

// ─── Bubble point pressure ───────────────────────────────────────────────────

/**
 * Bubble point pressure by Standing correlation (1947).
 * Valid for California crude oils; widely used globally.
 *
 * @param sg_gas  Gas specific gravity (air = 1.0)
 * @param API     Oil API gravity (°API)
 * @param Rs_scfSTB Solution GOR (scf/STB)
 * @param T_F     Reservoir temperature (°F)
 * @returns Bubble point pressure Pb (psia)
 */
export function bubblePointByStanding(
  sg_gas: number,
  API: number,
  Rs_scfSTB: number,
  T_F: number
): number {
  const a = API > 30 ? 0.00091 * T_F - 0.0125 * API : 0.000922 * T_F - 0.0150 * API;
  return 18.2 * (Math.pow(Rs_scfSTB / sg_gas, 0.83) * Math.pow(10, a) - 1.4);
}

/**
 * Bubble point pressure by Vasquez-Beggs correlation (1980).
 *
 * @param sg_gas  Gas specific gravity (air = 1.0), corrected to separator at 100 psig
 * @param API     Oil API gravity (°API)
 * @param Rs_scfSTB Solution GOR (scf/STB)
 * @param T_F     Reservoir temperature (°F)
 * @returns Pb (psia)
 */
export function bubblePointByVasquezBeggs(
  sg_gas: number,
  API: number,
  Rs_scfSTB: number,
  T_F: number
): number {
  let C1: number, C2: number, C3: number;
  if (API <= 30) {
    C1 = 0.362; C2 = 1.0937; C3 = 25.724;
  } else {
    C1 = 0.178; C2 = 1.187; C3 = 23.931;
  }
  return Math.pow(Rs_scfSTB / (C1 * sg_gas * Math.exp(C3 * API / (T_F + 459.67))), 1 / C2);
}

// ─── Solution GOR ─────────────────────────────────────────────────────────────

/**
 * Solution gas-oil ratio by Standing correlation.
 *
 * @param sg_gas  Gas specific gravity (air = 1.0)
 * @param API     Oil API gravity
 * @param P_psia  Pressure (psia), must be ≤ Pb
 * @param T_F     Temperature (°F)
 * @returns Rs (scf/STB)
 */
export function solutionGORByStanding(
  sg_gas: number,
  API: number,
  P_psia: number,
  T_F: number
): number {
  const a = API > 30 ? 0.00091 * T_F - 0.0125 * API : 0.000922 * T_F - 0.0150 * API;
  return sg_gas * Math.pow((P_psia / 18.2 + 1.4) * Math.pow(10, -a), 1.204);
}

/**
 * Solution GOR by Vasquez-Beggs correlation.
 *
 * @param sg_gas Gas specific gravity
 * @param API    API gravity
 * @param P_psia Pressure (psia)
 * @param T_F    Temperature (°F)
 * @returns Rs (scf/STB)
 */
export function solutionGORByVasquezBeggs(
  sg_gas: number,
  API: number,
  P_psia: number,
  T_F: number
): number {
  let C1: number, C2: number, C3: number;
  if (API <= 30) {
    C1 = 0.362; C2 = 1.0937; C3 = 25.724;
  } else {
    C1 = 0.178; C2 = 1.187; C3 = 23.931;
  }
  return C1 * sg_gas * Math.pow(P_psia, C2) * Math.exp(C3 * API / (T_F + 459.67));
}

// ─── Oil Formation Volume Factor ─────────────────────────────────────────────

/**
 * Saturated oil FVF (at or below bubble point) by Standing correlation.
 *
 * @param sg_gas  Gas specific gravity (air = 1.0)
 * @param sg_oil  Oil specific gravity at 60°F (dimensionless)
 * @param Rs_scfSTB Solution GOR (scf/STB) at this pressure
 * @param T_F     Temperature (°F)
 * @returns Bo (res bbl/STB)
 */
export function oilFVFSatByStanding(
  sg_gas: number,
  sg_oil: number,
  Rs_scfSTB: number,
  T_F: number
): number {
  return 0.9759 + 0.000120 * Math.pow(Rs_scfSTB * Math.sqrt(sg_gas / sg_oil) + 1.25 * T_F, 1.2);
}

/**
 * Saturated oil FVF by Vasquez-Beggs correlation.
 *
 * @param sg_gas  Gas specific gravity
 * @param API     API gravity
 * @param Rs_scfSTB Solution GOR (scf/STB)
 * @param T_F     Temperature (°F)
 * @returns Bo (res bbl/STB)
 */
export function oilFVFSatByVasquezBeggs(
  sg_gas: number,
  API: number,
  Rs_scfSTB: number,
  T_F: number
): number {
  let C1: number, C2: number, C3: number;
  if (API <= 30) {
    C1 = 4.677e-4; C2 = 1.751e-5; C3 = -1.811e-8;
  } else {
    C1 = 4.670e-4; C2 = 1.100e-5; C3 = 1.337e-9;
  }
  return 1 + C1 * Rs_scfSTB + C2 * (T_F - 60) * (API / sg_gas) + C3 * Rs_scfSTB * (T_F - 60) * (API / sg_gas);
}

/**
 * Undersaturated oil FVF (above bubble point) — compressibility correction.
 *
 * @param Bo_b     Oil FVF at bubble point (res bbl/STB)
 * @param co_psi   Oil compressibility above Pb (psi⁻¹)
 * @param P_psia   Current pressure (psia), > Pb
 * @param Pb_psia  Bubble point pressure (psia)
 * @returns Bo (res bbl/STB)
 */
export function oilFVFUndersat(
  Bo_b: number,
  co_psi: number,
  P_psia: number,
  Pb_psia: number
): number {
  return Bo_b * Math.exp(co_psi * (Pb_psia - P_psia));
}

// ─── Oil compressibility (above bubble point) ─────────────────────────────────

/**
 * Undersaturated oil compressibility by Vasquez-Beggs correlation.
 *
 * @param Rs_scfSTB Solution GOR at bubble point (scf/STB)
 * @param sg_gas    Gas specific gravity
 * @param API       API gravity
 * @param T_F       Temperature (°F)
 * @param P_psia    Pressure (psia)
 * @returns co (psi⁻¹)
 */
export function oilCompressibilityByVasquezBeggs(
  Rs_scfSTB: number,
  sg_gas: number,
  API: number,
  T_F: number,
  P_psia: number
): number {
  return (
    (-1433 + 5 * Rs_scfSTB + 17.2 * T_F - 1180 * sg_gas + 12.61 * API) /
    (1e5 * P_psia)
  );
}

// ─── Oil viscosity ─────────────────────────────────────────────────────────────

/**
 * Dead oil viscosity by Beal correlation.
 *
 * @param API  API gravity (°API)
 * @param T_F  Temperature (°F)
 * @returns Dead oil viscosity μod (cp)
 */
export function deadOilViscosityByBeal(API: number, T_F: number): number {
  const a = Math.pow(10, 0.43 + 8.33 / API);
  return (0.32 + 1.8e7 / Math.pow(API, 4.53)) * Math.pow(360 / (T_F + 200), a);
}

/**
 * Dead oil viscosity by Egbogah-Ng correlation.
 *
 * @param API  API gravity
 * @param T_F  Temperature (°F)
 * @returns μod (cp)
 */
export function deadOilViscosityByEgbogah(API: number, T_F: number): number {
  const logMu = 1.8653 - 0.025086 * API - 0.5644 * Math.log10(T_F);
  return Math.pow(10, Math.pow(10, logMu)) - 1;
}

/**
 * Saturated (live) oil viscosity by Beggs-Robinson correlation.
 *
 * @param muod     Dead oil viscosity (cp)
 * @param Rs_scfSTB Solution GOR (scf/STB)
 * @returns μo (cp)
 */
export function saturatedOilViscosityByBeggsRobinson(
  muod: number,
  Rs_scfSTB: number
): number {
  const a = 10.715 * Math.pow(Rs_scfSTB + 100, -0.515);
  const b = 5.44 * Math.pow(Rs_scfSTB + 150, -0.338);
  return a * Math.pow(muod, b);
}

/**
 * Undersaturated oil viscosity by Vasquez-Beggs correlation.
 *
 * @param muob    Saturated oil viscosity at bubble point (cp)
 * @param P_psia  Pressure (psia), > Pb
 * @param Pb_psia Bubble point pressure (psia)
 * @returns μo (cp)
 */
export function undersaturatedOilViscosityByVasquezBeggs(
  muob: number,
  P_psia: number,
  Pb_psia: number
): number {
  const m = 2.6 * Math.pow(P_psia, 1.187) * Math.exp(-11.513 - 8.98e-5 * P_psia);
  return muob * Math.pow(P_psia / Pb_psia, m);
}
