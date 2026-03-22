/**
 * P365 — Decline Curve Analysis (DCA)
 *
 * Classic Arps models (exponential, hyperbolic, modified hyperbolic) and
 * Duong model for unconventional reservoirs.
 *
 * Time units: consistent (months or years — user's choice, must be consistent).
 * Rate units: any volumetric rate (Mcf/d, bbl/d, MMcf/d — user's choice).
 */

// ─── Arps Decline ────────────────────────────────────────────────────────────

/**
 * Arps hyperbolic decline rate at time t.
 * If b = 0 → exponential; if b = 1 → harmonic.
 *
 * @param Qi  Initial rate at t = 0
 * @param Di  Initial nominal decline rate (1/time, e.g. 1/month)
 * @param b   Hyperbolic exponent (0 ≤ b ≤ 2)
 * @param t   Time (same unit as Di)
 * @returns Rate at time t
 */
export function arpsRate(Qi: number, Di: number, b: number, t: number): number {
  if (b === 0) {
    return Qi * Math.exp(-Di * t);
  }
  return Qi / Math.pow(1 + b * Di * t, 1 / b);
}

/**
 * Arps hyperbolic cumulative production from t=0 to t.
 *
 * @param Qi  Initial rate
 * @param Di  Initial nominal decline rate (1/time)
 * @param b   Hyperbolic exponent
 * @param t   Time
 * @returns Cumulative production
 */
export function arpsCumulative(Qi: number, Di: number, b: number, t: number): number {
  if (b === 0) {
    return (Qi / Di) * (1 - Math.exp(-Di * t));
  }
  if (Math.abs(b - 1) < 1e-10) {
    // Harmonic
    return (Qi / Di) * Math.log(1 + Di * t);
  }
  return (Qi / ((1 - b) * Di)) * (1 - Math.pow(1 + b * Di * t, (b - 1) / b));
}

/**
 * Convert effective annual decline rate to nominal decline rate.
 *
 * @param De  Effective annual decline rate (fraction, e.g. 0.20 = 20%/year)
 * @param b   Hyperbolic exponent
 * @returns   Di nominal decline (1/year)
 */
export function effectiveToNominalDecline(De: number, b: number): number {
  if (b === 0) {
    return -Math.log(1 - De);
  }
  return (Math.pow(1 - De, -b) - 1) / b;
}

/**
 * Convert nominal decline rate to effective annual decline rate.
 *
 * @param Di  Nominal decline rate (1/year)
 * @param b   Hyperbolic exponent
 * @returns   De effective annual decline (fraction)
 */
export function nominalToEffectiveDecline(Di: number, b: number): number {
  if (b === 0) {
    return 1 - Math.exp(-Di);
  }
  return 1 - Math.pow(1 + b * Di, -1 / b);
}

// ─── Modified Hyperbolic Decline ──────────────────────────────────────────────

/**
 * Modified hyperbolic decline: hyperbolic until D_i drops to D_term,
 * then switches to exponential. Prevents unrealistic EUR for high b-factors.
 *
 * @param Qi     Initial rate
 * @param Di     Initial nominal decline rate
 * @param b      Hyperbolic exponent
 * @param Dterm  Terminal decline rate (switches to exponential below this)
 * @param t      Time
 * @returns Rate at time t
 */
export function modifiedHyperbolicRate(
  Qi: number,
  Di: number,
  b: number,
  Dterm: number,
  t: number
): number {
  // Time when D(t) = Dterm: Di / (1 + b*Di*t_switch)^(1+1/b) = ... 
  // Actually: Di(t) = Di / (1 + b*Di*t) → t_switch = (Di/Dterm - 1) / (b*Di)
  const tSwitch = (Di / Dterm - 1) / (b * Di);

  if (t <= tSwitch) {
    return arpsRate(Qi, Di, b, t);
  }
  // Rate at switch point
  const Qswitch = arpsRate(Qi, Di, b, tSwitch);
  // Exponential from switch point
  return Qswitch * Math.exp(-Dterm * (t - tSwitch));
}

/**
 * Modified hyperbolic cumulative production.
 *
 * @param Qi     Initial rate
 * @param Di     Initial nominal decline rate
 * @param b      Hyperbolic exponent
 * @param Dterm  Terminal decline rate
 * @param t      Time
 * @returns Cumulative production
 */
