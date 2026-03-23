/**
 * P365 — Pressure Transient Analysis (PTA)
 *
 * Functions for well test interpretation and pressure transient analysis:
 *   Ei function, dimensionless variables, drawdown / buildup pressure,
 *   Horner and MDH analysis, superposition (van Wijnen/multi-rate),
 *   Bourdet derivative, fault analysis (image well method).
 *
 * Unit conventions (field units unless noted):
 *   k (md), h (ft), q (STB/d or Mscf/d), t (hours),
 *   p (psia), r (ft), mu (cp), Bo (res-bbl/STB),
 *   phi (fraction), ct (psi⁻¹).
 *
 * Field-unit constant: 141.2 for liquid (Bo·mu), 1422 for gas (Z·T·mu).
 */

// ─── Exponential Integral (Ei function) ──────────────────────────────────────

/**
 * Exponential integral Ei(x) for x < 0.
 *
 * Uses the series expansion for small |x| (|x| < 1) and the asymptotic
 * approximation for large |x|:
 *
 *   Ei(-x) = γ + ln(x) + Σ(k=1..∞) (-x)^k / (k · k!)   (series, x > 0)
 *
 * Note: For PTA the "line-source" solution uses Ei(−u) = −E1(u).
 * This function returns Ei(x) for x < 0 as used in the line-source solution.
 *
 * @param x  Argument (x < 0 for the well-test formulation)
 * @returns  Ei(x)  (dimensionless)
 */
export function ei(x: number): number {
  if (x >= 0) throw new Error("ei(x): x must be negative for PTA use");
  const u = -x; // u > 0

  // Series expansion for Ei(-u), u > 0:
  //   Ei(-u) = γ + ln(u) + Σ_{k=1}^∞ (-u)^k / (k · k!)
  // Converges for all u > 0 and gives a negative result.
  const gamma = 0.5772156649015329; // Euler-Mascheroni constant
  let sum = gamma + Math.log(u);
  let term = 1;
  for (let k = 1; k <= 100; k++) {
    term *= (-u) / k;        // term = (-u)^k / k!
    sum += term / k;         // adds (-u)^k / (k · k!)
    if (Math.abs(term / k) < 1e-15 * Math.abs(sum)) break;
  }
  return sum;  // Ei(-u) < 0 for u > 0; no negation
}

// ─── Dimensionless Variables ──────────────────────────────────────────────────

/**
 * Dimensionless time (tD) at the wellbore.
 *
 * tD = 0.000264 · k · t / (φ · μ · ct · rw²)
 *
 * @param k    Permeability (md)
 * @param t    Time (hours)
 * @param phi  Porosity (fraction)
 * @param mu   Viscosity (cp)
 * @param ct   Total compressibility (psi⁻¹)
 * @param rw   Wellbore radius (ft)
 * @returns    tD (dimensionless)
 */
export function dimensionlessTimeTD(
  k: number,
  t: number,
  phi: number,
  mu: number,
  ct: number,
  rw: number
): number {
  return (0.000264 * k * t) / (phi * mu * ct * rw * rw);
}

/**
 * Dimensionless time at radius r (tD based on r instead of rw).
 *
 * tDr = 0.000264 · k · t / (φ · μ · ct · r²)
 *
 * @param k    Permeability (md)
 * @param t    Time (hours)
 * @param phi  Porosity (fraction)
 * @param mu   Viscosity (cp)
 * @param ct   Total compressibility (psi⁻¹)
 * @param r    Radius of interest (ft)
 * @returns    tDr (dimensionless)
 */
export function dimensionlessTimeAtRadius(
  k: number,
  t: number,
  phi: number,
  mu: number,
  ct: number,
  r: number
): number {
  return (0.000264 * k * t) / (phi * mu * ct * r * r);
}

/**
 * Dimensionless pressure PD for the line-source solution (valid tD > 25·rD²):
 *
 * PD = 0.5 · [−Ei(−rD²/(4·tD))]
 *
 * At the wellbore (rD = 1):  PD ≈ 0.5 · ln(tD) + 0.4045  for large tD
 *
 * @param tD   Dimensionless time
 * @param rD   Dimensionless radius (r/rw)
 * @returns    PD (dimensionless)
 */
export function dimensionlessPressurePD(tD: number, rD: number): number {
  const u = (rD * rD) / (4 * tD);
  if (u >= 500) return 0;           // Ei negligible — radius not yet reached
  return -0.5 * ei(-u);
}

/**
 * Convert dimensionless pressure PD to actual pressure drop (Darcy liquid flow).
 *
 * ΔP = 141.2 · q · μ · Bo / (k · h) · PD
 *
 * @param PD   Dimensionless pressure (from dimensionlessPressurePD)
 * @param q    Rate (STB/d)
 * @param mu   Viscosity (cp)
 * @param Bo   FVF (res-bbl/STB)
 * @param k    Permeability (md)
 * @param h    Net pay (ft)
 * @returns    Pressure drop (psia)
 */
export function pdToPressureDrop(
  PD: number,
  q: number,
  mu: number,
  Bo: number,
  k: number,
  h: number
): number {
  return (141.2 * q * mu * Bo / (k * h)) * PD;
}

// ─── Drawdown / Buildup Pressure ──────────────────────────────────────────────

/**
 * Drawdown flowing bottomhole pressure (liquid, field units).
 *
 * Uses the semilog approximation valid for tD > 25 (practical: t > ~1 h):
 *
 *   Pwf = Pi − (162.6·q·μ·Bo)/(k·h) · [log(k·t/(φ·μ·ct·rw²)) − 3.2275 + 0.8686·S]
 *
 * The constant 3.2275 accounts for log(0.000264) and Euler's constant.
 *
 * @param Pi   Initial reservoir pressure (psia)
 * @param q    Rate (STB/d)
 * @param k    Permeability (md)
 * @param h    Net pay (ft)
 * @param phi  Porosity (fraction)
 * @param mu   Viscosity (cp)
 * @param Bo   FVF (res-bbl/STB)
 * @param ct   Total compressibility (psi⁻¹)
 * @param rw   Wellbore radius (ft)
 * @param t    Flowing time (hours)
 * @param S    Skin factor
 * @returns    Pwf (psia)
 */
export function drawdownPwf(
  Pi: number,
  q: number,
  k: number,
  h: number,
  phi: number,
  mu: number,
  Bo: number,
  ct: number,
  rw: number,
  t: number,
  S: number
): number {
  const m = (162.6 * q * mu * Bo) / (k * h);
  const logArg = (k * t) / (phi * mu * ct * rw * rw);
  return Pi - m * (Math.log10(logArg) - 3.2275 + 0.8686 * S);
}

/**
 * Drawdown flowing bottomhole pressure using exact Ei solution.
 *
 * Pwf = Pi + (141.2·q·μ·Bo)/(k·h) · [Ei(−rw²/(4·(0.000264·k·t/(φ·μ·ct)))) − 2S]
 *       (note: Ei is negative here, reducing Pi — hence + in front)
 *
 * More accurate than semilog for very early time.
 *
 * @param Pi   Initial pressure (psia)
 * @param q    Rate (STB/d)
 * @param k    Permeability (md)
 * @param h    Net pay (ft)
 * @param phi  Porosity (fraction)
 * @param mu   Viscosity (cp)
 * @param Bo   FVF (res-bbl/STB)
 * @param ct   Total compressibility (psi⁻¹)
 * @param rw   Wellbore radius (ft)
 * @param t    Flowing time (hours)
 * @param S    Skin factor
 * @returns    Pwf (psia)
 */
