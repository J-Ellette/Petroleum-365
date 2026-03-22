/**
 * Tests: Outlook Add-in — email body builders & utilities
 */

import {
  OUTLOOK_TEMPLATES,
  buildEmailHtmlTable,
  buildPipeSizingEmailBody,
  buildWellPerformanceEmailBody,
  buildGasCompositionEmailBody,
  buildRfiResponseEmailBody,
  buildDcaForecastEmailBody,
  detectUnitSystem,
  convertValueForEmail,
} from "../../src/addins/outlook/index";

// ─── OUTLOOK_TEMPLATES ────────────────────────────────────────────────────────

describe("OUTLOOK_TEMPLATES", () => {
  it("exports at least 4 template definitions", () => {
    expect(OUTLOOK_TEMPLATES.length).toBeGreaterThanOrEqual(4);
  });

  it("each template has id, name, description, subject", () => {
    for (const t of OUTLOOK_TEMPLATES) {
      expect(typeof t.id).toBe("string");
      expect(typeof t.name).toBe("string");
      expect(typeof t.description).toBe("string");
      expect(typeof t.subject).toBe("string");
    }
  });
});

// ─── buildEmailHtmlTable ──────────────────────────────────────────────────────

describe("buildEmailHtmlTable", () => {
  it("returns an HTML string containing the title", () => {
    const html = buildEmailHtmlTable("My Title", { Pressure: "100 psia" });
    expect(html).toContain("My Title");
  });

  it("includes key-value row data", () => {
    const html = buildEmailHtmlTable("Test", { "Flow Rate": "500 scfh", "Diameter": "2 in" });
    expect(html).toContain("Flow Rate");
    expect(html).toContain("500 scfh");
    expect(html).toContain("Diameter");
    expect(html).toContain("2 in");
  });

  it("uses default header color when none provided", () => {
    const html = buildEmailHtmlTable("T", {});
    expect(html).toContain("#1a5276");
  });

  it("uses custom header color when provided", () => {
    const html = buildEmailHtmlTable("T", {}, "#abc123");
    expect(html).toContain("#abc123");
  });

  it("includes P365 attribution footer", () => {
    const html = buildEmailHtmlTable("T", {});
    expect(html).toContain("Petroleum 365");
  });
});

// ─── buildPipeSizingEmailBody ─────────────────────────────────────────────────

describe("buildPipeSizingEmailBody", () => {
  const result = buildPipeSizingEmailBody({
    jobName: "Plant A Feed Line",
    results: { "Pipe Size": "2 in", "Pressure Drop": "0.5 psig" },
    notes:   "Reviewed by engineering.",
  });

  it("returns subject and htmlBody", () => {
    expect(typeof result.subject).toBe("string");
    expect(typeof result.htmlBody).toBe("string");
  });

  it("subject contains job name", () => {
    expect(result.subject).toContain("Plant A Feed Line");
  });

  it("htmlBody contains result values", () => {
    expect(result.htmlBody).toContain("Pipe Size");
    expect(result.htmlBody).toContain("0.5 psig");
  });

  it("htmlBody contains notes when provided", () => {
    expect(result.htmlBody).toContain("Reviewed by engineering.");
  });

  it("omits notes section when not provided", () => {
    const noNotes = buildPipeSizingEmailBody({ jobName: "X", results: {} });
    expect(noNotes.htmlBody).not.toContain("Notes:");
  });
});

// ─── buildWellPerformanceEmailBody ────────────────────────────────────────────

