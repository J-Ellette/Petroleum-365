import {
  vfpNodalIPRGasVLP,
  vfpNodalIPROilVLP,
  vfpChokeSensitivity,
} from "../../src/functions/vfp";

describe("vfpNodalIPRGasVLP — gas nodal intersection", () => {
  const q_arr = [100, 200, 300, 400, 500, 600, 700, 800];

  it("returns arrays of correct length", () => {
    const r = vfpNodalIPRGasVLP(3000, 10, 30, 1000, 0.33, 0, 620, 0.65,
      q_arr, 500, 2.441, 8000, 150, 0.65);
    expect(r.IPR_Pwf_arr).toHaveLength(q_arr.length);
    expect(r.VLP_Pwf_arr).toHaveLength(q_arr.length);
  });

  it("IPR Pwf decreases as rate increases", () => {
    const r = vfpNodalIPRGasVLP(3000, 10, 30, 1000, 0.33, 0, 620, 0.65,
      q_arr, 500, 2.441, 8000, 150, 0.65);
    for (let i = 0; i < r.IPR_Pwf_arr.length - 1; i++) {
      expect(r.IPR_Pwf_arr[i]).toBeGreaterThanOrEqual(r.IPR_Pwf_arr[i + 1]);
    }
  });

  it("VLP Pwf increases as rate increases", () => {
    const r = vfpNodalIPRGasVLP(3000, 10, 30, 1000, 0.33, 0, 620, 0.65,
      q_arr, 500, 2.441, 8000, 150, 0.65);
    for (let i = 0; i < r.VLP_Pwf_arr.length - 1; i++) {
      expect(r.VLP_Pwf_arr[i]).toBeLessThanOrEqual(r.VLP_Pwf_arr[i + 1]);
    }
  });

  it("intersection Pwf is positive", () => {
    const r = vfpNodalIPRGasVLP(3000, 10, 30, 1000, 0.33, 0, 620, 0.65,
      q_arr, 500, 2.441, 8000, 150, 0.65);
    expect(r.Pwf_intersection_psia).toBeGreaterThan(0);
  });

  it("intersection q is within the search range", () => {
    const r = vfpNodalIPRGasVLP(3000, 10, 30, 1000, 0.33, 0, 620, 0.65,
      q_arr, 500, 2.441, 8000, 150, 0.65);
    expect(r.q_intersection_Mscfd).toBeGreaterThanOrEqual(q_arr[0]);
    expect(r.q_intersection_Mscfd).toBeLessThanOrEqual(q_arr[q_arr.length - 1]);
  });

  it("higher reservoir pressure → higher intersection Pwf", () => {
    const q = [100, 200, 300, 400, 500, 600];
    const r1 = vfpNodalIPRGasVLP(2000, 10, 30, 1000, 0.33, 0, 620, 0.65, q, 300, 2.441, 6000, 150, 0.65);
    const r2 = vfpNodalIPRGasVLP(3000, 10, 30, 1000, 0.33, 0, 620, 0.65, q, 300, 2.441, 6000, 150, 0.65);
    expect(r2.Pwf_intersection_psia).toBeGreaterThan(r1.Pwf_intersection_psia);
  });
});

describe("vfpNodalIPROilVLP — oil nodal intersection", () => {
  const q_arr = [100, 200, 400, 600, 800, 1000];

  it("returns arrays of correct length", () => {
    const r = vfpNodalIPROilVLP(3000, 1.5, 2500, q_arr, 200, 2.992, 8000, 150, 0.85, 0.65, 500);
    expect(r.IPR_arr).toHaveLength(q_arr.length);
    expect(r.VLP_arr).toHaveLength(q_arr.length);
  });

  it("intersection Pwf is positive", () => {
    const r = vfpNodalIPROilVLP(3000, 1.5, 2500, q_arr, 200, 2.992, 8000, 150, 0.85, 0.65, 500);
    expect(r.Pwf_intersection_psia).toBeGreaterThan(0);
  });

  it("intersection q is within the search range", () => {
    const r = vfpNodalIPROilVLP(3000, 1.5, 2500, q_arr, 200, 2.992, 8000, 150, 0.85, 0.65, 500);
    expect(r.q_intersection_bpd).toBeGreaterThanOrEqual(q_arr[0]);
    expect(r.q_intersection_bpd).toBeLessThanOrEqual(q_arr[q_arr.length - 1]);
  });

  it("IPR Pwf at q=0 equals reservoir pressure (above Pb, Darcy)", () => {
    const r = vfpNodalIPROilVLP(3000, 1.5, 2500, [0, 100, 200], 200, 2.992, 8000, 150, 0.85, 0.65, 500);
    expect(r.IPR_arr[0]).toBeCloseTo(3000, 0);
  });

  it("higher PI → higher intersection rate", () => {
    // Use smaller tubing to ensure VLP intersects IPR within the search range
    const q = [100, 200, 400, 600, 800, 1000, 1200, 1500, 2000];
    const r1 = vfpNodalIPROilVLP(3000, 1.0, 2500, q, 500, 1.995, 8000, 150, 0.85, 0.65, 500);
    const r2 = vfpNodalIPROilVLP(3000, 2.0, 2500, q, 500, 1.995, 8000, 150, 0.85, 0.65, 500);
    expect(r2.q_intersection_bpd).toBeGreaterThan(r1.q_intersection_bpd);
  });
});

describe("vfpChokeSensitivity — Gilbert choke analysis", () => {
  const q_arr = [200, 400, 600, 800, 1000];

  it("returns arrays of correct length", () => {
    const r = vfpChokeSensitivity(q_arr, 600, 16, 100);
    expect(r.q_arr).toHaveLength(q_arr.length);
    expect(r.P_up_arr).toHaveLength(q_arr.length);
    expect(r.dP_arr).toHaveLength(q_arr.length);
  });

  it("upstream pressure increases with flow rate", () => {
    const r = vfpChokeSensitivity(q_arr, 600, 16, 100);
    for (let i = 0; i < r.P_up_arr.length - 1; i++) {
      expect(r.P_up_arr[i + 1]).toBeGreaterThan(r.P_up_arr[i]);
    }
  });

  it("dP = P_up - P_dn", () => {
    const P_dn = 100;
    const r = vfpChokeSensitivity(q_arr, 600, 16, P_dn);
    for (let i = 0; i < r.dP_arr.length; i++) {
      expect(r.dP_arr[i]).toBeCloseTo(r.P_up_arr[i] - P_dn, 6);
    }
  });

  it("larger choke gives lower upstream pressure", () => {
    const r_small = vfpChokeSensitivity([500], 600, 16, 100);
    const r_large = vfpChokeSensitivity([500], 600, 32, 100);
    expect(r_small.P_up_arr[0]).toBeGreaterThan(r_large.P_up_arr[0]);
  });

  it("higher GLR gives higher upstream pressure", () => {
    const r_low  = vfpChokeSensitivity([500], 300, 16, 100);
    const r_high = vfpChokeSensitivity([500], 1000, 16, 100);
    expect(r_high.P_up_arr[0]).toBeGreaterThan(r_low.P_up_arr[0]);
  });

  it("returns same q_arr as input", () => {
    const r = vfpChokeSensitivity(q_arr, 600, 16, 100);
    expect(r.q_arr).toEqual(q_arr);
  });
});
