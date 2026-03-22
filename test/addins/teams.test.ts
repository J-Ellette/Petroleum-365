/**
 * Tests: Teams Add-in — Adaptive Card builders & bot utilities
 */

import {
  buildTeamsAdaptiveCard,
  EQUIVALENT_LENGTHS,
  getBotEquivalentLength,
  formatBotELAnswer,
  buildPipeSizingCard,
  buildWellPerformanceCard,
  buildGasCompositionCard,
  buildBotFaqResponse,
  buildCalculatorCard,
} from "../../src/addins/teams/index";

// ─── buildTeamsAdaptiveCard ───────────────────────────────────────────────────

describe("buildTeamsAdaptiveCard", () => {
  const card = buildTeamsAdaptiveCard("Test Title", { "Key": "Value" }, "Test source") as any;

  it("returns an object with type AdaptiveCard", () => {
    expect(card.type).toBe("AdaptiveCard");
  });

  it("has a body array", () => {
    expect(Array.isArray(card.body)).toBe(true);
  });

  it("contains the title in the first TextBlock", () => {
    expect(card.body[0].text).toContain("Test Title");
  });

  it("FactSet contains the key-value pair", () => {
    const factSet = card.body.find((b: any) => b.type === "FactSet");
    expect(factSet).toBeDefined();
    expect(factSet.facts[0].title).toBe("Key");
    expect(factSet.facts[0].value).toBe("Value");
  });

  it("has actions with an OpenUrl action", () => {
    expect(Array.isArray(card.actions)).toBe(true);
    expect(card.actions[0].type).toBe("Action.OpenUrl");
  });
});

// ─── EQUIVALENT_LENGTHS ──────────────────────────────────────────────────────

describe("EQUIVALENT_LENGTHS", () => {
  it("has entry for 2-inch pipe", () => {
    expect(EQUIVALENT_LENGTHS["2.0"]).toBeDefined();
  });

  it("2-inch globe-valve is 75 ft", () => {
    expect(EQUIVALENT_LENGTHS["2.0"]["globe-valve"]).toBe(75);
  });
});

// ─── getBotEquivalentLength ───────────────────────────────────────────────────

describe("getBotEquivalentLength", () => {
  it("returns correct EL for 1-inch 90-elbow", () => {
    expect(getBotEquivalentLength("1.0", "90-elbow")).toBeCloseTo(2.2);
  });

  it("returns null for unknown pipe size", () => {
    expect(getBotEquivalentLength("99.0", "90-elbow")).toBeNull();
  });

  it("returns null for unknown fitting type", () => {
    expect(getBotEquivalentLength("2.0", "butterfly-valve")).toBeNull();
  });
});

// ─── formatBotELAnswer ────────────────────────────────────────────────────────

describe("formatBotELAnswer", () => {
  it("returns a string with the EL value for known inputs", () => {
    const answer = formatBotELAnswer("2.0", "globe-valve");
    expect(answer).toContain("75 ft");
  });

  it("returns an error message for unknown fitting", () => {
    const answer = formatBotELAnswer("2.0", "butterfly-valve");
    expect(answer).toContain("couldn't find");
  });
});

// ─── buildPipeSizingCard ──────────────────────────────────────────────────────