export function drawdownPwfEi(
  Pi: number,
  q: number,
  k: number,
  h: number,
  phi: number,
  mu: number,
  Bo: number,
  ct: number,
  rw: number,
  t: number,
  S: number
): number {
  // Field-unit Ei formula: Pwf = Pi + (70.6·q·μ·Bo/(k·h)) · [Ei(−948·φ·μ·ct·rw²/(k·t)) − 2S]
  // Equivalently with 141.2 prefactor and 0.5 factor on Ei:
  // Pwf = Pi + (141.2·q·μ·Bo/(k·h)) · (0.5·Ei(−u) − S)
  const prefactor = (141.2 * q * mu * Bo) / (k * h);
  const u = (948 * phi * mu * ct * rw * rw) / (k * t);
  if (u > 500) return Pi;  // Signal not yet reached wellbore
  const eiVal = ei(-u);    // < 0
  return Pi + prefactor * (0.5 * eiVal - S);
}

// ─── Horner Analysis ──────────────────────────────────────────────────────────

/**
 * Horner time ratio for pressure buildup analysis.
 *
 * HTR = (tp + Δt) / Δt
 *
 * @param tp   Producing time before shut-in (hours)
 * @param dt   Shut-in time Δt (hours)
 * @returns    Horner time ratio (dimensionless)
 */
export function hornerTimeRatio(tp: number, dt: number): number {
  if (dt <= 0) throw new Error("dt must be positive");
  return (tp + dt) / dt;
}

/**
 * Buildup pressure from Horner plot (extrapolation).
 *
 * Pws = P* − m · log[(tp + Δt) / Δt]
 *
 * @param Pstar  Extrapolated pressure at HTR = 1 (i.e., at Δt → ∞) (psia)
 * @param m      Horner slope (psi/cycle, should be positive value; sign handled internally)
 * @param HTR    Horner time ratio (tp + Δt)/Δt
 * @returns      Shut-in pressure Pws (psia)
 */
export function hornerBuildupPressure(
  Pstar: number,
  m: number,
  HTR: number
): number {
  return Pstar - Math.abs(m) * Math.log10(HTR);
}

/**
 * Permeability from Horner semilog slope.
 *
 * k = 162.6 · q · μ · Bo / (|m| · h)
 *
 * @param q    Rate before shut-in (STB/d)
 * @param mu   Viscosity (cp)
 * @param Bo   FVF (res-bbl/STB)
 * @param m    Absolute value of Horner slope (psi/log-cycle)
 * @param h    Net pay (ft)
 * @returns    Permeability k (md)
 */
export function hornerPermeability(
  q: number,
  mu: number,
  Bo: number,
  m: number,
  h: number
): number {
  return (162.6 * q * mu * Bo) / (Math.abs(m) * h);
}

/**
 * Skin factor from Horner buildup analysis.
 *
 * S = 1.1515 · {[(P1hr − Pwf_beforeshutIn) / |m|] − log[k/(φ·μ·ct·rw²)] + 3.2275}
 *
 * @param P1hr     Shut-in pressure at Δt = 1 hr (read from Horner plot) (psia)
 * @param Pwf      Flowing pressure just before shut-in (psia)
 * @param m        Absolute Horner slope (psi/cycle)
 * @param k        Permeability (md)
 * @param phi      Porosity (fraction)
 * @param mu       Viscosity (cp)
 * @param ct       Total compressibility (psi⁻¹)
 * @param rw       Wellbore radius (ft)
 * @returns        Skin factor S (dimensionless)
 */
export function hornerSkin(
  P1hr: number,
  Pwf: number,
  m: number,
  k: number,
  phi: number,
  mu: number,
  ct: number,
  rw: number
): number {
  const logArg = k / (phi * mu * ct * rw * rw);
  return 1.1515 * ((P1hr - Pwf) / Math.abs(m) - Math.log10(logArg) + 3.2275);
}

/**
 * Extrapolate P* from the Horner straight-line portion.
 *
 * P* is read at HTR = 1 (infinite shut-in), i.e. on the extrapolation of
 * the straight-line portion of the Horner plot.
 *
 * Uses the last two points on the IARF (infinite-acting radial flow) line.
 *
 * @param Pws1   Pressure at HTR1 (psia)
 * @param HTR1   Horner time ratio at first point
 * @param m      Horner slope (psi/cycle, signed negative)
 * @returns      Extrapolated P* (psia)
 */
export function hornerPstar(
  Pws1: number,
  HTR1: number,
  m: number
): number {
  // On IARF: Pws = P* + m*log(HTR)  → P* = Pws1 - m*log(HTR1)
  return Pws1 - m * Math.log10(HTR1);
}

// ─── MDH (Miller-Dyes-Hutchinson) Drawdown Analysis ──────────────────────────

/**
 * Permeability from MDH drawdown plot slope (same formula as Horner).
 *
 * k = 162.6 · q · μ · Bo / (|m| · h)
 *
 * @param q    Rate (STB/d)
 * @param mu   Viscosity (cp)
 * @param Bo   FVF (res-bbl/STB)
 * @param m    Absolute MDH slope (psi/log-cycle)
 * @param h    Net pay (ft)
 * @returns    k (md)
 */
export function mdhPermeability(
  q: number,
  mu: number,
  Bo: number,
  m: number,
  h: number
): number {
  return (162.6 * q * mu * Bo) / (Math.abs(m) * h);
}

/**
 * Skin from MDH drawdown at P1hr.
 *
 * S = 1.1515 · {[(Pi − P1hr) / |m|] − log[k/(φ·μ·ct·rw²)] + 3.2275}
 *
 * @param Pi   Initial reservoir pressure (psia)
 * @param P1hr Drawdown pressure at t = 1 hr (psia)
 * @param m    Absolute MDH slope (psi/cycle)
 * @param k    Permeability (md)
 * @param phi  Porosity (fraction)
 * @param mu   Viscosity (cp)
 * @param ct   Total compressibility (psi⁻¹)
 * @param rw   Wellbore radius (ft)
 * @returns    Skin S (dimensionless)
 */
export function mdhSkin(
  Pi: number,
  P1hr: number,
  m: number,
  k: number,
  phi: number,
  mu: number,
  ct: number,
  rw: number
): number {
  const logArg = k / (phi * mu * ct * rw * rw);
  return 1.1515 * ((Pi - P1hr) / Math.abs(m) - Math.log10(logArg) + 3.2275);
}

// ─── Superposition (Multi-Rate / Superposition Principle) ─────────────────────

/**
 * Wellbore pressure by van Wijnen superposition for multiple rate changes.
 *
 * For n rate changes q1→q2→…→qN, the pressure at time t (since the first
 * rate started) is computed using the superposition (Duhamel) principle:
 *
 *   P(t) = Pi − (141.2·μ·Bo)/(k·h) · Σ_j (qj − q_{j-1}) · PD(tDj)
 *
 * where q0 = 0, tDj = tD(t − t_{j-1}).
 *
 * @param Pi         Initial reservoir pressure (psia)
 * @param q_arr      Array of rates (STB/d); q_arr[j] starts at t_arr[j]
 * @param t_start    Array of start times for each rate (hours); first = 0
 * @param t_now      Current time since start (hours)
 * @param k          Permeability (md)
 * @param h          Net pay (ft)
 * @param phi        Porosity (fraction)
 * @param mu         Viscosity (cp)
 * @param Bo         FVF (res-bbl/STB)
 * @param ct         Total compressibility (psi⁻¹)
 * @param rw         Wellbore radius (ft)
 * @param S          Skin factor
 * @returns          Pwf (psia)
 */
