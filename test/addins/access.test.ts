/**
 * Tests: Access Add-in validation, SQL formatters, and query builder
 */

import {
  validateJobRecord,
  formatJobForInsert,
  formatCalcSnapshotForInsert,
  buildJobFilterQuery,
  FORM_DEFINITIONS,
  TABLE_SCHEMAS,
  STANDARD_QUERIES,
} from "../../src/addins/access/index";

// ─── validateJobRecord ────────────────────────────────────────────────────────

describe("validateJobRecord", () => {
  const validJob = {
    JobNumber: "J-2025-001",
    ProjectName: "Test Project",
    Engineer: "Alice",
    Status: "Active",
  };

  it("passes for a fully valid record", () => {
    const result = validateJobRecord(validJob);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when JobNumber is missing", () => {
    const result = validateJobRecord({ ...validJob, JobNumber: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes("jobnumber"))).toBe(true);
  });

  it("fails when JobNumber is empty string", () => {
    const result = validateJobRecord({ ...validJob, JobNumber: "   " });
    expect(result.valid).toBe(false);
  });

  it("fails when JobNumber does not match J-YYYY-NNN", () => {
    const result = validateJobRecord({ ...validJob, JobNumber: "2025-001" });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("J-YYYY-NNN"))).toBe(true);
  });

  it("accepts J-YYYY-NNN pattern correctly", () => {
    expect(validateJobRecord({ ...validJob, JobNumber: "J-2024-123" }).valid).toBe(true);
  });

  it("fails when ProjectName is a number", () => {
    const result = validateJobRecord({ ...validJob, ProjectName: 42 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes("projectname"))).toBe(true);
  });

  it("fails when Engineer is not a string", () => {
    const result = validateJobRecord({ ...validJob, Engineer: null });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes("engineer"))).toBe(true);
  });

  it("fails for invalid Status value", () => {
    const result = validateJobRecord({ ...validJob, Status: "Unknown" });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes("status"))).toBe(true);
  });

  it("accepts all valid Status values", () => {
    for (const status of ["Active", "Completed", "On Hold", "Cancelled"]) {
      expect(validateJobRecord({ ...validJob, Status: status }).valid).toBe(true);
    }
  });

  it("passes when Status is undefined (optional)", () => {
    const { Status: _, ...rest } = validJob;
    expect(validateJobRecord(rest).valid).toBe(true);
  });

  it("collects multiple errors simultaneously", () => {
    const result = validateJobRecord({ JobNumber: 123, ProjectName: 0, Engineer: undefined, Status: "Bad" });
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ─── formatJobForInsert ───────────────────────────────────────────────────────

describe("formatJobForInsert", () => {
  const job = {
    JobNumber: "J-2025-001",
    ProjectName: "Pipeline Study",
    ClientID: 5,
    Engineer: "Bob",
    DateCreated: "2025-01-15",
    Status: "Active",
  };

  it("returns a string", () => {
    expect(typeof formatJobForInsert(job)).toBe("string");
  });

  it("contains INSERT INTO tblJobs", () => {
    expect(formatJobForInsert(job)).toContain("INSERT INTO tblJobs");
  });

  it("contains the job number", () => {
    expect(formatJobForInsert(job)).toContain("J-2025-001");
  });

  it("contains the project name", () => {
    expect(formatJobForInsert(job)).toContain("Pipeline Study");
  });

  it("contains ClientID as integer", () => {
    expect(formatJobForInsert(job)).toContain("5");
  });

  it("defaults Status to Active when omitted", () => {
    const { Status: _, ...rest } = job;
    expect(formatJobForInsert(rest)).toContain("Active");
  });

  it("uses NULL for optional DateDue when omitted", () => {
    expect(formatJobForInsert(job)).toContain("NULL");
  });

  it("includes DateDue when provided", () => {
    expect(formatJobForInsert({ ...job, DateDue: "2025-06-30" })).toContain("2025-06-30");
  });

  it("escapes single quotes in project name", () => {
    const sql = formatJobForInsert({ ...job, ProjectName: "O'Brien Pipeline" });
    expect(sql).toContain("O''Brien");
  });
});

// ─── formatCalcSnapshotForInsert ──────────────────────────────────────────────

describe("formatCalcSnapshotForInsert", () => {
  const snap = {
    JobID: 7,
    CalcType: "pipe-sizing",
    Name: "Case A — 2-inch steel",
    Engineer: "Alice",
    InputsJSON: '{"flow":50000}',
    ResultsJSON: '{"velocity":25}',
  };

  it("returns a string", () => {
    expect(typeof formatCalcSnapshotForInsert(snap)).toBe("string");
  });

  it("contains INSERT INTO tblCalcSnapshots", () => {
    expect(formatCalcSnapshotForInsert(snap)).toContain("INSERT INTO tblCalcSnapshots");
  });

  it("includes CalcType", () => {
    expect(formatCalcSnapshotForInsert(snap)).toContain("pipe-sizing");
  });

  it("includes snapshot name", () => {
    expect(formatCalcSnapshotForInsert(snap)).toContain("Case A");
  });

  it("includes JobID", () => {
    expect(formatCalcSnapshotForInsert(snap)).toContain("7");
  });

  it("uses NULL for JobID when omitted", () => {
    const { JobID: _, ...rest } = snap;
    expect(formatCalcSnapshotForInsert(rest)).toContain("NULL");
  });

  it("includes InputsJSON", () => {
    expect(formatCalcSnapshotForInsert(snap)).toContain('"flow"');
  });

  it("includes ResultsJSON", () => {
    expect(formatCalcSnapshotForInsert(snap)).toContain('"velocity"');
  });
});

// ─── buildJobFilterQuery ──────────────────────────────────────────────────────

describe("buildJobFilterQuery", () => {
  it("returns a SELECT from tblJobs", () => {
    expect(buildJobFilterQuery({})).toContain("FROM tblJobs");
  });

  it("joins tblClients", () => {
    expect(buildJobFilterQuery({})).toContain("tblClients");
  });

  it("has no WHERE clause when no filters", () => {
    const sql = buildJobFilterQuery({});
    expect(sql).not.toContain("WHERE");
  });

  it("adds WHERE for status filter", () => {
    const sql = buildJobFilterQuery({ status: "Active" });
    expect(sql).toContain("WHERE");
    expect(sql).toContain("Active");
  });

  it("adds WHERE for engineer filter", () => {
    const sql = buildJobFilterQuery({ engineer: "Alice" });
    expect(sql).toContain("WHERE");
    expect(sql).toContain("Alice");
  });

  it("adds WHERE for clientId filter", () => {
    const sql = buildJobFilterQuery({ clientId: 3 });
    expect(sql).toContain("WHERE");
    expect(sql).toContain("3");
  });

  it("adds date range conditions", () => {
    const sql = buildJobFilterQuery({ dateFrom: "2025-01-01", dateTo: "2025-12-31" });
    expect(sql).toContain("2025-01-01");
    expect(sql).toContain("2025-12-31");
  });

  it("combines multiple filters with AND", () => {
    const sql = buildJobFilterQuery({ status: "Active", engineer: "Bob" });
    expect(sql).toContain("AND");
    expect(sql).toContain("Active");
    expect(sql).toContain("Bob");
  });

  it("includes ORDER BY clause", () => {
    expect(buildJobFilterQuery({})).toContain("ORDER BY");
  });
});

// ─── FORM_DEFINITIONS ────────────────────────────────────────────────────────

describe("FORM_DEFINITIONS", () => {
  it("has 4 form definitions", () => {
    expect(FORM_DEFINITIONS).toHaveLength(4);
  });

  it("includes frmJobEntry", () => {
    expect(FORM_DEFINITIONS.some(f => f.name === "frmJobEntry")).toBe(true);
  });

  it("includes frmPipeInventory", () => {
    expect(FORM_DEFINITIONS.some(f => f.name === "frmPipeInventory")).toBe(true);
  });

  it("includes frmWellEntry", () => {
    expect(FORM_DEFINITIONS.some(f => f.name === "frmWellEntry")).toBe(true);
  });

  it("includes frmCalcSnapshot", () => {
    expect(FORM_DEFINITIONS.some(f => f.name === "frmCalcSnapshot")).toBe(true);
  });

  it("each form has a table, description, and fields array", () => {
    for (const f of FORM_DEFINITIONS) {
      expect(f).toHaveProperty("table");
      expect(f).toHaveProperty("description");
      expect(Array.isArray(f.fields)).toBe(true);
      expect(f.fields.length).toBeGreaterThan(0);
    }
  });

  it("frmJobEntry maps to tblJobs", () => {
    const f = FORM_DEFINITIONS.find(f => f.name === "frmJobEntry");
    expect(f?.table).toBe("tblJobs");
  });
});

// ─── Pre-existing constants (smoke tests) ─────────────────────────────────────

describe("TABLE_SCHEMAS", () => {
  it("has at least 5 tables", () => {
    expect(TABLE_SCHEMAS.length).toBeGreaterThanOrEqual(5);
  });

  it("includes tblJobs", () => {
    expect(TABLE_SCHEMAS.some(t => t.name === "tblJobs")).toBe(true);
  });
});

describe("STANDARD_QUERIES", () => {
  it("includes qryActiveJobs", () => {
    expect(STANDARD_QUERIES).toHaveProperty("qryActiveJobs");
  });

  it("qryActiveJobs is a SELECT statement", () => {
    expect(STANDARD_QUERIES["qryActiveJobs"]).toContain("SELECT");
  });
});
