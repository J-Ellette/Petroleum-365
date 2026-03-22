/**
 * P365 Word Add-in — Document Plug-in
 *
 * Inserts pre-formatted petroleum engineering report templates into Word
 * documents and auto-fills calculated values from P365 function results.
 *
 * Planned Features:
 *   - Report template library (pipe sizing, well test, PVT, DCA reports)
 *   - Auto-fill calculated values into structured report tables
 *   - Insert pipe sizing summary tables with unit-aware formatting
 *   - Gas composition analysis report block
 *   - Well performance summary (IPR + VLP nodal analysis)
 *   - DCA forecast table and chart-ready data
 *   - Material balance report (OGIP, p/z, drive indices)
 *   - Pressure transient analysis interpretation summary
 *
 * Implementation Plan:
 *   1. Office.js Word API task pane (React + Office UI Fabric)
 *   2. Template library stored as Word content controls
 *   3. P365 function results formatted via Office.js Word.run()
 *   4. Unit-aware number formatting (field/SI toggle)
 *   5. Table and chart insertion via Word.TableCollection
 *
 * Architecture:
 *   src/addins/word/
 *     taskpane.html      — Word task pane entry point
 *     taskpane.tsx       — React component: template picker + value injector
 *     templates/         — Word XML content control templates
 *       pipe-sizing.ts   — Pipe sizing report template
 *       well-test.ts     — Well test (PTA) report template
 *       pvt-report.ts    — PVT fluid properties report
 *       dca-report.ts    — Decline curve analysis report
 *     commands.ts        — Ribbon command handlers
 *
 * Office API Requirements:
 *   @microsoft/office-js >= 1.1
 *   Word API 1.3+ (for rich content controls, table management)
 *
 * Manifest entry (word-manifest.xml):
 *   <Host Name="Document" />
 *   <Requirements><Sets><Set Name="WordApi" MinVersion="1.3" /></Sets></Requirements>
 */

// ─── Template Definitions ─────────────────────────────────────────────────────

/** Available Word report templates. */
export const WORD_TEMPLATES = [
  {
    id:          "pipe-sizing",
    name:        "Pipe Sizing Report",
    description: "Natural gas pipe sizing (Weymouth) — forward and reverse calculations",
    sections:    ["inputs", "results", "pipe-schedule", "velocity-check"],
  },
  {
    id:          "pvt-report",
    name:        "PVT Fluid Properties Report",
    description: "Complete PVT table: Z-factor, Bg, Rs, Bo, viscosity vs. pressure",
    sections:    ["inputs", "pvt-table", "bubble-point-summary"],
  },
  {
    id:          "well-test-report",
    name:        "Well Test Interpretation Report",
    description: "Pressure transient analysis: permeability, skin, extrapolated pressure",
    sections:    ["inputs", "horner-plot", "derivative-plot", "interpretation-summary"],
  },
  {
    id:          "dca-report",
    name:        "Decline Curve Analysis Report",
    description: "Arps / Duong / PLE decline forecast with EUR estimates",
    sections:    ["inputs", "model-parameters", "forecast-table", "eur-sensitivity"],
  },
  {
    id:          "nodal-report",
    name:        "Nodal Analysis Report",
    description: "IPR + VLP intersection, operating point, sensitivity to tubing size",
    sections:    ["inputs", "ipr-curve", "vlp-curves", "operating-point"],
  },
  {
    id:          "mbe-report",
    name:        "Material Balance Report",
    description: "OGIP/OOIP estimation, p/z plot, drive indices, aquifer matching",
    sections:    ["inputs", "pz-plot", "drive-indices", "aquifer-match"],
  },
] as const;

export type WordTemplateId = typeof WORD_TEMPLATES[number]["id"];

// ─── Value Injection Helpers ──────────────────────────────────────────────────

/** Format a number for insertion into a Word document with unit label. */
export function formatWordValue(value: number, unit: string, decimals = 2): string {
  return `${value.toFixed(decimals)} ${unit}`;
}

/** Build a pipe sizing summary for Word insertion. */
export function buildPipeSizingSummary(params: {
  inletPressure_psig: number;
  outletPressure_psig: number;
  flowRate_scfh: number;
  pipeLength_ft: number;
  nominalPipeSizeIn: number;
  material: "bare-steel" | "coated-steel" | "PE";
  capacity_BTUh: number;
  velocity_fts: number;
}): Record<string, string> {
  return {
    "Inlet Pressure":      formatWordValue(params.inletPressure_psig, "psig"),
    "Outlet Pressure":     formatWordValue(params.outletPressure_psig, "psig"),
    "Flow Rate":           formatWordValue(params.flowRate_scfh, "SCFH"),
    "Pipe Length":         formatWordValue(params.pipeLength_ft, "ft"),
    "Nominal Pipe Size":   `${params.nominalPipeSizeIn}" NPS`,
    "Material":            params.material,
    "Heating Capacity":    formatWordValue(params.capacity_BTUh / 1e6, "MMBTUh"),
    "Gas Velocity":        formatWordValue(params.velocity_fts, "ft/s"),
    "Velocity Status":     params.velocity_fts < 40 ? "ACCEPTABLE (< 40 ft/s)" : "EXCEEDS LIMIT",
  };
}
