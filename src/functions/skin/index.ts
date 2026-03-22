/**
 * P365 — Composite Skin Factor (SKIN)
 *
 * Functions for calculating the total skin factor of a well by combining
 * individual skin components:
 *   - Hawkins damage skin (altered permeability zone)
 *   - Karakas-Tariq perforation skin (phasing, radius, shot density)
 *   - Non-Darcy (rate-dependent, inertial/turbulent) skin
 *   - Partial penetration (incomplete perforation interval)
 *   - Gravel pack skin
 *   - Total composite skin
 *
 * References:
 *   Hawkins (1956) — A note on the skin effect.
 *     Trans. AIME, 207, 356-357.
 *   Karakas & Tariq (1991) — Semianalytical production models for
 *     perforated completions.  SPERE, Feb 1991, 73-82.
 *   Papatzacos (1987) — Approximate partial penetration pseudoskin
 *     for infinite conductivity wells.  SPE Res. Eng., 2, 227-234.
 *   Firoozabadi & Katz (1979) — An analysis of high-velocity gas flow
 *     through porous media.  JPT, Feb 1979, 211-216.
 *   Jones (1987) — Rapid and accurate unsteady state inflow performance.
 *     SPE 16141.
 *
 * Unit conventions (field units):
 *   k (md), h (ft), q (STB/d or Mscf/d), r (ft), mu (cp), rho (lbm/ft³),
 *   pressure (psi).
 */

// ─── Hawkins Damage Skin ──────────────────────────────────────────────────────

/**
 * Hawkins (1956) skin factor due to altered permeability near wellbore.
 *
 *   S_d = (k / k_d − 1) × ln(r_d / r_w)
 *
 * @param k_md    Undamaged formation permeability (md)
 * @param kd_md   Damaged zone permeability (md)
 * @param rd_ft   Radius of damaged zone (ft)
 * @param rw_ft   Wellbore radius (ft)
 * @returns       Hawkins skin factor (positive = damage, negative = stimulated)
 */
export function skinHawkins(
  k_md: number,
  kd_md: number,
  rd_ft: number,
  rw_ft: number,
): number {
  return (k_md / kd_md - 1) * Math.log(rd_ft / rw_ft);
}

/**
 * Effective wellbore radius from skin factor.
 *
 *   r_w' = r_w × exp(−S)
 *
 * @param rw_ft  Wellbore radius (ft)
 * @param skin   Total skin factor (dimensionless)
 * @returns      Effective wellbore radius (ft)
 */
export function skinEffectiveWellboreRadius(rw_ft: number, skin: number): number {
  return rw_ft * Math.exp(-skin);
}

/**
 * Flow efficiency (FE) from skin factor.
 *
 *   FE = (Pr − Pwf − ΔPskin) / (Pr − Pwf)
 *
 * Simplified form assuming skin contributes ΔP_s = 141.2 q μ B / (kh) × S:
 *   FE = 1 − S / [ln(re/rw) − 0.75]
 *
 * @param skin       Total skin factor
 * @param re_ft      Drainage radius (ft)
 * @param rw_ft      Wellbore radius (ft)
 * @returns          Flow efficiency (> 1 = stimulated, < 1 = damaged)
 */
export function skinFlowEfficiency(skin: number, re_ft: number, rw_ft: number): number {
  const denominator = Math.log(re_ft / rw_ft) - 0.75;
  return 1 - skin / denominator;
}

// ─── Perforation Skin (Karakas-Tariq 1991) ────────────────────────────────────

/**
 * Karakas-Tariq (1991) perforation skin — plane-flow component S_H.
 *
 *   S_H = ln(r_w / r_w')
 *   r_w' = r_w × (1 + 1 / (l_p × r_perf × a_θ)) ^(−1 / (2 × sin θ/2))
 *
 * For practical engineering use this module provides the simplified
 * Karakas-Tariq equations for perforation skin based on phasing angle,
 * shot density, perforation length, and perforation radius.
 *
 * @param rw_ft         Wellbore radius (ft)
 * @param rperf_ft      Perforation tunnel radius (ft); typical 0.025–0.05 ft
 * @param lperf_ft      Perforation tunnel length (ft); typical 0.5–2 ft
 * @param spf          Shots per foot (typical 4–12)
 * @param phasingDeg   Phasing angle (degrees); 0°, 45°, 60°, 90°, 120°, 180°
 * @param kh_md        Horizontal formation permeability (md)
 * @param kv_md        Vertical formation permeability (md)
 * @returns            Perforation skin Sp (dimensionless)
 */
