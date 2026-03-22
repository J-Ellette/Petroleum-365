/**
 * P365 — Gas PVT Properties
 *
 * All temperature inputs in °F unless noted; pressure inputs in psia.
 * Internally converts: T_R = T_F + 459.67 (Rankine), T_K = T_R / 1.8 (Kelvin).
 */

// ─── Pseudo-critical properties ─────────────────────────────────────────────

/**
 * Natural gas pseudo-critical temperature and pressure via Lee-Kesler correlation.
 * Valid for dry natural gas mixtures.
 * @param sg Gas specific gravity (air = 1.0)
 * @returns [Tpc_R, Ppc_psia]
 */
export function pseudoCriticalByLeeKesler(sg: number): [number, number] {
  const Tpc = 169.2 + 349.5 * sg - 74.0 * sg * sg; // °R
  const Ppc = 756.8 - 131.0 * sg - 3.6 * sg * sg;  // psia
  return [Tpc, Ppc];
}

/**
 * Pseudo-critical properties via Kay's mixing rule from component data.
 * @param yi  Array of mole fractions
 * @param Tci Array of component critical temperatures (°R)
 * @param Pci Array of component critical pressures (psia)
 * @returns [Tpc_R, Ppc_psia]
 */
export function pseudoCriticalByKays(
  yi: number[],
  Tci: number[],
  Pci: number[]
): [number, number] {
  if (yi.length !== Tci.length || yi.length !== Pci.length) {
    throw new Error("Input arrays must have the same length");
  }
  let Tpc = 0;
  let Ppc = 0;
  for (let i = 0; i < yi.length; i++) {
    Tpc += yi[i] * Tci[i];
    Ppc += yi[i] * Pci[i];
  }
  return [Tpc, Ppc];
}

/**
 * Wichert-Aziz pseudo-critical correction for sour gas (H2S + CO2).
 * @param Tpc Uncorrected pseudo-critical temperature (°R)
 * @param Ppc Uncorrected pseudo-critical pressure (psia)
 * @param yCO2 Mole fraction CO2
 * @param yH2S Mole fraction H2S
 * @returns [Tpc_corrected_R, Ppc_corrected_psia]
 */
export function wichertAzizCorrection(
  Tpc: number,
  Ppc: number,
  yCO2: number,
  yH2S: number
): [number, number] {
  const A = yCO2 + yH2S;
  const B = yH2S;
  const eps =
    120.0 * (Math.pow(A, 0.9) - Math.pow(A, 1.6)) +
    15.0 * (Math.pow(B, 0.5) - Math.pow(B, 4.0));
  const TpcC = Tpc - eps;
  const PpcC = (Ppc * TpcC) / (Tpc + B * (1 - B) * eps);
  return [TpcC, PpcC];
}

// ─── Z-factor correlations ────────────────────────────────────────────────────

/**
 * Z-factor by Dranchuk-Abou-Kassem (DAK) correlation (Newton-Raphson iteration).
 * Valid: 1.0 ≤ Tpr ≤ 3.0; 0.2 ≤ Ppr ≤ 30.
 * Reference: Dranchuk & Abou-Kassem, JCPT 1975.
 *
 * @param T_F  Reservoir temperature (°F)
 * @param P_psia Pressure (psia)
 * @param Tpc  Pseudo-critical temperature (°R)
 * @param Ppc  Pseudo-critical pressure (psia)
 * @returns Z-factor (dimensionless)
 */
