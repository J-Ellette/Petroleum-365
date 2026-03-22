/**
 * P365 — Material Balance Equation (MBE)
 *
 * Functions for gas and oil reservoir material balance analysis:
 *   Gas p/Z analysis (OGIP), gas reservoir pressure forecast,
 *   oil expansion terms, underground withdrawal (F),
 *   Havlena-Odeh straight-line method, drive mechanism indices,
 *   effective compressibility, Fetkovich aquifer model,
 *   geopressured gas reservoir modified p/Z analysis.
 *
 * Units: field (psia, °F, STB, Mscf, res-bbl).
 */

// ─── Gas Reservoir p/Z Analysis ───────────────────────────────────────────────

/**
 * Compute p/Z ratio for a gas reservoir at a given pressure.
 *
 * @param p  Pressure (psia)
 * @param Z  Gas compressibility factor at p (dimensionless)
 * @returns  p/Z (psia)
 */
export function gasPZ(p: number, Z: number): number {
  if (Z <= 0) throw new Error("Z must be positive");
  return p / Z;
}

/**
 * Estimate Original Gas In Place (OGIP) from two p/Z − Gp data points.
 *
 * The p/Z vs Gp plot is linear for a volumetric gas reservoir:
 *   p/Z = (pi/Zi) · (1 − Gp/G)
 *
 * Solving for G (x-intercept):
 *   G = pi/Zi / [(pi/Zi − p2/Z2) / Gp2]
 *
 * @param pi   Initial reservoir pressure (psia)
 * @param Zi   Initial Z-factor
 * @param p2   Current pressure (psia)
 * @param Z2   Current Z-factor
 * @param Gp2  Cumulative gas produced at current pressure (Mscf or Bscf)
 * @returns    OGIP, G (same units as Gp2)
 */
export function ogipFromTwoPoints(
  pi: number,
  Zi: number,
  p2: number,
  Z2: number,
  Gp2: number
): number {
  const pz_i = pi / Zi;
  const pz_2 = p2 / Z2;
  if (pz_i <= pz_2) throw new Error("p/Z must decrease with production");
  return pz_i * Gp2 / (pz_i - pz_2);
}

/**
 * Estimate OGIP from multiple p/Z − Gp data points via linear regression.
 *
 * Fits p/Z = a − b·Gp using least-squares. OGIP = a/b (x-intercept).
 *
 * @param p_arr   Array of pressures (psia)
 * @param Z_arr   Array of Z-factors (parallel to p_arr)
 * @param Gp_arr  Array of cumulative gas produced (same units, parallel to p_arr)
 * @returns       [OGIP, pi/Zi_intercept, slope] (same units as Gp_arr)
 */
export function ogipFromRegression(
  p_arr: number[],
  Z_arr: number[],
  Gp_arr: number[]
): [number, number, number] {
  const n = p_arr.length;
  if (n < 2 || n !== Z_arr.length || n !== Gp_arr.length) {
    throw new Error("Arrays must have equal length ≥ 2");
  }
  const pz = p_arr.map((p, i) => p / Z_arr[i]);
  const x = Gp_arr;
  const y = pz;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += x[i];
    sumY  += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const OGIP = -intercept / slope;  // x-intercept (slope is negative)
  return [OGIP, intercept, slope];
}

/**
 * Gas reservoir pressure forecast at cumulative production Gp.
 *
 * From p/Z = (pi/Zi) · (1 − Gp/G), solved numerically for p given Z(p).
 * This version uses a supplied Z-factor for the target pressure.
 *
 * @param G    OGIP (same units as Gp)
 * @param pi   Initial pressure (psia)
 * @param Zi   Initial Z-factor
 * @param Gp   Cumulative gas produced (same units as G)
 * @param Z    Z-factor at the target pressure (estimate; use iterative approach outside)
 * @returns    Reservoir pressure p (psia)
 */
export function gasPressureAtGp(
  G: number,
  pi: number,
  Zi: number,
  Gp: number,
  Z: number
): number {
  // p = (pi/Zi) * (1 - Gp/G) * Z
  const pz_i = pi / Zi;
  return pz_i * (1 - Gp / G) * Z;
}

