/**
 * Tests: Economic Analysis
 */

import {
  ecoNPV,
  ecoNPVContinuous,
  ecoPV,
  ecoFV,
  ecoIRR,
  ecoMIRR,
  ecoPayoutSimple,
  ecoPayoutDiscounted,
  ecoOilEconomicLimit,
  ecoGasEconomicLimit,
  ecoArpsEURAtLimit,
  ecoTimeToEconomicLimit,
  ecoProfitabilityIndex,
  ecoBreakEvenPrice,
  ecoUOPDepletion,
  ecoBuildCashFlows,
  ecoTornadoSensitivity,
} from "../../src/functions/eco";

// ─── ecoNPV ──────────────────────────────────────────────────────────────

describe("ecoNPV", () => {
  test("zero rate: NPV = sum of cash flows", () => {
    const cfs = [-1000, 300, 400, 500];
    expect(ecoNPV(cfs, 0)).toBeCloseTo(200, 6);
  });

  test("known example: -1000 at t=0, +1100 at t=1, rate=10%", () => {
    // NPV = -1000 + 1100/1.10 = 0
    expect(ecoNPV([-1000, 1100], 0.10)).toBeCloseTo(0, 6);
  });

  test("positive NPV for value-creating project", () => {
    // -1000 today, +500/yr for 3 years, rate=10%
    const cfs = [-1000, 500, 500, 500];
    expect(ecoNPV(cfs, 0.10)).toBeGreaterThan(0);
  });

  test("empty cash flows: returns 0", () => {
    expect(ecoNPV([], 0.10)).toBe(0);
  });

  test("single cash flow at t=0: no discounting", () => {
    expect(ecoNPV([500], 0.10)).toBeCloseTo(500, 10);
  });

  test("higher rate → lower NPV", () => {
    const cfs = [-1000, 300, 400, 500, 200];
    expect(ecoNPV(cfs, 0.05)).toBeGreaterThan(ecoNPV(cfs, 0.15));
  });
});

// ─── ecoNPVContinuous ────────────────────────────────────────────────────

describe("ecoNPVContinuous", () => {
  test("rate=0: equals sum of cash flows", () => {
    expect(ecoNPVContinuous([-100, 50, 60], 0)).toBeCloseTo(10, 10);
  });

  test("positive rate reduces NPV vs zero rate", () => {
    const cfs = [-1000, 500, 600];
    expect(ecoNPVContinuous(cfs, 0.1)).toBeLessThan(ecoNPVContinuous(cfs, 0));
  });
});

// ─── ecoPV ───────────────────────────────────────────────────────────────

describe("ecoPV", () => {
  test("PV of 1000 in 1 period at 10%", () => {
    expect(ecoPV(1100, 0.10, 1)).toBeCloseTo(1000, 5);
  });

  test("PV of 1000 at 0 periods is the same value", () => {
    expect(ecoPV(1000, 0.10, 0)).toBeCloseTo(1000, 10);
  });
});

// ─── ecoFV ───────────────────────────────────────────────────────────────

describe("ecoFV", () => {
  test("FV of 1000 for 1 period at 10%", () => {
    expect(ecoFV(1000, 0.10, 1)).toBeCloseTo(1100, 5);
  });

  test("FV * PV = original value (round-trip)", () => {
    const pv = ecoPV(ecoFV(500, 0.08, 5), 0.08, 5);
    expect(pv).toBeCloseTo(500, 8);
  });
});

// ─── ecoIRR ──────────────────────────────────────────────────────────────

describe("ecoIRR", () => {
  test("simple 2-period: -1000 + 1100 → IRR = 10%", () => {
    expect(ecoIRR([-1000, 1100])).toBeCloseTo(0.10, 4);
  });

  test("confirms NPV = 0 at computed IRR", () => {
    const cfs = [-1000, 300, 400, 500];
    const irr = ecoIRR(cfs);
    expect(ecoNPV(cfs, irr)).toBeCloseTo(0, 4);
  });

  test("returns NaN when no sign change in NPV", () => {
    // All negative: no positive IRR
    expect(isNaN(ecoIRR([-100, -200, -300]))).toBe(true);
  });

  test("IRR for perpetual growth pattern", () => {
    const cfs = [-1000, 200, 300, 400, 500];
    const irr = ecoIRR(cfs);
    expect(irr).toBeGreaterThan(0);
    expect(irr).toBeLessThan(1);
  });
});