export function zFactorByDAK(
  T_F: number,
  P_psia: number,
  Tpc: number,
  Ppc: number
): number {
  const T_R = T_F + 459.67;
  const Tpr = T_R / Tpc;
  const Ppr = P_psia / Ppc;

  // DAK coefficients
  const A1  =  0.3265;
  const A2  = -1.0700;
  const A3  = -0.5339;
  const A4  =  0.01569;
  const A5  = -0.05165;
  const A6  =  0.5475;
  const A7  = -0.7361;
  const A8  =  0.1844;
  const A9  =  0.1056;
  const A10 =  0.6134;
  const A11 =  0.7210;

  // Combined correlation coefficients (functions of Tpr)
  const c1 = A1 + A2/Tpr + A3/(Tpr*Tpr*Tpr) + A4/(Tpr*Tpr*Tpr*Tpr) + A5/(Tpr*Tpr*Tpr*Tpr*Tpr);
  const c2 = A6 + A7/Tpr + A8/(Tpr*Tpr);
  const c3 = A9 * (A7/Tpr + A8/(Tpr*Tpr));

  // Iterate on Z using the implicit DAK equation:
  // Z = 1 + c1*ρr + c2*ρr² - c3*ρr⁵ + (A10/Tpr³)*(1 + A11*ρr²)*ρr²*exp(-A11*ρr²)
  // where ρr = 0.27*Ppr / (Z * Tpr)
  let Z = 1.0;
  const maxIter = 150;
  const tol = 1e-10;

  for (let i = 0; i < maxIter; i++) {
    const rhoR = 0.27 * Ppr / (Z * Tpr);
    const rhoR2 = rhoR * rhoR;
    const expTerm = Math.exp(-A11 * rhoR2);

    const Znew =
      1 +
      c1 * rhoR +
      c2 * rhoR2 -
      c3 * rhoR2 * rhoR2 * rhoR +
      (A10 / (Tpr * Tpr * Tpr)) * (1 + A11 * rhoR2) * rhoR2 * expTerm;

    if (Math.abs(Znew - Z) < tol) {
      return Znew;
    }
    Z = Znew;
  }
  return Z;
}

/**
 * Z-factor by Brill-Beggs correlation (explicit — no iteration).
 * Faster but less accurate than DAK. Good for 1.15 ≤ Tpr ≤ 2.4; Ppr ≤ 15.
 *
 * @param T_F  Temperature (°F)
 * @param P_psia Pressure (psia)
 * @param Tpc  Pseudo-critical temperature (°R)
 * @param Ppc  Pseudo-critical pressure (psia)
 * @returns Z-factor
 */
export function zFactorByBrillBeggs(
  T_F: number,
  P_psia: number,
  Tpc: number,
  Ppc: number
): number {
  const T_R = T_F + 459.67;
  const Tpr = T_R / Tpc;
  const Ppr = P_psia / Ppc;

  const A = 1.39 * Math.pow(Tpr - 0.92, 0.5) - 0.36 * Tpr - 0.101;
  const B = (0.62 - 0.23 * Tpr) * Ppr +
            (0.066 / (Tpr - 0.86) - 0.037) * Ppr * Ppr +
            (0.32 / Math.pow(10, 9 * (Tpr - 1))) * Math.pow(Ppr, 6);
  const C = 0.132 - 0.32 * Math.log10(Tpr);
  const D = Math.pow(10, 0.3106 - 0.49 * Tpr + 0.1824 * Tpr * Tpr);
  return A + (1 - A) * Math.exp(-B) + C * Math.pow(Ppr, D);
}

/**
 * Z-factor by Hall-Yarborough method (iterative, very accurate).
 * Reference: Hall & Yarborough, JPT 1974.
 *
 * @param T_F  Temperature (°F)
 * @param P_psia Pressure (psia)
 * @param Tpc  Pseudo-critical temperature (°R)
 * @param Ppc  Pseudo-critical pressure (psia)
 * @returns Z-factor
 */
export function zFactorByHallYarborough(
  T_F: number,
  P_psia: number,
  Tpc: number,
  Ppc: number
): number {
  const T_R = T_F + 459.67;
  const Tpr = T_R / Tpc;
  const Ppr = P_psia / Ppc;
  const t = 1.0 / Tpr;

  const A = 0.06125 * t * Math.exp(-1.2 * (1 - t) * (1 - t));

  // Iteratively solve for reduced density Y
  // Initial guess from ideal gas: Y ≈ A*Ppr
  let Y = A * Ppr;
  if (Y <= 0 || Y >= 1) Y = 0.001;
  const maxIter = 100;
  const tol = 1e-8;

  for (let i = 0; i < maxIter; i++) {
    const Y2 = Y * Y;
    const Y3 = Y2 * Y;
    const Y4 = Y3 * Y;
    const oneMinusY = 1 - Y;

    // F(Y) = -A*Ppr + (Y+Y²+Y³-Y⁴)/(1-Y)³ - B*Y² + C*Y^d = 0
    const B = 14.76 * t - 9.76 * t * t + 4.58 * t * t * t;
    const C = 90.7 * t - 242.2 * t * t + 42.4 * t * t * t;
    const d = 2.18 + 2.82 * t;

    const f = -A * Ppr +
      (Y + Y2 + Y3 - Y4) / Math.pow(oneMinusY, 3) -
      B * Y2 +
      C * Math.pow(Y, d);

    const df = (1 + 4 * Y + 4 * Y2 - 4 * Y3 + Y4) / Math.pow(oneMinusY, 4) -
      2 * B * Y +
      C * d * Math.pow(Y, d - 1);

    if (df === 0) break;
    const delta = f / df;
    Y -= delta;
    if (Y <= 0) Y = 1e-6;
    if (Y >= 1) Y = 0.99;
    if (Math.abs(delta) < tol) break;
  }

  return A * Ppr / Y;
}

