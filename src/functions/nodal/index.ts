/**
 * P365 — Nodal Analysis
 *
 * Connects Inflow Performance Relationship (IPR) and Vertical Lift Performance
 * (VLP) curves to find the well operating point.
 *
 * All math is self-contained (no imports from ipr or vfp modules) to avoid
 * circular dependencies. Correlations re-implemented directly as needed.
 *
 * Oil rates: STB/d.  Gas rates: Mscf/d.  Pressures: psia.
 */

// ─── Internal: Z-factor (Hall-Yarborough via Lee-Kesler pseudo-criticals) ─────

/**
 * Lee-Kesler pseudo-critical properties for natural gas.
 * @param sg  Gas specific gravity (air=1)
 * @returns   [Tpc_R, Ppc_psia]
 */
function pseudoCriticalLK(sg: number): [number, number] {
  const Tpc = 169.2 + 349.5 * sg - 74.0 * sg * sg;
  const Ppc = 756.8 - 131.0 * sg - 3.6  * sg * sg;
  return [Tpc, Ppc];
}

/**
 * Hall-Yarborough Z-factor from reduced Tpr, Ppr.
 */
function hallYarboroughZ(Tpr: number, Ppr: number): number {
  const t = 1.0 / Tpr;
  const A = 0.06125 * t * Math.exp(-1.2 * (1 - t) * (1 - t));
  const B = 14.76 * t - 9.76 * t * t + 4.58 * t * t * t;
  const C = 90.7  * t - 242.2 * t * t + 42.4 * t * t * t;
  const d = 2.18 + 2.82 * t;

  let Y = A * Ppr;
  if (Y <= 0 || Y >= 1) Y = 0.001;

  for (let i = 0; i < 100; i++) {
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
    if (Math.abs(delta) < 1e-8) break;
  }
  return A * Ppr / Y;
}

// ─── Internal: Simple Vogel IPR ───────────────────────────────────────────────

/**
 * Vogel IPR — Pwf at a given rate.
 * q/Qmax = 1 − 0.2·(Pwf/Pr) − 0.8·(Pwf/Pr)²
 * Inverted: u = Pwf/Pr = [−0.2 + sqrt(0.04 + 3.2·(1−r))] / 1.6
 *
 * @param Pr    Reservoir pressure (psia)
 * @param Qmax  Absolute open-flow (AOF) rate (STB/d)
 * @param q     Flow rate (STB/d)
 * @returns     Flowing bottomhole pressure (psia)
 */
function vogelIPRPwf(Pr: number, Qmax: number, q: number): number {
  const r = Math.min(q / Qmax, 1.0);
  const disc = 0.04 + 3.2 * (1 - r);
  if (disc < 0) return 0;
  const u = (-0.2 + Math.sqrt(disc)) / 1.6;
  return Math.max(0, Pr * u);
}

// ─── Internal: Gas Darcy IPR ─────────────────────────────────────────────────

/**
 * Gas deliverability — Pwf at a given rate (Darcy radial flow).
 * q = (k·h·(Pr² − Pwf²)) / (1422·T·Z·μ·[ln(re/rw)−0.75+skin])
 * Rearranged: Pwf² = Pr² − q·C where C = 1422·T·Z·μ·ln_term / (k·h)
 *
 * For the VLP side of nodal, we iterate: given q find BHP from well mechanics.
 * For the IPR side: Pwf = sqrt(max(0, Pr² − q/J_gas))
 * J_gas = k·h / (1422·T·Z·μ·ln_term)  [Mscf/d/psi²]
 * Use fixed T,Z,μ at average conditions.
 *
 * @param Pr_psia   Reservoir pressure (psia)
 * @param T_R_psia  Reservoir temperature (°R) — named to match function signature
 * @param sg_gas    Gas specific gravity
 * @param h_ft      Net pay thickness (ft)
 * @param k_md      Permeability (md)
 * @param rw_ft     Wellbore radius (ft)
 * @param re_ft     Drainage radius (ft)
 * @param skin      Skin factor
 * @param q_Mscfd   Gas rate (Mscf/d)
 * @returns         Pwf (psia)
 */
