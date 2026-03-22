/**
 * Tests: Hydraulic Fracturing (FRAC)
 */

import {
  pknAverageWidth,
  pknMaxWidth,
  pknFractureVolume,
  pknFluidEfficiency,
  pknNetPressure,
  kgdAverageWidth,
  kgdFractureVolume,
  radialFractureRadius,
  carterLeakoffCoeff,
  carterCumulativeLoss,
  proppantSettlingVelocity,
  hinderedSettlingVelocity,
  dimensionlessConductivity,
  fracturedWellSkin,
  fractureStimulationRatio,
} from "../../src/functions/frac";

// ─── PKN Geometry ─────────────────────────────────────────────────────────────

describe("PKN Fracture Geometry", () => {
  const mu = 100;     // cp fracturing fluid
  const qi = 15;      // bbl/min injection rate
  const xf = 500;     // ft half-length
  const E  = 4e6;     // psi Young's modulus
  const nu = 0.25;    // Poisson's ratio

  test("average width > 0", () => {
    const w = pknAverageWidth(mu, qi, xf, E, nu);
    expect(w).toBeGreaterThan(0);
  });

  test("width increases with viscosity", () => {
    const w1 = pknAverageWidth(10,  qi, xf, E, nu);
    const w2 = pknAverageWidth(200, qi, xf, E, nu);
    expect(w2).toBeGreaterThan(w1);
  });

  test("width increases with injection rate", () => {
    const w1 = pknAverageWidth(mu, 5,  xf, E, nu);
    const w2 = pknAverageWidth(mu, 30, xf, E, nu);
    expect(w2).toBeGreaterThan(w1);
  });

  test("max width = (4/π) × avg width", () => {
    const w_avg = pknAverageWidth(mu, qi, xf, E, nu);
    const w_max = pknMaxWidth(w_avg);
    expect(w_max).toBeCloseTo((4 / Math.PI) * w_avg, 5);
  });

  test("fracture volume > 0", () => {
    const w = pknAverageWidth(mu, qi, xf, E, nu);
    const V = pknFractureVolume(xf, 100, w);
    expect(V).toBeGreaterThan(0);
  });

  test("fluid efficiency in [0,1]", () => {
    const w = pknAverageWidth(mu, qi, xf, E, nu);
    const Vf = pknFractureVolume(xf, 100, w);
    const eff = pknFluidEfficiency(Vf, Vf * 2.5);  // 60% fluid loss
    expect(eff).toBeGreaterThan(0);
    expect(eff).toBeLessThanOrEqual(1.0);
  });

  test("net pressure > 0", () => {
    const w = pknAverageWidth(mu, qi, xf, E, nu);
    const dP = pknNetPressure(w, xf, E, nu);
    expect(dP).toBeGreaterThan(0);
  });
});

// ─── KGD Geometry ─────────────────────────────────────────────────────────────

describe("KGD Fracture Geometry", () => {
  test("average width > 0", () => {
    const w = kgdAverageWidth(100, 15, 400, 100, 4e6, 0.25);
    expect(w).toBeGreaterThan(0);
  });

  test("volume > 0", () => {
    const w = kgdAverageWidth(100, 15, 400, 100, 4e6, 0.25);
    const V = kgdFractureVolume(400, 100, w);
    expect(V).toBeGreaterThan(0);
  });
});

// ─── Radial Fracture ──────────────────────────────────────────────────────────

describe("Radial Fracture", () => {
  test("radius > 0", () => {
    const R = radialFractureRadius(5000, 4e6, 0.25, 500);
    expect(R).toBeGreaterThan(0);
  });

  test("radius increases with injected volume", () => {
    const R1 = radialFractureRadius(1000,  4e6, 0.25, 500);
    const R2 = radialFractureRadius(10000, 4e6, 0.25, 500);
    expect(R2).toBeGreaterThan(R1);
  });
});

// ─── Carter Leakoff ───────────────────────────────────────────────────────────

