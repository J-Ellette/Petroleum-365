/**
 * P365 — Economic Analysis
 *
 * Provides petroleum-specific economic calculations:
 *   - Net Present Value (NPV) / discounted cash flow
 *   - Internal Rate of Return (IRR) via Brent's method
 *   - Payout period (simple and discounted)
 *   - Economic limit (minimum economic production rate)
 *   - Unit-of-production depreciation / depletion
 *   - Profitability index and break-even oil price
 *   - DCA-based EUR at economic limit
 *
 * Convention:
 *   - Cash flows are in consistent monetary units (e.g. USD/year or USD/month)
 *   - Discount rates are fractional annual rates (e.g. 0.10 = 10 %/year)
 *   - Time steps match cash-flow array intervals (year, month, etc.)
 *
 * References:
 *   - Mian (2002) Project Economics and Decision Analysis
 *   - Brill & Mukherjee (1999) Multiphase Flow in Wells
 *   - SPE-110586 (Economic limit analysis)
 */

// ─── Net Present Value ─────────────────────────────────────────────────────

/**
 * Calculate Net Present Value (NPV) of a cash-flow stream.
 *
 * NPV = Σ CF[t] / (1 + r)^t   (t = 0, 1, 2, … N-1)
 *
 * @param cashFlows   Array of periodic cash flows (positive = inflow, negative = outflow)
 * @param rate        Periodic discount rate (e.g. 0.10 for 10% per period)
 * @returns           Net present value in same currency as cashFlows
 */
export function ecoNPV(cashFlows: number[], rate: number): number {
  if (cashFlows.length === 0) return 0;
  return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
}

/**
 * Continuous-time NPV using instantaneous discount rate.
 *
 * NPV_cont = Σ CF[t] · exp(−r · t)
 *
 * @param cashFlows   Array of periodic cash flows
 * @param rate        Continuous discount rate (e.g. ln(1.10) for 10% effective)
 * @returns           Net present value
 */
export function ecoNPVContinuous(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => npv + cf * Math.exp(-rate * t), 0);
}

/**
 * Calculate the Present Value of a single future cash flow.
 *
 * PV = FV / (1 + r)^n
 *
 * @param futureValue  Future cash amount
 * @param rate         Periodic discount rate
 * @param periods      Number of periods
 * @returns            Present value
 */
export function ecoPV(futureValue: number, rate: number, periods: number): number {
  return futureValue / Math.pow(1 + rate, periods);
}

/**
 * Calculate the Future Value of a present amount.
 *
 * FV = PV · (1 + r)^n
 *
 * @param presentValue  Present cash amount
 * @param rate          Periodic rate
 * @param periods       Number of periods
 * @returns             Future value
 */
export function ecoFV(presentValue: number, rate: number, periods: number): number {
  return presentValue * Math.pow(1 + rate, periods);
}

// ─── Internal Rate of Return ──────────────────────────────────────────────

/**
 * Compute the Internal Rate of Return (IRR) of a cash-flow stream.
 *
 * IRR is the rate r that makes NPV = 0.
 * Uses Brent's method on the interval [rMin, rMax].
 * Returns NaN if no root is found in the search range.
 *
 * @param cashFlows   Array of periodic cash flows (must have at least one sign change)
 * @param rMin        Lower bound for IRR search (default −0.999 = −99.9%)
 * @param rMax        Upper bound for IRR search (default 10.0 = 1000%)
 * @param tol         Convergence tolerance (default 1e-8)
 * @returns           IRR as a decimal fraction, or NaN if not found
 */
export function ecoIRR(
  cashFlows: number[],
  rMin = -0.999,
  rMax = 10.0,
  tol  = 1e-8,
): number {
  const f = (r: number) => ecoNPV(cashFlows, r);
  let a = rMin, b = rMax;
  let fa = f(a), fb = f(b);

  if (fa * fb > 0) return NaN;   // no root in range

  let c = a, fc = fa;
  let mflag = true;
  let s = 0, d = 0;

  for (let iter = 0; iter < 200; iter++) {
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

    if (cond1 || cond2 || cond3 || cond4 || cond5) { s = (a + b) / 2; mflag = true; }
    else mflag = false;

    const fs = f(s);
    d = c; c = b; fc = fb;
    if (fa * fs < 0) { b = s; fb = fs; } else { a = s; fa = fs; }
    if (Math.abs(fa) < Math.abs(fb)) { [a, b] = [b, a]; [fa, fb] = [fb, fa]; }
  }
  return (a + b) / 2;
}

