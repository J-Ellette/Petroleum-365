/**
 * P365 Teams Add-in — Collaboration Plug-in
 *
 * Embeds P365 engineering calculators as a Teams app/tab for real-time
 * lookups during meetings, and provides a bot for quick Q&A.
 *
 * Planned Features:
 *   - Teams tab: embedded web calculator (Weymouth, Z-factor, PVT)
 *   - Bot: answer quick engineering questions ("What's EL for 2-in globe valve?")
 *   - Adaptive card results: share calculation results in channel/chat
 *   - Meeting app: surface P365 data during Teams meetings
 *   - Connector: post scheduled reservoir performance updates to a channel
 *
 * Implementation Plan:
 *   1. Teams Tab app (React SPA hosted on Azure Static Web Apps / Netlify)
 *   2. Teams Bot Framework (Azure Bot Service / adaptive cards)
 *   3. Message Extension: search P365 functions from compose box
 *   4. Adaptive Card templates for sharing results
 *   5. Microsoft Graph integration for file access (Excel/Word results)
 *
 * Architecture:
 *   src/addins/teams/
 *     tab/
 *       app.tsx          — Teams tab React app entry
 *       calculators/     — Calculator UI components
 *         WeymouthCalc.tsx
 *         ZFactorCalc.tsx
 *         UnitConverter.tsx
 *     bot/
 *       index.ts         — Bot Framework dialog handler
 *       dialogs/
 *         equivalentLength.ts  — EL for fittings lookup
 *         pipeSize.ts          — Quick pipe sizing
 *         unitConvert.ts       — Unit conversion
 *     cards/
 *       pipe-sizing-card.ts    — Adaptive card for pipe sizing
 *       well-perf-card.ts      — Adaptive card for well performance
 *     manifest.json            — Teams app manifest
 *
 * Teams App Manifest Requirements:
 *   "staticTabs": [{ "entityId": "p365-calculator", "name": "P365 Calculator" }]
 *   "bots": [{ "botId": "{bot-id}", "needsChannelSelector": false }]
 *   "composeExtensions": [{ "botId": "{bot-id}", "commands": [...] }]
 */

// ─── Adaptive Card Builder ────────────────────────────────────────────────────

/**
 * Build a Teams Adaptive Card JSON for displaying P365 calculation results.
 *
 * @param title   Card title
 * @param rows    Key-value pairs of results
 * @param source  Description of the calculation performed
 * @returns       Adaptive Card JSON object
 */
export function buildTeamsAdaptiveCard(
  title: string,
  rows: Record<string, string>,
  source: string,
): object {
  const facts = Object.entries(rows).map(([k, v]) => ({ title: k, value: v }));

  return {
    type:    "AdaptiveCard",
    version: "1.4",
    body:    [
      {
        type:   "TextBlock",
        text:   `🛢 ${title}`,
        weight: "Bolder",
        size:   "Medium",
        color:  "Accent",
      },
      {
        type:    "FactSet",
        facts,
      },
      {
        type:     "TextBlock",
        text:     `*${source}*`,
        size:     "Small",
        color:    "Good",
        isSubtle: true,
      },
    ],
    actions: [
      {
        type:  "Action.OpenUrl",
        title: "Open P365 Calculator",
        url:   "https://petroleum365.app/calculator",
      },
    ],
  };
}

// ─── Bot Quick-Answer Database ────────────────────────────────────────────────

/** Equivalent lengths (ft) for fittings per NFPA 54 / AGA Table. */
export const EQUIVALENT_LENGTHS: Record<string, Record<string, number>> = {
  "0.5":  { "90-elbow": 1.2,  "gate-valve": 0.3,  "globe-valve": 19, "tee-branch": 2.5 },
  "0.75": { "90-elbow": 1.7,  "gate-valve": 0.4,  "globe-valve": 25, "tee-branch": 3.7 },
  "1.0":  { "90-elbow": 2.2,  "gate-valve": 0.5,  "globe-valve": 35, "tee-branch": 5.0 },
  "1.25": { "90-elbow": 3.0,  "gate-valve": 0.7,  "globe-valve": 45, "tee-branch": 6.5 },
  "1.5":  { "90-elbow": 3.5,  "gate-valve": 0.8,  "globe-valve": 55, "tee-branch": 8.0 },
  "2.0":  { "90-elbow": 4.5,  "gate-valve": 1.1,  "globe-valve": 75, "tee-branch": 10.5 },
  "2.5":  { "90-elbow": 5.5,  "gate-valve": 1.3,  "globe-valve": 85, "tee-branch": 13.0 },
  "3.0":  { "90-elbow": 7.0,  "gate-valve": 1.7,  "globe-valve": 105, "tee-branch": 17.0 },
  "4.0":  { "90-elbow": 9.0,  "gate-valve": 2.2,  "globe-valve": 140, "tee-branch": 22.0 },
  "6.0":  { "90-elbow": 13.0, "gate-valve": 3.3,  "globe-valve": 205, "tee-branch": 33.0 },
};

