/**
 * P365 — Decline Curve Analysis (DCA)
 *
 * Classic Arps models (exponential, hyperbolic, modified hyperbolic),
 * Duong, PLE, SEPD, LGM, Transient Hyperbolic, Extended Exponential,
 * Ansah-Knowles-Buba (AKB), and diagnostic / data-QC utilities.
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

// ─── Power Law Exponential (PLE) Decline ─────────────────────────────────────

/**
 * Power Law Exponential (PLE) decline rate at time t.
 *
 * q(t) = qi · exp(−D∞·t − (Di/n)·t^n)
 *
 * @param t     Time (consistent units)
 * @param q_i   Initial rate at t = 0
 * @param D_inf Terminal (infinite-time) decline rate (1/time)
 * @param D_i   Initial decline rate coefficient
 * @param n     Time exponent (0 < n < 1 for unconventional wells)
 * @returns     Rate at time t
 */
export function pleRate(t: number, q_i: number, D_inf: number, D_i: number, n: number): number {
  return q_i * Math.exp(-D_inf * t - (D_i / n) * Math.pow(t, n));
}

/**
 * Power Law Exponential (PLE) cumulative production from t = 0 to t.
 *
 * Computed by trapezoidal numerical integration (1000 steps).
 *
 * @param t     Time (consistent units)
 * @param q_i   Initial rate at t = 0
 * @param D_inf Terminal decline rate (1/time)
 * @param D_i   Initial decline rate coefficient
 * @param n     Time exponent
 * @returns     Cumulative production from 0 to t
 */
export function pleCumulative(t: number, q_i: number, D_inf: number, D_i: number, n: number): number {
  if (t <= 0) return 0;
  const steps = 1000;
  const dt = t / steps;
  let cum = 0;
  let q_prev = pleRate(0, q_i, D_inf, D_i, n);
  for (let i = 1; i <= steps; i++) {
    const ti = i * dt;
    const q_curr = pleRate(ti, q_i, D_inf, D_i, n);
    cum += 0.5 * (q_prev + q_curr) * dt;
    q_prev = q_curr;
  }
  return cum;
}

// ─── Stretched Exponential PD (SEPD) Decline ─────────────────────────────────

/**
 * Stretched Exponential Production Decline (SEPD) rate at time t.
 *
 * q(t) = qi · exp(−(t/τ)^n)
 *
 * @param t    Time (consistent units)
 * @param q_i  Initial rate at t = 0
 * @param tau  Characteristic time constant (same units as t)
 * @param n    Stretching exponent (0 < n ≤ 1)
 * @returns    Rate at time t
 */
export function sepdRate(t: number, q_i: number, tau: number, n: number): number {
  return q_i * Math.exp(-Math.pow(t / tau, n));
}

/**
 * Stretched Exponential Production Decline (SEPD) cumulative production.
 *
 * Computed by trapezoidal numerical integration (1000 steps).
 *
 * @param t    Time
 * @param q_i  Initial rate
 * @param tau  Characteristic time
 * @param n    Stretching exponent
 * @returns    Cumulative production from 0 to t
 */
export function sepdCumulative(t: number, q_i: number, tau: number, n: number): number {
  if (t <= 0) return 0;
  const steps = 1000;
  const dt = t / steps;
  let cum = 0;
  let q_prev = sepdRate(0, q_i, tau, n);
  for (let i = 1; i <= steps; i++) {
    const ti = i * dt;
    const q_curr = sepdRate(ti, q_i, tau, n);
    cum += 0.5 * (q_prev + q_curr) * dt;
    q_prev = q_curr;
  }
  return cum;
}

// ─── Logistic Growth Model (LGM) ─────────────────────────────────────────────

/**
 * Logistic Growth Model (LGM) instantaneous rate at time t.
 *
 * q(t) = K·a·n·t^(n−1) / (a + t^n)²
 *
 * @param t  Time (> 0)
 * @param K  Carrying capacity / EUR (same units as cumulative production)
 * @param a  Time scaling parameter
 * @param n  Hyperbolic exponent (> 0)
 * @returns  Rate at time t
 */
export function lgmRate(t: number, K: number, a: number, n: number): number {
  if (t <= 0) return 0;
  const tn = Math.pow(t, n);
  const denom = (a + tn) * (a + tn);
  return K * a * n * Math.pow(t, n - 1) / denom;
}

