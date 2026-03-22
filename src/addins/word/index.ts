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

// ─── PVT Report ───────────────────────────────────────────────────────────────

/** Build a PVT fluid properties key-value record for Word insertion. */
export function buildPvtReportData(params: {
  pressure_psia: number;
  temp_F: number;
  gasGravity: number;
  zFactor: number;
  bg_rcf_scf: number;
  gasVisc_cp: number;
  gasDensity_lbft3: number;
  oilAPI: number;
  bubblePoint_psia: number;
  bo_rbStb: number;
  oilVisc_cp: number;
}): Record<string, string> {
  return {
    "Pressure":                formatWordValue(params.pressure_psia, "psia"),
    "Temperature":             formatWordValue(params.temp_F, "°F"),
    "Gas Gravity":             formatWordValue(params.gasGravity, "", 3),
    "Z-Factor":                formatWordValue(params.zFactor, "", 4),
    "Gas FVF (Bg)":            formatWordValue(params.bg_rcf_scf, "rcf/scf", 4),
    "Gas Viscosity":           formatWordValue(params.gasVisc_cp, "cp", 4),
    "Gas Density":             formatWordValue(params.gasDensity_lbft3, "lb/ft³", 3),
    "Oil API Gravity":         formatWordValue(params.oilAPI, "°API", 1),
    "Bubble Point Pressure":   formatWordValue(params.bubblePoint_psia, "psia"),
    "Oil FVF (Bo)":            formatWordValue(params.bo_rbStb, "RB/STB", 4),
    "Oil Viscosity":           formatWordValue(params.oilVisc_cp, "cp", 4),
  };
}

// ─── Well Test Report ─────────────────────────────────────────────────────────

/** Build a well test / PTA interpretation key-value record for Word insertion. */
export function buildWellTestReportData(params: {
  wellName: string;
  testDate: string;
  producingTime_hr: number;
  flowRate_STBd: number;
  reservoirPressure_psia: number;
  permeability_md: number;
  skin: number;
  pStar_psia: number;
  wellboreStorage_bblPsi: number;
  radInvestigation_ft: number;
}): Record<string, string> {
  return {
    "Well Name":                  params.wellName,
    "Test Date":                  params.testDate,
    "Producing Time":             formatWordValue(params.producingTime_hr, "hr"),
    "Flow Rate":                  formatWordValue(params.flowRate_STBd, "STB/d"),
    "Reservoir Pressure (pi)":    formatWordValue(params.reservoirPressure_psia, "psia"),
    "Permeability":               formatWordValue(params.permeability_md, "md", 3),
    "Skin Factor":                formatWordValue(params.skin, "", 2),
    "Extrapolated Pressure (p*)": formatWordValue(params.pStar_psia, "psia"),
    "Wellbore Storage":           formatWordValue(params.wellboreStorage_bblPsi, "bbl/psi", 4),
    "Radius of Investigation":    formatWordValue(params.radInvestigation_ft, "ft"),
  };
}

// ─── DCA Report ───────────────────────────────────────────────────────────────

/** Build a decline curve analysis key-value record for Word insertion. */
export function buildDcaReportData(params: {
  wellName: string;
  model: string;
  qi_STBd: number;
  di_pct: number;
  b_factor: number;
  eur_MBbl: number;
  currentRate_STBd: number;
  forecastYears: number;
  economicLimit_STBd: number;
}): Record<string, string> {
  return {
    "Well Name":           params.wellName,
    "Decline Model":       params.model,
    "Initial Rate (qi)":   formatWordValue(params.qi_STBd, "STB/d"),
    "Initial Decline (Di)": formatWordValue(params.di_pct, "%/yr", 2),
    "b-Factor":            formatWordValue(params.b_factor, "", 3),
    "EUR":                 formatWordValue(params.eur_MBbl, "MBbl"),
    "Current Rate":        formatWordValue(params.currentRate_STBd, "STB/d"),
    "Forecast Period":     formatWordValue(params.forecastYears, "yr", 1),
    "Economic Limit":      formatWordValue(params.economicLimit_STBd, "STB/d"),
  };
}

// ─── Nodal Analysis Report ────────────────────────────────────────────────────

/** Build a nodal analysis key-value record for Word insertion. */
export function buildNodalReportData(params: {
  wellName: string;
  reservoirPressure_psia: number;
  operatingRate_STBd: number;
  operatingPwf_psia: number;
  tubingSize_in: number;
  skin: number;
  pi_STBdPsi: number;
  qMax_STBd: number;
}): Record<string, string> {
  return {
    "Well Name":              params.wellName,
    "Reservoir Pressure":     formatWordValue(params.reservoirPressure_psia, "psia"),
    "Operating Rate":         formatWordValue(params.operatingRate_STBd, "STB/d"),
    "Flowing BHP (Pwf)":      formatWordValue(params.operatingPwf_psia, "psia"),
    "Tubing Size":            `${params.tubingSize_in.toFixed(3)}"`,
    "Skin Factor":            formatWordValue(params.skin, "", 2),
    "Productivity Index (PI)": formatWordValue(params.pi_STBdPsi, "STB/d/psi", 3),
    "AOF (qMax)":             formatWordValue(params.qMax_STBd, "STB/d"),
  };
}