/**
 * Modified IRR (MIRR) — reinvests positive cash flows at a finance rate and
 * discounts negatives at the cost of capital.
 *
 * MIRR = (FV+ / |PV-|)^(1/(n-1)) − 1
 *
 * @param cashFlows    Array of periodic cash flows
 * @param financeRate  Rate used to compound positive cash flows (e.g. 0.08)
 * @param reinvestRate Rate used to discount negative cash flows (e.g. 0.10)
 * @returns            MIRR as a decimal fraction
 */
export function ecoMIRR(
  cashFlows: number[],
  financeRate: number,
  reinvestRate: number,
): number {
  const n = cashFlows.length;
  if (n < 2) return NaN;

  // Future value of positives compounded at financeRate to end of period
  const fvPos = cashFlows.reduce((sum, cf, t) => {
    return cf > 0 ? sum + cf * Math.pow(1 + financeRate, n - 1 - t) : sum;
  }, 0);

  // Present value of negatives discounted at reinvestRate to period 0
  const pvNeg = cashFlows.reduce((sum, cf, t) => {
    return cf < 0 ? sum + cf / Math.pow(1 + reinvestRate, t) : sum;
  }, 0);

  if (pvNeg === 0 || fvPos === 0) return NaN;
  return Math.pow(fvPos / Math.abs(pvNeg), 1 / (n - 1)) - 1;
}

// ─── Payout Period ─────────────────────────────────────────────────────────

/**
 * Simple (undiscounted) payout period — time for cumulative cash flow to become positive.
 *
 * Returns the interpolated period at which cumulative CF = 0.
 * Returns Infinity if the project never pays out.
 *
 * @param cashFlows  Array of periodic cash flows
 * @returns          Payout period in number of periods (interpolated)
 */
export function ecoPayoutSimple(cashFlows: number[]): number {
  let cumulative = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    const prev = cumulative;
    cumulative += cashFlows[t];
    if (cumulative >= 0 && prev < 0) {
      // Linear interpolation between period t-1 and t
      return t - 1 + (-prev) / cashFlows[t];
    }
    if (cumulative >= 0 && t === 0) return 0;
  }
  return Infinity;
}

/**
 * Discounted payout period — time for discounted cumulative cash flow to become positive.
 *
 * @param cashFlows  Array of periodic cash flows
 * @param rate       Periodic discount rate
 * @returns          Discounted payout period (interpolated), or Infinity
 */
export function ecoPayoutDiscounted(cashFlows: number[], rate: number): number {
  let cumulative = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    const pv   = cashFlows[t] / Math.pow(1 + rate, t);
    const prev = cumulative;
    cumulative += pv;
    if (cumulative >= 0 && prev < 0) {
      return t - 1 + (-prev) / pv;
    }
    if (cumulative >= 0 && t === 0) return 0;
  }
  return Infinity;
}

// ─── Economic Limit ────────────────────────────────────────────────────────

/**
 * Minimum economic rate (economic limit) for an oil well.
 *
 * Economic limit is the monthly production rate at which gross revenue
 * equals lifting cost, i.e. operating profit = 0.
 *
 * q_EL = OPEX_monthly / (oil_price · WI · NRI − tax_rate · oil_price · WI · NRI)
 *
 * @param monthlyOpex    Monthly operating cost ($/month)
 * @param oilPrice       Oil price ($/STB)
 * @param workingInterest Working interest fraction (e.g. 0.80)
 * @param netRevenueInterest Net revenue interest fraction (e.g. 0.75)
 * @param severanceTax   Severance (production) tax rate (fractional, e.g. 0.05)
 * @returns              Economic limit in STB/month
 */