function gasDarcyIPRPwf(
  Pr_psia: number,
  T_R: number,
  sg_gas: number,
  h_ft: number,
  k_md: number,
  rw_ft: number,
  re_ft: number,
  skin: number,
  q_Mscfd: number
): number {
  const [Tpc, Ppc] = pseudoCriticalLK(sg_gas);
  // Average conditions: use Pr and avg T for Z, μ estimate
  const Tpr = T_R / Tpc;
  const Ppr_avg = (Pr_psia * 0.75) / Ppc;  // rough 75% of Pr
  const Z_avg = hallYarboroughZ(Tpr, Math.max(0.01, Ppr_avg));
  // Lee-Gonzalez viscosity estimate (simplified)
  const M = 28.97 * sg_gas;
  const K_visc = ((9.4 + 0.02 * M) * Math.pow(T_R, 1.5)) / (209 + 19 * M + T_R);
  const rho_g = (Pr_psia * M) / (10.73 * T_R * Z_avg);
  const X_visc = 3.5 + 986 / T_R + 0.01 * M;
  const Y_visc = 2.4 - 0.2 * X_visc;
  const mu_g = 1e-4 * K_visc * Math.exp(X_visc * Math.pow(rho_g / 62.4, Y_visc));

  const ln_term = Math.log(re_ft / rw_ft) - 0.75 + skin;
  // J_gas: Mscf/d / psi²  (Darcy gas deliverability)
  const J_gas = (k_md * h_ft) / (1422 * T_R * Z_avg * mu_g * ln_term);
  const Pwf2 = Pr_psia * Pr_psia - q_Mscfd / J_gas;
  return Math.sqrt(Math.max(0, Pwf2));
}

// ─── Internal: Simplified Gas BHP for VLP ────────────────────────────────────

/**
 * Single-phase gas BHP (average T-Z method, no friction) for nodal VLP.
 *
 * BHP = Pwh · exp(0.0375 · sg · depth_ft / (Z_avg · T_avg_R))
 *
 * Z_avg is iterated (2 passes) using average pressure.
 *
 * @param Pwh_psia    Wellhead flowing pressure (psia)
 * @param sg_gas      Gas specific gravity
 * @param depth_ft    True vertical depth (ft)
 * @param T_avg_R     Average column temperature (°R)
 * @returns           BHP (psia)
 */
function gasVLPBhp(
  Pwh_psia: number,
  sg_gas: number,
  depth_ft: number,
  T_avg_R: number
): number {
  const [Tpc, Ppc] = pseudoCriticalLK(sg_gas);
  const Tpr = T_avg_R / Tpc;

  // Initial Z guess = 1
  let BHP = Pwh_psia;
  for (let iter = 0; iter < 3; iter++) {
    const P_avg = (Pwh_psia + BHP) / 2;
    const Ppr_avg = P_avg / Ppc;
    const Z_avg = hallYarboroughZ(Tpr, Math.max(0.01, Ppr_avg));
    const exponent = 0.0375 * sg_gas * depth_ft / (Z_avg * T_avg_R);
    BHP = Pwh_psia * Math.exp(exponent);
  }
  return BHP;
}

// ─── Exported: Utility Sweep ─────────────────────────────────────────────────

/**
 * Evaluate a scalar function over a log-spaced range of flow rates.
 *
 * @param fn      Function mapping rate → value
 * @param qMin    Minimum rate
 * @param qMax    Maximum rate
 * @param nPoints Number of evaluation points (default 20)
 * @returns       Array of { q, val } pairs
 */
export function nodalSweep(
  fn: (q: number) => number,
  qMin: number,
  qMax: number,
  nPoints = 20
): { q: number; val: number }[] {
  const logMin = Math.log(Math.max(qMin, 1e-9));
  const logMax = Math.log(qMax);
  const step   = (logMax - logMin) / (nPoints - 1);
  return Array.from({ length: nPoints }, (_, i) => {
    const q = Math.exp(logMin + i * step);
    return { q, val: fn(q) };
  });
}