describe("Carter Leakoff", () => {
  test("total coefficient < any individual component", () => {
    const C = carterLeakoffCoeff(0.01, 0.02, 0.03);
    expect(C).toBeLessThan(0.01);
    expect(C).toBeGreaterThan(0);
  });

  test("cumulative loss increases with time", () => {
    const V1 = carterCumulativeLoss(0.005, 10000, 30);
    const V2 = carterCumulativeLoss(0.005, 10000, 60);
    expect(V2).toBeGreaterThan(V1);
  });

  test("cumulative loss increases with fracture area", () => {
    const V1 = carterCumulativeLoss(0.005, 5000,  30);
    const V2 = carterCumulativeLoss(0.005, 20000, 30);
    expect(V2).toBeGreaterThan(V1);
  });
});

// ─── Proppant Settling ────────────────────────────────────────────────────────

describe("Proppant Settling", () => {
  test("settling velocity > 0 for denser proppant than fluid", () => {
    const vs = proppantSettlingVelocity(0.022, 165, 65, 500);
    expect(vs).toBeGreaterThan(0);
  });

  test("settling velocity = 0 when proppant density = fluid density", () => {
    const vs = proppantSettlingVelocity(0.022, 65, 65, 500);
    expect(vs).toBe(0);
  });

  test("larger proppant settles faster", () => {
    const vs1 = proppantSettlingVelocity(0.011, 165, 65, 500);  // 40/70 mesh
    const vs2 = proppantSettlingVelocity(0.022, 165, 65, 500);  // 20/40 mesh
    expect(vs2).toBeGreaterThan(vs1);
  });

  test("higher viscosity slows settling", () => {
    const vs1 = proppantSettlingVelocity(0.022, 165, 65, 100);
    const vs2 = proppantSettlingVelocity(0.022, 165, 65, 1000);
    expect(vs1).toBeGreaterThan(vs2);
  });

  test("hindered settling < free settling", () => {
    const vs = proppantSettlingVelocity(0.022, 165, 65, 500);
    const vh = hinderedSettlingVelocity(vs, 0.3);
    expect(vh).toBeLessThan(vs);
  });

  test("throws for negative viscosity", () => {
    expect(() => proppantSettlingVelocity(0.022, 165, 65, -10)).toThrow();
  });
});

// ─── Dimensionless Conductivity and Skin ─────────────────────────────────────

describe("Fracture Dimensionless Conductivity and Skin", () => {
  test("CfD > 0 for valid inputs", () => {
    const CfD = dimensionlessConductivity(100000, 0.25, 5, 300);
    expect(CfD).toBeGreaterThan(0);
  });

  test("CfD increases with fracture permeability", () => {
    const C1 = dimensionlessConductivity(50000,  0.25, 5, 300);
    const C2 = dimensionlessConductivity(200000, 0.25, 5, 300);
    expect(C2).toBeGreaterThan(C1);
  });

  test("fractured well skin is negative (stimulation)", () => {
    const Sf = fracturedWellSkin(300, 0.35, 50);  // CfD=50 (high conductivity)
    expect(Sf).toBeLessThan(0);
  });

  test("longer fracture gives more negative skin", () => {
    const S1 = fracturedWellSkin(100, 0.35, 50);
    const S2 = fracturedWellSkin(500, 0.35, 50);
    expect(S2).toBeLessThan(S1);
  });

  test("low CfD reduces stimulation benefit (less negative skin)", () => {
    const S_hi = fracturedWellSkin(300, 0.35, 50);
    const S_lo = fracturedWellSkin(300, 0.35, 0.5);
    expect(S_lo).toBeGreaterThan(S_hi);
  });

  test("stimulation ratio > 1 with damage", () => {
    const Sf = fracturedWellSkin(300, 0.35, 50);
    const ratio = fractureStimulationRatio(1000, 0.35, Sf, 10);  // S_damage=10
    expect(ratio).toBeGreaterThan(1);
  });
});

// ─── FRAC Extended — Poroelastic Closure Stress ────────────────────────────

import {
  fracPoroelasticClosure,
  fracNetPressure,
  fracFluidEfficiency,
  fracISIP,
  fracNolteG,
  fracGDerivedClosure,
  fracNolteLeakoff,
  fracSurfaceTreatingPressure,
  fracBreakdownPressure,
} from "../../src/functions/frac";

