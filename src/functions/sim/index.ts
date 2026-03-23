/**
 * P365 — Reservoir Simulation INCLUDE File Generator (SIM)
 *
 * Generates Eclipse 100/300 and CMG STARS/GEM INCLUDE file content from
 * computed relative permeability, capillary pressure, and PVT tables.
 *
 * Supported keywords:
 *   Eclipse: SWOF, SGOF, PVTO, PVTG, PVDG, PVTW
 *   CMG:     WOTABLE (SWOF equivalent), GOTABLE (SGOF equivalent)
 *
 * Units:
 *   Pressure   — psia (Eclipse field units)
 *   FVF        — bbl/STB (oil), Mcf/Mscf (gas)
 *   Viscosity  — cp
 *   Saturation — fraction (0–1)
 *   Kr         — fraction (0–1)
 *   Pc         — psi
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Single row in SWOF (water-oil) saturation table. */
export interface SwofRow {
  Sw: number;     // water saturation (fraction)
  krw: number;    // water relative permeability
  krow: number;   // oil-water relative permeability
  Pcow: number;   // oil-water capillary pressure (psi)
}

/** Single row in SGOF (gas-oil) saturation table. */
export interface SgofRow {
  Sg: number;     // gas saturation (fraction)
  krg: number;    // gas relative permeability
  krog: number;   // oil-gas relative permeability
  Pcgo: number;   // gas-oil capillary pressure (psi)
}

/** Single row in PVTO (live oil PVT) table. */
export interface PvtoRow {
  Rs: number;     // solution GOR (scf/STB)
  P_bub: number;  // bubble point pressure (psia)
  Bo: number;     // oil FVF at bubble point (bbl/STB)
  Uo: number;     // oil viscosity at bubble point (cp)
  // Optional: undersaturated branch at same Rs
  P_unsat?: number[];
  Bo_unsat?: number[];
  Uo_unsat?: number[];
}

/** Single row in PVTG (wet gas PVT) table. */
export interface PvtgRow {
  P: number;      // pressure (psia)
  Rv: number;     // condensate-gas ratio (STB/Mscf)
  Bg: number;     // gas FVF (bbl/Mscf)
  Ug: number;     // gas viscosity (cp)
}

/** Dry gas (PVDG) table row. */
export interface PvdgRow {
  P: number;      // pressure (psia)
  Bg: number;     // gas FVF (bbl/Mscf)
  Ug: number;     // gas viscosity (cp)
}

// ─── Eclipse SWOF Keyword ─────────────────────────────────────────────────────

/**
 * Generate Eclipse SWOF keyword INCLUDE file content.
 *
 * SWOF (water-oil saturation function) table for a water-wet or mixed-wet system.
 * Columns: Sw | krw | krow | Pcow
 *
 * The table must start at Swi (connate) and end at Sw = 1 (100% water).
 * krw(Swi) = 0, krow(1 - Sorw) = 0 or krow(Sw=1) = 0.
 *
 * @param rows          Array of SWOF table rows (must be ordered by increasing Sw)
 * @param satRegion     Saturation region number (default 1)
 * @param comment       Optional comment header for the block
 * @returns             Eclipse-compatible SWOF keyword text
 */
export function simSWOF(
  rows: SwofRow[],
  satRegion = 1,
  comment = ""
): string {
  if (rows.length < 2) throw new Error("SWOF table requires at least 2 rows");
  const lines: string[] = [];
  lines.push("-- ============================================================");
  if (comment) lines.push(`-- ${comment}`);
  lines.push(`-- Saturation Region: ${satRegion}`);
  lines.push("-- Sw          krw         krow        Pcow(psi)");
  lines.push("-- ============================================================");
  lines.push("SWOF");
  for (const r of rows) {
    lines.push(
      `  ${r.Sw.toFixed(6).padStart(10)}  ${r.krw.toFixed(6).padStart(10)}  ${r.krow.toFixed(6).padStart(10)}  ${r.Pcow.toFixed(4).padStart(12)}`
    );
  }
  lines.push("/");
  return lines.join("\n");
}

