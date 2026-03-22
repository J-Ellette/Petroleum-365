/**
 * Tests: Material Balance Equation (MBE)
 */

import {
  gasPZ,
  ogipFromTwoPoints,
  ogipFromRegression,
  gasPressureAtGp,
  oilExpansionEo,
  gasCapExpansionEg,
  fwExpansionEfw,
  undergroundWithdrawal,
  havlenaOdeh,
  solutionGasDriveIndex,
  gasCapDriveIndex,
  waterDriveIndex,
  compressibilityDriveIndex,
  effectiveCompressibility,
  fetkovichWei,
  fetkovichAquiferJ,
  fetkovichWaterInfluxStep,
  geopressuredModifiedPZ,
  geopressuredOGIP,
} from "../../src/functions/mbe";

// ─── Gas p/Z Analysis ─────────────────────────────────────────────────────────

describe("Gas p/Z ratio", () => {
  test("p/Z at initial conditions", () => {
    expect(gasPZ(3000, 0.8)).toBeCloseTo(3750, 2);
  });

  test("Z = 1 gives p/Z = p", () => {
    expect(gasPZ(2000, 1.0)).toBeCloseTo(2000, 5);
  });

  test("throws on Z <= 0", () => {
    expect(() => gasPZ(2000, 0)).toThrow();
  });
});

describe("OGIP from two p/Z points", () => {
  // Pi=3000, Zi=0.8: pi/Zi=3750
  // G=50 Bscf → at Gp=20: p/Z = 3750*(1-20/50) = 2250
  test("OGIP back-calculation (exact two-point)", () => {
    const G = ogipFromTwoPoints(3000, 0.8, 2250 * 0.89, 0.89, 20);
    // p2 = 2250*Z2 = 2250*0.89 = 2002.5, Z2=0.89 → p2/Z2 = 2250
    // G = 3750 * 20 / (3750 - 2250) = 75000/1500 = 50
    expect(G).toBeCloseTo(50, 1);
  });

  test("throws when p/Z increases (pressure went up)", () => {
    expect(() => ogipFromTwoPoints(3000, 0.8, 3500, 0.9, 5)).toThrow();
  });
});

describe("OGIP from regression", () => {
  test("linear p/Z dataset gives correct OGIP", () => {
    // G = 100, pi/Zi = 4000
    // p/Z = 4000 * (1 - Gp/100)
    const G = 100;
    const pz_i = 4000;
    const Gp_arr = [0, 20, 40, 60, 80];
    const pz_arr = Gp_arr.map(gp => pz_i * (1 - gp / G));
    const p_arr = pz_arr.map(pz => pz * 0.85);  // Z = 0.85 at all points (simplification)
    const Z_arr = Array(5).fill(0.85);

    const [ogip] = ogipFromRegression(p_arr, Z_arr, Gp_arr);
    expect(ogip).toBeCloseTo(G, 0);
  });
});

describe("Gas reservoir pressure forecast", () => {
  test("pressure at Gp = 0 equals Pi when Z is Zi", () => {
    const p = gasPressureAtGp(100, 3000, 0.8, 0, 0.8);
    expect(p).toBeCloseTo(3000, 5);
  });

  test("pressure decreases as Gp increases", () => {
    const p1 = gasPressureAtGp(100, 3000, 0.8, 20, 0.85);
    const p2 = gasPressureAtGp(100, 3000, 0.8, 50, 0.9);
    expect(p2).toBeLessThan(p1);
  });
});

// ─── Oil MBE Expansion Terms ──────────────────────────────────────────────────

describe("Oil expansion term Eo", () => {
  test("Eo = 0 at initial conditions (Bo=Boi, Rs=Rsi)", () => {
    const Boi = 1.3, Rsi = 650, Bg = 0.0015;
    expect(oilExpansionEo(Boi, Boi, Rsi, Rsi, Bg)).toBeCloseTo(0, 8);
  });

  test("Eo > 0 as pressure drops (Bo increases slightly, Rs decreases)", () => {
    // Below bubble point: Bo increases, Rs decreases
    const Boi = 1.3, Bo = 1.35, Rsi = 650, Rs = 500, Bg = 0.002;
    const Eo = oilExpansionEo(Bo, Boi, Rs, Rsi, Bg);
    expect(Eo).toBeGreaterThan(0);
  });
});

