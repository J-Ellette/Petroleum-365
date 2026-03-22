/**
 * P365 — Function Browser Catalog
 *
 * Provides the structured catalog of all Petroleum 365 Excel UDFs for the
 * Function Browser UI. Each entry contains:
 *   - id / name / category / subcategory
 *   - description, syntax, and parameter descriptions
 *   - return type and example with expected result
 *   - related function ids
 *
 * The catalog is consumed by the Function Browser taskpane to:
 *   1. Display searchable, categorized function list with full documentation
 *   2. Enable IntelliSense-style tooltip rendering in the taskpane
 *   3. Support "Related functions" cross-linking
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Parameter descriptor for a function. */
export interface FunctionParam {
  name: string;
  type: "number" | "string" | "number[]" | "string[]" | "boolean";
  description: string;
  optional?: boolean;
  defaultValue?: string;
}

/** A single function catalog entry. */
export interface FunctionEntry {
  /** Unique function id — matches the Excel function name (dot-notation). */
  id: string;
  /** Display name (same as id, shown in Browser). */
  name: string;
  /** Top-level engineering discipline category. */
  category: string;
  /** Sub-category within the discipline. */
  subcategory: string;
  /** One-sentence summary. */
  summary: string;
  /** Full description (one paragraph). */
  description: string;
  /** Excel function syntax string. */
  syntax: string;
  /** Ordered list of parameter descriptors. */
  params: FunctionParam[];
  /** Return value description. */
  returns: string;
  /** Whether the function returns an array (spills). */
  returnsArray: boolean;
  /** Usage example: the formula string. */
  exampleFormula: string;
  /** Expected result of the example (string representation). */
  exampleResult: string;
  /** Related function ids. */
  related: string[];
  /** Tags for keyword search. */
  tags: string[];
}

// ─── Function Catalog ─────────────────────────────────────────────────────────