/**
 * Generate Eclipse SGOF keyword INCLUDE file content.
 *
 * SGOF (gas-oil saturation function) table.
 * Columns: Sg | krg | krog | Pcgo
 *
 * @param rows          Array of SGOF table rows (ordered by increasing Sg)
 * @param satRegion     Saturation region number (default 1)
 * @param comment       Optional comment header
 * @returns             Eclipse-compatible SGOF keyword text
 */
export function simSGOF(
  rows: SgofRow[],
  satRegion = 1,
  comment = ""
): string {
  if (rows.length < 2) throw new Error("SGOF table requires at least 2 rows");
  const lines: string[] = [];
  lines.push("-- ============================================================");
  if (comment) lines.push(`-- ${comment}`);
  lines.push(`-- Saturation Region: ${satRegion}`);
  lines.push("-- Sg          krg         krog        Pcgo(psi)");
  lines.push("-- ============================================================");
  lines.push("SGOF");
  for (const r of rows) {
    lines.push(
      `  ${r.Sg.toFixed(6).padStart(10)}  ${r.krg.toFixed(6).padStart(10)}  ${r.krog.toFixed(6).padStart(10)}  ${r.Pcgo.toFixed(4).padStart(12)}`
    );
  }
  lines.push("/");
  return lines.join("\n");
}

// ─── CMG WOTABLE / GOTABLE Keywords ──────────────────────────────────────────

/**
 * Generate CMG STARS/GEM WOTABLE keyword (water-oil Kr table).
 *
 * Equivalent to Eclipse SWOF but in CMG syntax.
 * Columns: Sw | krw | krow | Pcow
 *
 * @param rows          Array of SWOF rows
 * @param tableNumber   Table number (default 1)
 * @param comment       Optional comment
 * @returns             CMG-compatible WOTABLE keyword text
 */
export function simWOTABLE(
  rows: SwofRow[],
  tableNumber = 1,
  comment = ""
): string {
  if (rows.length < 2) throw new Error("WOTABLE requires at least 2 rows");
  const lines: string[] = [];
  lines.push(`** ===========================================================`);
  if (comment) lines.push(`** ${comment}`);
  lines.push(`** Water-Oil Table ${tableNumber}`);
  lines.push(`** Sw        krw        krow       Pcow(psi)`);
  lines.push(`** ===========================================================`);
  lines.push(`WOTABLE  ${tableNumber}  SWT`);
  lines.push(`**   Sw         krw        krow       Pcow`);
  for (const r of rows) {
    lines.push(
      `   ${r.Sw.toFixed(6).padStart(10)}  ${r.krw.toFixed(6).padStart(10)}  ${r.krow.toFixed(6).padStart(10)}  ${r.Pcow.toFixed(4).padStart(12)}`
    );
  }
  return lines.join("\n");
}

/**
 * Generate CMG STARS/GEM GOTABLE keyword (gas-oil Kr table).
 *
 * @param rows          Array of SGOF rows
 * @param tableNumber   Table number (default 1)
 * @param comment       Optional comment
 * @returns             CMG-compatible GOTABLE keyword text
 */
export function simGOTABLE(
  rows: SgofRow[],
  tableNumber = 1,
  comment = ""
): string {
  if (rows.length < 2) throw new Error("GOTABLE requires at least 2 rows");
  const lines: string[] = [];
  lines.push(`** ===========================================================`);
  if (comment) lines.push(`** ${comment}`);
  lines.push(`** Gas-Oil Table ${tableNumber}`);
  lines.push(`** Sg        krg        krog       Pcgo(psi)`);
  lines.push(`** ===========================================================`);
  lines.push(`GOTABLE  ${tableNumber}  SGT`);
  lines.push(`**   Sg         krg        krog       Pcgo`);
  for (const r of rows) {
    lines.push(
      `   ${r.Sg.toFixed(6).padStart(10)}  ${r.krg.toFixed(6).padStart(10)}  ${r.krog.toFixed(6).padStart(10)}  ${r.Pcgo.toFixed(4).padStart(12)}`
    );
  }
  return lines.join("\n");
}

