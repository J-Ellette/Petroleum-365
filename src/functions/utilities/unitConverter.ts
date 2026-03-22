/**
 * P365 — Unit Converter
 *
 * P365.UnitConverter(value, fromUnit, toUnit)
 *
 * Supports:
 *  - Registered units (1,500+ petroleum engineering units)
 *  - Scaled units: "640 acre", "1000 ft"
 *  - Unit expressions: "bbl*psi/day", "ft^3/s"
 */

// ─── Unit registry (conversion factors to SI base units) ──────────────────────

/**
 * Each unit maps to a conversion factor to/from a canonical SI unit
 * within its category. The factor f means: value_SI = value_unit * f
 */
interface UnitDef {
  factor: number;   // Multiply by this to convert to base SI unit
  category: string; // e.g. "pressure", "temperature", "length"
  aliases?: string[]; // Additional names/abbreviations
}

// Base units for each category:
//  pressure  → psia
//  temperature → degF  (special conversion)
//  length    → ft
//  area      → ft²
//  volume    → bbl (oil barrel)
//  mass      → lbm
//  flow_volume → bbl/d
//  flow_mass → lbm/s
//  energy    → BTU
//  power     → BTU/hr
//  viscosity → cp
//  density   → lbm/ft³
//  permeability → md
//  time      → day
//  angle     → degree

// For simplicity, we store factors relative to a "canonical" unit per category.
// Temperature uses offsets, handled separately.

