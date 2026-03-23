/**
 * P365 — Spline Interpolation
 *
 * Provides cubic natural spline, linear piecewise, and monotone PCHIP
 * (Piecewise Cubic Hermite Interpolating Polynomial) interpolation.
 *
 * All functions accept sorted x-arrays and corresponding y-arrays.
 * Input arrays must be the same length and x must be strictly increasing.
 *
 * References:
 *   - Press et al. Numerical Recipes, 3rd ed. (cubic spline §3.3)
 *   - Fritsch & Carlson, SIAM J. Numer. Anal. 17(2):238-246, 1980 (PCHIP)
 */

// ─── Validation helper ─────────────────────────────────────────────────────

function validateArrays(x: number[], y: number[]): void {
  if (x.length !== y.length) throw new Error("x and y must have the same length");
  if (x.length < 2)          throw new Error("At least 2 data points required");
  for (let i = 1; i < x.length; i++) {
    if (x[i] <= x[i - 1])   throw new Error("x values must be strictly increasing");
  }
}

function findSegment(x: number[], xq: number): number {
  const n = x.length;
  if (xq <= x[0])    return 0;
  if (xq >= x[n - 1]) return n - 2;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= xq) lo = mid; else hi = mid;
  }
  return lo;
}

// ─── Linear interpolation ─────────────────────────────────────────────────

/**
 * Piecewise linear interpolation at a single query point.
 *
 * Extrapolates linearly outside the range of x.
 *
 * @param x   Sorted x-coordinates of data points
 * @param y   y-coordinates of data points
 * @param xq  Query x value
 * @returns   Interpolated y value
 */
export function splineLinear(x: number[], y: number[], xq: number): number {
  validateArrays(x, y);
  const i = findSegment(x, xq);
  const dx = x[i + 1] - x[i];
  const t  = (xq - x[i]) / dx;
  return y[i] + t * (y[i + 1] - y[i]);
}

/**
 * Piecewise linear interpolation over an array of query points.
 *
 * @param x    Sorted x-coordinates of data points
 * @param y    y-coordinates of data points
 * @param xqs  Array of query x values
 * @returns    Array of interpolated y values
 */
export function splineLinearArray(x: number[], y: number[], xqs: number[]): number[] {
  return xqs.map(xq => splineLinear(x, y, xq));
}

// ─── Natural cubic spline ──────────────────────────────────────────────────

/**
 * Compute the second-derivative coefficients for a natural cubic spline
 * (zero curvature boundary conditions at both endpoints).
 *
 * @param x  Sorted x-coordinates
 * @param y  y-coordinates
 * @returns  Array of second derivatives M[i]
 */
export function splineCubicCoefficients(x: number[], y: number[]): number[] {
  validateArrays(x, y);
  const n = x.length;
  const M = new Array<number>(n).fill(0);

  // Build tridiagonal system using Thomas algorithm
  const h  = x.slice(1).map((xi, i) => xi - x[i]);
  const rhs = new Array<number>(n - 2);
  for (let i = 1; i < n - 1; i++) {
    rhs[i - 1] = 6 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1]);
  }

  // Forward sweep (Thomas algorithm)
  const c = h.slice(1, n - 1);              // super-diagonal
  const a = h.slice(0, n - 2);              // sub-diagonal
  const diag = new Array<number>(n - 2);
  for (let i = 0; i < n - 2; i++) diag[i] = 2 * (h[i] + h[i + 1]);

  const c2 = c.slice();
  const r2 = rhs.slice();
  for (let i = 1; i < n - 2; i++) {
    const m = a[i] / diag[i - 1];
    diag[i] -= m * c2[i - 1];
    r2[i]   -= m * r2[i - 1];
  }

  // Back substitution
  const x2 = new Array<number>(n - 2);
  x2[n - 3] = r2[n - 3] / diag[n - 3];
  for (let i = n - 4; i >= 0; i--) {
    x2[i] = (r2[i] - c2[i] * x2[i + 1]) / diag[i];
  }

  for (let i = 1; i < n - 1; i++) M[i] = x2[i - 1];
  return M;
}