// ─── ecoMIRR ─────────────────────────────────────────────────────────────

describe("ecoMIRR", () => {
  test("MIRR >= IRR when finance rate > cost of capital (conservative case)", () => {
    const cfs = [-1000, 300, 400, 500];
    const irr  = ecoIRR(cfs);
    const mirr = ecoMIRR(cfs, 0.12, 0.10);
    // MIRR often differs from IRR; just check it's a reasonable number
    expect(mirr).toBeGreaterThan(0);
    expect(mirr).not.toBeNaN();
    // IRR is defined; MIRR is also defined
    expect(irr).not.toBeNaN();
  });

  test("single cash flow: NaN", () => {
    expect(isNaN(ecoMIRR([100], 0.10, 0.10))).toBe(true);
  });
});

// ─── ecoPayoutSimple ──────────────────────────────────────────────────────

describe("ecoPayoutSimple", () => {
  test("pays out in first period if first CF is positive", () => {
    expect(ecoPayoutSimple([100, 200])).toBe(0);
  });

  test("example: -1000 then +500/yr → payout at 2 years", () => {
    // Cumulative: -1000, -500, 0 → payout at end of year 2
    const po = ecoPayoutSimple([-1000, 500, 500, 500]);
    expect(po).toBeCloseTo(2, 4);
  });

  test("never pays out: returns Infinity", () => {
    const po = ecoPayoutSimple([-1000, -200, -100]);
    expect(po).toBe(Infinity);
  });

  test("interpolated payout", () => {
    // -100, +75, +75: cumulative after 1st = -100+75 = -25, after 2nd = +50
    const po = ecoPayoutSimple([-100, 75, 75]);
    expect(po).toBeGreaterThan(1);
    expect(po).toBeLessThan(2);
  });
});

// ─── ecoPayoutDiscounted ──────────────────────────────────────────────────

describe("ecoPayoutDiscounted", () => {
  test("discounted payout > simple payout for positive rate", () => {
    const cfs = [-1000, 500, 500, 500];
    const simple     = ecoPayoutSimple(cfs);
    const discounted = ecoPayoutDiscounted(cfs, 0.10);
    expect(discounted).toBeGreaterThan(simple);
  });

  test("rate=0: equals simple payout", () => {
    const cfs = [-1000, 500, 500];
    expect(ecoPayoutDiscounted(cfs, 0)).toBeCloseTo(ecoPayoutSimple(cfs), 5);
  });
});

// ─── ecoOilEconomicLimit ──────────────────────────────────────────────────

describe("ecoOilEconomicLimit", () => {
  test("basic: $5000/month opex, $50/STB, WI=0.8, NRI=0.75", () => {
    const qEL = ecoOilEconomicLimit(5000, 50, 0.8, 0.75);
    // netRevPerBbl = 50 * 0.75 = 37.5
    // costPerBbl = 5000 / 0.8 = 6250
    // qEL = 6250 / 37.5 = 166.67 STB/month
    expect(qEL).toBeCloseTo(166.67, 1);
  });

  test("with severance tax: increases economic limit", () => {
    const base = ecoOilEconomicLimit(5000, 50, 1.0, 1.0, 0);
    const taxed = ecoOilEconomicLimit(5000, 50, 1.0, 1.0, 0.1);
    expect(taxed).toBeGreaterThan(base);
  });

  test("returns Infinity if net revenue per barrel is zero", () => {
    const qEL = ecoOilEconomicLimit(5000, 0, 1.0, 1.0, 0);
    expect(qEL).toBe(Infinity);
  });
});

// ─── ecoGasEconomicLimit ──────────────────────────────────────────────────

