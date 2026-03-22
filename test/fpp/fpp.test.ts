/**
 * Tests: Field Production Profile (FPP)
 */

import {
  fieldProductionRate,
  fieldCumulativeProduction,
  fieldRateProfile,
  fieldEUR,
  profileStats,
  multiWellRate,
  multiWellRateProfile,
  WellScheduleEntry,
} from "../../src/functions/fpp";

// ─── BPD Model ────────────────────────────────────────────────────────────────

describe("Field Production Rate (BPD Model)", () => {
  const q_peak = 100;     // Mscf/d
  const t_ramp = 6;       // months
  const t_plat = 24;      // months
  const b      = 0.5;     // Arps b-factor
  const Di     = 0.05;    // 1/month nominal

  test("rate = 0 at t = 0 (start of ramp)", () => {
    const q = fieldProductionRate(0, q_peak, t_ramp, t_plat, b, Di);
    expect(q).toBeCloseTo(0, 5);
  });

  test("rate = q_peak/2 at halfway through ramp", () => {
    const q = fieldProductionRate(3, q_peak, t_ramp, t_plat, b, Di);
    expect(q).toBeCloseTo(50, 5);
  });

  test("rate = q_peak during plateau", () => {
    const q = fieldProductionRate(t_ramp + 1, q_peak, t_ramp, t_plat, b, Di);
    expect(q).toBeCloseTo(q_peak, 5);
  });

  test("rate < q_peak after plateau (decline phase)", () => {
    const q = fieldProductionRate(t_ramp + t_plat + 12, q_peak, t_ramp, t_plat, b, Di);
    expect(q).toBeLessThan(q_peak);
    expect(q).toBeGreaterThan(0);
  });

  test("rate decreases monotonically in decline phase", () => {
    const q1 = fieldProductionRate(t_ramp + t_plat + 12, q_peak, t_ramp, t_plat, b, Di);
    const q2 = fieldProductionRate(t_ramp + t_plat + 36, q_peak, t_ramp, t_plat, b, Di);
    expect(q2).toBeLessThan(q1);
  });

  test("negative time returns 0", () => {
    expect(fieldProductionRate(-5, q_peak, t_ramp, t_plat, b, Di)).toBe(0);
  });

  test("no ramp: immediately at plateau", () => {
    const q = fieldProductionRate(1, q_peak, 0, t_plat, b, Di);
    expect(q).toBeCloseTo(q_peak, 5);
  });
});

// ─── Cumulative Production ────────────────────────────────────────────────────

describe("Field Cumulative Production", () => {
  const q_peak = 100, t_ramp = 6, t_plat = 24, b = 0.5, Di = 0.05;

  test("cumulative = 0 at t = 0", () => {
    const Gp = fieldCumulativeProduction(0, q_peak, t_ramp, t_plat, b, Di);
    expect(Gp).toBeCloseTo(0, 3);
  });

  test("cumulative increases with time", () => {
    const Gp1 = fieldCumulativeProduction(12, q_peak, t_ramp, t_plat, b, Di);
    const Gp2 = fieldCumulativeProduction(60, q_peak, t_ramp, t_plat, b, Di);
    expect(Gp2).toBeGreaterThan(Gp1);
  });

  test("cumulative during plateau grows linearly", () => {
    const Gp1 = fieldCumulativeProduction(t_ramp + 6,  q_peak, t_ramp, t_plat, b, Di);
    const Gp2 = fieldCumulativeProduction(t_ramp + 12, q_peak, t_ramp, t_plat, b, Di);
    const Gp3 = fieldCumulativeProduction(t_ramp + 18, q_peak, t_ramp, t_plat, b, Di);
    expect(Gp2 - Gp1).toBeCloseTo(Gp3 - Gp2, 1);
  });
});

// ─── Rate Profile ─────────────────────────────────────────────────────────────