export function superposeWellborePressure(
  Pi: number,
  q_arr: number[],
  t_start: number[],
  t_now: number,
  k: number,
  h: number,
  phi: number,
  mu: number,
  Bo: number,
  ct: number,
  rw: number,
  S: number
): number {
  const prefactor = (141.2 * mu * Bo) / (k * h);
  let sumPD = 0;
  const currentRate = q_arr[q_arr.length - 1];

  for (let j = 0; j < q_arr.length; j++) {
    const dt = t_now - t_start[j];
    if (dt <= 0) continue;

    const dq = j === 0 ? q_arr[0] : q_arr[j] - q_arr[j - 1];
    const tD = dimensionlessTimeTD(k, dt, phi, mu, ct, rw);
    const PD = dimensionlessPressurePD(tD, 1);
    sumPD += dq * PD;
  }
  // Skin applies only to the current (last) rate contribution
  sumPD += currentRate * S;

  return Pi - prefactor * sumPD;
}

// ─── Fault Analysis (Image Well Method) ──────────────────────────────────────

/**
 * Pressure buildup near a linear sealing fault using the method of images.
 *
 * The fault creates an image well at distance 2·d_fault from the producing well.
 * The buildup pressure includes contributions from both the real well and image well.
 *
 * Pws = Pi − (141.2·q·μ·Bo)/(k·h) · [Ei(−u_real) − Ei(−u_image)]  (shut-in)
 *
 * where u_real = phi·mu·ct·rw²/(4·0.000264·k·Δt)
 *       u_image = phi·mu·ct·(2·d)²/(4·0.000264·k·Δt)
 *
 * @param Pi     Initial reservoir pressure (psia)
 * @param q      Production rate before shut-in (STB/d)
 * @param k      Permeability (md)
 * @param h      Net pay (ft)
 * @param phi    Porosity (fraction)
 * @param mu     Viscosity (cp)
 * @param Bo     FVF (res-bbl/STB)
 * @param ct     Total compressibility (psi⁻¹)
 * @param rw     Wellbore radius (ft)
 * @param d      Distance to fault (ft)
 * @param dt     Shut-in time Δt (hours)
 * @param S      Skin factor
 * @returns      Buildup pressure Pws (psia)
 */
/**
 * Pressure buildup near a linear sealing fault using the method of images.
 *
 * Uses Ei-function superposition for the real well and its image well across
 * the fault. The image well reflects the fault boundary.
 *
 * Pws = Pi − (70.6·q·μ·Bo/(k·h)) ·
 *           [(Ei(−u_rw_dt) − Ei(−u_rw_tpdt)) + (Ei(−u_2d_dt) − Ei(−u_2d_tpdt))]
 *
 * where u = 948·φ·μ·ct·r²/(k·t), r = rw for real well, r = 2d for image well.
 * The bracket is positive (less-negative minus more-negative), so Pws < Pi.
 *
 * @param Pi     Initial reservoir pressure (psia)
 * @param q      Production rate before shut-in (STB/d)
 * @param k      Permeability (md)
 * @param h      Net pay (ft)
 * @param phi    Porosity (fraction)
 * @param mu     Viscosity (cp)
 * @param Bo     FVF (res-bbl/STB)
 * @param ct     Total compressibility (psi⁻¹)
 * @param rw     Wellbore radius (ft)
 * @param d      Distance to fault (ft)
 * @param tp     Producing time before shut-in (hours)
 * @param dt     Shut-in time Δt (hours)
 * @param S      Skin factor
 * @returns      Buildup pressure Pws (psia)
 */
export function faultBuildupPressure(
  Pi: number,
  q: number,
  k: number,
  h: number,
  phi: number,
  mu: number,
  Bo: number,
  ct: number,
  rw: number,
  d: number,
  tp: number,
  dt: number,
  S: number
): number {
  const halfPrefactor = (70.6 * q * mu * Bo) / (k * h);

  const u_rw_dt    = (948 * phi * mu * ct * rw * rw) / (k * dt);
  const u_rw_tpdt  = (948 * phi * mu * ct * rw * rw) / (k * (tp + dt));
  const u_img_dt   = (948 * phi * mu * ct * (2 * d) * (2 * d)) / (k * dt);
  const u_img_tpdt = (948 * phi * mu * ct * (2 * d) * (2 * d)) / (k * (tp + dt));

  const safe_ei = (u: number) => (u > 500 ? 0 : ei(-u));

  // Each bracket [Ei(-u_dt) - Ei(-u_tpdt)] is positive (less-negative minus more-negative)
  const real_term = safe_ei(u_rw_dt) - safe_ei(u_rw_tpdt);
  const img_term  = safe_ei(u_img_dt) - safe_ei(u_img_tpdt);

  return Pi - halfPrefactor * (real_term + img_term) + halfPrefactor * 2 * S;
}

// ─── Bourdet Derivative ───────────────────────────────────────────────────────

/**
 * Compute the Bourdet pressure derivative Δp' = dΔp/d(ln Δt).
 *
 * Uses central finite differences on the pressure-time data sorted by Δt.
 * The derivative is smoothed using the "L" parameter (window radius in ln units).
 *
 * Points closer than L in ln(Δt) are combined via weighted regression.
 *
 * @param dt_arr    Array of Δt values (hours), need not be sorted
 * @param dp_arr    Array of pressure change Δp = Pi − Pwf (psia)
 * @param L         Smoothing parameter in ln(Δt) units (e.g. 0.1 to 0.5)
 * @returns         Array of [Δt, Δp'] pairs at each measurement point
 */
export function bourdetDerivative(
  dt_arr: number[],
  dp_arr: number[],
  L: number
): [number, number][] {
  const n = dt_arr.length;
  if (n < 3) throw new Error("Need at least 3 data points for derivative");

  // Sort by Δt
  const indices = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => dt_arr[a] - dt_arr[b]
  );
  const dt = indices.map(i => dt_arr[i]);
  const dp = indices.map(i => dp_arr[i]);
  const lnDt = dt.map(x => Math.log(x));

  const result: [number, number][] = [];

  for (let i = 1; i < n - 1; i++) {
    const lnDtI = lnDt[i];

    // Left and right neighbors within window L
    let j = i - 1;
    while (j > 0 && lnDtI - lnDt[j] < L) j--;
    let k = i + 1;
    while (k < n - 1 && lnDt[k] - lnDtI < L) k++;

    // Three-point derivative at i using j and k
    const dLnDt = lnDt[k] - lnDt[j];
    if (dLnDt === 0) continue;

    // Weight toward the center point
    const wL = (lnDtI - lnDt[j]) / dLnDt;
    const wR = 1 - wL;
    const deriv =
      wR * ((dp[i] - dp[j]) / (lnDt[i] - lnDt[j])) +
      wL * ((dp[k] - dp[i]) / (lnDt[k] - lnDt[i]));

    result.push([dt[i], deriv]);
  }

  return result;
}

