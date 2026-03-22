/**
 * Tests for P365 — Geomechanics (GEO) module
 */
import {
  geoEMWToGradient,
  geoGradientToEMW,
  geoOverburdenStress,
  geoOverburdenGradient,
  geoBulkDensityFromSonic,
  geoNormalTransitTime,
  geoPorePressureEaton,
  geoNormalPorePressure,
  geoEffectiveVerticalStress,
  geoBiotCoefficient,
  geoMinHorizontalStress,
  geoFractureGradientHubbertWillis,
  geoFractureGradientMatthewsKelly,
  geoFractureGradientEaton,
  geoFractureClosurePressure,
  geoMudWindow,
  geoUCSFromYoungsModulus,
  geoMohrCoulombShearStrength,
  geoWellboreCollapseGradient,
  geoStaticPoissonRatio,
  geoCastagnaVs,
  geoDynamicElasticModuli,
  geoOffshoreOverburden,
} from "../../src/functions/geo";

describe("GEO — Unit Helpers", () => {
  test("EMW to gradient: 8.55 ppg → 0.4446 psi/ft", () => {
    expect(geoEMWToGradient(8.55)).toBeCloseTo(0.4446, 3);
  });

  test("Gradient to EMW: 0.4446 psi/ft → 8.55 ppg", () => {
    expect(geoGradientToEMW(0.4446)).toBeCloseTo(8.55, 2);
  });

  test("Round-trip EMW ↔ gradient is consistent", () => {
    const ppg = 12.5;
    expect(geoGradientToEMW(geoEMWToGradient(ppg))).toBeCloseTo(ppg, 8);
  });
});

describe("GEO — Overburden Stress", () => {
  test("Overburden stress at 10,000 ft with 19.2 ppg bulk density", () => {
    // 10000 × 19.2 × 0.052 = 9984 psi
    const sigma_v = geoOverburdenStress(10000, 19.2);
    expect(sigma_v).toBeCloseTo(9984, 0);
  });

  test("Overburden gradient from bulk density", () => {
    // 19.2 × 0.052 = 0.9984 psi/ft
    expect(geoOverburdenGradient(19.2)).toBeCloseTo(0.9984, 4);
  });

  test("Gardner bulk density from sonic (default coefficients)", () => {
    // Gardner formula: ρ = a × dt^(−b); at dt=100: ρ = 0.31 × 100^(−0.25) ≈ 0.098 g/cm³
    const rho = geoBulkDensityFromSonic(100, 0.31, 0.25);
    expect(rho).toBeCloseTo(0.31 * Math.pow(100, -0.25), 6);
    expect(rho).toBeGreaterThan(0);
  });

  test("Gardner bulk density monotonically decreases with transit time", () => {
    // Slower (higher dt) = lower velocity = less dense
    const rho80  = geoBulkDensityFromSonic(80);
    const rho120 = geoBulkDensityFromSonic(120);
    expect(rho80).toBeGreaterThan(rho120);
  });
});

describe("GEO — Pore Pressure Prediction (Eaton)", () => {
  test("Normal compaction trend decreases with depth", () => {
    const dt1000  = geoNormalTransitTime(1000, 200, 0.000218);
    const dt5000  = geoNormalTransitTime(5000, 200, 0.000218);
    const dt10000 = geoNormalTransitTime(10000, 200, 0.000218);
    expect(dt1000).toBeGreaterThan(dt5000);
    expect(dt5000).toBeGreaterThan(dt10000);
  });

  test("Normal pore pressure at 10,000 ft (8.55 ppg seawater)", () => {
    // 10000 × 8.55 × 0.052 = 4446 psi
    expect(geoNormalPorePressure(10000, 8.55)).toBeCloseTo(4446, 0);
  });

  test("Eaton pore pressure: normal trend → hydrostatic", () => {
    const depth = 10000;
    const obv   = geoOverburdenStress(depth, 19.2);
    const ppNorm = geoNormalPorePressure(depth);
    const dtNorm = 100; // µs/ft
    // When observed = normal → pore pressure = hydrostatic
    const pp = geoPorePressureEaton(obv, dtNorm, dtNorm, ppNorm);
    expect(pp).toBeCloseTo(ppNorm, 1);
  });

  test("Eaton pore pressure: overpressure when observed dt > normal", () => {
    // High transit time (slow formation) → overpressure
    const depth = 10000;
    const obv   = geoOverburdenStress(depth, 19.2);
    const ppNorm = geoNormalPorePressure(depth);
    const dtNorm  = 80;   // normal (compact)
    const dtObs   = 120;  // observed (undercompacted = overpressured)
    const pp = geoPorePressureEaton(obv, dtObs, dtNorm, ppNorm);
    expect(pp).toBeGreaterThan(ppNorm);
  });
});

