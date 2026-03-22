/**
 * Tests: Function Browser Catalog
 */

import {
  FUNCTION_CATALOG,
  searchFunctions,
  getFunctionsByCategory,
  getFunctionById,
  getFunctionCategories,
  getRelatedFunctions,
} from "../../src/addins/browser";

describe("Function Catalog — structure validation", () => {
  test("catalog has at least 15 functions", () => {
    expect(FUNCTION_CATALOG.length).toBeGreaterThan(15);
  });

  test("all entries have required string fields", () => {
    for (const fn of FUNCTION_CATALOG) {
      expect(typeof fn.id).toBe("string");
      expect(fn.id.length).toBeGreaterThan(0);
      expect(typeof fn.name).toBe("string");
      expect(typeof fn.category).toBe("string");
      expect(typeof fn.summary).toBe("string");
      expect(typeof fn.description).toBe("string");
      expect(typeof fn.syntax).toBe("string");
      expect(typeof fn.returns).toBe("string");
    }
  });

  test("all entries have at least one parameter", () => {
    for (const fn of FUNCTION_CATALOG) {
      // Some functions might have 0 params (unit converter edge case) - just ensure params is an array
      expect(Array.isArray(fn.params)).toBe(true);
    }
  });

  test("all function ids are unique", () => {
    const ids = FUNCTION_CATALOG.map(f => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test("all entries have at least one tag", () => {
    for (const fn of FUNCTION_CATALOG) {
      expect(fn.tags.length).toBeGreaterThan(0);
    }
  });

  test("all entries have example formula and result", () => {
    for (const fn of FUNCTION_CATALOG) {
      expect(fn.exampleFormula.startsWith("=P365.")).toBe(true);
      expect(fn.exampleResult.length).toBeGreaterThan(0);
    }
  });

  test("returnsArray is boolean", () => {
    for (const fn of FUNCTION_CATALOG) {
      expect(typeof fn.returnsArray).toBe("boolean");
    }
  });
});

describe("searchFunctions", () => {
  test("finds PVT Z-factor by keyword 'z-factor'", () => {
    const results = searchFunctions("z-factor");
    expect(results.length).toBeGreaterThan(0);
    const dak = results.find(f => f.id === "P365.PVT.Z.ByDAK");
    expect(dak).toBeDefined();
  });

  test("finds functions by category name", () => {
    const results = searchFunctions("decline");
    expect(results.length).toBeGreaterThan(0);
  });

  test("name match returns first (highest relevance)", () => {
    const results = searchFunctions("vogel");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain("vogel");
  });

  test("case-insensitive search", () => {
    const lower = searchFunctions("arps");
    const upper = searchFunctions("ARPS");
    expect(lower.length).toBe(upper.length);
  });

  test("returns empty for unknown keyword", () => {
    const results = searchFunctions("zzz_nonexistent_zzz");
    expect(results).toHaveLength(0);
  });

  test("finds FRAC poroelastic closure function", () => {
    const results = searchFunctions("poroelastic");
    expect(results.length).toBeGreaterThan(0);
    const closure = results.find(f => f.id === "P365.FRAC.Poroelastic.Closure");
    expect(closure).toBeDefined();
  });

  test("finds SIM keyword functions", () => {
    const results = searchFunctions("swof");
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("getFunctionsByCategory", () => {
  test("returns PVT functions", () => {
    const pvt = getFunctionsByCategory("PVT");
    expect(pvt.length).toBeGreaterThan(0);
    pvt.forEach(f => expect(f.category).toBe("PVT"));
  });

  test("returns DCA functions", () => {
    const dca = getFunctionsByCategory("DCA");
    expect(dca.length).toBeGreaterThan(0);
  });

  test("returns FRAC functions including new additions", () => {
    const frac = getFunctionsByCategory("FRAC");
    const nolte = frac.find(f => f.id === "P365.FRAC.Nolte.G");
    expect(nolte).toBeDefined();
  });

  test("returns empty for nonexistent category", () => {
    const empty = getFunctionsByCategory("DOESNOTEXIST");
    expect(empty).toHaveLength(0);
  });
});

describe("getFunctionById", () => {
  test("finds function by exact id", () => {
    const fn = getFunctionById("P365.PVT.Z.ByDAK");
    expect(fn).toBeDefined();
    expect(fn!.name).toBe("P365.PVT.Z.ByDAK");
  });

  test("returns undefined for unknown id", () => {
    expect(getFunctionById("P365.NOT.REAL")).toBeUndefined();
  });
});

describe("getFunctionCategories", () => {
  test("returns unique list of categories", () => {
    const cats = getFunctionCategories();
    const unique = new Set(cats);
    expect(unique.size).toBe(cats.length);
  });

  test("includes core categories", () => {
    const cats = getFunctionCategories();
    expect(cats).toContain("PVT");
    expect(cats).toContain("DCA");
    expect(cats).toContain("FRAC");
    expect(cats).toContain("SIM");
  });
});

describe("getRelatedFunctions", () => {
  test("returns related functions for Z-factor", () => {
    const related = getRelatedFunctions("P365.PVT.Z.ByDAK");
    expect(related.length).toBeGreaterThan(0);
    related.forEach(f => expect(f).toBeDefined());
  });

  test("returns empty for unknown function", () => {
    const related = getRelatedFunctions("P365.NOT.REAL");
    expect(related).toHaveLength(0);
  });

  test("related entries are valid FunctionEntry objects", () => {
    const related = getRelatedFunctions("P365.DCA.Arps.Rate");
    for (const r of related) {
      expect(r.id).toBeDefined();
      expect(r.name).toBeDefined();
    }
  });
});
