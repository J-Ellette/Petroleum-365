/**
 * P365 Eclipse Results Import — SMSPEC/UNSMRY Binary Parser
 *
 * Parses Eclipse reservoir simulator summary output files (.SMSPEC, .UNSMRY)
 * and formats results into 2D tables ready for Excel worksheet output.
 *
 * File format: Fortran unformatted sequential binary records.
 * Each keyword block consists of:
 *   1. Header record:  [len4][name:8char][count:int32][type:4char][len4]
 *   2. Data record:    [len4][data bytes][len4]
 * Types: INTE (int32), REAL (float32), DOUB (float64), CHAR (8-char string), LOGI (int32 logical)
 *
 * Auto-detects byte order (big-endian or little-endian) from header record length.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Parsed SMSPEC file header — metadata describing each summary vector. */
export interface SmspecHeader {
  /** Simulation start date [day, month, year] */
  startDate: [number, number, number];
  /** Number of summary vectors */
  numVectors: number;
  /** Eclipse keyword for each vector (e.g. "WOPR", "FOPT", "TIME") */
  keywords: string[];
  /** Well/group/region name per vector (":" = field-level) */
  wgnames: string[];
  /** Array number per vector (well completion, region, etc.) */
  nums: number[];
  /** Unit label per vector (e.g. "SM3/DAY", "DAYS") */
  units: string[];
  /** True if the file was parsed as big-endian */
  bigEndian: boolean;
}

/** One timestep of UNSMRY data. */
export interface UnsmryStep {
  /** Sequential report step number */
  seqnum: number;
  /** Mini-step index within report step */
  ministep: number;
  /** Parameter values for every vector (same order as SmspecHeader arrays) */
  params: number[];
}

/** Complete parsed UNSMRY result. */
export interface UnsmryData {
  steps: UnsmryStep[];
}

/** 2D table row: [seqnum, ministep, value1, value2, ...] */
export type ExcelRow = (string | number)[];

// ─── Low-level binary reader ───────────────────────────────────────────────────

/** @internal Reads a Fortran unformatted record from a DataView and advances the offset. */
function readFortranRecord(
  view: DataView,
  offset: number,
  bigEndian: boolean
): { data: Uint8Array; nextOffset: number } {
  const getUint32 = (off: number) =>
    bigEndian ? view.getUint32(off, false) : view.getUint32(off, true);

  if (offset + 4 > view.byteLength) {
    throw new Error(`readFortranRecord: offset ${offset} out of bounds (file size ${view.byteLength})`);
  }
  const len = getUint32(offset);
  offset += 4;
  if (offset + len + 4 > view.byteLength) {
    throw new Error(`readFortranRecord: record length ${len} exceeds file bounds at offset ${offset}`);
  }
  const data = new Uint8Array(view.buffer, view.byteOffset + offset, len);
  offset += len;
  const lenTrail = getUint32(offset);
  if (len !== lenTrail) {
    throw new Error(`readFortranRecord: trailing length ${lenTrail} does not match leading length ${len}`);
  }
  offset += 4;
  return { data: data.slice(), nextOffset: offset }; // copy so we own the buffer
}

