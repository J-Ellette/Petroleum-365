/**
 * Tests: PowerPoint Add-in slide builders
 */

import {
  buildPipeSizingTitleSlide,
  buildNodalChartData,
  buildPipeSizingResultsSlide,
  buildPipeSizingScheduleSlide,
  buildDcaChartData,
  buildDcaForecastSlide,
  buildPzPlotData,
  buildMbeSummarySlide,
  buildGasCompositionSlide,
  assemblePipeSizingDeck,
  assembleDcaDeck,
} from "../../src/addins/powerpoint/index";

// ─── buildPipeSizingTitleSlide ────────────────────────────────────────────────

describe("buildPipeSizingTitleSlide", () => {
  it("includes job name in title", () => {
    const s = buildPipeSizingTitleSlide("Acme Pipeline", "J. Smith", "2025-01-01");
    expect(s.title).toContain("Acme Pipeline");
  });

  it("includes prepared-by in body", () => {
    const s = buildPipeSizingTitleSlide("X", "Jane Doe", "2025-01-01");
    expect(s.body).toContain("Jane Doe");
  });

  it("includes date in body", () => {
    const s = buildPipeSizingTitleSlide("X", "Y", "2025-06-15");
    expect(s.body).toContain("2025-06-15");
  });
});

// ─── buildNodalChartData ──────────────────────────────────────────────────────

describe("buildNodalChartData", () => {
  const rates = [0, 500, 1000];
  const ipr   = [3000, 2000, 1000];
  const vlp   = [800, 1500, 2200];

  it("returns two series (IPR, VLP)", () => {
    const d = buildNodalChartData(rates, ipr, vlp, 500, 1500);
    expect(d.series).toHaveLength(2);
    expect(d.series[0].name).toMatch(/IPR/i);
    expect(d.series[1].name).toMatch(/VLP/i);
  });

  it("includes operating-point annotation", () => {
    const d = buildNodalChartData(rates, ipr, vlp, 500, 1500);
    expect(d.annotations).toHaveLength(1);
    expect(d.annotations[0].x).toBe(500);
    expect(d.annotations[0].y).toBe(1500);
  });
});

// ─── buildPipeSizingResultsSlide ─────────────────────────────────────────────

describe("buildPipeSizingResultsSlide", () => {
  const results = { "Flow Rate": "50 000 scfh", "Velocity": "25 ft/s" };

  it("has 'content' layout", () => {
    expect(buildPipeSizingResultsSlide(results).layout).toBe("content");
  });

  it("title is 'Pipe Sizing Results'", () => {
    expect(buildPipeSizingResultsSlide(results).title).toBe("Pipe Sizing Results");
  });

  it("table headers are Parameter and Value", () => {
    const slide = buildPipeSizingResultsSlide(results);
    expect(slide.table?.headers).toEqual(["Parameter", "Value"]);
  });

  it("table rows contain each result key", () => {
    const slide = buildPipeSizingResultsSlide(results);
    const firstCols = slide.table!.rows.map(r => r[0]);
    expect(firstCols).toContain("Flow Rate");
    expect(firstCols).toContain("Velocity");
  });
});

// ─── buildPipeSizingScheduleSlide ────────────────────────────────────────────

describe("buildPipeSizingScheduleSlide", () => {
  const rows = [
    { nps: "2", od_in: 2.375, id_in: 2.067, wall_in: 0.154, material: "bare-steel" },
    { nps: "3", od_in: 3.5,   id_in: 3.068, wall_in: 0.216, material: "coated-steel" },
  ];

  it("has 'chart' layout", () => {
    expect(buildPipeSizingScheduleSlide(rows).layout).toBe("chart");
  });

  it("title contains 'Pipe Schedule'", () => {
    expect(buildPipeSizingScheduleSlide(rows).title).toContain("Pipe Schedule");
  });

  it("has 5 table headers", () => {
    const slide = buildPipeSizingScheduleSlide(rows);
    expect(slide.table?.headers).toHaveLength(5);
  });

  it("has one row per input", () => {
    expect(buildPipeSizingScheduleSlide(rows).table?.rows).toHaveLength(2);
  });

  it("first row contains NPS value", () => {
    const slide = buildPipeSizingScheduleSlide(rows);
    expect(slide.table!.rows[0][0]).toBe("2");
  });
});

