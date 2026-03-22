/**
 * Tests: Wellbore Heat Transfer (WHT)
 */

import {
  whtGeothermalTemp,
  whtOHTC,
  whtFluidTemp,
  whtInsulationThickness,
  whtHeatLoss,
} from "../../src/functions/wht";

// ─── whtGeothermalTemp ────────────────────────────────────────────────────────

describe("whtGeothermalTemp", () => {
  test("surface temperature at depth 0 = surface_T", () => {
    expect(whtGeothermalTemp(0, 70, 1.5)).toBe(70);
  });

  test("T at 5000 ft = 70 + 1.5×50 = 145 °F", () => {
    expect(whtGeothermalTemp(5000, 70, 1.5)).toBeCloseTo(145, 6);
  });

  test("temperature increases with depth", () => {
    const T1 = whtGeothermalTemp(3000, 60, 1.2);
    const T2 = whtGeothermalTemp(6000, 60, 1.2);
    expect(T2).toBeGreaterThan(T1);
  });

  test("higher gradient gives higher temperature", () => {
    const T1 = whtGeothermalTemp(5000, 70, 1.0);
    const T2 = whtGeothermalTemp(5000, 70, 2.0);
    expect(T2).toBeGreaterThan(T1);
  });

  test("linearity: T(depth) = T_surf + grad*depth/100", () => {
    for (const d of [1000, 3000, 7000]) {
      expect(whtGeothermalTemp(d, 70, 1.5)).toBeCloseTo(70 + 1.5 * d / 100, 8);
    }
  });
});

// ─── whtOHTC ─────────────────────────────────────────────────────────────────

describe("whtOHTC", () => {
  // 2-7/8" tubing (r_ti=1.125", r_to=1.4375"), inside 7" casing (r_ci=3.063", r_co=3.5")
  const r_ti = 1.125;
  const r_to = 1.4375;
  const r_ci = 3.063;
  const r_co = 3.5;

  test("returns a positive U value", () => {
    const U = whtOHTC(r_ti, r_to, r_ci, r_co);
    expect(U).toBeGreaterThan(0);
  });

  test("U decreases with lower annulus convection (more insulation effect)", () => {
    const U1 = whtOHTC(r_ti, r_to, r_ci, r_co, 26, 0.5, 5);
    const U2 = whtOHTC(r_ti, r_to, r_ci, r_co, 26, 0.5, 20);
    expect(U2).toBeGreaterThan(U1);
  });

  test("U decreases with lower cement conductivity", () => {
    const U1 = whtOHTC(r_ti, r_to, r_ci, r_co, 26, 0.3, 10);
    const U2 = whtOHTC(r_ti, r_to, r_ci, r_co, 26, 1.0, 10);
    expect(U2).toBeGreaterThan(U1);
  });

  test("typical U value is in reasonable range (0.5–50 BTU/hr/ft²/°F)", () => {
    const U = whtOHTC(r_ti, r_to, r_ci, r_co);
    expect(U).toBeGreaterThan(0.5);
    expect(U).toBeLessThan(50);
  });
});

// ─── whtFluidTemp ─────────────────────────────────────────────────────────────