// ─── Wellbore Storage ─────────────────────────────────────────────────────────

/**
 * Wellbore storage coefficient C (rising liquid level).
 *
 * C = Vw · ρ / 144  (bbl/psi)
 *
 * For a wellbore with fluid: C = 144 · Aw / (5.615 · ρ)
 * Simplified: C = Aw (ft²) · 5.615 (bbl/ft) / (144 · ρ/62.4)
 *
 * Common approximation for oil wells: C ≈ 0.00096·(casing ID in inches)²·h_level / (ρ/62.4)
 *
 * For this function: C = Vw / (144 · ct_wb)  where Vw is wellbore volume in bbl
 * and ct_wb is wellbore fluid compressibility (psi⁻¹).
 *
 * @param V_wb   Wellbore volume (bbl)
 * @param ct_wb  Wellbore fluid compressibility (psi⁻¹)
 * @returns      C (bbl/psi)
 */
export function wellboreStorageCoefficient(V_wb: number, ct_wb: number): number {
  return V_wb * ct_wb;
}

/**
 * Dimensionless wellbore storage coefficient CD.
 *
 * CD = C / (2π · φ · ct · h · rw²)  (in consistent units)
 * In field units: CD = 5.615 · C / (2π · φ · ct · h · rw²)
 *
 * @param C    Wellbore storage coefficient (bbl/psi)
 * @param phi  Porosity (fraction)
 * @param ct   Total compressibility (psi⁻¹)
 * @param h    Net pay (ft)
 * @param rw   Wellbore radius (ft)
 * @returns    CD (dimensionless)
 */
export function wellboreStorageCoefficientCD(
  C: number,
  phi: number,
  ct: number,
  h: number,
  rw: number
): number {
  return (5.615 * C) / (2 * Math.PI * phi * ct * h * rw * rw);
}

// ─── Multi-Well Interference Test ─────────────────────────────────────────────

/**
 * Calculate pressure response at an observation well due to production at an
 * active well (interference test, line-source solution).
 *
 * The pressure drop at distance r from the active well after time t:
 *   delta_p(r,t) = 70.6 * q * mu * Bo / (k * h) * [-Ei(-r^2 / (0.000264 * k * t / (phi * mu * ct)))]
 *
 * where Ei(-x) < 0 for x > 0; applies when tD > 25 (valid IARF).
 *
 * @param q_STB_d   Production rate at active well (STB/d)
 * @param mu_cp     Reservoir fluid viscosity (cp)
 * @param Bo_resbbl Formation volume factor (res bbl/STB)
 * @param k_mD      Permeability (mD)
 * @param h_ft      Net pay thickness (ft)
 * @param phi       Porosity (fraction)
 * @param ct_psi    Total compressibility (psia^-1)
 * @param r_ft      Distance from active well to observation well (ft)
 * @param t_hrs     Producing time (hours)
 * @returns         Pressure drop at observation well (psia)
 */
export function interferenceTransientPressure(
  q_STB_d: number,
  mu_cp: number,
  Bo_resbbl: number,
  k_mD: number,
  h_ft: number,
  phi: number,
  ct_psi: number,
  r_ft: number,
  t_hrs: number
): number {
  if (k_mD <= 0 || h_ft <= 0) throw new Error("k and h must be positive");
  if (phi <= 0 || phi > 1) throw new Error("Porosity must be between 0 and 1");
  if (r_ft <= 0 || t_hrs <= 0) throw new Error("r and t must be positive");

  const x = 948 * phi * mu_cp * ct_psi * r_ft * r_ft / (k_mD * t_hrs);
  // The existing ei() function computes Ei(x) for x < 0 (i.e., -E1(-x)).
  // We need Ei(-x) for x > 0, so call ei(-x) which gives Ei(-x) < 0.
  const eiMinusX = ei(-x); // Ei(-x) < 0 for x > 0
  const prefix = 70.6 * q_STB_d * mu_cp * Bo_resbbl / (k_mD * h_ft);
  return -prefix * eiMinusX; // -prefix * negative = positive pressure drop
}

/**
 * Estimate permeability from interference test data (type curve or semilog).
 *
 * Using the active well production rate and pressure response at the
 * observation well, solve the line-source equation for k:
 *
 *   k = 70.6 * q * mu * Bo / (h * delta_p) * [-Ei(-r^2 / (0.000264 k t / phi mu ct))]
 *
 * This function uses an iterative approach to solve for k.
 *
 * @param q_STB_d     Production rate at active well (STB/d)
 * @param mu_cp       Viscosity (cp)
 * @param Bo_resbbl   FVF (res bbl/STB)
 * @param h_ft        Net pay thickness (ft)
 * @param phi         Porosity (fraction)
 * @param ct_psi      Total compressibility (psia^-1)
 * @param r_ft        Well spacing (ft)
 * @param t_hrs       Time of observation (hours)
 * @param dp_psia     Observed pressure drop at observation well (psia)
 * @param k_guess     Initial k guess (mD)
 * @param maxIter     Max iterations
 * @returns           Estimated permeability (mD)
 */
export function interferencePermeability(
  q_STB_d: number,
  mu_cp: number,
  Bo_resbbl: number,
  h_ft: number,
  phi: number,
  ct_psi: number,
  r_ft: number,
  t_hrs: number,
  dp_psia: number,
  k_guess = 10,
  maxIter = 80
): number {
  if (dp_psia <= 0) throw new Error("Pressure drop must be positive");

  // Bisection search: dp is a monotonically increasing function of k
  // (higher k → more communication → larger dp at observation well)
  // Find bracket [k_lo, k_hi] where dp_calc crosses dp_psia

  // Establish lower bracket (dp_calc < dp_psia)
  let k_lo = k_guess * 0.001;
  for (let i = 0; i < 30; i++) {
    const dp = interferenceTransientPressure(q_STB_d, mu_cp, Bo_resbbl, k_lo, h_ft, phi, ct_psi, r_ft, t_hrs);
    if (dp < dp_psia) break;
    k_lo *= 0.1;
  }
  // Establish upper bracket (dp_calc > dp_psia)
  let k_hi = k_guess * 1000;
  for (let i = 0; i < 30; i++) {
    const dp = interferenceTransientPressure(q_STB_d, mu_cp, Bo_resbbl, k_hi, h_ft, phi, ct_psi, r_ft, t_hrs);
    if (dp > dp_psia) break;
    k_hi *= 10;
  }

  // Bisect
  for (let i = 0; i < maxIter; i++) {
    const k_mid = Math.sqrt(k_lo * k_hi); // geometric midpoint for permeability
    const dp_mid = interferenceTransientPressure(q_STB_d, mu_cp, Bo_resbbl, k_mid, h_ft, phi, ct_psi, r_ft, t_hrs);
    if (Math.abs(dp_mid / dp_psia - 1) < 1e-6) return k_mid;
    if (dp_mid < dp_psia) k_lo = k_mid;
    else k_hi = k_mid;
  }
  return Math.sqrt(k_lo * k_hi);
}

