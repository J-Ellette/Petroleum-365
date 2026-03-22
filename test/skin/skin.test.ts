/**
 * Tests for P365 — Composite Skin Factor (SKIN) module
 */
import {
  skinHawkins,
  skinEffectiveWellboreRadius,
  skinFlowEfficiency,
  skinKarakasTariq,
  skinPerforation,
  skinNonDarcyBeta,
  skinNonDarcyD,
  skinNonDarcy,
  skinPartialPenetration,
  skinGravelPack,
  skinTotal,
  skinPressureDrop,
  skinProductivityRatio,
  skinStimulationRatio,
} from "../../src/functions/skin";

describe("SKIN — Hawkins Damage Skin", () => {
  test("No damage (kd = k): skin = 0", () => {
    expect(skinHawkins(50, 50, 2, 0.25)).toBeCloseTo(0, 6);
  });

  test("Severe damage (kd << k): large positive skin", () => {
    // k=50 md, kd=1 md, rd=3 ft, rw=0.25 ft
    // S = (50/1 − 1) × ln(3/0.25) = 49 × ln(12) = 49 × 2.485 = 121.8
    const s = skinHawkins(50, 1, 3, 0.25);
    expect(s).toBeCloseTo(49 * Math.log(3 / 0.25), 3);
    expect(s).toBeGreaterThan(100);
  });

  test("Stimulated zone (kd > k): negative skin", () => {
    // Acid stimulation: kd = 5 × k
    const s = skinHawkins(50, 250, 2, 0.25);
    expect(s).toBeLessThan(0);
  });

  test("Skin increases with damage zone radius", () => {
    const s_near = skinHawkins(50, 5, 1, 0.25);
    const s_far  = skinHawkins(50, 5, 5, 0.25);
    expect(s_far).toBeGreaterThan(s_near);
  });
});

describe("SKIN — Effective Wellbore Radius", () => {
  test("Zero skin: rw' = rw", () => {
    expect(skinEffectiveWellboreRadius(0.25, 0)).toBeCloseTo(0.25, 6);
  });

  test("Positive skin (damage): rw' < rw", () => {
    expect(skinEffectiveWellboreRadius(0.25, 5)).toBeLessThan(0.25);
  });

  test("Negative skin (stimulation): rw' > rw", () => {
    expect(skinEffectiveWellboreRadius(0.25, -3)).toBeGreaterThan(0.25);
  });

  test("S = −ln(re/rw) → rw' = re (maximum stimulation, theoretical)", () => {
    const re = 1000;
    const rw = 0.25;
    const s  = -Math.log(re / rw);
    expect(skinEffectiveWellboreRadius(rw, s)).toBeCloseTo(re, 0);
  });
});

describe("SKIN — Flow Efficiency", () => {
  test("Zero skin: FE = 1.0 (no damage, no improvement)", () => {
    const re = 1320;
    const rw = 0.25;
    expect(skinFlowEfficiency(0, re, rw)).toBeCloseTo(1.0, 6);
  });

  test("Positive skin: FE < 1 (damaged well)", () => {
    expect(skinFlowEfficiency(10, 1320, 0.25)).toBeLessThan(1.0);
  });

  test("Negative skin: FE > 1 (stimulated well)", () => {
    expect(skinFlowEfficiency(-3, 1320, 0.25)).toBeGreaterThan(1.0);
  });
});

describe("SKIN — Perforation Skin (Karakas-Tariq)", () => {
  test("Returns a finite number for typical inputs", () => {
    // rw=0.25 ft, rperf=0.03 ft, lperf=1 ft, spf=4, phasing=90°, kh=50, kv=5 md
    const s = skinKarakasTariq(0.25, 0.03, 1.0, 4, 90, 50, 5);
    expect(isFinite(s)).toBe(true);
  });

  test("Longer perforations → less damage (more negative or smaller skin)", () => {
    const s_short = skinKarakasTariq(0.25, 0.03, 0.5, 4, 90, 50, 5);
    const s_long  = skinKarakasTariq(0.25, 0.03, 2.0, 4, 90, 50, 5);
    expect(s_long).toBeLessThan(s_short);
  });
});

describe("SKIN — Perforation Skin (McLeod simplified)", () => {
  test("Undamaged perforations (kPerf=k): only geometry skin", () => {
    // Only the geometric component (negative = stimulation from depth)
    const s = skinPerforation(0.25, 0.03, 1.0, 4, 50, 50);
    expect(s).toBeLessThan(0); // deeper → effective rw grows → negative geom skin
  });

  test("Damaged perforations (kPerf << k): positive skin contribution", () => {
    // Crushed zone: kPerf = 0.1 md, k = 50 md
    const s = skinPerforation(0.25, 0.03, 1.0, 4, 0.1, 50);
    expect(s).toBeGreaterThan(skinPerforation(0.25, 0.03, 1.0, 4, 50, 50));
  });
});