/**
 * Logistic Growth Model (LGM) cumulative production at time t.
 *
 * N(t) = K · t^n / (a + t^n)
 *
 * @param t  Time (> 0)
 * @param K  Carrying capacity / EUR
 * @param a  Time scaling parameter
 * @param n  Hyperbolic exponent
 * @returns  Cumulative production at time t
 */
export function lgmCumulative(t: number, K: number, a: number, n: number): number {
  if (t <= 0) return 0;
  const tn = Math.pow(t, n);
  return K * tn / (a + tn);
}

/**
 * Estimate Ultimate Recovery (EUR) for the Logistic Growth Model.
 *
 * For LGM, EUR = K (carrying capacity as t → ∞).
 *
 * @param K  Carrying capacity parameter
 * @returns  EUR = K
 */
export function lgmEUR(K: number): number {
  return K;
}

// ─── Transient Hyperbolic Decline ─────────────────────────────────────────────
// Physically motivated for unconventional wells: during transient linear flow
// b ≈ 2.0; transitions to exponential at terminal decline rate Dterm.
// Identical math to modified hyperbolic but explicitly allows b > 1.

/**
 * Transient Hyperbolic rate at time t.
 *
 * Uses Arps hyperbolic (b may be > 1 for transient flow) transitioning to
 * exponential at terminal decline rate Dterm.
 *
 * @param t      Time (same unit as Di)
 * @param qi     Initial rate at t = 0
 * @param Di     Initial nominal decline rate (1/time)
 * @param b      Hyperbolic exponent (typically 1.5–2.0 during transient)
 * @param Dterm  Terminal exponential decline rate (1/time; D switches here)
 * @returns      Rate at time t
 */
export function thRate(
  t: number,
  qi: number,
  Di: number,
  b: number,
  Dterm: number
): number {
  const tSwitch = b > 0 ? (Di / Dterm - 1) / (b * Di) : Infinity;
  if (t <= tSwitch) {
    return qi / Math.pow(1 + b * Di * t, 1 / b);
  }
  const qSwitch = qi / Math.pow(1 + b * Di * tSwitch, 1 / b);
  return qSwitch * Math.exp(-Dterm * (t - tSwitch));
}

/**
 * Transient Hyperbolic cumulative production from t = 0 to t.
 *
 * @param t      Time
 * @param qi     Initial rate
 * @param Di     Initial nominal decline rate
 * @param b      Hyperbolic exponent
 * @param Dterm  Terminal exponential decline rate
 * @returns      Cumulative production
 */
export function thCumulative(
  t: number,
  qi: number,
  Di: number,
  b: number,
  Dterm: number
): number {
  if (t <= 0) return 0;
  const tSwitch = b > 0 ? (Di / Dterm - 1) / (b * Di) : Infinity;
  if (t <= tSwitch) {
    // Pure hyperbolic phase
    if (b === 1) return (qi / Di) * Math.log(1 + Di * t);
    return (qi / ((1 - b) * Di)) * (1 - Math.pow(1 + b * Di * t, (b - 1) / b));
  }
  // Cumulative through switch point + exponential tail
  const cumSwitch = b === 1
    ? (qi / Di) * Math.log(1 + Di * tSwitch)
    : (qi / ((1 - b) * Di)) * (1 - Math.pow(1 + b * Di * tSwitch, (b - 1) / b));
  const qSwitch = qi / Math.pow(1 + b * Di * tSwitch, 1 / b);
  return cumSwitch + (qSwitch / Dterm) * (1 - Math.exp(-Dterm * (t - tSwitch)));
}

/**
 * Time at which the Transient Hyperbolic switches to exponential.
 *
 * @param Di     Initial nominal decline rate
 * @param b      Hyperbolic exponent
 * @param Dterm  Terminal exponential decline rate
 * @returns      Switch time (same units as Di)
 */
export function thSwitchTime(Di: number, b: number, Dterm: number): number {
  if (b <= 0) return Infinity;
  return (Di / Dterm - 1) / (b * Di);
}

/**
 * EUR for Transient Hyperbolic model to an economic limit.
 *
 * @param qi     Initial rate
 * @param Di     Initial nominal decline rate
 * @param b      Hyperbolic exponent
 * @param Dterm  Terminal decline rate
 * @param qLim   Economic limit rate
 * @returns      EUR
 */
