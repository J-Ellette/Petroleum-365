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

// ─── Working Interest / Royalty / NRI ────────────────────────────────────────

/**
 * Calculate working interest (WI) revenue from before-tax gross revenue.
 *
 * WI_Revenue = GrossRevenue × WI
 *
 * @param grossRevenue   Gross revenue before burdens (USD)
 * @param wi             Working interest fraction (e.g. 0.75 for 75%)
 * @returns              Working interest revenue (USD)
 */
export function ecoWorkingInterest(grossRevenue: number, wi: number): number {
  return grossRevenue * wi;
}

/**
 * Calculate Net Revenue Interest (NRI) from working interest and royalty.
 *
 * NRI = WI × (1 − totalRoyalty)
 *
 * @param wi             Working interest fraction (e.g. 0.75 for 75%)
 * @param totalRoyalty   Total royalty burden (e.g. 0.1875 = 1/8 royalty + ORRI)
 * @returns              Net revenue interest fraction
 */
export function ecoNetRevenueInterest(wi: number, totalRoyalty: number): number {
  return wi * (1 - totalRoyalty);
}

/**
 * Calculate royalty-stacked net revenue after multiple royalty burdens.
 *
 * Net = GrossRevenue × (1 − r1) × (1 − r2) × …
 *
 * Useful when multiple royalty owners hold separate interests
 * (e.g., lessor royalty + ORRI + state royalty).
 *
 * @param grossRevenue  Gross revenue before royalties (USD)
 * @param royalties     Array of royalty fractions to deduct in sequence
 * @returns             Net revenue after all royalty deductions (USD)
 */
export function ecoRoyaltyStack(grossRevenue: number, royalties: number[]): number {
  return royalties.reduce((rev, r) => rev * (1 - r), grossRevenue);
}

/**
 * Project gas prices forward with annual escalation rate.
 *
 * price[t] = basePrice × (1 + escalationRate)^t
 *
 * @param basePrice       Price at period 0 (USD/Mscf or USD/MMBtu)
 * @param escalationRate  Annual price escalation rate (e.g. 0.03 = 3%/yr)
 * @param periods         Number of periods to generate (includes t = 0)
 * @returns               Array of escalated prices length = periods
 */
export function ecoGasPriceEscalation(
  basePrice: number,
  escalationRate: number,
  periods: number,
): number[] {
  const out: number[] = [];
  for (let t = 0; t < periods; t++) {
    out.push(basePrice * Math.pow(1 + escalationRate, t));
  }
  return out;
}

/**
 * Adjust real cash flows for inflation to produce nominal cash flows.
 *
 * nominalCF[t] = realCF[t] × (1 + inflationRate)^t
 *
 * @param realCashFlows   Array of real (constant-dollar) cash flows
 * @param inflationRate   Annual inflation rate (e.g. 0.03 = 3%/yr)
 * @returns               Array of nominal (current-dollar) cash flows
 */
export function ecoInflationAdjust(realCashFlows: number[], inflationRate: number): number[] {
  return realCashFlows.map((cf, t) => cf * Math.pow(1 + inflationRate, t));
}

/**
 * Calculate after-tax NPV using a flat income tax rate on taxable income.
 *
 * After-tax CF[t] = preTaxCF[t] − max(0, preTaxCF[t] × taxRate)
 * After-tax NPV   = Σ afterTaxCF[t] / (1 + r)^t
 *
 * Note: losses (negative CF) are not taxed (conservative — no carryforward).
 * For depletion-adjusted taxation use ecoAfterTaxNPVWithDepletion.
 *
 * @param cashFlows  Pre-tax cash flows (positive = income, negative = expense)
 * @param rate       Periodic discount rate
 * @param taxRate    Income tax rate (e.g. 0.21 for 21% federal)
 * @returns          After-tax NPV
 */
export function ecoAfterTaxNPV(cashFlows: number[], rate: number, taxRate: number): number {
  const afterTax = cashFlows.map(cf => cf > 0 ? cf * (1 - taxRate) : cf);
  return ecoNPV(afterTax, rate);
}

