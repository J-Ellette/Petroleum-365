/**
 * P365 — Inflow Performance Relationship (IPR)
 *
 * Correlations for oil and gas well productivity:
 *   Darcy / Productivity Index, Vogel, Fetkovich, Klins-Clark Modified Vogel,
 *   Composite Darcy+Vogel, Gas Well Deliverability, Horizontal Well PI,
 *   Skin Damage Impact, and Flow Regime Comparison.
 *
 * Units: field (bbl/d, psia, md, ft, cp, res-bbl/STB).
 * Constants in equations use field-unit conversion factors.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const FU = 141.2;  // Field-unit constant for steady-state flow (md·ft·psia / [bbl/d·cp])

// ─── Productivity Index ───────────────────────────────────────────────────────

/**
 * Productivity Index from a measured rate and flowing pressure.
 *
 * PI = q / (Pr - Pwf)
 *
 * @param q    Producing rate (STB/d or Mscf/d)
 * @param Pr   Average reservoir pressure (psia)
 * @param Pwf  Flowing bottomhole pressure (psia)
 * @returns    PI (STB/d/psi or Mscf/d/psi)
 */
export function productivityIndex(q: number, Pr: number, Pwf: number): number {
  if (Pr <= Pwf) throw new Error("Pr must be greater than Pwf");
  return q / (Pr - Pwf);
}

/**
 * Rate from Darcy (linear) IPR given PI.
 *
 * @param PI   Productivity Index (STB/d/psi)
 * @param Pr   Average reservoir pressure (psia)
 * @param Pwf  Flowing bottomhole pressure (psia)
 * @returns    Production rate (STB/d)
 */
export function darcyRate(PI: number, Pr: number, Pwf: number): number {
  if (Pwf < 0) throw new Error("Pwf cannot be negative");
  return PI * (Pr - Pwf);
}

// ─── Pseudosteady-State (PSS) PI — Darcy Flow ────────────────────────────────

/**
 * Pseudosteady-state productivity index for a vertical well.
 *
 * J = kh / [141.2 · μ · Bo · (ln(re/rw) − 0.75 + S)]
 *
 * @param k   Permeability (md)
 * @param h   Net pay thickness (ft)
 * @param mu  Oil viscosity at reservoir conditions (cp)
 * @param Bo  Oil formation volume factor (res-bbl/STB)
 * @param re  Drainage radius (ft)
 * @param rw  Wellbore radius (ft)
 * @param S   Skin factor (dimensionless)
 * @returns   PI (STB/d/psi)
 */
export function pssProductivityIndex(
  k: number,
  h: number,
  mu: number,
  Bo: number,
  re: number,
  rw: number,
  S: number
): number {
  return (k * h) / (FU * mu * Bo * (Math.log(re / rw) - 0.75 + S));
}

/**
 * Steady-state productivity index for a vertical well.
 *
 * J = kh / [141.2 · μ · Bo · (ln(re/rw) + S)]
 *
 * @param k   Permeability (md)
 * @param h   Net pay thickness (ft)
 * @param mu  Oil viscosity at reservoir conditions (cp)
 * @param Bo  Oil formation volume factor (res-bbl/STB)
 * @param re  Drainage radius (ft)
 * @param rw  Wellbore radius (ft)
 * @param S   Skin factor (dimensionless)
 * @returns   PI (STB/d/psi)
 */
export function ssProductivityIndex(
  k: number,
  h: number,
  mu: number,
  Bo: number,
  re: number,
  rw: number,
  S: number
): number {
  return (k * h) / (FU * mu * Bo * (Math.log(re / rw) + S));
}

/**
 * Transient (infinite-acting) productivity index at time t.
 *
 * J(t) = kh / [141.2 · μ · Bo · (0.5 · ln(4kt / (φ·μ·ct·rw²·e^γ)) + S)]
 *
 * where e^γ = 1.7811 (γ = Euler-Mascheroni constant)
 *
 * @param k    Permeability (md)
 * @param h    Net pay thickness (ft)
 * @param mu   Oil viscosity (cp)
 * @param Bo   Oil FVF (res-bbl/STB)
 * @param phi  Porosity (fraction)
 * @param ct   Total compressibility (psi⁻¹)
 * @param rw   Wellbore radius (ft)
 * @param t    Time (hours)
 * @param S    Skin factor
 * @returns    PI (STB/d/psi)
 */