// ─── Oil MBE Expansion Terms ──────────────────────────────────────────────────

/**
 * Oil and dissolved-gas expansion term (Eo) for the material balance equation.
 *
 * Eo = (Bo − Boi) + (Rsi − Rs) · Bg
 *
 * @param Bo   Oil FVF at current pressure (res-bbl/STB)
 * @param Boi  Oil FVF at initial pressure (res-bbl/STB)
 * @param Rs   Solution GOR at current pressure (scf/STB)
 * @param Rsi  Solution GOR at initial pressure (scf/STB)
 * @param Bg   Gas FVF at current pressure (res-bbl/scf)
 * @returns    Eo (res-bbl/STB)
 */
export function oilExpansionEo(
  Bo: number,
  Boi: number,
  Rs: number,
  Rsi: number,
  Bg: number
): number {
  return (Bo - Boi) + (Rsi - Rs) * Bg;
}

/**
 * Gas-cap expansion term (Eg) for the material balance equation.
 *
 * Eg = Boi · (Bg/Bgi − 1)
 *
 * @param Boi  Initial oil FVF (res-bbl/STB)
 * @param Bg   Current gas FVF (res-bbl/scf)
 * @param Bgi  Initial gas FVF (res-bbl/scf)
 * @returns    Eg (res-bbl/STB)
 */
export function gasCapExpansionEg(
  Boi: number,
  Bg: number,
  Bgi: number
): number {
  return Boi * (Bg / Bgi - 1);
}

/**
 * Connate water and rock compressibility expansion term (Efw).
 *
 * Efw = Boi · (1 + m) · (Swi · cw + cf) · ΔP / (1 − Swi)
 *
 * @param Boi  Initial oil FVF (res-bbl/STB)
 * @param m    Initial gas cap ratio (m = Gi/Ni where Gi and Ni are in res-bbl)
 * @param Swi  Initial water saturation (fraction)
 * @param cw   Water compressibility (psi⁻¹)
 * @param cf   Formation compressibility (psi⁻¹)
 * @param dP   Pressure drop (pi − p) (psi)
 * @returns    Efw (res-bbl/STB)
 */
export function fwExpansionEfw(
  Boi: number,
  m: number,
  Swi: number,
  cw: number,
  cf: number,
  dP: number
): number {
  return Boi * (1 + m) * (Swi * cw + cf) * dP / (1 - Swi);
}

// ─── Underground Withdrawal (F) ───────────────────────────────────────────────

/**
 * Underground withdrawal (reservoir voidage) term F.
 *
 * F = Np · [Bo + (Rp − Rs) · Bg] + Wp · Bw
 *
 * @param Np   Cumulative oil produced (STB)
 * @param Bo   Oil FVF at current pressure (res-bbl/STB)
 * @param Rp   Producing GOR (scf/STB)
 * @param Rs   Solution GOR at current pressure (scf/STB)
 * @param Bg   Gas FVF at current pressure (res-bbl/scf)
 * @param Wp   Cumulative water produced (STB)
 * @param Bw   Water FVF (res-bbl/STB)
 * @returns    F (res-bbl)
 */
export function undergroundWithdrawal(
  Np: number,
  Bo: number,
  Rp: number,
  Rs: number,
  Bg: number,
  Wp: number,
  Bw: number
): number {
  return Np * (Bo + (Rp - Rs) * Bg) + Wp * Bw;
}

// ─── Havlena-Odeh Straight-Line Method ───────────────────────────────────────

/**
 * Estimate OOIP (N) and gas-cap size (mN) using the Havlena-Odeh method.
 *
 * Plots F/Eo vs Eg/Eo — this should be a straight line:
 *   F/Eo = N + (m·N) · (Eg/Eo)
 * Intercept = N (OOIP), slope = m·N.
 *
 * @param F_arr   Array of underground withdrawal values (res-bbl)
 * @param Eo_arr  Array of oil expansion terms (res-bbl/STB)
 * @param Eg_arr  Array of gas-cap expansion terms (res-bbl/STB)
 * @returns       [N_STB, mN_STB, R²] — OOIP, gas-cap volume, regression quality
 */