/**
 * Calculate after-tax NPV with UOP depletion shielding.
 *
 * taxable income[t] = preTaxCF[t] − depletion[t]
 * tax[t]           = max(0, taxable[t]) × taxRate
 * after-tax CF[t]  = preTaxCF[t] − tax[t]
 *
 * @param cashFlows      Pre-tax cash flows
 * @param rate           Periodic discount rate
 * @param taxRate        Income tax rate
 * @param depletion      Per-period depletion deduction (same length as cashFlows)
 * @returns              After-tax NPV accounting for depletion shield
 */
export function ecoAfterTaxNPVWithDepletion(
  cashFlows: number[],
  rate: number,
  taxRate: number,
  depletion: number[],
): number {
  const n = cashFlows.length;
  const deplArr = depletion.length >= n
    ? depletion
    : [...depletion, ...new Array<number>(n - depletion.length).fill(0)];
  const afterTax = cashFlows.map((cf, t) => {
    const taxable = cf - deplArr[t];
    const tax = taxable > 0 ? taxable * taxRate : 0;
    return cf - tax;
  });
  return ecoNPV(afterTax, rate);
}

/**
 * Build escalated oil revenue cash flows for NPV analysis.
 *
 * Revenue[t] = volume[t] × price[0] × (1 + escalation)^t × NRI − OPEX[t]
 *
 * @param volumes         Array of production volumes (STB/period or Mscf/period)
 * @param basePrice       Price at t=0 (USD/STB or USD/Mscf)
 * @param priceEscalation Annual price escalation rate
 * @param nri             Net revenue interest fraction
 * @param opex            Operating cost per period (scalar or array, same units as revenue)
 * @param capex           Capital expenditure per period (array, default = [])
 * @returns               Array of net cash flows
 */
export function ecoBuildEscalatedRevenue(
  volumes: number[],
  basePrice: number,
  priceEscalation: number,
  nri: number,
  opex: number | number[],
  capex: number[] = [],
): number[] {
  const n = volumes.length;
  const opexArr = typeof opex === "number" ? new Array<number>(n).fill(opex) : opex;
  const capexArr = capex.length >= n ? capex : [...capex, ...new Array<number>(n - capex.length).fill(0)];
  return volumes.map((vol, t) => {
    const price = basePrice * Math.pow(1 + priceEscalation, t);
    return vol * price * nri - opexArr[t] - capexArr[t];
  });
}

/**
 * Calculate lease operating cost per BOE (cost of operations analysis).
 *
 * LOE_per_BOE = totalOpex / (oilProduction + gasProduction_Mscf × BOE_per_Mscf)
 *
 * @param totalOpex         Total operating expenditure in period (USD)
 * @param oilVolume_STB     Oil production (STB)
 * @param gasVolume_Mscf    Gas production (Mscf)
 * @param boePerMscf        BOE conversion for gas (default 6.0 Mscf/BOE)
 * @returns                 Lease operating expense in USD/BOE
 */
export function ecoLOEPerBOE(
  totalOpex: number,
  oilVolume_STB: number,
  gasVolume_Mscf: number,
  boePerMscf = 6.0,
): number {
  const totalBOE = oilVolume_STB + gasVolume_Mscf / boePerMscf;
  if (totalBOE <= 0) return 0;
  return totalOpex / totalBOE;
}

/**
 * Calculate CAPEX recycle ratio.
 *
 * Recycle Ratio = (Revenue − OPEX) / CAPEX
 *
 * A ratio > 1 means the well returns more cash than it costs to drill and complete.
 *
 * @param revenue  Cumulative undiscounted revenue over well life (USD)
 * @param opex     Cumulative undiscounted operating expense (USD)
 * @param capex    Total capital investment (USD)
 * @returns        Recycle ratio (dimensionless)
 */
export function ecoRecycleRatio(revenue: number, opex: number, capex: number): number {
  if (capex <= 0) return 0;
  return (revenue - opex) / capex;
}

