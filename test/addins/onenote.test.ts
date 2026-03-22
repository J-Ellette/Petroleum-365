/**
 * Tests: OneNote Add-in HTML block builders
 */

import {
  buildOneNoteBlock,
  buildFieldMeasurementLog,
  buildPvtDataBlock,
  buildGasCompositionBlock,
  buildWellTestBlock,
  buildWellPerformanceBlock,
  buildDcaForecastBlock,
  buildJobSummaryPage,
} from "../../src/addins/onenote/index";

// ─── buildOneNoteBlock ────────────────────────────────────────────────────────

describe("buildOneNoteBlock", () => {
  it("includes title", () => {
    const html = buildOneNoteBlock("My Title", { "Key": "Val" }, "2025-01-01");
    expect(html).toContain("My Title");
  });

  it("includes timestamp", () => {
    const html = buildOneNoteBlock("T", { "A": "B" }, "2025-06-15");
    expect(html).toContain("2025-06-15");
  });

  it("includes key-value rows", () => {
    const html = buildOneNoteBlock("T", { "Pressure": "3000 psia" }, "ts");
    expect(html).toContain("Pressure");
    expect(html).toContain("3000 psia");
  });

  it("includes notes when provided", () => {
    const html = buildOneNoteBlock("T", {}, "ts", "My notes here");
    expect(html).toContain("My notes here");
  });

  it("omits notes section when not provided", () => {
    const html = buildOneNoteBlock("T", {}, "ts");
    expect(html).not.toContain("Notes:");
  });
});

// ─── buildFieldMeasurementLog ─────────────────────────────────────────────────

describe("buildFieldMeasurementLog", () => {
  const measurements = [
    { parameter: "FWHP", value: 800, unit: "psig" },
    { parameter: "Flow Rate", value: 500, unit: "STB/d" },
  ];

  it("includes well name", () => {
    const html = buildFieldMeasurementLog("Well-1", "2025-01-01", measurements, "J. Smith");
    expect(html).toContain("Well-1");
  });

  it("includes engineer name", () => {
    const html = buildFieldMeasurementLog("W", "ts", measurements, "J. Smith");
    expect(html).toContain("J. Smith");
  });

  it("includes parameter names", () => {
    const html = buildFieldMeasurementLog("W", "ts", measurements, "E");
    expect(html).toContain("FWHP");
    expect(html).toContain("Flow Rate");
  });

  it("includes measured values", () => {
    const html = buildFieldMeasurementLog("W", "ts", measurements, "E");
    expect(html).toContain("800");
    expect(html).toContain("psig");
  });
});

// ─── buildPvtDataBlock ────────────────────────────────────────────────────────

describe("buildPvtDataBlock", () => {
  const p = {
    wellName: "Well-PVT",
    timestamp: "2025-03-01",
    pressure_psia: 3000,
    temp_F: 180,
    zFactor: 0.875,
    bg_rcf_scf: 0.00412,
    bo_rbStb: 1.234,
    hhv_BTUscf: 1020.5,
  };

  it("includes well name", () => {
    expect(buildPvtDataBlock(p)).toContain("Well-PVT");
  });

  it("includes pressure value", () => {
    expect(buildPvtDataBlock(p)).toContain("3000");
  });

  it("includes temperature value", () => {
    expect(buildPvtDataBlock(p)).toContain("180");
  });

  it("includes Z-factor", () => {
    expect(buildPvtDataBlock(p)).toContain("0.875");
  });

  it("includes HHV", () => {
    expect(buildPvtDataBlock(p)).toContain("1020");
  });

  it("includes notes when provided", () => {
    expect(buildPvtDataBlock({ ...p, notes: "Recombined sample" })).toContain("Recombined sample");
  });

  it("is a string", () => {
    expect(typeof buildPvtDataBlock(p)).toBe("string");
  });
});

// ─── buildGasCompositionBlock ─────────────────────────────────────────────────

describe("buildGasCompositionBlock", () => {
  const p = {
    sampleId: "GAS-001",
    timestamp: "2025-02-10",
    molarMass_lbMol: 18.32,
    specificGravity: 0.632,
    hhv_BTUscf: 1020.5,
    lhv_BTUscf: 919.3,
    wobbeIndex: 1284.0,
  };

  it("contains sample ID", () => {
    expect(buildGasCompositionBlock(p)).toContain("GAS-001");
  });

  it("contains HHV value", () => {
    expect(buildGasCompositionBlock(p)).toContain("1020");
  });

  it("contains Wobbe Index label", () => {
    expect(buildGasCompositionBlock(p)).toContain("Wobbe");
  });

  it("contains specific gravity", () => {
    expect(buildGasCompositionBlock(p)).toContain("0.632");
  });

  it("includes CO2 when provided", () => {
    expect(buildGasCompositionBlock({ ...p, co2_mol: 2.5 })).toContain("CO2");
  });

  it("includes H2S when provided", () => {
    expect(buildGasCompositionBlock({ ...p, h2s_mol: 0.1 })).toContain("H2S");
  });

  it("omits CO2 when not provided", () => {
    expect(buildGasCompositionBlock(p)).not.toContain("CO2");
  });
});

