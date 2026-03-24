import {
  wbiTubingBurst,
  wbiTubingCollapse,
  wbiTubingTension,
  wbiTriaxial,
  wbiCasingWear,
} from "../../src/functions/wbi";

describe("wbiTubingBurst", () => {
  it("computes burst using API 5C3 formula", () => {
    // P = 0.875 * 2 * 80000 * 0.362 / 2.875
    const expected = 0.875 * 2 * 80000 * 0.362 / 2.875;
    expect(wbiTubingBurst(2.875, 0.362, 80000, 1.0)).toBeCloseTo(expected, 1);
  });

  it("safety factor reduces burst rating", () => {
    const p1 = wbiTubingBurst(2.875, 0.362, 80000, 1.0);
    const p2 = wbiTubingBurst(2.875, 0.362, 80000, 1.25);
    expect(p2).toBeCloseTo(p1 / 1.25, 3);
  });

  it("thicker wall → higher burst rating", () => {
    const p1 = wbiTubingBurst(2.875, 0.217, 80000, 1.0);
    const p2 = wbiTubingBurst(2.875, 0.362, 80000, 1.0);
    expect(p2).toBeGreaterThan(p1);
  });

  it("larger OD → lower burst rating at same wall", () => {
    const p1 = wbiTubingBurst(2.875, 0.362, 80000, 1.0);
    const p2 = wbiTubingBurst(4.500, 0.362, 80000, 1.0);
    expect(p1).toBeGreaterThan(p2);
  });

  it("higher yield → higher burst rating", () => {
    const p1 = wbiTubingBurst(2.875, 0.362, 55000, 1.0);
    const p2 = wbiTubingBurst(2.875, 0.362, 80000, 1.0);
    expect(p2).toBeGreaterThan(p1);
  });
});

describe("wbiTubingCollapse", () => {
  it("returns a positive collapse pressure", () => {
    expect(wbiTubingCollapse(2.875, 0.362, 80000)).toBeGreaterThan(0);
  });

  it("thicker wall → higher collapse rating", () => {
    const p1 = wbiTubingCollapse(2.875, 0.217, 80000);
    const p2 = wbiTubingCollapse(2.875, 0.362, 80000);
    expect(p2).toBeGreaterThan(p1);
  });

  it("returns min of elastic and yield collapse", () => {
    const OD = 2.875, t = 0.362, Fy = 80000;
    const Dt = OD / t;
    const Pe = 46.95e6 / (Dt * (Dt - 1) * (Dt - 1));
    const Py = 2 * Fy * (Dt - 1) / (Dt * Dt);
    expect(wbiTubingCollapse(OD, t, Fy)).toBeCloseTo(Math.min(Pe, Py), 1);
  });
});

describe("wbiTubingTension", () => {
  it("returns P_yield_lbf > 0", () => {
    const r = wbiTubingTension(2.875, 0.362, 80000);
    expect(r.P_yield_lbf).toBeGreaterThan(0);
  });

  it("allowable equals yield in air with SF=1", () => {
    const r = wbiTubingTension(2.875, 0.362, 80000, 1.0, 1.0);
    expect(r.P_allowable_lbf).toBeCloseTo(r.P_yield_lbf, 3);
  });

  it("buoyancy factor reduces allowable load", () => {
    const r1 = wbiTubingTension(2.875, 0.362, 80000, 1.0, 1.0);
    const r2 = wbiTubingTension(2.875, 0.362, 80000, 0.85, 1.0);
    expect(r2.P_allowable_lbf).toBeLessThan(r1.P_allowable_lbf);
  });

  it("safety factor reduces allowable load", () => {
    const r1 = wbiTubingTension(2.875, 0.362, 80000, 1.0, 1.0);
    const r2 = wbiTubingTension(2.875, 0.362, 80000, 1.0, 1.4);
    expect(r2.P_allowable_lbf).toBeLessThan(r1.P_allowable_lbf);
  });

  it("larger cross-section → higher yield load", () => {
    const r1 = wbiTubingTension(2.875, 0.217, 80000);
    const r2 = wbiTubingTension(2.875, 0.362, 80000);
    expect(r2.P_yield_lbf).toBeGreaterThan(r1.P_yield_lbf);
  });
});

describe("wbiTriaxial", () => {
  it("returns all five properties", () => {
    const r = wbiTriaxial(5000, 1000, 2.875, 0.362, 50000, 80000);
    expect(typeof r.sigma_hoop_psi).toBe("number");
    expect(typeof r.sigma_radial_psi).toBe("number");
    expect(typeof r.sigma_axial_psi).toBe("number");
    expect(typeof r.sigma_VM_psi).toBe("number");
    expect(typeof r.utilization).toBe("number");
  });

  it("sigma_radial = -P_i at inner wall (compressive)", () => {
    const P_i = 5000;
    const r = wbiTriaxial(P_i, 1000, 2.875, 0.362, 0, 80000);
    expect(r.sigma_radial_psi).toBeCloseTo(-P_i, 1);
  });

  it("utilization = sigma_VM / Fy", () => {
    const Fy = 80000;
    const r = wbiTriaxial(5000, 1000, 2.875, 0.362, 50000, Fy);
    expect(r.utilization).toBeCloseTo(r.sigma_VM_psi / Fy, 6);
  });

  it("Von Mises stress is non-negative", () => {
    const r = wbiTriaxial(5000, 1000, 2.875, 0.362, 50000, 80000);
    expect(r.sigma_VM_psi).toBeGreaterThanOrEqual(0);
  });

  it("higher internal pressure → higher VM stress (all else equal)", () => {
    const r1 = wbiTriaxial(2000, 1000, 2.875, 0.362, 0, 80000);
    const r2 = wbiTriaxial(8000, 1000, 2.875, 0.362, 0, 80000);
    expect(r2.sigma_VM_psi).toBeGreaterThan(r1.sigma_VM_psi);
  });
});

describe("wbiCasingWear", () => {
  it("reduces wall thickness by wear_pct", () => {
    const r = wbiCasingWear(7.0, 0.408, 80000, 20);
    expect(r.new_wall_in).toBeCloseTo(0.408 * 0.80, 6);
  });

  it("derated burst < original burst", () => {
    const r = wbiCasingWear(7.0, 0.408, 80000, 20);
    expect(r.burst_derated).toBeLessThan(r.burst_psi);
  });

  it("derated collapse < original collapse", () => {
    const r = wbiCasingWear(7.0, 0.408, 80000, 20);
    expect(r.collapse_derated).toBeLessThan(r.collapse_psi);
  });

  it("0% wear returns same derated as original", () => {
    const r = wbiCasingWear(7.0, 0.408, 80000, 0);
    expect(r.burst_derated).toBeCloseTo(r.burst_psi, 3);
    expect(r.collapse_derated).toBeCloseTo(r.collapse_psi, 3);
  });

  it("higher wear percentage gives lower derated ratings", () => {
    const r1 = wbiCasingWear(7.0, 0.408, 80000, 10);
    const r2 = wbiCasingWear(7.0, 0.408, 80000, 30);
    expect(r2.burst_derated).toBeLessThan(r1.burst_derated);
    expect(r2.collapse_derated).toBeLessThan(r1.collapse_derated);
  });
});
