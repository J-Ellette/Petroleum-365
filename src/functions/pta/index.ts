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