/**
 * Bot quick answer: equivalent length for a fitting and pipe size.
 *
 * @param npsSizeIn   Nominal pipe size (in): "0.5", "0.75", "1.0", "1.25",
 *                    "1.5", "2.0", "2.5", "3.0", "4.0", "6.0"
 * @param fittingType Fitting type key (e.g., "90-elbow", "globe-valve")
 * @returns           Equivalent length (ft) or null if not found
 */
export function getBotEquivalentLength(
  npsSizeIn: string,
  fittingType: string,
): number | null {
  return EQUIVALENT_LENGTHS[npsSizeIn]?.[fittingType] ?? null;
}

/** Bot Q&A: format an EL answer for Teams chat. */
export function formatBotELAnswer(
  npsSizeIn: string,
  fittingType: string,
): string {
  const el = getBotEquivalentLength(npsSizeIn, fittingType);
  if (el === null) {
    return `I couldn't find the equivalent length for a ${npsSizeIn}" ${fittingType}. Try: ${Object.keys(EQUIVALENT_LENGTHS["2.0"] ?? {}).join(", ")}`;
  }
  return `The equivalent length for a ${npsSizeIn}" ${fittingType} is **${el} ft** (per NFPA 54/AGA).`;
}

// ─── Pipe Sizing Adaptive Card ────────────────────────────────────────────────

/** Build a Teams Adaptive Card for pipe sizing results. */
export function buildPipeSizingCard(params: {
  jobName: string;
  inletPressure_psig: number;
  outletPressure_psig: number;
  flowRate_scfh: number;
  pipeLength_ft: number;
  nominalPipeSize_in: number;
  material: string;
  capacity_BTUh: number;
  velocity_fts: number;
}): object {
  const facts = [
    { title: "Job Name",                  value: params.jobName },
    { title: "Inlet Pressure (psig)",     value: params.inletPressure_psig.toFixed(2) },
    { title: "Outlet Pressure (psig)",    value: params.outletPressure_psig.toFixed(2) },
    { title: "Flow Rate (scf/h)",         value: params.flowRate_scfh.toFixed(1) },
    { title: "Pipe Length (ft)",          value: params.pipeLength_ft.toFixed(1) },
    { title: "Nominal Pipe Size (in)",    value: params.nominalPipeSize_in.toString() },
    { title: "Material",                  value: params.material },
    { title: "Capacity (BTU/h)",          value: params.capacity_BTUh.toFixed(0) },
    { title: "Gas Velocity (ft/s)",       value: params.velocity_fts.toFixed(2) },
  ];

  const body: object[] = [
    {
      type:   "TextBlock",
      text:   `🛢 Pipe Sizing Results — ${params.jobName}`,
      weight: "Bolder",
      size:   "Medium",
      color:  "Accent",
    },
    { type: "FactSet", facts },
  ];

  if (params.velocity_fts >= 40) {
    body.push({
      type:   "TextBlock",
      text:   `⚠️ Warning: gas velocity (${params.velocity_fts.toFixed(1)} ft/s) exceeds 40 ft/s — consider a larger pipe size.`,
      color:  "Attention",
      wrap:   true,
    });
  }

  body.push({
    type:     "TextBlock",
    text:     "*Calculated using the Weymouth equation (P365)*",
    size:     "Small",
    color:    "Good",
    isSubtle: true,
  });

  return {
    type:    "AdaptiveCard",
    version: "1.4",
    body,
    actions: [
      {
        type:  "Action.OpenUrl",
        title: "Open P365 Calculator",
        url:   "https://petroleum365.app/calculator",
      },
    ],
  };
}

