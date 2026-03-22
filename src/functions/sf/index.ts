/**
 * P365 — Surface Facilities (SF)
 *
 * Choke sizing and gas pipeline flow calculations:
 *   Choke: Gilbert, Ros, Baxendell, Achong, Pilehvari correlations
 *   Gas pipeline: Panhandle A, Panhandle B, Weymouth (with gas flow additions)
 *   Compressor: polytropic power, interstage pressure
 *
 * Units: field (bbl/d, Mscf/d, psia, hp, °R, ft, in).
 */

// ─── Choke Correlations ────────────────────────────────────────────────────────

/**
 * Choke size coefficients for critical flow correlations.
 * Gilbert: q = C * GLR^n / (Pu * d^m)  — rearranged as d = (q * Pu / (C * GLR^n))^(1/m)
 * Standard critical-flow form: q_liq = C * (S^m) * (Pu / GLR^n)
 * where S = choke bean size in 64ths of an inch.
 */
const CHOKE_COEFFS: Record<string, { C: number; m: number; n: number }> = {
  gilbert:    { C: 10.00, m: 1.89, n: 0.546 },
  ros:        { C: 17.40, m: 2.00, n: 0.500 },
  baxendell:  { C: 9.56,  m: 1.93, n: 0.546 },
  achong:     { C: 3.82,  m: 1.88, n: 0.650 },
  pilehvari:  { C: 46.67, m: 1.90, n: 0.313 },
};

/**
 * Critical flow choke — liquid rate from bean size.
 *
 * General form (Gilbert et al.): q_liq = C · S^m / (Pu · R^n)
 * where S = choke bean size (64ths inch), R = GLR (scf/STB), Pu = upstream psia.
 *
 * @param S_64ths       Choke bean size in 64ths of an inch
 * @param Pu_psia       Upstream (wellhead) pressure (psia)
 * @param GLR           Gas-liquid ratio (scf/STB)
 * @param correlation   Correlation name: "gilbert"|"ros"|"baxendell"|"achong"|"pilehvari"
 * @returns             Liquid flow rate (bbl/d)
 */
export function chokeRate(
  S_64ths: number,
  Pu_psia: number,
  GLR: number,
  correlation: keyof typeof CHOKE_COEFFS = "gilbert"
): number {
  const { C, m, n } = CHOKE_COEFFS[correlation];
  if (GLR <= 0 || Pu_psia <= 0) throw new Error("Pu and GLR must be positive");
  return (C * Math.pow(S_64ths, m)) / (Pu_psia * Math.pow(GLR, n));
}

/**
 * Critical flow choke — required bean size for target liquid rate.
 *
 * @param q_liq_bpd    Target liquid rate (bbl/d)
 * @param Pu_psia      Upstream pressure (psia)
 * @param GLR          Gas-liquid ratio (scf/STB)
 * @param correlation  Correlation name
 * @returns            Required bean size (64ths inch)
 */
export function chokeBeanSize(
  q_liq_bpd: number,
  Pu_psia: number,
  GLR: number,
  correlation: keyof typeof CHOKE_COEFFS = "gilbert"
): number {
  const { C, m, n } = CHOKE_COEFFS[correlation];
  if (GLR <= 0 || Pu_psia <= 0) throw new Error("Pu and GLR must be positive");
  return Math.pow((q_liq_bpd * Pu_psia * Math.pow(GLR, n)) / C, 1 / m);
}

/**
 * Sub-critical choke — check if flow is critical (critical when Pd/Pu < 0.55 for gas).
 *
 * For gas: critical when Pd/Pu ≤ [2/(γ+1)]^(γ/(γ-1)) ≈ 0.528 for γ=1.4
 * For multiphase liquid-gas: empirical critical ratio ≈ 0.45–0.55
 *
 * @param Pu_psia      Upstream pressure (psia)
 * @param Pd_psia      Downstream pressure (psia)
 * @param gamma        Specific heat ratio (default 1.3 for natural gas)
 * @returns            true if critical (sonic) flow
 */
export function isCriticalFlow(Pu_psia: number, Pd_psia: number, gamma = 1.3): boolean {
  const critRatio = Math.pow(2 / (gamma + 1), gamma / (gamma - 1));
  return Pd_psia / Pu_psia <= critRatio;
}

/**
 * Compare choke rate predictions from all five correlations.
 *
 * @param S_64ths   Bean size (64ths inch)
 * @param Pu_psia   Upstream pressure (psia)
 * @param GLR       Gas-liquid ratio (scf/STB)
 * @returns         Object with rate (bbl/d) keyed by correlation name
 */
export function chokeAllCorrelations(
  S_64ths: number,
  Pu_psia: number,
  GLR: number
): Record<string, number> {
  const results: Record<string, number> = {};
  for (const corr of Object.keys(CHOKE_COEFFS)) {
    results[corr] = chokeRate(S_64ths, Pu_psia, GLR, corr as keyof typeof CHOKE_COEFFS);
  }
  return results;
}