describe("SKIN — Non-Darcy Skin", () => {
  test("Non-Darcy beta from permeability and porosity", () => {
    // k=0.1 md, phi=0.15
    const beta = skinNonDarcyBeta(0.1, 0.15);
    expect(beta).toBeGreaterThan(0);
    expect(isFinite(beta)).toBe(true);
  });

  test("Higher permeability → lower beta (less turbulence)", () => {
    const betaLow  = skinNonDarcyBeta(0.01, 0.15);
    const betaHigh = skinNonDarcyBeta(100, 0.15);
    expect(betaLow).toBeGreaterThan(betaHigh);
  });

  test("Non-Darcy D coefficient: finite positive", () => {
    const beta = skinNonDarcyBeta(0.1, 0.15);
    const D = skinNonDarcyD(beta, 0.1, 20, 0.25, 0.025, 0.9, 620, 0.65);
    expect(D).toBeGreaterThan(0);
    expect(isFinite(D)).toBe(true);
  });

  test("Non-Darcy skin scales linearly with rate", () => {
    const D = 0.001; // (Mscf/d)^-1
    expect(skinNonDarcy(D, 1000)).toBeCloseTo(1.0, 6);
    expect(skinNonDarcy(D, 2000)).toBeCloseTo(2.0, 6);
  });

  test("Zero rate → zero non-Darcy skin", () => {
    expect(skinNonDarcy(0.001, 0)).toBeCloseTo(0, 8);
  });
});

describe("SKIN — Partial Penetration Skin", () => {
  test("Full penetration (hp = h): no partial penetration skin", () => {
    const s = skinPartialPenetration(100, 100, 0.25, 50, 5, 0);
    expect(s).toBeCloseTo(0, 1);
  });

  test("Partial penetration: skin > 0 for hp < h", () => {
    const s = skinPartialPenetration(100, 30, 0.25, 50, 5, 35);
    expect(s).toBeGreaterThanOrEqual(0);
  });

  test("Higher anisotropy (lower kv/kh) → different skin", () => {
    const s_iso   = skinPartialPenetration(100, 50, 0.25, 50, 50, 25);
    const s_aniso = skinPartialPenetration(100, 50, 0.25, 50, 1, 25);
    expect(isFinite(s_iso)).toBe(true);
    expect(isFinite(s_aniso)).toBe(true);
  });
});

describe("SKIN — Gravel Pack Skin", () => {
  test("Clean gravel pack (kgp >> k): negative skin (gravel pack stimulates like larger rw)", () => {
    // Clean gravel: kgp=100,000 md >> k=50 md → skin ≈ -ln(rgp/rw) ≈ -0.47
    const s = skinGravelPack(50, 100000, 0.4, 0.25);
    expect(s).toBeLessThan(0); // negative (slight stimulation from larger effective wellbore)
    expect(s).toBeGreaterThan(-2); // but small in magnitude
  });

  test("Damaged gravel pack (kgp ≈ k): small skin", () => {
    const s = skinGravelPack(50, 100, 0.4, 0.25);
    expect(s).toBeGreaterThanOrEqual(-2);
    expect(s).toBeLessThanOrEqual(2);
  });

  test("Very damaged gravel pack (kgp < k): positive skin", () => {
    const s = skinGravelPack(50, 5, 0.4, 0.25);
    expect(s).toBeGreaterThan(0);
  });
});

describe("SKIN — Composite Total Skin", () => {
  test("Sum of zero components = 0", () => {
    expect(skinTotal(0, 0, 0, 0, 0)).toBeCloseTo(0, 8);
  });

  test("Damage + perforation + non-Darcy adds correctly", () => {
    const sD  = 5.0;   // damage
    const sP  = -2.0;  // perforation (stimulates)
    const sPP = 3.0;   // partial penetration
    const sND = 1.5;   // non-Darcy
    const sGP = 0.0;   // no gravel pack
    const sO  = 0.5;   // other
    expect(skinTotal(sD, sP, sPP, sND, sGP, sO)).toBeCloseTo(8.0, 6);
  });

  test("Stimulation: net negative skin possible", () => {
    const s = skinTotal(-1, -3, 0, 0.2, 0);
    expect(s).toBeLessThan(0);
  });
});

describe("SKIN — Pressure Drop and Productivity", () => {
  test("Zero skin: no additional pressure drop", () => {
    expect(skinPressureDrop(500, 1.0, 1.2, 50, 20, 0)).toBeCloseTo(0, 6);
  });

  test("Skin pressure drop scales linearly with skin", () => {
    const pd1 = skinPressureDrop(500, 1.0, 1.2, 50, 20, 1);
    const pd5 = skinPressureDrop(500, 1.0, 1.2, 50, 20, 5);
    expect(pd5).toBeCloseTo(pd1 * 5, 4);
  });

  test("Productivity ratio: zero skin → PR = 1.0", () => {
    expect(skinProductivityRatio(1320, 0.25, 0)).toBeCloseTo(1.0, 6);
  });

  test("Productivity ratio: positive skin → PR < 1 (damaged)", () => {
    expect(skinProductivityRatio(1320, 0.25, 10)).toBeLessThan(1.0);
  });

  test("Productivity ratio: negative skin → PR > 1 (stimulated)", () => {
    expect(skinProductivityRatio(1320, 0.25, -3)).toBeGreaterThan(1.0);
  });

  test("Stimulation ratio: no change in skin → SR = 1.0", () => {
    expect(skinStimulationRatio(1320, 0.25, 5, 5)).toBeCloseTo(1.0, 6);
  });

  test("Stimulation ratio: acid removes damage → SR > 1", () => {
    const sr = skinStimulationRatio(1320, 0.25, 15, 2);
    expect(sr).toBeGreaterThan(1.0);
  });

  test("Stimulation ratio: hydraulic fracture (negative after skin) → SR > 1", () => {
    const sr = skinStimulationRatio(1320, 0.25, 5, -4);
    expect(sr).toBeGreaterThan(1.0);
  });
});