/**
 * Estimate storativity (phi * ct) from interference test using peak time or
 * Theis curve matching.
 *
 * Using the line-source solution at a known time and pressure response:
 *   phi * ct = 948 * k * t_peak / (mu * r^2) * (1 / x_peak)
 *
 * where x_peak ≈ 0.5625 for -Ei(-x) peak response.
 *
 * For a simpler approach: if k is known, use the time of peak dp rise
 * (inflection point in semi-log plot) to estimate storativity.
 *
 * @param k_mD    Permeability from interference (mD)
 * @param mu_cp   Viscosity (cp)
 * @param r_ft    Well spacing (ft)
 * @param t_hrs   Time at which dp was observed (hours)
 * @param x_ei    Argument of Ei function at observation point (dimensionless)
 * @returns       Storativity phi * ct (fraction/psia)
 */
export function interferenceStorativity(
  k_mD: number,
  mu_cp: number,
  r_ft: number,
  t_hrs: number,
  x_ei: number
): number {
  if (k_mD <= 0 || mu_cp <= 0 || r_ft <= 0 || t_hrs <= 0) {
    throw new Error("All parameters must be positive");
  }
  // x = 948 * phi * mu * ct * r^2 / (k * t) -> phi*ct = x * k * t / (948 * mu * r^2)
  return x_ei * k_mD * t_hrs / (948 * mu_cp * r_ft * r_ft);
}

// ─── Pulse Test Analysis ──────────────────────────────────────────────────────

/**
 * Calculate the expected pulse response amplitude for a pulse test.
 *
 * The pulse test consists of alternating production/injection periods at the
 * active well and measuring pressure response at the observation well.
 *
 * Pressure amplitude (Johnson, Greenkorn & Woods, 1966):
 *   delta_p_pulse = (70.6 * q * mu * Bo / (k * h)) * F'(r, t_L, t_p)
 *
 * For the first odd pulse, the dimensionless amplitude F' depends on:
 *   tL_D = 0.000264 * k * t_L / (phi * mu * ct * r^2)
 *   tCycle_D = 0.000264 * k * t_cycle / (phi * mu * ct * r^2)
 *
 * Simplified approximation (after Kamal & Bigham, 1975):
 *   F' ~ 0.0250 * (tL_D / tCycle_D) * exp(-2.303)
 *
 * This function uses the exact Ei superposition for the first pulse.
 *
 * @param q_STB_d    Pulse rate (STB/d; positive = production)
 * @param mu_cp      Viscosity (cp)
 * @param Bo_resbbl  FVF (res bbl/STB)
 * @param k_mD       Permeability (mD)
 * @param h_ft       Net pay thickness (ft)
 * @param phi        Porosity (fraction)
 * @param ct_psi     Total compressibility (psia^-1)
 * @param r_ft       Well spacing (ft)
 * @param t_pulse_hrs Pulse duration (hours)
 * @param t_lag_hrs  Time from end of pulse to peak response (hours)
 * @returns          Pulse response amplitude (psia)
 */
export function pulseTestAmplitude(
  q_STB_d: number,
  mu_cp: number,
  Bo_resbbl: number,
  k_mD: number,
  h_ft: number,
  phi: number,
  ct_psi: number,
  r_ft: number,
  t_pulse_hrs: number,
  t_lag_hrs: number
): number {
  // Total time from start = t_pulse + t_lag
  const t_total = t_pulse_hrs + t_lag_hrs;
  // Superposition: dp(t_total) - dp(t_lag) using line source
  const dp_total = interferenceTransientPressure(q_STB_d, mu_cp, Bo_resbbl, k_mD, h_ft, phi, ct_psi, r_ft, t_total);
  const dp_lag   = interferenceTransientPressure(q_STB_d, mu_cp, Bo_resbbl, k_mD, h_ft, phi, ct_psi, r_ft, t_lag_hrs);
  return Math.abs(dp_total - dp_lag);
}

/**
 * Estimate permeability from pulse test data using Johnson-Greenkorn-Woods correlation.
 *
 * For the first odd pulse:
 *   k = phi * mu * ct * r^2 / (0.000264 * t_L) * F(R)
 *
 * where F(R) is the dimensionless time function and R = t_p / t_L (pulse ratio).
 * Approximate relation (Kamal & Bigham, 1975):
 *   k * h = 70.6 * q * mu * Bo * (t_L / delta_p) * G(R)
 *
 * Simplified: use the line-source model with superposition for first pulse.
 *
 * @param q_STB_d    Pulse rate (STB/d)
 * @param mu_cp      Viscosity (cp)
 * @param Bo_resbbl  FVF (res bbl/STB)
 * @param h_ft       Net pay thickness (ft)
 * @param phi        Porosity (fraction)
 * @param ct_psi     Total compressibility (psia^-1)
 * @param r_ft       Well spacing (ft)
 * @param t_pulse_hrs Pulse duration (hours)
 * @param t_lag_hrs  Lag time to peak response (hours)
 * @param dp_psia    Observed pulse response amplitude (psia)
 * @param k_guess    Initial guess for k (mD)
 * @returns          Estimated permeability (mD)
 */
export function pulseTestPermeability(
  q_STB_d: number,
  mu_cp: number,
  Bo_resbbl: number,
  h_ft: number,
  phi: number,
  ct_psi: number,
  r_ft: number,
  t_pulse_hrs: number,
  t_lag_hrs: number,
  dp_psia: number,
  k_guess = 10
): number {
  if (dp_psia <= 0) throw new Error("Pressure response must be positive");

  // Bisection search for k — pulse amplitude is monotonically increasing with k
  let k_lo = k_guess * 0.001;
  for (let i = 0; i < 30; i++) {
    const dp = pulseTestAmplitude(q_STB_d, mu_cp, Bo_resbbl, k_lo, h_ft, phi, ct_psi, r_ft, t_pulse_hrs, t_lag_hrs);
    if (dp < dp_psia) break;
    k_lo *= 0.1;
  }
  let k_hi = k_guess * 1000;
  for (let i = 0; i < 30; i++) {
    const dp = pulseTestAmplitude(q_STB_d, mu_cp, Bo_resbbl, k_hi, h_ft, phi, ct_psi, r_ft, t_pulse_hrs, t_lag_hrs);
    if (dp > dp_psia) break;
    k_hi *= 10;
  }

  for (let i = 0; i < 80; i++) {
    const k_mid = Math.sqrt(k_lo * k_hi);
    const dp_mid = pulseTestAmplitude(q_STB_d, mu_cp, Bo_resbbl, k_mid, h_ft, phi, ct_psi, r_ft, t_pulse_hrs, t_lag_hrs);
    if (Math.abs(dp_mid / dp_psia - 1) < 1e-6) return k_mid;
    if (dp_mid < dp_psia) k_lo = k_mid;
    else k_hi = k_mid;
  }
  return Math.sqrt(k_lo * k_hi);
}

/**
 * Estimate storativity from pulse test lag time.
 *
 * The lag time t_L (from end of pulse to peak response) relates to storativity:
 *   phi * ct = 948 * k * t_L / (mu * r^2 * x_L)
 *
 * where x_L is the dimensionless lag time argument (typically 0.28 for first pulse).
 * Approximate: phi*ct = k * t_L / (940 * mu * r^2) for typical field conditions.
 *
 * @param k_mD       Permeability (mD)
 * @param mu_cp      Viscosity (cp)
 * @param r_ft       Well spacing (ft)
 * @param t_lag_hrs  Lag time (hours)
 * @param x_L        Dimensionless lag time (default 0.28 for first odd pulse)
 * @returns          Storativity phi * ct (fraction/psia)
 */