// ─── Gas Pipeline Flow ─────────────────────────────────────────────────────────

/**
 * Panhandle A gas pipeline equation — flow rate.
 *
 * Q = 435.87 · E · (Tb/Pb) · [(P1² - P2²) / (SG^0.8539 · L · Tf · Z)]^0.5394 · D^2.6182
 *
 * @param P1_psia     Inlet pressure (psia)
 * @param P2_psia     Outlet pressure (psia)
 * @param D_in        Inside diameter (in)
 * @param L_miles     Pipe length (miles)
 * @param T_avg_R     Average gas temperature (°R)
 * @param SG          Gas specific gravity
 * @param Z_avg       Average Z-factor
 * @param E           Pipeline efficiency factor (0–1, typically 0.92)
 * @param Tb_R        Base temperature (°R), default 520
 * @param Pb_psia     Base pressure (psia), default 14.73
 * @returns           Gas flow rate (Mscf/d)
 */
export function panhandleA(
  P1_psia: number,
  P2_psia: number,
  D_in: number,
  L_miles: number,
  T_avg_R: number,
  SG: number,
  Z_avg: number,
  E = 0.92,
  Tb_R = 520,
  Pb_psia = 14.73
): number {
  if (P1_psia <= P2_psia) throw new Error("P1 must be greater than P2");
  const dP2 = P1_psia * P1_psia - P2_psia * P2_psia;
  const Q_scfd = 435.87 * E * (Tb_R / Pb_psia)
    * Math.pow(dP2 / (Math.pow(SG, 0.8539) * L_miles * T_avg_R * Z_avg), 0.5394)
    * Math.pow(D_in, 2.6182);
  return Q_scfd / 1000;  // Mscf/d
}

/**
 * Panhandle A — outlet pressure for given flow rate.
 *
 * @param Q_mscfd     Flow rate (Mscf/d)
 * @param P1_psia     Inlet pressure (psia)
 * @param D_in        Inside diameter (in)
 * @param L_miles     Pipe length (miles)
 * @param T_avg_R     Average temperature (°R)
 * @param SG          Gas SG
 * @param Z_avg       Average Z-factor
 * @param E           Efficiency factor
 * @returns           Outlet pressure (psia)
 */
export function panhandleAOutletP(
  Q_mscfd: number,
  P1_psia: number,
  D_in: number,
  L_miles: number,
  T_avg_R: number,
  SG: number,
  Z_avg: number,
  E = 0.92,
  Tb_R = 520,
  Pb_psia = 14.73
): number {
  const Q_scfd = Q_mscfd * 1000;
  // Solve for P2² from Panhandle A rearranged
  // Q = K * (dP²)^0.5394 => dP² = (Q/K)^(1/0.5394)
  const K = 435.87 * E * (Tb_R / Pb_psia)
    * Math.pow(1 / (Math.pow(SG, 0.8539) * L_miles * T_avg_R * Z_avg), 0.5394)
    * Math.pow(D_in, 2.6182);
  const dP2 = Math.pow(Q_scfd / K, 1 / 0.5394);
  const P2_sq = P1_psia * P1_psia - dP2;
  return Math.sqrt(Math.max(0, P2_sq));
}

/**
 * Panhandle B (Revised Panhandle) gas pipeline equation — flow rate.
 *
 * Q = 737.0 · E · (Tb/Pb) · [(P1² - P2²) / (SG^0.961 · L · Tf · Z)]^0.510 · D^2.530
 *
 * @param P1_psia     Inlet pressure (psia)
 * @param P2_psia     Outlet pressure (psia)
 * @param D_in        Inside diameter (in)
 * @param L_miles     Pipe length (miles)
 * @param T_avg_R     Average temperature (°R)
 * @param SG          Gas specific gravity
 * @param Z_avg       Average Z-factor
 * @param E           Efficiency (default 0.92)
 * @param Tb_R        Base temperature (°R)
 * @param Pb_psia     Base pressure (psia)
 * @returns           Gas flow rate (Mscf/d)
 */
export function panhandleB(
  P1_psia: number,
  P2_psia: number,
  D_in: number,
  L_miles: number,
  T_avg_R: number,
  SG: number,
  Z_avg: number,
  E = 0.92,
  Tb_R = 520,
  Pb_psia = 14.73
): number {
  if (P1_psia <= P2_psia) throw new Error("P1 must be greater than P2");
  const dP2 = P1_psia * P1_psia - P2_psia * P2_psia;
  const Q_scfd = 737.0 * E * (Tb_R / Pb_psia)
    * Math.pow(dP2 / (Math.pow(SG, 0.961) * L_miles * T_avg_R * Z_avg), 0.510)
    * Math.pow(D_in, 2.530);
  return Q_scfd / 1000;
}

/**
 * Panhandle B — outlet pressure for given flow rate.
 */