describe("GEO — Effective Stress and Biot Coefficient", () => {
  test("Effective stress with alpha=1 (Terzaghi)", () => {
    expect(geoEffectiveVerticalStress(9984, 4446, 1.0)).toBeCloseTo(5538, 0);
  });

  test("Effective stress with Biot < 1 gives higher effective stress", () => {
    const sigmaV = 9984;
    const pp     = 4446;
    const biot   = 0.8;
    expect(geoEffectiveVerticalStress(sigmaV, pp, biot)).toBeCloseTo(
      sigmaV - biot * pp, 4,
    );
  });

  test("Biot coefficient: quartz grain (Kgrain=38 GPa)", () => {
    // Loose sand: Kdry ≈ 2 GPa → alpha ≈ 0.947
    const alpha = geoBiotCoefficient(2.0, 38.0);
    expect(alpha).toBeCloseTo(1 - 2 / 38, 4);
    expect(alpha).toBeGreaterThan(0.9);
  });

  test("Biot coefficient = 0 when Kdry = Kgrain (rigid grain)", () => {
    expect(geoBiotCoefficient(38, 38)).toBeCloseTo(0, 8);
  });

  test("Biot coefficient = 1 when Kdry = 0 (extremely soft frame)", () => {
    expect(geoBiotCoefficient(0, 38)).toBeCloseTo(1, 8);
  });
});

describe("GEO — Minimum Horizontal Stress", () => {
  test("Min horizontal stress with nu=0.25, alpha=1", () => {
    const sigmaVEff = 5538; // psi
    const pp        = 4446;
    const nu        = 0.25;
    // σ_h = (0.25/0.75) × 5538 + 4446 = 1846 + 4446 = 6292 psi
    const sigma_h = geoMinHorizontalStress(sigmaVEff, pp, nu);
    expect(sigma_h).toBeCloseTo(6292, 0);
  });

  test("Higher Poisson ratio → higher horizontal stress", () => {
    const sEff = 5000;
    const pp   = 4000;
    const sh20 = geoMinHorizontalStress(sEff, pp, 0.20);
    const sh30 = geoMinHorizontalStress(sEff, pp, 0.30);
    expect(sh30).toBeGreaterThan(sh20);
  });
});

describe("GEO — Fracture Gradient", () => {
  const depth  = 10000;   // ft
  const sigmaV = 9984;    // psi (overburden)
  const pp     = 5000;    // psi (abnormal pressure)
  const sigmaVEff = sigmaV - pp; // 4984 psi

  test("Hubbert-Willis fracture gradient (psi/ft)", () => {
    const frac = geoFractureGradientHubbertWillis(depth, sigmaV, pp);
    // (1/3) × (9984/10000 + 2 × 5000/10000) = (1/3) × (0.9984 + 1.0) = 0.666 psi/ft
    expect(frac).toBeCloseTo(0.6661, 3);
  });

  test("Matthews-Kelly fracture gradient (default Gulf Coast Ki)", () => {
    const frac = geoFractureGradientMatthewsKelly(depth, sigmaVEff, pp);
    expect(frac).toBeGreaterThan(0.5);
    expect(frac).toBeLessThan(1.2);
  });

  test("Eaton fracture gradient with nu=0.25", () => {
    const frac = geoFractureGradientEaton(depth, sigmaVEff, pp, 0.25);
    // ((0.25/0.75) × 4984 + 5000) / 10000 = (1661.3 + 5000) / 10000 = 0.6661
    expect(frac).toBeCloseTo(0.6661, 3);
  });

  test("Eaton and HW give same result at pp=1/3 overburden with nu=0.25", () => {
    // When pp = σv/3: both methods converge for the standard case
    // Just check they're both in physically reasonable range
    const fgEaton = geoFractureGradientEaton(depth, sigmaVEff, pp, 0.25);
    const fgHW    = geoFractureGradientHubbertWillis(depth, sigmaV, pp);
    expect(fgEaton).toBeCloseTo(fgHW, 2);
  });

  test("Higher pore pressure → higher fracture gradient", () => {
    const fg_low  = geoFractureGradientEaton(depth, sigmaV - 3000, 3000, 0.25);
    const fg_high = geoFractureGradientEaton(depth, sigmaV - 7000, 7000, 0.25);
    expect(fg_high).toBeGreaterThan(fg_low);
  });

  test("Fracture closure pressure equals min horizontal stress", () => {
    const fcp = geoFractureClosurePressure(sigmaVEff, pp, 0.25);
    const sh  = geoMinHorizontalStress(sigmaVEff, pp, 0.25);
    expect(fcp).toBeCloseTo(sh, 4);
  });
});

describe("GEO — Mud Weight Window", () => {
  test("Mud window returns correct structure and positive window", () => {
    const depth = 10000;
    const pp    = 4446;      // psi (normal pressure)
    const fg    = 0.73;      // psi/ft (fracture gradient)
    const result = geoMudWindow(depth, pp, fg);

    expect(result).toHaveProperty("minMW_ppg");
    expect(result).toHaveProperty("lowerBound_ppg");
    expect(result).toHaveProperty("upperBound_ppg");
    expect(result).toHaveProperty("maxMW_ppg");
    expect(result).toHaveProperty("window_ppg");

    expect(result.minMW_ppg).toBeCloseTo(pp / depth / 0.052, 2);
    expect(result.window_ppg).toBeGreaterThan(0);
    expect(result.lowerBound_ppg).toBeGreaterThan(result.minMW_ppg);
    expect(result.upperBound_ppg).toBeLessThan(result.maxMW_ppg);
  });

  test("Narrow window (high pore pressure + low frac gradient) → window ≈ 0", () => {
    const depth = 10000;
    const pp    = 8000; // psi (very high)
    const fg    = pp / depth / 0.052 * 0.052 * 1.001; // barely above pore pressure
    const result = geoMudWindow(depth, pp, fg + 0.001);
    expect(result.window_ppg).toBeGreaterThanOrEqual(0);
  });
});

