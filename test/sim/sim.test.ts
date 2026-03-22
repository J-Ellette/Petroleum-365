/**
 * Tests: Reservoir Simulation INCLUDE File Generator (SIM)
 */

import {
  simSWOF,
  simSGOF,
  simWOTABLE,
  simGOTABLE,
  simPVTO,
  simPVDG,
  simPVTW,
  simKrEndpointTable,
  simGenerateFromTemplate,
  simValidateTokens,
  simBatchGenerate,
  simBuildSwofTable,
  simBuildSgofTable,
} from "../../src/functions/sim";

// ─── SWOF Keyword ─────────────────────────────────────────────────────────────

describe("simSWOF — Eclipse SWOF keyword generator", () => {
  const rows = [
    { Sw: 0.2, krw: 0.0,  krow: 0.8, Pcow: 5.0 },
    { Sw: 0.4, krw: 0.05, krow: 0.4, Pcow: 2.0 },
    { Sw: 0.6, krw: 0.2,  krow: 0.1, Pcow: 0.5 },
    { Sw: 0.8, krw: 0.6,  krow: 0.0, Pcow: 0.0 },
  ];

  test("generates SWOF keyword block", () => {
    const out = simSWOF(rows);
    expect(out).toContain("SWOF");
    expect(out).toContain("/");
  });

  test("contains all saturation values", () => {
    const out = simSWOF(rows);
    expect(out).toContain("0.200000");
    expect(out).toContain("0.800000");
  });

  test("includes region number in comment", () => {
    const out = simSWOF(rows, 2);
    expect(out).toContain("Saturation Region: 2");
  });

  test("includes optional comment", () => {
    const out = simSWOF(rows, 1, "Water-wet sandstone");
    expect(out).toContain("Water-wet sandstone");
  });

  test("throws for fewer than 2 rows", () => {
    expect(() => simSWOF([rows[0]])).toThrow();
  });

  test("output ends with /", () => {
    const out = simSWOF(rows);
    const lines = out.split("\n");
    expect(lines[lines.length - 1]).toBe("/");
  });
});

// ─── SGOF Keyword ─────────────────────────────────────────────────────────────

describe("simSGOF — Eclipse SGOF keyword generator", () => {
  const rows = [
    { Sg: 0.0,  krg: 0.0,  krog: 0.7, Pcgo: 0.0 },
    { Sg: 0.2,  krg: 0.05, krog: 0.4, Pcgo: 0.5 },
    { Sg: 0.5,  krg: 0.3,  krog: 0.1, Pcgo: 1.0 },
    { Sg: 0.75, krg: 0.8,  krog: 0.0, Pcgo: 2.0 },
  ];

  test("generates SGOF keyword block", () => {
    const out = simSGOF(rows);
    expect(out).toContain("SGOF");
    expect(out).toContain("/");
  });

  test("contains all gas saturation values", () => {
    const out = simSGOF(rows);
    expect(out).toContain("0.000000");
    expect(out).toContain("0.750000");
  });

  test("throws for fewer than 2 rows", () => {
    expect(() => simSGOF([rows[0]])).toThrow();
  });
});

// ─── CMG WOTABLE / GOTABLE ────────────────────────────────────────────────────

describe("simWOTABLE — CMG water-oil table", () => {
  const rows = [
    { Sw: 0.2, krw: 0.0, krow: 0.8, Pcow: 3.0 },
    { Sw: 0.7, krw: 0.5, krow: 0.0, Pcow: 0.0 },
  ];

  test("generates WOTABLE keyword", () => {
    const out = simWOTABLE(rows);
    expect(out).toContain("WOTABLE");
    expect(out).toContain("SWT");
  });

  test("table number appears in header", () => {
    const out = simWOTABLE(rows, 3, "Rock 3");
    expect(out).toContain("3");
    expect(out).toContain("Rock 3");
  });

  test("throws for fewer than 2 rows", () => {
    expect(() => simWOTABLE([rows[0]])).toThrow();
  });
});