export function panhandleBOutletP(
  Q_mscfd: number,
  P1_psia: number,
  D_in: number,
  L_miles: number,
  T_avg_R: number,
  SG: number,
  Z_avg: number,
  E = 0.92,
  Tb_R = 520,
  Pb_psia = 14.73
): number {
  const Q_scfd = Q_mscfd * 1000;
  const K = 737.0 * E * (Tb_R / Pb_psia)
    * Math.pow(1 / (Math.pow(SG, 0.961) * L_miles * T_avg_R * Z_avg), 0.510)
    * Math.pow(D_in, 2.530);
  const dP2 = Math.pow(Q_scfd / K, 1 / 0.510);
  return Math.sqrt(Math.max(0, P1_psia * P1_psia - dP2));
}

/**
 * Compare gas pipeline flow rates from Weymouth, Panhandle A, and Panhandle B.
 *
 * @param P1_psia     Inlet pressure (psia)
 * @param P2_psia     Outlet pressure (psia)
 * @param D_in        Inside diameter (in)
 * @param L_miles     Pipe length (miles)
 * @param T_avg_R     Average temperature (°R)
 * @param SG          Gas specific gravity
 * @param Z_avg       Average Z-factor
 * @param E           Efficiency factor
 * @returns           Object with Mscf/d from each correlation
 */
export function gasPipelineComparison(
  P1_psia: number,
  P2_psia: number,
  D_in: number,
  L_miles: number,
  T_avg_R: number,
  SG: number,
  Z_avg: number,
  E = 0.92
): { panhandleA: number; panhandleB: number } {
  return {
    panhandleA: panhandleA(P1_psia, P2_psia, D_in, L_miles, T_avg_R, SG, Z_avg, E),
    panhandleB: panhandleB(P1_psia, P2_psia, D_in, L_miles, T_avg_R, SG, Z_avg, E),
  };
}

// ─── Compressor Functions ──────────────────────────────────────────────────────

/**
 * Polytropic compressor horsepower.
 *
 * HP = (Q * T1 * Z_avg) / (229.2 * Ep) * (k/(k-1)) * [(P2/P1)^((k-1)/k) - 1]
 *
 * where 229.2 is the field-unit constant for Mscf/d, °R, psia → HP.
 *
 * @param Q_mscfd    Gas flow rate (Mscf/d)
 * @param P1_psia    Suction pressure (psia)
 * @param P2_psia    Discharge pressure (psia)
 * @param T1_R       Suction temperature (°R)
 * @param k          Specific heat ratio Cp/Cv (default 1.3 for natural gas)
 * @param Z_avg      Average compressibility factor
 * @param Ep         Polytropic efficiency (default 0.85)
 * @returns          Compressor power (hp)
 */
export function compressorPower(
  Q_mscfd: number,
  P1_psia: number,
  P2_psia: number,
  T1_R: number,
  k = 1.3,
  Z_avg = 0.95,
  Ep = 0.85
): number {
  if (P2_psia <= P1_psia) throw new Error("P2 must be greater than P1");
  const r = P2_psia / P1_psia;
  const exp = (k - 1) / k;
  const HP = (Q_mscfd * T1_R * Z_avg) / (229.2 * Ep) * (k / (k - 1)) * (Math.pow(r, exp) - 1);
  return HP;
}

/**
 * Interstage pressure for equal-ratio multi-stage compression.
 *
 * For n stages: P_stage = P1 * (P_final/P1)^(stage/n)
 *
 * @param P1_psia     Suction pressure (psia)
 * @param Pfinal_psia Final discharge pressure (psia)
 * @param n_stages    Number of compression stages
 * @returns           Array of stage outlet pressures (psia)
 */
export function interstageCompression(
  P1_psia: number,
  Pfinal_psia: number,
  n_stages: number
): number[] {
  const ratio = Pfinal_psia / P1_psia;
  const r_stage = Math.pow(ratio, 1 / n_stages);
  return Array.from({ length: n_stages }, (_, i) => P1_psia * Math.pow(r_stage, i + 1));
}

/**
 * Discharge temperature after adiabatic compression.
 *
 * T2 = T1 * (P2/P1)^((k-1)/k)  [ideal adiabatic]
 * Actual: T2 = T1 + (T2_ideal - T1) / Ep
 *
 * @param T1_R      Suction temperature (°R)
 * @param P1_psia   Suction pressure (psia)
 * @param P2_psia   Discharge pressure (psia)
 * @param k         Cp/Cv ratio
 * @param Ep        Isentropic efficiency (default 0.80)
 * @returns         Discharge temperature (°R)
 */
export function compressorDischargeTemp(
  T1_R: number,
  P1_psia: number,
  P2_psia: number,
  k = 1.3,
  Ep = 0.80
): number {
  const r = P2_psia / P1_psia;
  const T2_ideal = T1_R * Math.pow(r, (k - 1) / k);
  return T1_R + (T2_ideal - T1_R) / Ep;
}