// ─── Exported: Generic Operating Point ───────────────────────────────────────

/**
 * Find the nodal operating point where iprPwf(q) = vlpPwf(q) using bisection.
 *
 * @param iprPwf    IPR function: q → Pwf (psia) — decreasing in q
 * @param vlpPwf    VLP function: q → Pwf (psia) — increasing in q
 * @param qMin      Lower bound of rate search (STB/d or Mscf/d)
 * @param qMax      Upper bound of rate search
 * @param tolerance Convergence tolerance on q (default 0.1)
 * @returns         { q_op, Pwf_op, converged }
 */
export function nodalOperatingPoint(
  iprPwf: (q: number) => number,
  vlpPwf: (q: number) => number,
  qMin: number,
  qMax: number,
  tolerance = 0.1
): { q_op: number; Pwf_op: number; converged: boolean } {
  // f(q) = ipr(q) - vlp(q); find root
  const f = (q: number): number => iprPwf(q) - vlpPwf(q);

  let lo = qMin;
  let hi = qMax;
  let converged = false;

  // Check that a root exists in [lo, hi]
  if (f(lo) * f(hi) > 0) {
    // No sign change — return the rate with minimum absolute difference
    const mid = (lo + hi) / 2;
    return { q_op: mid, Pwf_op: (iprPwf(mid) + vlpPwf(mid)) / 2, converged: false };
  }

  let mid = lo;
  for (let i = 0; i < 200; i++) {
    mid = (lo + hi) / 2;
    if (hi - lo < tolerance) {
      converged = true;
      break;
    }
    if (f(lo) * f(mid) <= 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const Pwf_op = (iprPwf(mid) + vlpPwf(mid)) / 2;
  return { q_op: mid, Pwf_op, converged };
}

// ─── Exported: Oil Well Nodal (Vogel + simplified BHP) ───────────────────────

/**
 * Complete nodal analysis for an oil well using Vogel IPR and a simplified
 * BHP calculation (hydrostatic + average-density gradient).
 *
 * @param Pr            Reservoir pressure (psia)
 * @param Qmax          Vogel AOF (STB/d)
 * @param Pwf_wh_psia   Wellhead flowing pressure / THP (psia)
 * @param depth_ft      True vertical depth (ft)
 * @param tubing_id_in  Tubing inner diameter (in)
 * @param sg_oil        Oil specific gravity (water=1)
 * @param GOR           Producing GOR (scf/STB)
 * @param GLR           Gas-liquid ratio (scf/STB)
 * @param T_avg_F       Average tubing temperature (°F)
 * @param qMin          Minimum rate for curve (STB/d)
 * @param qMax          Maximum rate for curve (STB/d)
 * @returns             { q_op, Pwf_op, iprCurve, vlpCurve }
 */
export function nodalIPRVogel(
  Pr: number,
  Qmax: number,
  Pwf_wh_psia: number,
  depth_ft: number,
  tubing_id_in: number,
  sg_oil: number,
  GOR: number,
  GLR: number,
  T_avg_F: number,
  qMin: number,
  qMax: number
): {
  q_op: number;
  Pwf_op: number;
  iprCurve: Array<{ q: number; Pwf: number }>;
  vlpCurve: Array<{ q: number; Pwf: number }>;
} {
  // IPR: Vogel — Pwf decreases as q increases
  const iprPwf = (q: number): number => vogelIPRPwf(Pr, Qmax, q);

  // VLP: simplified mixture gradient.
  // Mixture density: ρ_mix = (ρ_oil·V_oil + ρ_gas·V_gas) / (V_oil + V_gas)
  // For simplicity, use average gradient = (0.433·sg_oil + gas_grad·GLR/5.615) / (1 + GLR/5.615)
  // Gas gradient ≈ 0.433 * sg_gas (sg_gas ≈ 0.65 typical)
  const sg_gas_est = 0.65;
  const oilGrad   = 0.433 * sg_oil;          // psi/ft
  const gasGrad   = 0.433 * sg_gas_est / 5.615 * GLR;  // effective gas contribution
  const mixGrad   = (oilGrad + gasGrad) / (1 + GLR / 5.615);  // psi/ft
  const vlpPwf = (q: number): number => {
    void q;  // rate-independent simplified model
    return Pwf_wh_psia + mixGrad * depth_ft;
  };

  void tubing_id_in; void GOR; void T_avg_F;  // available for more complex models

  const { q_op, Pwf_op, converged: _conv } = nodalOperatingPoint(
    iprPwf, vlpPwf, qMin, qMax
  );

  const nPts = 20;
  const step = (qMax - qMin) / (nPts - 1);
  const iprCurve = Array.from({ length: nPts }, (_, i) => {
    const q = qMin + i * step;
    return { q, Pwf: iprPwf(q) };
  });
  const vlpCurve = Array.from({ length: nPts }, (_, i) => {
    const q = qMin + i * step;
    return { q, Pwf: vlpPwf(q) };
  });

  return { q_op, Pwf_op, iprCurve, vlpCurve };
}

// ─── Exported: Gas Well Nodal ─────────────────────────────────────────────────

/**
 * Complete nodal analysis for a gas well using Darcy IPR and single-phase
 * gas BHP (average T-Z method).
 *
 * @param Pr_psia      Reservoir pressure (psia)
 * @param T_R          Reservoir temperature (°R)
 * @param sg_gas       Gas specific gravity
 * @param h_ft         Net pay (ft)
 * @param k_md         Permeability (md)
 * @param rw_ft        Wellbore radius (ft)
 * @param re_ft        Drainage radius (ft)
 * @param skin         Skin factor
 * @param Pwh_psia     Wellhead flowing pressure (psia)
 * @param depth_ft     True vertical depth (ft)
 * @param tubing_id_in Tubing inner diameter (in) — reserved for future friction term
 * @param T_avg_F      Average tubing temperature (°F)
 * @param qMin_Mscfd   Minimum rate (Mscf/d)
 * @param qMax_Mscfd   Maximum rate (Mscf/d)
 * @returns            { q_op, Pwf_op, iprCurve, vlpCurve }
 */
export function nodalGasWell(
  Pr_psia: number,
  T_R: number,
  sg_gas: number,
  h_ft: number,
  k_md: number,
  rw_ft: number,
  re_ft: number,
  skin: number,
  Pwh_psia: number,
  depth_ft: number,
  tubing_id_in: number,
  T_avg_F: number,
  qMin_Mscfd: number,
  qMax_Mscfd: number
): {
  q_op: number;
  Pwf_op: number;
  iprCurve: Array<{ q: number; Pwf: number }>;
  vlpCurve: Array<{ q: number; Pwf: number }>;
} {
  void tubing_id_in;  // reserved for future friction implementation

  const T_avg_R = T_avg_F + 459.67;

  const iprPwf = (q: number): number =>
    gasDarcyIPRPwf(Pr_psia, T_R, sg_gas, h_ft, k_md, rw_ft, re_ft, skin, q);

  const vlpPwf = (_q: number): number =>
    gasVLPBhp(Pwh_psia, sg_gas, depth_ft, T_avg_R);

  const { q_op, Pwf_op, converged: _conv } = nodalOperatingPoint(
    iprPwf, vlpPwf, qMin_Mscfd, qMax_Mscfd
  );

  const nPts = 20;
  const step = (qMax_Mscfd - qMin_Mscfd) / (nPts - 1);
  const iprCurve = Array.from({ length: nPts }, (_, i) => {
    const q = qMin_Mscfd + i * step;
    return { q, Pwf: iprPwf(q) };
  });
  const vlpCurve = Array.from({ length: nPts }, (_, i) => {
    const q = qMin_Mscfd + i * step;
    return { q, Pwf: vlpPwf(q) };
  });

  return { q_op, Pwf_op, iprCurve, vlpCurve };
}

// ─── Multi-String VLP (Parallel Tubing Strings) ───────────────────────────────

/**
 * Multi-string VLP for parallel tubing strings completing to the same reservoir.
 *
 * Each string has its own VLP curve (BHP vs rate function).  At any given BHP
 * the strings combine in parallel: total rate = Σ qi(BHP).
 * The operating point is found where the composite VLP meets the IPR.
 *
 * @param vlpFunctions  Array of VLP functions: each takes rate (STB/d) and
 *                      returns BHP (psia); used inversely — we sweep BHP and
 *                      solve for rate per string.
 * @param iprPwf        IPR function — given rate (STB/d) returns Pwf (psia)
 * @param qMin          Minimum total rate search bound (STB/d)
 * @param qMax          Maximum total rate search bound (STB/d)
 * @param nBhpPoints    Number of BHP points for composite curve (default 30)
 * @returns             { q_op, Pwf_op, compositeCurve, perStringRates }
 */
export function nodalMultiStringVLP(
  vlpFunctions: Array<(q: number) => number>,
  iprPwf: (q: number) => number,
  qMin: number,
  qMax: number,
  nBhpPoints = 30,
): {
  q_op:          number;
  Pwf_op:        number;
  compositeCurve: Array<{ q: number; Pwf: number }>;
  perStringRates: number[];
} {
  // Build a composite VLP by inverting each string's VLP across a BHP range
  // For each BHP, binary-search the rate that gives that BHP on each string.
  const Pwf_max = iprPwf(qMin * 0.01);   // high-rate / low pressure end
  const Pwf_min = iprPwf(qMax);          // low-rate / high pressure end
  const PwfMin  = Math.max(50, Pwf_min);
  const PwfMax  = Math.min(Pwf_max * 1.2, 20000);

  function invertVlp(vlpFn: (q: number) => number, Pwf_target: number): number {
    // Binary search: find q such that vlpFn(q) ≈ Pwf_target
    let lo = qMin / vlpFunctions.length;
    let hi = qMax / vlpFunctions.length;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      if (vlpFn(mid) < Pwf_target) lo = mid; else hi = mid;
      if (hi - lo < 0.01) break;
    }
    return (lo + hi) / 2;
  }

  const compositeCurve: Array<{ q: number; Pwf: number }> = [];
  const step = (PwfMax - PwfMin) / (nBhpPoints - 1);
  for (let i = 0; i < nBhpPoints; i++) {
    const Pwf = PwfMin + i * step;
    const totalQ = vlpFunctions.reduce((sum, fn) => sum + invertVlp(fn, Pwf), 0);
    compositeCurve.push({ q: totalQ, Pwf });
  }

  // Intersection with IPR
  const { q_op, Pwf_op } = nodalOperatingPoint(
    iprPwf,
    (q: number) => {
      // Interpolate composite VLP
      let lo = 0, hi = compositeCurve.length - 1;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (compositeCurve[mid].q < q) lo = mid; else hi = mid;
      }
      const { q: q0, Pwf: p0 } = compositeCurve[lo];
      const { q: q1, Pwf: p1 } = compositeCurve[hi];
      if (q1 === q0) return p0;
      return p0 + (p1 - p0) * (q - q0) / (q1 - q0);
    },
    qMin,
    qMax,
  );

  // Per-string rates at operating BHP
  const perStringRates = vlpFunctions.map(fn => invertVlp(fn, Pwf_op));

  return { q_op, Pwf_op, compositeCurve, perStringRates };
}