// ─── buildDcaChartData ────────────────────────────────────────────────────────

describe("buildDcaChartData", () => {
  const times = [0, 1, 2, 3];
  const rates  = [1000, 800, 640, 512];
  const cumul  = [0, 292, 438, 544];

  it("returns two series (Rate, Cumulative)", () => {
    const d = buildDcaChartData(times, rates, cumul, "Arps Exponential");
    expect(d.series).toHaveLength(2);
  });

  it("series names include model name", () => {
    const d = buildDcaChartData(times, rates, cumul, "Arps Exponential");
    const names = d.series.map(s => s.name);
    expect(names.some(n => n.includes("Arps Exponential"))).toBe(true);
  });

  it("xAxis is time array", () => {
    const d = buildDcaChartData(times, rates, cumul, "Arps");
    expect(d.xAxis).toEqual(times);
  });

  it("xLabel mentions time", () => {
    const d = buildDcaChartData(times, rates, cumul, "Arps");
    expect(d.xLabel.toLowerCase()).toContain("time");
  });
});

// ─── buildDcaForecastSlide ────────────────────────────────────────────────────

describe("buildDcaForecastSlide", () => {
  const p = {
    wellName: "Well-42",
    model: "Arps Exponential",
    qi_STBd: 1000,
    di_pct: 15,
    b_factor: 0,
    eur_MBbl: 250,
    times_yr: [0, 1, 2],
    rates_STBd: [1000, 850, 720],
    cumulative_MBbl: [0, 164, 292],
  };

  it("has 'chart' layout", () => {
    expect(buildDcaForecastSlide(p).layout).toBe("chart");
  });

  it("title contains well name", () => {
    expect(buildDcaForecastSlide(p).title).toContain("Well-42");
  });

  it("chartData is populated", () => {
    expect(buildDcaForecastSlide(p).chartData).toBeDefined();
  });

  it("bullets contain EUR", () => {
    const bullets = buildDcaForecastSlide(p).bullets ?? [];
    expect(bullets.some(b => b.toLowerCase().includes("eur"))).toBe(true);
  });

  it("bullets contain qi", () => {
    const bullets = buildDcaForecastSlide(p).bullets ?? [];
    expect(bullets.some(b => b.includes("1000"))).toBe(true);
  });

  it("bullets contain model name", () => {
    const bullets = buildDcaForecastSlide(p).bullets ?? [];
    expect(bullets.some(b => b.toLowerCase().includes("arps"))).toBe(true);
  });
});

// ─── buildPzPlotData ─────────────────────────────────────────────────────────

describe("buildPzPlotData", () => {
  const gp    = [0, 10, 20, 30];
  const pz    = [2000, 1500, 1000, 500];
  const ogip  = 40;

  it("returns a Trend series", () => {
    const d = buildPzPlotData(gp, pz, ogip);
    expect(d.series.some(s => s.name === "Trend")).toBe(true);
  });

  it("xAxis is Gp array", () => {
    const d = buildPzPlotData(gp, pz, ogip);
    expect(d.xAxis).toEqual(gp);
  });

  it("annotation contains OGIP label", () => {
    const d = buildPzPlotData(gp, pz, ogip);
    expect(d.annotations[0].label).toContain("OGIP");
    expect(d.annotations[0].x).toBe(40);
  });

  it("annotation y is 0 (p/z intercept)", () => {
    const d = buildPzPlotData(gp, pz, ogip);
    expect(d.annotations[0].y).toBe(0);
  });
});

// ─── buildMbeSummarySlide ─────────────────────────────────────────────────────

