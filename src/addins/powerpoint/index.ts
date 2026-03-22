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