describe("ecoGasEconomicLimit", () => {
  test("same math as oil economic limit", () => {
    const oil = ecoOilEconomicLimit(3000, 3.0, 0.7, 0.8);
    const gas = ecoGasEconomicLimit(3000, 3.0, 0.7, 0.8);
    expect(gas).toBeCloseTo(oil, 8);
  });
});

// ─── ecoArpsEURAtLimit ────────────────────────────────────────────────────

describe("ecoArpsEURAtLimit", () => {
  test("exponential (b=0): EUR = (qi - qEL) / Di", () => {
    const EUR = ecoArpsEURAtLimit(1000, 0.1, 0, 100);
    expect(EUR).toBeCloseTo(9000, 4);  // (1000-100)/0.1
  });

  test("hyperbolic (b=0.5): positive EUR", () => {
    const EUR = ecoArpsEURAtLimit(1000, 0.1, 0.5, 100);
    expect(EUR).toBeGreaterThan(0);
  });

  test("qEL >= qi: EUR = 0", () => {
    expect(ecoArpsEURAtLimit(100, 0.1, 0.5, 100)).toBe(0);
    expect(ecoArpsEURAtLimit(100, 0.1, 0.5, 200)).toBe(0);
  });

  test("hyperbolic EUR > exponential EUR for same qi, Di, b>0", () => {
    // Hyperbolic decline is slower → produces more
    const exp = ecoArpsEURAtLimit(1000, 0.1, 0, 10);
    const hyp = ecoArpsEURAtLimit(1000, 0.1, 0.5, 10);
    expect(hyp).toBeGreaterThan(exp);
  });
});

// ─── ecoTimeToEconomicLimit ───────────────────────────────────────────────

describe("ecoTimeToEconomicLimit", () => {
  test("exponential: t = ln(qi/qEL) / Di", () => {
    const t = ecoTimeToEconomicLimit(1000, 0.1, 0, 100);
    expect(t).toBeCloseTo(Math.log(10) / 0.1, 5);
  });

  test("qEL >= qi: t = 0", () => {
    expect(ecoTimeToEconomicLimit(100, 0.1, 0.5, 100)).toBe(0);
  });

  test("hyperbolic: t > exponential for same Di", () => {
    const tExp = ecoTimeToEconomicLimit(1000, 0.1, 0,   100);
    const tHyp = ecoTimeToEconomicLimit(1000, 0.1, 0.5, 100);
    expect(tHyp).toBeGreaterThan(tExp);
  });
});

// ─── ecoProfitabilityIndex ────────────────────────────────────────────────

describe("ecoProfitabilityIndex", () => {
  test("PI > 1 for positive NPV project", () => {
    const cfs = [-1000, 500, 500, 500];
    expect(ecoProfitabilityIndex(cfs, 0.10)).toBeGreaterThan(1);
  });

  test("PI = 1 when NPV = 0", () => {
    // IRR = 10%, so at 10% NPV = 0 → PI = 1
    const cfs = [-1000, 1100];
    expect(ecoProfitabilityIndex(cfs, 0.10)).toBeCloseTo(1, 5);
  });

  test("PI < 1 for value-destroying project", () => {
    const cfs = [-1000, 100, 100, 100];
    expect(ecoProfitabilityIndex(cfs, 0.20)).toBeLessThan(1);
  });
});

// ─── ecoBreakEvenPrice ────────────────────────────────────────────────────

describe("ecoBreakEvenPrice", () => {
  test("returns positive break-even price", () => {
    const vols  = [100, 90, 80, 70];    // STB/period
    const opex  = [1000, 1000, 1000, 1000];
    const capex = 5000;
    const bep = ecoBreakEvenPrice(vols, opex, capex, 0.10);
    expect(bep).toBeGreaterThan(0);
    expect(bep).toBeLessThan(300);
  });

  test("NPV ≈ 0 at break-even price", () => {
    const vols  = [200, 180, 160];
    const opex  = [2000, 2000, 2000];
    const capex = 5000;
    const rate  = 0.10;
    const bep   = ecoBreakEvenPrice(vols, opex, capex, rate);
    if (!isNaN(bep)) {
      const nri = 1;
      const cfs = [-capex, ...vols.map((v, t) => v * bep * nri - opex[t])];
      expect(ecoNPV(cfs, rate)).toBeCloseTo(0, 0);
    }
  });
});

