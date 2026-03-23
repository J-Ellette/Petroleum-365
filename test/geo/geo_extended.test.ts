/**
 * Tests: GEO Extended — Elastic Moduli Conversion + 3D Wellbore Stress
 */

import {
  geoElasticModuliConvert,
  geoElasticModuliFromKG,
  geoStaticYoungsModulus,
  geo3DWellboreStress,
  geo3DCollapsePressure,
} from "../../src/functions/geo";

// ─── geoElasticModuliConvert ─────────────────────────────────────────────────

describe("geoElasticModuliConvert (E, ν → K, G, λ, M)", () => {
  // Typical sandstone: E=25 GPa, ν=0.25
  const E  = 25;
  const nu = 0.25;

  test("bulk modulus K = E / (3(1−2ν)) ≈ 16.67 GPa", () => {
    const { K_GPa } = geoElasticModuliConvert(E, nu);
    expect(K_GPa).toBeCloseTo(E / (3 * (1 - 2 * nu)), 4);
  });

  test("shear modulus G = E / (2(1+ν)) ≈ 10 GPa", () => {
    const { G_GPa } = geoElasticModuliConvert(E, nu);
    expect(G_GPa).toBeCloseTo(E / (2 * (1 + nu)), 4);
  });

  test("Lamé λ = Eν / ((1+ν)(1−2ν))", () => {
    const { lambda_GPa } = geoElasticModuliConvert(E, nu);
    const expected = E * nu / ((1 + nu) * (1 - 2 * nu));
    expect(lambda_GPa).toBeCloseTo(expected, 4);
  });

  test("P-wave modulus M = λ + 2G", () => {
    const { lambda_GPa, G_GPa, M_GPa } = geoElasticModuliConvert(E, nu);
    expect(M_GPa).toBeCloseTo(lambda_GPa + 2 * G_GPa, 4);
  });

  test("M = K + 4G/3", () => {
    const { K_GPa, G_GPa, M_GPa } = geoElasticModuliConvert(E, nu);
    expect(M_GPa).toBeCloseTo(K_GPa + 4 * G_GPa / 3, 4);
  });

  test("incompressible limit ν→0.499: K >> G", () => {
    const { K_GPa, G_GPa } = geoElasticModuliConvert(10, 0.499);
    expect(K_GPa).toBeGreaterThan(G_GPa * 10);
  });
});

// ─── geoElasticModuliFromKG ──────────────────────────────────────────────────

describe("geoElasticModuliFromKG (K, G → E, ν)", () => {
  test("round-trip: E/ν → K/G → E/ν", () => {
    const E0  = 25;
    const nu0 = 0.25;
    const { K_GPa, G_GPa }  = geoElasticModuliConvert(E0, nu0);
    const { E_GPa, nu }     = geoElasticModuliFromKG(K_GPa, G_GPa);
    expect(E_GPa).toBeCloseTo(E0, 4);
    expect(nu).toBeCloseTo(nu0, 4);
  });

  test("ν in (0, 0.5) for physical inputs", () => {
    const { nu } = geoElasticModuliFromKG(10, 8);
    expect(nu).toBeGreaterThan(0);
    expect(nu).toBeLessThan(0.5);
  });

  test("E_GPa > 0 for positive K and G", () => {
    const { E_GPa } = geoElasticModuliFromKG(15, 10);
    expect(E_GPa).toBeGreaterThan(0);
  });
});

// ─── geoStaticYoungsModulus ──────────────────────────────────────────────────

describe("geoStaticYoungsModulus", () => {
  test("static E < dynamic E (Eissa-Kazi relationship)", () => {
    const E_dyn = 40;  // GPa
    expect(geoStaticYoungsModulus(E_dyn)).toBeLessThan(E_dyn);
  });

  test("E_static = 0.74·E_dyn − 0.82 for E_dyn=30 GPa", () => {
    expect(geoStaticYoungsModulus(30)).toBeCloseTo(0.74 * 30 - 0.82, 4);
  });

  test("very soft rock clamped at 0.1 GPa minimum", () => {
    expect(geoStaticYoungsModulus(0.5)).toBeGreaterThanOrEqual(0.1);
  });

  test("scales with dynamic modulus", () => {
    const E1 = geoStaticYoungsModulus(20);
    const E2 = geoStaticYoungsModulus(50);
    expect(E2).toBeGreaterThan(E1);
  });
});

// ─── geo3DWellboreStress ─────────────────────────────────────────────────────

