/**
 * Tests for P365 Eclipse SMSPEC/UNSMRY Parser
 * (src/functions/eclipse/index.ts)
 *
 * Because actual Eclipse binary files are large and proprietary, these tests
 * use synthetic in-memory buffers that replicate the Fortran unformatted
 * binary format, plus the helper functions which can be tested without
 * binary files.
 */

import {
  parseSmspec,
  parseUnsmry,
  formatEclipseResults,
  buildSmspecHeader,
  buildUnsmryData,
  buildVectorLabel,
  validateSmspecHeader,
  listWellNames,
  filterByTime,
  extractTimeSeries,
  SmspecHeader,
  UnsmryData,
} from "../../src/functions/eclipse/index";

// ─── Helper: Build a synthetic Fortran-format binary buffer ──────────────────

/**
 * Build a Fortran unformatted binary file buffer with keyword blocks.
 * Big-endian. Each block is:
 *   [len4][name:8][count:4][type:4][len4]   (header record, len=16)
 *   [len4][data...][len4]                    (data record)
 */
function buildSyntheticSmspec(blocks: Array<{
  name: string;
  type: "INTE" | "REAL" | "CHAR";
  values: Array<number | string>;
}>): ArrayBuffer {
  // Pre-calculate total size
  const bytesPerType: Record<string, number> = {
    INTE: 4,
    REAL: 4,
    CHAR: 8,
  };

  const parts: Uint8Array[] = [];

  function writeUint32BE(val: number): Uint8Array {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, val, false);
    return buf;
  }

  function writeInt32BE(val: number): Uint8Array {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, val, false);
    return buf;
  }

  function writeFloat32BE(val: number): Uint8Array {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setFloat32(0, val, false);
    return buf;
  }

  function encodeStr(s: string, len: number): Uint8Array {
    const buf = new Uint8Array(len).fill(32); // space-padded
    for (let i = 0; i < Math.min(s.length, len); i++) {
      buf[i] = s.charCodeAt(i);
    }
    return buf;
  }

  for (const block of blocks) {
    const elemSize = bytesPerType[block.type];
    const count = block.values.length;

    // Header record: 16 bytes = [name:8][count:4][type:4]
    const hdrLen = writeUint32BE(16);
    const hdrName = encodeStr(block.name, 8);
    const hdrCount = writeInt32BE(count);
    const hdrType = encodeStr(block.type, 4);
    parts.push(hdrLen, hdrName, hdrCount, hdrType, hdrLen);

    // Data record
    const dataLen = count * elemSize;
    const dataLenBuf = writeUint32BE(dataLen);
    const dataBuf = new Uint8Array(dataLen);
    for (let i = 0; i < count; i++) {
      const v = block.values[i];
      if (block.type === "CHAR") {
        const str = String(v);
        const bytes = encodeStr(str, 8);
        dataBuf.set(bytes, i * 8);
      } else if (block.type === "REAL") {
        writeFloat32BE(Number(v)).forEach((b, j) => { dataBuf[i * 4 + j] = b; });
      } else {
        writeInt32BE(Number(v)).forEach((b, j) => { dataBuf[i * 4 + j] = b; });
      }
    }
    parts.push(dataLenBuf, dataBuf, dataLenBuf);
  }

  // Concatenate all parts
  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result.buffer;
}

/** Build a minimal SMSPEC buffer with known fields. */
function makeSmspecBuffer(): ArrayBuffer {
  return buildSyntheticSmspec([
    {
      name: "INTEHEAD",
      type: "INTE",
      values: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: "DIMENS",
      type: "INTE",
      values: [3, 1, 1, 1, 1, 1, 1, 0], // 3 vectors
    },
    {
      name: "STARTDAT",
      type: "INTE",
      values: [1, 1, 2020, 0],
    },
    {
      name: "KEYWORDS",
      type: "CHAR",
      values: ["TIME    ", "FOPR    ", "FOPT    "],
    },
    {
      name: "WGNAMES",
      type: "CHAR",
      values: [":       ", ":       ", ":       "],
    },
    {
      name: "NUMS",
      type: "INTE",
      values: [0, 0, 0],
    },
    {
      name: "UNITS",
      type: "CHAR",
      values: ["DAYS    ", "SM3/DAY ", "SM3     "],
    },
  ]);
}