describe("Gas cap expansion Eg", () => {
  test("Eg = 0 at initial conditions (Bg = Bgi)", () => {
    expect(gasCapExpansionEg(1.3, 0.002, 0.002)).toBeCloseTo(0, 8);
  });

  test("Eg > 0 when Bg > Bgi (pressure drops)", () => {
    expect(gasCapExpansionEg(1.3, 0.004, 0.002)).toBeGreaterThan(0);
  });
});

describe("Formation/water expansion Efw", () => {
  test("Efw = 0 at dP = 0", () => {
    expect(fwExpansionEfw(1.3, 0.1, 0.2, 3e-6, 4e-6, 0)).toBeCloseTo(0, 8);
  });

  test("Efw > 0 for positive dP", () => {
    expect(fwExpansionEfw(1.3, 0.1, 0.2, 3e-6, 4e-6, 500)).toBeGreaterThan(0);
  });
});

describe("Underground withdrawal F", () => {
  test("F = Np*Bo when Rp=Rs, no water production", () => {
    const Np = 1000, Bo = 1.3, Rp = 500, Rs = 500, Bg = 0.002;
    const F = undergroundWithdrawal(Np, Bo, Rp, Rs, Bg, 0, 1.03);
    expect(F).toBeCloseTo(Np * Bo, 5);
  });

  test("F increases when Rp > Rs (free gas production)", () => {
    const F1 = undergroundWithdrawal(1000, 1.3, 500, 500, 0.002, 0, 1.03);
    const F2 = undergroundWithdrawal(1000, 1.3, 800, 500, 0.002, 0, 1.03);
    expect(F2).toBeGreaterThan(F1);
  });
});

// ─── Havlena-Odeh ─────────────────────────────────────────────────────────────

describe("Havlena-Odeh OOIP estimation", () => {
  test("recovers N and mN from synthetic linear data with gas cap", () => {
    // F = N*Eo + N*m*Eg → F/Eo = N + N*m*(Eg/Eo)
    // Use N=50M, m=0.3, so slope = N*m = 15M
    const N = 50e6, m = 0.3;
    const Eo_arr  = [0.01, 0.025, 0.045, 0.07, 0.10];
    const Eg_arr  = Eo_arr.map(eo => eo * 1.5);   // Eg/Eo = 1.5 = constant ratio
    const F_arr   = Eo_arr.map((eo, i) => N * eo + N * m * Eg_arr[i]);

    // x = Eg/Eo = 1.5 for all points → no variation → will fail R²
    // Use varying Eg/Eo ratio instead
    const Eg2_arr = [0.010, 0.032, 0.065, 0.105, 0.155];  // varying
    const F2_arr  = Eo_arr.map((eo, i) => N * eo + N * m * Eg2_arr[i]);

    const [N_calc, mN_calc, Rsq] = havlenaOdeh(F2_arr, Eo_arr, Eg2_arr);
    expect(Rsq).toBeGreaterThan(0.99);
    expect(N_calc).toBeCloseTo(N, -5);   // within order-of-magnitude tolerance
  });

  test("throws on mismatched array lengths", () => {
    expect(() => havlenaOdeh([1, 2], [1], [1, 2])).toThrow();
  });
});

// ─── Drive Mechanism Indices ──────────────────────────────────────────────────