/**
 * Evaluate a natural cubic spline at a single query point.
 *
 * @param x   Sorted x-coordinates of data points
 * @param y   y-coordinates of data points
 * @param xq  Query x value
 * @returns   Interpolated y value
 */
export function splineCubic(x: number[], y: number[], xq: number): number {
  validateArrays(x, y);
  const M = splineCubicCoefficients(x, y);
  const i  = findSegment(x, xq);
  const h  = x[i + 1] - x[i];
  const a  = (x[i + 1] - xq) / h;
  const b  = (xq - x[i])     / h;
  return (
    a * y[i] + b * y[i + 1] +
    ((a * a * a - a) * M[i] + (b * b * b - b) * M[i + 1]) * (h * h) / 6
  );
}

/**
 * Evaluate a natural cubic spline over an array of query points.
 *
 * @param x    Sorted x-coordinates of data points
 * @param y    y-coordinates of data points
 * @param xqs  Array of query x values
 * @returns    Array of interpolated y values
 */
export function splineCubicArray(x: number[], y: number[], xqs: number[]): number[] {
  validateArrays(x, y);
  const M = splineCubicCoefficients(x, y);
  return xqs.map(xq => {
    const i = findSegment(x, xq);
    const h = x[i + 1] - x[i];
    const a = (x[i + 1] - xq) / h;
    const b = (xq - x[i])     / h;
    return (
      a * y[i] + b * y[i + 1] +
      ((a * a * a - a) * M[i] + (b * b * b - b) * M[i + 1]) * (h * h) / 6
    );
  });
}

/**
 * Evaluate the first derivative of a natural cubic spline at a query point.
 *
 * @param x   Sorted x-coordinates of data points
 * @param y   y-coordinates of data points
 * @param xq  Query x value
 * @returns   dy/dx at xq
 */
export function splineCubicDeriv(x: number[], y: number[], xq: number): number {
  validateArrays(x, y);
  const M = splineCubicCoefficients(x, y);
  const i  = findSegment(x, xq);
  const h  = x[i + 1] - x[i];
  const a  = (x[i + 1] - xq) / h;
  const b  = (xq - x[i])     / h;
  return (
    (y[i + 1] - y[i]) / h +
    (-(3 * a * a - 1) * M[i] + (3 * b * b - 1) * M[i + 1]) * h / 6
  );
}

/**
 * Integrate a natural cubic spline from xa to xb using the exact antiderivative.
 *
 * @param x   Sorted x-coordinates of data points
 * @param y   y-coordinates of data points
 * @param xa  Lower integration limit (must be within [x[0], x[n-1]])
 * @param xb  Upper integration limit (must be within [x[0], x[n-1]])
 * @returns   Integral of the spline from xa to xb
 */
export function splineCubicIntegral(
  x: number[],
  y: number[],
  xa: number,
  xb: number,
): number {
  validateArrays(x, y);
  const M = splineCubicCoefficients(x, y);
  const sign = xa <= xb ? 1 : -1;
  if (xa > xb) [xa, xb] = [xb, xa];

  const ia = findSegment(x, xa);
  const ib = findSegment(x, xb);

  let total = 0;
  for (let seg = ia; seg <= ib; seg++) {
    const lo = seg === ia ? xa : x[seg];
    const hi = seg === ib ? xb : x[seg + 1];
    const h  = x[seg + 1] - x[seg];

    // Integrate cubic spline piece: ∫[lo..hi] S(t) dt
    // S(t) = A·(x_{i+1}-t)/h·y_i + B·(t-x_i)/h·y_{i+1} + cubic correction
    const intLinear = (y[seg] + y[seg + 1]) / 2 * (hi - lo)
      + (y[seg] - y[seg + 1]) / (2 * h) * ((hi * hi - lo * lo) - (x[seg + 1] + x[seg]) * (hi - lo));
    // cubic correction terms
    const intCorr = (h * h / 6) * (
      M[seg]     * ( -((hi - x[seg])   ** 4) / (4 * h * h) + (hi - x[seg])   ** 2 / 2
                     + (lo - x[seg])   ** 4  / (4 * h * h) - (lo - x[seg])   ** 2 / 2 )
      + M[seg + 1] * ( -((x[seg + 1] - lo) ** 4) / (4 * h * h) + (x[seg + 1] - lo) ** 2 / 2
                       +  (x[seg + 1] - hi) ** 4  / (4 * h * h) - (x[seg + 1] - hi) ** 2 / 2 )
    );
    total += intLinear + intCorr;
  }
  return sign * total;
}