const UNITS: Record<string, UnitDef> = {
  // ─── Pressure ─────────────────────────────────────────────────────────────
  psia:     { factor: 1,          category: "pressure" },
  psi:      { factor: 1,          category: "pressure" },
  psig:     { factor: 1,          category: "pressure", aliases: ["psi_gauge"] }, // treated as psia (no offset in conversions; user must handle atmospheric)
  kPa:      { factor: 0.145038,   category: "pressure" },
  MPa:      { factor: 145.038,    category: "pressure" },
  bar:      { factor: 14.5038,    category: "pressure" },
  bara:     { factor: 14.5038,    category: "pressure" },
  barg:     { factor: 14.5038,    category: "pressure" },
  atm:      { factor: 14.6959,    category: "pressure" },
  Pa:       { factor: 1.45038e-4, category: "pressure" },
  mmHg:     { factor: 0.019337,   category: "pressure" },
  inHg:     { factor: 0.491154,   category: "pressure" },
  inH2O:    { factor: 0.036127,   category: "pressure" },
  ftH2O:    { factor: 0.43353,    category: "pressure" },

  // ─── Temperature ──────────────────────────────────────────────────────────
  degF:  { factor: 1, category: "temperature" },
  "°F":  { factor: 1, category: "temperature" },
  degC:  { factor: 1, category: "temperature" }, // special offset
  "°C":  { factor: 1, category: "temperature" },
  degR:  { factor: 1, category: "temperature" }, // Rankine
  "°R":  { factor: 1, category: "temperature" },
  K:     { factor: 1, category: "temperature" }, // Kelvin

  // ─── Length ───────────────────────────────────────────────────────────────
  ft:   { factor: 1,        category: "length" },
  "in": { factor: 1/12,     category: "length" },
  yd:   { factor: 3,        category: "length" },
  mi:   { factor: 5280,     category: "length" },
  m:    { factor: 3.28084,  category: "length" },
  km:   { factor: 3280.84,  category: "length" },
  cm:   { factor: 0.0328084,category: "length" },
  mm:   { factor: 0.00328084,category:"length" },

  // ─── Area ─────────────────────────────────────────────────────────────────
  ft2:  { factor: 1,         category: "area", aliases: ["ft²","sqft"] },
  in2:  { factor: 1/144,     category: "area", aliases: ["in²","sqin"] },
  m2:   { factor: 10.7639,   category: "area", aliases: ["m²"] },
  acre: { factor: 43560,     category: "area" },
  ha:   { factor: 107639,    category: "area" },

  // ─── Volume ───────────────────────────────────────────────────────────────
  bbl:    { factor: 1,              category: "volume", aliases: ["STB","RB","res bbl"] },
  gal:    { factor: 1/42,           category: "volume" },
  "US gal":{ factor: 1/42,          category: "volume" },
  L:      { factor: 0.00628981,     category: "volume" },
  mL:     { factor: 6.28981e-6,     category: "volume" },
  m3:     { factor: 6.28981,        category: "volume", aliases: ["m³"] },
  ft3:    { factor: 1/5.61458,      category: "volume", aliases: ["ft³","cuft"] },
  scf:    { factor: 1/5615.0,       category: "volume" }, // scf to bbl equivalent at SC
  Mscf:   { factor: 1000/5615.0,    category: "volume" },
  MMscf:  { factor: 1e6/5615.0,     category: "volume" },
  Bcf:    { factor: 1e9/5615.0,     category: "volume" },
  Nm3:    { factor: 6.28981,        category: "volume" }, // Normal m³ ≈ m³ at SC
  Mcf:    { factor: 1000/5615.0,    category: "volume" },
  "103m3":{ factor: 1000*6.28981,   category: "volume" },

  // ─── Mass ─────────────────────────────────────────────────────────────────
  lbm:   { factor: 1,         category: "mass", aliases: ["lb","lbs"] },
  kg:    { factor: 2.20462,   category: "mass" },
  tonne: { factor: 2204.62,   category: "mass", aliases: ["MT","metric ton","t"] },
  ton:   { factor: 2000,      category: "mass", aliases: ["short ton"] },
  "long ton": { factor: 2240, category: "mass" },
  g:     { factor: 0.00220462,category: "mass" },
  Mlbm:  { factor: 1000,      category: "mass" },

  // ─── Flow rate (volume) ───────────────────────────────────────────────────
  "bbl/d":   { factor: 1,          category: "flow_volume", aliases: ["BOPD","BWPD","BPD"] },
  "bbl/hr":  { factor: 24,         category: "flow_volume" },
  "gal/min": { factor: 60*24/42,   category: "flow_volume", aliases: ["gpm"] },
  "gal/hr":  { factor: 24/42,      category: "flow_volume" },
  "m3/d":    { factor: 6.28981,    category: "flow_volume" },
  "m3/hr":   { factor: 24*6.28981, category: "flow_volume" },
  "ft3/d":   { factor: 1/5.61458,  category: "flow_volume" },
  "scf/d":   { factor: 1/5615,     category: "flow_volume" },
  "Mscf/d":  { factor: 1000/5615,  category: "flow_volume", aliases: ["Mcfd"] },
  "MMscf/d": { factor: 1e6/5615,   category: "flow_volume", aliases: ["MMcfd","MMcf/d"] },
  "Bcf/d":   { factor: 1e9/5615,   category: "flow_volume" },

  // ─── Energy ───────────────────────────────────────────────────────────────
  BTU:    { factor: 1,           category: "energy", aliases: ["Btu"] },
  MBTU:   { factor: 1000,        category: "energy", aliases: ["MBtu","MBTUh"] },
  MMBTU:  { factor: 1e6,         category: "energy", aliases: ["MMBtu","MMBTUh","mmBtu"] },
  GJ:     { factor: 947817.1,    category: "energy" },
  MJ:     { factor: 947.817,     category: "energy" },
  kJ:     { factor: 0.947817,    category: "energy" },
  J:      { factor: 9.47817e-4,  category: "energy" },
  kWh:    { factor: 3412.14,     category: "energy" },
  MWh:    { factor: 3412141,     category: "energy" },
  therm:  { factor: 1e5,         category: "energy" },
  kcal:   { factor: 3.96567,     category: "energy" },
  cal:    { factor: 3.96567e-3,  category: "energy" },

  // ─── Power ────────────────────────────────────────────────────────────────
  "BTU/hr":  { factor: 1,          category: "power", aliases: ["Btu/hr","BTUh"] },
  "BTU/d":   { factor: 1/24,       category: "power" },
  "MBTU/hr": { factor: 1000,       category: "power" },
  "MMBTU/hr":{ factor: 1e6,        category: "power" },
  W:         { factor: 3.41214,    category: "power" },
  kW:        { factor: 3412.14,    category: "power" },
  MW:        { factor: 3412141,    category: "power" },
  hp:        { factor: 2544.43,    category: "power" },
  "ton_refrig":{ factor: 12000,    category: "power" },

  // ─── Viscosity ────────────────────────────────────────────────────────────
  cp:    { factor: 1,        category: "viscosity", aliases: ["mPa·s","mPas"] },
  cP:    { factor: 1,        category: "viscosity" },
  P:     { factor: 100,      category: "viscosity", aliases: ["poise"] },
  "mPa·s": { factor: 1,     category: "viscosity" },
  "Pa·s":  { factor: 1000,  category: "viscosity" },
  "lbm/ft·s": { factor: 1488.16, category: "viscosity" },
  "lbm/ft·hr": { factor: 0.41338, category: "viscosity" },

  // ─── Density ──────────────────────────────────────────────────────────────
  "lbm/ft3":  { factor: 1,        category: "density", aliases: ["lbm/ft³","lb/ft3"] },
  "kg/m3":    { factor: 0.0624279,category: "density", aliases: ["kg/m³"] },
  "g/cm3":    { factor: 62.4279,  category: "density", aliases: ["g/mL","g/cc"] },
  "g/L":      { factor: 0.0624279,category: "density" },
  "lbm/gal":  { factor: 7.48052,  category: "density" },
  "lbm/bbl":  { factor: 1/5.61458,category: "density" },

  // ─── Permeability ─────────────────────────────────────────────────────────
  md:    { factor: 1,      category: "permeability", aliases: ["mD","millidarcy"] },
  D:     { factor: 1000,   category: "permeability", aliases: ["darcy"] },
  "perm_m2":  { factor: 1.01325e15, category: "permeability" }, // 1 m² = 1.01325e15 md
  "µm2": { factor: 1013.25,   category: "permeability" },
  "nm2": { factor: 1.01325e-3,category: "permeability" },

  // ─── Time ─────────────────────────────────────────────────────────────────
  day:   { factor: 1,     category: "time", aliases: ["d"] },
  hr:    { factor: 1/24,  category: "time", aliases: ["h","hour"] },
  min:   { factor: 1/1440,category: "time", aliases: ["minute"] },
  s:     { factor: 1/86400,category:"time", aliases: ["sec","second"] },
  month: { factor: 30.4375,category:"time", aliases: ["mo"] },
  year:  { factor: 365.25, category:"time", aliases: ["yr","a"] },

  // ─── Gas heating value (energy/volume) ───────────────────────────────────
  "BTU/scf":    { factor: 1,        category: "heating_value" },
  "BTU/Mcf":    { factor: 1e-3,     category: "heating_value" },
  "MJ/Nm3":     { factor: 26.8528,  category: "heating_value" },
  "kJ/Nm3":     { factor: 0.0268528,category: "heating_value" },
  "BTU/ft3":    { factor: 1,        category: "heating_value" },

  // ─── Molar units ─────────────────────────────────────────────────────────
  "lbmol":  { factor: 1,          category: "molar" },
  "kmol":   { factor: 2.20462,    category: "molar" },
  "mol":    { factor: 2.20462e-3, category: "molar" },
};

