/**
 * Tests: Word Add-in document builders
 */

import {
  formatWordValue,
  buildPipeSizingSummary,
  buildPvtReportData,
  buildWellTestReportData,
  buildDcaReportData,
  buildNodalReportData,
  buildMbeReportData,
  buildGasCompositionReportData,
  buildWordTable,
  buildWordDocumentContent,
} from "../../src/addins/word/index";

// ─── formatWordValue ──────────────────────────────────────────────────────────

describe("formatWordValue", () => {
  it("formats with unit and default 2 decimals", () => {
    expect(formatWordValue(1234.5678, "psia")).toBe("1234.57 psia");
  });

  it("respects custom decimal places", () => {
    expect(formatWordValue(0.8765, "cp", 4)).toBe("0.8765 cp");
  });

  it("formats with empty unit string", () => {
    expect(formatWordValue(0.998, "", 3)).toBe("0.998 ");
  });
});

// ─── buildPipeSizingSummary ───────────────────────────────────────────────────

describe("buildPipeSizingSummary", () => {
  const base = {
    inletPressure_psig: 60,
    outletPressure_psig: 55,
    flowRate_scfh: 50000,
    pipeLength_ft: 1000,
    nominalPipeSizeIn: 4,
    material: "bare-steel" as const,
    capacity_BTUh: 50_000_000,
    velocity_fts: 25,
  };

  it("returns all required keys", () => {
    const result = buildPipeSizingSummary(base);
    expect(result).toHaveProperty("Inlet Pressure");
    expect(result).toHaveProperty("Outlet Pressure");
    expect(result).toHaveProperty("Flow Rate");
    expect(result).toHaveProperty("Pipe Length");
    expect(result).toHaveProperty("Nominal Pipe Size");
    expect(result).toHaveProperty("Material");
    expect(result).toHaveProperty("Heating Capacity");
    expect(result).toHaveProperty("Gas Velocity");
    expect(result).toHaveProperty("Velocity Status");
  });

  it("marks velocity as ACCEPTABLE when < 40 ft/s", () => {
    expect(buildPipeSizingSummary({ ...base, velocity_fts: 25 })["Velocity Status"]).toMatch(/ACCEPTABLE/);
  });

  it("marks velocity as EXCEEDS LIMIT when >= 40 ft/s", () => {
    expect(buildPipeSizingSummary({ ...base, velocity_fts: 50 })["Velocity Status"]).toMatch(/EXCEEDS/);
  });
});

// ─── buildPvtReportData ───────────────────────────────────────────────────────

describe("buildPvtReportData", () => {
  const params = {
    pressure_psia: 2000,
    temp_F: 180,
    gasGravity: 0.65,
    zFactor: 0.842,
    bg_rcf_scf: 0.005432,
    gasVisc_cp: 0.0187,
    gasDensity_lbft3: 8.21,
    oilAPI: 35,
    bubblePoint_psia: 1850,
    bo_rbStb: 1.345,
    oilVisc_cp: 1.12,
  };

  it("returns a record with all expected keys", () => {
    const result = buildPvtReportData(params);
    expect(result).toHaveProperty("Pressure");
    expect(result).toHaveProperty("Temperature");
    expect(result).toHaveProperty("Gas Gravity");
    expect(result).toHaveProperty("Z-Factor");
    expect(result).toHaveProperty("Gas FVF (Bg)");
    expect(result).toHaveProperty("Gas Viscosity");
    expect(result).toHaveProperty("Gas Density");
    expect(result).toHaveProperty("Oil API Gravity");
    expect(result).toHaveProperty("Bubble Point Pressure");
    expect(result).toHaveProperty("Oil FVF (Bo)");
    expect(result).toHaveProperty("Oil Viscosity");
  });

  it("formats pressure with psia unit", () => {
    expect(buildPvtReportData(params)["Pressure"]).toContain("psia");
  });

  it("formats Z-Factor to 4 decimal places", () => {
    expect(buildPvtReportData(params)["Z-Factor"]).toContain("0.8420");
  });
});

// ─── buildWellTestReportData ──────────────────────────────────────────────────