// ─── Eclipse PVTO (Live Oil PVT) ──────────────────────────────────────────────

/**
 * Generate Eclipse PVTO keyword INCLUDE file content.
 *
 * PVTO table for live (dissolved-gas) oil.
 * For each Rs, the first row is at the bubble-point pressure.
 * Subsequent rows in the same Rs block are undersaturated.
 *
 * @param rows          Array of PVTO rows with optional undersaturated branches
 * @param pvtRegion     PVT region number (default 1)
 * @returns             Eclipse-compatible PVTO keyword text
 */
export function simPVTO(rows: PvtoRow[], pvtRegion = 1): string {
  if (rows.length < 2) throw new Error("PVTO table requires at least 2 rows");
  const lines: string[] = [];
  lines.push(`-- PVTO - Live Oil PVT Table (Region ${pvtRegion})`);
  lines.push("-- Rs(scf/STB)  P(psia)    Bo(bbl/STB)  Uo(cp)");
  lines.push("PVTO");
  for (const r of rows) {
    // Bubble point row
    lines.push(
      `  ${r.Rs.toFixed(2).padStart(10)}  ${r.P_bub.toFixed(1).padStart(10)}  ${r.Bo.toFixed(6).padStart(12)}  ${r.Uo.toFixed(4).padStart(10)}`
    );
    // Undersaturated branch (optional)
    if (r.P_unsat && r.Bo_unsat && r.Uo_unsat) {
      for (let i = 0; i < r.P_unsat.length; i++) {
        lines.push(
          `              ${r.P_unsat[i].toFixed(1).padStart(10)}  ${r.Bo_unsat[i].toFixed(6).padStart(12)}  ${r.Uo_unsat[i].toFixed(4).padStart(10)}`
        );
      }
    }
    lines.push("  /");  // end of Rs block
  }
  lines.push("/");
  return lines.join("\n");
}

// ─── Eclipse PVDG (Dry Gas PVT) ───────────────────────────────────────────────

/**
 * Generate Eclipse PVDG keyword INCLUDE file content.
 *
 * PVDG table for dry gas (no condensate).
 * Columns: P | Bg | Ug
 *
 * @param rows          Array of PVDG table rows (ordered by increasing pressure)
 * @param pvtRegion     PVT region number (default 1)
 * @returns             Eclipse-compatible PVDG keyword text
 */
export function simPVDG(rows: PvdgRow[], pvtRegion = 1): string {
  if (rows.length < 2) throw new Error("PVDG table requires at least 2 rows");
  const lines: string[] = [];
  lines.push(`-- PVDG - Dry Gas PVT Table (Region ${pvtRegion})`);
  lines.push("-- P(psia)     Bg(bbl/Mscf)  Ug(cp)");
  lines.push("PVDG");
  for (const r of rows) {
    lines.push(
      `  ${r.P.toFixed(1).padStart(10)}  ${r.Bg.toFixed(6).padStart(13)}  ${r.Ug.toFixed(6).padStart(10)}`
    );
  }
  lines.push("/");
  return lines.join("\n");
}

// ─── Eclipse PVTW (Water PVT) ─────────────────────────────────────────────────

/**
 * Generate Eclipse PVTW keyword INCLUDE file content.
 *
 * PVTW: single-line water PVT at reference pressure.
 * Format: P_ref | Bw_ref | Cw | Uw | dUw/dP (viscosibility)
 *
 * @param P_ref_psia    Reference pressure (psia)
 * @param Bw_ref        Water FVF at reference pressure (bbl/STB)
 * @param Cw_psi        Water compressibility (psi⁻¹)
 * @param Uw_cp         Water viscosity (cp)
 * @param dUwdP         Viscosibility (cp/psi), usually 0
 * @param pvtRegion     PVT region number
 * @returns             Eclipse-compatible PVTW keyword text
 */