describe("FRAC Extended — Poroelastic Closure (Uniaxial Strain)", () => {
  // Reference scenario: depth 10,000 ft, OBG = 1.0 psi/ft → σ_v = 10000 psi
  // P_pore = 4600 psi, ν = 0.25, α = 0.8, no tectonic stress
  // σ_h = [0.25/0.75] * (10000 - 0.8*4600) + 0.8*4600 + 0
  //      = 0.3333 * (10000 - 3680) + 3680
  //      = 0.3333 * 6320 + 3680
  //      = 2106.7 + 3680 = 5786.7 psi
  const sigma_v = 10000;
  const P_pore  = 4600;
  const nu      = 0.25;
  const alpha   = 0.8;

  test("uniaxial strain closure stress — reference case", () => {
    const sh = fracPoroelasticClosure(sigma_v, P_pore, nu, alpha, 0);
    expect(sh).toBeCloseTo(5786.7, 0);
  });

  test("tectonic stress offset shifts closure upward", () => {
    const sh_notect = fracPoroelasticClosure(sigma_v, P_pore, nu, alpha, 0);
    const sh_tect   = fracPoroelasticClosure(sigma_v, P_pore, nu, alpha, 500);
    expect(sh_tect).toBeCloseTo(sh_notect + 500, 1);
  });

  test("higher ν increases closure stress", () => {
    const sh_low  = fracPoroelasticClosure(sigma_v, P_pore, 0.2, alpha, 0);
    const sh_high = fracPoroelasticClosure(sigma_v, P_pore, 0.35, alpha, 0);
    expect(sh_high).toBeGreaterThan(sh_low);
  });

  test("higher pore pressure increases poroelastic closure stress", () => {
    // ∂σ_h/∂Pp = α*(1 - ν/(1-ν)) > 0 when α > 0, so higher Pp → higher σ_h
    const sh_lo  = fracPoroelasticClosure(sigma_v, 3000, nu, alpha, 0);
    const sh_hi  = fracPoroelasticClosure(sigma_v, P_pore, nu, alpha, 0);
    expect(sh_hi).toBeGreaterThan(sh_lo);
  });

  test("invalid ν throws error", () => {
    expect(() => fracPoroelasticClosure(sigma_v, P_pore, 0, alpha, 0)).toThrow();
    expect(() => fracPoroelasticClosure(sigma_v, P_pore, 1, alpha, 0)).toThrow();
  });

  test("invalid Biot coefficient throws error", () => {
    expect(() => fracPoroelasticClosure(sigma_v, P_pore, nu, -0.1, 0)).toThrow();
    expect(() => fracPoroelasticClosure(sigma_v, P_pore, nu, 1.1, 0)).toThrow();
  });
});

describe("FRAC Extended — Net Pressure", () => {
  test("net pressure = treating - closure - friction", () => {
    expect(fracNetPressure(8500, 7800, 200)).toBeCloseTo(500, 1);
  });

  test("default friction is zero", () => {
    expect(fracNetPressure(8000, 7500)).toBeCloseTo(500, 1);
  });

  test("negative net pressure when below closure", () => {
    expect(fracNetPressure(7000, 7500, 0)).toBeLessThan(0);
  });
});

describe("FRAC Extended — Fluid Efficiency", () => {
  test("efficiency = frac volume / injected volume", () => {
    expect(fracFluidEfficiency(80, 100)).toBeCloseTo(0.8, 4);
  });

  test("clamped to 1 when frac > injected (data artifact)", () => {
    expect(fracFluidEfficiency(110, 100)).toBeCloseTo(1.0, 4);
  });

  test("zero frac volume → efficiency 0", () => {
    expect(fracFluidEfficiency(0, 100)).toBeCloseTo(0.0, 4);
  });

  test("zero injected volume throws", () => {
    expect(() => fracFluidEfficiency(50, 0)).toThrow();
  });
});

describe("FRAC Extended — ISIP", () => {
  // P_surface = 2000 psi, TVD = 8000 ft, fluid = 8.33 ppg (freshwater)
  // Hydrostatic = 8.33 * 0.052 * 8000 = 3465 psi
  // ISIP_BH = 2000 + 3465 = 5465 psi
  test("bottomhole ISIP calculation", () => {
    const isip = fracISIP(2000, 8000, 8.33);
    expect(isip).toBeCloseTo(5464.9, 0);
  });

  test("higher density fluid → higher hydrostatic → higher BH ISIP", () => {
    const isip_fresh  = fracISIP(2000, 8000, 8.33);
    const isip_brine  = fracISIP(2000, 8000, 9.5);
    expect(isip_brine).toBeGreaterThan(isip_fresh);
  });
});