// ─── Gas viscosity ─────────────────────────────────────────────────────────────

/**
 * Gas viscosity by Lee-Gonzalez-Eakin correlation.
 * @param T_F     Temperature (°F)
 * @param P_psia  Pressure (psia)
 * @param sg      Gas specific gravity (air = 1.0)
 * @param Z       Z-factor (if not provided, computed via DAK with Lee-Kesler Tpc/Ppc)
 * @returns Gas viscosity (cp)
 */
export function gasViscosityByLeeGonzalez(
  T_F: number,
  P_psia: number,
  sg: number,
  Z?: number
): number {
  const T_R = T_F + 459.67;
  const M = 28.97 * sg; // molecular weight, g/mol

  // Gas density, lbm/ft³
  let zVal = Z;
  if (zVal === undefined) {
    const [Tpc, Ppc] = pseudoCriticalByLeeKesler(sg);
    zVal = zFactorByDAK(T_F, P_psia, Tpc, Ppc);
  }
  const rho_g = (P_psia * M) / (10.73 * T_R * zVal); // lbm/ft³

  const K = ((9.4 + 0.02 * M) * Math.pow(T_R, 1.5)) / (209 + 19 * M + T_R);
  const X = 3.5 + 986 / T_R + 0.01 * M;
  const Y = 2.4 - 0.2 * X;

  return 1e-4 * K * Math.exp(X * Math.pow(rho_g / 62.4, Y));
}

// ─── Gas properties at reservoir conditions ──────────────────────────────────

/**
 * Gas density at reservoir conditions.
 * @param T_F    Temperature (°F)
 * @param P_psia Pressure (psia)
 * @param sg     Gas specific gravity (air = 1.0)
 * @param Z      Z-factor
 * @returns Gas density (lbm/ft³)
 */
export function gasDensity(
  T_F: number,
  P_psia: number,
  sg: number,
  Z: number
): number {
  const T_R = T_F + 459.67;
  const M = 28.97 * sg;
  return (P_psia * M) / (10.73 * T_R * Z);
}

/**
 * Gas formation volume factor Bg.
 * @param T_F    Temperature (°F)
 * @param P_psia Pressure (psia)
 * @param Z      Z-factor
 * @param Psc    Standard pressure (psia, default 14.696)
 * @param Tsc    Standard temperature (°F, default 60)
 * @returns Bg (res bbl / scf)
 */
export function gasFVF(
  T_F: number,
  P_psia: number,
  Z: number,
  Psc = 14.696,
  Tsc = 60
): number {
  const T_R  = T_F  + 459.67;
  const Tsc_R = Tsc + 459.67;
  // Bg in res ft³/scf
  const Bg_ft3 = (Psc * Z * T_R) / (P_psia * Tsc_R);
  // Convert to res bbl/scf: 1 bbl = 5.615 ft³
  return Bg_ft3 / 5.615;
}

/**
 * Gas compressibility cg at reservoir conditions.
 * @param T_F    Temperature (°F)
 * @param P_psia Pressure (psia)
 * @param Tpc    Pseudo-critical temperature (°R)
 * @param Ppc    Pseudo-critical pressure (psia)
 * @param Z      Z-factor at (T, P)
 * @returns cg (psi⁻¹)
 */
export function gasCompressibility(
  T_F: number,
  P_psia: number,
  Tpc: number,
  Ppc: number,
  Z: number
): number {
  const T_R = T_F + 459.67;
  const Tpr = T_R / Tpc;
  const Ppr = P_psia / Ppc;

  // Numerical derivative of Z w.r.t. Ppr
  const dPpr = 0.001;
  const Zp = zFactorByDAK(T_F, P_psia + dPpr * Ppc, Tpc, Ppc);
  const Zm = zFactorByDAK(T_F, P_psia - dPpr * Ppc, Tpc, Ppc);
  const dZdPpr = (Zp - Zm) / (2 * dPpr);

  return (1 / Ppr - (1 / Z) * dZdPpr) / Ppc; // psi⁻¹
}