describe("GEO — Rock Strength", () => {
  test("UCS from Young's modulus (Chang et al.)", () => {
    // E_dyn = 20 GPa → UCS = 0.0045 × 20000 = 90 MPa
    expect(geoUCSFromYoungsModulus(20)).toBeCloseTo(90, 1);
  });

  test("Mohr-Coulomb shear strength: phi=30°, C0=500 psi, sigma_n=2000 psi", () => {
    // τ = 500 + 2000 × tan(30°) = 500 + 2000 × 0.5774 = 1654.7 psi
    expect(geoMohrCoulombShearStrength(2000, 500, 30)).toBeCloseTo(1654.7, 0);
  });

  test("Wellbore collapse gradient is finite and less than overburden", () => {
    const sigma_h = 7000;
    const ucs     = 5000;  // psi
    const pp      = 4000;
    const phi     = 30;    // degrees
    const collapse = geoWellboreCollapseGradient(sigma_h, ucs, pp, phi);
    expect(isFinite(collapse)).toBe(true);
    expect(collapse).toBeLessThan(sigma_h);
  });

  test("Higher UCS → lower collapse pressure (stronger rock needs less mud weight)", () => {
    const sh  = 7000;
    const pp  = 4000;
    const phi = 30;
    const c1 = geoWellboreCollapseGradient(sh, 3000, pp, phi);
    const c2 = geoWellboreCollapseGradient(sh, 8000, pp, phi);
    // Stronger rock (higher UCS) → lower minimum wellbore pressure needed
    expect(c2).toBeLessThan(c1);
  });
});

describe("GEO — Elastic Properties", () => {
  test("Static Poisson ratio from dynamic (Eissa-Kazi): nu_dyn=0.3 → nu_stat≈0.081", () => {
    expect(geoStaticPoissonRatio(0.3)).toBeCloseTo(0.77 * 0.3 - 0.15, 4);
  });

  test("Static Poisson ratio is clamped between 0.05 and 0.45", () => {
    expect(geoStaticPoissonRatio(0.0)).toBeGreaterThanOrEqual(0.05); // clamped low
    expect(geoStaticPoissonRatio(0.8)).toBeLessThanOrEqual(0.45);    // clamped high
  });

  test("Castagna Vs from Vp (mudrock line)", () => {
    // Vp = 3.0 km/s → Vs = 0.8621 × 3.0 − 1.1724 = 1.414 km/s
    expect(geoCastagnaVs(3.0)).toBeCloseTo(0.8621 * 3.0 - 1.1724, 4);
  });

  test("Dynamic elastic moduli from sonic logs", () => {
    // Typical shale: Vp = 3000 m/s, Vs = 1500 m/s, rho = 2200 kg/m³
    const result = geoDynamicElasticModuli(3000, 1500, 2200);
    expect(result).toHaveProperty("nu_dynamic");
    expect(result).toHaveProperty("E_dynamic_GPa");

    // nu = (Vp² − 2Vs²) / (2(Vp² − Vs²)) = (9e6 − 4.5e6) / (2 × 4.5e6) = 0.5 → actually:
    // = (9e6 − 2*2.25e6) / (2*(9e6 − 2.25e6)) = 4.5e6 / (2*6.75e6) = 0.333
    expect(result.nu_dynamic).toBeCloseTo(0.333, 2);
    expect(result.E_dynamic_GPa).toBeGreaterThan(0);
  });
});

describe("GEO — Offshore Overburden", () => {
  test("Offshore overburden: 500 ft water + 10000 ft sediment", () => {
    const result = geoOffshoreOverburden(500, 10000, 18.0, 8.55);
    expect(result.totalDepth_ft).toBeCloseTo(10500, 0);
    expect(result.obStress_psi).toBeGreaterThan(0);
    expect(result.obGrad_psiPerFt).toBeGreaterThan(0);
    // Gradient between water (8.55 ppg) and sediment (18 ppg) density — weighted
    expect(result.obGrad_psiPerFt).toBeGreaterThan(8.55 * 0.052);
    expect(result.obGrad_psiPerFt).toBeLessThan(18.0 * 0.052);
  });

  test("Offshore obStress = water_stress + sediment_stress", () => {
    const wd  = 500;
    const sd  = 10000;
    const sedDens = 18.0;
    const wDens   = 8.55;
    const result = geoOffshoreOverburden(wd, sd, sedDens, wDens);
    const expected = wd * wDens * 0.052 + sd * sedDens * 0.052;
    expect(result.obStress_psi).toBeCloseTo(expected, 1);
  });
});