// ─── Monotone PCHIP ───────────────────────────────────────────────────────

/**
 * Compute PCHIP (Piecewise Cubic Hermite Interpolating Polynomial) slopes.
 *
 * Ensures monotonicity within each interval (Fritsch-Carlson, 1980).
 * Suitable for rate-time data, PVT tables, and relative permeability curves.
 *
 * @param x  Sorted x-coordinates
 * @param y  y-coordinates
 * @returns  Array of slopes d[i] at each data node
 */
export function splinePchipSlopes(x: number[], y: number[]): number[] {
  validateArrays(x, y);
  const n = x.length;
  const h = x.slice(1).map((xi, i) => xi - x[i]);
  const delta = h.map((hi, i) => (y[i + 1] - y[i]) / hi);
  const d = new Array<number>(n).fill(0);

  // Interior nodes: weighted harmonic mean of adjacent slopes
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      d[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
  }

  // Endpoint slopes (Brodlie & Butt one-sided)
  d[0]     = ((2 * h[0] + h[1]) * delta[0]     - h[0] * delta[1])     / (h[0] + h[1]);
  d[n - 1] = ((2 * h[n - 2] + h[n - 3]) * delta[n - 2] - h[n - 2] * delta[n - 3]) / (h[n - 2] + h[n - 3]);

  // Monotonicity safeguard: clamp endpoint slopes
  if (n === 2) {
    d[0] = delta[0]; d[1] = delta[0];
    return d;
  }
  if (d[0] * delta[0] < 0) d[0] = 0;
  else if (Math.abs(d[0]) > 3 * Math.abs(delta[0])) d[0] = 3 * delta[0];
  if (d[n - 1] * delta[n - 2] < 0) d[n - 1] = 0;
  else if (Math.abs(d[n - 1]) > 3 * Math.abs(delta[n - 2])) d[n - 1] = 3 * delta[n - 2];

  return d;
}

/**
 * Evaluate monotone PCHIP interpolation at a single query point.
 *
 * @param x   Sorted x-coordinates of data points
 * @param y   y-coordinates of data points
 * @param xq  Query x value
 * @returns   Interpolated y value (monotone-preserving)
 */
