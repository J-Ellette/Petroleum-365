# Petroleum 365 — Standalone Electron Application Feasibility Study

> **Summary:** Petroleum 365 (P365) is exceptionally well-positioned to become a standalone Electron desktop application. Its entire engineering function library is already pure TypeScript with zero runtime dependencies. The Microsoft Office add-in layer is a thin presentation concern that sits on top of those pure functions, and it can be replaced by an Electron shell without touching a single line of engineering math. This document lays out the full findings, architecture, tradeoffs, migration path, and export strategy.

---

## Table of Contents

1. [What the Codebase Looks Like Today](#1-what-the-codebase-looks-like-today)
2. [Why Electron Is the Right Target](#2-why-electron-is-the-right-target)
3. [What Stays the Same](#3-what-stays-the-same)
4. [What Gets Replaced](#4-what-gets-replaced)
5. [Proposed Electron Architecture](#5-proposed-electron-architecture)
6. [Interoperability: Exporting to Microsoft Formats](#6-interoperability-exporting-to-microsoft-formats)
7. [UI Strategy: From Task Pane to Full Window](#7-ui-strategy-from-task-pane-to-full-window)
8. [File System and Native OS Features Gained](#8-file-system-and-native-os-features-gained)
9. [Distribution and Packaging](#9-distribution-and-packaging)
10. [Engineering Workflow Advantages Over Excel](#10-engineering-workflow-advantages-over-excel)
11. [Risks and Tradeoffs](#11-risks-and-tradeoffs)
12. [Migration Roadmap](#12-migration-roadmap)
13. [Recommended Tech Stack for the Electron App](#13-recommended-tech-stack-for-the-electron-app)
14. [Verdict](#14-verdict)

---

## 1. What the Codebase Looks Like Today

P365 is structured in three distinct layers:

```
petroleum-365/
├── src/functions/          ← PURE ENGINEERING MATH (33 modules, 800+ functions)
│   ├── pvt/               ← PVT: gas Z, viscosity, FVF, oil properties
│   ├── dca/               ← Decline Curve Analysis: Arps, Duong, SEPD, LGM…
│   ├── ipr/               ← Inflow Performance: Vogel, Fetkovich, composite
│   ├── vfp/               ← Vertical Flow: Beggs-Brill, Gray, Hagedorn-Brown
│   ├── mbe/               ← Material Balance: p/Z, Havlena-Odeh, aquifer
│   ├── pta/               ← Pressure Transient: Ei, drawdown, Bourdet
│   ├── eos/               ← Equation of State: PR, SRK, Lee-Kesler, VLE
│   ├── frac/              ← Fracturing: PKN/KGD, Nolte-G, proppant, CfD
│   ├── esp/, gl/, rp/     ← Artificial Lift: ESP, Gas Lift, Rod Pump
│   ├── geo/               ← Geomechanics: Kirsch, Mohr-Coulomb, mud window
│   ├── wbi/               ← Wellbore Integrity: casing, cement, shoe test
│   ├── sim/               ← Simulation: Eclipse/CMG INCLUDE file generators
│   ├── rta/               ← Rate Transient Analysis: FMB, RNP, type curves
│   ├── eco/               ← Economics: NPV, IRR, WI/NRI, after-tax
│   ├── wpa/               ← Well Production Allocation: proration, VRR
│   ├── eclipse/           ← Eclipse binary results parser (SMSPEC/UNSMRY)
│   ├── spline/            ← Interpolation: cubic, PCHIP, bilinear
│   └── ...                ← CNG/LNG, AGA-8, SCAL, Nodal, Skin, WHT, Pipe…
│
├── src/addins/             ← OFFICE INTEGRATION LAYER (thin wrappers)
│   ├── blueprints/        ← Pre-built worksheet templates
│   ├── browser/           ← Function Browser catalog
│   ├── word/, outlook/    ← Word/Outlook document integrations
│   └── teams/, access/    ← Teams cards, Access database helpers
│
├── src/taskpane/           ← REACT-LIKE UI (HTML/CSS/JS, Office-specific)
│   └── taskpane.html
│
├── src/functions.json      ← UDF metadata for Office custom functions
├── manifest.xml            ← Office add-in manifest (deployment descriptor)
└── src/index.ts            ← Public API export (all 33 modules re-exported)
```

**Key facts that matter for this analysis:**

- `src/functions/` has **zero runtime dependencies** — no external npm packages are required to run the engineering calculations. All math is self-contained TypeScript.
- `src/index.ts` already exports the entire library under the `P365` namespace as clean, typed, pure functions.
- `src/addins/` and `manifest.xml` are the *only* Office-specific pieces. They represent a small fraction of total code.
- The task pane UI is already plain HTML/CSS/JS — not locked to any Office-specific rendering engine.
- 2,061 tests already validate every function independently of Office.

This separation means the engineering core can be used directly in Electron without modification.

---

## 2. Why Electron Is the Right Target

[Electron](https://www.electronjs.org/) wraps a Chromium browser and a Node.js runtime into a distributable desktop app. Given P365's existing stack, it is the most natural migration path:

| Requirement | P365 Today | Electron Provides |
|---|---|---|
| Run TypeScript functions natively | ✅ Node.js already used | ✅ Full Node.js in main process |
| Render HTML/CSS UI | ✅ taskpane.html already exists | ✅ Full Chromium renderer |
| No browser dependency for end users | ❌ Needs Office + browser | ✅ Self-contained bundle |
| Read/write local files (well data, CSV, XLSX) | ❌ Blocked by browser sandbox | ✅ Full `fs` module access |
| Native OS dialogs (open file, save file, print) | ❌ Not available in Office | ✅ `dialog` module built-in |
| Offline operation | ✅ Functions are pure | ✅ Everything runs locally |
| Cross-platform (Windows, macOS, Linux) | ❌ Office add-ins limited to Windows/Mac with Office | ✅ All three platforms |
| Custom keyboard shortcuts | ❌ Constrained by Office | ✅ Full `globalShortcut` API |
| Native menu bar | ❌ Not available | ✅ `Menu` + `MenuItem` API |
| System tray / notifications | ❌ Not available | ✅ `Tray` + `Notification` API |
| Auto-update | ❌ Depends on Office store | ✅ `electron-updater` |

The existing technology — TypeScript, webpack, HTML/CSS, Node.js — is identical to what an Electron project uses. No new language or paradigm is needed.

---

## 3. What Stays the Same

The following requires **zero changes** to migrate to Electron:

### Engineering Function Library — `src/functions/` (100% reusable)
Every one of the 800+ engineering functions is a pure TypeScript function:
```typescript
// Example — works in Excel UDF, in Node.js, and in Electron identically:
export function zByDAK(ppr: number, tpr: number): number { ... }
```
These functions take numbers in, return numbers out. They have no awareness of Excel, Office.js, or any UI environment. They compile to the same JavaScript in Electron as they do today.

### Public API — `src/index.ts`
The `P365` namespace export is already designed as a general-purpose library API. Electron's main process or renderer can import it with a simple:
```typescript
import { P365 } from "./index";
const z = P365.PVT.Z.ByDAK(200, 3000, 400, 665);
```

### Test Suite — `test/` (2,061 tests)
The entire Jest test suite runs against pure functions with no Office dependency. Every test passes today in a plain Node.js environment — exactly what Electron's main process is. The test suite becomes the quality gate for the standalone app with no modifications.

### Build Tooling — `webpack` + `typescript`
Electron projects use webpack and TypeScript in identical configurations. The existing `tsconfig.json`, `jest.config.json`, and `webpack.config.js` require only minor additions (a separate `main` process entry point) rather than replacement.

### Blueprints — `src/addins/blueprints/`
The blueprint metadata (pre-built worksheet templates) can be adapted directly into Electron as "document templates" or "calculation sheets" — the data structures remain identical.

---

## 4. What Gets Replaced

The following Office-specific pieces are replaced by Electron equivalents:

| Office Component | Replaced By |
|---|---|
| `manifest.xml` — Office add-in deployment descriptor | `package.json` `main` field + `electron-builder` config |
| `Office.js` custom functions runtime | Direct function calls in renderer process |
| `src/functions.json` UDF metadata | Function registry for the app's own UI (search, catalog) |
| `src/taskpane/taskpane.html` (460-line Office task pane) | Full-window Electron renderer (React, Vue, or plain HTML) |
| `src/addins/word/`, `outlook/`, `teams/` etc. | Export modules (see Section 6) |
| Ribbon UI (manifest ribbon customization) | Native Electron `Menu` + `MenuItem` |
| Office Store distribution | Direct installer (NSIS/DMG/AppImage) or Electron auto-update |

The total Office-specific code is concentrated in `src/addins/` and `manifest.xml`. The `src/functions/` directory — the entire engineering brain of P365 — is untouched.

---

## 5. Proposed Electron Architecture

```
petroleum-365-app/
│
├── electron/
│   ├── main.ts              ← Electron main process (window creation, menus, IPC)
│   ├── preload.ts           ← Context bridge (exposes safe APIs to renderer)
│   └── ipc-handlers.ts      ← IPC handlers: file I/O, export, calculations
│
├── src/                     ← (existing, unchanged)
│   ├── functions/           ← All 33 engineering modules — zero changes
│   ├── index.ts             ← P365 namespace — zero changes
│   └── addins/blueprints/   ← Blueprint metadata — minor adaptation
│
├── renderer/
│   ├── index.html           ← Main application shell
│   ├── app.ts               ← Renderer entry point (React/Vue or vanilla)
│   ├── components/
│   │   ├── Spreadsheet.tsx  ← Grid / spreadsheet view (see Section 7)
│   │   ├── FunctionBrowser.tsx ← Catalog of all 800+ functions with search
│   │   ├── Calculator.tsx   ← Interactive single-function calculator panel
│   │   ├── BlueprintGallery.tsx ← Template picker
│   │   └── ChartPanel.tsx   ← Built-in charting (DCA curves, IPR/VFP crossplot)
│   └── styles/
│       └── main.css
│
├── test/                    ← (existing, unchanged — all 2,061 tests run as-is)
│
├── package.json             ← Add electron, electron-builder deps
├── webpack.main.js          ← Webpack config for main process
├── webpack.renderer.js      ← Webpack config for renderer
└── electron-builder.yml     ← Packaging config (Windows NSIS, macOS DMG, Linux AppImage)
```

### Main Process (`electron/main.ts`)

The main process manages windows and native OS integration:
```typescript
import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import { P365 } from "../src/index";      // ← same import, works immediately

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    title: "Petroleum 365",
    webPreferences: { preload: "./preload.js", contextIsolation: true }
  });
  win.loadFile("renderer/index.html");
  buildMenu(win);
});
```

### Preload / Context Bridge (`electron/preload.ts`)

A context bridge exposes a safe, typed API surface to the renderer — no `remote` module, no `nodeIntegration`:
```typescript
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("P365Bridge", {
  calculate: (fn: string, args: number[]) => ipcRenderer.invoke("calculate", fn, args),
  saveFile:  (path: string, data: Buffer) => ipcRenderer.invoke("saveFile", path, data),
  openFile:  ()                           => ipcRenderer.invoke("openFile"),
  exportXLSX:(sheets: SheetData[])        => ipcRenderer.invoke("exportXLSX", sheets),
});
```

This architecture keeps the main process in full control of file I/O and function execution while the renderer stays as a pure UI layer — the same separation of concerns the Office add-in model enforces, but without the Office dependency.

---

## 6. Interoperability: Exporting to Microsoft Formats

The standalone app can still produce files usable by Excel, Word, and other Microsoft tools. This is handled via export modules that run in the Electron main process and write files to disk.

### Excel / XLSX Export

Use [ExcelJS](https://github.com/exceljs/exceljs) (npm) or [SheetJS/xlsx](https://sheetjs.com/) (npm) to write `.xlsx` workbooks:

```typescript
import ExcelJS from "exceljs";

async function exportDCAWorkbook(declineData: DCAResult[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("DCA Results");
  ws.columns = [
    { header: "Time (months)", key: "t", width: 16 },
    { header: "Rate (Mscf/d)", key: "q", width: 16 },
    { header: "EUR (Bscf)",    key: "eur", width: 14 },
  ];
  declineData.forEach(row => ws.addRow(row));
  await wb.xlsx.writeFile("dca_export.xlsx");
}
```

This produces a `.xlsx` file that opens natively in Microsoft Excel. The exported file can include:
- Formatted tables with unit headers
- Pre-populated formulas referencing P365 UDF results (if user still has the add-in)
- Charts (ExcelJS supports chart embedding)
- Named ranges and data validation
- Multiple worksheets (one per blueprint section)

### CSV Export

Simple and universally compatible. Any calculation result can be streamed to a CSV via Node.js `fs`:
```typescript
import { writeFileSync } from "fs";
const csv = results.map(r => `${r.t},${r.q},${r.eur}`).join("\n");
writeFileSync("output.csv", `Time,Rate,EUR\n${csv}`);
```

### Eclipse / CMG INCLUDE Files

P365 already has `src/functions/sim/` which generates Eclipse SWOF/SGOF/PVTO/PVDG/PVTW and CMG table INCLUDE files. In the Electron app, these are written directly to the user's project directory via native file dialogs — a significant improvement over copying cell values out of Excel.

### PDF / Print Export

Electron's renderer has built-in PDF printing via `webContents.printToPDF()`. Any calculation report rendered in the app can be exported to PDF without a third-party library:
```typescript
const pdfBuffer = await win.webContents.printToPDF({ landscape: false });
writeFileSync("p365_report.pdf", pdfBuffer);
```

### Word / DOCX Export

Use [docx](https://docx.js.org/) (npm) to generate `.docx` files from calculation results:
```typescript
import { Document, Paragraph, Table } from "docx";
const doc = new Document({ sections: [{ children: [new Paragraph("P365 Well Analysis")] }] });
```

This covers the main use case of the existing Word add-in (embedding calculation results in engineering reports) without requiring Word to be installed.

### Summary of Export Formats

| Format | Library | Use Case |
|---|---|---|
| `.xlsx` | ExcelJS or SheetJS | Send results to Excel users, hand off to client |
| `.csv` | Node.js `fs` | Universal data exchange, import to any software |
| `.pdf` | Electron built-in `printToPDF` | Engineering reports, well summaries |
| `.docx` | docx.js | Word-compatible engineering reports |
| Eclipse `.inc` | existing `src/functions/sim/` | Reservoir simulation input decks |
| CMG `.inc` | existing `src/functions/sim/` | CMG STARS/GEM simulation decks |
| `.json` | Node.js `JSON.stringify` | Save/load project state, API integration |

---

## 7. UI Strategy: From Task Pane to Full Window

The current task pane is 460 lines of HTML/CSS/JS crammed into a sidebar-sized panel (about 350 px wide). Moving to a full Electron window unlocks a fundamentally different — and much better — user experience for engineers.

### Recommended Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Petroleum 365   File  Edit  View  Tools  Export  Help        v2.0.0   │  ← Native menu bar
├──────────┬──────────────────────────────────┬──────────────────────────┤
│          │                                  │                          │
│ SIDEBAR  │       SPREADSHEET / GRID         │     CHART PANEL          │
│          │                                  │                          │
│ Function │  Well: Permian Basin #12A        │  [DCA Rate vs Time]      │
│ Browser  │  ┌──────────┬────────┬────────┐  │                          │
│          │  │ Parameter│ Value  │ Units  │  │  qi = 8.2 MMscf/d        │
│ Search:  │  ├──────────┼────────┼────────┤  │  Di = 0.72 /yr           │
│ [      ] │  │ qi       │ 8200   │ Mscf/d │  │  b  = 1.22               │
│          │  │ Di       │ 0.72   │ 1/yr   │  │  EUR = 12.4 Bscf         │
│ ▶ DCA    │  │ b        │ 1.22   │ —      │  │                          │
│ ▶ PVT    │  │ t_econ   │ 200    │ months │  │  [Line chart rendered    │
│ ▶ IPR    │  ├──────────┼────────┼────────┤  │   in HTML canvas or D3]  │
│ ▶ VFP    │  │ EUR      │ 12.4   │ Bscf   │  │                          │
│ ▶ MBE    │  │ t_aban   │ 342    │ months │  │                          │
│ ▶ PTA    │  │ q_aban   │  50    │ Mscf/d │  │                          │
│ ▶ EoS    │  └──────────┴────────┴────────┘  │                          │
│ ▶ FRAC   │                                  │                          │
│ ▶ GEO    │  [+ Add Parameter] [Run] [Export]│  [Export Chart as PNG]   │
│ ▶ WBI    │                                  │                          │
│ ▶ SIM    │                                  │                          │
│ ▶ RTA    │                                  │                          │
│ ▶ ECO    │                                  │                          │
└──────────┴──────────────────────────────────┴──────────────────────────┘
│  Status bar: Ready | Last calc: P365.DCA.HyperbolicRate | 0.3 ms       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Spreadsheet Engine

For the grid/spreadsheet component, several options exist in the browser:
- **[HyperFormula](https://hyperformula.handsontable.com/)** — Open-source spreadsheet engine that can host custom functions. P365 functions can be registered as HyperFormula plugins, giving users a familiar formula-bar experience without Excel.
- **[Handsontable](https://handsontable.com/)** — React/Vue spreadsheet component (free for non-commercial).
- **Custom grid** — A simple HTML table with contenteditable cells and an input row is sufficient for most single-blueprint workflows.

The blueprint system already defines the structure of each calculation sheet. Translating a blueprint into rows of a spreadsheet component is straightforward.

---

## 8. File System and Native OS Features Gained

One of the most significant practical gains from moving to Electron is unrestricted access to the user's file system. This is blocked in the Excel add-in sandbox. In Electron:

### Project Files
Users can save a "P365 Project" (a `.p365` JSON file) that stores all their well data, parameters, and calculation results:
```json
{
  "version": "2.0",
  "projectName": "Permian Basin Field Study",
  "wells": [
    { "id": "12A", "module": "DCA", "params": { "qi": 8200, "Di": 0.72, "b": 1.22 } }
  ],
  "createdAt": "2026-03-24T00:00:00Z"
}
```

### Import from Third-Party Formats
- **Import CSV/TSV** production data directly (no Excel intermediary)
- **Parse Eclipse SMSPEC/UNSMRY** binary files (already in `src/functions/eclipse/`)
- **Load LAS well log files** with a Node.js LAS parser
- **Watch a folder** for new production data files and auto-calculate (inotify/FSEvents via `chokidar`)

### Auto-Save and Recovery
Node.js `fs` enables auto-save every N seconds, crash recovery, and versioned project history — none of which are available in the Excel sandbox.

---

## 9. Distribution and Packaging

### Packaging Tool: `electron-builder`

`electron-builder` (npm) handles platform-specific packaging:

```yaml
# electron-builder.yml
appId: com.petroleum365.app
productName: Petroleum 365
directories:
  output: dist-app
win:
  target: nsis          # Windows installer (.exe)
  icon: assets/icon.ico
mac:
  target: dmg           # macOS disk image (.dmg)
  icon: assets/icon.icns
linux:
  target: AppImage      # Universal Linux binary
  icon: assets/icon.png
publish:
  provider: github      # Auto-update via GitHub Releases
```

A single `npm run dist` command produces:
- `Petroleum-365-Setup-2.0.0.exe` — Windows NSIS installer
- `Petroleum-365-2.0.0.dmg` — macOS installer
- `Petroleum-365-2.0.0.AppImage` — Linux portable binary

### Auto-Update

`electron-updater` integrates with GitHub Releases to deliver silent background updates:
```typescript
import { autoUpdater } from "electron-updater";
autoUpdater.checkForUpdatesAndNotify();
```

This replaces the Office Store update mechanism entirely.

### Installation Size

A typical Electron app bundles Chromium + Node.js and weighs 150–200 MB. For petroleum engineers accustomed to commercial software (Prosper, MBAL, Harmony), this is entirely normal and acceptable.

---

## 10. Engineering Workflow Advantages Over Excel

Moving to a dedicated application unlocks workflows that are awkward or impossible in Excel:

| Capability | Excel Add-in | Electron App |
|---|---|---|
| **Offline access** | ✅ (functions work offline) | ✅ (fully offline, no Office required) |
| **Multiple wells in one project** | Manual, multi-tab workbook | Native project model, well list |
| **Cross-well analysis** (pattern flood, VRR) | Complex array formulas | First-class UI, automatic |
| **Read Eclipse binary files** | ✅ (parser exists) | ✅ + drag-and-drop import |
| **Generate simulation INCLUDE files** | ✅ (copy from cell) | ✅ + Save directly to disk |
| **Plot DCA / IPR / VFP curves** | Requires Excel charts (manual) | Built-in charting, automatic |
| **Blueprint templates** | ✅ (inject into sheet) | ✅ + save/load as named templates |
| **Unit conversion on every input** | ✅ (UnitConverter function) | ✅ + inline unit picker in UI |
| **Report generation** | Manual formatting | One-click PDF/DOCX export |
| **No Excel license required** | ❌ Requires Microsoft 365 | ✅ Free to install |
| **Works on Linux** | ❌ | ✅ |
| **Custom keyboard shortcuts** | Limited | Full control |
| **Dark mode** | Depends on Office theme | Native CSS `prefers-color-scheme` |

The most impactful advantage for engineering teams at smaller operators or consultancies is **eliminating the Microsoft 365 dependency**. P365 functions are completely self-contained; there is no technical reason they should require a subscription to run.

---

## 11. Risks and Tradeoffs

No migration is without tradeoffs. These are the honest downsides:

### Electron App Size
Electron bundles Chromium (~130 MB). The resulting installer is larger than a lightweight native app. This is universally accepted for productivity software and is not a real obstacle for petroleum engineering tools.

### Loss of Live Excel Integration
Engineers who need to use P365 results in formulas in existing Excel models would need to export to `.xlsx` and import, rather than having live UDF cells. For purely exploratory and reporting workflows this is a non-issue. A parallel deployment strategy (keep the add-in for Excel users, offer the standalone for others) is the recommended approach during transition.

### Development Complexity
Electron adds a main-process / renderer-process split that requires careful IPC design. However, P365's existing separation (pure functions vs. UI) maps naturally onto main (business logic) vs. renderer (display) — the architecture is already aligned.

### Security Considerations
Electron's Chromium renderer must be properly sandboxed (contextIsolation: true, nodeIntegration: false) to prevent XSS attacks from escalating to Node.js access. The preload/context bridge pattern described in Section 5 addresses this correctly and is standard practice.

### Maintenance Overhead
Maintaining two deployment targets (Office add-in and Electron app) doubles the surface area. The recommended long-term strategy is:
1. **Phase 1** — Release the Electron app, keep the Office add-in alive (the function library is already shared).
2. **Phase 2** — Evaluate adoption. If the standalone is well-received, reduce Office add-in scope to XLSX export only.
3. **Phase 3** — The standalone is primary; the add-in is an optional XLSX export plugin.

---

## 12. Migration Roadmap

The migration can be done incrementally without disrupting the existing add-in.

### Phase 1: Scaffold (1–2 weeks)
- Add `electron`, `electron-builder`, `electron-is-dev` to devDependencies
- Create `electron/main.ts` (window, menu skeleton)
- Create `electron/preload.ts` (context bridge skeleton)
- Wire existing webpack to produce a renderer bundle
- Verify that `P365.*` functions load and produce correct results in the renderer (run existing test suite)
- Ship: basic single-window Electron app that can call any P365 function and display a result

### Phase 2: Function Browser and Calculator Panel (2–3 weeks)
- Port the function browser catalog (`src/addins/browser/`) to a sidebar component
- Build an interactive input form that renders a parameter form for any function from `src/functions.json`
- Display results inline with unit labels
- Add the unit converter as a per-field dropdown

### Phase 3: Blueprint Templates (2–3 weeks)
- Port `src/addins/blueprints/` to the Electron app as a gallery of named calculation sheets
- Each blueprint renders as a grid of parameter rows
- Add save/load project (`.p365` JSON)

### Phase 4: Charting (2 weeks)
- Integrate a charting library (Chart.js or Plotly.js — both run in Chromium)
- DCA: rate vs. time, EUR waterfall
- IPR/VFP: crossplot with operating point
- PTA: log-log Bourdet derivative
- EoS: phase envelope

### Phase 5: Export (1–2 weeks)
- Add ExcelJS XLSX export for all blueprints
- Add PDF export via `printToPDF`
- Add CSV export for all tabular results
- Add Eclipse/CMG INCLUDE file save-to-disk

### Phase 6: Polish and Distribution (1 week)
- electron-builder packaging for Windows/macOS/Linux
- auto-updater via GitHub Releases
- App icon, splash screen, About dialog
- Code signing (Windows Authenticode, macOS notarization)

**Total estimated effort: 10–13 weeks** for a fully featured v1.0 standalone app. The engineering function library requires zero rework — all effort goes into the new UI and native integration layer.

---

## 13. Recommended Tech Stack for the Electron App

| Role | Recommendation | Reason |
|---|---|---|
| Desktop shell | **Electron 30+** | Mature, TypeScript-native, used by VS Code, Slack, Figma |
| Main process language | **TypeScript** | Already in use, same compiler |
| Renderer framework | **React 18** with TypeScript | Industry standard, large ecosystem, works in Chromium |
| Build tool | **webpack 5** (existing) or **Vite** | Already configured; Vite is faster for dev |
| Spreadsheet grid | **HyperFormula** + custom renderer | Can host P365 as custom functions natively |
| Charting | **Plotly.js** | Scientific charting, excellent for log-log/semilog; or **Chart.js** for simpler needs |
| XLSX export | **ExcelJS** | Mature, full feature set, MIT license |
| PDF export | Electron built-in `printToPDF` | Zero dependencies |
| DOCX export | **docx.js** | Pure JS, no Word required |
| Packaging | **electron-builder** | One config, three platforms |
| Auto-update | **electron-updater** | Integrates with GitHub Releases |
| State management | **Zustand** or plain React `useReducer` | Lightweight, no boilerplate |
| Testing | **Jest** (existing) + **Playwright** for E2E | Playwright has first-class Electron support |

---

## 14. Verdict

**Yes — Petroleum 365 should become a standalone Electron application, and the migration is unusually low-risk for a project of this complexity.**

The core reasoning:

1. **The hardest part is already done.** The 800+ engineering functions are pure TypeScript with zero dependencies. They work in Node.js (which is what Electron's main process is) without modification. The test suite validates them independently of any UI. There is no "rip and replace" of engineering logic — only the presentation layer changes.

2. **The Office layer is already thin.** The add-in surface (`src/addins/`, `manifest.xml`, `src/functions.json`) is a small fraction of the codebase. Removing it does not affect the library.

3. **The target users benefit significantly.** Petroleum engineers do not need a Microsoft 365 subscription to run Z-factor calculations. A native desktop app removes the Excel dependency, enables richer charting, project file management, and simulation deck I/O — all things that are awkward or blocked in the current Office sandbox.

4. **The two can coexist.** The Excel add-in can remain available alongside the Electron app, sharing the same underlying `src/functions/` library. Users who prefer Excel keep their workflow; users who want a dedicated tool get one.

5. **Exporting to Microsoft formats is solved.** ExcelJS, docx.js, and Electron's built-in PDF printer cover every format that downstream users (clients, Excel-heavy teams) would need. The standalone app produces richer, more polished outputs than injecting values into Excel cells.

The recommended first step is to add Electron as a dev dependency, wire it to the existing webpack bundle, and confirm that `P365.PVT.Z.ByDAK(200, 3000, 400, 665)` returns the correct result from inside an Electron renderer window. That proof-of-concept can be done in a single afternoon — and it will show immediately that the migration is viable.

---

*Document prepared: 2026-03-24*
*Author: Copilot Agent (Petroleum 365 repository)*
