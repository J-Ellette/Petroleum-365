/**
 * P365 — AGA-8 (1992) Compressibility Factor
 *
 * Implements mixture pseudo-critical properties via Kay's rule and the
 * Hall-Yarborough iterative method for Z-factor, consistent with the
 * AGA-8 simplified detail approach for pipeline-quality natural gas.
 *
 * Units: SI internally (K, MPa, mol/L); field-unit wrapper provided.
 */

// ─── Component Critical Properties ───────────────────────────────────────────

interface AGA8Props {
  Tc:    number;   // K
  Pc:    number;   // MPa
  MW:    number;   // g/mol
  omega: number;   // acentric factor
}

/** AGA-8 standard component critical properties. */
const AGA8_PROPS: Record<string, AGA8Props> = {
  C1:  { Tc: 190.56, Pc: 4.599, MW: 16.043, omega:  0.0115 },
  C2:  { Tc: 305.33, Pc: 4.872, MW: 30.070, omega:  0.0995 },
  C3:  { Tc: 369.83, Pc: 4.248, MW: 44.097, omega:  0.1523 },
  iC4: { Tc: 407.80, Pc: 3.640, MW: 58.124, omega:  0.1840 },
  nC4: { Tc: 425.12, Pc: 3.796, MW: 58.124, omega:  0.2010 },
  iC5: { Tc: 460.35, Pc: 3.381, MW: 72.151, omega:  0.2274 },
  nC5: { Tc: 469.70, Pc: 3.370, MW: 72.151, omega:  0.2510 },
  C6:  { Tc: 507.60, Pc: 3.025, MW: 86.178, omega:  0.3013 },
  C7:  { Tc: 540.20, Pc: 2.740, MW: 100.205, omega: 0.3495 },
  N2:  { Tc: 126.19, Pc: 3.396, MW: 28.013, omega:  0.0377 },
  CO2: { Tc: 304.13, Pc: 7.375, MW: 44.010, omega:  0.2239 },
  H2S: { Tc: 373.10, Pc: 8.936, MW: 34.082, omega:  0.0942 },
  H2:  { Tc:  33.19, Pc: 1.313, MW:  2.016, omega: -0.2160 },
  CO:  { Tc: 132.86, Pc: 3.494, MW: 28.010, omega:  0.0481 },
  He:  { Tc:   5.19, Pc: 0.228, MW:  4.003, omega: -0.3900 },
};

// ─── Exported Functions ───────────────────────────────────────────────────────

/**
 * Critical and transport properties for a single AGA-8 component.
 *
 * @param component  Component symbol (e.g. "C1", "N2")
 * @returns          { Tc (K), Pc (MPa), MW (g/mol), omega }
 */
export function aga8CharProps(component: string): AGA8Props {
  const p = AGA8_PROPS[component];
  if (!p) throw new Error(`Unknown AGA-8 component: ${component}`);
  return { ...p };
}

/**
 * Mixture pseudo-critical properties via Kay's linear mixing rule.
 *
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          { Tc_mix (K), Pc_mix (MPa), MW_mix (g/mol), omega_mix }
 */
export function aga8MixProps(
  yi: number[],
  components: string[]
): { Tc_mix: number; Pc_mix: number; MW_mix: number; omega_mix: number } {
  if (yi.length !== components.length) throw new Error("yi and components must have same length");
  let Tc_mix = 0, Pc_mix = 0, MW_mix = 0, omega_mix = 0;
  for (let i = 0; i < yi.length; i++) {
    const p = aga8CharProps(components[i]);
    Tc_mix    += yi[i] * p.Tc;
    Pc_mix    += yi[i] * p.Pc;
    MW_mix    += yi[i] * p.MW;
    omega_mix += yi[i] * p.omega;
  }
  return { Tc_mix, Pc_mix, MW_mix, omega_mix };
}

/**
 * Z-factor via Hall-Yarborough iteration applied to mixture pseudo-criticals
 * (AGA-8 simplified approach for pipeline-quality natural gas).
 *
 * @param P_MPa      Pressure (MPa)
 * @param T_K        Temperature (K)
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          Compressibility factor Z (dimensionless)
 */
export function aga8Z(
  P_MPa: number,
  T_K: number,
  yi: number[],
  components: string[]
): number {
  const { Tc_mix, Pc_mix } = aga8MixProps(yi, components);
  const Tpr = T_K / Tc_mix;
  const Ppr = P_MPa / Pc_mix;
  const t = 1.0 / Tpr;

  const A = 0.06125 * t * Math.exp(-1.2 * (1 - t) * (1 - t));

  // Hall-Yarborough: iterate on reduced density Y
  let Y = A * Ppr;
  if (Y <= 0 || Y >= 1) Y = 0.001;

  const B = 14.76 * t - 9.76 * t * t + 4.58 * t * t * t;
  const C = 90.7  * t - 242.2 * t * t + 42.4 * t * t * t;
  const d = 2.18 + 2.82 * t;

  const maxIter = 100;
  const tol = 1e-8;

  for (let i = 0; i < maxIter; i++) {
    const Y2 = Y * Y;
    const Y3 = Y2 * Y;
    const Y4 = Y3 * Y;
    const oY = 1 - Y;

    const f = -A * Ppr +
      (Y + Y2 + Y3 - Y4) / (oY * oY * oY) -
      B * Y2 +
      C * Math.pow(Y, d);

    const df =
      (1 + 4 * Y + 4 * Y2 - 4 * Y3 + Y4) / Math.pow(oY, 4) -
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

/**
 * Molar density using the real-gas equation of state: ρ = P / (Z·R·T).
 *
 * @param P_MPa      Pressure (MPa)
 * @param T_K        Temperature (K)
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          Molar density (mol/L)
 */
export function aga8Density(
  P_MPa: number,
  T_K: number,
  yi: number[],
  components: string[]
): number {
  const R = 0.008314472;  // MPa·L/(mol·K)
  const Z = aga8Z(P_MPa, T_K, yi, components);
  return P_MPa / (Z * R * T_K);
}

/**
 * Z-factor convenience wrapper accepting field units (psia, °F).
 *
 * @param P_psia     Pressure (psia)
 * @param T_degF     Temperature (°F)
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          Compressibility factor Z
 */
export function aga8CompressibilityFactor(
  P_psia: number,
  T_degF: number,
  yi: number[],
  components: string[]
): number {
  const P_MPa = P_psia * 0.0068947572932;   // psia → MPa
  const T_K   = (T_degF + 459.67) / 1.8;   // °F → K
  return aga8Z(P_MPa, T_K, yi, components);
}