describe("whtFluidTemp", () => {
  const q      = 500;     // bbl/d
  const T_surf = 80;      // °F
  const depth  = 6000;    // ft
  const grad   = 1.5;     // °F/100 ft
  const U      = 2.0;     // BTU/hr/ft²/°F
  const d_in   = 2.441;   // tubing ID (in)
  const rho    = 52;      // lb/ft³ (crude oil)
  const Cp     = 0.45;    // BTU/lb/°F

  const { T_bhf, T_profile } = whtFluidTemp(q, T_surf, depth, grad, U, d_in, rho, Cp);

  test("T_bhf > T_surf (fluid heats up going downhole)", () => {
    expect(T_bhf).toBeGreaterThan(T_surf);
  });

  test("T_bhf ≤ formation temperature at depth", () => {
    const T_form = whtGeothermalTemp(depth, T_surf, grad);
    expect(T_bhf).toBeLessThanOrEqual(T_form + 0.01);
  });

  test("profile has 10 points", () => {
    expect(T_profile).toHaveLength(10);
  });

  test("profile depth starts at 0", () => {
    expect(T_profile[0].depth_ft).toBe(0);
  });

  test("profile depth ends at depth_ft", () => {
    expect(T_profile[T_profile.length - 1].depth_ft).toBeCloseTo(depth, 6);
  });

  test("fluid temperature increases with depth (downward flow)", () => {
    const temps = T_profile.map(p => p.T_fluid_degF);
    for (let i = 1; i < temps.length; i++) {
      expect(temps[i]).toBeGreaterThan(temps[i - 1]);
    }
  });

  test("formation temperature profile is linear", () => {
    T_profile.forEach(({ depth_ft: d, T_formation_degF: T }) => {
      expect(T).toBeCloseTo(T_surf + grad * d / 100, 6);
    });
  });
});

// ─── whtInsulationThickness ───────────────────────────────────────────────────

describe("whtInsulationThickness", () => {
  test("returns positive thickness", () => {
    const t = whtInsulationThickness(200, 40, 0.5, 2.0, 0.02);
    expect(t).toBeGreaterThan(0);
  });

  test("lower U_max requires more insulation", () => {
    const t1 = whtInsulationThickness(200, 40, 1.0, 2.0, 0.02);
    const t2 = whtInsulationThickness(200, 40, 0.5, 2.0, 0.02);
    expect(t2).toBeGreaterThan(t1);
  });

  test("lower k_insul requires less thickness (better insulator)", () => {
    const t1 = whtInsulationThickness(200, 40, 0.5, 2.0, 0.01);
    const t2 = whtInsulationThickness(200, 40, 0.5, 2.0, 0.04);
    expect(t1).toBeLessThan(t2);
  });

  test("throws on non-positive U_max", () => {
    expect(() => whtInsulationThickness(200, 40, 0, 2.0, 0.02)).toThrow();
  });

  test("round-trip: U from thickness ≈ U_max", () => {
    const U_max  = 0.5;
    const r_pipe = 2.0;
    const k      = 0.02;
    const t      = whtInsulationThickness(200, 40, U_max, r_pipe, k);
    const U_back = k / (r_pipe * Math.log(1 + t / r_pipe));
    expect(U_back).toBeCloseTo(U_max, 6);
  });
});

// ─── whtHeatLoss ─────────────────────────────────────────────────────────────

describe("whtHeatLoss", () => {
  test("returns positive heat loss when T_fluid > T_ambient", () => {
    const Q = whtHeatLoss(500, 150, 70, 2.0, 2.875, 6000);
    expect(Q).toBeGreaterThan(0);
  });

  test("heat loss is zero when T_fluid = T_ambient", () => {
    const Q = whtHeatLoss(500, 70, 70, 2.0, 2.875, 6000);
    expect(Q).toBeCloseTo(0, 6);
  });

  test("heat loss increases with higher U", () => {
    const Q1 = whtHeatLoss(500, 150, 70, 1.0, 2.875, 6000);
    const Q2 = whtHeatLoss(500, 150, 70, 4.0, 2.875, 6000);
    expect(Q2).toBeGreaterThan(Q1);
  });

  test("heat loss increases with depth", () => {
    const Q1 = whtHeatLoss(500, 150, 70, 2.0, 2.875, 3000);
    const Q2 = whtHeatLoss(500, 150, 70, 2.0, 2.875, 6000);
    expect(Q2).toBeGreaterThan(Q1);
  });

  test("manual check: Q = U·π·d_o·depth·ΔT", () => {
    const U = 2.0, d_od_in = 3.5, depth = 5000, dT = 80;
    const d_od_ft = d_od_in / 12;
    const Q_expected = U * Math.PI * d_od_ft * depth * dT;
    const Q = whtHeatLoss(500, 70 + dT, 70, U, d_od_in, depth);
    expect(Q).toBeCloseTo(Q_expected, 3);
  });
});