export function splinePchip(x: number[], y: number[], xq: number): number {
  validateArrays(x, y);
  const d = splinePchipSlopes(x, y);
  const i  = findSegment(x, xq);
  const h  = x[i + 1] - x[i];
  const t  = (xq - x[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * y[i] + h10 * h * d[i] + h01 * y[i + 1] + h11 * h * d[i + 1];
}

/**
 * Evaluate monotone PCHIP interpolation over an array of query points.
 *
 * @param x    Sorted x-coordinates of data points
 * @param y    y-coordinates of data points
 * @param xqs  Array of query x values
 * @returns    Array of interpolated y values
 */
export function splinePchipArray(x: number[], y: number[], xqs: number[]): number[] {
  validateArrays(x, y);
  const d = splinePchipSlopes(x, y);
  return xqs.map(xq => {
    const i  = findSegment(x, xq);
    const h  = x[i + 1] - x[i];
    const t  = (xq - x[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y[i]
         + (t3 - 2 * t2 + t)     * h * d[i]
         + (-2 * t3 + 3 * t2)    * y[i + 1]
         + (t3 - t2)             * h * d[i + 1];
  });
}

/**
 * Find the x value where the PCHIP interpolant equals a target y value.
 *
 * Uses Brent's method on the specified search interval [xa, xb].
 * Returns NaN if no root is found or the interval is invalid.
 *
 * @param x       Sorted x-coordinates of data points
 * @param y       y-coordinates of data points
 * @param yTarget Target y value to find
 * @param xa      Lower bound for search (defaults to x[0])
 * @param xb      Upper bound for search (defaults to x[n-1])
 * @param tol     Convergence tolerance (default 1e-8)
 * @returns       x value where spline ≈ yTarget, or NaN if not found
 */
export function splinePchipInverse(
  x: number[],
  y: number[],
  yTarget: number,
  xa?: number,
  xb?: number,
  tol = 1e-8,
): number {
  validateArrays(x, y);
  const lo = xa ?? x[0];
  const hi = xb ?? x[x.length - 1];

  const f = (xi: number) => splinePchip(x, y, xi) - yTarget;
  let a = lo, b = hi;
  let fa = f(a), fb = f(b);

  if (fa * fb > 0) return NaN;

  let c = a, fc = fa;
  let mflag = true;
  let s = 0, d = 0;

  for (let iter = 0; iter < 100; iter++) {
    if (Math.abs(b - a) < tol) return (a + b) / 2;

    if (fa !== fc && fb !== fc) {
      s = a * fb * fc / ((fa - fb) * (fa - fc))
        + b * fa * fc / ((fb - fa) * (fb - fc))
        + c * fa * fb / ((fc - fa) * (fc - fb));
    } else {
      s = b - fb * (b - a) / (fb - fa);
    }

    const cond1 = s < (3 * a + b) / 4 || s > b;
    const cond2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2;
    const cond3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2;
    const cond4 = mflag && Math.abs(b - c) < tol;
    const cond5 = !mflag && Math.abs(c - d) < tol;

    if (cond1 || cond2 || cond3 || cond4 || cond5) {
      s = (a + b) / 2;
      mflag = true;
    } else {
      mflag = false;
    }

    const fs = f(s);
    d = c; c = b; fc = fb;

    if (fa * fs < 0) { b = s; fb = fs; }
    else             { a = s; fa = fs; }

    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a]; [fa, fb] = [fb, fa];
    }
  }
  return (a + b) / 2;
}

// ─── Lookup / table interpolation helpers ─────────────────────────────────

/**
 * 1-D table lookup with linear interpolation.
 *
 * Equivalent to Excel VLOOKUP with approximate match + interpolation.
 * Extrapolates linearly outside the table range.
 *
 * @param tableX  Sorted lookup column (x values)
 * @param tableY  Corresponding result column (y values)
 * @param xq      Query value
 * @returns       Interpolated result
 */
export function splineLookup(tableX: number[], tableY: number[], xq: number): number {
  return splineLinear(tableX, tableY, xq);
}

/**
 * 2-D bilinear interpolation.
 *
 * @param xs    Sorted x-axis values (row header)
 * @param ys    Sorted y-axis values (column header)
 * @param Z     2-D array Z[i][j] = value at (xs[i], ys[j])
 * @param xq    Query x value
 * @param yq    Query y value
 * @returns     Bilinear interpolated value
 */
export function splineBilinear(
  xs: number[],
  ys: number[],
  Z: number[][],
  xq: number,
  yq: number,
): number {
  if (xs.length < 2 || ys.length < 2) throw new Error("At least 2 values required in each axis");
  if (Z.length !== xs.length) throw new Error("Z row count must match xs length");
  for (const row of Z) if (row.length !== ys.length) throw new Error("Z column count must match ys length");

  const i = findSegment(xs, xq);
  const j = findSegment(ys, yq);

  const tx = (xq - xs[i]) / (xs[i + 1] - xs[i]);
  const ty = (yq - ys[j]) / (ys[j + 1] - ys[j]);

  const z00 = Z[i][j];
  const z10 = Z[i + 1][j];
  const z01 = Z[i][j + 1];
  const z11 = Z[i + 1][j + 1];

  return (1 - tx) * (1 - ty) * z00
       +      tx  * (1 - ty) * z10
       + (1 - tx) *      ty  * z01
       +      tx  *      ty  * z11;
}