export function transientProductivityIndex(
  k: number,
  h: number,
  mu: number,
  Bo: number,
  phi: number,
  ct: number,
  rw: number,
  t: number,
  S: number
): number {
  // Convert t to consistent units (k in md, t in hours)
  const eulerConst = Math.exp(0.5772156649); // e^γ ≈ 1.7811
  const tD_rw = (0.000264 * k * t) / (phi * mu * ct * rw * rw);
  const logTerm = 0.5 * Math.log((4 * tD_rw) / eulerConst);
  return (k * h) / (FU * mu * Bo * (logTerm + S));
}

// ─── Vogel IPR ────────────────────────────────────────────────────────────────

/**
 * Vogel (1968) IPR for solution-gas-drive reservoirs.
 *
 * Q/Qmax = 1 − 0.2·(Pwf/Pr) − 0.8·(Pwf/Pr)²
 *
 * @param Pr   Average reservoir pressure (psia)
 * @param Qmax Maximum rate at Pwf = 0 (STB/d)
 * @param Pwf  Flowing bottomhole pressure (psia)
 * @returns    Rate at Pwf (STB/d)
 */
export function vogelRate(Pr: number, Qmax: number, Pwf: number): number {
  if (Pwf < 0 || Pwf > Pr) throw new Error("Pwf must be in [0, Pr]");
  const ratio = Pwf / Pr;
  return Qmax * (1 - 0.2 * ratio - 0.8 * ratio * ratio);
}

/**
 * Absolute Open Flow (AOF) potential from Vogel (Pwf = 0).
 *
 * @param Qmax Vogel Qmax (STB/d)
 * @returns    AOF = Qmax (STB/d)
 */
export function vogelAOF(Qmax: number): number {
  return Qmax;
}

/**
 * Estimate Vogel Qmax from one flowing test point (Pr, Pwf_test, q_test).
 *
 * @param Pr      Average reservoir pressure (psia)
 * @param Pwf     Test flowing BHP (psia)
 * @param q       Measured rate at Pwf (STB/d)
 * @returns       Qmax (STB/d)
 */
export function vogelQmax(Pr: number, Pwf: number, q: number): number {
  const ratio = Pwf / Pr;
  const factor = 1 - 0.2 * ratio - 0.8 * ratio * ratio;
  if (factor <= 0) throw new Error("Vogel factor non-positive; check inputs");
  return q / factor;
}

// ─── Composite IPR (Darcy above Pb, Vogel below Pb) ──────────────────────────

/**
 * Composite IPR rate at a given Pwf.
 *
 * Above bubble point (Pwf ≥ Pb): Darcy (linear) with PI = J.
 * Below bubble point (Pwf < Pb): Vogel correlation anchored at Pb.
 *
 * At Pb: Qb = J * (Pr - Pb).
 * Vogel Qmax = Qb / (1 − 0.2·(Pb/Pr) − 0.8·(Pb/Pr)²)
 *
 * @param Pr   Reservoir pressure (psia)
 * @param Pb   Bubble point pressure (psia)
 * @param J    Productivity index above Pb (STB/d/psi)
 * @param Pwf  Flowing BHP (psia)
 * @returns    Production rate (STB/d)
 */
export function compositeIPRRate(
  Pr: number,
  Pb: number,
  J: number,
  Pwf: number
): number {
  if (Pwf < 0) throw new Error("Pwf cannot be negative");

  const Qb = J * (Pr - Pb);   // Rate at bubble point

  if (Pwf >= Pb) {
    // Single-phase (above Pb): linear
    return J * (Pr - Pwf);
  }

  // Two-phase (below Pb): Vogel anchored at Pb
  const ratioPb = Pb / Pr;
  const vogelFactor_Pb = 1 - 0.2 * ratioPb - 0.8 * ratioPb * ratioPb;
  const Qmax = Qb / vogelFactor_Pb;
  const ratio = Pwf / Pr;
  return Qmax * (1 - 0.2 * ratio - 0.8 * ratio * ratio);
}

// ─── Fetkovich (Empirical Backpressure) IPR ───────────────────────────────────

/**
 * Fetkovich empirical backpressure IPR.
 *
 * Q = C · (Pr² − Pwf²)ⁿ
 *
 * @param C    Backpressure coefficient (STB/d/psia²ⁿ or Mscf/d/psia²ⁿ)
 * @param n    Deliverability exponent (0.5 ≤ n ≤ 1)
 * @param Pr   Reservoir pressure (psia)
 * @param Pwf  Flowing BHP (psia)
 * @returns    Rate (same units as C)
 */