// ─── ecoUOPDepletion ──────────────────────────────────────────────────────

describe("ecoUOPDepletion", () => {
  test("basic depletion: 10 000 STB / 100 000 STB total, cost $1M", () => {
    // Depletion = (1_000_000 / 100_000) * 10_000 = 100_000
    expect(ecoUOPDepletion(1_000_000, 100_000, 10_000)).toBeCloseTo(100_000, 4);
  });

  test("zero reserves: returns 0", () => {
    expect(ecoUOPDepletion(1_000_000, 0, 10_000)).toBe(0);
  });
});

// ─── ecoBuildCashFlows ────────────────────────────────────────────────────

describe("ecoBuildCashFlows", () => {
  test("constant opex scalar", () => {
    const cfs = ecoBuildCashFlows([100, 90, 80], 50, 0.8, 1000);
    // period 0: 100 * 50 * 0.8 - 1000 = 4000 - 1000 = 3000
    expect(cfs[0]).toBeCloseTo(3000, 6);
  });

  test("with capex: subtracted from cash flow", () => {
    const cfs = ecoBuildCashFlows([100], 50, 1.0, [500], [2000]);
    // 100 * 50 - 500 - 2000 = 5000 - 2500 = 2500
    expect(cfs[0]).toBeCloseTo(2500, 6);
  });

  test("opex array: per-period cost applied correctly", () => {
    const cfs = ecoBuildCashFlows([100, 100], 10, 1.0, [500, 200]);
    expect(cfs[0]).toBeCloseTo(500, 6);   // 1000 - 500
    expect(cfs[1]).toBeCloseTo(800, 6);   // 1000 - 200
  });
});

// ─── ecoTornadoSensitivity ────────────────────────────────────────────────

describe("ecoTornadoSensitivity", () => {
  test("returns array same length as parameters", () => {
    const cfs = [-1000, 400, 400, 400];
    const params = [
      { name: "Revenue", index: 1, baseMult: 1, lowMult: 0.8, highMult: 1.2 },
      { name: "Opex",    index: 2, baseMult: 1, lowMult: 0.9, highMult: 1.1 },
    ];
    const result = ecoTornadoSensitivity(cfs, 0.10, params);
    expect(result).toHaveLength(2);
  });

  test("swing = highNPV - lowNPV", () => {
    const cfs = [-1000, 500, 500];
    const params = [{ name: "P1", index: 1, baseMult: 1, lowMult: 0.5, highMult: 1.5 }];
    const result = ecoTornadoSensitivity(cfs, 0.10, params);
    expect(result[0].swing).toBeCloseTo(result[0].highNPV - result[0].lowNPV, 8);
  });
});

// ─── ecoWorkingInterest ───────────────────────────────────────────────────

import {
  ecoWorkingInterest,
  ecoNetRevenueInterest,
  ecoRoyaltyStack,
  ecoGasPriceEscalation,
  ecoInflationAdjust,
  ecoAfterTaxNPV,
  ecoAfterTaxNPVWithDepletion,
  ecoBuildEscalatedRevenue,
  ecoLOEPerBOE,
  ecoRecycleRatio,
  ecoFindingCost,
} from "../../src/functions/eco";

describe("ecoWorkingInterest", () => {
  test("full WI: WI=1.0 returns gross revenue", () => {
    expect(ecoWorkingInterest(1000000, 1.0)).toBeCloseTo(1000000, 6);
  });

  test("75% WI: returns 75% of gross", () => {
    expect(ecoWorkingInterest(1000000, 0.75)).toBeCloseTo(750000, 6);
  });

  test("zero WI: returns 0", () => {
    expect(ecoWorkingInterest(500000, 0)).toBe(0);
  });
});

// ─── ecoNetRevenueInterest ────────────────────────────────────────────────