export function simPVTW(
  P_ref_psia: number,
  Bw_ref: number,
  Cw_psi: number,
  Uw_cp: number,
  dUwdP = 0,
  pvtRegion = 1
): string {
  return [
    `-- PVTW - Water PVT (Region ${pvtRegion})`,
    "-- P_ref(psia)  Bw(bbl/STB)  Cw(1/psi)    Uw(cp)     dUw/dP",
    "PVTW",
    `  ${P_ref_psia.toFixed(1).padStart(12)}  ${Bw_ref.toFixed(5).padStart(12)}  ${Cw_psi.toExponential(4).padStart(12)}  ${Uw_cp.toFixed(4).padStart(8)}  ${dUwdP.toFixed(6).padStart(10)}`,
    "/",
  ].join("\n");
}

// ─── Kr Endpoint Summary Table ────────────────────────────────────────────────

/** SCAL endpoint set for one rock type. */
export interface KrEndpoints {
  rockType: string;
  Swi: number;      // connate water saturation
  Sorw: number;     // residual oil to water
  Sgc: number;      // critical gas saturation
  Sorg: number;     // residual oil to gas
  krw_Sorw: number; // krw at residual oil
  krow_Swi: number; // krow at connate water
  krg_Sorg: number; // krg at residual oil to gas
  krog_Sgc: number; // krog at critical gas saturation
}

/**
 * Generate a formatted SCAL endpoint summary table for simulator input.
 *
 * Output is a tab/space-aligned ASCII table suitable for inclusion
 * in Eclipse DATA files as comments or in a spreadsheet.
 *
 * @param endpoints   Array of KrEndpoints for each rock type / region
 * @returns           Formatted endpoint summary string
 */
export function simKrEndpointTable(endpoints: KrEndpoints[]): string {
  const header = [
    "-- SCAL Endpoint Summary",
    "--",
    `-- ${"Rock Type".padEnd(20)}  ${"Swi".padStart(8)}  ${"Sorw".padStart(8)}  ${"Sgc".padStart(8)}  ${"Sorg".padStart(8)}  ${"krw@Sorw".padStart(10)}  ${"krow@Swi".padStart(10)}  ${"krg@Sorg".padStart(10)}  ${"krog@Sgc".padStart(10)}`,
    "--",
  ];
  const rows = endpoints.map(e => {
    return `-- ${e.rockType.padEnd(20)}  ${e.Swi.toFixed(4).padStart(8)}  ${e.Sorw.toFixed(4).padStart(8)}  ${e.Sgc.toFixed(4).padStart(8)}  ${e.Sorg.toFixed(4).padStart(8)}  ${e.krw_Sorw.toFixed(4).padStart(10)}  ${e.krow_Swi.toFixed(4).padStart(10)}  ${e.krg_Sorg.toFixed(4).padStart(10)}  ${e.krog_Sgc.toFixed(4).padStart(10)}`;
  });
  return [...header, ...rows].join("\n");
}

// ─── File Generator — Token Substitution ──────────────────────────────────────

/**
 * Generate a simulation input file from a template with token substitution.
 *
 * Tokens in the template are of the form @TOKEN_NAME (case-insensitive).
 * The tokens map provides { "TOKEN_NAME": "replacement_value" } pairs.
 *
 * This implements the File Generator workflow described in P365.md:
 * 1. User writes a template file with @PERM, @POROSITY, etc.
 * 2. User defines cases as rows in Excel (tokens as columns)
 * 3. Each row generates a separate output file
 *
 * @param template      Template string with @TOKEN placeholders
 * @param tokens        Token-value map (keys without the @ prefix, case-insensitive)
 * @returns             Rendered string with all tokens replaced
 * @throws              Error if any token in the template has no mapping
 */