export function fetkovichIPRRate(
  C: number,
  n: number,
  Pr: number,
  Pwf: number
): number {
  if (Pwf < 0 || Pwf > Pr) throw new Error("Pwf must be in [0, Pr]");
  return C * Math.pow(Pr * Pr - Pwf * Pwf, n);
}

/**
 * AOF from Fetkovich (Pwf = 0).
 *
 * @param C   Backpressure coefficient
 * @param n   Deliverability exponent
 * @param Pr  Reservoir pressure (psia)
 * @returns   AOF (rate at Pwf = 0)
 */
export function fetkovichAOF(C: number, n: number, Pr: number): number {
  return C * Math.pow(Pr * Pr, n);
}

// ─── Klins-Clark Modified Vogel IPR ──────────────────────────────────────────

/**
 * Klins-Clark (1993) modified Vogel IPR.
 *
 * Introduces a pressure-dependent exponent d:
 *   d = 0.28 − 0.0418 · (Pr/Pb)
 *
 * Q/Qmax = (1 + d) · (1 − Pwf/Pr) − d · (1 − Pwf/Pr)²
 *
 * @param Pr   Reservoir pressure (psia)
 * @param Pb   Bubble point pressure (psia)
 * @param Qmax Maximum rate (STB/d)
 * @param Pwf  Flowing BHP (psia)
 * @returns    Rate at Pwf (STB/d)
 */
export function klinsClarkeRate(
  Pr: number,
  Pb: number,
  Qmax: number,
  Pwf: number
): number {
  if (Pwf < 0 || Pwf > Pr) throw new Error("Pwf must be in [0, Pr]");
  const d = 0.28 - 0.0418 * (Pr / Pb);
  const x = 1 - Pwf / Pr;
  return Qmax * ((1 + d) * x - d * x * x);
}

// ─── Gas Well Deliverability ──────────────────────────────────────────────────

/**
 * Gas well Darcy deliverability (single-phase).
 *
 * Q = kh·(Pr² − Pwf²) / [1422 · μ · Z · T · (ln(re/rw) − 0.75 + S)]
 *
 * @param k    Permeability (md)
 * @param h    Net pay (ft)
 * @param mu   Gas viscosity (cp)
 * @param Z    Gas compressibility factor (dimensionless)
 * @param T    Temperature (°R = °F + 459.67)
 * @param Pr   Reservoir pressure (psia)
 * @param Pwf  Flowing BHP (psia)
 * @param re   Drainage radius (ft)
 * @param rw   Wellbore radius (ft)
 * @param S    Skin factor
 * @returns    Rate (Mscf/d)
 */
export function gasWellDarcyRate(
  k: number,
  h: number,
  mu: number,
  Z: number,
  T: number,
  Pr: number,
  Pwf: number,
  re: number,
  rw: number,
  S: number
): number {
  const deltaPsq = Pr * Pr - Pwf * Pwf;
  return (k * h * deltaPsq) / (1422 * mu * Z * T * (Math.log(re / rw) - 0.75 + S));
}

/**
 * Gas well non-Darcy deliverability (includes turbulence via D coefficient).
 *
 * The non-Darcy (turbulence) effect adds a term D·q to the drawdown.
 * Solves implicitly: q = kh·(Pr²−Pwf²) / [1422·μ·Z·T·(ln(re/rw)−0.75+S+D·q)]
 *
 * Uses a simple iterative solution.
 *
 * @param k    Permeability (md)
 * @param h    Net pay (ft)
 * @param mu   Gas viscosity (cp)
 * @param Z    Z-factor
 * @param T    Temperature (°R)
 * @param Pr   Reservoir pressure (psia)
 * @param Pwf  Flowing BHP (psia)
 * @param re   Drainage radius (ft)
 * @param rw   Wellbore radius (ft)
 * @param S    Darcy skin factor
 * @param D    Non-Darcy coefficient (d/Mscf)
 * @returns    Rate (Mscf/d)
 */
export function gasWellNonDarcyRate(
  k: number,
  h: number,
  mu: number,
  Z: number,
  T: number,
  Pr: number,
  Pwf: number,
  re: number,
  rw: number,
  S: number,
  D: number
): number {
  const deltaPsq = Pr * Pr - Pwf * Pwf;
  const denom0 = 1422 * mu * Z * T * (Math.log(re / rw) - 0.75 + S);
  let q = deltaPsq / (denom0 / (k * h));  // Darcy estimate as starting point

  for (let i = 0; i < 50; i++) {
    const qNew = (k * h * deltaPsq) / (1422 * mu * Z * T * (Math.log(re / rw) - 0.75 + S + D * q));
    if (Math.abs(qNew - q) < 1e-8 * q) break;
    q = 0.5 * q + 0.5 * qNew;  // Damped iteration
  }
  return q;
}