export function thEUR(
  qi: number,
  Di: number,
  b: number,
  Dterm: number,
  qLim: number
): number {
  const tSwitch = thSwitchTime(Di, b, Dterm);
  const qSwitch = thRate(tSwitch, qi, Di, b, Dterm);
  if (qLim >= qSwitch) {
    // Economic limit in hyperbolic phase
    const tLim = (Math.pow(qi / qLim, b) - 1) / (b * Di);
    return thCumulative(tLim, qi, Di, b, Dterm);
  }
  // Economic limit in exponential tail
  const tLim = tSwitch + Math.log(qSwitch / qLim) / Dterm;
  return thCumulative(tLim, qi, Di, b, Dterm);
}

// ─── Extended Exponential (Biexponential) Decline ────────────────────────────
// Captures two flow speeds: fast early decline (D_fast) + slow late decline
// (D_slow). f = fraction of initial rate on the fast component.

/**
 * Extended Exponential (biexponential) rate at time t.
 *
 * q(t) = qi · [ f·exp(−D_fast·t) + (1−f)·exp(−D_slow·t) ]
 *
 * @param t       Time
 * @param qi      Initial rate at t = 0
 * @param f       Fast-component fraction (0 < f < 1)
 * @param D_fast  Fast initial decline rate (1/time)
 * @param D_slow  Slow terminal decline rate (1/time); D_slow < D_fast
 * @returns       Rate at time t
 */
export function eeRate(
  t: number,
  qi: number,
  f: number,
  D_fast: number,
  D_slow: number
): number {
  return qi * (f * Math.exp(-D_fast * t) + (1 - f) * Math.exp(-D_slow * t));
}

/**
 * Extended Exponential cumulative production from t = 0 to t.
 *
 * N(t) = qi · [ f/D_fast·(1−exp(−D_fast·t)) + (1−f)/D_slow·(1−exp(−D_slow·t)) ]
 *
 * @param t       Time
 * @param qi      Initial rate
 * @param f       Fast-component fraction
 * @param D_fast  Fast decline rate
 * @param D_slow  Slow decline rate
 * @returns       Cumulative production
 */
export function eeCumulative(
  t: number,
  qi: number,
  f: number,
  D_fast: number,
  D_slow: number
): number {
  if (t <= 0) return 0;
  const fast = D_fast > 0 ? (f / D_fast) * (1 - Math.exp(-D_fast * t)) : f * t;
  const slow = D_slow > 0 ? ((1 - f) / D_slow) * (1 - Math.exp(-D_slow * t)) : (1 - f) * t;
  return qi * (fast + slow);
}

/**
 * Extended Exponential EUR to economic limit.
 *
 * Solved by bisection on the rate equation to find time at economic limit.
 *
 * @param qi      Initial rate
 * @param f       Fast-component fraction
 * @param D_fast  Fast decline rate
 * @param D_slow  Slow decline rate
 * @param qLim    Economic limit rate
 * @returns       EUR
 */
export function eeEUR(
  qi: number,
  f: number,
  D_fast: number,
  D_slow: number,
  qLim: number
): number {
  // Find tLimit by bisection
  let lo = 0;
  let hi = 1e6;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (eeRate(mid, qi, f, D_fast, D_slow) > qLim) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-6) break;
  }
  return eeCumulative((lo + hi) / 2, qi, f, D_fast, D_slow);
}

// ─── Ansah-Knowles-Buba (AKB) Decline ────────────────────────────────────────
// Generalized power-law decline model (Ansah, Knowles & Buba 1996).
// AKB rate: q(t) = qi · [1 + (K−1)·Di·t]^(−1/(K−1))
// K = 1 → exponential; K = 2 → harmonic (Arps b=1); K > 2 → hyperbolic b > 1.

/**
 * Ansah-Knowles-Buba (AKB) decline rate at time t.
 *
 * q(t) = qi · [1 + (K−1)·Di·t]^(−1/(K−1))
 *
 * @param t   Time (same unit as Di)
 * @param qi  Initial rate at t = 0
 * @param Di  Initial nominal decline rate (1/time)
 * @param K   Generalized decline exponent (K ≥ 1; K=1 → exponential)
 * @returns   Rate at time t
 */