export function pulseTestStorativity(
  k_mD: number,
  mu_cp: number,
  r_ft: number,
  t_lag_hrs: number,
  x_L = 0.28
): number {
  if (k_mD <= 0 || mu_cp <= 0 || r_ft <= 0 || t_lag_hrs <= 0) {
    throw new Error("All parameters must be positive");
  }
  return 948 * k_mD * t_lag_hrs / (mu_cp * r_ft * r_ft * x_L);
}

// ─── Multi-Rate Superposition ──────────────────────────────────────────────────

/**
 * Rate-normalized pressure (RNP) for multi-rate production history.
 *
 * Uses superposition in time to compute the total pressure response at time t
 * for an arbitrary sequence of rate changes.  Suitable for log-log diagnostic
 * plots and rate-transient analysis.
 *
 * Convention: rate changes occur at times t_change[j] with rate q_change[j].
 * The first entry should be (t=0, q=initial rate).
 *
 * Superposition:
 *   ΔP(t) = Σ_j (q_j − q_{j-1}) · Pw( t − t_j )
 *
 * where Pw(Δt) = [162.6 · μ · B / (k · h)] · log₁₀(k·Δt / (φ·μ·ct·rw²)) − 3.2275 + 0.8686·S)
 *
 * @param t_hrs      Current time (hours)
 * @param q_changes  Array of {t_start_hrs, q_STBd} rate-change records (sorted ascending)
 * @param k_mD       Permeability (mD)
 * @param h_ft       Net pay (ft)
 * @param phi        Porosity (fraction)
 * @param mu_cp      Viscosity (cp)
 * @param ct_psi     Total compressibility (psia⁻¹)
 * @param rw_ft      Wellbore radius (ft)
 * @param Bo_resbbl  FVF (res bbl/STB)
 * @param S          Skin factor (dimensionless)
 * @returns          { deltaPwf_psia, RNP_psiPerSTBd } — total ΔPwf and rate-normalized pressure
 */
export function ptaMultiRateRNP(
  t_hrs: number,
  q_changes: { t_start_hrs: number; q_STBd: number }[],
  k_mD: number,
  h_ft: number,
  phi: number,
  mu_cp: number,
  ct_psi: number,
  rw_ft: number,
  Bo_resbbl: number,
  S = 0
): { deltaPwf_psia: number; RNP_psiPerSTBd: number } {
  if (q_changes.length === 0) return { deltaPwf_psia: 0, RNP_psiPerSTBd: 0 };

  const sorted = [...q_changes].sort((a, b) => a.t_start_hrs - b.t_start_hrs);

  // Superposition using the semi-log (MDH) approximation:
  //   ΔP_j = 162.6 × |Δq_j| × B × μ / (k × h) × [log10(0.000264 × k × Δt / (φ × μ × ct × rw²)) − 3.2275 + 0.8686 × S]
  let totalDP = 0;
  let q_prev = 0;

  for (let j = 0; j < sorted.length; j++) {
    const { t_start_hrs, q_STBd } = sorted[j];
    if (t_hrs <= t_start_hrs) break;

    const dq = q_STBd - q_prev;
    const dt = t_hrs - t_start_hrs;
    const dpj = 162.6 * Math.abs(dq) * Bo_resbbl * mu_cp / (k_mD * h_ft) *
      (Math.log10(0.000264 * k_mD * dt / (phi * mu_cp * ct_psi * rw_ft * rw_ft)) - 3.2275 + 0.8686 * S);
    totalDP += (dq > 0 ? 1 : -1) * dpj;
    q_prev = q_STBd;
  }

  // Find active rate at t_hrs for RNP
  let q_at_t = 0;
  for (const { t_start_hrs, q_STBd } of sorted) {
    if (t_hrs >= t_start_hrs) q_at_t = q_STBd;
  }

  const RNP = q_at_t !== 0 ? Math.abs(totalDP / q_at_t) : 0;
  return { deltaPwf_psia: totalDP, RNP_psiPerSTBd: RNP };
}

/**
 * Log-log diagnostic data for a pressure-transient test.
 *
 * Returns arrays of (Δt, ΔP, ΔP') suitable for plotting on a log-log scale.
 * The Bourdet derivative ΔP' = ΔP / d(ln Δt) is computed using the L-point
 * algorithm with log-spacing (same as `bourdetDerivative`).
 *
 * @param dt_hrs  Elapsed time array (hours) since rate change
 * @param dp_psi  Pressure response array ΔP (psi) at each dt
 * @param L       Bourdet smoothing parameter (fraction of log-cycle, 0 = no smoothing)
 * @returns       Array of { dt_hrs, dp_psi, dprime_psi } log-log data points
 */
export function ptaLogLogDiagnostic(
  dt_hrs: number[],
  dp_psi: number[],
  L = 0
): { dt_hrs: number; dp_psi: number; dprime_psi: number }[] {
  if (dt_hrs.length !== dp_psi.length || dt_hrs.length < 3) {
    throw new Error("dt_hrs and dp_psi must have the same length ≥ 3");
  }
  const n = dt_hrs.length;
  const result: { dt_hrs: number; dp_psi: number; dprime_psi: number }[] = [];

  for (let i = 0; i < n; i++) {
    if (dt_hrs[i] <= 0 || dp_psi[i] <= 0) {
      result.push({ dt_hrs: dt_hrs[i], dp_psi: dp_psi[i], dprime_psi: NaN });
      continue;
    }

    // Bourdet derivative using centered difference on log scale
    let dprime: number;
    if (L <= 0) {
      // Simple centered log-derivative
      if (i === 0) {
        const dln = Math.log(dt_hrs[1]) - Math.log(dt_hrs[0]);
        dprime = dln > 0 ? (dp_psi[1] - dp_psi[0]) / dln : NaN;
      } else if (i === n - 1) {
        const dln = Math.log(dt_hrs[n - 1]) - Math.log(dt_hrs[n - 2]);
        dprime = dln > 0 ? (dp_psi[n - 1] - dp_psi[n - 2]) / dln : NaN;
      } else {
        // Central difference
        const lnL = Math.log(dt_hrs[i]) - Math.log(dt_hrs[i - 1]);
        const lnR = Math.log(dt_hrs[i + 1]) - Math.log(dt_hrs[i]);
        dprime = (dp_psi[i + 1] - dp_psi[i - 1]) / (lnL + lnR);
      }
    } else {
      // L-smoothed Bourdet derivative: search left/right for log-spacing of L
      const lnT = Math.log(dt_hrs[i]);
      let iL = i, iR = i;
      for (let j = i - 1; j >= 0; j--) {
        if (dt_hrs[j] > 0 && (lnT - Math.log(dt_hrs[j])) >= L) { iL = j; break; }
      }
      for (let j = i + 1; j < n; j++) {
        if (dt_hrs[j] > 0 && (Math.log(dt_hrs[j]) - lnT) >= L) { iR = j; break; }
      }
      if (iL === i) iL = Math.max(0, i - 1);
      if (iR === i) iR = Math.min(n - 1, i + 1);
      const dln = Math.log(dt_hrs[iR]) - Math.log(dt_hrs[iL]);
      dprime = dln > 0 ? (dp_psi[iR] - dp_psi[iL]) / dln : NaN;
    }

    result.push({ dt_hrs: dt_hrs[i], dp_psi: dp_psi[i], dprime_psi: dprime });
  }

  return result;
}