describe("buildWellTestReportData", () => {
  const params = {
    wellName: "Well-A1",
    testDate: "2024-03-15",
    producingTime_hr: 72,
    flowRate_STBd: 500,
    reservoirPressure_psia: 3200,
    permeability_md: 15.3,
    skin: -2.1,
    pStar_psia: 3180,
    wellboreStorage_bblPsi: 0.0045,
    radInvestigation_ft: 650,
  };

  it("returns all expected keys", () => {
    const result = buildWellTestReportData(params);
    expect(result).toHaveProperty("Well Name");
    expect(result).toHaveProperty("Test Date");
    expect(result).toHaveProperty("Producing Time");
    expect(result).toHaveProperty("Flow Rate");
    expect(result).toHaveProperty("Reservoir Pressure (pi)");
    expect(result).toHaveProperty("Permeability");
    expect(result).toHaveProperty("Skin Factor");
    expect(result).toHaveProperty("Extrapolated Pressure (p*)");
    expect(result).toHaveProperty("Wellbore Storage");
    expect(result).toHaveProperty("Radius of Investigation");
  });

  it("preserves well name as-is", () => {
    expect(buildWellTestReportData(params)["Well Name"]).toBe("Well-A1");
  });

  it("formats negative skin correctly", () => {
    expect(buildWellTestReportData(params)["Skin Factor"]).toContain("-2.10");
  });
});

// ─── buildDcaReportData ───────────────────────────────────────────────────────

describe("buildDcaReportData", () => {
  const params = {
    wellName: "Well-B2",
    model: "Hyperbolic",
    qi_STBd: 1200,
    di_pct: 45,
    b_factor: 0.8,
    eur_MBbl: 320,
    currentRate_STBd: 480,
    forecastYears: 20,
    economicLimit_STBd: 10,
  };

  it("returns all expected keys", () => {
    const result = buildDcaReportData(params);
    expect(result).toHaveProperty("Well Name");
    expect(result).toHaveProperty("Decline Model");
    expect(result).toHaveProperty("Initial Rate (qi)");
    expect(result).toHaveProperty("Initial Decline (Di)");
    expect(result).toHaveProperty("b-Factor");
    expect(result).toHaveProperty("EUR");
    expect(result).toHaveProperty("Current Rate");
    expect(result).toHaveProperty("Forecast Period");
    expect(result).toHaveProperty("Economic Limit");
  });

  it("preserves model name as-is", () => {
    expect(buildDcaReportData(params)["Decline Model"]).toBe("Hyperbolic");
  });

  it("formats EUR with MBbl unit", () => {
    expect(buildDcaReportData(params)["EUR"]).toContain("MBbl");
  });
});

// ─── buildNodalReportData ─────────────────────────────────────────────────────

describe("buildNodalReportData", () => {
  const params = {
    wellName: "Well-C3",
    reservoirPressure_psia: 4000,
    operatingRate_STBd: 800,
    operatingPwf_psia: 1500,
    tubingSize_in: 2.441,
    skin: 0,
    pi_STBdPsi: 0.32,
    qMax_STBd: 1280,
  };

  it("returns all expected keys", () => {
    const result = buildNodalReportData(params);
    expect(result).toHaveProperty("Well Name");
    expect(result).toHaveProperty("Reservoir Pressure");
    expect(result).toHaveProperty("Operating Rate");
    expect(result).toHaveProperty("Flowing BHP (Pwf)");
    expect(result).toHaveProperty("Tubing Size");
    expect(result).toHaveProperty("Skin Factor");
    expect(result).toHaveProperty("Productivity Index (PI)");
    expect(result).toHaveProperty("AOF (qMax)");
  });

  it("formats tubing size as inches string", () => {
    expect(buildNodalReportData(params)["Tubing Size"]).toContain('"');
  });
});

// ─── buildMbeReportData ───────────────────────────────────────────────────────

describe("buildMbeReportData", () => {
  const gasParams = {
    fieldName: "Alpha Field",
    reservoirType: "Gas",
    ogip_Bscf: 250.5,
    currentPressure_psia: 2800,
    initialPressure_psia: 4200,
    cumulativeProduction: 80.2,
    productionUnit: "Bscf",
    driveIndices: { "Gas Expansion": 0.85, "Water Influx": 0.15 },
  };

  it("returns core keys for a gas reservoir", () => {
    const result = buildMbeReportData(gasParams);
    expect(result).toHaveProperty("Field Name");
    expect(result).toHaveProperty("Reservoir Type");
    expect(result).toHaveProperty("Initial Pressure");
    expect(result).toHaveProperty("Current Pressure");
    expect(result).toHaveProperty("Cumulative Production");
    expect(result).toHaveProperty("OGIP");
  });

  it("includes drive index entries", () => {
    const result = buildMbeReportData(gasParams);
    expect(result).toHaveProperty("Drive Index — Gas Expansion");
    expect(result).toHaveProperty("Drive Index — Water Influx");
  });

  it("does not include OOIP key when not provided", () => {
    const result = buildMbeReportData(gasParams);
    expect(result).not.toHaveProperty("OOIP");
  });

  it("includes OOIP when provided for oil reservoir", () => {
    const result = buildMbeReportData({ ...gasParams, ooip_MMStb: 120, reservoirType: "Oil" });
    expect(result).toHaveProperty("OOIP");
  });
});