export function akbRate(t: number, qi: number, Di: number, K: number): number {
  if (Math.abs(K - 1) < 1e-10) {
    // Exponential limit
    return qi * Math.exp(-Di * t);
  }
  const base = 1 + (K - 1) * Di * t;
  return base > 0 ? qi * Math.pow(base, -1 / (K - 1)) : 0;
}

/**
 * Ansah-Knowles-Buba (AKB) cumulative production from t = 0 to t.
 *
 * N(t) = qi / [(2−K)·Di] · { 1 − [1 + (K−1)·Di·t]^((K−2)/(K−1)) }
 * Special cases: K=1 → exponential; K=2 → harmonic.
 *
 * @param t   Time
 * @param qi  Initial rate
 * @param Di  Initial nominal decline rate
 * @param K   Generalized decline exponent
 * @returns   Cumulative production
 */
export function akbCumulative(t: number, qi: number, Di: number, K: number): number {
  if (t <= 0) return 0;
  if (Math.abs(K - 1) < 1e-10) {
    // Exponential
    return (qi / Di) * (1 - Math.exp(-Di * t));
  }
  if (Math.abs(K - 2) < 1e-10) {
    // Harmonic (K=2)
    return (qi / Di) * Math.log(1 + Di * t);
  }
  const base = 1 + (K - 1) * Di * t;
  return (qi / ((2 - K) * Di)) * (1 - Math.pow(base, (K - 2) / (K - 1)));
}

/**
 * Ansah-Knowles-Buba (AKB) EUR to economic limit.
 *
 * @param qi    Initial rate
 * @param Di    Initial nominal decline rate
 * @param K     Generalized decline exponent
 * @param qLim  Economic limit rate
 * @returns     EUR
 */
export function akbEUR(qi: number, Di: number, K: number, qLim: number): number {
  let tLim: number;
  if (Math.abs(K - 1) < 1e-10) {
    tLim = Math.log(qi / qLim) / Di;
  } else {
    // Invert: [1 + (K-1)*Di*t]^(1/(K-1)) = qi/qLim
    const ratio = Math.pow(qi / qLim, K - 1);
    tLim = (ratio - 1) / ((K - 1) * Di);
  }
  return akbCumulative(tLim, qi, Di, K);
}

// ─── DCA Diagnostic Utilities ─────────────────────────────────────────────────

/**
 * Instantaneous nominal decline rate D(t) estimated from rate-time data.
 *
 * D_i ≈ −Δln(q) / Δt at each interior point.
 * Returns an array of [time, D] pairs (length = data.length − 1).
 *
 * @param t_arr  Array of times (must be ascending, same length as q_arr)
 * @param q_arr  Array of rates
 * @returns      Array of [time_midpoint, D] pairs
 */
export function dcaDeclineRate(
  t_arr: number[],
  q_arr: number[]
): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  const n = Math.min(t_arr.length, q_arr.length);
  for (let i = 1; i < n; i++) {
    const dt = t_arr[i] - t_arr[i - 1];
    if (dt <= 0 || q_arr[i] <= 0 || q_arr[i - 1] <= 0) continue;
    const D = -Math.log(q_arr[i] / q_arr[i - 1]) / dt;
    result.push([(t_arr[i] + t_arr[i - 1]) / 2, D]);
  }
  return result;
}

/**
 * Instantaneous Arps b-factor estimated from rate-time data.
 *
 * b(t) = −d(1/D) / dt = (D_i−1 − D_i) / (D_i · D_i−1 · Δt)
 * Returns an array of [time, b] pairs (length = data.length − 2).
 *
 * @param t_arr  Array of times (ascending)
 * @param q_arr  Array of rates
 * @returns      Array of [time_midpoint, b] pairs
 */
export function dcaBFactor(
  t_arr: number[],
  q_arr: number[]
): Array<[number, number]> {
  const D_pairs = dcaDeclineRate(t_arr, q_arr);
  const result: Array<[number, number]> = [];
  for (let i = 1; i < D_pairs.length; i++) {
    const [t1, D1] = D_pairs[i - 1];
    const [t2, D2] = D_pairs[i];
    const dt = t2 - t1;
    if (dt <= 0 || D1 <= 0 || D2 <= 0) continue;
    // b = -d(1/D)/dt ≈ (1/D2 - 1/D1) / dt  ... nope, b = -dD/dt / D^2
    // Accurate formula: b ≈ -(D2 - D1) / (D_avg^2 * dt)
    const D_avg = (D1 + D2) / 2;
    const b = -(D2 - D1) / (D_avg * D_avg * dt);
    result.push([(t1 + t2) / 2, b]);
  }
  return result;
}