/** @internal Decode ASCII bytes to a trimmed string. */
function decodeStr(bytes: Uint8Array, start = 0, length = bytes.length): string {
  let s = "";
  for (let i = start; i < start + length && i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s.trimEnd();
}

/** @internal Read int32 from a byte slice at a given offset. */
function readInt32(data: Uint8Array, offset: number, bigEndian: boolean): number {
  const view = new DataView(data.buffer, data.byteOffset + offset, 4);
  return bigEndian ? view.getInt32(0, false) : view.getInt32(0, true);
}

/** @internal Read float32 from a byte slice. */
function readFloat32(data: Uint8Array, offset: number, bigEndian: boolean): number {
  const view = new DataView(data.buffer, data.byteOffset + offset, 4);
  return bigEndian ? view.getFloat32(0, false) : view.getFloat32(0, true);
}

/** @internal Read float64 from a byte slice. */
function readFloat64(data: Uint8Array, offset: number, bigEndian: boolean): number {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return bigEndian ? view.getFloat64(0, false) : view.getFloat64(0, true);
}

// ─── Eclipse keyword block reader ─────────────────────────────────────────────

interface EclipseBlock {
  keyword: string;
  count: number;
  type: string; // "INTE" | "REAL" | "DOUB" | "CHAR" | "LOGI"
  data: Uint8Array;
}

/**
 * @internal Parse one Eclipse keyword block (header + data record pair).
 * Returns null if there is no more data (EOF).
 */
function readEclipseBlock(
  view: DataView,
  offset: number,
  bigEndian: boolean
): { block: EclipseBlock; nextOffset: number } | null {
  if (offset >= view.byteLength) return null;

  // Header record: [keyword:8][count:4][type:4]  = 16 bytes
  let rec: { data: Uint8Array; nextOffset: number };
  try {
    rec = readFortranRecord(view, offset, bigEndian);
  } catch {
    return null; // EOF or corrupt
  }
  if (rec.data.length < 16) return null;

  const keyword = decodeStr(rec.data, 0, 8);
  const count = readInt32(rec.data, 8, bigEndian);
  const type = decodeStr(rec.data, 12, 4);
  offset = rec.nextOffset;

  // Data record
  let dataRec: { data: Uint8Array; nextOffset: number };
  try {
    dataRec = readFortranRecord(view, offset, bigEndian);
  } catch {
    return null;
  }
  offset = dataRec.nextOffset;

  return {
    block: { keyword: keyword.trim(), count, type: type.trim(), data: dataRec.data },
    nextOffset: offset,
  };
}

/** @internal Extract typed values from an Eclipse data block. */
function extractValues(block: EclipseBlock, bigEndian: boolean): (number | string)[] {
  const { count, type, data } = block;
  const result: (number | string)[] = [];
  switch (type) {
    case "INTE":
    case "LOGI":
      for (let i = 0; i < count; i++) {
        result.push(readInt32(data, i * 4, bigEndian));
      }
      break;
    case "REAL":
      for (let i = 0; i < count; i++) {
        result.push(readFloat32(data, i * 4, bigEndian));
      }
      break;
    case "DOUB":
      for (let i = 0; i < count; i++) {
        result.push(readFloat64(data, i * 8, bigEndian));
      }
      break;
    case "CHAR":
      for (let i = 0; i < count; i++) {
        result.push(decodeStr(data, i * 8, 8));
      }
      break;
    default:
      break;
  }
  return result;
}

// ─── Byte-order detection ──────────────────────────────────────────────────────

/**
 * @internal Auto-detect byte order from the first Fortran record.
 * A valid header record starts with 16 (the header block is 8+4+4=16 bytes).
 * We try big-endian first; if that fails (leading len = 0 or >1024 and the
 * little-endian reading gives 16), we switch.
 */
function detectByteOrder(view: DataView): boolean {
  if (view.byteLength < 4) return true;
  const be = view.getUint32(0, false); // big-endian read
  const le = view.getUint32(0, true);  // little-endian read
  if (be === 16) return true;
  if (le === 16) return false;
  // Fall back: try whichever gives a plausible value (≤ file size)
  if (be <= view.byteLength) return true;
  return false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse an Eclipse .SMSPEC binary file (ArrayBuffer) and return the header metadata.
 *
 * @param buffer  - Raw binary content of the .SMSPEC file
 * @returns       SmspecHeader with keywords, wgnames, nums, units, startDate
 * @throws        Error if the buffer is corrupt or not a recognizable SMSPEC file
 *
 * @example
 * // In a browser/Office.js environment:
 * const response = await fetch('CASE.SMSPEC');
 * const buffer = await response.arrayBuffer();
 * const hdr = parseSmspec(buffer);
 * console.log(hdr.keywords); // ["TIME", "FOPR", "FOPT", ...]
 */
export function parseSmspec(buffer: ArrayBuffer): SmspecHeader {
  const view = new DataView(buffer);
  const bigEndian = detectByteOrder(view);

  let offset = 0;
  const blocks: Map<string, EclipseBlock> = new Map();

  // Read all keyword blocks until EOF
  while (offset < view.byteLength) {
    const result = readEclipseBlock(view, offset, bigEndian);
    if (!result) break;
    const { block, nextOffset } = result;
    blocks.set(block.keyword, block);
    offset = nextOffset;
  }

  // Extract DIMENS
  const dimens = blocks.get("DIMENS");
  let numVectors = 0;
  if (dimens) {
    const vals = extractValues(dimens, bigEndian) as number[];
    numVectors = vals[0] ?? 0; // DIMENS[0] = number of summary vectors
  }

  // Extract KEYWORDS
  const keywords: string[] = [];
  const kwBlock = blocks.get("KEYWORDS");
  if (kwBlock) {
    const vals = extractValues(kwBlock, bigEndian) as string[];
    for (const kw of vals) keywords.push(kw.trim());
  }

  // Extract WGNAMES
  const wgnames: string[] = [];
  const wgBlock = blocks.get("WGNAMES");
  if (wgBlock) {
    const vals = extractValues(wgBlock, bigEndian) as string[];
    for (const w of vals) wgnames.push(w.trim());
  }

  // Extract NUMS
  const nums: number[] = [];
  const numsBlock = blocks.get("NUMS");
  if (numsBlock) {
    const vals = extractValues(numsBlock, bigEndian) as number[];
    nums.push(...vals);
  }

  // Extract UNITS
  const units: string[] = [];
  const unitsBlock = blocks.get("UNITS");
  if (unitsBlock) {
    const vals = extractValues(unitsBlock, bigEndian) as string[];
    for (const u of vals) units.push(u.trim());
  }

  // Extract STARTDAT
  let startDate: [number, number, number] = [1, 1, 1970];
  const startdatBlock = blocks.get("STARTDAT");
  if (startdatBlock) {
    const vals = extractValues(startdatBlock, bigEndian) as number[];
    startDate = [vals[0] ?? 1, vals[1] ?? 1, vals[2] ?? 1970];
  }

  return {
    startDate,
    numVectors,
    keywords,
    wgnames,
    nums,
    units,
    bigEndian,
  };
}

/**
 * Parse an Eclipse .UNSMRY or .SMSPEC (unified) binary file to extract timestep data.
 *
 * The UNSMRY file contains SEQHDR + MINISTEP + PARAMS records for every timestep.
 *
 * @param buffer     - Raw binary content of the .UNSMRY file
 * @param bigEndian  - Byte order from parseSmspec (SmspecHeader.bigEndian)
 * @param numVectors - Number of summary vectors (SmspecHeader.numVectors)
 * @returns           UnsmryData with all timestep parameter arrays
 */
export function parseUnsmry(
  buffer: ArrayBuffer,
  bigEndian: boolean,
  numVectors: number
): UnsmryData {
  const view = new DataView(buffer);
  const steps: UnsmryStep[] = [];
  let offset = 0;
  let currentSeqnum = 0;
  let currentMinistep = 0;
  let currentParams: number[] = [];

  while (offset < view.byteLength) {
    const result = readEclipseBlock(view, offset, bigEndian);
    if (!result) break;
    const { block, nextOffset } = result;
    offset = nextOffset;

    switch (block.keyword) {
      case "SEQHDR": {
        const vals = extractValues(block, bigEndian) as number[];
        currentSeqnum = vals[0] ?? currentSeqnum + 1;
        break;
      }
      case "MINISTEP": {
        const vals = extractValues(block, bigEndian) as number[];
        currentMinistep = vals[0] ?? 0;
        break;
      }
      case "PARAMS": {
        const vals = extractValues(block, bigEndian) as number[];
        currentParams = vals as number[];
        // Commit this timestep
        steps.push({
          seqnum: currentSeqnum,
          ministep: currentMinistep,
          params: currentParams.slice(0, numVectors),
        });
        break;
      }
      default:
        break;
    }
  }

  return { steps };
}

/**
 * Format parsed Eclipse summary data into a 2D table for Excel output.
 *
 * Row 0 (header): ["SEQNUM", "MINISTEP", "TIME (DAYS)", "WOPR:WELL1 (SM3/DAY)", ...]
 * Row 1+: numeric values for each timestep.
 *
 * @param header   - Parsed SMSPEC header from parseSmspec()
 * @param unsmry   - Parsed timestep data from parseUnsmry()
 * @returns        2D array (header row + data rows) ready for Excel worksheet insertion
 */
export function formatEclipseResults(
  header: SmspecHeader,
  unsmry: UnsmryData
): ExcelRow[] {
  // Build header row: combine keyword + wgname + unit
  const headerRow: ExcelRow = ["SEQNUM", "MINISTEP"];
  for (let i = 0; i < header.keywords.length; i++) {
    const kw = header.keywords[i] ?? "";
    const wg = header.wgnames[i] ?? "";
    const unit = header.units[i] ?? "";
    // Build label: "WOPR:WELL1 (SM3/DAY)" or "FOPT (SM3)" or "TIME (DAYS)"
    const label =
      wg && wg !== ":" && wg !== ""
        ? `${kw}:${wg} (${unit})`
        : `${kw} (${unit})`;
    headerRow.push(label);
  }

  const rows: ExcelRow[] = [headerRow];

  for (const step of unsmry.steps) {
    const row: ExcelRow = [step.seqnum, step.ministep];
    for (let i = 0; i < header.numVectors; i++) {
      row.push(step.params[i] ?? 0);
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Build an example/demo SMSPEC structure from arrays of metadata.
 * Useful for testing the formatter without actual binary files.
 *
 * @param keywords  - e.g. ["TIME", "FOPR", "FOPT"]
 * @param wgnames   - e.g. [":", ":", ":"]
 * @param nums      - e.g. [0, 0, 0]
 * @param units     - e.g. ["DAYS", "SM3/DAY", "SM3"]
 * @param startDate - e.g. [1, 1, 2020]
 */
export function buildSmspecHeader(
  keywords: string[],
  wgnames: string[],
  nums: number[],
  units: string[],
  startDate: [number, number, number] = [1, 1, 2000]
): SmspecHeader {
  return {
    startDate,
    numVectors: keywords.length,
    keywords,
    wgnames,
    nums,
    units,
    bigEndian: true,
  };
}

/**
 * Build a demo UnsmryData structure from a 2D numeric array.
 * rows[i] = [time_days, vector1, vector2, ...]
 * Useful for testing the formatter.
 *
 * @param dataRows - Array of numeric rows (one per timestep)
 */
export function buildUnsmryData(dataRows: number[][]): UnsmryData {
  return {
    steps: dataRows.map((row, i) => ({
      seqnum: i + 1,
      ministep: 0,
      params: row,
    })),
  };
}

/**
 * Construct a column header string for a single vector.
 * Returns e.g. "WOPR:PROD1 (SM3/DAY)" or "FOPT (SM3)".
 */
export function buildVectorLabel(keyword: string, wgname: string, unit: string): string {
  if (wgname && wgname !== ":" && wgname.trim() !== "") {
    return `${keyword.trim()}:${wgname.trim()} (${unit.trim()})`;
  }
  return `${keyword.trim()} (${unit.trim()})`;
}

/**
 * Validate that a parsed SmspecHeader has the required fields populated.
 * Returns an array of error messages (empty = valid).
 */
export function validateSmspecHeader(header: SmspecHeader): string[] {
  const errors: string[] = [];
  if (header.numVectors <= 0) {
    errors.push("No summary vectors found in SMSPEC header.");
  }
  if (header.keywords.length === 0) {
    errors.push("KEYWORDS block is missing or empty.");
  }
  if (header.keywords.length > 0 && header.units.length === 0) {
    errors.push("UNITS block is missing or empty.");
  }
  if (
    header.keywords.length > 0 &&
    header.wgnames.length > 0 &&
    header.keywords.length !== header.wgnames.length
  ) {
    errors.push(
      `KEYWORDS length (${header.keywords.length}) does not match WGNAMES length (${header.wgnames.length}).`
    );
  }
  return errors;
}

/**
 * List the unique well names present in a parsed SMSPEC header.
 * Excludes field-level placeholders (":", "").
 */
export function listWellNames(header: SmspecHeader): string[] {
  const names = new Set<string>();
  for (const wg of header.wgnames) {
    const t = wg.trim();
    if (t && t !== ":") names.add(t);
  }
  return Array.from(names).sort();
}

/**
 * Filter an UnsmryData to include only timesteps where TIME (first vector) >= minDays.
 */
export function filterByTime(
  unsmry: UnsmryData,
  minDays: number,
  maxDays = Infinity
): UnsmryData {
  return {
    steps: unsmry.steps.filter(
      (s) => s.params[0] >= minDays && s.params[0] <= maxDays
    ),
  };
}

/**
 * Extract a single vector time series from UNSMRY as [time, value] pairs.
 *
 * @param header    - SMSPEC header
 * @param unsmry    - Parsed UNSMRY data
 * @param keyword   - Vector keyword (e.g. "WOPR")
 * @param wgname    - Well/group name (e.g. "PROD1", ":" for field)
 * @returns         Array of [time_days, value] tuples, or empty if not found
 */
export function extractTimeSeries(
  header: SmspecHeader,
  unsmry: UnsmryData,
  keyword: string,
  wgname = ":"
): [number, number][] {
  // Find vector index
  let vecIdx = -1;
  for (let i = 0; i < header.keywords.length; i++) {
    if (
      header.keywords[i].trim() === keyword.trim() &&
      (header.wgnames[i]?.trim() ?? ":") === wgname.trim()
    ) {
      vecIdx = i;
      break;
    }
  }
  if (vecIdx < 0) return [];

  // Find TIME vector index
  let timeIdx = -1;
  for (let i = 0; i < header.keywords.length; i++) {
    if (header.keywords[i].trim() === "TIME") {
      timeIdx = i;
      break;
    }
  }

  return unsmry.steps.map((step) => {
    const t = timeIdx >= 0 ? (step.params[timeIdx] ?? 0) : step.seqnum;
    const v = step.params[vecIdx] ?? 0;
    return [t, v];
  });
}