export function simGenerateFromTemplate(
  template: string,
  tokens: Record<string, string | number>
): string {
  let result = template;
  const missing: string[] = [];
  // Find all @TOKEN occurrences
  const found = new Set(
    (template.match(/@([A-Za-z][A-Za-z0-9_]*)/g) ?? []).map(t => t.slice(1).toUpperCase())
  );
  // Check all are provided
  const provided = new Set(Object.keys(tokens).map(k => k.toUpperCase()));
  for (const t of found) {
    if (!provided.has(t)) missing.push(t);
  }
  if (missing.length > 0) {
    throw new Error(`Missing token values for: ${missing.join(", ")}`);
  }
  // Replace tokens (case-insensitive)
  for (const [key, value] of Object.entries(tokens)) {
    const regex = new RegExp(`@${key}`, "gi");
    result = result.replace(regex, String(value));
  }
  return result;
}

/**
 * Validate a simulation token map against a template.
 * Returns an array of missing token names (empty if all present).
 *
 * @param template   Template string
 * @param tokens     Provided token map
 * @returns          Array of missing token names (empty = all OK)
 */
export function simValidateTokens(
  template: string,
  tokens: Record<string, string | number>
): string[] {
  const found = (template.match(/@([A-Za-z][A-Za-z0-9_]*)/g) ?? [])
    .map(t => t.slice(1).toUpperCase());
  const provided = new Set(Object.keys(tokens).map(k => k.toUpperCase()));
  return [...new Set(found)].filter(t => !provided.has(t));
}

/**
 * Generate multiple output files from one template and a case table.
 *
 * Each row in the case table becomes a separate output file.
 * The caseColumn contains the case file names (for reference only — no file I/O).
 *
 * @param template    Template string
 * @param cases       Array of { caseName, tokens } objects
 * @returns           Array of { caseName, content } objects
 */
export function simBatchGenerate(
  template: string,
  cases: Array<{ caseName: string; tokens: Record<string, string | number> }>
): Array<{ caseName: string; content: string }> {
  return cases.map(c => ({
    caseName: c.caseName,
    content: simGenerateFromTemplate(template, c.tokens),
  }));
}

// ─── SCAL Table Generator (Corey) for Sim Input ───────────────────────────────

/**
 * Build a complete SWOF table using Corey kr correlations.
 *
 * Generates N evenly-spaced saturation points from Swi to 1.0,
 * computing krw and krow using Corey power-law expressions.
 * Pcow is set to zero (can be overridden by user).
 *
 * krw  = krw_max × [(Sw − Swi) / (1 − Swi − Sorw)]^nw
 * krow = krow_max × [(1 − Sw − Sorw) / (1 − Swi − Sorw)]^no
 *
 * @param Swi         Connate water saturation (fraction)
 * @param Sorw        Residual oil saturation to water (fraction)
 * @param krw_max     Max water Kr at Sorw (fraction)
 * @param krow_max    Max oil Kr at Swi (fraction)
 * @param nw          Corey exponent for water
 * @param no          Corey exponent for oil (to water)
 * @param nPoints     Number of saturation table points (default 20)
 * @returns           Array of SwofRow ready for simSWOF()
 */
export function simBuildSwofTable(
  Swi: number,
  Sorw: number,
  krw_max: number,
  krow_max: number,
  nw: number,
  no: number,
  nPoints = 20
): SwofRow[] {
  if (Swi < 0 || Sorw < 0 || Swi + Sorw >= 1) {
    throw new Error("Invalid Swi / Sorw: must satisfy Swi + Sorw < 1");
  }
  const Sw_norm_denom = 1 - Swi - Sorw;
  const rows: SwofRow[] = [];
  for (let i = 0; i < nPoints; i++) {
    const Sw = Swi + (i / (nPoints - 1)) * (1 - Swi);
    const SwN = Math.max(0, Math.min(1, (Sw - Swi) / Sw_norm_denom));
    const So = 1 - Sw;
    const SoN = Math.max(0, Math.min(1, (So - Sorw) / Sw_norm_denom));
    const krw  = krw_max  * Math.pow(SwN, nw);
    const krow = krow_max * Math.pow(SoN, no);
    rows.push({ Sw, krw, krow, Pcow: 0 });
  }
  return rows;
}