/**
 * Calculate finding and development cost (F&D cost) per BOE.
 *
 * F&D = totalCapex / EUR_BOE
 *
 * @param totalCapex   Total drilling + completion + facilities cost (USD)
 * @param eur_BOE      Estimated ultimate recovery (BOE)
 * @returns            Finding & development cost (USD/BOE)
 */
export function ecoFindingCost(totalCapex: number, eur_BOE: number): number {
  if (eur_BOE <= 0) return 0;
  return totalCapex / eur_BOE;
}

// ─── Monte Carlo / Latin Hypercube Sampling ───────────────────────────────────

/**
 * Simple deterministic linear congruential generator (LCG) for reproducible
 * pseudo-random sequences (Knuth 1969 parameters).
 *
 * Returns values in [0, 1).
 *
 * @param seed  Integer seed (>= 0)
 * @param n     Number of samples to generate
 * @returns     Array of n pseudo-random values in [0, 1)
 */
export function ecoLCGRandom(seed: number, n: number): number[] {
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  let state = Math.round(Math.abs(seed)) % m;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    state = (a * state + c) % m;
    out.push(state / m);
  }
  return out;
}

/**
 * Latin Hypercube Sample (LHS) for a single variable uniformly distributed
 * on [0, 1].
 *
 * The [0,1] range is divided into nSamples equal strata; one random point is
 * drawn from each stratum and the strata are then randomly permuted.
 *
 * @param nSamples  Number of samples (rows)
 * @param seed      Random seed for reproducibility
 * @returns         Array of nSamples values in [0, 1)
 */
export function ecoLHSSingleVar(nSamples: number, seed: number): number[] {
  const rand = ecoLCGRandom(seed, nSamples * 2);
  // Stratum positions + intra-stratum random offset
  const strata = Array.from({ length: nSamples }, (_, i) =>
    (i + rand[i]) / nSamples
  );
  // Fisher-Yates shuffle using second half of rand stream
  for (let i = nSamples - 1; i > 0; i--) {
    const j = Math.floor(rand[nSamples + i] * (i + 1));
    [strata[i], strata[j]] = [strata[j], strata[i]];
  }
  return strata;
}

/**
 * Latin Hypercube Sample (LHS) for nVars independent variables, each
 * uniformly distributed on [0, 1].
 *
 * Returns a (nSamples × nVars) matrix where each column is an independent LHS.
 *
 * @param nSamples  Number of samples (rows)
 * @param nVars     Number of variables (columns)
 * @param seed      Base random seed; each variable uses seed + varIndex
 * @returns         Matrix [nSamples][nVars] with values in [0, 1)
 */
export function ecoLHSample(
  nSamples: number,
  nVars: number,
  seed = 42,
): number[][] {
  const matrix: number[][] = Array.from({ length: nSamples }, () =>
    new Array(nVars).fill(0)
  );
  for (let v = 0; v < nVars; v++) {
    const col = ecoLHSSingleVar(nSamples, seed + v * 97);
    for (let s = 0; s < nSamples; s++) {
      matrix[s][v] = col[s];
    }
  }
  return matrix;
}

/**
 * Inverse-transform sampling for common distributions.
 *
 * Converts a uniform [0,1] sample u to a draw from the specified distribution.
 *
 * Supported distributions:
 *   "uniform"   params: [min, max]
 *   "triangular" params: [min, mode, max]
 *   "normal"    params: [mean, stddev]  (Box-Muller approximation)
 *   "lognormal" params: [mu_ln, sigma_ln]  (log-space mean/stddev)
 *   "pert"      params: [min, mode, max]  (Beta PERT ≈ triangular smoothed)
 *
 * @param u     Uniform sample in [0, 1)
 * @param dist  Distribution name
 * @param params Distribution parameters (see above)
 * @returns     Sample from the specified distribution
 */