// ─── Material Balance Report ──────────────────────────────────────────────────

/** Build a material balance equation key-value record for Word insertion. */
export function buildMbeReportData(params: {
  fieldName: string;
  reservoirType: string;
  ogip_Bscf?: number;
  ooip_MMStb?: number;
  currentPressure_psia: number;
  initialPressure_psia: number;
  cumulativeProduction: number;
  productionUnit: string;
  driveIndices: Record<string, number>;
}): Record<string, string> {
  const result: Record<string, string> = {
    "Field Name":              params.fieldName,
    "Reservoir Type":          params.reservoirType,
    "Initial Pressure":        formatWordValue(params.initialPressure_psia, "psia"),
    "Current Pressure":        formatWordValue(params.currentPressure_psia, "psia"),
    "Cumulative Production":   `${formatWordValue(params.cumulativeProduction, params.productionUnit)}`,
  };

  if (params.ogip_Bscf !== undefined) {
    result["OGIP"] = formatWordValue(params.ogip_Bscf, "Bscf", 3);
  }
  if (params.ooip_MMStb !== undefined) {
    result["OOIP"] = formatWordValue(params.ooip_MMStb, "MMStb", 3);
  }

  for (const [drive, index] of Object.entries(params.driveIndices)) {
    result[`Drive Index — ${drive}`] = formatWordValue(index * 100, "%", 1);
  }

  return result;
}

// ─── Gas Composition Report ───────────────────────────────────────────────────

/** Build a gas composition key-value record for Word insertion. */
export function buildGasCompositionReportData(params: {
  sampleId: string;
  date: string;
  molarMass_lbMol: number;
  specificGravity: number;
  hhv_BTUscf: number;
  lhv_BTUscf: number;
  wobbeIndex: number;
  co2_mol?: number;
  h2s_mol?: number;
  n2_mol?: number;
}): Record<string, string> {
  const result: Record<string, string> = {
    "Sample ID":        params.sampleId,
    "Sample Date":      params.date,
    "Molar Mass":       formatWordValue(params.molarMass_lbMol, "lb/lb-mol", 3),
    "Specific Gravity": formatWordValue(params.specificGravity, "", 4),
    "HHV":              formatWordValue(params.hhv_BTUscf, "BTU/scf"),
    "LHV":              formatWordValue(params.lhv_BTUscf, "BTU/scf"),
    "Wobbe Index":      formatWordValue(params.wobbeIndex, "BTU/scf"),
  };

  if (params.co2_mol !== undefined) {
    result["CO₂"] = formatWordValue(params.co2_mol, "mol%", 3);
  }
  if (params.h2s_mol !== undefined) {
    result["H₂S"] = formatWordValue(params.h2s_mol, "mol%", 3);
  }
  if (params.n2_mol !== undefined) {
    result["N₂"] = formatWordValue(params.n2_mol, "mol%", 3);
  }

  return result;
}

// ─── Word Table Builder ───────────────────────────────────────────────────────

/**
 * Build a Markdown-style pipe-delimited table string suitable for pasting into
 * Word. The first row is the header row.
 */
export function buildWordTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? "").length))
  );

  const pad = (cell: string, width: number) => cell.padEnd(width);

  const headerRow  = "| " + headers.map((h, i) => pad(h, colWidths[i])).join(" | ") + " |";
  const separator  = "| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |";
  const dataRows   = rows.map(
    row => "| " + headers.map((_, i) => pad(row[i] ?? "", colWidths[i])).join(" | ") + " |"
  );

  return [headerRow, separator, ...dataRows].join("\n");
}

// ─── Word Document Content Builder ───────────────────────────────────────────

const TEMPLATE_TITLES: Record<string, string> = {
  "pipe-sizing":    "Pipe Sizing Report",
  "pvt-report":     "PVT Fluid Properties Report",
  "well-test-report": "Well Test Interpretation Report",
  "dca-report":     "Decline Curve Analysis Report",
  "nodal-report":   "Nodal Analysis Report",
  "mbe-report":     "Material Balance Report",
};

/**
 * Generate a full plain-text / Markdown document skeleton for the given
 * template ID, inserting the supplied data values. Returns a multiline string.
 */
export function buildWordDocumentContent(
  templateId: string,
  data: Record<string, string>,
  jobMetadata: { jobNumber: string; preparedBy: string; date: string; client?: string },
): string {
  const title = TEMPLATE_TITLES[templateId] ?? templateId;

  const metaLines = [
    `**Job Number:** ${jobMetadata.jobNumber}`,
    `**Prepared By:** ${jobMetadata.preparedBy}`,
    `**Date:** ${jobMetadata.date}`,
    ...(jobMetadata.client ? [`**Client:** ${jobMetadata.client}`] : []),
  ];

  const dataTable = buildWordTable(
    ["Parameter", "Value"],
    Object.entries(data).map(([k, v]) => [k, v]),
  );

  return [
    `# ${title}`,
    "",
    "## Job Information",
    ...metaLines,
    "",
    "## Results",
    dataTable,
    "",
    `---`,
    `*Generated by Petroleum 365 (P365) — Template: ${templateId}*`,
  ].join("\n");
}