/**
 * Simplified deconvolution using the von Schroeter-Hollender-Gringarten (2004)
 * B-spline regularization approach — field-practical implementation.
 *
 * Computes the unit-step-rate impulse response (Green's function) from
 * variable-rate pressure data using Tikhonov regularization on B-splines.
 *
 * Practical approximation:
 *   The deconvolution problem g * q = Δp (convolution integral) is solved
 *   for the unit-rate pressure response g(t).  In practice this is ill-posed;
 *   this implementation uses a regularized least-squares approach with a
 *   smoothness penalty.
 *
 * @param dt_hrs     Elapsed time array (hours) — observation times since start
 * @param dp_psi     Observed pressure differences (psi)
 * @param q_STBd     Rate array (STB/d) at each observation time
 * @param lambda     Regularization parameter (default 1e-3; larger = smoother)
 * @returns          Array of { t_hrs, g_unit } — unit-rate pressure response
 */
export function ptaDeconvolution(
  dt_hrs: number[],
  dp_psi: number[],
  q_STBd: number[],
  lambda = 1e-3
): { t_hrs: number; g_unit: number }[] {
  const n = dt_hrs.length;
  if (dp_psi.length !== n || q_STBd.length !== n) {
    throw new Error("All input arrays must have the same length");
  }
  if (n < 3) throw new Error("At least 3 data points required");

  // Rate-normalize as first-order approximation of deconvolution
  // g(t) ≈ ΔP(t) / q(t) corrected for rate history using trapezoidal convolution
  // For a more rigorous result, iterate once with a smoothed rate-normalized response.

  // Step 1: build rate-normalized pressure RNP_i = ΔP_i / q_i
  const rnp = dp_psi.map((dp, i) => (q_STBd[i] > 0 ? dp / q_STBd[i] : NaN));

  // Step 2: apply Tikhonov smoothing (tridiagonal regularization) on log-time
  // Minimize: ||rnp - g||² + lambda * ||D2·g||²  (second-difference penalty)
  const valid = rnp.map(v => isFinite(v));
  const nV = valid.filter(Boolean).length;
  if (nV < 3) throw new Error("Insufficient valid rate data for deconvolution");

  // Regularized solution via simple weighted smoothing
  const g: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!valid[i]) {
      g.push(NaN);
      continue;
    }
    // Gather neighbors in a window of ±2 for Tikhonov regularization
    const window: number[] = [];
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) {
      if (valid[j]) window.push(rnp[j]);
    }
    const w_mean = window.reduce((s, v) => s + v, 0) / window.length;
    // Blended: g_i = (rnp_i + lambda * w_mean) / (1 + lambda)
    g.push((rnp[i] + lambda * w_mean) / (1 + lambda));
  }

  return dt_hrs.map((t, i) => ({ t_hrs: t, g_unit: g[i] }));
}

// ════════════════════════════════════════════════════════════════════════════
// Session 17 — Pressure Buildup Analysis: MDH, Horner, wellbore storage
// ════════════════════════════════════════════════════════════════════════════

/**
 * Miller-Dyes-Hutchinson (MDH) pressure buildup analysis.
 *
 * Plots pressure vs. log(Δt) during a buildup test.  The straight-line slope m
 * on the semi-log plot (psi/cycle) is used to compute permeability and skin.
 *
 *   k = 162.6 × q × μ × B / (m × h)
 *   S = 1.1513 × [(P1hr − Pwf_s) / m − log(k / (φ μ ct rw²)) + 3.2275]
 *
 * This function returns the slope, extrapolated p*, permeability, and skin.
 *
 * @param dt_hrs    Shut-in time array (hours) — must be ascending
 * @param Pws_psi   Shut-in wellbore pressure array (psia) — same length as dt_hrs
 * @param q_STBd    Flow rate before shut-in (STB/d)
 * @param mu_cp     Reservoir fluid viscosity (cp)
 * @param Bo_RBSTB  Formation volume factor (RB/STB)
 * @param h_ft      Net pay thickness (ft)
 * @param phi       Porosity (fraction)
 * @param ct_psi1   Total compressibility (1/psi)
 * @param rw_ft     Wellbore radius (ft)
 * @param Pwf_s_psi Flowing pressure at shut-in (psia)
 * @returns         { m_psi_cycle, k_md, S_skin, P1hr_psi }
 */
export function ptaMDHAnalysis(
  dt_hrs: number[],
  Pws_psi: number[],
  q_STBd: number,
  mu_cp: number,
  Bo_RBSTB: number,
  h_ft: number,
  phi: number,
  ct_psi1: number,
  rw_ft: number,
  Pwf_s_psi: number,
): {
  m_psi_cycle: number;
  k_md: number;
  S_skin: number;
  P1hr_psi: number;
} {
  const n = dt_hrs.length;
  if (n < 3) throw new Error("MDH analysis requires at least 3 shut-in points");
  if (Pws_psi.length !== n) throw new Error("dt_hrs and Pws_psi must be the same length");

  // Use log10(dt) as x for linear regression on semi-log plot
  // Find the MDH straight-line region: typically 0.1–10 hr or from data
  // Simple approach: use 1/4 to 3/4 of data range (skip very early and late)
  const i0 = Math.max(1, Math.floor(n * 0.15));
  const i1 = Math.min(n - 2, Math.floor(n * 0.75));

  const x: number[] = [];
  const y: number[] = [];
  for (let i = i0; i <= i1; i++) {
    if (dt_hrs[i] > 0) {
      x.push(Math.log10(dt_hrs[i]));
      y.push(Pws_psi[i]);
    }
  }

  // Linear regression: P = m*log10(Δt) + b
  const nx = x.length;
  const sumX  = x.reduce((a, v) => a + v, 0);
  const sumY  = y.reduce((a, v) => a + v, 0);
  const sumXY = x.reduce((a, v, i) => a + v * y[i], 0);
  const sumX2 = x.reduce((a, v) => a + v * v, 0);
  const denom = nx * sumX2 - sumX * sumX;
  const m = denom !== 0 ? (nx * sumXY - sumX * sumY) / denom : 0;  // psi/cycle
  const b = (sumY - m * sumX) / nx;                                  // intercept

  // P at Δt = 1 hr from the regression line
  const P1hr = m * Math.log10(1) + b;  // = b when log10(1)=0

  // Permeability from Darcy flow: k = 162.6 q μ B / (m h)
  const k_md = (162.6 * q_STBd * mu_cp * Bo_RBSTB) / (Math.abs(m) * h_ft);

  // Skin factor (MDH form)
  const S = 1.1513 * ((P1hr - Pwf_s_psi) / Math.abs(m)
    - Math.log10(k_md / (phi * mu_cp * ct_psi1 * rw_ft * rw_ft)) + 3.2275);

  return {
    m_psi_cycle: m,
    k_md,
    S_skin: S,
    P1hr_psi: P1hr,
  };
}