/** Full Petroleum 365 function browser catalog. */
export const FUNCTION_CATALOG: FunctionEntry[] = [

  // ── PVT — Gas ───────────────────────────────────────────────────────────────
  {
    id: "P365.PVT.Z.ByDAK",
    name: "P365.PVT.Z.ByDAK",
    category: "PVT",
    subcategory: "Gas",
    summary: "Gas Z-factor using Dranchuk-Abou-Kassem (DAK) correlation.",
    description:
      "Computes the real gas compressibility factor Z using the 11-constant Dranchuk-Abou-Kassem (1975) equation of state. Valid for 0.2 ≤ Ppr ≤ 30 and 1.05 ≤ Tpr ≤ 3.0. Uses Newton-Raphson iteration on the Hall-Yarborough reduced-density form.",
    syntax: "P365.PVT.Z.ByDAK(P_psia, T_degF, SG_gas)",
    params: [
      { name: "P_psia",  type: "number", description: "Gas pressure (psia)" },
      { name: "T_degF",  type: "number", description: "Gas temperature (°F)" },
      { name: "SG_gas",  type: "number", description: "Gas specific gravity (air = 1.0)" },
    ],
    returns: "Z-factor (dimensionless)",
    returnsArray: false,
    exampleFormula: "=P365.PVT.Z.ByDAK(3000, 200, 0.65)",
    exampleResult: "0.862",
    related: ["P365.PVT.Z.ByBrillBeggs", "P365.PVT.BG", "P365.PVT.UG"],
    tags: ["z-factor", "gas", "pvt", "dak", "compressibility"],
  },
  {
    id: "P365.PVT.Z.ByBrillBeggs",
    name: "P365.PVT.Z.ByBrillBeggs",
    category: "PVT",
    subcategory: "Gas",
    summary: "Gas Z-factor using Brill-Beggs explicit correlation.",
    description:
      "Computes Z-factor using the explicit Brill-Beggs (1974) correlation — a fast, non-iterative method based on Ppr and Tpr. Less accurate than DAK but suitable for sensitivity analysis and initial screening.",
    syntax: "P365.PVT.Z.ByBrillBeggs(P_psia, T_degF, SG_gas)",
    params: [
      { name: "P_psia", type: "number", description: "Gas pressure (psia)" },
      { name: "T_degF", type: "number", description: "Gas temperature (°F)" },
      { name: "SG_gas", type: "number", description: "Gas specific gravity (air = 1.0)" },
    ],
    returns: "Z-factor (dimensionless)",
    returnsArray: false,
    exampleFormula: "=P365.PVT.Z.ByBrillBeggs(3000, 200, 0.65)",
    exampleResult: "0.858",
    related: ["P365.PVT.Z.ByDAK", "P365.PVT.Z.ByHallYarborough"],
    tags: ["z-factor", "gas", "pvt", "brill-beggs", "explicit"],
  },
  {
    id: "P365.PVT.BG",
    name: "P365.PVT.BG",
    category: "PVT",
    subcategory: "Gas",
    summary: "Gas formation volume factor Bg (bbl/Mscf).",
    description:
      "Calculates the gas formation volume factor Bg at reservoir conditions. Bg = 0.02827 × Z × T / P (field units: T in °R, P in psia, result in bbl/Mscf). Requires a Z-factor computed from the desired correlation.",
    syntax: "P365.PVT.BG(P_psia, T_degF, Z)",
    params: [
      { name: "P_psia", type: "number", description: "Pressure (psia)" },
      { name: "T_degF", type: "number", description: "Temperature (°F)" },
      { name: "Z",      type: "number", description: "Gas compressibility factor" },
    ],
    returns: "Gas FVF Bg (bbl/Mscf)",
    returnsArray: false,
    exampleFormula: "=P365.PVT.BG(3000, 200, 0.862)",
    exampleResult: "0.00492",
    related: ["P365.PVT.Z.ByDAK", "P365.PVT.UG"],
    tags: ["bg", "gas fvf", "formation volume factor", "gas", "pvt"],
  },
  {
    id: "P365.PVT.UG",
    name: "P365.PVT.UG",
    category: "PVT",
    subcategory: "Gas",
    summary: "Gas viscosity using Lee-Gonzalez correlation.",
    description:
      "Computes gas viscosity using the Lee-Gonzalez-Eakin (1966) correlation. Valid for temperatures 100–340°F and pressures up to 8000 psia. Returns viscosity in cp.",
    syntax: "P365.PVT.UG(P_psia, T_degF, SG_gas)",
    params: [
      { name: "P_psia", type: "number", description: "Pressure (psia)" },
      { name: "T_degF", type: "number", description: "Temperature (°F)" },
      { name: "SG_gas", type: "number", description: "Gas specific gravity (air = 1.0)" },
    ],
    returns: "Gas viscosity (cp)",
    returnsArray: false,
    exampleFormula: "=P365.PVT.UG(3000, 200, 0.65)",
    exampleResult: "0.0215",
    related: ["P365.PVT.Z.ByDAK", "P365.PVT.BG"],
    tags: ["viscosity", "gas", "pvt", "lee-gonzalez", "ug"],
  },

  // ── PVT — Oil ───────────────────────────────────────────────────────────────
  {
    id: "P365.PVT.Pb.ByStanding",
    name: "P365.PVT.Pb.ByStanding",
    category: "PVT",
    subcategory: "Oil",
    summary: "Bubble point pressure using Standing's correlation.",
    description:
      "Estimates bubble point pressure using Standing's (1947) empirical correlation. Valid for API gravity 16–58°API, GOR 20–1425 scf/STB, temperature 100–258°F, and gas SG 0.59–0.95. Returns bubble point in psia.",
    syntax: "P365.PVT.Pb.ByStanding(SG_gas, API, GOR_scf_STB, T_degF)",
    params: [
      { name: "SG_gas",      type: "number", description: "Gas specific gravity (air = 1.0)" },
      { name: "API",         type: "number", description: "Oil API gravity (°API)" },
      { name: "GOR_scf_STB", type: "number", description: "Solution GOR (scf/STB)" },
      { name: "T_degF",      type: "number", description: "Reservoir temperature (°F)" },
    ],
    returns: "Bubble point pressure (psia)",
    returnsArray: false,
    exampleFormula: "=P365.PVT.Pb.ByStanding(0.65, 35, 500, 200)",
    exampleResult: "1820",
    related: ["P365.PVT.Pb.ByVasquezBeggs", "P365.PVT.SG.Oil.FromAPI"],
    tags: ["bubble point", "pb", "oil", "pvt", "standing"],
  },
  {
    id: "P365.PVT.SG.Oil.FromAPI",
    name: "P365.PVT.SG.Oil.FromAPI",
    category: "PVT",
    subcategory: "Oil",
    summary: "Oil specific gravity from API gravity.",
    description:
      "Converts oil API gravity to specific gravity using the standard formula: SG = 141.5 / (API + 131.5). Valid for any API > 0.",
    syntax: "P365.PVT.SG.Oil.FromAPI(API)",
    params: [
      { name: "API", type: "number", description: "Oil API gravity (°API)" },
    ],
    returns: "Oil specific gravity (water = 1.0)",
    returnsArray: false,
    exampleFormula: "=P365.PVT.SG.Oil.FromAPI(35)",
    exampleResult: "0.8498",
    related: ["P365.PVT.Pb.ByStanding"],
    tags: ["api", "specific gravity", "sg", "oil", "pvt"],
  },

  // ── DCA ────────────────────────────────────────────────────────────────────
  {
    id: "P365.DCA.Arps.Rate",
    name: "P365.DCA.Arps.Rate",
    category: "DCA",
    subcategory: "Arps Decline",
    summary: "Production rate at time t using Arps decline.",
    description:
      "Computes the production rate at time t using the generalized Arps decline equation. Handles exponential (b=0), hyperbolic (0<b<1), and harmonic (b=1) decline. Time and rate must be in consistent units.",
    syntax: "P365.DCA.Arps.Rate(qi, Di, b, t)",
    params: [
      { name: "qi", type: "number", description: "Initial rate at t=0 (same unit as output rate)" },
      { name: "Di", type: "number", description: "Initial nominal decline rate (1/time)" },
      { name: "b",  type: "number", description: "Arps hyperbolic exponent (0=exp, 1=harmonic)" },
      { name: "t",  type: "number", description: "Time since first production (same unit as 1/Di)" },
    ],
    returns: "Production rate q(t)",
    returnsArray: false,
    exampleFormula: "=P365.DCA.Arps.Rate(1000, 0.1, 0.5, 12)",
    exampleResult: "702",
    related: ["P365.DCA.Arps.Cumulative", "P365.DCA.Arps.EUR", "P365.DCA.Arps.Fit"],
    tags: ["arps", "decline", "rate", "dca", "hyperbolic", "exponential"],
  },
  {
    id: "P365.DCA.Arps.Cumulative",
    name: "P365.DCA.Arps.Cumulative",
    category: "DCA",
    subcategory: "Arps Decline",
    summary: "Cumulative production at time t using Arps decline.",
    description:
      "Computes cumulative production Np(t) using the analytical integral of the Arps rate equation. For exponential decline (b=0): Np = qi/Di × (1 − e^(−Di×t)). For hyperbolic/harmonic, uses the closed-form expression.",
    syntax: "P365.DCA.Arps.Cumulative(qi, Di, b, t)",
    params: [
      { name: "qi", type: "number", description: "Initial rate at t=0" },
      { name: "Di", type: "number", description: "Initial nominal decline rate (1/time)" },
      { name: "b",  type: "number", description: "Hyperbolic exponent" },
      { name: "t",  type: "number", description: "Time" },
    ],
    returns: "Cumulative production Np(t)",
    returnsArray: false,
    exampleFormula: "=P365.DCA.Arps.Cumulative(1000, 0.1, 0, 12)",
    exampleResult: "9516",
    related: ["P365.DCA.Arps.Rate", "P365.DCA.Arps.EUR"],
    tags: ["arps", "cumulative", "np", "dca"],
  },
  {
    id: "P365.DCA.Arps.EUR",
    name: "P365.DCA.Arps.EUR",
    category: "DCA",
    subcategory: "Arps Decline",
    summary: "Estimated Ultimate Recovery (EUR) at an economic limit rate.",
    description:
      "Calculates EUR as the cumulative production from t=0 to the time when the rate reaches the economic limit q_lim. For exponential decline, EUR = (qi − q_lim) / Di. For hyperbolic, uses the closed-form integral.",
    syntax: "P365.DCA.Arps.EUR(qi, Di, b, q_lim)",
    params: [
      { name: "qi",    type: "number", description: "Initial rate" },
      { name: "Di",    type: "number", description: "Initial nominal decline rate (1/time)" },
      { name: "b",     type: "number", description: "Hyperbolic exponent (0–1)" },
      { name: "q_lim", type: "number", description: "Economic limit rate (same units as qi)" },
    ],
    returns: "EUR (same units as qi × time)",
    returnsArray: false,
    exampleFormula: "=P365.DCA.Arps.EUR(1000, 0.1, 0, 10)",
    exampleResult: "99000",
    related: ["P365.DCA.Arps.Rate", "P365.DCA.Arps.Cumulative"],
    tags: ["eur", "arps", "economic limit", "dca", "reserve"],
  },
  {
    id: "P365.DCA.TransientHyperbolic.Rate",
    name: "P365.DCA.TransientHyperbolic.Rate",
    category: "DCA",
    subcategory: "Extended Models",
    summary: "Rate from Transient Hyperbolic (TH) decline model.",
    description:
      "Transient Hyperbolic model: Arps hyperbolic (b≈2 for linear flow) during the transient phase, switching to exponential at a terminal decline rate D_term. Designed for tight/shale wells where b>1 during transient flow.",
    syntax: "P365.DCA.TransientHyperbolic.Rate(qi, Di, b, D_term, t)",
    params: [
      { name: "qi",     type: "number", description: "Initial rate at t=0" },
      { name: "Di",     type: "number", description: "Initial nominal decline rate (1/time)" },
      { name: "b",      type: "number", description: "Hyperbolic exponent (typically 1.5–2.0 for tight wells)" },
      { name: "D_term", type: "number", description: "Terminal exponential decline rate (1/time)" },
      { name: "t",      type: "number", description: "Time" },
    ],
    returns: "Rate q(t)",
    returnsArray: false,
    exampleFormula: "=P365.DCA.TransientHyperbolic.Rate(1000, 0.3, 1.8, 0.05, 24)",
    exampleResult: "287",
    related: ["P365.DCA.Arps.Rate", "P365.DCA.TransientHyperbolic.EUR", "P365.DCA.AKB.Rate"],
    tags: ["transient", "hyperbolic", "shale", "tight", "dca", "th model"],
  },

  // ── IPR ────────────────────────────────────────────────────────────────────
  {
    id: "P365.IPR.VW.PSS.Rate.ByVogel",
    name: "P365.IPR.VW.PSS.Rate.ByVogel",
    category: "IPR",
    subcategory: "Vogel IPR",
    summary: "Inflow rate from Vogel IPR (pseudosteady-state, vertical well).",
    description:
      "Calculates inflow rate at a given flowing bottomhole pressure using the Vogel (1968) IPR equation: q/qmax = 1 − 0.2(Pwf/Pr) − 0.8(Pwf/Pr)². Valid for solution-gas drive reservoirs below bubble point.",
    syntax: "P365.IPR.VW.PSS.Rate.ByVogel(Pr_psia, Pwf_psia, qmax_STBd)",
    params: [
      { name: "Pr_psia",    type: "number", description: "Reservoir pressure (psia)" },
      { name: "Pwf_psia",   type: "number", description: "Flowing bottomhole pressure (psia)" },
      { name: "qmax_STBd",  type: "number", description: "Maximum flow rate at Pwf=0 (STB/d)" },
    ],
    returns: "Inflow rate q (STB/d)",
    returnsArray: false,
    exampleFormula: "=P365.IPR.VW.PSS.Rate.ByVogel(2000, 1000, 500)",
    exampleResult: "375",
    related: ["P365.IPR.VW.AOF.ByVogel", "Nodal.OperatingPoint"],
    tags: ["vogel", "ipr", "inflow", "pseudosteady", "oil well"],
  },

  // ── MBE ────────────────────────────────────────────────────────────────────
  {
    id: "P365.MBE.PZ.OGIP",
    name: "P365.MBE.PZ.OGIP",
    category: "MBE",
    subcategory: "Gas Material Balance",
    summary: "OGIP from p/z vs. cumulative gas plot.",
    description:
      "Calculates OGIP from two points on the p/Z straight line using linear extrapolation to Gp-axis (p/Z = 0). OGIP = Gp1 − (p1/Z1) × (Gp2 − Gp1) / (p2/Z2 − p1/Z1).",
    syntax: "P365.MBE.PZ.OGIP(p1_Z1, Gp1, p2_Z2, Gp2)",
    params: [
      { name: "p1_Z1", type: "number", description: "p/Z at first pressure point (psia)" },
      { name: "Gp1",   type: "number", description: "Cumulative gas at first point (Bcf or Mscf)" },
      { name: "p2_Z2", type: "number", description: "p/Z at second pressure point (psia)" },
      { name: "Gp2",   type: "number", description: "Cumulative gas at second point" },
    ],
    returns: "OGIP — original gas in place (same unit as Gp)",
    returnsArray: false,
    exampleFormula: "=P365.MBE.PZ.OGIP(3500, 0, 2800, 5)",
    exampleResult: "25",
    related: ["P365.MBE.PZ.Pressure", "P365.MBE.PZ.Recovery"],
    tags: ["ogip", "p/z", "gas", "mbe", "material balance"],
  },

  // ── PTA ────────────────────────────────────────────────────────────────────
  {
    id: "P365.PTA.Horner.Pstar",
    name: "P365.PTA.Horner.Pstar",
    category: "PTA",
    subcategory: "Buildup Analysis",
    summary: "Extrapolated reservoir pressure P* from Horner plot.",
    description:
      "Calculates extrapolated reservoir pressure P* from the Horner plot MTR straight line. P* = P_1hr + m × log((tp + 1)/1) where m is the Horner slope and P_1hr is the pressure at Δt = 1 hour. For a volumetric reservoir, P* ≈ P_R.",
    syntax: "P365.PTA.Horner.Pstar(P_1hr, m_psi_cycle, tp_hr)",
    params: [
      { name: "P_1hr",       type: "number", description: "Shut-in pressure at Δt=1 hour (psia)" },
      { name: "m_psi_cycle", type: "number", description: "Horner MTR slope (psi/log-cycle; negative for buildup)" },
      { name: "tp_hr",       type: "number", description: "Producing time before shut-in (hours)" },
    ],
    returns: "Extrapolated reservoir pressure P* (psia)",
    returnsArray: false,
    exampleFormula: "=P365.PTA.Horner.Pstar(3100, -80, 72)",
    exampleResult: "3258",
    related: ["P365.PTA.Horner.Permeability", "P365.PTA.Horner.Skin"],
    tags: ["horner", "buildup", "p-star", "reservoir pressure", "pta"],
  },

  // ── FRAC ───────────────────────────────────────────────────────────────────
  {
    id: "P365.FRAC.Poroelastic.Closure",
    name: "P365.FRAC.Poroelastic.Closure",
    category: "FRAC",
    subcategory: "Closure Stress",
    summary: "Minimum horizontal stress from uniaxial strain poroelastic model.",
    description:
      "Computes minimum horizontal stress (σ_h = fracture closure pressure) using the uniaxial strain / poroelastic model: σ_h = [ν/(1-ν)] × (σ_v − α·Pp) + α·Pp + Δσ_tectonic. Used as input for fracture gradient prediction and fracture design.",
    syntax: "P365.FRAC.Poroelastic.Closure(sigma_v_psi, P_pore_psi, nu, alpha, dSigma_tect_psi)",
    params: [
      { name: "sigma_v_psi",       type: "number", description: "Vertical overburden stress (psi)" },
      { name: "P_pore_psi",        type: "number", description: "Pore pressure (psi)" },
      { name: "nu",                type: "number", description: "Poisson's ratio (0–1)" },
      { name: "alpha",             type: "number", description: "Biot coefficient (0–1)" },
      { name: "dSigma_tect_psi",   type: "number", description: "Tectonic stress offset (psi); 0 for uniaxial strain only" },
    ],
    returns: "Minimum horizontal stress / closure pressure (psi)",
    returnsArray: false,
    exampleFormula: "=P365.FRAC.Poroelastic.Closure(7000, 3500, 0.25, 0.8, 0)",
    exampleResult: "5200",
    related: ["P365.FRAC.Nolte.Closure", "P365.FRAC.NetPressure", "P365.GEO.FractureGradient.Eaton"],
    tags: ["closure stress", "poroelastic", "uniaxial strain", "biot", "fracture gradient", "frac"],
  },
  {
    id: "P365.FRAC.Nolte.G",
    name: "P365.FRAC.Nolte.G",
    category: "FRAC",
    subcategory: "G-Function Analysis",
    summary: "Nolte G-function value at dimensionless shut-in time.",
    description:
      "Computes the Nolte G-function: G(ΔtD) = (4/3) × [(1+ΔtD)^1.5 − ΔtD^1.5 − 1], where ΔtD = Δt/tp. Used in step-down/step-rate test analysis to identify fracture closure and fluid efficiency.",
    syntax: "P365.FRAC.Nolte.G(deltaT_D)",
    params: [
      { name: "deltaT_D", type: "number", description: "Dimensionless shut-in time Δt/tp (≥0)" },
    ],
    returns: "G-function value (dimensionless)",
    returnsArray: false,
    exampleFormula: "=P365.FRAC.Nolte.G(1.0)",
    exampleResult: "0.943",
    related: ["P365.FRAC.Nolte.Closure", "P365.FRAC.FluidEfficiency", "P365.FRAC.ISIP"],
    tags: ["nolte", "g-function", "closure", "step-rate", "diagnostic", "frac"],
  },

  // ── SCAL ───────────────────────────────────────────────────────────────────
  {
    id: "P365.SCAL.Corey.Krw",
    name: "P365.SCAL.Corey.Krw",
    category: "SCAL",
    subcategory: "Relative Permeability",
    summary: "Water relative permeability (Corey power-law).",
    description:
      "Computes water relative permeability using Corey (1954) power-law: krw = krw_max × [(Sw − Swi)/(1 − Swi − Sorw)]^nw. The Corey exponent nw typically ranges from 2 to 6 for water-wet systems.",
    syntax: "P365.SCAL.Corey.Krw(Sw, Swi, Sorw, krw_max, nw)",
    params: [
      { name: "Sw",      type: "number", description: "Water saturation (fraction)" },
      { name: "Swi",     type: "number", description: "Connate water saturation (fraction)" },
      { name: "Sorw",    type: "number", description: "Residual oil saturation to water (fraction)" },
      { name: "krw_max", type: "number", description: "Max water Kr at Sorw (fraction)" },
      { name: "nw",      type: "number", description: "Corey water exponent (typically 2–6)" },
    ],
    returns: "Water relative permeability krw (fraction)",
    returnsArray: false,
    exampleFormula: "=P365.SCAL.Corey.Krw(0.6, 0.2, 0.2, 0.8, 3)",
    exampleResult: "0.200",
    related: ["P365.SCAL.Corey.Krow", "P365.SCAL.LET.Krw"],
    tags: ["corey", "krw", "water", "relative permeability", "scal"],
  },

  // ── GEO ────────────────────────────────────────────────────────────────────
  {
    id: "P365.GEO.PorePressure.Eaton",
    name: "P365.GEO.PorePressure.Eaton",
    category: "GEO",
    subcategory: "Pore Pressure",
    summary: "Pore pressure from sonic DT log using Eaton (1975) method.",
    description:
      "Predicts pore pressure using the Eaton (1975) sonic log method: Pp = σ_v − (σ_v − P_hydrostatic) × (DT_normal/DT_obs)^3. Requires the normal compaction trend (NCT) transit time at each depth.",
    syntax: "P365.GEO.PorePressure.Eaton(sigma_v_psi, P_hyd_psi, DT_obs_usft, DT_norm_usft)",
    params: [
      { name: "sigma_v_psi",    type: "number", description: "Overburden (vertical) stress (psi)" },
      { name: "P_hyd_psi",      type: "number", description: "Hydrostatic pore pressure (psi)" },
      { name: "DT_obs_usft",    type: "number", description: "Observed sonic transit time (μs/ft)" },
      { name: "DT_norm_usft",   type: "number", description: "Normal compaction trend DT at same depth (μs/ft)" },
    ],
    returns: "Pore pressure (psi)",
    returnsArray: false,
    exampleFormula: "=P365.GEO.PorePressure.Eaton(8000, 3800, 95, 70)",
    exampleResult: "5240",
    related: ["P365.GEO.Overburden.Stress", "P365.GEO.FractureGradient.Eaton"],
    tags: ["pore pressure", "eaton", "sonic", "dt", "overburden", "geo"],
  },

  // ── WBI ────────────────────────────────────────────────────────────────────
  {
    id: "P365.WBI.Burst.Rating",
    name: "P365.WBI.Burst.Rating",
    category: "WBI",
    subcategory: "Casing Burst",
    summary: "API Barlow burst rating for casing (psi).",
    description:
      "Calculates casing burst pressure rating using the API Barlow formula: P_burst = 0.875 × 2 × Ys × t / OD. The 0.875 factor accounts for the minimum wall thickness tolerance per API Spec 5CT.",
    syntax: "P365.WBI.Burst.Rating(Ys_psi, OD_in, t_in)",
    params: [
      { name: "Ys_psi", type: "number", description: "Minimum yield strength (psi)" },
      { name: "OD_in",  type: "number", description: "Casing outside diameter (inches)" },
      { name: "t_in",   type: "number", description: "Nominal wall thickness (inches)" },
    ],
    returns: "Burst rating (psi)",
    returnsArray: false,
    exampleFormula: "=P365.WBI.Burst.Rating(80000, 9.625, 0.472)",
    exampleResult: "6876",
    related: ["P365.WBI.Collapse.Rating", "P365.WBI.Tensile.Check", "P365.WBI.Burst.DesignFactor"],
    tags: ["casing", "burst", "barlow", "api", "wbi", "design"],
  },

  // ── Utilities ───────────────────────────────────────────────────────────────
  {
    id: "P365.UnitConverter",
    name: "P365.UnitConverter",
    category: "Utilities",
    subcategory: "Unit Conversion",
    summary: "Convert a value between any two registered P365 units.",
    description:
      "Converts a numeric value from one unit to another using the P365 unit library (1500+ units). Supports registered units, scaled units (e.g., '640 acre'), and unit expressions (e.g., 'bbl*psi/day'). Returns the converted value as a number.",
    syntax: "P365.UnitConverter(value, unitFrom, unitTo)",
    params: [
      { name: "value",    type: "number", description: "Numeric value to convert" },
      { name: "unitFrom", type: "string", description: "Source unit abbreviation (e.g., \"psia\", \"bbl\")" },
      { name: "unitTo",   type: "string", description: "Target unit abbreviation (e.g., \"bar\", \"m3\")" },
    ],
    returns: "Converted value (number)",
    returnsArray: false,
    exampleFormula: "=P365.UnitConverter(1000, \"psia\", \"bar\")",
    exampleResult: "68.948",
    related: [],
    tags: ["unit", "convert", "psi", "bar", "bbl", "m3", "temperature", "pressure"],
  },

  // ── SIM ────────────────────────────────────────────────────────────────────
  {
    id: "P365.SIM.SWOF",
    name: "P365.SIM.SWOF",
    category: "SIM",
    subcategory: "Eclipse Keywords",
    summary: "Generate Eclipse SWOF keyword text from water-oil Kr table.",
    description:
      "Generates an Eclipse 100/300 compatible SWOF keyword block from an array of (Sw, krw, krow, Pcow) rows. The output is a formatted string ready to paste into an Eclipse DATA file or save as an INCLUDE file.",
    syntax: "P365.SIM.SWOF(rows, satRegion, comment)",
    params: [
      { name: "rows",      type: "number[]", description: "Array of SWOF rows [{Sw, krw, krow, Pcow}, ...]" },
      { name: "satRegion", type: "number",   description: "Saturation region number (default 1)", optional: true, defaultValue: "1" },
      { name: "comment",   type: "string",   description: "Optional comment header line", optional: true, defaultValue: '""' },
    ],
    returns: "Eclipse SWOF keyword text (string)",
    returnsArray: false,
    exampleFormula: "=P365.SIM.SWOF(rows, 1, \"Water-wet sandstone\")",
    exampleResult: "\"-- ============\\nSWOF\\n  0.2000 ...\\n/\"",
    related: ["P365.SIM.SGOF", "P365.SIM.BuildSwofTable", "P365.SCAL.Corey.Krw"],
    tags: ["eclipse", "swof", "simulation", "kr table", "include file", "sim"],
  },
  {
    id: "P365.SIM.GenerateFromTemplate",
    name: "P365.SIM.GenerateFromTemplate",
    category: "SIM",
    subcategory: "File Generator",
    summary: "Render a simulation input file from a template with token substitution.",
    description:
      "Replaces @TOKEN placeholders in a template string with values from the token map. Implements the P365 File Generator workflow: create a template with @PERM, @POROSITY, etc., then call this function for each case. Throws if any token is missing.",
    syntax: "P365.SIM.GenerateFromTemplate(template, tokens)",
    params: [
      { name: "template", type: "string",   description: "Template string with @TOKEN placeholders" },
      { name: "tokens",   type: "string[]", description: "Token-value map object { TOKEN: value, ... }" },
    ],
    returns: "Rendered file content (string)",
    returnsArray: false,
    exampleFormula: "=P365.SIM.GenerateFromTemplate(\"PERM @PERM\\nPOROSITY @PHI\", {PERM:100, PHI:0.25})",
    exampleResult: "\"PERM 100\\nPOROSITY 0.25\"",
    related: ["P365.SIM.ValidateTokens", "P365.SIM.BatchGenerate"],
    tags: ["template", "token", "file generator", "eclipse", "cmg", "sim", "batch"],
  },
];