// ─── Well Performance Adaptive Card ──────────────────────────────────────────

/** Build a Teams Adaptive Card for well performance results. */
export function buildWellPerformanceCard(params: {
  wellName: string;
  operatingRate_STBd: number;
  operatingPwf_psia: number;
  reservoirPressure_psia: number;
  skin: number;
  pi_STBdPsi: number;
}): object {
  const facts = [
    { title: "Well Name",                    value: params.wellName },
    { title: "Reservoir Pressure (psia)",    value: params.reservoirPressure_psia.toFixed(1) },
    { title: "Operating Rate (STB/d)",       value: params.operatingRate_STBd.toFixed(1) },
    { title: "Operating Pwf (psia)",         value: params.operatingPwf_psia.toFixed(1) },
    { title: "Skin Factor",                  value: params.skin.toFixed(2) },
    { title: "PI (STB/d·psi)",               value: params.pi_STBdPsi.toFixed(4) },
  ];

  return {
    type:    "AdaptiveCard",
    version: "1.4",
    body:    [
      {
        type:   "TextBlock",
        text:   `🛢 Well Performance — ${params.wellName}`,
        weight: "Bolder",
        size:   "Medium",
        color:  "Accent",
      },
      { type: "FactSet", facts },
      {
        type:     "TextBlock",
        text:     "*IPR analysis via Vogel correlation (P365)*",
        size:     "Small",
        color:    "Good",
        isSubtle: true,
      },
    ],
    actions: [
      {
        type:  "Action.OpenUrl",
        title: "Open P365 Calculator",
        url:   "https://petroleum365.app/calculator",
      },
    ],
  };
}

// ─── Gas Composition Adaptive Card ───────────────────────────────────────────

/** Build a Teams Adaptive Card for gas composition results. */
export function buildGasCompositionCard(params: {
  sampleId: string;
  molarMass_lbMol: number;
  hhv_BTUscf: number;
  lhv_BTUscf: number;
  wobbeIndex: number;
  specificGravity: number;
}): object {
  const facts = [
    { title: "Sample ID",                value: params.sampleId },
    { title: "Molar Mass (lb/lb-mol)",   value: params.molarMass_lbMol.toFixed(3) },
    { title: "Specific Gravity (air=1)", value: params.specificGravity.toFixed(4) },
    { title: "HHV (BTU/scf)",            value: params.hhv_BTUscf.toFixed(2) },
    { title: "LHV (BTU/scf)",            value: params.lhv_BTUscf.toFixed(2) },
    { title: "Wobbe Index",              value: params.wobbeIndex.toFixed(2) },
  ];

  return {
    type:    "AdaptiveCard",
    version: "1.4",
    body:    [
      {
        type:   "TextBlock",
        text:   `🛢 Gas Composition — ${params.sampleId}`,
        weight: "Bolder",
        size:   "Medium",
        color:  "Accent",
      },
      { type: "FactSet", facts },
      {
        type:     "TextBlock",
        text:     "*Gas analysis report (P365)*",
        size:     "Small",
        color:    "Good",
        isSubtle: true,
      },
    ],
    actions: [
      {
        type:  "Action.OpenUrl",
        title: "Open P365 Calculator",
        url:   "https://petroleum365.app/calculator",
      },
    ],
  };
}

// ─── Bot FAQ Responses ────────────────────────────────────────────────────────