/**
 * Log-log derivative of rate w.r.t. time: d(log q) / d(log t).
 *
 * Used for flow-regime identification: slope = −0.5 → transient linear flow;
 * slope → 0 → BDF (boundary-dominated flow).
 *
 * Returns an array of [time_midpoint, slope] pairs.
 *
 * @param t_arr  Array of times (> 0, ascending)
 * @param q_arr  Array of rates (> 0)
 * @returns      Array of [time_mid, d(log q)/d(log t)] pairs
 */
export function dcaLogLogDerivative(
  t_arr: number[],
  q_arr: number[]
): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  const n = Math.min(t_arr.length, q_arr.length);
  for (let i = 1; i < n; i++) {
    const t1 = t_arr[i - 1], t2 = t_arr[i];
    const q1 = q_arr[i - 1], q2 = q_arr[i];
    if (t1 <= 0 || t2 <= t1 || q1 <= 0 || q2 <= 0) continue;
    const slope = Math.log(q2 / q1) / Math.log(t2 / t1);
    result.push([Math.sqrt(t1 * t2), slope]);
  }
  return result;
}

/**
 * Classify flow regime from an estimated b-factor.
 *
 * @param b_estimated  Observed Arps b-factor
 * @returns            Flow regime description string
 */
export function dcaFlowRegimeFromB(b_estimated: number): string {
  if (b_estimated < 0.05)         return "Exponential (BDF gas/liquid)";
  if (b_estimated < 0.5)          return "Hyperbolic BDF (conventional)";
  if (b_estimated < 1.05)         return "Harmonic / pseudo-steady-state";
  if (b_estimated < 1.55)         return "Bilinear transient flow";
  if (b_estimated < 2.1)          return "Transient linear flow (unconventional)";
  return "Transient spherical/radial (b > 2 — check data quality)";
}

// ─── DCA Data Quality Control ─────────────────────────────────────────────────

/**
 * Rolling Z-score for outlier detection in production rate data.
 *
 * Uses a leave-one-out approach: for each point, the local mean and std are
 * computed from the ±half_window neighbours (excluding the point itself) to
 * prevent contamination of the window statistics by the outlier.
 * Returns the absolute Z-score at each point.
 *
 * @param q_arr       Array of production rates
 * @param half_window Number of points on each side of centre (default 3)
 * @returns           Array of absolute Z-scores (same length as q_arr)
 */
export function dcaRollingZScore(
  q_arr: number[],
  half_window = 3
): number[] {
  const n = q_arr.length;
  const z: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half_window);
    const hi = Math.min(n - 1, i + half_window);
    // Exclude the current point (leave-one-out) to avoid contamination
    const others = [...q_arr.slice(lo, i), ...q_arr.slice(i + 1, hi + 1)];
    if (others.length === 0) continue;
    const mean = others.reduce((s, v) => s + v, 0) / others.length;
    const variance = others.reduce((s, v) => s + (v - mean) ** 2, 0) / others.length;
    const std = Math.sqrt(variance);
    z[i] = std > 0 ? Math.abs(q_arr[i] - mean) / std : 0;
  }
  return z;
}

/**
 * Remove production outliers using rolling Z-score.
 *
 * Points with |Z| > threshold are filtered out.
 *
 * @param t_arr     Array of times
 * @param q_arr     Array of production rates
 * @param threshold Z-score threshold (default 2.5)
 * @param window    Half-window for rolling Z-score (default 3)
 * @returns         Object with cleaned { t, q } arrays
 */
export function dcaCleanProduction(
  t_arr: number[],
  q_arr: number[],
  threshold = 2.5,
  window = 3
): { t: number[]; q: number[] } {
  const z = dcaRollingZScore(q_arr, window);
  const t_clean: number[] = [];
  const q_clean: number[] = [];
  const n = Math.min(t_arr.length, q_arr.length);
  for (let i = 0; i < n; i++) {
    if (z[i] <= threshold) {
      t_clean.push(t_arr[i]);
      q_clean.push(q_arr[i]);
    }
  }
  return { t: t_clean, q: q_clean };
}