describe("buildPipeSizingCard", () => {
  const baseParams = {
    jobName:              "Main Street Gas Line",
    inletPressure_psig:   2.0,
    outletPressure_psig:  0.25,
    flowRate_scfh:        35000,
    pipeLength_ft:        520,
    nominalPipeSize_in:   2,
    material:             "Schedule 40 Steel",
    capacity_BTUh:        35700000,
    velocity_fts:         25,
  };

  it("returns an object with type AdaptiveCard", () => {
    const card = buildPipeSizingCard(baseParams) as any;
    expect(card.type).toBe("AdaptiveCard");
  });

  it("has a body array", () => {
    const card = buildPipeSizingCard(baseParams) as any;
    expect(Array.isArray(card.body)).toBe(true);
  });

  it("includes job name in TextBlock", () => {
    const card = buildPipeSizingCard(baseParams) as any;
    const titleBlock = card.body[0];
    expect(titleBlock.text).toContain("Main Street Gas Line");
  });

  it("does NOT show warning when velocity < 40 ft/s", () => {
    const card = buildPipeSizingCard(baseParams) as any;
    const warningBlocks = card.body.filter(
      (b: any) => b.color === "Attention",
    );
    expect(warningBlocks).toHaveLength(0);
  });

  it("shows warning when velocity >= 40 ft/s", () => {
    const card = buildPipeSizingCard({ ...baseParams, velocity_fts: 45 }) as any;
    const warningBlocks = card.body.filter(
      (b: any) => b.color === "Attention",
    );
    expect(warningBlocks.length).toBeGreaterThan(0);
  });

  it("warning message mentions the velocity threshold", () => {
    const card = buildPipeSizingCard({ ...baseParams, velocity_fts: 42 }) as any;
    const warning = card.body.find((b: any) => b.color === "Attention") as any;
    expect(warning.text).toContain("42");
  });

  it("has FactSet with velocity entry", () => {
    const card = buildPipeSizingCard(baseParams) as any;
    const factSet = card.body.find((b: any) => b.type === "FactSet") as any;
    const velocityFact = factSet.facts.find((f: any) => f.title.includes("Velocity"));
    expect(velocityFact).toBeDefined();
    expect(velocityFact.value).toContain("25");
  });
});

// ─── buildWellPerformanceCard ─────────────────────────────────────────────────

describe("buildWellPerformanceCard", () => {
  const params = {
    wellName:               "Well-C5",
    operatingRate_STBd:     1200,
    operatingPwf_psia:      1800,
    reservoirPressure_psia: 3200,
    skin:                   -3.5,
    pi_STBdPsi:             0.857,
  };
  const card = buildWellPerformanceCard(params) as any;

  it("returns an object with type AdaptiveCard", () => {
    expect(card.type).toBe("AdaptiveCard");
  });

  it("has a body array", () => {
    expect(Array.isArray(card.body)).toBe(true);
  });

  it("title TextBlock contains well name", () => {
    expect(card.body[0].text).toContain("Well-C5");
  });

  it("FactSet contains reservoir pressure", () => {
    const factSet = card.body.find((b: any) => b.type === "FactSet") as any;
    const prFact = factSet.facts.find((f: any) => f.title.includes("Reservoir"));
    expect(prFact).toBeDefined();
    expect(prFact.value).toContain("3200");
  });

  it("FactSet contains skin factor", () => {
    const factSet = card.body.find((b: any) => b.type === "FactSet") as any;
    const skinFact = factSet.facts.find((f: any) => f.title.includes("Skin"));
    expect(skinFact).toBeDefined();
    expect(skinFact.value).toContain("-3.50");
  });
});

// ─── buildGasCompositionCard ──────────────────────────────────────────────────

describe("buildGasCompositionCard", () => {
  const params = {
    sampleId:        "GAS-2024-007",
    molarMass_lbMol: 17.92,
    hhv_BTUscf:      1035.2,
    lhv_BTUscf:      931.8,
    wobbeIndex:      1300.0,
    specificGravity: 0.618,
  };
  const card = buildGasCompositionCard(params) as any;

  it("returns an object with type AdaptiveCard", () => {
    expect(card.type).toBe("AdaptiveCard");
  });

  it("has a body array", () => {
    expect(Array.isArray(card.body)).toBe(true);
  });

  it("title TextBlock contains sample ID", () => {
    expect(card.body[0].text).toContain("GAS-2024-007");
  });

  it("FactSet contains HHV value", () => {
    const factSet = card.body.find((b: any) => b.type === "FactSet") as any;
    const hhvFact = factSet.facts.find((f: any) => f.title.includes("HHV"));
    expect(hhvFact).toBeDefined();
    expect(hhvFact.value).toContain("1035");
  });

  it("FactSet contains Wobbe index", () => {
    const factSet = card.body.find((b: any) => b.type === "FactSet") as any;
    const wobbeFact = factSet.facts.find((f: any) => f.title.includes("Wobbe"));
    expect(wobbeFact).toBeDefined();
    expect(wobbeFact.value).toContain("1300");
  });
});

// ─── buildBotFaqResponse ──────────────────────────────────────────────────────