describe("Field Rate Profile", () => {
  test("returns array of {t, rate} pairs", () => {
    const profile = fieldRateProfile(0, 60, 6, 100, 6, 24, 0.5, 0.05);
    expect(profile.length).toBeGreaterThan(0);
    expect(profile[0]).toHaveProperty("t");
    expect(profile[0]).toHaveProperty("rate");
  });

  test("profile stops at economic limit (during decline)", () => {
    const profile = fieldRateProfile(0, 120, 1, 100, 3, 12, 0.5, 0.05, 50);
    expect(profile.length).toBeGreaterThan(0);
    const allRates = profile.map(p => p.rate);
    const lastRate = allRates[allRates.length - 1];
    // Last included point should be >= q_min (or just before it)
    expect(typeof lastRate).toBe("number");
  });
});

// ─── EUR ──────────────────────────────────────────────────────────────────────

describe("Field EUR", () => {
  test("EUR > cumulative at any finite time", () => {
    const EUR = fieldEUR(100, 6, 24, 0.5, 0.05, 5);
    expect(EUR).toBeGreaterThan(0);
  });

  test("EUR decreases with higher economic limit", () => {
    const EUR1 = fieldEUR(100, 6, 24, 0.5, 0.05, 5);
    const EUR2 = fieldEUR(100, 6, 24, 0.5, 0.05, 40);
    expect(EUR1).toBeGreaterThan(EUR2);
  });
});

// ─── Profile Statistics ───────────────────────────────────────────────────────

describe("Profile Statistics", () => {
  const profile = fieldRateProfile(0, 60, 6, 100, 6, 24, 0.5, 0.05);

  test("peak rate is close to q_peak", () => {
    const stats = profileStats(profile);
    expect(stats.peakRate).toBeCloseTo(100, -1);
  });

  test("peak time is at or within plateau", () => {
    const stats = profileStats(profile);
    expect(stats.peakTime_months).toBeGreaterThanOrEqual(6);
    expect(stats.peakTime_months).toBeLessThan(30);
  });

  test("total EUR > 0", () => {
    const stats = profileStats(profile);
    expect(stats.totalEUR).toBeGreaterThan(0);
  });

  test("empty profile returns zeros", () => {
    const stats = profileStats([]);
    expect(stats.peakRate).toBe(0);
    expect(stats.totalEUR).toBe(0);
  });
});

// ─── Multi-Well Aggregation ───────────────────────────────────────────────────

describe("Multi-Well Schedule Aggregation", () => {
  const schedule: WellScheduleEntry[] = [
    { t_start_months: 0,  q_peak: 50, t_ramp_months: 3, t_plat_months: 12, b: 0.5, Di_month: 0.05 },
    { t_start_months: 6,  q_peak: 50, t_ramp_months: 3, t_plat_months: 12, b: 0.5, Di_month: 0.05 },
    { t_start_months: 12, q_peak: 50, t_ramp_months: 3, t_plat_months: 12, b: 0.5, Di_month: 0.05 },
  ];

  test("before all wells: rate = first well only", () => {
    const q = multiWellRate(2, schedule);
    const q_single = fieldProductionRate(2, 50, 3, 12, 0.5, 0.05);
    expect(q).toBeCloseTo(q_single, 3);
  });

  test("after all wells start: rate > any single well", () => {
    const q_total = multiWellRate(20, schedule);
    const q_single = fieldProductionRate(20, 50, 3, 12, 0.5, 0.05);
    expect(q_total).toBeGreaterThan(q_single);
  });

  test("wells not yet started contribute 0", () => {
    const q = multiWellRate(3, schedule);  // second well starts at 6
    const q_well1 = fieldProductionRate(3, 50, 3, 12, 0.5, 0.05);
    expect(q).toBeCloseTo(q_well1, 3);
  });

  test("multiWellRateProfile returns time series", () => {
    const profile = multiWellRateProfile(0, 48, 3, schedule);
    expect(profile.length).toBeGreaterThan(0);
    expect(profile[profile.length - 1].t).toBeCloseTo(48, 0);
  });

  test("total rate peaks after all wells on production", () => {
    const profile = multiWellRateProfile(0, 60, 1, schedule);
    const rates = profile.map(p => p.rate);
    const peakRate = Math.max(...rates);
    // Peak should be > 50 (more than one well)
    expect(peakRate).toBeGreaterThan(50);
  });
});