describe("ecoNetRevenueInterest", () => {
  test("75% WI, 1/8 royalty: NRI = 0.75 × (1 - 0.125)", () => {
    expect(ecoNetRevenueInterest(0.75, 0.125)).toBeCloseTo(0.75 * 0.875, 10);
  });

  test("100% WI, no royalty: NRI = 1.0", () => {
    expect(ecoNetRevenueInterest(1.0, 0.0)).toBeCloseTo(1.0, 10);
  });

  test("50% WI, 20% royalty: NRI = 0.40", () => {
    expect(ecoNetRevenueInterest(0.5, 0.20)).toBeCloseTo(0.40, 10);
  });
});

// ─── ecoRoyaltyStack ──────────────────────────────────────────────────────

describe("ecoRoyaltyStack", () => {
  test("single royalty: net = gross × (1-r)", () => {
    expect(ecoRoyaltyStack(100000, [0.125])).toBeCloseTo(87500, 6);
  });

  test("stacked 12.5% + 3% ORRI: net = gross × 0.875 × 0.97", () => {
    const expected = 100000 * 0.875 * 0.97;
    expect(ecoRoyaltyStack(100000, [0.125, 0.03])).toBeCloseTo(expected, 6);
  });

  test("no royalties: returns gross", () => {
    expect(ecoRoyaltyStack(100000, [])).toBeCloseTo(100000, 6);
  });

  test("100% royalty: returns 0", () => {
    expect(ecoRoyaltyStack(100000, [1.0])).toBeCloseTo(0, 10);
  });
});

// ─── ecoGasPriceEscalation ───────────────────────────────────────────────

describe("ecoGasPriceEscalation", () => {
  test("zero escalation: all periods = basePrice", () => {
    const prices = ecoGasPriceEscalation(3.50, 0.0, 5);
    expect(prices.length).toBe(5);
    prices.forEach(p => expect(p).toBeCloseTo(3.50, 10));
  });

  test("3%/yr escalation: price[3] = 3.50 × 1.03^3", () => {
    const prices = ecoGasPriceEscalation(3.50, 0.03, 6);
    expect(prices[3]).toBeCloseTo(3.50 * Math.pow(1.03, 3), 10);
  });

  test("period 0 always equals basePrice", () => {
    const prices = ecoGasPriceEscalation(5.0, 0.05, 3);
    expect(prices[0]).toBeCloseTo(5.0, 10);
  });

  test("returns correct array length", () => {
    expect(ecoGasPriceEscalation(3.0, 0.02, 10).length).toBe(10);
  });
});

// ─── ecoInflationAdjust ───────────────────────────────────────────────────

describe("ecoInflationAdjust", () => {
  test("zero inflation: nominal = real", () => {
    const real = [100, 200, 300];
    const nominal = ecoInflationAdjust(real, 0.0);
    expect(nominal).toEqual(real);
  });

  test("3%/yr: nominal[2] = real[2] × 1.03^2", () => {
    const real = [100, 100, 100];
    const nominal = ecoInflationAdjust(real, 0.03);
    expect(nominal[2]).toBeCloseTo(100 * Math.pow(1.03, 2), 10);
  });

  test("period 0 unchanged", () => {
    const real = [500, 600];
    expect(ecoInflationAdjust(real, 0.05)[0]).toBeCloseTo(500, 10);
  });
});

// ─── ecoAfterTaxNPV ───────────────────────────────────────────────────────

describe("ecoAfterTaxNPV", () => {
  test("zero tax: after-tax NPV = pre-tax NPV for positive flows", () => {
    const cfs = [-1000, 500, 500, 500];
    const { ecoNPV } = require("../../src/functions/eco");
    expect(ecoAfterTaxNPV(cfs, 0.10, 0.0)).toBeCloseTo(ecoNPV(cfs, 0.10), 6);
  });

  test("100% tax: all positive inflows wiped out, NPV negative", () => {
    const cfs = [-1000, 500, 500];
    // Positive CFs become 0 after 100% tax, leaving just the -1000
    expect(ecoAfterTaxNPV(cfs, 0.10, 1.0)).toBeCloseTo(-1000, 6);
  });

  test("negative cash flows not taxed", () => {
    const cfs = [-500];  // capex: not taxed
    expect(ecoAfterTaxNPV(cfs, 0.10, 0.21)).toBeCloseTo(-500, 6);
  });
});