// ─── Catalog Accessors ────────────────────────────────────────────────────────

/**
 * Search the function catalog by keyword.
 * Matches against id, summary, description, and tags.
 *
 * @param keyword   Search string (case-insensitive)
 * @returns         Matching entries sorted by relevance
 */
export function searchFunctions(keyword: string): FunctionEntry[] {
  const kw = keyword.toLowerCase();
  const nameMatch: FunctionEntry[] = [];
  const otherMatch: FunctionEntry[] = [];
  for (const f of FUNCTION_CATALOG) {
    const inName    = f.name.toLowerCase().includes(kw);
    const inSummary = f.summary.toLowerCase().includes(kw);
    const inTags    = f.tags.some(t => t.includes(kw));
    const inDesc    = f.description.toLowerCase().includes(kw);
    if (inName) {
      nameMatch.push(f);
    } else if (inSummary || inTags || inDesc) {
      otherMatch.push(f);
    }
  }
  return [...nameMatch, ...otherMatch];
}

/**
 * Get all functions in a category.
 *
 * @param category   Top-level category string (e.g., "PVT", "DCA")
 * @returns          Filtered function entries
 */
export function getFunctionsByCategory(category: string): FunctionEntry[] {
  return FUNCTION_CATALOG.filter(f => f.category === category);
}

/**
 * Get a function entry by its unique id.
 *
 * @param id   Function id (e.g., "P365.PVT.Z.ByDAK")
 * @returns    FunctionEntry or undefined
 */
export function getFunctionById(id: string): FunctionEntry | undefined {
  return FUNCTION_CATALOG.find(f => f.id === id);
}

/**
 * Get all unique category names in the function catalog.
 *
 * @returns  Array of category strings
 */
export function getFunctionCategories(): string[] {
  return [...new Set(FUNCTION_CATALOG.map(f => f.category))];
}

/**
 * Get related functions for a given function id.
 *
 * @param id   Source function id
 * @returns    Array of FunctionEntry for each related id (omits not-found)
 */
export function getRelatedFunctions(id: string): FunctionEntry[] {
  const entry = getFunctionById(id);
  if (!entry) return [];
  return entry.related
    .map(rid => getFunctionById(rid))
    .filter((e): e is FunctionEntry => e !== undefined);
}