describe("simGOTABLE — CMG gas-oil table", () => {
  const rows = [
    { Sg: 0.0, krg: 0.0, krog: 0.6, Pcgo: 0.0 },
    { Sg: 0.7, krg: 0.9, krog: 0.0, Pcgo: 0.0 },
  ];

  test("generates GOTABLE keyword", () => {
    const out = simGOTABLE(rows);
    expect(out).toContain("GOTABLE");
    expect(out).toContain("SGT");
  });
});

// ─── PVTO ─────────────────────────────────────────────────────────────────────

describe("simPVTO — Eclipse live-oil PVT table", () => {
  const rows = [
    { Rs: 100, P_bub: 1000, Bo: 1.15, Uo: 2.0 },
    { Rs: 300, P_bub: 2000, Bo: 1.30, Uo: 1.5 },
    { Rs: 600, P_bub: 3500, Bo: 1.55, Uo: 1.0 },
  ];

  test("generates PVTO keyword", () => {
    const out = simPVTO(rows);
    expect(out).toContain("PVTO");
    expect(out).toContain("/");
  });

  test("each Rs block is terminated with /", () => {
    const out = simPVTO(rows);
    const slashCount = (out.match(/^\s*\/\s*$/gm) || []).length;
    // One / per Rs row + final /
    expect(slashCount).toBe(rows.length + 1);
  });

  test("throws for fewer than 2 rows", () => {
    expect(() => simPVTO([rows[0]])).toThrow();
  });

  test("includes undersaturated branch when provided", () => {
    const rowWithUnsat = [
      {
        Rs: 300, P_bub: 2000, Bo: 1.30, Uo: 1.5,
        P_unsat: [3000, 4000], Bo_unsat: [1.28, 1.25], Uo_unsat: [1.6, 1.7],
      },
      { Rs: 600, P_bub: 3500, Bo: 1.55, Uo: 1.0 },
    ];
    const out = simPVTO(rowWithUnsat);
    expect(out).toContain("3000");
    expect(out).toContain("4000");
  });
});

// ─── PVDG ─────────────────────────────────────────────────────────────────────

describe("simPVDG — Eclipse dry-gas PVT table", () => {
  const rows = [
    { P: 1000, Bg: 0.02, Ug: 0.015 },
    { P: 2000, Bg: 0.01, Ug: 0.018 },
    { P: 4000, Bg: 0.005, Ug: 0.022 },
  ];

  test("generates PVDG keyword", () => {
    const out = simPVDG(rows);
    expect(out).toContain("PVDG");
    expect(out).toContain("/");
  });

  test("contains pressure and Bg values", () => {
    const out = simPVDG(rows);
    expect(out).toContain("1000");
    expect(out).toContain("4000");
  });

  test("throws for fewer than 2 rows", () => {
    expect(() => simPVDG([rows[0]])).toThrow();
  });
});

// ─── PVTW ─────────────────────────────────────────────────────────────────────

describe("simPVTW — Eclipse water PVT", () => {
  test("generates PVTW keyword", () => {
    const out = simPVTW(3500, 1.02, 3e-6, 0.31);
    expect(out).toContain("PVTW");
    expect(out).toContain("/");
    expect(out).toContain("3500");
  });

  test("viscosibility defaults to 0", () => {
    const out = simPVTW(3500, 1.02, 3e-6, 0.31);
    expect(out).toContain("0.000000");
  });
});

// ─── SCAL Endpoint Table ──────────────────────────────────────────────────────