/**
 * Normalize production rates by flowing bottomhole pressure drawdown.
 *
 * q_norm(t) = q(t) / (BHP_i − BHP(t))
 * Removes pressure transient effects for better DCA fitting.
 *
 * @param q_arr    Array of production rates
 * @param bhp_arr  Array of FBHP at each time step
 * @param bhp_i    Initial / reference BHP (psia); typically BHP at t = 0
 * @returns        Array of normalized rates (rate / drawdown)
 */
export function dcaRateNormalize(
  q_arr: number[],
  bhp_arr: number[],
  bhp_i: number
): number[] {
  const n = Math.min(q_arr.length, bhp_arr.length);
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    const drawdown = bhp_i - bhp_arr[i];
    result.push(drawdown > 0 ? q_arr[i] / drawdown : 0);
  }
  return result;
}

// ─── DCA Decline Rate Conversions ─────────────────────────────────────────────

/**
 * Convert nominal decline rate between time bases.
 *
 * Nominal decline is additive: D_annual = 12 × D_monthly = 365 × D_daily.
 *
 * @param D         Nominal decline rate
 * @param fromUnit  Source time unit: "year" | "month" | "day"
 * @param toUnit    Target time unit: "year" | "month" | "day"
 * @returns         Converted nominal decline rate
 */
export function dcaConvertNominalDecline(
  D: number,
  fromUnit: "year" | "month" | "day",
  toUnit: "year" | "month" | "day"
): number {
  const toPerYear: Record<string, number> = { year: 1, month: 12, day: 365 };
  return D * toPerYear[fromUnit] / toPerYear[toUnit];
}

/**
 * Convert effective annual decline rate to monthly effective decline.
 *
 * De_monthly = 1 − (1 − De_annual)^(1/12)
 *
 * @param De_annual  Effective annual decline rate (fraction, e.g. 0.30 = 30%/yr)
 * @returns          Effective monthly decline rate (fraction/month)
 */
export function dcaAnnualToMonthlyEffective(De_annual: number): number {
  return 1 - Math.pow(1 - De_annual, 1 / 12);
}

/**
 * Convert effective monthly decline rate to effective annual decline.
 *
 * De_annual = 1 − (1 − De_monthly)^12
 *
 * @param De_monthly  Effective monthly decline rate (fraction/month)
 * @returns           Effective annual decline rate (fraction/year)
 */
export function dcaMonthlyToAnnualEffective(De_monthly: number): number {
  return 1 - Math.pow(1 - De_monthly, 12);
}

// ─── SEPD / LGM Extended Diagnostics ──────────────────────────────────────────

/**
 * SEPD cumulative shape ratio at time t.
 *
 * Shape = Gp(t) / Gp_max = 1 − exp(−(t/tau)^n)
 *
 * A shape of 0.5 means 50% of ultimate has been produced.
 * The time at which shape = 0.5 is the characteristic "half-life" of the well.
 *
 * @param t    Time (same units as tau)
 * @param tau  Characteristic time constant
 * @param n    Stretched exponent (n < 1 = hyperbolic-like; n = 1 = exponential)
 * @returns    Dimensionless cumulative shape ratio [0, 1)
 */
export function sepdCumShape(t: number, tau: number, n: number): number {
  if (tau <= 0 || n <= 0) return 0;
  return 1 - Math.exp(-Math.pow(t / tau, n));
}

/**
 * LGM saturation fraction at time t (fraction of EUR produced).
 *
 * Saturation = Gp(t) / K = (1 + a × t^(−n))^(−1)
 *
 * @param t  Time (must be > 0)
 * @param K  Carrying capacity (EUR, same units as rate·time)
 * @param a  LGM parameter a (controls transient)
 * @param n  LGM exponent n (controls curvature)
 * @returns  Saturation fraction [0, 1)
 */
export function lgmSatFraction(t: number, K: number, a: number, n: number): number {
  if (t <= 0 || K <= 0) return 0;
  return lgmCumulative(t, K, a, n) / K;
}

/**
 * Compare Arps, SEPD, and LGM goodness-of-fit on production data.
 *
 * Returns sum-of-squared-residuals (SSR) for each model fitted to the data.
 * Lower SSR = better fit.
 *
 * @param times   Array of time values
 * @param rates   Array of rate values (same length as times)
 * @returns       { arpsSSR, sepdSSR, lgmSSR } — SSR for each model
 */