// ─── buildGasCompositionReportData ────────────────────────────────────────────

describe("buildGasCompositionReportData", () => {
  const params = {
    sampleId: "GAS-2024-001",
    date: "2024-01-10",
    molarMass_lbMol: 18.42,
    specificGravity: 0.636,
    hhv_BTUscf: 1045,
    lhv_BTUscf: 940,
    wobbeIndex: 1310,
    co2_mol: 2.1,
    h2s_mol: 0.05,
    n2_mol: 1.2,
  };

  it("returns all expected keys including optional components", () => {
    const result = buildGasCompositionReportData(params);
    expect(result).toHaveProperty("Sample ID");
    expect(result).toHaveProperty("Sample Date");
    expect(result).toHaveProperty("Molar Mass");
    expect(result).toHaveProperty("Specific Gravity");
    expect(result).toHaveProperty("HHV");
    expect(result).toHaveProperty("LHV");
    expect(result).toHaveProperty("Wobbe Index");
    expect(result).toHaveProperty("CO₂");
    expect(result).toHaveProperty("H₂S");
    expect(result).toHaveProperty("N₂");
  });

  it("omits optional keys when not provided", () => {
    const { co2_mol, h2s_mol, n2_mol, ...minimal } = params;
    const result = buildGasCompositionReportData(minimal);
    expect(result).not.toHaveProperty("CO₂");
    expect(result).not.toHaveProperty("H₂S");
    expect(result).not.toHaveProperty("N₂");
  });
});

// ─── buildWordTable ───────────────────────────────────────────────────────────

describe("buildWordTable", () => {
  it("produces a pipe-delimited markdown table", () => {
    const table = buildWordTable(
      ["Parameter", "Value"],
      [["Pressure", "2000.00 psia"], ["Temperature", "180.00 °F"]],
    );
    expect(table).toContain("| Parameter");
    expect(table).toContain("| Value");
    expect(table).toContain("|");
    expect(table).toContain("---");
  });

  it("includes a separator row after the header", () => {
    const lines = buildWordTable(["A", "B"], [["1", "2"]]).split("\n");
    expect(lines[1]).toMatch(/^\|[-\s|]+\|$/);
  });

  it("aligns columns to the widest cell", () => {
    const table = buildWordTable(
      ["Name", "Value"],
      [["Short", "A very long value here"]],
    );
    const lines = table.split("\n");
    // All rows should have the same length
    const lengths = lines.map(l => l.length);
    expect(new Set(lengths).size).toBe(1);
  });

  it("handles empty rows array", () => {
    const table = buildWordTable(["Col1", "Col2"], []);
    expect(table).toContain("Col1");
    expect(table).toContain("---");
  });
});

// ─── buildWordDocumentContent ─────────────────────────────────────────────────

describe("buildWordDocumentContent", () => {
  const meta = { jobNumber: "J-1001", preparedBy: "Jane Smith", date: "2024-06-01", client: "ACME Corp" };
  const data = { Pressure: "2000.00 psia", Temperature: "180.00 °F" };

  it("returns a non-empty string", () => {
    const content = buildWordDocumentContent("pvt-report", data, meta);
    expect(content.length).toBeGreaterThan(0);
  });

  it("contains the template title", () => {
    const content = buildWordDocumentContent("pvt-report", data, meta);
    expect(content).toContain("PVT Fluid Properties Report");
  });

  it("contains the template ID in the footer", () => {
    const content = buildWordDocumentContent("dca-report", data, meta);
    expect(content).toContain("dca-report");
  });

  it("includes job metadata", () => {
    const content = buildWordDocumentContent("pipe-sizing", data, meta);
    expect(content).toContain("J-1001");
    expect(content).toContain("Jane Smith");
    expect(content).toContain("ACME Corp");
  });

  it("includes a data table with parameter values", () => {
    const content = buildWordDocumentContent("pvt-report", data, meta);
    expect(content).toContain("Pressure");
    expect(content).toContain("2000.00 psia");
  });

  it("uses the template ID as title for unknown template IDs", () => {
    const content = buildWordDocumentContent("custom-template", data, meta);
    expect(content).toContain("custom-template");
  });

  it("works without optional client field", () => {
    const { client, ...noClient } = meta;
    const content = buildWordDocumentContent("mbe-report", data, noClient);
    expect(content).not.toContain("Client");
    expect(content).toContain("J-1001");
  });
});