export function havlenaOdeh(
  F_arr: number[],
  Eo_arr: number[],
  Eg_arr: number[]
): [number, number, number] {
  const n = F_arr.length;
  if (n < 2 || n !== Eo_arr.length || n !== Eg_arr.length) {
    throw new Error("Arrays must have equal length ≥ 2");
  }

  // y = F/Eo, x = Eg/Eo
  const x = Eg_arr.map((eg, i) => eg / Eo_arr[i]);
  const y = F_arr.map((f, i) => f / Eo_arr[i]);

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += x[i];
    sumY  += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * x[i];
    ssTot += (y[i] - yMean) ** 2;
    ssRes += (y[i] - yHat) ** 2;
  }
  const Rsq = 1 - ssRes / ssTot;

  return [intercept, slope, Rsq];   // [N, mN, R²]
}

// ─── Drive Mechanism Indices ──────────────────────────────────────────────────

/**
 * Solution-gas drive index.
 *
 * Ido = N · Eo / F
 *
 * @param N   OOIP (STB)
 * @param Eo  Oil expansion term (res-bbl/STB)
 * @param F   Underground withdrawal (res-bbl)
 * @returns   Solution-gas drive index (fraction, sums to 1 with other indices)
 */
export function solutionGasDriveIndex(N: number, Eo: number, F: number): number {
  return (N * Eo) / F;
}

/**
 * Gas-cap drive index.
 *
 * Idg = N · m · Eg / F
 *
 * @param N   OOIP (STB)
 * @param m   Gas-cap ratio
 * @param Eg  Gas-cap expansion term (res-bbl/STB)
 * @param F   Underground withdrawal (res-bbl)
 * @returns   Gas-cap drive index (fraction)
 */
export function gasCapDriveIndex(
  N: number,
  m: number,
  Eg: number,
  F: number
): number {
  return (N * m * Eg) / F;
}

/**
 * Water drive index.
 *
 * Idw = (We − Wp·Bw) / F
 *
 * @param We  Cumulative water influx (res-bbl)
 * @param Wp  Cumulative water produced (STB)
 * @param Bw  Water FVF (res-bbl/STB)
 * @param F   Underground withdrawal (res-bbl)
 * @returns   Water drive index (fraction)
 */
export function waterDriveIndex(
  We: number,
  Wp: number,
  Bw: number,
  F: number
): number {
  return (We - Wp * Bw) / F;
}

/**
 * Compressibility drive index (connate water + rock).
 *
 * Idc = N · Efw / F
 *
 * @param N    OOIP (STB)
 * @param Efw  Formation/water expansion term (res-bbl/STB)
 * @param F    Underground withdrawal (res-bbl)
 * @returns    Compressibility drive index (fraction)
 */
export function compressibilityDriveIndex(
  N: number,
  Efw: number,
  F: number
): number {
  return (N * Efw) / F;
}

// ─── Effective Compressibility ────────────────────────────────────────────────

/**
 * Effective (total) reservoir compressibility for a two-phase system.
 *
 * ct = So · co + Sw · cw + cf
 *
 * where So = 1 − Sw − Sg (oil saturation)
 *
 * @param Sw   Water saturation (fraction)
 * @param Sg   Gas saturation (fraction)
 * @param co   Oil compressibility (psi⁻¹)
 * @param cw   Water compressibility (psi⁻¹)
 * @param cf   Formation (rock) compressibility (psi⁻¹)
 * @returns    ct (psi⁻¹)
 */
export function effectiveCompressibility(
  Sw: number,
  Sg: number,
  co: number,
  cw: number,
  cf: number
): number {
  const So = 1 - Sw - Sg;
  return So * co + Sw * cw + cf;
}

// ─── Fetkovich Aquifer Model ──────────────────────────────────────────────────

/**
 * Fetkovich pseudo-steady-state aquifer model — maximum encroachable water.
 *
 * Wei = ct · Wi · Pi
 *
 * where Wi = aquifer pore volume (bbl).
 * Often approximated as Wei = (aquifer volume ratio) × Vp_reservoir × ct × Pi
 *
 * @param ct  Total aquifer compressibility (psi⁻¹)
 * @param Wi  Aquifer initial pore volume (bbl)
 * @param Pi  Initial pressure (psia)
 * @returns   Wei, maximum encroachable water (bbl)
 */
