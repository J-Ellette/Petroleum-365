/**
 * Tests: Electric Submersible Pump (ESP)
 */

import {
  espTDH,
  espHydraulicHP,
  espBrakeHP,
  espPumpStages,
  espMotorHP,
  espMotorCurrent,
  espCableVoltageDrop,
  espVoidFraction,
  espGasHandling,
  espOperatingPoint,
} from "../../src/functions/esp";

describe("espTDH — Total Dynamic Head", () => {
  test("Returns positive TDH for typical well", () => {
    const TDH = espTDH(2000, 200, 6000, 0.85);
    expect(TDH).toBeGreaterThan(0);
  });

  test("TDH increases with wellhead pressure", () => {
    const TDH1 = espTDH(2000, 100, 6000, 0.85);
    const TDH2 = espTDH(2000, 400, 6000, 0.85);
    expect(TDH2).toBeGreaterThan(TDH1);
  });

  test("TDH decreases with higher reservoir pressure", () => {
    const TDH1 = espTDH(1500, 200, 6000, 0.85);
    const TDH2 = espTDH(3000, 200, 6000, 0.85);
    expect(TDH2).toBeLessThan(TDH1);
  });

  test("TDH increases with depth", () => {
    const TDH1 = espTDH(2000, 200, 4000, 0.85);
    const TDH2 = espTDH(2000, 200, 8000, 0.85);
    expect(TDH2).toBeGreaterThan(TDH1);
  });
});

describe("espHydraulicHP — Hydraulic Horsepower", () => {
  test("Returns positive HHP for valid inputs", () => {
    const HHP = espHydraulicHP(500, 3000, 0.9);
    expect(HHP).toBeGreaterThan(0);
  });

  test("HHP proportional to flow rate", () => {
    const HHP1 = espHydraulicHP(500,  3000, 0.9);
    const HHP2 = espHydraulicHP(1000, 3000, 0.9);
    expect(HHP2).toBeCloseTo(2 * HHP1, 3);
  });

  test("HHP proportional to TDH", () => {
    const HHP1 = espHydraulicHP(500, 2000, 0.9);
    const HHP2 = espHydraulicHP(500, 4000, 0.9);
    expect(HHP2).toBeCloseTo(2 * HHP1, 3);
  });
});

describe("espBrakeHP — Brake Horsepower", () => {
  test("BHP > HHP (efficiency < 1)", () => {
    const HHP = espHydraulicHP(500, 3000, 0.9);
    const BHP = espBrakeHP(HHP, 0.65);
    expect(BHP).toBeGreaterThan(HHP);
  });

  test("BHP = HHP when efficiency = 1", () => {
    const HHP = 50;
    expect(espBrakeHP(HHP, 1.0)).toBeCloseTo(HHP, 5);
  });
});

describe("espPumpStages — Number of pump stages", () => {
  test("Returns integer ceiling of stages", () => {
    const stages = espPumpStages(3000, 28);
    expect(stages).toBe(Math.ceil(3000 / 28));
  });

  test("Exact integer TDH/head gives exact integer stages", () => {
    expect(espPumpStages(2800, 28)).toBe(100);
  });

  test("Increases with TDH", () => {
    const s1 = espPumpStages(2000, 25);
    const s2 = espPumpStages(4000, 25);
    expect(s2).toBeGreaterThan(s1);
  });
});

describe("espMotorHP — Motor nameplate HP", () => {
  test("Motor HP > BHP (service factor > 1)", () => {
    const motorHP = espMotorHP(50, 0.93, 1.15);
    expect(motorHP).toBeGreaterThan(50);
  });

  test("Motor HP decreases with higher motor efficiency", () => {
    const hp1 = espMotorHP(50, 0.85);
    const hp2 = espMotorHP(50, 0.95);
    expect(hp2).toBeLessThan(hp1);
  });
});

describe("espMotorCurrent — Motor current draw", () => {
  test("Returns positive current", () => {
    const I = espMotorCurrent(100, 3300);
    expect(I).toBeGreaterThan(0);
  });

  test("Current increases with HP", () => {
    const I1 = espMotorCurrent(100, 3300);
    const I2 = espMotorCurrent(200, 3300);
    expect(I2).toBeGreaterThan(I1);
  });

  test("Current decreases with higher voltage", () => {
    const I1 = espMotorCurrent(100, 2400);
    const I2 = espMotorCurrent(100, 4800);
    expect(I2).toBeLessThan(I1);
  });
});

describe("espCableVoltageDrop — Cable voltage drop", () => {
  test("Returns positive voltage drop", () => {
    const vd = espCableVoltageDrop(50, 0.68, 6000);
    expect(vd).toBeGreaterThan(0);
  });

  test("Voltage drop doubles with doubled depth", () => {
    const vd1 = espCableVoltageDrop(50, 0.68, 4000);
    const vd2 = espCableVoltageDrop(50, 0.68, 8000);
    expect(vd2).toBeCloseTo(2 * vd1, 5);
  });
});

describe("espVoidFraction — Free gas void fraction", () => {
  test("Returns 0 with no free gas", () => {
    expect(espVoidFraction(500, 0, 0.001, 1000, 600)).toBeCloseTo(0, 6);
  });

  test("Returns value between 0 and 1", () => {
    const vf = espVoidFraction(500, 50000, 0.001, 1000, 600);
    expect(vf).toBeGreaterThanOrEqual(0);
    expect(vf).toBeLessThanOrEqual(1);
  });

  test("Void fraction increases with gas rate", () => {
    const vf1 = espVoidFraction(500, 10000, 0.001, 1000, 600);
    const vf2 = espVoidFraction(500, 50000, 0.001, 1000, 600);
    expect(vf2).toBeGreaterThan(vf1);
  });
});

describe("espGasHandling — Gas handling risk assessment", () => {
  test("Low void fraction → Low risk, no separator needed", () => {
    const result = espGasHandling(0.05);
    expect(result.needs_separator).toBe(false);
    expect(result.risk_level).toBe('Low');
  });

  test("Medium void fraction → separator needed, medium risk", () => {
    const result = espGasHandling(0.20);
    expect(result.needs_separator).toBe(true);
    expect(result.risk_level).toBe('Medium');
  });

  test("High void fraction → separator needed, high risk", () => {
    const result = espGasHandling(0.50);
    expect(result.needs_separator).toBe(true);
    expect(result.risk_level).toBe('High');
  });
});

describe("espOperatingPoint — Pump curve intersection", () => {
  const q = [0, 200, 400, 600, 800, 1000];
  const head = [4000, 3800, 3500, 3000, 2200, 1000];

  test("Operating point q is within pump curve range", () => {
    const op = espOperatingPoint(q, head, 3000);
    expect(op.q_op).toBeGreaterThanOrEqual(0);
    expect(op.q_op).toBeLessThanOrEqual(1000);
  });

  test("Operating head is close to TDH at operating point", () => {
    const op = espOperatingPoint(q, head, 3000);
    expect(op.head_op).toBeCloseTo(3000, 0);
  });

  test("Higher TDH gives lower flow rate at operating point", () => {
    const op1 = espOperatingPoint(q, head, 2500);
    const op2 = espOperatingPoint(q, head, 3500);
    expect(op1.q_op).toBeGreaterThan(op2.q_op);
  });
});