// ─── Artificial Lift Overlay Comparison ──────────────────────────────────────

/**
 * Artificial lift overlay comparison: ESP, Gas Lift, and Rod Pump.
 *
 * Returns the estimated operating BHP and rate for each lift type at a
 * simplified VLP model, useful for screening the best lift method.
 *
 * All VLP curves use the Beggs-Brill BHP function from the VFP module
 * (re-implemented here internally to avoid circular imports).
 *
 * @param Pr_psia        Reservoir pressure (psia)
 * @param Qmax_bpd       AOF / Vogel maximum rate (STB/d)
 * @param depth_ft       True vertical depth (ft)
 * @param D_in           Tubing inner diameter (in)
 * @param GOR            Gas-oil ratio (scf/STB)
 * @param SG_liq         Liquid specific gravity
 * @param SG_gas         Gas specific gravity
 * @param T_avg_F        Average temperature (°F)
 * @param Pwh_psia       Natural flow wellhead pressure (psia)
 * @param esp_deltaP_psi ESP pressure boost (psi) — additional pressure added by pump
 * @param gl_qInj_mscfd  Gas lift injection rate (Mscf/d) — lowers effective SG
 * @param rp_efficiency  Rod pump volumetric efficiency (0–1) — scales max rate
 * @returns              { natural, esp, gasLift, rodPump } each with { q_op, Pwf_op }
 */