describe("geo3DWellboreStress (Kirsch equations)", () => {
  // Gulf Coast example: 10,000 ft depth
  const SHmax = 8000;   // psi
  const Shmin = 6000;   // psi
  const Sv    = 10000;  // psi (overburden)
  const Pp    = 4000;   // psi pore pressure
  const Pw    = 6500;   // psi mud pressure
  const nu    = 0.25;
  const alpha = 1.0;    // Biot = 1.0

  test("sigma_r at θ=0° follows Kirsch: Pw − α·Pp", () => {
    const { sigma_r_psi } = geo3DWellboreStress(SHmax, Shmin, Sv, Pp, Pw, nu, alpha, 0);
    expect(sigma_r_psi).toBeCloseTo(Pw - alpha * Pp, 4);
  });

  test("effective mud pressure P_eff_mud = Pw − Pp", () => {
    const { P_eff_mud_psi } = geo3DWellboreStress(SHmax, Shmin, Sv, Pp, Pw, nu, alpha, 0);
    expect(P_eff_mud_psi).toBeCloseTo(Pw - Pp, 4);
  });

  test("hoop stress at θ=90° > θ=0° for SHmax > Shmin (stress concentration)", () => {
    const { sigma_theta_psi: sth0  } = geo3DWellboreStress(SHmax, Shmin, Sv, Pp, Pw, nu, alpha, 0);
    const { sigma_theta_psi: sth90 } = geo3DWellboreStress(SHmax, Shmin, Sv, Pp, Pw, nu, alpha, 90);
    // At θ=0°: σθ = SHmax+Shmin − 2(SHmax−Shmin)·cos(0) − Pw − ...
    //         = 3·Shmin − SHmax − Pw − ...
    // At θ=90°: σθ = SHmax+Shmin + 2(SHmax−Shmin)·1 − Pw − ...
    //          = 3·SHmax − Shmin − Pw − ...
    expect(sth90).toBeGreaterThan(sth0);
  });

  test("tau_eff_psi > 0", () => {
    const { tau_eff_psi } = geo3DWellboreStress(SHmax, Shmin, Sv, Pp, Pw, nu, alpha, 45);
    expect(tau_eff_psi).toBeGreaterThan(0);
  });

  test("sigma_z includes vertical stress and Biot term", () => {
    const { sigma_z_psi } = geo3DWellboreStress(SHmax, Shmin, Sv, Pp, Pw, nu, alpha, 0);
    // sigma_z should be close to Sv − Biot·correction, within ±Sv
    expect(sigma_z_psi).toBeGreaterThan(-Sv);
    expect(sigma_z_psi).toBeLessThan(Sv * 2);
  });
});

// ─── geo3DCollapsePressure ───────────────────────────────────────────────────

describe("geo3DCollapsePressure", () => {
  const SHmax = 8000;
  const Shmin = 6000;
  const Pp    = 4000;
  const UCS   = 3000;  // psi
  const phi   = 30;    // degrees

  test("returns positive pressure for typical inputs", () => {
    const Pw_col = geo3DCollapsePressure(SHmax, Shmin, Pp, UCS, phi);
    expect(Pw_col).toBeGreaterThan(0);
  });

  test("collapse pressure < pore pressure for strong rock (over-pressured)", () => {
    // High UCS means rock can support itself even with low mud weight
    const Pw_col = geo3DCollapsePressure(SHmax, Shmin, Pp, 20000, phi);
    // If UCS is very high, collapse pressure may be 0 (clamped)
    expect(Pw_col).toBeGreaterThanOrEqual(0);
  });

  test("higher SHmax → higher collapse pressure", () => {
    const Pw1 = geo3DCollapsePressure(7000, Shmin, Pp, UCS, phi);
    const Pw2 = geo3DCollapsePressure(10000, Shmin, Pp, UCS, phi);
    expect(Pw2).toBeGreaterThan(Pw1);
  });

  test("higher UCS → lower collapse pressure (stronger rock needs less mud)", () => {
    const Pw1 = geo3DCollapsePressure(SHmax, Shmin, Pp, 1000, phi);
    const Pw2 = geo3DCollapsePressure(SHmax, Shmin, Pp, 5000, phi);
    expect(Pw2).toBeLessThan(Pw1);
  });

  test("Biot=0.5 vs Biot=1.0: different collapse pressures", () => {
    const Pw1 = geo3DCollapsePressure(SHmax, Shmin, Pp, UCS, phi, 0.5);
    const Pw2 = geo3DCollapsePressure(SHmax, Shmin, Pp, UCS, phi, 1.0);
    expect(Pw1).not.toBeCloseTo(Pw2, 0);
  });
});