export function fetkovichWei(ct: number, Wi: number, Pi: number): number {
  return ct * Wi * Pi;
}

/**
 * Fetkovich aquifer productivity index.
 *
 * J = (2π k h) / [141.2 · μ · ln(ra/re)]
 *
 * @param k   Aquifer permeability (md)
 * @param h   Aquifer thickness (ft)
 * @param mu  Water viscosity (cp)
 * @param ra  Outer radius of aquifer (ft)
 * @param re  Inner radius (reservoir outer boundary) (ft)
 * @returns   J (bbl/d/psia)
 */
export function fetkovichAquiferJ(
  k: number,
  h: number,
  mu: number,
  ra: number,
  re: number
): number {
  return (2 * Math.PI * k * h) / (141.2 * mu * Math.log(ra / re));
}

/**
 * Fetkovich cumulative water influx at the end of a pressure-time step.
 *
 * ΔWe = (J · Wei / Pi) · (P_avg − P_res) · (1 − exp(−J·Pi·Δt/Wei))
 *
 * This is the stepwise form for finite time steps.
 *
 * @param J     Aquifer productivity index (bbl/d/psia)
 * @param Wei   Maximum encroachable water (bbl)
 * @param Pi    Initial aquifer pressure (psia)
 * @param P_aq  Average aquifer pressure at start of step (psia)
 * @param P_res Reservoir pressure at outer boundary during step (psia)
 * @param dt    Time step (days)
 * @returns     Cumulative influx during step (bbl)
 */
export function fetkovichWaterInfluxStep(
  J: number,
  Wei: number,
  Pi: number,
  P_aq: number,
  P_res: number,
  dt: number
): number {
  const alpha = J * Pi / Wei;
  return (J / alpha) * (P_aq - P_res) * (1 - Math.exp(-alpha * dt));
}

// ─── Geopressured Gas Reservoir (Modified p/Z) ───────────────────────────────

/**
 * Modified p/Z for geopressured (abnormally pressured) gas reservoirs.
 *
 * Standard p/Z overestimates OGIP because it ignores formation and water
 * compressibility. The modified p/Z corrects for these effects:
 *
 *   (p/Z)_mod = (p/Z) · (1 − ce·(Pi−p))
 *
 * where ce = effective pore-volume compressibility:
 *   ce = (cf + Swi·cw) / (1 − Swi)
 *
 * @param p    Current pressure (psia)
 * @param Z    Current Z-factor
 * @param Pi   Initial pressure (psia)
 * @param cf   Formation compressibility (psi⁻¹)
 * @param cw   Water compressibility (psi⁻¹)
 * @param Swi  Initial water saturation (fraction)
 * @returns    Modified p/Z (psia)
 */
export function geopressuredModifiedPZ(
  p: number,
  Z: number,
  Pi: number,
  cf: number,
  cw: number,
  Swi: number
): number {
  const ce = (cf + Swi * cw) / (1 - Swi);
  return (p / Z) * (1 - ce * (Pi - p));
}

/**
 * OGIP from geopressured (modified p/Z) analysis — two-point method.
 *
 * @param Pi   Initial pressure (psia)
 * @param Zi   Initial Z-factor
 * @param p2   Current pressure (psia)
 * @param Z2   Current Z-factor
 * @param Gp2  Cumulative gas produced (Mscf or Bscf)
 * @param cf   Formation compressibility (psi⁻¹)
 * @param cw   Water compressibility (psi⁻¹)
 * @param Swi  Initial water saturation (fraction)
 * @returns    OGIP (same units as Gp2)
 */
export function geopressuredOGIP(
  Pi: number,
  Zi: number,
  p2: number,
  Z2: number,
  Gp2: number,
  cf: number,
  cw: number,
  Swi: number
): number {
  const pzMod_i = geopressuredModifiedPZ(Pi, Zi, Pi, cf, cw, Swi);
  const pzMod_2 = geopressuredModifiedPZ(p2, Z2, Pi, cf, cw, Swi);
  if (pzMod_i <= pzMod_2) {
    throw new Error("Modified p/Z must decrease with production");
  }
  return pzMod_i * Gp2 / (pzMod_i - pzMod_2);
}
