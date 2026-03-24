import {
  lkWilsonK,
  lkRachfordRice,
  lkVLEFlash,
} from "../../src/functions/eos";

// Typical two-component system: methane (C1) + n-butane (C4)
const Tc = [190.6, 425.1];   // K
const Pc = [46.1,  37.96];   // bar
const om = [0.011, 0.200];   // acentric factors

describe("lkWilsonK", () => {
  it("returns K-factors array of correct length", () => {
    const K = lkWilsonK(300, 10, Tc, Pc, om);
    expect(K).toHaveLength(2);
  });

  it("K1 > 1 for light component (C1 above its Tc/T ratio)", () => {
    const K = lkWilsonK(300, 10, Tc, Pc, om);
    expect(K[0]).toBeGreaterThan(1); // C1 preferentially in vapor
  });

  it("K2 < 1 for heavy component (C4 preferentially liquid)", () => {
    const K = lkWilsonK(300, 10, Tc, Pc, om);
    expect(K[1]).toBeLessThan(1);
  });

  it("throws when array lengths mismatch", () => {
    expect(() => lkWilsonK(300, 10, Tc, [46.1], om)).toThrow();
  });

  it("higher pressure → lower K-factors (components more condensed)", () => {
    const K_lo = lkWilsonK(300, 5, Tc, Pc, om);
    const K_hi = lkWilsonK(300, 50, Tc, Pc, om);
    expect(K_hi[0]).toBeLessThan(K_lo[0]);
  });

  it("higher temperature → higher K-factors (more volatile)", () => {
    const K_lo = lkWilsonK(250, 10, Tc, Pc, om);
    const K_hi = lkWilsonK(350, 10, Tc, Pc, om);
    expect(K_hi[0]).toBeGreaterThan(K_lo[0]);
  });
});

describe("lkRachfordRice", () => {
  it("returns beta in [0,1]", () => {
    const K = lkWilsonK(300, 10, Tc, Pc, om);
    const r = lkRachfordRice([0.7, 0.3], K);
    expect(r.beta).toBeGreaterThanOrEqual(0);
    expect(r.beta).toBeLessThanOrEqual(1);
  });

  it("x and y arrays have correct length", () => {
    const K = lkWilsonK(300, 10, Tc, Pc, om);
    const r = lkRachfordRice([0.7, 0.3], K);
    expect(r.x_arr).toHaveLength(2);
    expect(r.y_arr).toHaveLength(2);
  });

  it("x and y sum to approximately 1", () => {
    const K = lkWilsonK(300, 10, Tc, Pc, om);
    const r = lkRachfordRice([0.7, 0.3], K);
    const sumX = r.x_arr.reduce((a, b) => a + b, 0);
    const sumY = r.y_arr.reduce((a, b) => a + b, 0);
    expect(sumX).toBeCloseTo(1, 3);
    expect(sumY).toBeCloseTo(1, 3);
  });

  it("yi = Ki * xi", () => {
    const K = lkWilsonK(300, 10, Tc, Pc, om);
    const r = lkRachfordRice([0.7, 0.3], K);
    for (let i = 0; i < K.length; i++) {
      expect(r.y_arr[i]).toBeCloseTo(K[i] * r.x_arr[i], 4);
    }
  });

  it("throws when array lengths mismatch", () => {
    expect(() => lkRachfordRice([0.7, 0.3], [5.0])).toThrow();
  });

  it("all-vapor when K >> 1 for all components", () => {
    const r = lkRachfordRice([0.5, 0.5], [100, 50]);
    expect(r.beta).toBeCloseTo(1, 2);
  });

  it("all-liquid when K << 1 for all components", () => {
    const r = lkRachfordRice([0.5, 0.5], [0.001, 0.002]);
    expect(r.beta).toBeCloseTo(0, 2);
  });

  it("converged flag is true for a well-behaved case", () => {
    const K = lkWilsonK(300, 10, Tc, Pc, om);
    const r = lkRachfordRice([0.7, 0.3], K);
    expect(r.converged).toBe(true);
  });
});

describe("lkVLEFlash", () => {
  it("returns correct shape", () => {
    const r = lkVLEFlash(300, 10, [0.7, 0.3], Tc, Pc, om);
    expect(r.x_arr).toHaveLength(2);
    expect(r.y_arr).toHaveLength(2);
    expect(r.K_arr).toHaveLength(2);
    expect(typeof r.beta).toBe("number");
    expect(typeof r.Z_L).toBe("number");
    expect(typeof r.Z_V).toBe("number");
    expect(typeof r.iterations).toBe("number");
  });

  it("beta in [0,1]", () => {
    const r = lkVLEFlash(300, 10, [0.7, 0.3], Tc, Pc, om);
    expect(r.beta).toBeGreaterThanOrEqual(0);
    expect(r.beta).toBeLessThanOrEqual(1);
  });

  it("Z_V and Z_L are both positive", () => {
    const r = lkVLEFlash(300, 10, [0.7, 0.3], Tc, Pc, om);
    expect(r.Z_V).toBeGreaterThan(0);
    expect(r.Z_L).toBeGreaterThan(0);
  });

  it("Z values are positive and finite", () => {
    const r = lkVLEFlash(300, 10, [0.7, 0.3], Tc, Pc, om);
    expect(r.Z_L).toBeGreaterThan(0);
    expect(r.Z_V).toBeGreaterThan(0);
    expect(isFinite(r.Z_L)).toBe(true);
    expect(isFinite(r.Z_V)).toBe(true);
  });

  it("iterations > 0", () => {
    const r = lkVLEFlash(300, 10, [0.7, 0.3], Tc, Pc, om);
    expect(r.iterations).toBeGreaterThan(0);
  });
});