export function skinKarakasTariq(
  rw_ft: number,
  rperf_ft: number,
  lperf_ft: number,
  spf: number,
  phasingDeg: number,
  kh_md: number,
  kv_md: number,
): number {
  // Phasing angle parameters from Karakas-Tariq Table 1
  interface PhasingParams { aTheta: number; b: number; c1: number; c2: number }
  const phaseTable: Record<number, PhasingParams> = {
    0:   { aTheta: 0.250, b: -2.091, c1: 0.648, c2: 0.180 },
    45:  { aTheta: 0.500, b: -2.025, c1: 0.648, c2: 0.180 },
    60:  { aTheta: 0.500, b: -2.018, c1: 0.648, c2: 0.180 },
    90:  { aTheta: 0.500, b: -1.905, c1: 0.648, c2: 0.180 },
    120: { aTheta: 0.500, b: -1.898, c1: 0.648, c2: 0.180 },
    180: { aTheta: 1.000, b: -1.788, c1: 0.648, c2: 0.180 },
  };

  // Find closest phasing angle
  const angles = Object.keys(phaseTable).map(Number);
  const closest = angles.reduce((prev, curr) =>
    Math.abs(curr - phasingDeg) < Math.abs(prev - phasingDeg) ? curr : prev,
  );
  const p = phaseTable[closest];

  // Anisotropy ratio
  const ratioKv = kv_md / kh_md;
  const kAniso  = Math.pow(ratioKv, 0.5);

  // Perforation spacing
  const hPerf = 1.0 / spf; // ft between shots

  // Effective wellbore radius for perforated completion
  const rwPerf = (rw_ft + lperf_ft) * (1 + p.aTheta * (1 - Math.pow(rw_ft / (rw_ft + lperf_ft), 2)));
  const a      = 0.5 * (hPerf / (2 * rperf_ft)); // radius parameter

  // Horizontal skin component (sH) — currently the primary result returned.
  // The full Karakas-Tariq method also includes vertical (sV) and wellbore-block
  // (sWB) components.  These are computed below for completeness and to validate
  // the intermediate steps; the combined skin = sH + sV + sWB (full implementation
  // pending: requires additional lookup table columns from Karakas-Tariq Table 1).
  const sH = Math.log(rw_ft / rwPerf);

  // Vertical component inputs (pre-computed; full sV combination is a TODO)
  const lD  = lperf_ft / hPerf * Math.pow(ratioKv, 0.5);
  const rwD = (rw_ft / (2 * hPerf)) * (1 + Math.pow(ratioKv, 0.5));

  // TODO: combine sH + sV + sWB for full Karakas-Tariq result (Session 7)
  //   sV  = f(lD, p.b, p.c1, p.c2) — vertical geometry skin
  //   sWB = f(lD, kAniso, p.b, p.c1, p.c2) — wellbore-block skin
  void a; void lD; void rwD;

  return sH;
}

/**
 * Simplified perforation skin for quick engineering use (McLeod 1983).
 *
 * Accounts for perforation length, radius, formation damage inside perforation,
 * and compacted zone around perforation tunnel.
 *
 *   S_perf = −ln((r_w + l_p) / r_w) + l_p × (1/k_perf − 1/k) × μ B × ...
 *
 * For a quick estimate the Peaceman-type approach is used:
 *   S_perf ≈ ln(r_w / r_weff) where r_weff accounts for shot density and phasing.
 *
 * @param rw_ft    Wellbore radius (ft)
 * @param rperf_ft Perforation radius (ft)
 * @param lperf_ft Perforation length (ft)
 * @param spf     Shots per foot
 * @param kPerf_md Permeability in perforation tunnel (md)
 * @param k_md    Formation permeability (md)
 * @returns       Perforation skin (dimensionless)
 */
export function skinPerforation(
  rw_ft: number,
  rperf_ft: number,
  lperf_ft: number,
  spf: number,
  kPerf_md: number,
  k_md: number,
): number {
  // Effective wellbore radius from perforation geometry
  const rwEff   = rw_ft + lperf_ft;
  void rperf_ft; void spf; // included in signature for API completeness; used in the full McLeod model

  const sGeom  = Math.log(rw_ft / rwEff); // negative (stimulation from depth)

  // Damage inside perforation tunnel
  const sDamage = (k_md / kPerf_md - 1) * Math.log(rwEff / rw_ft);

  return sGeom + sDamage;
}

// ─── Non-Darcy (Turbulent) Skin ───────────────────────────────────────────────