/** Build a minimal UNSMRY buffer with two timesteps. */
function makeUnsmryBuffer(): ArrayBuffer {
  return buildSyntheticSmspec([
    // Timestep 1
    { name: "SEQHDR  ", type: "INTE", values: [1] },
    { name: "MINISTEP", type: "INTE", values: [0] },
    { name: "PARAMS  ", type: "REAL", values: [30.0, 500.0, 15000.0] },
    // Timestep 2
    { name: "SEQHDR  ", type: "INTE", values: [2] },
    { name: "MINISTEP", type: "INTE", values: [0] },
    { name: "PARAMS  ", type: "REAL", values: [60.0, 450.0, 28500.0] },
  ]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Eclipse SMSPEC parser — parseSmspec", () => {
  let smspecBuf: ArrayBuffer;

  beforeAll(() => {
    smspecBuf = makeSmspecBuffer();
  });

  test("parseSmspec returns correct numVectors", () => {
    const hdr = parseSmspec(smspecBuf);
    expect(hdr.numVectors).toBe(3);
  });

  test("parseSmspec returns correct keywords", () => {
    const hdr = parseSmspec(smspecBuf);
    expect(hdr.keywords).toHaveLength(3);
    expect(hdr.keywords[0]).toBe("TIME");
    expect(hdr.keywords[1]).toBe("FOPR");
    expect(hdr.keywords[2]).toBe("FOPT");
  });

  test("parseSmspec returns correct units", () => {
    const hdr = parseSmspec(smspecBuf);
    expect(hdr.units[0]).toBe("DAYS");
    expect(hdr.units[1]).toBe("SM3/DAY");
    expect(hdr.units[2]).toBe("SM3");
  });

  test("parseSmspec returns correct start date", () => {
    const hdr = parseSmspec(smspecBuf);
    expect(hdr.startDate[0]).toBe(1);   // day
    expect(hdr.startDate[1]).toBe(1);   // month
    expect(hdr.startDate[2]).toBe(2020); // year
  });

  test("parseSmspec returns bigEndian = true for big-endian buffer", () => {
    const hdr = parseSmspec(smspecBuf);
    expect(hdr.bigEndian).toBe(true);
  });

  test("parseSmspec returns wgnames with field placeholder :", () => {
    const hdr = parseSmspec(smspecBuf);
    expect(hdr.wgnames[0]).toBe(":");
  });

  test("parseSmspec returns nums array", () => {
    const hdr = parseSmspec(smspecBuf);
    expect(hdr.nums).toEqual([0, 0, 0]);
  });
});

describe("Eclipse UNSMRY parser — parseUnsmry", () => {
  let smspecBuf: ArrayBuffer;
  let unsmryBuf: ArrayBuffer;
  let hdr: SmspecHeader;

  beforeAll(() => {
    smspecBuf = makeSmspecBuffer();
    unsmryBuf = makeUnsmryBuffer();
    hdr = parseSmspec(smspecBuf);
  });

  test("parseUnsmry returns 2 timesteps", () => {
    const data = parseUnsmry(unsmryBuf, true, 3);
    expect(data.steps).toHaveLength(2);
  });

  test("parseUnsmry step 1 has correct seqnum and TIME", () => {
    const data = parseUnsmry(unsmryBuf, true, 3);
    const s = data.steps[0];
    expect(s.seqnum).toBe(1);
    expect(s.params[0]).toBeCloseTo(30.0, 1); // TIME = 30 days
  });

  test("parseUnsmry step 2 has correct FOPR and FOPT", () => {
    const data = parseUnsmry(unsmryBuf, true, 3);
    const s = data.steps[1];
    expect(s.params[0]).toBeCloseTo(60.0, 1);  // TIME
    expect(s.params[1]).toBeCloseTo(450.0, 0); // FOPR
    expect(s.params[2]).toBeCloseTo(28500.0, 0); // FOPT
  });
});

describe("Eclipse formatter — formatEclipseResults", () => {
  test("header row contains correct column labels", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "FOPR", "WOPR"],
      [":", ":", "PROD1"],
      [0, 0, 0],
      ["DAYS", "SM3/DAY", "SM3/DAY"],
      [1, 1, 2020]
    );
    const data = buildUnsmryData([
      [30, 500, 200],
      [60, 450, 180],
    ]);
    const table = formatEclipseResults(hdr, data);
    expect(table[0]).toContain("SEQNUM");
    expect(table[0]).toContain("MINISTEP");
    expect(table[0]).toContain("TIME (DAYS)");
    expect(table[0]).toContain("FOPR (SM3/DAY)");
    expect(table[0]).toContain("WOPR:PROD1 (SM3/DAY)");
  });

  test("data rows contain correct numeric values", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "FOPR"],
      [":", ":"],
      [0, 0],
      ["DAYS", "SM3/DAY"],
      [1, 1, 2020]
    );
    const data = buildUnsmryData([
      [30, 500],
      [60, 450],
    ]);
    const table = formatEclipseResults(hdr, data);
    expect(table).toHaveLength(3); // 1 header + 2 data rows
    expect(table[1][0]).toBe(1);    // seqnum
    expect(table[1][2]).toBe(30);   // TIME
    expect(table[2][3]).toBe(450);  // FOPR row 2
  });

  test("handles empty data gracefully (no timesteps)", () => {
    const hdr = buildSmspecHeader(["TIME"], [":"], [0], ["DAYS"]);
    const data: UnsmryData = { steps: [] };
    const table = formatEclipseResults(hdr, data);
    expect(table).toHaveLength(1); // header row only
  });
});

describe("buildVectorLabel", () => {
  test("field-level vector (wgname = :)", () => {
    expect(buildVectorLabel("FOPT", ":", "SM3")).toBe("FOPT (SM3)");
  });

  test("well-level vector includes well name", () => {
    expect(buildVectorLabel("WOPR", "PROD1", "SM3/DAY")).toBe("WOPR:PROD1 (SM3/DAY)");
  });

  test("empty wgname treated as field-level", () => {
    expect(buildVectorLabel("TIME", "", "DAYS")).toBe("TIME (DAYS)");
  });
});