describe("buildBotFaqResponse", () => {
  it("returns non-null for 'weymouth'", () => {
    expect(buildBotFaqResponse("Tell me about the weymouth equation")).not.toBeNull();
  });

  it("Weymouth answer mentions gas pipeline", () => {
    const ans = buildBotFaqResponse("weymouth");
    expect(ans).toContain("gas");
  });

  it("returns non-null for 'z-factor'", () => {
    expect(buildBotFaqResponse("What is z-factor?")).not.toBeNull();
  });

  it("returns non-null for 'zfactor'", () => {
    expect(buildBotFaqResponse("explain zfactor please")).not.toBeNull();
  });

  it("Z-factor answer mentions compressibility", () => {
    const ans = buildBotFaqResponse("z-factor");
    expect(ans!.toLowerCase()).toContain("compressib");
  });

  it("returns non-null for 'vogel'", () => {
    expect(buildBotFaqResponse("how does vogel ipr work?")).not.toBeNull();
  });

  it("Vogel answer mentions IPR", () => {
    const ans = buildBotFaqResponse("vogel");
    expect(ans!.toUpperCase()).toContain("IPR");
  });

  it("returns non-null for 'arps'", () => {
    expect(buildBotFaqResponse("explain arps decline")).not.toBeNull();
  });

  it("Arps answer mentions decline", () => {
    const ans = buildBotFaqResponse("arps");
    expect(ans!.toLowerCase()).toContain("decline");
  });

  it("returns non-null for 'skin'", () => {
    expect(buildBotFaqResponse("what is skin factor?")).not.toBeNull();
  });

  it("skin answer mentions damage or stimulation", () => {
    const ans = buildBotFaqResponse("skin");
    expect(ans!.toLowerCase()).toMatch(/damage|stimulation/);
  });

  it("returns non-null for 'ogip'", () => {
    expect(buildBotFaqResponse("how to calculate ogip?")).not.toBeNull();
  });

  it("returns non-null for 'original gas'", () => {
    expect(buildBotFaqResponse("what is original gas in place?")).not.toBeNull();
  });

  it("returns non-null for 'hhv'", () => {
    expect(buildBotFaqResponse("difference between hhv and lhv")).not.toBeNull();
  });

  it("returns non-null for 'heating value'", () => {
    expect(buildBotFaqResponse("explain heating value")).not.toBeNull();
  });

  it("HHV answer mentions LHV", () => {
    const ans = buildBotFaqResponse("hhv");
    expect(ans!.toUpperCase()).toContain("LHV");
  });

  it("returns null for unrecognised question", () => {
    expect(buildBotFaqResponse("what is the weather forecast?")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(buildBotFaqResponse("WEYMOUTH")).not.toBeNull();
  });
});

// ─── buildCalculatorCard ──────────────────────────────────────────────────────

describe("buildCalculatorCard", () => {
  const inputs  = { "Flow Rate (scfh)": "45000", "Pipe Length (ft)": "800" };
  const results = { "Pipe Size (in)": "3", "Pressure Drop (psig)": "0.95" };
  const card    = buildCalculatorCard("Weymouth Pipe Sizing", inputs, results) as any;

  it("returns an object with type AdaptiveCard", () => {
    expect(card.type).toBe("AdaptiveCard");
  });

  it("has a body array", () => {
    expect(Array.isArray(card.body)).toBe(true);
  });

  it("title TextBlock contains calc name", () => {
    expect(card.body[0].text).toContain("Weymouth Pipe Sizing");
  });

  it("has two FactSets (inputs and results)", () => {
    const factSets = card.body.filter((b: any) => b.type === "FactSet");
    expect(factSets).toHaveLength(2);
  });

  it("inputs FactSet contains flow rate entry", () => {
    const factSets = card.body.filter((b: any) => b.type === "FactSet");
    const flowFact = factSets[0].facts.find((f: any) => f.title.includes("Flow Rate"));
    expect(flowFact).toBeDefined();
    expect(flowFact.value).toBe("45000");
  });

  it("results FactSet contains pipe size entry", () => {
    const factSets = card.body.filter((b: any) => b.type === "FactSet");
    const pipeFact = factSets[1].facts.find((f: any) => f.title.includes("Pipe Size"));
    expect(pipeFact).toBeDefined();
    expect(pipeFact.value).toBe("3");
  });

  it("has actions with an OpenUrl action", () => {
    expect(Array.isArray(card.actions)).toBe(true);
    expect(card.actions[0].type).toBe("Action.OpenUrl");
  });
});