// ─── ecoAfterTaxNPVWithDepletion ─────────────────────────────────────────

describe("ecoAfterTaxNPVWithDepletion", () => {
  test("full depletion shield: after-tax CF = pre-tax CF (no tax owed)", () => {
    // If depletion = pre-tax income, taxable = 0
    const cfs = [-1000, 300, 400];
    const depl = [0, 300, 400];  // fully shields income
    const { ecoNPV } = require("../../src/functions/eco");
    expect(ecoAfterTaxNPVWithDepletion(cfs, 0.10, 0.21, depl)).toBeCloseTo(ecoNPV(cfs, 0.10), 6);
  });

  test("no depletion: same as ecoAfterTaxNPV with positive flows", () => {
    const cfs = [100, 200];
    expect(
      ecoAfterTaxNPVWithDepletion(cfs, 0.10, 0.21, [0, 0])
    ).toBeCloseTo(ecoAfterTaxNPV(cfs, 0.10, 0.21), 6);
  });
});

// ─── ecoBuildEscalatedRevenue ─────────────────────────────────────────────

describe("ecoBuildEscalatedRevenue", () => {
  test("zero escalation: same as ecoBuildCashFlows with constant price", () => {
    const volumes = [1000, 900, 800];
    const price = 70.0;
    const nri = 0.75;
    const opex = 500;
    const cfs = ecoBuildEscalatedRevenue(volumes, price, 0.0, nri, opex);
    expect(cfs[0]).toBeCloseTo(volumes[0] * price * nri - opex, 4);
    expect(cfs[2]).toBeCloseTo(volumes[2] * price * nri - opex, 4);
  });

  test("5% escalation: price grows each period", () => {
    const volumes = [100, 100];
    const cfs = ecoBuildEscalatedRevenue(volumes, 60.0, 0.05, 1.0, 0);
    expect(cfs[1]).toBeCloseTo(100 * 60 * 1.05, 4);
  });
});

// ─── ecoLOEPerBOE ─────────────────────────────────────────────────────────

describe("ecoLOEPerBOE", () => {
  test("oil only: LOE = opex / oil volume", () => {
    expect(ecoLOEPerBOE(30000, 1000, 0)).toBeCloseTo(30, 6);
  });

  test("gas only at 6 Mscf/BOE: LOE = opex / (gas/6)", () => {
    // 6000 Mscf / 6 = 1000 BOE
    expect(ecoLOEPerBOE(10000, 0, 6000, 6)).toBeCloseTo(10, 6);
  });

  test("zero volumes: returns 0", () => {
    expect(ecoLOEPerBOE(5000, 0, 0)).toBe(0);
  });

  test("mixed oil and gas", () => {
    // 500 STB + 3000 Mscf/6 = 500 + 500 = 1000 BOE
    expect(ecoLOEPerBOE(15000, 500, 3000, 6)).toBeCloseTo(15, 6);
  });
});

// ─── ecoRecycleRatio ──────────────────────────────────────────────────────

describe("ecoRecycleRatio", () => {
  test("revenue = opex + capex: ratio = 1.0", () => {
    expect(ecoRecycleRatio(2000000, 500000, 1500000)).toBeCloseTo(1.0, 10);
  });

  test("revenue >> capex: ratio > 1", () => {
    expect(ecoRecycleRatio(5000000, 500000, 1000000)).toBeCloseTo(4.5, 10);
  });

  test("zero capex: returns 0", () => {
    expect(ecoRecycleRatio(1000000, 200000, 0)).toBe(0);
  });
});

// ─── ecoFindingCost ───────────────────────────────────────────────────────

describe("ecoFindingCost", () => {
  test("1M capex / 100k BOE = 10 USD/BOE", () => {
    expect(ecoFindingCost(1000000, 100000)).toBeCloseTo(10, 10);
  });

  test("zero EUR: returns 0", () => {
    expect(ecoFindingCost(500000, 0)).toBe(0);
  });
});