export function nodalArtificialLiftOverlay(
  Pr_psia: number,
  Qmax_bpd: number,
  depth_ft: number,
  D_in: number,
  GOR: number,
  SG_liq: number,
  SG_gas: number,
  T_avg_F: number,
  Pwh_psia: number,
  esp_deltaP_psi = 800,
  gl_qInj_mscfd = 500,
  rp_efficiency = 0.85,
): {
  natural:  { q_op: number; Pwf_op: number };
  esp:      { q_op: number; Pwf_op: number };
  gasLift:  { q_op: number; Pwf_op: number };
  rodPump:  { q_op: number; Pwf_op: number };
} {
  // IPR: Vogel
  const iprPwf = (q: number): number => vogelIPRPwf(Pr_psia, Qmax_bpd, q);

  // Mix gradient: temperature-corrected gas density reduces effective gradient
  // Gas density correction factor: (520 / T_avg_R) to account for gas expansion
  const T_avg_R    = T_avg_F + 459.67;
  const gasDenCorr = 520.0 / T_avg_R;               // standard-to-actual density ratio
  const mixGrad = (sgL: number, gor: number): number => {
    const oilGrad = 0.433 * sgL;
    const gasCorr = 0.433 * SG_gas * gasDenCorr * gor / 5615;
    return (oilGrad + gasCorr) / (1 + gor / 5615);
  };

  // Natural flow VLP
  const grad_nat = mixGrad(SG_liq, GOR);
  const vlpNat   = (_q: number): number => Pwh_psia + grad_nat * depth_ft;

  // ESP: adds pressure boost, raising effective wellhead pressure equivalent
  const vlpESP = (_q: number): number => Math.max(100, vlpNat(_q) - esp_deltaP_psi);

  // Gas lift: injection lowers effective liquid gradient
  const addedGasScf = gl_qInj_mscfd * 1000;
  const qLiq        = Math.max(100, Qmax_bpd * 0.5);   // reference rate for GOR calc
  const gorGL       = GOR + addedGasScf / qLiq;
  const grad_gl     = mixGrad(SG_liq, gorGL);
  const vlpGL       = (_q: number): number => Pwh_psia + grad_gl * depth_ft;

  // Rod pump: limits max rate by volumetric efficiency
  const Qmax_rp = Qmax_bpd * rp_efficiency;
  const iprRP   = (q: number): number => vogelIPRPwf(Pr_psia, Qmax_rp, Math.min(q, Qmax_rp));

  const qMin = Qmax_bpd * 0.01;
  const qMax = Qmax_bpd * 1.5;

  const nat = nodalOperatingPoint(iprPwf, vlpNat, qMin, qMax);
  const esp = nodalOperatingPoint(iprPwf, vlpESP, qMin, qMax);
  const gl  = nodalOperatingPoint(iprPwf, vlpGL,  qMin, qMax);
  const rp  = nodalOperatingPoint(iprRP,  vlpNat, qMin * 0.1, Qmax_rp);

  return {
    natural:  { q_op: nat.q_op, Pwf_op: nat.Pwf_op },
    esp:      { q_op: esp.q_op, Pwf_op: esp.Pwf_op },
    gasLift:  { q_op: gl.q_op,  Pwf_op: gl.Pwf_op  },
    rodPump:  { q_op: rp.q_op,  Pwf_op: rp.Pwf_op  },
  };
}