export function dcaModelComparison(
  times: number[],
  rates: number[],
): { arpsSSR: number; sepdSSR: number; lgmSSR: number } {
  const n = Math.min(times.length, rates.length);
  if (n < 3) return { arpsSSR: Infinity, sepdSSR: Infinity, lgmSSR: Infinity };

  // ── Arps fit ──────────────────────────────────────────────────────────────
  const [Qi_a, Di_a, b_a] = arpsFit(times, rates);
  let arpsSSR = 0;
  for (let i = 0; i < n; i++) {
    const pred = arpsRate(Qi_a, Di_a, b_a, times[i]);
    arpsSSR += (rates[i] - pred) ** 2;
  }

  // ── SEPD fit: 3-parameter (qi, tau, n) via brute scan + Nelder-Mead-like ──
  const Qi_s = rates[0];
  let bestSepdSSR = Infinity;
  let best_tau = 1, best_n = 0.5;
  const t_last = times[n - 1];
  for (let ti = 1; ti <= 20; ti++) {
    for (let ni = 1; ni <= 10; ni++) {
      const tau = (ti / 10) * t_last;
      const nn = ni * 0.15;
      let ssr = 0;
      for (let i = 0; i < n; i++) {
        const pred = Qi_s * Math.exp(-Math.pow(times[i] / tau, nn));
        ssr += (rates[i] - pred) ** 2;
      }
      if (ssr < bestSepdSSR) { bestSepdSSR = ssr; best_tau = tau; best_n = nn; }
    }
  }
  // Refine
  let sepdSSR = bestSepdSSR;
  for (let iter = 0; iter < 50; iter++) {
    for (const [dtau, dn] of [[0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05]]) {
      const tau2 = best_tau * (1 + dtau);
      const n2   = best_n + dn;
      if (tau2 <= 0 || n2 <= 0) continue;
      let ssr = 0;
      for (let i = 0; i < n; i++) {
        const pred = Qi_s * Math.exp(-Math.pow(times[i] / tau2, n2));
        ssr += (rates[i] - pred) ** 2;
      }
      if (ssr < sepdSSR) { sepdSSR = ssr; best_tau = tau2; best_n = n2; }
    }
  }

  // ── LGM fit: scan K, a, n ─────────────────────────────────────────────────
  const maxQ = Math.max(...rates);
  let bestLgmSSR = Infinity;
  let best_K = maxQ * 10, best_a = 1, best_ln = 1;
  for (let ki = 1; ki <= 10; ki++) {
    for (let ai = 1; ai <= 5; ai++) {
      for (let lni = 1; lni <= 5; lni++) {
        const K  = maxQ * ki;
        const a  = ai * 0.5;
        const ln = lni * 0.4;
        let ssr = 0;
        for (let i = 0; i < n; i++) {
          if (times[i] <= 0) continue;
          const pred = lgmRate(times[i], K, a, ln);
          ssr += (rates[i] - pred) ** 2;
        }
        if (ssr < bestLgmSSR) { bestLgmSSR = ssr; best_K = K; best_a = a; best_ln = ln; }
      }
    }
  }
  const lgmSSR = bestLgmSSR;

  return { arpsSSR, sepdSSR, lgmSSR };
}

/**
 * Arps EUR at economic limit with terminal exponential switch.
 *
 * Equivalent to Transient Hyperbolic EUR — calculates EUR accounting for
 * the transition from hyperbolic to terminal exponential decline.
 *
 * EUR = Gp(t_switch) + q(t_switch) / D_term
 *
 * @param Qi       Initial rate
 * @param Di       Initial nominal decline rate (1/time)
 * @param b        Hyperbolic exponent
 * @param Dterm    Terminal decline rate for exponential tail (1/time)
 * @param qEL      Economic limit rate (abandonment rate)
 * @returns        EUR (same units as rate × time)
 */
export function arpsEURWithTerminalDecline(
  Qi: number,
  Di: number,
  b: number,
  Dterm: number,
  qEL: number,
): number {
  // Time at which D(t) = Dterm
  const t_sw = thSwitchTime(Di, b, Dterm);
  const q_sw = arpsRate(Qi, Di, b, t_sw);
  const Gp_sw = arpsCumulative(Qi, Di, b, t_sw);
  // Exponential tail to qEL
  if (qEL >= q_sw) return Gp_sw;
  const Gp_tail = (q_sw - qEL) / Dterm;
  return Gp_sw + Gp_tail;
}
