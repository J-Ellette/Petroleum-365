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