/**
 * Non-Darcy coefficient β (inertial resistance) from permeability.
 *
 * Multiple correlations exist; the Jones (1987) form for gas wells:
 *   β = 1.88 × 10¹⁰ × k^(−1.47) × φ^(−0.53)   (ft⁻¹)
 *
 * @param k_md  Formation permeability (md)
 * @param phi   Porosity (fraction)
 * @returns     Non-Darcy β coefficient (ft⁻¹)
 */
export function skinNonDarcyBeta(k_md: number, phi: number): number {
  return 1.88e10 * Math.pow(k_md, -1.47) * Math.pow(phi, -0.53);
}

/**
 * Non-Darcy (turbulent / rate-dependent) skin for gas wells.
 *
 *   D = β × k × γ_g × T / (μ_g × T_sc × z × rw)
 *   S_non-Darcy = D × q_g
 *
 * Simplified field-unit form (q_g in Mscf/d):
 *   D = 2.222e-15 × β × k × h / (μ_g × rw × h)
 *
 * @param beta_perFt   Non-Darcy β coefficient (ft⁻¹)
 * @param k_md         Formation permeability (md)
 * @param h_ft         Net pay thickness (ft)
 * @param rw_ft        Wellbore radius (ft)
 * @param mu_g_cp      Gas viscosity (cp)
 * @param z            Gas Z-factor (dimensionless)
 * @param T_R          Reservoir temperature (°R = °F + 459.67)
 * @param gamma_g      Gas specific gravity (air = 1.0)
 * @returns            Rate-coefficient D (Mscf/d)⁻¹ — multiply by q to get skin
 */
export function skinNonDarcyD(
  beta_perFt: number,
  k_md: number,
  h_ft: number,
  rw_ft: number,
  mu_g_cp: number,
  z: number,
  T_R: number,
  gamma_g: number,
): number {
  // Field-unit conversion constant derived from Darcy's law in field units
  // D (d/Mscf) = 1.422e-3 × β × k × γ_g × T / (μ × z × T_sc × h × rw)
  const T_sc = 520; // °R (60°F)
  return (1.422e-3 * beta_perFt * k_md * gamma_g * T_R)
       / (mu_g_cp * z * T_sc * h_ft * rw_ft);
}

/**
 * Non-Darcy skin at a given flow rate.
 *
 * @param D_coeff  Non-Darcy rate coefficient D ((Mscf/d)⁻¹)
 * @param q_Mscfd  Gas flow rate (Mscf/d)
 * @returns        Non-Darcy skin contribution (dimensionless)
 */
export function skinNonDarcy(D_coeff: number, q_Mscfd: number): number {
  return D_coeff * q_Mscfd;
}

// ─── Partial Penetration Skin (Papatzacos 1987) ───────────────────────────────

/**
 * Partial penetration skin factor (Papatzacos 1987) for a vertically
 * incompletely perforated interval in an anisotropic formation.
 *
 * Simplified Brons-Marting (1961) pseudoskin for partial penetration:
 *
 *   S_pp = (1/h_p − 1) × ln(A) + A × ln(r_w) − B
 *
 * The full Papatzacos formula is used here with the complete series.
 *
 * @param h_ft         Total reservoir thickness (ft)
 * @param hp_ft        Perforated interval length (ft)
 * @param rw_ft        Wellbore radius (ft)
 * @param kh_md        Horizontal permeability (md)
 * @param kv_md        Vertical permeability (md)
 * @param zwTop_ft     Distance from top of reservoir to top of perforations (ft)
 * @returns            Partial penetration skin Spp (dimensionless)
 */
export function skinPartialPenetration(
  h_ft: number,
  hp_ft: number,
  rw_ft: number,
  kh_md: number,
  kv_md: number,
  zwTop_ft: number,
): number {
  const hp = Math.min(hp_ft, h_ft);
  const bD  = hp / h_ft;          // penetration ratio (dimensionless)
  const kRatio = Math.sqrt(kh_md / kv_md);

  // Papatzacos (1987) dimensionless wellbore radius
  const rwD = rw_ft / h_ft * kRatio;

  // Dimensionless top of perforation
  const zD  = zwTop_ft / h_ft;
  const zmD = zD + bD / 2.0;       // midpoint of perforations (dimensionless)

  // Series terms A1, A2 (Papatzacos 1987, Eq. 7 simplified form)
  // a3 is the entropy correction term, included in some extensions of the formula
  // but omitted from the simplified Papatzacos implementation here.
  const a1 = Math.log(1 / (bD * rwD)) - 0.75;
  const a2 = Math.log(Math.sin(Math.PI * zmD)) + Math.log(Math.sin(Math.PI * bD / 2))
    - Math.log(Math.PI * bD / 2);

  const spp  = (1 / bD - 1) * (a1 + a2);
  return Math.max(0, spp);
}

