/**
 * P365 PowerPoint Add-in — Presentation Plug-in
 *
 * Auto-generates engineering slide decks from P365 calculation results.
 * Useful for consulting deliverables, client presentations, and project reports.
 *
 * Planned Features:
 *   - Auto-generate "Pipe Sizing Report" presentation from job data
 *   - Insert calculation summary slides (charts, tables, key results)
 *   - Apply P365 branded slide template (company colors, logo)
 *   - Chart insertion: IPR/VLP curves, p/z plots, DCA forecasts, Pc curves
 *   - Export slide data to PowerPoint from Excel calculations
 *
 * Implementation Plan:
 *   1. Office.js PowerPoint API task pane (React)
 *   2. Slide template library stored as PPTX XML
 *   3. Chart data injection via Office.js Chart API
 *   4. P365 brand colors: #1a5276 (dark blue), #2e86c1, #1abc9c
 *   5. Export workflow: Excel → P365 add-in → PPTX generation
 *
 * Architecture:
 *   src/addins/powerpoint/
 *     taskpane.html         — PowerPoint task pane entry
 *     taskpane.tsx          — React: slide builder UI
 *     templates/
 *       pipe-sizing.ts      — Pipe sizing presentation template
 *       well-summary.ts     — Well performance summary slides
 *       dca-forecast.ts     — DCA forecast slides
 *       gas-composition.ts  — Gas composition analysis slides
 *     charts/
 *       ipr-vlp-chart.ts    — IPR + VLP chart data builder
 *       pz-plot.ts          — p/z plot data builder
 *       dca-chart.ts        — Decline curve chart builder
 *     commands.ts           — Ribbon command handlers
 *
 * Office API Requirements:
 *   @microsoft/office-js >= 1.1
 *   PowerPoint API 1.3+
 *   Permission: ReadWriteDocument
 *
 * Manifest entry (powerpoint-manifest.xml):
 *   <Host Name="Presentation" />
 */

// ─── Slide Template Definitions ───────────────────────────────────────────────

/** Available PowerPoint slide deck templates. */
export const PPTX_TEMPLATES = [
  {
    id:          "pipe-sizing-deck",
    name:        "Pipe Sizing Report Presentation",
    description: "3–5 slide deck: inputs, Weymouth results, pipe schedule, velocity check",
    slideCount:  4,
  },
  {
    id:          "well-performance-deck",
    name:        "Well Performance Presentation",
    description: "IPR + VLP nodal analysis, tubing sensitivity, operating point",
    slideCount:  5,
  },
  {
    id:          "dca-forecast-deck",
    name:        "Decline Curve Analysis Presentation",
    description: "Arps/Duong forecast, EUR estimates, sensitivity analysis",
    slideCount:  4,
  },
  {
    id:          "reservoir-mbe-deck",
    name:        "Reservoir Material Balance Presentation",
    description: "p/z plot, OGIP, drive indices, aquifer model match",
    slideCount:  5,
  },
  {
    id:          "gas-composition-deck",
    name:        "Gas Composition Analysis Presentation",
    description: "Composition table, HHV/LHV/Wobbe, AGA-8 Z-factor comparison",
    slideCount:  3,
  },
] as const;

export type PptxTemplateId = typeof PPTX_TEMPLATES[number]["id"];

// ─── Slide Types ─────────────────────────────────────────────────────────────

/** Represents a generic slide object for PowerPoint insertion */
export interface PptxSlide {
  title: string;
  layout: "title" | "content" | "twoColumn" | "chart" | "blank";
  body?: string;
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  chartData?: { series: Array<{ name: string; data: number[] }>; xAxis: number[]; xLabel: string; yLabel: string };
  footer?: string;
  backgroundColor?: string;
}

// ─── Slide Data Builders ──────────────────────────────────────────────────────

/** P365 brand palette for PowerPoint slides. */
export const P365_COLORS = {
  primaryDark:  "#1a5276",
  primaryMid:   "#2e86c1",
  accent:       "#1abc9c",
  light:        "#d6eaf8",
  textDark:     "#1c2833",
  textGray:     "#5d6d7e",
  white:        "#ffffff",
  success:      "#27ae60",
  warning:      "#e67e22",
  danger:       "#c0392b",
} as const;

/**
 * Build slide data for a pipe sizing title slide.
 *
 * @param jobName    Job / project name
 * @param preparedBy Engineer's name
 * @param date       Date string
 * @returns          Slide data object for Office.js insertion
 */
export function buildPipeSizingTitleSlide(
  jobName: string,
  preparedBy: string,
  date: string,
): {
  title:    string;
  subtitle: string;
  body:     string;
} {
  return {
    title:    `Pipe Sizing Report\n${jobName}`,
    subtitle: "Natural Gas Distribution — P365 Engineering Analysis",
    body:     `Prepared by: ${preparedBy}\nDate: ${date}\nCalculated using: Petroleum 365 (P365)`,
  };
}