describe("validateSmspecHeader", () => {
  test("valid header returns no errors", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "FOPR"],
      [":", ":"],
      [0, 0],
      ["DAYS", "SM3/DAY"]
    );
    expect(validateSmspecHeader(hdr)).toHaveLength(0);
  });

  test("zero numVectors returns error", () => {
    const hdr = buildSmspecHeader([], [], [], []);
    hdr.numVectors = 0;
    const errors = validateSmspecHeader(hdr);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("No summary vectors");
  });

  test("missing units returns error when keywords present", () => {
    const hdr = buildSmspecHeader(["TIME"], [":"], [0], []);
    hdr.units = [];
    const errors = validateSmspecHeader(hdr);
    expect(errors.some((e) => e.includes("UNITS"))).toBe(true);
  });

  test("mismatched keywords/wgnames returns error", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "FOPR"],
      [":"],
      [0, 0],
      ["DAYS", "SM3/DAY"]
    );
    const errors = validateSmspecHeader(hdr);
    expect(errors.some((e) => e.includes("WGNAMES"))).toBe(true);
  });
});

describe("listWellNames", () => {
  test("returns unique well names, excludes field placeholders", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "FOPR", "WOPR", "WOPR"],
      [":", ":", "PROD1", "INJ1"],
      [0, 0, 0, 0],
      ["DAYS", "SM3/DAY", "SM3/DAY", "SM3/DAY"]
    );
    const wells = listWellNames(hdr);
    expect(wells).toContain("PROD1");
    expect(wells).toContain("INJ1");
    expect(wells).not.toContain(":");
    expect(wells).toHaveLength(2);
  });

  test("returns empty array when no well-level vectors", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "FOPT"],
      [":", ":"],
      [0, 0],
      ["DAYS", "SM3"]
    );
    expect(listWellNames(hdr)).toHaveLength(0);
  });
});

describe("filterByTime", () => {
  test("filters steps outside time range", () => {
    const data = buildUnsmryData([
      [10, 100],
      [30, 200],
      [60, 300],
      [90, 250],
    ]);
    const filtered = filterByTime(data, 25, 65);
    expect(filtered.steps).toHaveLength(2);
    expect(filtered.steps[0].params[0]).toBe(30);
    expect(filtered.steps[1].params[0]).toBe(60);
  });

  test("filterByTime with only minDays includes all steps from that time onward", () => {
    const data = buildUnsmryData([
      [10, 100],
      [30, 200],
    ]);
    const filtered = filterByTime(data, 20);
    expect(filtered.steps).toHaveLength(1);
    expect(filtered.steps[0].params[0]).toBe(30);
  });
});

describe("extractTimeSeries", () => {
  test("extracts field-level FOPR time series", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "FOPR"],
      [":", ":"],
      [0, 0],
      ["DAYS", "SM3/DAY"]
    );
    const data = buildUnsmryData([
      [30, 500],
      [60, 450],
    ]);
    const series = extractTimeSeries(hdr, data, "FOPR", ":");
    expect(series).toHaveLength(2);
    expect(series[0]).toEqual([30, 500]);
    expect(series[1]).toEqual([60, 450]);
  });

  test("extracts well-level WOPR time series", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "WOPR"],
      [":", "PROD1"],
      [0, 0],
      ["DAYS", "SM3/DAY"]
    );
    const data = buildUnsmryData([
      [30, 200],
      [60, 180],
    ]);
    const series = extractTimeSeries(hdr, data, "WOPR", "PROD1");
    expect(series[0][1]).toBe(200);
    expect(series[1][1]).toBe(180);
  });

  test("returns empty array for unknown keyword", () => {
    const hdr = buildSmspecHeader(["TIME"], [":"], [0], ["DAYS"]);
    const data = buildUnsmryData([[30]]);
    const series = extractTimeSeries(hdr, data, "NONEXISTENT", ":");
    expect(series).toHaveLength(0);
  });
});

describe("buildSmspecHeader and buildUnsmryData helpers", () => {
  test("buildSmspecHeader creates correct numVectors", () => {
    const hdr = buildSmspecHeader(
      ["TIME", "FOPR", "FOPT"],
      [":", ":", ":"],
      [0, 0, 0],
      ["DAYS", "SM3/DAY", "SM3"],
      [1, 6, 2021]
    );
    expect(hdr.numVectors).toBe(3);
    expect(hdr.startDate).toEqual([1, 6, 2021]);
    expect(hdr.bigEndian).toBe(true);
  });

  test("buildUnsmryData creates correct step count", () => {
    const data = buildUnsmryData([
      [0, 0],
      [30, 500],
      [60, 450],
    ]);
    expect(data.steps).toHaveLength(3);
    expect(data.steps[0].seqnum).toBe(1);
    expect(data.steps[2].seqnum).toBe(3);
  });
});