export function modifiedHyperbolicCumulative(
  Qi: number,
  Di: number,
  b: number,
  Dterm: number,
  t: number
): number {
  const tSwitch = (Di / Dterm - 1) / (b * Di);

  if (t <= tSwitch) {
    return arpsCumulative(Qi, Di, b, t);
  }
  const Qswitch = arpsRate(Qi, Di, b, tSwitch);
  const cumSwitch = arpsCumulative(Qi, Di, b, tSwitch);
  // Exponential cumulative from switch
  return cumSwitch + (Qswitch / Dterm) * (1 - Math.exp(-Dterm * (t - tSwitch)));
}

// ─── Duong Decline (Unconventional) ──────────────────────────────────────────

/**
 * Duong decline rate at time t.
 * Designed for transient linear flow in tight/shale reservoirs.
 * Reference: Duong (2011), SPE-137748.
 *
 * Model: q(t) = q1 * t^(-m) * exp(a/(1-m) * (t^(1-m) - 1))
 *
 * @param q1  Rate coefficient (rate at t = 1)
 * @param a   Exponential coefficient
 * @param m   Power-law exponent (typically 1.0–1.2)
 * @param t   Time (must be > 0)
 * @returns Rate at time t
 */
export function duongRate(q1: number, a: number, m: number, t: number): number {
  if (t <= 0) return q1;
  return q1 * Math.pow(t, -m) * Math.exp((a / (1 - m)) * (Math.pow(t, 1 - m) - 1));
}

/**
 * Duong cumulative production from 0 to t (numerical integration via Simpson's rule).
 *
 * @param q1   Rate coefficient
 * @param a    Exponential coefficient
 * @param m    Power-law exponent
 * @param t    Time (> 0)
 * @param nSteps Number of integration steps (default 1000)
 * @returns Cumulative production
 */
export function duongCumulative(
  q1: number,
  a: number,
  m: number,
  t: number,
  nSteps = 1000
): number {
  if (t <= 0) return 0;
  const dt = t / nSteps;
  let sum = 0;
  for (let i = 0; i < nSteps; i++) {
    const t0 = (i + 0) * dt;
    const t1 = (i + 0.5) * dt;
    const t2 = (i + 1) * dt;
    const q0 = t0 <= 0 ? duongRate(q1, a, m, 1e-9) : duongRate(q1, a, m, t0);
    const q1v = duongRate(q1, a, m, t1);
    const q2 = duongRate(q1, a, m, t2);
    sum += (dt / 6) * (q0 + 4 * q1v + q2);
  }
  return sum;
}

// ─── Curve Fitting (Levenberg-Marquardt style) ───────────────────────────────

/**
 * Fit Arps decline parameters [Qi, Di, b] to production history.
 * Uses simple gradient descent with numerical Jacobian.
 *
 * @param times  Array of time values
 * @param rates  Array of rate values (same length as times)
 * @returns [Qi, Di, b] best-fit parameters
 */
export function arpsFit(times: number[], rates: number[]): [number, number, number] {
  if (times.length !== rates.length || times.length < 3) {
    throw new Error("Need at least 3 data points for Arps fit");
  }

  // Initial guesses
  let Qi = rates[0];
  let Di = 0.1;
  let b = 0.5;

  const maxIter = 10000;
  let lr = 1e-4;
  const minLr = 1e-12;

  function residualSum(qi: number, di: number, bv: number): number {
    let sse = 0;
    for (let i = 0; i < times.length; i++) {
      const pred = arpsRate(qi, di, bv, times[i]);
      const r = rates[i] - pred;
      sse += r * r;
    }
    return sse;
  }

  let prevSSE = residualSum(Qi, Di, b);

  for (let iter = 0; iter < maxIter; iter++) {
    // Numerical gradient
    const eps = 1e-7;
    const dQi = (residualSum(Qi + eps, Di, b) - residualSum(Qi - eps, Di, b)) / (2 * eps);
    const dDi = (residualSum(Qi, Di + eps, b) - residualSum(Qi, Di - eps, b)) / (2 * eps);
    const db  = (residualSum(Qi, Di, b + eps) - residualSum(Qi, Di, b - eps)) / (2 * eps);

    const newQi = Qi - lr * dQi;
    const newDi = Math.max(1e-9, Di - lr * dDi);
    const newB  = Math.max(0, Math.min(2, b - lr * db));

    const newSSE = residualSum(newQi, newDi, newB);
    if (newSSE < prevSSE) {
      Qi = newQi;
      Di = newDi;
      b = newB;
      prevSSE = newSSE;
      lr *= 1.05;
    } else {
      lr *= 0.5;
      if (lr < minLr) break;
    }
  }

  return [Qi, Di, b];
}

