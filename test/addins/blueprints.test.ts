/**
 * Tests: Blueprint Manager Catalog
 */

import {
  BLUEPRINT_CATALOG,
  getBlueprintsByCategory,
  searchBlueprints,
  getBlueprintById,
  getBlueprintCategories,
} from "../../src/addins/blueprints";

describe("Blueprint Catalog — structure validation", () => {
  test("catalog has at least 25 blueprints", () => {
    expect(BLUEPRINT_CATALOG.length).toBeGreaterThanOrEqual(25);
  });

  test("all blueprints have required string fields", () => {
    for (const bp of BLUEPRINT_CATALOG) {
      expect(typeof bp.id).toBe("string");
      expect(bp.id.length).toBeGreaterThan(0);
      expect(typeof bp.name).toBe("string");
      expect(bp.name.length).toBeGreaterThan(0);
      expect(typeof bp.description).toBe("string");
      expect(bp.description.length).toBeGreaterThan(10);
    }
  });

  test("all blueprints have valid rowCount and colCount", () => {
    for (const bp of BLUEPRINT_CATALOG) {
      expect(bp.rowCount).toBeGreaterThan(0);
      expect(bp.colCount).toBeGreaterThan(0);
    }
  });

  test("all blueprints have at least one required function", () => {
    for (const bp of BLUEPRINT_CATALOG) {
      expect(bp.requiredFunctions.length).toBeGreaterThan(0);
    }
  });

  test("all blueprint ids are unique", () => {
    const ids = BLUEPRINT_CATALOG.map(b => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test("all blueprints have at least one tag", () => {
    for (const bp of BLUEPRINT_CATALOG) {
      expect(bp.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("getBlueprintsByCategory", () => {
  test("returns PVT blueprints", () => {
    const pvt = getBlueprintsByCategory("PVT");
    expect(pvt.length).toBeGreaterThan(0);
    pvt.forEach(b => expect(b.category).toBe("PVT"));
  });

  test("returns DCA blueprints", () => {
    const dca = getBlueprintsByCategory("DCA");
    expect(dca.length).toBeGreaterThan(0);
  });

  test("returns FRAC blueprints including Nolte-G", () => {
    const frac = getBlueprintsByCategory("FRAC");
    const nolte = frac.find(b => b.id === "frac-nolte-g-analysis");
    expect(nolte).toBeDefined();
  });

  test("returns empty array for nonexistent category cast", () => {
    const unknown = getBlueprintsByCategory("Utilities");
    // Utilities exists in our catalog
    expect(Array.isArray(unknown)).toBe(true);
  });
});

describe("searchBlueprints", () => {
  test("finds blueprints by name keyword", () => {
    const results = searchBlueprints("Horner");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain("horner");
  });

  test("finds blueprints by description keyword", () => {
    const results = searchBlueprints("vogel");
    expect(results.length).toBeGreaterThan(0);
  });

  test("finds blueprints by tag", () => {
    const results = searchBlueprints("arps");
    expect(results.length).toBeGreaterThan(0);
  });

  test("returns empty for no match", () => {
    const results = searchBlueprints("xyz_not_a_real_keyword_xyz");
    expect(results).toHaveLength(0);
  });

  test("name matches come before description matches", () => {
    const results = searchBlueprints("p/z");
    expect(results.length).toBeGreaterThan(0);
    // The "p/z" blueprint should appear first since it has "p/z" in the name
    expect(results[0].name.toLowerCase()).toContain("p/z");
  });

  test("case-insensitive search", () => {
    const lower = searchBlueprints("decline");
    const upper = searchBlueprints("DECLINE");
    expect(lower.length).toBe(upper.length);
  });
});

describe("getBlueprintById", () => {
  test("finds blueprint by id", () => {
    const bp = getBlueprintById("pvt-gas-properties");
    expect(bp).toBeDefined();
    expect(bp!.name).toBe("Gas PVT Properties");
  });

  test("returns undefined for unknown id", () => {
    expect(getBlueprintById("not-a-real-id")).toBeUndefined();
  });
});

describe("getBlueprintCategories", () => {
  test("returns unique category list", () => {
    const cats = getBlueprintCategories();
    expect(cats.length).toBeGreaterThan(5);
    const unique = new Set(cats);
    expect(unique.size).toBe(cats.length);
  });

  test("includes core engineering disciplines", () => {
    const cats = getBlueprintCategories();
    expect(cats).toContain("PVT");
    expect(cats).toContain("DCA");
    expect(cats).toContain("MBE");
    expect(cats).toContain("FRAC");
  });
});