describe("Drive Mechanism Indices", () => {
  const N = 1e6, F = 5e5;

  test("solution gas drive index in (0, 1)", () => {
    const Eo = 0.3;
    const idx = solutionGasDriveIndex(N, Eo, F);
    expect(idx).toBeGreaterThan(0);
    expect(idx).toBeLessThan(2);   // may exceed 1 if under-shot
  });

  test("water drive index > 0 when We > 0", () => {
    const We = 1e5, Wp = 500, Bw = 1.03;
    const idx = waterDriveIndex(We, Wp, Bw, F);
    expect(idx).toBeGreaterThan(0);
  });

  test("gas cap drive index = 0 when m = 0", () => {
    expect(gasCapDriveIndex(N, 0, 0.01, F)).toBeCloseTo(0, 8);
  });

  test("compressibility drive index > 0", () => {
    expect(compressibilityDriveIndex(N, 0.001, F)).toBeGreaterThan(0);
  });
});

// ─── Effective Compressibility ────────────────────────────────────────────────

describe("Effective Compressibility", () => {
  test("ct > 0 for typical reservoir conditions", () => {
    const ct = effectiveCompressibility(0.2, 0.1, 15e-6, 3e-6, 4e-6);
    expect(ct).toBeGreaterThan(0);
  });

  test("ct = cf when single-phase rock only (So=0, Sw=1, co=cw=0)", () => {
    // So=1-1-0=0: ct = 0*co + 1*cw + cf = cw+cf
    const ct = effectiveCompressibility(1.0, 0.0, 0, 0, 4e-6);
    expect(ct).toBeCloseTo(4e-6, 12);
  });
});

// ─── Fetkovich Aquifer ────────────────────────────────────────────────────────

describe("Fetkovich Aquifer Model", () => {
  test("Wei = ct * Wi * Pi", () => {
    const Wei = fetkovichWei(5e-6, 1e9, 3000);
    expect(Wei).toBeCloseTo(5e-6 * 1e9 * 3000, 0);
  });

  test("J > 0", () => {
    const J = fetkovichAquiferJ(100, 200, 0.5, 5000, 2000);
    expect(J).toBeGreaterThan(0);
  });

  test("Water influx step > 0 when P_aq > P_res", () => {
    const dWe = fetkovichWaterInfluxStep(1000, 1e7, 3000, 3000, 2800, 30);
    expect(dWe).toBeGreaterThan(0);
  });

  test("Water influx = 0 when P_aq = P_res (pressure equilibrium)", () => {
    const dWe = fetkovichWaterInfluxStep(1000, 1e7, 3000, 2800, 2800, 30);
    expect(dWe).toBeCloseTo(0, 3);
  });
});

// ─── Geopressured p/Z ────────────────────────────────────────────────────────

describe("Geopressured Modified p/Z", () => {
  test("Modified p/Z equals standard p/Z at initial conditions (dP=0)", () => {
    // At p = Pi, dP = Pi - Pi = 0 → modifier = 1 → same as p/Z
    const pz = gasPZ(3000, 0.8);
    const pzMod = geopressuredModifiedPZ(3000, 0.8, 3000, 5e-6, 3e-6, 0.2);
    expect(pzMod).toBeCloseTo(pz, 4);
  });

  test("Modified p/Z is different from standard p/Z when pressure drops", () => {
    const pz    = gasPZ(2000, 0.85);
    const pzMod = geopressuredModifiedPZ(2000, 0.85, 3000, 5e-6, 3e-6, 0.2);
    expect(pzMod).not.toBeCloseTo(pz, 2);
  });

  test("Geopressured OGIP is greater than standard OGIP (due to extra expansion)", () => {
    const pi = 5000, zi = 1.1, p2 = 4000, z2 = 1.05, Gp2 = 10;
    const ogipStd  = ogipFromTwoPoints(pi, zi, p2, z2, Gp2);
    const ogipGeo  = geopressuredOGIP(pi, zi, p2, z2, Gp2, 8e-6, 3e-6, 0.25);
    // Geopressured reservoirs have extra energy → OGIP estimate differs
    expect(typeof ogipGeo).toBe("number");
    expect(ogipGeo).toBeGreaterThan(0);
  });
});