export function ecoInvTransform(
  u: number,
  dist: "uniform" | "triangular" | "normal" | "lognormal" | "pert",
  params: number[],
): number {
  switch (dist) {
    case "uniform": {
      const [lo, hi] = params;
      return lo + u * (hi - lo);
    }
    case "triangular": {
      const [lo, mode, hi] = params;
      const range = hi - lo;
      const fc    = (mode - lo) / range;
      if (u < fc) {
        return lo + Math.sqrt(u * range * (mode - lo));
      }
      return hi - Math.sqrt((1 - u) * range * (hi - mode));
    }
    case "normal": {
      // Rational approximation to probit (Abramowitz & Stegun §26.2.23)
      const [mean, std] = params;
      const p = Math.min(Math.max(u, 1e-9), 1 - 1e-9);
      const t = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
      const c = [2.515517, 0.802853, 0.010328];
      const d = [1.432788, 0.189269, 0.001308];
      const z = t - (c[0] + c[1] * t + c[2] * t * t)
                  / (1 + d[0] * t + d[1] * t * t + d[2] * t * t * t);
      return mean + std * (p < 0.5 ? -z : z);
    }
    case "lognormal": {
      const [mu_ln, sigma_ln] = params;
      const normal_sample = ecoInvTransform(u, "normal", [0, 1]);
      return Math.exp(mu_ln + sigma_ln * normal_sample);
    }
    case "pert": {
      // Beta PERT: mean = (min + 4·mode + max)/6, shape params λ=4
      const [lo, mode, hi] = params;
      // Approximate PERT quantile using smoothed triangular (good for λ=4)
      // The PERT distribution is a rescaled Beta with α and β derived from
      // the PERT moments, but a simple triangular + smoothing term gives
      // < 5% error relative to exact Beta quantile for most cases.
      return ecoInvTransform(u, "triangular", [lo, mode, hi]) +
             0.05 * (u - 0.5) * (hi - lo);        // PERT smoothing adjustment
    }
  }
}

/**
 * Monte Carlo NPV simulation using Latin Hypercube Sampling.
 *
 * Draws nSamples scenarios from the joint distribution of uncertain parameters,
 * evaluates an NPV function for each, and returns statistics.
 *
 * @param nSamples      Number of Monte Carlo iterations
 * @param discountRate  Annual discount rate (decimal, e.g. 0.10 for 10%)
 * @param paramDists    Array of parameter distribution specs:
 *                        { dist, params } matching ecoInvTransform conventions
 * @param npvFn         NPV evaluation function: given sampled parameter array,
 *                      returns NPV (USD)
 * @param seed          LHS seed for reproducibility
 * @returns             { mean, p10, p50, p90, stddev, min, max, samples }
 */
export function ecoMonteCarloNPV(
  nSamples: number,
  discountRate: number,
  paramDists: Array<{
    dist: "uniform" | "triangular" | "normal" | "lognormal" | "pert";
    params: number[];
  }>,
  npvFn: (params: number[], discountRate: number) => number,
  seed = 42,
): {
  mean:    number;
  p10:     number;
  p50:     number;
  p90:     number;
  stddev:  number;
  min:     number;
  max:     number;
  samples: number[];
} {
  const nVars   = paramDists.length;
  const lhsMatrix = ecoLHSample(nSamples, nVars, seed);

  const npvValues = lhsMatrix.map(row => {
    const paramSamples = row.map((u, v) =>
      ecoInvTransform(u, paramDists[v].dist, paramDists[v].params)
    );
    return npvFn(paramSamples, discountRate);
  });

  const sorted = [...npvValues].sort((a, b) => a - b);
  const n      = sorted.length;
  const mean   = npvValues.reduce((s, v) => s + v, 0) / n;
  const variance = npvValues.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

  const pctile = (p: number): number => {
    const idx = p * (n - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };

  return {
    mean,
    p10:    pctile(0.10),
    p50:    pctile(0.50),
    p90:    pctile(0.90),
    stddev: Math.sqrt(variance),
    min:    sorted[0],
    max:    sorted[n - 1],
    samples: npvValues,
  };
}