describe("FRAC Extended — Nolte G-Function", () => {
  // G(0) = (4/3)*[(1+0)^1.5 - 0^1.5 - 1] = (4/3)*(1-0-1) = 0
  test("G(0) = 0", () => {
    expect(fracNolteG(0)).toBeCloseTo(0, 6);
  });

  // G(1) = (4/3)*[(2)^1.5 - (1)^1.5 - 1] = (4/3)*(2.8284 - 1 - 1) = (4/3)*0.8284 = 1.1045
  test("G(1) reference value", () => {
    expect(fracNolteG(1)).toBeCloseTo(1.1045, 3);
  });

  // G should be monotonically increasing
  test("G is monotonically increasing", () => {
    expect(fracNolteG(2)).toBeGreaterThan(fracNolteG(1));
    expect(fracNolteG(5)).toBeGreaterThan(fracNolteG(2));
  });

  test("negative deltaT_D throws error", () => {
    expect(() => fracNolteG(-0.1)).toThrow();
  });
});

describe("FRAC Extended — G-Derived Closure", () => {
  // P_isip = 8000, dP/dG = 200 psi/unit G, G_closure = 2.5
  // P_closure = 8000 - 200 * 2.5 = 7500 psi
  test("closure from G-function intercept", () => {
    expect(fracGDerivedClosure(8000, 200, 2.5)).toBeCloseTo(7500, 1);
  });

  test("zero G closure → returns ISIP (no pressure decay)", () => {
    expect(fracGDerivedClosure(8000, 200, 0)).toBeCloseTo(8000, 1);
  });
});

describe("FRAC Extended — Nolte Leakoff Coefficient", () => {
  // dP/dG = 150 psi, E' = 2e6 psi, qi = 10 bbl/min, tp = 60 min, Af = 100000 ft²
  // qi_ft3 = 10 * 5.61458 = 56.1458 ft³/min
  // CL = 150 * 56.1458 * 60 / (2e6 * 100000) = 504811 / 2e11 ≈ 2.524e-6
  test("leakoff coefficient from G-plot slope", () => {
    const CL = fracNolteLeakoff(150, 2e6, 10, 60, 100000);
    // qi_ft3 = 10 * 5.61458 = 56.1458 ft³/min
    // CL = 150 * 56.1458 * 60 / (2e6 * 1e5) ≈ 2.527e-6
    expect(CL).toBeCloseTo(2.527e-6, 9);
  });

  test("zero E' throws error", () => {
    expect(() => fracNolteLeakoff(150, 0, 10, 60, 100000)).toThrow();
  });
});

describe("FRAC Extended — Surface Treating Pressure", () => {
  // BH = 9000, TVD = 10000 ft, fluid = 8.5 ppg → hydrostatic = 4420 psi
  // ΔP_pipe = 300, ΔP_perf = 100
  // P_surface = 9000 - 4420 + 300 + 100 = 4980 psi
  test("surface treating pressure calculation", () => {
    const Psurf = fracSurfaceTreatingPressure(9000, 10000, 8.5, 300, 100);
    expect(Psurf).toBeCloseTo(4980, 0);
  });

  test("no friction → lower surface pressure", () => {
    const Pfriction = fracSurfaceTreatingPressure(9000, 10000, 8.5, 300, 100);
    const Pnofriction = fracSurfaceTreatingPressure(9000, 10000, 8.5, 0, 0);
    expect(Pnofriction).toBeLessThan(Pfriction);
  });
});

describe("FRAC Extended — Breakdown Pressure", () => {
  // σ_h = 7000, T0 = 1000, P_pore = 4000
  // P_bd = 7000 + 1000 - 4000 = 4000 psi
  test("fracture breakdown pressure", () => {
    expect(fracBreakdownPressure(7000, 1000, 4000)).toBeCloseTo(4000, 1);
  });

  test("higher tensile strength → higher breakdown", () => {
    const lo = fracBreakdownPressure(7000, 500, 4000);
    const hi = fracBreakdownPressure(7000, 2000, 4000);
    expect(hi).toBeGreaterThan(lo);
  });
});