/**
 * Build a complete SGOF table using Corey kr correlations.
 *
 * krg  = krg_max × [(Sg − Sgc) / (1 − Swi − Sgc − Sorg)]^ng
 * krog = krog_max × [(1 − Sg − Swi − Sorg) / (1 − Swi − Sgc − Sorg)]^nog
 *
 * @param Swi         Connate water saturation (fraction)
 * @param Sgc         Critical gas saturation (fraction)
 * @param Sorg        Residual oil to gas (fraction)
 * @param krg_max     Max gas Kr at Sorg (fraction)
 * @param krog_max    Max oil Kr at Sgc (fraction)
 * @param ng          Corey exponent for gas
 * @param nog         Corey exponent for oil (to gas)
 * @param nPoints     Number of saturation table points (default 20)
 * @returns           Array of SgofRow ready for simSGOF()
 */
export function simBuildSgofTable(
  Swi: number,
  Sgc: number,
  Sorg: number,
  krg_max: number,
  krog_max: number,
  ng: number,
  nog: number,
  nPoints = 20
): SgofRow[] {
  if (Swi < 0 || Sgc < 0 || Sorg < 0 || Swi + Sgc + Sorg >= 1) {
    throw new Error("Invalid Swi/Sgc/Sorg: must satisfy Swi + Sgc + Sorg < 1");
  }
  const Sg_norm_denom = 1 - Swi - Sgc - Sorg;
  const rows: SgofRow[] = [];
  const Sg_max = 1 - Swi - Sorg;
  for (let i = 0; i < nPoints; i++) {
    const Sg = Sgc + (i / (nPoints - 1)) * (Sg_max - Sgc);
    const SgN = Math.max(0, Math.min(1, (Sg - Sgc) / Sg_norm_denom));
    const So_excess = 1 - Sg - Swi - Sorg;
    const SoN = Math.max(0, Math.min(1, So_excess / Sg_norm_denom));
    const krg  = krg_max  * Math.pow(SgN, ng);
    const krog = krog_max * Math.pow(SoN, nog);
    rows.push({ Sg, krg, krog, Pcgo: 0 });
  }
  return rows;
}

// ─── CMG STARS Keyword Generators ────────────────────────────────────────────

/**
 * CMG STARS GRID keyword block.
 *
 * Generates a GRID CART / DI / DJ / DK section for a regular Cartesian grid.
 * Supports uniform cell sizes (single values) or heterogeneous spacing
 * (arrays of length nx, ny, nz respectively).
 *
 * @param nx     Number of grid blocks in X (I) direction
 * @param ny     Number of grid blocks in Y (J) direction
 * @param nz     Number of grid blocks in Z (K) direction
 * @param dx     Cell size(s) in I direction (ft) — scalar or length-nx array
 * @param dy     Cell size(s) in J direction (ft) — scalar or length-ny array
 * @param dz     Cell size(s) in K direction (ft) — scalar or length-nz array
 * @returns      CMG STARS GRID/DI/DJ/DK keyword block as a string
 */
export function simStarsGrid(
  nx: number,
  ny: number,
  nz: number,
  dx: number | number[],
  dy: number | number[],
  dz: number | number[],
): string {
  const expand = (val: number | number[], count: number): number[] => {
    if (typeof val === "number") return Array(count).fill(val);
    if (val.length !== count) throw new Error(`Array length mismatch: expected ${count}, got ${val.length}`);
    return val as number[];
  };
  const dxArr = expand(dx, nx);
  const dyArr = expand(dy, ny);
  const dzArr = expand(dz, nz);

  const fmt = (arr: number[]): string =>
    arr.map(v => v.toFixed(4)).join(" ");

  const lines: string[] = [
    `GRID CART ${nx} ${ny} ${nz}`,
    `DI CON`,
    fmt(dxArr),
    `DJ CON`,
    fmt(dyArr),
    `DK CON`,
    fmt(dzArr),
  ];
  return lines.join("\n");
}