describe("buildWellPerformanceEmailBody", () => {
  const params = {
    wellName:               "Well-A1",
    reservoirPressure_psia: 3500,
    operatingRate_STBd:     800,
    operatingPwf_psia:      2200,
    skin:                   2.5,
    pi_STBdPsi:             0.6154,
    qMax_STBd:              2154,
    notes:                  "Post-stimulation test.",
  };
  const result = buildWellPerformanceEmailBody(params);

  it("returns subject and htmlBody", () => {
    expect(typeof result.subject).toBe("string");
    expect(typeof result.htmlBody).toBe("string");
  });

  it("subject contains well name", () => {
    expect(result.subject).toContain("Well-A1");
  });

  it("htmlBody contains key parameters", () => {
    expect(result.htmlBody).toContain("3500");
    expect(result.htmlBody).toContain("800");
    expect(result.htmlBody).toContain("2.50");
  });

  it("htmlBody contains notes when provided", () => {
    expect(result.htmlBody).toContain("Post-stimulation test.");
  });

  it("omits notes when not provided", () => {
    const { htmlBody } = buildWellPerformanceEmailBody({ ...params, notes: undefined });
    expect(htmlBody).not.toContain("Notes:");
  });
});

// ─── buildGasCompositionEmailBody ─────────────────────────────────────────────

describe("buildGasCompositionEmailBody", () => {
  const params = {
    sampleId:          "GAS-2024-001",
    molarMass_lbMol:   18.415,
    specificGravity:   0.635,
    hhv_BTUscf:        1028.5,
    lhv_BTUscf:        926.1,
    wobbeIndex:        1291.8,
    notes:             "Separator gas sample.",
  };
  const result = buildGasCompositionEmailBody(params);

  it("returns subject and htmlBody", () => {
    expect(typeof result.subject).toBe("string");
    expect(typeof result.htmlBody).toBe("string");
  });

  it("subject contains sample ID", () => {
    expect(result.subject).toContain("GAS-2024-001");
  });

  it("htmlBody contains HHV and LHV", () => {
    expect(result.htmlBody).toContain("1028");
    expect(result.htmlBody).toContain("926");
  });

  it("htmlBody contains Wobbe index", () => {
    expect(result.htmlBody).toContain("1291");
  });

  it("includes notes when provided", () => {
    expect(result.htmlBody).toContain("Separator gas sample.");
  });
});

// ─── buildRfiResponseEmailBody ────────────────────────────────────────────────

describe("buildRfiResponseEmailBody", () => {
  const params = {
    rfiNumber:    "RFI-2024-042",
    subject:      "Gas line sizing for new compressor station",
    calcType:     "Weymouth Pipe Sizing",
    summaryRows:  { "Pipe Diameter": "4 in", "Pressure Drop": "1.2 psig" },
    engineerName: "J. Smith, P.E.",
    notes:        "Per client spec Rev 3.",
  };
  const result = buildRfiResponseEmailBody(params);

  it("returns subject and htmlBody", () => {
    expect(typeof result.subject).toBe("string");
    expect(typeof result.htmlBody).toBe("string");
  });

  it("subject contains RFI number", () => {
    expect(result.subject).toContain("RFI-2024-042");
  });

  it("htmlBody contains engineer name", () => {
    expect(result.htmlBody).toContain("J. Smith, P.E.");
  });

  it("htmlBody contains summary row data", () => {
    expect(result.htmlBody).toContain("4 in");
    expect(result.htmlBody).toContain("1.2 psig");
  });

  it("htmlBody references the RFI subject", () => {
    expect(result.htmlBody).toContain("compressor station");
  });
});

// ─── buildDcaForecastEmailBody ────────────────────────────────────────────────

describe("buildDcaForecastEmailBody", () => {
  const params = {
    wellName:      "Well-B3",
    model:         "Hyperbolic",
    qi_STBd:       1200,
    di_pct:        8.5,
    b_factor:      0.85,
    eur_MBbl:      420,
    forecastYears: 20,
    notes:         "Based on analogue well data.",
  };
  const result = buildDcaForecastEmailBody(params);

  it("returns subject and htmlBody", () => {
    expect(typeof result.subject).toBe("string");
    expect(typeof result.htmlBody).toBe("string");
  });

  it("subject contains well name", () => {
    expect(result.subject).toContain("Well-B3");
  });

  it("htmlBody contains model and EUR", () => {
    expect(result.htmlBody).toContain("Hyperbolic");
    expect(result.htmlBody).toContain("420");
  });

  it("htmlBody contains notes", () => {
    expect(result.htmlBody).toContain("analogue well data.");
  });

  it("omits notes when not provided", () => {
    const { htmlBody } = buildDcaForecastEmailBody({ ...params, notes: undefined });
    expect(htmlBody).not.toContain("Notes:");
  });
});