export function ecoOilEconomicLimit(
  monthlyOpex: number,
  oilPrice: number,
  workingInterest: number,
  netRevenueInterest: number,
  severanceTax = 0,
): number {
  const netRevPerBbl = oilPrice * netRevenueInterest * (1 - severanceTax);
  const costPerBbl   = monthlyOpex / workingInterest;
  if (netRevPerBbl <= 0) return Infinity;
  return costPerBbl / netRevPerBbl;
}

/**
 * Minimum economic rate for a gas well.
 *
 * @param monthlyOpex    Monthly operating cost ($/month)
 * @param gasPrice       Gas price ($/Mscf)
 * @param workingInterest Working interest fraction
 * @param netRevenueInterest Net revenue interest fraction
 * @param severanceTax   Severance tax rate
 * @returns              Economic limit in Mscf/month
 */
export function ecoGasEconomicLimit(
  monthlyOpex: number,
  gasPrice: number,
  workingInterest: number,
  netRevenueInterest: number,
  severanceTax = 0,
): number {
  return ecoOilEconomicLimit(monthlyOpex, gasPrice, workingInterest, netRevenueInterest, severanceTax);
}

/**
 * EUR at economic limit using Arps hyperbolic decline.
 *
 * Cumulative production from t=0 until the well reaches the economic limit.
 *
 * For b = 0 (exponential): Np = (qi − qEL) / Di
 * For b ≠ 0 (hyperbolic):  Np = (qi^b / (Di·(1-b))) · (qi^(1-b) − qEL^(1-b))
 *
 * @param qi   Initial rate (same units as qEL)
 * @param Di   Initial nominal decline rate (per time unit matching qEL period)
 * @param b    Arps decline exponent (0 = exponential)
 * @param qEL  Economic limit rate
 * @returns    EUR in same units as qi × time_unit
 */
export function ecoArpsEURAtLimit(
  qi: number,
  Di: number,
  b: number,
  qEL: number,
): number {
  if (qEL >= qi) return 0;
  if (b === 0 || Math.abs(b) < 1e-10) {
    return (qi - qEL) / Di;
  }
  return (Math.pow(qi, b) / (Di * (1 - b))) * (Math.pow(qi, 1 - b) - Math.pow(qEL, 1 - b));
}

/**
 * Time to reach economic limit (Arps decline).
 *
 * For b = 0: t = ln(qi/qEL) / Di
 * For b ≠ 0: t = [(qi/qEL)^b − 1] / (b · Di)
 *
 * @param qi   Initial rate
 * @param Di   Initial nominal decline rate (1/time)
 * @param b    Arps decline exponent
 * @param qEL  Economic limit rate
 * @returns    Time to economic limit (same time units as 1/Di)
 */
export function ecoTimeToEconomicLimit(
  qi: number,
  Di: number,
  b: number,
  qEL: number,
): number {
  if (qEL >= qi) return 0;
  if (b === 0 || Math.abs(b) < 1e-10) {
    return Math.log(qi / qEL) / Di;
  }
  return (Math.pow(qi / qEL, b) - 1) / (b * Di);
}

// ─── Profitability Metrics ─────────────────────────────────────────────────

/**
 * Profitability Index (PI) — also known as benefit-cost ratio.
 *
 * PI = (NPV + |CAPEX|) / |CAPEX|
 *
 * A PI > 1 indicates a value-creating investment.
 *
 * @param cashFlows  Array of cash flows (period 0 is typically negative CAPEX)
 * @param rate       Discount rate
 * @returns          Profitability index (dimensionless)
 */
export function ecoProfitabilityIndex(cashFlows: number[], rate: number): number {
  const capex = Math.abs(cashFlows[0]);
  if (capex === 0) return Infinity;
  const npv = ecoNPV(cashFlows, rate);
  return (npv + capex) / capex;
}

/**
 * Break-even oil price — the oil price that makes NPV = 0.
 *
 * Uses bisection on [0, priceMax] to find the price where NPV crosses zero.
 *
 * @param volumes       Array of production volumes per period (STB or Mscf)
 * @param opexPerPeriod Array of operating costs per period
 * @param capex         Initial capital expenditure (positive value, applied at t=0)
 * @param rate          Discount rate per period
 * @param royaltyFrac   Royalty/NRI fraction taken off price (e.g. 0.25)
 * @param severanceTax  Severance tax rate (e.g. 0.05)
 * @param priceMax      Upper bound for break-even price search (default 300)
 * @returns             Break-even price ($/unit), or NaN if not found
 */