/**
 * CMG STARS PORO keyword block.
 *
 * Generates a PORO (porosity) keyword section.  Supply a flat array of
 * porosity values in I-J-K order (ix varies fastest).
 *
 * @param nx        Grid dimensions (I)
 * @param ny        Grid dimensions (J)
 * @param nz        Grid dimensions (K)
 * @param poro_arr  Porosity values (fraction) — length nx×ny×nz, or single value
 * @returns         CMG STARS PORO keyword block as a string
 */
export function simStarsPoro(
  nx: number,
  ny: number,
  nz: number,
  poro_arr: number | number[],
): string {
  const total = nx * ny * nz;
  const vals: number[] = typeof poro_arr === "number"
    ? Array(total).fill(poro_arr)
    : (poro_arr as number[]);
  if (vals.length !== total) {
    throw new Error(`PORO: expected ${total} values, got ${vals.length}`);
  }
  const rows: string[] = ["PORO CON"];
  const chunkSize = 10;
  for (let i = 0; i < total; i += chunkSize) {
    rows.push(vals.slice(i, i + chunkSize).map(v => v.toFixed(6)).join(" "));
  }
  return rows.join("\n");
}

/**
 * CMG STARS PERMI / PERMJ / PERMK keyword blocks.
 *
 * Generates permeability keyword sections for all three directions.
 * Pass a single value to apply uniformly, or an array of length nx×ny×nz.
 *
 * @param nx        Grid dimensions (I)
 * @param ny        Grid dimensions (J)
 * @param nz        Grid dimensions (K)
 * @param perm_i    I-direction permeability (md) — scalar or array
 * @param perm_j    J-direction permeability (md) — scalar or array
 * @param perm_k    K-direction permeability (md) — scalar or array
 * @returns         CMG STARS PERMI/PERMJ/PERMK keyword blocks as a string
 */
export function simStarsPerm(
  nx: number,
  ny: number,
  nz: number,
  perm_i: number | number[],
  perm_j: number | number[],
  perm_k: number | number[],
): string {
  const total = nx * ny * nz;
  const buildBlock = (keyword: string, val: number | number[]): string => {
    const vals: number[] = typeof val === "number"
      ? Array(total).fill(val)
      : (val as number[]);
    if (vals.length !== total) {
      throw new Error(`${keyword}: expected ${total} values, got ${vals.length}`);
    }
    const rows: string[] = [`${keyword} CON`];
    const chunkSize = 10;
    for (let i = 0; i < total; i += chunkSize) {
      rows.push(vals.slice(i, i + chunkSize).map(v => v.toFixed(4)).join(" "));
    }
    return rows.join("\n");
  };
  return [
    buildBlock("PERMI", perm_i),
    buildBlock("PERMJ", perm_j),
    buildBlock("PERMK", perm_k),
  ].join("\n");
}

/**
 * CMG STARS TEMPI (initial temperature) keyword block.
 *
 * Generates the TEMPI keyword for reservoir initial temperature distribution
 * used in thermal simulation.  Pass a single value for uniform temperature
 * or an array of length nx×ny×nz for heterogeneous distribution.
 *
 * @param nx        Grid dimensions (I)
 * @param ny        Grid dimensions (J)
 * @param nz        Grid dimensions (K)
 * @param temp_arr  Temperature values (°F) — scalar or array
 * @returns         CMG STARS TEMPI keyword block as a string
 */
export function simStarsTemp(
  nx: number,
  ny: number,
  nz: number,
  temp_arr: number | number[],
): string {
  const total = nx * ny * nz;
  const vals: number[] = typeof temp_arr === "number"
    ? Array(total).fill(temp_arr)
    : (temp_arr as number[]);
  if (vals.length !== total) {
    throw new Error(`TEMPI: expected ${total} values, got ${vals.length}`);
  }
  const rows: string[] = ["TEMPI CON"];
  const chunkSize = 10;
  for (let i = 0; i < total; i += chunkSize) {
    rows.push(vals.slice(i, i + chunkSize).map(v => v.toFixed(2)).join(" "));
  }
  return rows.join("\n");
}