describe("buildMbeSummarySlide", () => {
  const p = {
    fieldName: "Ranger Field",
    ogip_Bscf: 500,
    currentPressure_psia: 2000,
    initialPressure_psia: 3500,
    driveIndices: { "Gas Expansion": 0.80, "Water Influx": 0.15, "Compressibility": 0.05 },
  };

  it("has 'twoColumn' layout", () => {
    expect(buildMbeSummarySlide(p).layout).toBe("twoColumn");
  });

  it("title contains field name", () => {
    expect(buildMbeSummarySlide(p).title).toContain("Ranger Field");
  });

  it("bullets contain OGIP", () => {
    const bullets = buildMbeSummarySlide(p).bullets ?? [];
    expect(bullets.some(b => b.toLowerCase().includes("ogip"))).toBe(true);
  });

  it("table has drive index rows", () => {
    const slide = buildMbeSummarySlide(p);
    expect(slide.table?.rows.length).toBe(3);
  });

  it("excludes ooip bullet when not provided", () => {
    const bullets = buildMbeSummarySlide(p).bullets ?? [];
    expect(bullets.some(b => b.toLowerCase().includes("ooip"))).toBe(false);
  });

  it("includes ooip bullet when provided", () => {
    const bullets = buildMbeSummarySlide({ ...p, ooip_MMStb: 120 }).bullets ?? [];
    expect(bullets.some(b => b.toLowerCase().includes("ooip"))).toBe(true);
  });
});

// ─── buildGasCompositionSlide ─────────────────────────────────────────────────

describe("buildGasCompositionSlide", () => {
  const p = {
    sampleId: "GAS-001",
    molarMass_lbMol: 18.32,
    specificGravity: 0.632,
    hhv_BTUscf: 1020.5,
    lhv_BTUscf: 919.3,
    wobbeIndex: 1284.0,
  };

  it("has 'content' layout", () => {
    expect(buildGasCompositionSlide(p).layout).toBe("content");
  });

  it("title contains sample ID", () => {
    expect(buildGasCompositionSlide(p).title).toContain("GAS-001");
  });

  it("table has 6 rows", () => {
    expect(buildGasCompositionSlide(p).table?.rows).toHaveLength(6);
  });

  it("table headers are Property and Value", () => {
    expect(buildGasCompositionSlide(p).table?.headers).toEqual(["Property", "Value"]);
  });
});

// ─── assemblePipeSizingDeck ───────────────────────────────────────────────────

describe("assemblePipeSizingDeck", () => {
  const deck = assemblePipeSizingDeck({
    jobName: "Job Alpha",
    preparedBy: "Alice",
    date: "2025-01-15",
    results: { "Pipe Size": '2"', "Velocity": "20 ft/s" },
    scheduleRows: [{ nps: "2", od_in: 2.375, id_in: 2.067, wall_in: 0.154, material: "bare-steel" }],
  });

  it("returns exactly 3 slides", () => {
    expect(deck).toHaveLength(3);
  });

  it("first slide is 'title' layout", () => {
    expect(deck[0].layout).toBe("title");
  });

  it("second slide is results (content layout)", () => {
    expect(deck[1].layout).toBe("content");
  });

  it("third slide is schedule", () => {
    expect(deck[2].title).toContain("Schedule");
  });

  it("title slide contains job name", () => {
    expect(deck[0].title).toContain("Job Alpha");
  });
});

// ─── assembleDcaDeck ─────────────────────────────────────────────────────────

describe("assembleDcaDeck", () => {
  const deck = assembleDcaDeck({
    wellName: "Well-7",
    preparedBy: "Bob",
    date: "2025-03-01",
    model: "Arps",
    qi_STBd: 800,
    di_pct: 12,
    b_factor: 0.5,
    eur_MBbl: 180,
    times_yr: [0, 1, 2],
    rates_STBd: [800, 704, 620],
    cumulative_MBbl: [0, 130, 230],
  });

  it("returns exactly 2 slides", () => {
    expect(deck).toHaveLength(2);
  });

  it("first slide is title layout", () => {
    expect(deck[0].layout).toBe("title");
  });

  it("second slide is chart layout", () => {
    expect(deck[1].layout).toBe("chart");
  });

  it("second slide contains well name", () => {
    expect(deck[1].title).toContain("Well-7");
  });
});