export function ecoBreakEvenPrice(
  volumes: number[],
  opexPerPeriod: number[],
  capex: number,
  rate: number,
  royaltyFrac = 0,
  severanceTax = 0,
  priceMax = 300,
): number {
  const n = Math.min(volumes.length, opexPerPeriod.length);
  const nri = (1 - royaltyFrac) * (1 - severanceTax);

  const npvAtPrice = (p: number): number => {
    const cfs = [-capex, ...Array.from({ length: n }, (_, t) => volumes[t] * p * nri - opexPerPeriod[t])];
    return ecoNPV(cfs, rate);
  };

  let lo = 0, hi = priceMax;
  if (npvAtPrice(lo) >= 0) return 0;
  if (npvAtPrice(hi) <= 0) return NaN;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    if (npvAtPrice(mid) < 0) lo = mid; else hi = mid;
    if (hi - lo < 1e-4) break;
  }
  return (lo + hi) / 2;
}

// ─── Unit of Production Depletion ─────────────────────────────────────────

/**
 * Unit-of-production (UOP) depletion expense for an oil & gas property.
 *
 * Depletion = (Cost basis / Proven reserves) × Production this period
 *
 * @param costBasis      Capitalized cost basis of the property (USD)
 * @param provenReserves Total proven reserves (STB or Mscf)
 * @param production     Production in the current period (same units as reserves)
 * @returns              Depletion expense this period (USD)
 */
export function ecoUOPDepletion(
  costBasis: number,
  provenReserves: number,
  production: number,
): number {
  if (provenReserves <= 0) return 0;
  return (costBasis / provenReserves) * production;
}

// ─── Cash-flow builder ────────────────────────────────────────────────────

/**
 * Build an annual cash-flow array from production and price/cost schedules.
 *
 * Each period cash flow = volume × price × NRI − opex − capex[t]
 *
 * @param volumes   Array of production volumes per period
 * @param price     Constant commodity price ($/unit), or single number
 * @param nri       Net revenue interest (fractional, e.g. 0.75)
 * @param opex      Constant operating cost per period, or array of per-period costs
 * @param capex     Array of capital expenditures per period (default all zeros)
 * @returns         Array of net cash flows per period
 */
export function ecoBuildCashFlows(
  volumes: number[],
  price: number,
  nri: number,
  opex: number | number[],
  capex: number[] = [],
): number[] {
  const n = volumes.length;
  const opexArr = typeof opex === "number" ? new Array<number>(n).fill(opex) : opex;
  const capexArr = capex.length >= n ? capex : [...capex, ...new Array<number>(n - capex.length).fill(0)];
  return volumes.map((vol, t) => vol * price * nri - opexArr[t] - capexArr[t]);
}

// ─── Sensitivity / Tornado ────────────────────────────────────────────────

/**
 * One-at-a-time sensitivity analysis for NPV.
 *
 * Evaluates NPV at base, low, and high values of each parameter and returns
 * the swing (high_NPV − low_NPV) for each parameter.
 *
 * @param baseFlows   Base-case cash flows
 * @param rate        Discount rate
 * @param parameters  Array of { name, index, baseMult, lowMult, highMult }
 * @returns           Array of { name, baseNPV, lowNPV, highNPV, swing }
 */
export function ecoTornadoSensitivity(
  baseFlows: number[],
  rate: number,
  parameters: { name: string; index: number; baseMult: number; lowMult: number; highMult: number }[],
): { name: string; baseNPV: number; lowNPV: number; highNPV: number; swing: number }[] {
  const baseNPV = ecoNPV(baseFlows, rate);
  return parameters.map(({ name, index, lowMult, highMult }) => {
    const lo = baseFlows.map((cf, t) => t === index ? cf * lowMult  : cf);
    const hi = baseFlows.map((cf, t) => t === index ? cf * highMult : cf);
    const lowNPV  = ecoNPV(lo, rate);
    const highNPV = ecoNPV(hi, rate);
    return { name, baseNPV, lowNPV, highNPV, swing: highNPV - lowNPV };
  });
}