/**
 * Fit Duong decline parameters [q1, a, m] to production history.
 *
 * @param times  Array of time values (> 0)
 * @param rates  Array of rate values
 * @returns [q1, a, m] best-fit Duong parameters
 */
export function duongFit(times: number[], rates: number[]): [number, number, number] {
  if (times.length !== rates.length || times.length < 3) {
    throw new Error("Need at least 3 data points for Duong fit");
  }

  let q1 = rates[0];
  let a = 0.5;
  let m = 1.1;

  const maxIter = 5000;
  let lr = 1e-5;
  const minLr = 1e-12;

  function residualSum(q1v: number, av: number, mv: number): number {
    let sse = 0;
    for (let i = 0; i < times.length; i++) {
      const pred = duongRate(q1v, av, mv, times[i]);
      const r = rates[i] - pred;
      sse += r * r;
    }
    return sse;
  }

  let prevSSE = residualSum(q1, a, m);

  for (let iter = 0; iter < maxIter; iter++) {
    const eps = 1e-7;
    const dq1 = (residualSum(q1 + eps, a, m) - residualSum(q1 - eps, a, m)) / (2 * eps);
    const da  = (residualSum(q1, a + eps, m) - residualSum(q1, a - eps, m)) / (2 * eps);
    const dm  = (residualSum(q1, a, m + eps) - residualSum(q1, a, m - eps)) / (2 * eps);

    const nq1 = Math.max(1e-9, q1 - lr * dq1);
    const na  = Math.max(1e-9, a - lr * da);
    const nm  = Math.max(0.5, Math.min(2, m - lr * dm));

    const newSSE = residualSum(nq1, na, nm);
    if (newSSE < prevSSE) {
      q1 = nq1; a = na; m = nm;
      prevSSE = newSSE;
      lr *= 1.05;
    } else {
      lr *= 0.5;
      if (lr < minLr) break;
    }
  }

  return [q1, a, m];
}

// ─── EUR calculation ──────────────────────────────────────────────────────────

/**
 * Estimate Ultimate Recovery (EUR) from Arps decline to an economic limit.
 *
 * @param Qi      Initial rate
 * @param Di      Initial nominal decline rate
 * @param b       Hyperbolic exponent
 * @param Dterm   Terminal decline (for modified hyperbolic; set = Di for pure hyperbolic)
 * @param qLimit  Economic limit rate (same units as Qi)
 * @param useModifiedHyperbolic Apply modified hyperbolic transition
 * @returns EUR (cumulative at economic limit)
 */
export function arpsEUR(
  Qi: number,
  Di: number,
  b: number,
  qLimit: number,
  Dterm = Di,
  useModifiedHyperbolic = true
): number {
  // Time to reach economic limit
  let tLimit: number;

  if (useModifiedHyperbolic && b > 0) {
    const tSwitch = (Di / Dterm - 1) / (b * Di);
    const Qswitch = arpsRate(Qi, Di, b, tSwitch);
    if (qLimit <= Qswitch) {
      // Economic limit is in the exponential tail
      tLimit = tSwitch + Math.log(Qswitch / qLimit) / Dterm;
      return modifiedHyperbolicCumulative(Qi, Di, b, Dterm, tLimit);
    } else {
      // Economic limit is in hyperbolic phase
      tLimit = (Math.pow(Qi / qLimit, b) - 1) / (b * Di);
      return modifiedHyperbolicCumulative(Qi, Di, b, Dterm, tLimit);
    }
  }

  if (b === 0) {
    tLimit = Math.log(Qi / qLimit) / Di;
    return arpsCumulative(Qi, Di, 0, tLimit);
  }
  tLimit = (Math.pow(Qi / qLimit, b) - 1) / (b * Di);
  return arpsCumulative(Qi, Di, b, tLimit);
}