// ─── buildWellTestBlock ───────────────────────────────────────────────────────

describe("buildWellTestBlock", () => {
  const p = {
    wellName: "Well-42",
    testDate: "2025-04-15",
    producingTime_hr: 72,
    flowRate_STBd: 300,
    permeability_md: 8.5,
    skin: 2.1,
    pStar_psia: 3200,
    reservoirPressure_psia: 3100,
  };

  it("contains well name", () => {
    expect(buildWellTestBlock(p)).toContain("Well-42");
  });

  it("contains permeability value", () => {
    expect(buildWellTestBlock(p)).toContain("8.5");
  });

  it("contains skin value", () => {
    expect(buildWellTestBlock(p)).toContain("2.1");
  });

  it("contains P* value", () => {
    expect(buildWellTestBlock(p)).toContain("3200");
  });

  it("contains flow rate", () => {
    expect(buildWellTestBlock(p)).toContain("300");
  });

  it("includes optional notes", () => {
    expect(buildWellTestBlock({ ...p, notes: "Horner extrapolation" })).toContain("Horner extrapolation");
  });
});

// ─── buildWellPerformanceBlock ────────────────────────────────────────────────

describe("buildWellPerformanceBlock", () => {
  const p = {
    wellName: "Well-Perf",
    timestamp: "2025-05-01",
    operatingRate_STBd: 450,
    operatingPwf_psia: 1800,
    reservoirPressure_psia: 3000,
    skin: 1.5,
    pi_STBdPsi: 0.375,
  };

  it("contains well name", () => {
    expect(buildWellPerformanceBlock(p)).toContain("Well-Perf");
  });

  it("contains operating rate", () => {
    expect(buildWellPerformanceBlock(p)).toContain("450");
  });

  it("contains PI value", () => {
    expect(buildWellPerformanceBlock(p)).toContain("0.375");
  });

  it("contains reservoir pressure", () => {
    expect(buildWellPerformanceBlock(p)).toContain("3000");
  });

  it("includes notes when provided", () => {
    expect(buildWellPerformanceBlock({ ...p, notes: "Post-stimulation" })).toContain("Post-stimulation");
  });
});

// ─── buildDcaForecastBlock ────────────────────────────────────────────────────

describe("buildDcaForecastBlock", () => {
  const p = {
    wellName: "Well-DCA",
    timestamp: "2025-01-01",
    model: "Arps Exponential",
    qi_STBd: 1000,
    di_pct: 15,
    b_factor: 0,
    eur_MBbl: 250,
    forecastYears: 20,
  };

  it("contains well name", () => {
    expect(buildDcaForecastBlock(p)).toContain("Well-DCA");
  });

  it("contains model name", () => {
    expect(buildDcaForecastBlock(p)).toContain("Arps Exponential");
  });

  it("contains EUR", () => {
    expect(buildDcaForecastBlock(p)).toContain("250");
  });

  it("contains initial rate", () => {
    expect(buildDcaForecastBlock(p)).toContain("1000");
  });

  it("contains forecast period", () => {
    expect(buildDcaForecastBlock(p)).toContain("20");
  });

  it("includes notes when provided", () => {
    expect(buildDcaForecastBlock({ ...p, notes: "Best estimate" })).toContain("Best estimate");
  });
});

// ─── buildJobSummaryPage ──────────────────────────────────────────────────────

describe("buildJobSummaryPage", () => {
  const pvtBlock = buildPvtDataBlock({
    wellName: "Well-A",
    timestamp: "2025-01-01",
    pressure_psia: 2500,
    temp_F: 160,
    zFactor: 0.85,
    bg_rcf_scf: 0.005,
    bo_rbStb: 1.2,
    hhv_BTUscf: 1010,
  });

  const page = buildJobSummaryPage({
    jobNumber: "J-2025-001",
    projectName: "Ranger Field Study",
    client: "Acme Energy",
    engineer: "Alice Smith",
    date: "2025-01-15",
    location: "Permian Basin, TX",
    blocks: [pvtBlock],
  });

  it("is a valid HTML string", () => {
    expect(page).toContain("<html");
    expect(page).toContain("</html>");
  });

  it("contains h1 with project name", () => {
    expect(page).toContain("<h1>");
    expect(page).toContain("Ranger Field Study");
  });

  it("contains job number", () => {
    expect(page).toContain("J-2025-001");
  });

  it("contains engineer name", () => {
    expect(page).toContain("Alice Smith");
  });

  it("contains client name", () => {
    expect(page).toContain("Acme Energy");
  });

  it("contains embedded PVT block", () => {
    expect(page).toContain("Well-A");
  });

  it("contains location", () => {
    expect(page).toContain("Permian Basin");
  });

  it("includes metadata table", () => {
    expect(page).toContain("<table");
    expect(page).toContain("Job Number");
  });
});