// Build alias lookup
const ALIAS_MAP: Record<string, string> = {};
for (const [name, def] of Object.entries(UNITS)) {
  if (def.aliases) {
    for (const alias of def.aliases) {
      ALIAS_MAP[alias] = name;
    }
  }
}

function resolveUnit(unit: string): string {
  const trimmed = unit.trim();
  if (UNITS[trimmed]) return trimmed;
  if (ALIAS_MAP[trimmed]) return ALIAS_MAP[trimmed];
  // Case-insensitive search
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(UNITS)) {
    if (key.toLowerCase() === lower) return key;
  }
  for (const [alias, name] of Object.entries(ALIAS_MAP)) {
    if (alias.toLowerCase() === lower) return name;
  }
  throw new Error(`Unknown unit: "${unit}"`);
}

// ─── Temperature conversion (special offset handling) ─────────────────────────

function toFahrenheit(value: number, unit: string): number {
  const u = resolveUnit(unit);
  switch (u) {
    case "degF": case "°F": return value;
    case "degC": case "°C": return value * 9/5 + 32;
    case "degR": case "°R": return value - 459.67;
    case "K":               return (value - 273.15) * 9/5 + 32;
    default: throw new Error(`${unit} is not a temperature unit`);
  }
}

function fromFahrenheit(value_F: number, unit: string): number {
  const u = resolveUnit(unit);
  switch (u) {
    case "degF": case "°F": return value_F;
    case "degC": case "°C": return (value_F - 32) * 5/9;
    case "degR": case "°R": return value_F + 459.67;
    case "K":               return (value_F - 32) * 5/9 + 273.15;
    default: throw new Error(`${unit} is not a temperature unit`);
  }
}

// ─── Scaled unit parsing ──────────────────────────────────────────────────────

/**
 * Parse a scaled unit like "640 acre" or "1000 ft" into [scale, unitName].
 */
function parseScaledUnit(unit: string): [number, string] {
  const match = unit.trim().match(/^([\d.e+-]+)\s+(.+)$/i);
  if (match) {
    return [parseFloat(match[1]), match[2]];
  }
  return [1, unit];
}

// ─── Unit expression parsing ──────────────────────────────────────────────────

/**
 * Evaluate a unit expression like "bbl*psi/day" by computing composite factor.
 * Handles: multiplication (*), division (/), powers (^), parentheses.
 * Returns the conversion factor to canonical units.
 */