/**
 * Build chart data for an IPR + VLP nodal analysis slide.
 *
 * @param rates_STBd    Array of flow rates (STB/d)
 * @param iprPwf_psi    IPR flowing bottomhole pressures (psi) for each rate
 * @param vlpPwf_psi    VLP bottomhole pressures (psi) for each rate
 * @param operatingRate_STBd  Operating point flow rate
 * @param operatingPwf_psi    Operating point Pwf
 * @returns Chart data suitable for Office.js Chart insertion
 */
export function buildNodalChartData(
  rates_STBd: number[],
  iprPwf_psi: number[],
  vlpPwf_psi: number[],
  operatingRate_STBd: number,
  operatingPwf_psi: number,
): {
  series: Array<{ name: string; data: number[] }>;
  xAxis:  number[];
  xLabel: string;
  yLabel: string;
  annotations: Array<{ x: number; y: number; label: string }>;
} {
  return {
    series: [
      { name: "IPR (Vogel)", data: iprPwf_psi },
      { name: "VLP (Beggs-Brill)", data: vlpPwf_psi },
    ],
    xAxis:  rates_STBd,
    xLabel: "Flow Rate (STB/d)",
    yLabel: "Flowing BHP (psi)",
    annotations: [
      {
        x:     operatingRate_STBd,
        y:     operatingPwf_psi,
        label: `Operating Point\n${operatingRate_STBd.toFixed(0)} STB/d @ ${operatingPwf_psi.toFixed(0)} psi`,
      },
    ],
  };
}

// ─── Additional Slide Builders ────────────────────────────────────────────────

/**
 * Build a pipe sizing results slide with a 2-column Parameter/Value table.
 */
export function buildPipeSizingResultsSlide(results: Record<string, string>): PptxSlide {
  return {
    title: "Pipe Sizing Results",
    layout: "content",
    table: {
      headers: ["Parameter", "Value"],
      rows: Object.entries(results).map(([k, v]) => [k, v]),
    },
    footer: "Calculated using Petroleum 365 (P365)",
  };
}

/**
 * Build a pipe schedule slide with a table of pipe schedule rows.
 */
export function buildPipeSizingScheduleSlide(
  scheduleRows: Array<{ nps: string; od_in: number; id_in: number; wall_in: number; material: string }>,
): PptxSlide {
  return {
    title: "Recommended Pipe Schedule",
    layout: "chart",
    table: {
      headers: ["NPS (in)", "OD (in)", "ID (in)", "Wall (in)", "Material"],
      rows: scheduleRows.map(r => [r.nps, r.od_in.toFixed(3), r.id_in.toFixed(3), r.wall_in.toFixed(3), r.material]),
    },
    footer: "Calculated using Petroleum 365 (P365)",
  };
}

/**
 * Build chart data for a DCA decline curve (rate vs time, with cumulative).
 */
export function buildDcaChartData(
  times_yr: number[],
  rates_STBd: number[],
  cumulative_MBbl: number[],
  modelName: string,
): { series: Array<{ name: string; data: number[] }>; xAxis: number[]; xLabel: string; yLabel: string } {
  return {
    series: [
      { name: `Rate — ${modelName}`, data: rates_STBd },
      { name: `Cumulative — ${modelName}`, data: cumulative_MBbl },
    ],
    xAxis: times_yr,
    xLabel: "Time (yr)",
    yLabel: "Rate (STB/d) / Cumulative (MBbl)",
  };
}

/**
 * Build a DCA forecast slide with chart data and model parameter bullets.
 */
export function buildDcaForecastSlide(params: {
  wellName: string;
  model: string;
  qi_STBd: number;
  di_pct: number;
  b_factor: number;
  eur_MBbl: number;
  times_yr: number[];
  rates_STBd: number[];
  cumulative_MBbl: number[];
}): PptxSlide {
  return {
    title: `DCA Forecast — ${params.wellName}`,
    layout: "chart",
    chartData: buildDcaChartData(params.times_yr, params.rates_STBd, params.cumulative_MBbl, params.model),
    bullets: [
      `Model: ${params.model}`,
      `Initial Rate (qi): ${params.qi_STBd.toFixed(0)} STB/d`,
      `Decline Rate (Di): ${params.di_pct.toFixed(2)}%/yr`,
      `b-factor: ${params.b_factor.toFixed(3)}`,
      `EUR: ${params.eur_MBbl.toFixed(1)} MBbl`,
    ],
    footer: "Calculated using Petroleum 365 (P365)",
  };
}

/**
 * Build p/z plot data with a Trend series and OGIP annotation.
 */