/** Known FAQ topics with keyword patterns and answers. */
const FAQ_ENTRIES: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ["weymouth"],
    answer:
      "The **Weymouth equation** is used for high-pressure gas pipeline sizing. " +
      "It relates flow rate to pressure drop, pipe diameter, length, and gas specific gravity: " +
      "`Q = 3.23 × (Tb/Pb) × (P1²−P2²)^0.5 × d^(8/3) / (SG × T × L × Z)^0.5`. " +
      "It is conservative at high flow rates and is the basis for NFPA 54 / AGA gas piping design.",
  },
  {
    keywords: ["z-factor", "zfactor", "compressibility factor"],
    answer:
      "The **Z-factor** (gas deviation / compressibility factor) corrects ideal gas law for real gas behavior: " +
      "`PV = ZnRT`. At low pressures Z ≈ 1. At high pressures Z deviates significantly. " +
      "Common correlations include Dranchuk-Abou-Kassem (DAK), Hall-Yarborough, and Brill-Beggs. " +
      "Z-factor is required for gas FVF, density, and pipeline flow calculations.",
  },
  {
    keywords: ["vogel"],
    answer:
      "The **Vogel IPR correlation** describes inflow performance for solution-gas-drive reservoirs: " +
      "`q/qmax = 1 − 0.2(Pwf/Pr) − 0.8(Pwf/Pr)²`. " +
      "It relates producing rate to flowing bottomhole pressure and is widely used for well performance analysis and nodal analysis.",
  },
  {
    keywords: ["arps"],
    answer:
      "**Arps decline curve analysis** fits historical production to one of three models: " +
      "Exponential (b=0), Hyperbolic (0<b<1), or Harmonic (b=1). " +
      "The hyperbolic model: `q(t) = qi / (1 + b·Di·t)^(1/b)`. " +
      "EUR is the integral of q(t) to an economic abandonment rate. Arps is the standard DCA method in the industry.",
  },
  {
    keywords: ["skin"],
    answer:
      "**Skin factor (S)** quantifies near-wellbore damage or stimulation in well testing. " +
      "S > 0 indicates damage (reduced PI), S < 0 indicates stimulation (e.g., hydraulic fracture). " +
      "It appears in the steady-state IPR: `q = kh(Pr−Pwf) / (141.2Bμ(ln(re/rw)−0.75+S))`. " +
      "Skin is determined from pressure transient analysis (PTA).",
  },
  {
    keywords: ["ogip", "original gas"],
    answer:
      "**OGIP (Original Gas In Place)** is estimated volumetrically: " +
      "`OGIP = (A × h × φ × Sg) / Bgi` (reservoir barrels) or in scf with appropriate unit conversions. " +
      "Alternatively, material balance (p/Z vs. Gp plot) provides a dynamic OGIP estimate from production history.",
  },
  {
    keywords: ["hhv", "heating value"],
    answer:
      "**HHV (Higher Heating Value)** includes the latent heat of water vapor condensation in combustion products. " +
      "**LHV (Lower Heating Value)** excludes it, assuming water remains vapor. " +
      "For natural gas, HHV ≈ 1020–1050 BTU/scf; LHV is ~10% lower. " +
      "Utility billing typically uses HHV; combustion equipment efficiency is often rated on LHV.",
  },
];

/**
 * Simple FAQ bot for petroleum engineering questions.
 * Returns a formatted answer string if a known keyword is matched,
 * or null if no match is found.
 */
export function buildBotFaqResponse(question: string): string | null {
  const lower = question.toLowerCase();
  for (const entry of FAQ_ENTRIES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.answer;
    }
  }
  return null;
}

// ─── Generic Calculator Card ──────────────────────────────────────────────────

/**
 * Build a generic Teams Adaptive Card showing calculator inputs and results
 * side by side in two FactSets.
 */
export function buildCalculatorCard(
  calcName: string,
  inputs: Record<string, string>,
  results: Record<string, string>,
): object {
  const inputFacts  = Object.entries(inputs).map(([k, v]) => ({ title: k, value: v }));
  const resultFacts = Object.entries(results).map(([k, v]) => ({ title: k, value: v }));

  return {
    type:    "AdaptiveCard",
    version: "1.4",
    body:    [
      {
        type:   "TextBlock",
        text:   `🛢 ${calcName}`,
        weight: "Bolder",
        size:   "Medium",
        color:  "Accent",
      },
      {
        type:   "TextBlock",
        text:   "Inputs",
        weight: "Bolder",
        size:   "Small",
      },
      { type: "FactSet", facts: inputFacts },
      {
        type:   "TextBlock",
        text:   "Results",
        weight: "Bolder",
        size:   "Small",
      },
      { type: "FactSet", facts: resultFacts },
      {
        type:     "TextBlock",
        text:     "*Generated by Petroleum 365 (P365)*",
        size:     "Small",
        color:    "Good",
        isSubtle: true,
      },
    ],
    actions: [
      {
        type:  "Action.OpenUrl",
        title: "Open P365 Calculator",
        url:   "https://petroleum365.app/calculator",
      },
    ],
  };
}