describe("simKrEndpointTable — SCAL endpoint summary", () => {
  const endpoints = [
    {
      rockType: "Sandstone A",
      Swi: 0.18, Sorw: 0.22, Sgc: 0.05, Sorg: 0.18,
      krw_Sorw: 0.70, krow_Swi: 0.90, krg_Sorg: 0.85, krog_Sgc: 0.80,
    },
    {
      rockType: "Carbonate B",
      Swi: 0.12, Sorw: 0.30, Sgc: 0.02, Sorg: 0.25,
      krw_Sorw: 0.40, krow_Swi: 1.00, krg_Sorg: 0.90, krog_Sgc: 0.95,
    },
  ];

  test("generates endpoint summary table with both rock types", () => {
    const out = simKrEndpointTable(endpoints);
    expect(out).toContain("Sandstone A");
    expect(out).toContain("Carbonate B");
  });

  test("table is formatted as comment lines", () => {
    const out = simKrEndpointTable(endpoints);
    const lines = out.split("\n");
    lines.forEach(line => expect(line.startsWith("--")).toBe(true));
  });

  test("contains Swi and Sorw values", () => {
    const out = simKrEndpointTable(endpoints);
    expect(out).toContain("0.1800");
    expect(out).toContain("0.3000");
  });
});

// ─── File Generator ───────────────────────────────────────────────────────────

describe("simGenerateFromTemplate — token substitution", () => {
  const template = "PERMX @PERM\nPORO @PHI\nNTG @NTG";

  test("replaces all tokens", () => {
    const out = simGenerateFromTemplate(template, { PERM: 100, PHI: 0.25, NTG: 0.8 });
    expect(out).toBe("PERMX 100\nPORO 0.25\nNTG 0.8");
  });

  test("case-insensitive token matching", () => {
    const out = simGenerateFromTemplate("PERMX @perm", { PERM: 250 });
    expect(out).toBe("PERMX 250");
  });

  test("throws for missing tokens", () => {
    expect(() => simGenerateFromTemplate(template, { PERM: 100 })).toThrow(/PHI|NTG/);
  });

  test("string and number tokens both work", () => {
    const out = simGenerateFromTemplate("CASE @CASE_NAME", { CASE_NAME: "base_case" });
    expect(out).toBe("CASE base_case");
  });

  test("repeated token replaced everywhere", () => {
    const out = simGenerateFromTemplate("@X and @X again", { X: "42" });
    expect(out).toBe("42 and 42 again");
  });
});

describe("simValidateTokens — missing token detection", () => {
  test("returns empty for all provided", () => {
    const missing = simValidateTokens("@A @B @C", { A: 1, B: 2, C: 3 });
    expect(missing).toHaveLength(0);
  });

  test("returns missing token names", () => {
    const missing = simValidateTokens("@A @B @C", { A: 1 });
    expect(missing).toContain("B");
    expect(missing).toContain("C");
  });

  test("no tokens in template → no missing", () => {
    const missing = simValidateTokens("no tokens here", {});
    expect(missing).toHaveLength(0);
  });
});

describe("simBatchGenerate — multiple case file generation", () => {
  const template = "PERM @PERM\nPORO @PHI";
  const cases = [
    { caseName: "case_01", tokens: { PERM: 100, PHI: 0.2 } },
    { caseName: "case_02", tokens: { PERM: 200, PHI: 0.25 } },
    { caseName: "case_03", tokens: { PERM: 500, PHI: 0.3 } },
  ];

  test("returns one output per case", () => {
    const results = simBatchGenerate(template, cases);
    expect(results).toHaveLength(3);
  });

  test("case names preserved", () => {
    const results = simBatchGenerate(template, cases);
    expect(results[0].caseName).toBe("case_01");
    expect(results[2].caseName).toBe("case_03");
  });

  test("content rendered correctly per case", () => {
    const results = simBatchGenerate(template, cases);
    expect(results[0].content).toBe("PERM 100\nPORO 0.2");
    expect(results[1].content).toBe("PERM 200\nPORO 0.25");
  });

  test("throws if any case has missing tokens", () => {
    const badCases = [{ caseName: "bad", tokens: { PERM: 100 } }];
    expect(() => simBatchGenerate(template, badCases)).toThrow();
  });
});