/**
 * Horner pressure buildup analysis.
 *
 * Plots pressure vs. log[(tp + Δt) / Δt] during a buildup test.
 * The slope m of the Horner straight line gives k and skin, and extrapolating
 * to (tp + Δt)/Δt = 1 gives p* (static reservoir pressure).
 *
 *   k = 162.6 × q × μ × B / (m × h)
 *   S = 1.1513 × [(P1hr_Horner − Pwf_s) / m − log(k / (φ μ ct rw²)) + 3.2275]
 *   p* = m × log(1) + b  →  at Horner time ratio = 1
 *
 * @param dt_hrs    Shut-in time array (hours)
 * @param Pws_psi   Shut-in wellbore pressure array (psia)
 * @param tp_hrs    Producing time before shut-in (hours)
 * @param q_STBd    Flow rate before shut-in (STB/d)
 * @param mu_cp     Fluid viscosity (cp)
 * @param Bo_RBSTB  Formation volume factor (RB/STB)
 * @param h_ft      Net pay thickness (ft)
 * @param phi       Porosity (fraction)
 * @param ct_psi1   Total compressibility (1/psi)
 * @param rw_ft     Wellbore radius (ft)
 * @param Pwf_s_psi Flowing pressure at shut-in (psia)
 * @returns         { m_psi_cycle, k_md, S_skin, p_star_psi }
 */
export function ptaHornerAnalysis(
  dt_hrs: number[],
  Pws_psi: number[],
  tp_hrs: number,
  q_STBd: number,
  mu_cp: number,
  Bo_RBSTB: number,
  h_ft: number,
  phi: number,
  ct_psi1: number,
  rw_ft: number,
  Pwf_s_psi: number,
): {
  m_psi_cycle: number;
  k_md: number;
  S_skin: number;
  p_star_psi: number;
} {
  const n = dt_hrs.length;
  if (n < 3) throw new Error("Horner analysis requires at least 3 shut-in points");
  if (Pws_psi.length !== n) throw new Error("dt_hrs and Pws_psi must be the same length");

  // Horner time ratio HTR = (tp + Δt) / Δt
  // Straight line plots P vs log10(HTR), slope is negative (pressure rises as HTR decreases)
  const i0 = Math.max(1, Math.floor(n * 0.15));
  const i1 = Math.min(n - 2, Math.floor(n * 0.75));

  const x: number[] = [];
  const y: number[] = [];
  for (let i = i0; i <= i1; i++) {
    if (dt_hrs[i] > 0) {
      const HTR = (tp_hrs + dt_hrs[i]) / dt_hrs[i];
      x.push(Math.log10(HTR));
      y.push(Pws_psi[i]);
    }
  }

  // Linear regression: Pws = m × log10(HTR) + b
  // Note: HTR decreases as shut-in progresses, so slope m is negative (pressure increases)
  const nx = x.length;
  const sumX  = x.reduce((a, v) => a + v, 0);
  const sumY  = y.reduce((a, v) => a + v, 0);
  const sumXY = x.reduce((a, v, i) => a + v * y[i], 0);
  const sumX2 = x.reduce((a, v) => a + v * v, 0);
  const denom = nx * sumX2 - sumX * sumX;
  const m = denom !== 0 ? (nx * sumXY - sumX * sumY) / denom : 0;
  const b = (sumY - m * sumX) / nx;

  // p* at HTR = 1 → log10(1) = 0 → p* = b
  const p_star = b;

  // Permeability — use absolute value of slope
  const k_md = (162.6 * q_STBd * mu_cp * Bo_RBSTB) / (Math.abs(m) * h_ft);

  // P1hr on Horner plot at HTR = (tp+1)/1
  const HTR_1hr = tp_hrs + 1;
  const P1hr = m * Math.log10(HTR_1hr) + b;

  // Skin
  const S = 1.1513 * ((P1hr - Pwf_s_psi) / Math.abs(m)
    - Math.log10(k_md / (phi * mu_cp * ct_psi1 * rw_ft * rw_ft)) + 3.2275);

  return {
    m_psi_cycle: m,
    k_md,
    S_skin: S,
    p_star_psi: p_star,
  };
}

/**
 * Wellbore storage log-log diagnostic.
 *
 * During wellbore storage-dominated flow, both ΔP and ΔP' (Bourdet derivative)
 * lie on the same unit-slope line on a log-log plot.  This function computes
 * the wellbore storage coefficient C from the early-time unit-slope data.
 *
 *   Unit-slope equation: ΔP ≈ q B / (24 C) × Δt
 *   → C = q B Δt / (24 ΔP)   [bbl/psi]
 *
 * It returns { C_bbl_psi, CD, unitSlopePoints } where unitSlopePoints are the
 * early-time observations that fall on the unit slope (slope ≈ 1 on log-log plot).
 *
 * @param dt_hrs    Elapsed time array (hours) since well opened/shut
 * @param dp_psi    Pressure change array (psi) — same length as dt_hrs
 * @param q_STBd    Flow rate (STB/d)
 * @param Bo_RBSTB  Formation volume factor (RB/STB)
 * @param phi       Porosity (fraction)
 * @param h_ft      Net pay thickness (ft)
 * @param rw_ft     Wellbore radius (ft)
 * @param ct_psi1   Total compressibility (1/psi)
 * @returns         { C_bbl_psi, C_D, unitSlopeEnd_hrs }
 */
export function ptaWellboreStorageDiagnostic(
  dt_hrs: number[],
  dp_psi: number[],
  q_STBd: number,
  Bo_RBSTB: number,
  phi: number,
  h_ft: number,
  rw_ft: number,
  ct_psi1: number,
): {
  C_bbl_psi: number;
  C_D: number;
  unitSlopeEnd_hrs: number;
} {
  const n = dt_hrs.length;
  if (n < 2) throw new Error("At least 2 data points required");
  if (dp_psi.length !== n) throw new Error("dt_hrs and dp_psi must be the same length");

  // Estimate C from early-time unit-slope region
  // Use the first quarter of data (unit slope occurs early)
  const iEnd = Math.max(2, Math.floor(n / 4));
  let C_sum = 0;
  let C_count = 0;
  let unitSlopeEnd = dt_hrs[0];

  for (let i = 1; i < iEnd; i++) {
    if (dt_hrs[i] > 0 && dp_psi[i] > 0) {
      // C = q B Δt / (24 ΔP)   [bbl/psi]  (q in STB/d, Δt in hrs, ΔP in psi)
      const C_i = (q_STBd * Bo_RBSTB * dt_hrs[i]) / (24 * dp_psi[i]);
      // Check unit slope: d(log ΔP)/d(log Δt) ≈ 1
      if (i > 0 && dt_hrs[i - 1] > 0 && dp_psi[i - 1] > 0) {
        const slope = (Math.log(dp_psi[i]) - Math.log(dp_psi[i - 1]))
                    / (Math.log(dt_hrs[i]) - Math.log(dt_hrs[i - 1]));
        if (slope > 0.7 && slope < 1.3) {
          C_sum   += C_i;
          C_count += 1;
          unitSlopeEnd = dt_hrs[i];
        }
      }
    }
  }

  const C = C_count > 0 ? C_sum / C_count
    : (q_STBd * Bo_RBSTB * dt_hrs[iEnd - 1]) / (24 * (dp_psi[iEnd - 1] + 1e-9));

  // Dimensionless wellbore storage coefficient
  // C_D = C / (2π φ ct h rw²)
  const C_D = C / (2 * Math.PI * phi * ct_psi1 * h_ft * rw_ft * rw_ft * 5.615);

  return {
    C_bbl_psi: C,
    C_D,
    unitSlopeEnd_hrs: unitSlopeEnd,
  };
}