export function buildPzPlotData(
  gp_Bscf: number[],
  pz_ratios: number[],
  ogip_Bscf: number,
): {
  series: Array<{ name: string; data: number[] }>;
  xAxis: number[];
  xLabel: string;
  yLabel: string;
  annotations: Array<{ x: number; y: number; label: string }>;
} {
  return {
    series: [{ name: "Trend", data: pz_ratios }],
    xAxis: gp_Bscf,
    xLabel: "Cumulative Production, Gp (Bscf)",
    yLabel: "p/z (psia)",
    annotations: [
      {
        x: ogip_Bscf,
        y: 0,
        label: `OGIP = ${ogip_Bscf.toFixed(2)} Bscf`,
      },
    ],
  };
}

/**
 * Build an MBE summary slide with key results bullets and drive indices table.
 */
export function buildMbeSummarySlide(params: {
  fieldName: string;
  ogip_Bscf?: number;
  ooip_MMStb?: number;
  currentPressure_psia: number;
  initialPressure_psia: number;
  driveIndices: Record<string, number>;
}): PptxSlide {
  const bullets: string[] = [
    `Field: ${params.fieldName}`,
    `Initial Pressure: ${params.initialPressure_psia.toFixed(0)} psia`,
    `Current Pressure: ${params.currentPressure_psia.toFixed(0)} psia`,
  ];
  if (params.ogip_Bscf !== undefined) bullets.push(`OGIP: ${params.ogip_Bscf.toFixed(2)} Bscf`);
  if (params.ooip_MMStb !== undefined) bullets.push(`OOIP: ${params.ooip_MMStb.toFixed(2)} MMStb`);

  return {
    title: `MBE Summary — ${params.fieldName}`,
    layout: "twoColumn",
    bullets,
    table: {
      headers: ["Drive Mechanism", "Index"],
      rows: Object.entries(params.driveIndices).map(([name, idx]) => [name, `${(idx * 100).toFixed(1)}%`]),
    },
    footer: "Calculated using Petroleum 365 (P365)",
  };
}

/**
 * Build a gas composition properties slide with a properties table.
 */
export function buildGasCompositionSlide(params: {
  sampleId: string;
  molarMass_lbMol: number;
  specificGravity: number;
  hhv_BTUscf: number;
  lhv_BTUscf: number;
  wobbeIndex: number;
}): PptxSlide {
  return {
    title: `Gas Composition — ${params.sampleId}`,
    layout: "content",
    table: {
      headers: ["Property", "Value"],
      rows: [
        ["Sample ID", params.sampleId],
        ["Molar Mass", `${params.molarMass_lbMol.toFixed(3)} lb/mol`],
        ["Specific Gravity", params.specificGravity.toFixed(4)],
        ["HHV", `${params.hhv_BTUscf.toFixed(2)} BTU/scf`],
        ["LHV", `${params.lhv_BTUscf.toFixed(2)} BTU/scf`],
        ["Wobbe Index", `${params.wobbeIndex.toFixed(2)} BTU/scf`],
      ],
    },
    footer: "Calculated using Petroleum 365 (P365)",
  };
}

/**
 * Assemble a 3-slide pipe sizing deck: title, results, schedule.
 */
export function assemblePipeSizingDeck(params: {
  jobName: string;
  preparedBy: string;
  date: string;
  results: Record<string, string>;
  scheduleRows: Array<{ nps: string; od_in: number; id_in: number; wall_in: number; material: string }>;
}): PptxSlide[] {
  const titleRaw = buildPipeSizingTitleSlide(params.jobName, params.preparedBy, params.date);
  const titleSlide: PptxSlide = {
    title: titleRaw.title,
    layout: "title",
    body: `${titleRaw.subtitle}\n${titleRaw.body}`,
  };
  return [
    titleSlide,
    buildPipeSizingResultsSlide(params.results),
    buildPipeSizingScheduleSlide(params.scheduleRows),
  ];
}

/**
 * Assemble a 2-slide DCA deck: title slide + DCA forecast slide.
 */
export function assembleDcaDeck(params: {
  wellName: string;
  preparedBy: string;
  date: string;
  model: string;
  qi_STBd: number;
  di_pct: number;
  b_factor: number;
  eur_MBbl: number;
  times_yr: number[];
  rates_STBd: number[];
  cumulative_MBbl: number[];
}): PptxSlide[] {
  const titleRaw = buildPipeSizingTitleSlide(params.wellName, params.preparedBy, params.date);
  const titleSlide: PptxSlide = {
    title: titleRaw.title,
    layout: "title",
    body: `DCA Forecast Report\nPrepared by: ${params.preparedBy}\nDate: ${params.date}`,
  };
  return [
    titleSlide,
    buildDcaForecastSlide(params),
  ];
}