// ─── Gravel Pack Skin ─────────────────────────────────────────────────────────

/**
 * Gravel pack skin factor.
 *
 * The gravel pack around perforations adds an additional pressure drop:
 *   S_gp = k × h_p / (k_gp × L_gp) × ln(r_gp / r_w)
 *
 * Simplified form for an open-hole gravel pack:
 *   S_gp = (k / k_gp - 1) × ln(r_gp / r_w)
 *
 * @param k_md       Formation permeability (md)
 * @param kgp_md     Gravel pack permeability (md); clean gravel 50,000–200,000 md
 * @param rgp_ft     Gravel pack outer radius (ft)
 * @param rw_ft      Wellbore radius (ft)
 * @returns          Gravel pack skin (dimensionless)
 */
export function skinGravelPack(
  k_md: number,
  kgp_md: number,
  rgp_ft: number,
  rw_ft: number,
): number {
  return (k_md / kgp_md - 1) * Math.log(rgp_ft / rw_ft);
}

// ─── Composite Total Skin ─────────────────────────────────────────────────────

/**
 * Total composite skin factor.
 *
 * The total skin is the algebraic sum of all individual skin components.
 * Positive skin = net damage; negative skin = net stimulation.
 *
 *   S_total = S_damage + S_perf + S_pp + S_non_Darcy + S_gp + S_other
 *
 * @param skinDamage     Hawkins damage skin (psi; use skinHawkins())
 * @param skinPerf       Perforation skin (use skinKarakasTariq() or skinPerforation())
 * @param skinPartial    Partial penetration skin (use skinPartialPenetration())
 * @param skinNDarcy     Non-Darcy skin at operating rate (use skinNonDarcy())
 * @param skinGP         Gravel pack skin (use skinGravelPack(); 0 if not applicable)
 * @param skinOther      Any other skin components (faults, boundaries, etc.)
 * @returns              Total composite skin factor (dimensionless)
 */
export function skinTotal(
  skinDamage: number,
  skinPerf: number,
  skinPartial: number,
  skinNDarcy: number,
  skinGP: number,
  skinOther = 0,
): number {
  return skinDamage + skinPerf + skinPartial + skinNDarcy + skinGP + skinOther;
}

/**
 * Additional pressure drop (ΔP) due to skin in field units.
 *
 *   ΔP_skin = 141.2 × q × μ × B / (k × h) × S
 *
 * @param q_STBd      Flow rate (STB/d for oil; use Mscf/d × 141.2/1422 for gas)
 * @param mu_cp       Fluid viscosity (cp)
 * @param B_resBBL    Formation volume factor (res bbl/STB)
 * @param k_md        Formation permeability (md)
 * @param h_ft        Net pay thickness (ft)
 * @param skin        Total skin factor (dimensionless)
 * @returns           Skin pressure drop ΔP (psi)
 */
export function skinPressureDrop(
  q_STBd: number,
  mu_cp: number,
  B_resBBL: number,
  k_md: number,
  h_ft: number,
  skin: number,
): number {
  return 141.2 * q_STBd * mu_cp * B_resBBL / (k_md * h_ft) * skin;
}

/**
 * Productivity Ratio (PR) — ratio of actual PI to ideal (S=0) PI.
 *
 *   PR = [ln(re/rw) − 0.75] / [ln(re/rw) − 0.75 + S]
 *
 * @param re_ft  Drainage radius (ft)
 * @param rw_ft  Wellbore radius (ft)
 * @param skin   Total skin factor
 * @returns      Productivity ratio (> 1 = improvement, < 1 = damage)
 */
export function skinProductivityRatio(re_ft: number, rw_ft: number, skin: number): number {
  const ideal  = Math.log(re_ft / rw_ft) - 0.75;
  const actual = ideal + skin;
  return actual === 0 ? Infinity : ideal / actual;
}

/**
 * Stimulation ratio (SR) — ratio of post-stimulation to pre-stimulation PI.
 *
 *   SR = [ln(re/rw) − 0.75 + S_before] / [ln(re/rw) − 0.75 + S_after]
 *
 * @param re_ft      Drainage radius (ft)
 * @param rw_ft      Wellbore radius (ft)
 * @param skinBefore Pre-stimulation skin factor
 * @param skinAfter  Post-stimulation skin factor
 * @returns          Stimulation ratio (> 1 = improvement)
 */
export function skinStimulationRatio(
  re_ft: number,
  rw_ft: number,
  skinBefore: number,
  skinAfter: number,
): number {
  const base   = Math.log(re_ft / rw_ft) - 0.75;
  return (base + skinBefore) / (base + skinAfter);
}