// ─── detectUnitSystem ─────────────────────────────────────────────────────────

describe("detectUnitSystem", () => {
  it("returns 'field' for a .com address", () => {
    expect(detectUnitSystem("engineer@company.com")).toBe("field");
  });

  it("returns 'metric' for a .ca address", () => {
    expect(detectUnitSystem("engineer@company.ca")).toBe("metric");
  });

  it("returns 'metric' for a .uk address", () => {
    expect(detectUnitSystem("user@firm.uk")).toBe("metric");
  });

  it("returns 'metric' for a .au address", () => {
    expect(detectUnitSystem("user@firm.au")).toBe("metric");
  });

  it("returns 'metric' for a .no address", () => {
    expect(detectUnitSystem("user@statoil.no")).toBe("metric");
  });

  it("returns 'metric' for a .nl address", () => {
    expect(detectUnitSystem("user@shell.nl")).toBe("metric");
  });

  it("returns 'metric' for a .de address", () => {
    expect(detectUnitSystem("user@company.de")).toBe("metric");
  });

  it("returns 'metric' for domain containing 'intl'", () => {
    expect(detectUnitSystem("user@intlpetro.com")).toBe("metric");
  });

  it("returns 'field' for a .org address", () => {
    expect(detectUnitSystem("user@spe.org")).toBe("field");
  });

  it("handles missing @ symbol gracefully (returns field)", () => {
    expect(detectUnitSystem("noatsign")).toBe("field");
  });
});

// ─── convertValueForEmail ─────────────────────────────────────────────────────

describe("convertValueForEmail", () => {
  it("returns value unchanged for field system", () => {
    const r = convertValueForEmail(100, "psia", "field");
    expect(r.value).toBe(100);
    expect(r.unit).toBe("psia");
  });

  it("converts psia to kPa for metric", () => {
    const r = convertValueForEmail(100, "psia", "metric");
    expect(r.unit).toBe("kPa");
    expect(r.value).toBeCloseTo(689.476, 1);
  });

  it("converts ft to m for metric", () => {
    const r = convertValueForEmail(1000, "ft", "metric");
    expect(r.unit).toBe("m");
    expect(r.value).toBeCloseTo(304.8, 1);
  });

  it("converts STBd to m3/d for metric", () => {
    const r = convertValueForEmail(1000, "STBd", "metric");
    expect(r.unit).toBe("m3/d");
    expect(r.value).toBeCloseTo(158.987, 1);
  });

  it("converts BTU to kJ for metric", () => {
    const r = convertValueForEmail(1000, "BTU", "metric");
    expect(r.unit).toBe("kJ");
    expect(r.value).toBeCloseTo(1055.06, 0);
  });

  it("converts °F to °C for metric (32 °F → 0 °C)", () => {
    const r = convertValueForEmail(32, "°F", "metric");
    expect(r.unit).toBe("°C");
    expect(r.value).toBeCloseTo(0, 5);
  });

  it("converts °F to °C for metric (212 °F → 100 °C)", () => {
    const r = convertValueForEmail(212, "°F", "metric");
    expect(r.unit).toBe("°C");
    expect(r.value).toBeCloseTo(100, 5);
  });

  it("returns unknown units unchanged for metric", () => {
    const r = convertValueForEmail(42, "furlongs", "metric");
    expect(r.value).toBe(42);
    expect(r.unit).toBe("furlongs");
  });
});