// ─── Horizontal Well PI (Joshi Correlation) ───────────────────────────────────

/**
 * Horizontal well productivity index using Joshi (1988) correlation.
 *
 * J = kH·h / [141.2·μ·Bo·(ln(a + √(a²−(L/2)²))/(L/2) + (h/(2·rw))·(h/L) + S)]
 *
 * where a = (L/2)·√(0.5 + √(0.25 + (2·reh/L)⁴))
 * and reh = equivalent drainage radius ≈ re (circle of same area)
 *
 * @param kH   Horizontal permeability (md)
 * @param h    Net pay (ft)
 * @param mu   Viscosity (cp)
 * @param Bo   FVF (res-bbl/STB)
 * @param rw   Wellbore radius (ft)
 * @param L    Horizontal well length (ft)
 * @param reh  Equivalent drainage radius (ft)
 * @param S    Skin factor
 * @returns    PI (STB/d/psi)
 */
export function horizontalWellPI_Joshi(
  kH: number,
  h: number,
  mu: number,
  Bo: number,
  rw: number,
  L: number,
  reh: number,
  S: number
): number {
  const halfL = L / 2;
  const a = halfL * Math.sqrt(0.5 + Math.sqrt(0.25 + Math.pow(2 * reh / L, 4)));
  const lnTerm = Math.log((a + Math.sqrt(a * a - halfL * halfL)) / halfL);
  const anisotropyTerm = (h / (2 * rw)) * (h / L);
  return (kH * h) / (FU * mu * Bo * (lnTerm + anisotropyTerm + S));
}

/**
 * Horizontal well productivity index using Renard-Dupuy (1991) correlation.
 *
 * J = kH·h / [141.2·μ·Bo·(cosh⁻¹(2reh/L) + (h/(2πL))·ln(h/(2πrw)) + S)]
 *
 * @param kH   Horizontal permeability (md)
 * @param h    Net pay (ft)
 * @param mu   Viscosity (cp)
 * @param Bo   FVF (res-bbl/STB)
 * @param rw   Wellbore radius (ft)
 * @param L    Horizontal well length (ft)
 * @param reh  Equivalent drainage radius (ft)
 * @param S    Skin factor
 * @returns    PI (STB/d/psi)
 */
export function horizontalWellPI_Renard(
  kH: number,
  h: number,
  mu: number,
  Bo: number,
  rw: number,
  L: number,
  reh: number,
  S: number
): number {
  const x = 2 * reh / L;
  const acoshX = Math.log(x + Math.sqrt(x * x - 1));
  const lnTerm = (h / (2 * Math.PI * L)) * Math.log(h / (2 * Math.PI * rw));
  return (kH * h) / (FU * mu * Bo * (acoshX + lnTerm + S));
}

// ─── Skin Damage ──────────────────────────────────────────────────────────────

/**
 * Ratio of damaged PI to ideal PI (S = 0) for a vertical well under PSS flow.
 *
 * J_damaged / J_ideal = (ln(re/rw) − 0.75) / (ln(re/rw) − 0.75 + S)
 *
 * @param re Drainage radius (ft)
 * @param rw Wellbore radius (ft)
 * @param S  Skin factor (positive = damage, negative = stimulation)
 * @returns  Ratio J_damaged/J_ideal (dimensionless)
 */
export function skinPIRatio(re: number, rw: number, S: number): number {
  const ln_re_rw = Math.log(re / rw);
  return (ln_re_rw - 0.75) / (ln_re_rw - 0.75 + S);
}

/**
 * Additional pressure drop due to skin (ΔPs).
 *
 * ΔPs = 141.2 · q · μ · Bo · S / (k · h)
 *
 * @param q   Rate (STB/d)
 * @param mu  Viscosity (cp)
 * @param Bo  FVF (res-bbl/STB)
 * @param k   Permeability (md)
 * @param h   Net pay (ft)
 * @param S   Skin factor
 * @returns   Pressure drop due to skin (psi)
 */
export function skinPressureDrop(
  q: number,
  mu: number,
  Bo: number,
  k: number,
  h: number,
  S: number
): number {
  return (FU * q * mu * Bo * S) / (k * h);
}