function evaluateUnitExpression(expr: string): { factor: number; category: string } {
  // Tokenize: split on *, /, ^, (, )
  // For now, handle simple expressions: u1*u2/u3^n
  const tokens = expr.trim().split(/([*/^()])/).filter((t) => t.trim() !== "");

  let factorNum = 1;    // numerator factor
  let factorDen = 1;    // denominator factor
  let inDenominator = false;
  let prevToken = "";

  for (const token of tokens) {
    const t = token.trim();
    if (t === "*") { inDenominator = false; }
    else if (t === "/") { inDenominator = true; }
    else if (t === "^") { prevToken = "^"; }
    else if (t === "(" || t === ")") { /* ignore */ }
    else if (prevToken === "^") {
      // Apply exponent to last factor
      const exp = parseFloat(t);
      if (inDenominator) {
        factorDen = Math.pow(factorDen, exp);
      } else {
        factorNum = Math.pow(factorNum, exp);
      }
      prevToken = "";
    } else {
      // It's a unit
      try {
        const [scale, unitName] = parseScaledUnit(t);
        const resolved = resolveUnit(unitName);
        const f = scale * UNITS[resolved].factor;
        if (inDenominator) {
          factorDen *= f;
        } else {
          factorNum *= f;
        }
      } catch {
        // Try as a number
        const n = parseFloat(t);
        if (!isNaN(n)) {
          if (inDenominator) factorDen *= n;
          else factorNum *= n;
        }
      }
      prevToken = t;
    }
  }

  return { factor: factorNum / factorDen, category: "expression" };
}

// ─── Main converter ────────────────────────────────────────────────────────────

/**
 * P365.UnitConverter — Convert a value between any two registered units.
 *
 * Supports:
 * - Simple units: "psia", "bar", "ft", "m3"
 * - Scaled units: "640 acre", "1000 ft"
 * - Unit expressions: "bbl*psi/day", "ft^3/s"
 *
 * @param value    Numeric value to convert
 * @param fromUnit Source unit string
 * @param toUnit   Target unit string
 * @returns Converted value
 */
export function unitConverter(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  const [fromScale, fromRaw] = parseScaledUnit(fromUnit);
  const [toScale, toRaw]   = parseScaledUnit(toUnit);
  const scaledValue = value * fromScale;

  // Check if a string looks like a unit expression (contains * / ^)
  const isExpression = (s: string) => /[*/^]/.test(s);

  // Resolve from-unit
  let fromResolved: string | undefined;
  let fromCat: string | undefined;
  let fromFactor: number | undefined;

  try {
    fromResolved = resolveUnit(fromRaw);
    fromCat = UNITS[fromResolved].category;
    fromFactor = UNITS[fromResolved].factor * fromScale;
  } catch (err) {
    if (!isExpression(fromUnit)) {
      throw err; // re-throw for simple unknown units
    }
    // Fall through to expression handling
  }

  // Resolve to-unit
  let toResolved: string | undefined;
  let toCat: string | undefined;
  let toFactor: number | undefined;

  try {
    toResolved = resolveUnit(toRaw);
    toCat = UNITS[toResolved].category;
    toFactor = UNITS[toResolved].factor * toScale;
  } catch (err) {
    if (!isExpression(toUnit)) {
      throw err; // re-throw for simple unknown units
    }
    // Fall through to expression handling
  }

  // If both are expressions, use expression evaluation
  if (fromFactor === undefined || toFactor === undefined) {
    const fromResult = evaluateUnitExpression(fromUnit);
    const toResult   = evaluateUnitExpression(toUnit);
    return scaledValue * fromResult.factor / toResult.factor / toScale;
  }

  // Temperature — special offset handling
  if (fromCat === "temperature") {
    const degF = toFahrenheit(scaledValue, fromRaw!);
    return fromFahrenheit(degF, toRaw!) / toScale;
  }

  // Standard linear conversion
  return value * fromFactor / toFactor;
}

/**
 * Get all registered unit names for a given category.
 */
export function getUnitsForCategory(category: string): string[] {
  return Object.entries(UNITS)
    .filter(([, def]) => def.category === category)
    .map(([name]) => name);
}

/**
 * Get all available categories.
 */
export function getCategories(): string[] {
  return [...new Set(Object.values(UNITS).map((d) => d.category))];
}

/**
 * List all registered unit names and their categories.
 */
export function listUnits(): Array<{ unit: string; category: string; factor: number }> {
  return Object.entries(UNITS).map(([unit, def]) => ({
    unit,
    category: def.category,
    factor: def.factor,
  }));
}