// ─── Corey Table Builders ─────────────────────────────────────────────────────

describe("simBuildSwofTable — Corey SWOF table builder", () => {
  const Swi = 0.2, Sorw = 0.2, krw_max = 0.8, krow_max = 0.9, nw = 3, no = 2;

  test("returns nPoints rows", () => {
    const rows = simBuildSwofTable(Swi, Sorw, krw_max, krow_max, nw, no, 10);
    expect(rows).toHaveLength(10);
  });

  test("default 20 points", () => {
    const rows = simBuildSwofTable(Swi, Sorw, krw_max, krow_max, nw, no);
    expect(rows).toHaveLength(20);
  });

  test("first row at Swi: krw=0, krow=krow_max", () => {
    const rows = simBuildSwofTable(Swi, Sorw, krw_max, krow_max, nw, no);
    expect(rows[0].Sw).toBeCloseTo(Swi, 4);
    expect(rows[0].krw).toBeCloseTo(0, 4);
    expect(rows[0].krow).toBeCloseTo(krow_max, 4);
  });

  test("last row at Sw=1: krow=0, krw=krw_max", () => {
    const rows = simBuildSwofTable(Swi, Sorw, krw_max, krow_max, nw, no);
    const last = rows[rows.length - 1];
    expect(last.Sw).toBeCloseTo(1.0, 4);
    expect(last.krow).toBeCloseTo(0, 4);
    expect(last.krw).toBeCloseTo(krw_max, 4);
  });

  test("monotonically increasing krw", () => {
    const rows = simBuildSwofTable(Swi, Sorw, krw_max, krow_max, nw, no);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].krw).toBeGreaterThanOrEqual(rows[i - 1].krw);
    }
  });

  test("monotonically decreasing krow", () => {
    const rows = simBuildSwofTable(Swi, Sorw, krw_max, krow_max, nw, no);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].krow).toBeLessThanOrEqual(rows[i - 1].krow);
    }
  });

  test("throws for invalid Swi+Sorw", () => {
    expect(() => simBuildSwofTable(0.5, 0.6, 0.8, 0.9, 3, 2)).toThrow();
  });

  test("SWOF output from table builder is valid", () => {
    const rows = simBuildSwofTable(Swi, Sorw, krw_max, krow_max, nw, no);
    const out = simSWOF(rows);
    expect(out).toContain("SWOF");
    expect(out).toContain("/");
  });
});

describe("simBuildSgofTable — Corey SGOF table builder", () => {
  const Swi = 0.2, Sgc = 0.05, Sorg = 0.15, krg_max = 0.9, krog_max = 0.8, ng = 2, nog = 3;

  test("returns nPoints rows", () => {
    const rows = simBuildSgofTable(Swi, Sgc, Sorg, krg_max, krog_max, ng, nog, 15);
    expect(rows).toHaveLength(15);
  });

  test("first row at Sgc: krg=0", () => {
    const rows = simBuildSgofTable(Swi, Sgc, Sorg, krg_max, krog_max, ng, nog);
    expect(rows[0].Sg).toBeCloseTo(Sgc, 4);
    expect(rows[0].krg).toBeCloseTo(0, 4);
  });

  test("monotonically increasing krg", () => {
    const rows = simBuildSgofTable(Swi, Sgc, Sorg, krg_max, krog_max, ng, nog);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].krg).toBeGreaterThanOrEqual(rows[i - 1].krg);
    }
  });

  test("throws for invalid saturations", () => {
    expect(() => simBuildSgofTable(0.5, 0.3, 0.3, 0.9, 0.8, 2, 3)).toThrow();
  });

  test("SGOF output from table builder is valid", () => {
    const rows = simBuildSgofTable(Swi, Sgc, Sorg, krg_max, krog_max, ng, nog);
    const out = simSGOF(rows);
    expect(out).toContain("SGOF");
    expect(out).toContain("/");
  });
});
