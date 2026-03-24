/**
 * P365 — Blueprint Manager Catalog
 *
 * Provides the structured catalog of Excel blueprint templates for the
 * Blueprint Manager UI. Each blueprint entry contains:
 *   - id / name / category / description
 *   - required P365 functions
 *   - tags for filtering
 *   - typical row/column footprint on the worksheet
 *
 * The catalog is consumed by the Blueprint Manager taskpane to:
 *   1. Display searchable, categorized blueprint list
 *   2. Show preview/description before install
 *   3. Record which P365 functions the blueprint depends on
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Category enum for organizing blueprints in the Blueprint Manager. */
export type BlueprintCategory =
  | "PVT"
  | "DCA"
  | "IPR"
  | "MBE"
  | "PTA"
  | "VFP"
  | "SF"
  | "FA"
  | "FRAC"
  | "FPP"
  | "SCAL"
  | "EoS"
  | "ESP"
  | "GL"
  | "RP"
  | "CNG/LNG"
  | "GEO"
  | "SKIN"
  | "WBI"
  | "Spline"
  | "ECO"
  | "WPA"
  | "RTA"
  | "SIM"
  | "Utilities";

/** A single blueprint catalog entry. */
export interface Blueprint {
  /** Unique slug identifier (kebab-case). */
  id: string;
  /** Display name shown in Blueprint Manager. */
  name: string;
  /** Engineering discipline category. */
  category: BlueprintCategory;
  /** One-paragraph description of what the blueprint calculates. */
  description: string;
  /** P365 function names (without P365. prefix) that the blueprint uses. */
  requiredFunctions: string[];
  /** Search tags (keywords beyond name/description). */
  tags: string[];
  /** Approximate row count when inserted into worksheet. */
  rowCount: number;
  /** Approximate column count when inserted into worksheet. */
  colCount: number;
}

// ─── Blueprint Catalog ────────────────────────────────────────────────────────

/** Full catalog of all Petroleum 365 blueprint templates. */
export const BLUEPRINT_CATALOG: Blueprint[] = [

  // ── PVT ────────────────────────────────────────────────────────────────────
  {
    id: "pvt-gas-properties",
    name: "Gas PVT Properties",
    category: "PVT",
    description:
      "Calculate Z-factor, gas density, viscosity, formation volume factor, and compressibility at a given pressure and temperature. Covers DAK, Brill-Beggs, and Hall-Yarborough correlations side-by-side for method comparison.",
    requiredFunctions: ["PVT.Z.ByDAK", "PVT.Z.ByBrillBeggs", "PVT.BG", "PVT.UG"],
    tags: ["z-factor", "gas", "pvt", "viscosity", "bg"],
    rowCount: 25,
    colCount: 6,
  },
  {
    id: "pvt-oil-bubble-point",
    name: "Oil Bubble Point Pressure",
    category: "PVT",
    description:
      "Estimate bubble point pressure using Standing, Vasquez-Beggs, and Glaso correlations from API gravity, solution GOR, gas SG, and temperature. Includes sensitivity table for GOR range.",
    requiredFunctions: ["PVT.Pb.ByStanding", "PVT.Pb.ByVasquezBeggs"],
    tags: ["bubble point", "oil", "pvt", "standing", "vasquez-beggs"],
    rowCount: 30,
    colCount: 5,
  },
  {
    id: "pvt-gas-composition",
    name: "Gas Composition Analyzer",
    category: "PVT",
    description:
      "Enter mole fractions for up to 12 components. Computes molecular weight, specific gravity, pseudo-critical properties, heating value (HHV/LHV), Wobbe Index, and flags H2S/CO2 sour gas thresholds.",
    requiredFunctions: ["PVT.PseudoCritical.ByLeeKesler", "HV.GasHHV", "HV.GasLHV", "HV.WobbeIndex"],
    tags: ["composition", "gas", "mw", "sg", "heating value", "wobbe", "hv"],
    rowCount: 35,
    colCount: 7,
  },

  // ── DCA ────────────────────────────────────────────────────────────────────
  {
    id: "dca-arps-forecast",
    name: "Arps Decline Forecast",
    category: "DCA",
    description:
      "Generate a monthly rate-time-cumulative table for exponential, hyperbolic, and harmonic decline using Arps' method. Input qi, Di, b, and economic limit. Returns EUR and abandonment date.",
    requiredFunctions: ["DCA.Arps.Rate", "DCA.Arps.Cumulative", "DCA.Arps.EUR"],
    tags: ["arps", "decline", "forecast", "eur", "exponential", "hyperbolic", "harmonic"],
    rowCount: 40,
    colCount: 6,
  },
  {
    id: "dca-model-comparison",
    name: "Decline Model Comparison",
    category: "DCA",
    description:
      "Side-by-side comparison of Arps, Duong, PLE, SEPD, and LGM models. All models fit to the same production history, with EUR and residual sum-of-squares displayed for easy model selection.",
    requiredFunctions: ["DCA.Arps.Rate", "DCA.Duong.Rate", "DCA.PLE.Rate", "DCA.SEPD.Rate"],
    tags: ["model comparison", "duong", "ple", "sepd", "lgm", "arps", "decline"],
    rowCount: 50,
    colCount: 10,
  },
  {
    id: "dca-transient-hyperbolic",
    name: "Transient Hyperbolic Decline",
    category: "DCA",
    description:
      "Transient Hyperbolic (TH) model for tight/shale wells: Arps hyperbolic (b>1) during transient flow, automatically switching to exponential at a terminal decline rate. Shows switch time and both-phase EUR.",
    requiredFunctions: ["DCA.TransientHyperbolic.Rate", "DCA.TransientHyperbolic.EUR", "DCA.TransientHyperbolic.SwitchTime"],
    tags: ["transient", "shale", "tight", "th model", "b-factor", "switch"],
    rowCount: 35,
    colCount: 6,
  },
  {
    id: "dca-production-qc",
    name: "Production Data QC",
    category: "DCA",
    description:
      "Upload raw monthly production data and automatically flag outliers using a rolling Z-score method. Visualize clean vs. raw data, normalize by drawdown, and prepare QC'd dataset for decline fitting.",
    requiredFunctions: ["DCA.RollingZScore", "DCA.CleanProduction", "DCA.RateNormalize"],
    tags: ["qc", "outlier", "z-score", "production", "data cleaning"],
    rowCount: 60,
    colCount: 8,
  },
  {
    id: "dca-eur-sensitivity",
    name: "EUR Sensitivity Analysis",
    category: "DCA",
    description:
      "Two-variable sensitivity table showing EUR as a function of initial rate qi and decline rate Di. Economic limit is fixed; b-factor is input. Color-formatted heat map with high/low case P10/P50/P90.",
    requiredFunctions: ["DCA.Arps.EUR"],
    tags: ["eur", "sensitivity", "p10", "p50", "p90", "range", "uncertainty"],
    rowCount: 25,
    colCount: 12,
  },

  // ── IPR ────────────────────────────────────────────────────────────────────
  {
    id: "ipr-vogel-curve",
    name: "Vogel IPR Curve",
    category: "IPR",
    description:
      "Plot the Vogel IPR curve for an oil well below bubble point. Enter reservoir pressure, bubble-point pressure, and maximum flow rate. Chart shows q vs Pwf, operating point, and AOF.",
    requiredFunctions: ["IPR.VW.PSS.Rate.ByVogel", "IPR.VW.AOF.ByVogel"],
    tags: ["vogel", "ipr", "inflow", "pwf", "aof", "oil well"],
    rowCount: 30,
    colCount: 5,
  },
  {
    id: "ipr-composite",
    name: "Composite IPR Curve (Darcy + Vogel)",
    category: "IPR",
    description:
      "Composite IPR for oil wells: Darcy linear flow above bubble point and Vogel flow below. Combines both regions into a single deliverability curve. Includes skin effect and PI adjustment.",
    requiredFunctions: ["IPR.VW.PSS.Rate.ByVogel", "IPR.Composite"],
    tags: ["composite", "darcy", "vogel", "ipr", "bubble point"],
    rowCount: 35,
    colCount: 6,
  },
  {
    id: "ipr-gas-deliverability",
    name: "Gas Well Deliverability",
    category: "IPR",
    description:
      "Backpressure (LIT) method for gas deliverability. Enter n (flow exponent) and C (deliverability coefficient) from multi-rate test. Plots log-log deliverability curve and calculates AOF vs. Pwf.",
    requiredFunctions: ["IPR.Gas.LIT.Rate", "IPR.Gas.AOF"],
    tags: ["gas", "deliverability", "backpressure", "lit", "aof"],
    rowCount: 30,
    colCount: 5,
  },
  {
    id: "ipr-skin-impact",
    name: "Skin Damage Impact on Productivity",
    category: "IPR",
    description:
      "Quantify the productivity reduction due to skin damage. Compare Darcy PI with and without skin, calculate pressure loss due to skin, and show productivity ratio. Includes stimulation break-even analysis.",
    requiredFunctions: ["IPR.PI.Skin", "SKIN.Hawkins", "SKIN.PressureDrop"],
    tags: ["skin", "damage", "productivity", "pi", "stimulation"],
    rowCount: 28,
    colCount: 5,
  },

  // ── MBE ────────────────────────────────────────────────────────────────────
  {
    id: "mbe-pz-analysis",
    name: "Gas Reservoir p/z Analysis",
    category: "MBE",
    description:
      "Classic p/Z material balance for a volumetric dry gas reservoir. Enter p/Z vs. cumulative production data, fit a straight line, and read OGIP from the x-intercept. Includes abandonment forecast.",
    requiredFunctions: ["MBE.PZ.OGIP", "MBE.PZ.Pressure", "MBE.PZ.Recovery"],
    tags: ["p/z", "ogip", "gas", "material balance", "mbe"],
    rowCount: 40,
    colCount: 7,
  },
  {
    id: "mbe-havlena-odeh",
    name: "Havlena-Odeh Oil MBE Analysis",
    category: "MBE",
    description:
      "Havlena-Odeh linearization for oil reservoir material balance. Plot F/(Eo+mEg+Efw) vs. We/Eo to identify drive mechanism and OOIP. Supports no-aquifer, weak, and strong aquifer cases.",
    requiredFunctions: ["MBE.HavlenaOdeh.F", "MBE.HavlenaOdeh.Eo", "MBE.Drives.All"],
    tags: ["havlena-odeh", "ooip", "oil", "drive indices", "mbe", "aquifer"],
    rowCount: 45,
    colCount: 10,
  },
  {
    id: "mbe-drive-indices",
    name: "Reservoir Drive Mechanism Indices",
    category: "MBE",
    description:
      "Calculate and plot the five drive mechanism indices (DDI, GDI, WDI, CDI, Sum) as a function of cumulative production. Pie chart shows drive contributions at a selected pressure step.",
    requiredFunctions: ["MBE.Drives.All", "MBE.DriveIndex.DDI", "MBE.DriveIndex.WDI"],
    tags: ["drive indices", "ddi", "gdi", "wdi", "mbe", "recovery"],
    rowCount: 35,
    colCount: 8,
  },

  // ── PTA ────────────────────────────────────────────────────────────────────
  {
    id: "pta-horner-analysis",
    name: "Horner Plot Analysis — P* Calculation",
    category: "PTA",
    description:
      "Classic Horner buildup analysis. Enter shut-in pressure vs. (tp+Δt)/Δt, fit a straight line in the MTR, and extract permeability, skin, and extrapolated reservoir pressure P*. Includes WBS and boundary detection.",
    requiredFunctions: ["PTA.Horner.Pressure", "PTA.Horner.Pstar", "PTA.Horner.Permeability"],
    tags: ["horner", "buildup", "pta", "permeability", "skin", "p-star"],
    rowCount: 45,
    colCount: 8,
  },
  {
    id: "pta-drawdown-analysis",
    name: "Constant-Rate Drawdown Analysis",
    category: "PTA",
    description:
      "Analyze constant-rate drawdown data using the line-source solution. Compute permeability and skin from the MTR slope. Includes radial composite check and damage vs. stimulation classification.",
    requiredFunctions: ["PTA.Drawdown.Pressure", "PTA.Drawdown.Skin", "PTA.Drawdown.Permeability"],
    tags: ["drawdown", "constant rate", "pta", "radial flow", "skin", "permeability"],
    rowCount: 40,
    colCount: 7,
  },
  {
    id: "pta-bourdet-derivative",
    name: "Wellbore Storage & Skin — Type Curve Diagnostic",
    category: "PTA",
    description:
      "Log-log plot of ΔP and Bourdet derivative vs. Δt. Identifies flow regimes: WBS unit slope, transition, infinite-acting radial flow (IARF) flat derivative, and boundary effects. Matches C and S from type curve.",
    requiredFunctions: ["PTA.Bourdet.Derivative", "PTA.WBS.Coefficient"],
    tags: ["bourdet", "derivative", "wbs", "type curve", "log-log", "diagnostic"],
    rowCount: 50,
    colCount: 8,
  },

  // ── VFP ────────────────────────────────────────────────────────────────────
  {
    id: "vfp-nodal-analysis",
    name: "Nodal Analysis (IPR + VLP)",
    category: "VFP",
    description:
      "Complete nodal analysis: plots IPR and VLP curves on the same chart and finds the operating point (flow rate and flowing wellhead pressure). Supports Beggs-Brill VLP and Vogel IPR.",
    requiredFunctions: ["Nodal.OperatingPoint", "Nodal.VLPCurve", "Nodal.IPRCurve"],
    tags: ["nodal", "ipr", "vlp", "operating point", "beggs-brill", "vogel"],
    rowCount: 45,
    colCount: 8,
  },
  {
    id: "vfp-tubing-size-selection",
    name: "Tubing Size Selection Analysis",
    category: "VFP",
    description:
      "Compare IPR intersection for multiple tubing sizes (2⅜\", 2⅞\", 3½\", 4½\"). Identify the optimal tubing size that maximizes surface production rate. Includes erosional velocity check.",
    requiredFunctions: ["VFP.BeggsBrill.Gradient", "Nodal.OperatingPoint"],
    tags: ["tubing", "sizing", "vlp", "nodal", "diameter", "erosional velocity"],
    rowCount: 40,
    colCount: 10,
  },

  // ── SF ─────────────────────────────────────────────────────────────────────
  {
    id: "sf-pipeline-pressure-drop",
    name: "Pipeline Pressure Drop — Weymouth/Panhandle",
    category: "SF",
    description:
      "Gas pipeline hydraulics: compute outlet pressure, flow capacity, and pressure drop using Weymouth, Panhandle A, and Panhandle B equations. Includes velocity check and thermal (Joule-Thomson) correction.",
    requiredFunctions: ["Pipe.Weymouth.Flow", "SF.PanhandleA", "SF.PanhandleB"],
    tags: ["weymouth", "panhandle", "pipeline", "pressure drop", "gas flow"],
    rowCount: 30,
    colCount: 6,
  },
  {
    id: "sf-choke-flow",
    name: "Choke Flow Analysis",
    category: "SF",
    description:
      "Critical and subcritical gas choke flow using Gilbert, Ros, Baxendell, Achong, and Omana correlations. Determine choke size, downstream pressure, and GLR effect. Identifies critical vs. subcritical regime.",
    requiredFunctions: ["SF.Choke.Gilbert", "SF.Choke.Ros", "SF.Choke.Critical"],
    tags: ["choke", "critical flow", "subcritical", "gilbert", "ros", "bean size"],
    rowCount: 30,
    colCount: 7,
  },

  // ── FA ─────────────────────────────────────────────────────────────────────
  {
    id: "fa-hydrate-inhibitor",
    name: "Hydrate Prediction Sheet",
    category: "FA",
    description:
      "Predict hydrate formation temperature from Katz chart correlation. Calculate methanol and MEG injection rates required to suppress hydrate formation to the operating temperature. Hammerschmidt equation.",
    requiredFunctions: ["FA.HydrateTemp.ByKatz", "FA.Inhibitor.Methanol", "FA.Inhibitor.MEG"],
    tags: ["hydrate", "methanol", "meg", "inhibitor", "hammerschmidt", "katz"],
    rowCount: 30,
    colCount: 6,
  },
  {
    id: "fa-corrosion-deward",
    name: "CO₂ Corrosion Rate (de Waard-Milliams)",
    category: "FA",
    description:
      "Estimate sweet CO₂ corrosion rate using the de Waard-Milliams (1975/1991) model. Inputs: partial pressure CO₂, temperature, and pipe material. Output: corrosion rate in mm/yr with inhibitor credit option.",
    requiredFunctions: ["FA.Corrosion.DeWaardMilliams"],
    tags: ["corrosion", "co2", "de waard", "milliams", "sweet", "inhibitor"],
    rowCount: 25,
    colCount: 5,
  },

  // ── FRAC ───────────────────────────────────────────────────────────────────
  {
    id: "frac-pkn-geometry",
    name: "PKN Fracture Geometry Analysis",
    category: "FRAC",
    description:
      "PKN (Perkins-Kern-Nordgren) 2D fracture geometry: calculate average width, maximum width, fracture volume, and net pressure from pumping rate, fluid viscosity, Young's modulus, and Poisson's ratio.",
    requiredFunctions: ["FRAC.PKN.AverageWidth", "FRAC.PKN.Volume", "FRAC.PKN.NetPressure"],
    tags: ["pkn", "fracture", "width", "geometry", "hydraulic fracturing"],
    rowCount: 30,
    colCount: 6,
  },
  {
    id: "frac-design-screening",
    name: "Fracture Design Screening",
    category: "FRAC",
    description:
      "Screen fracture design options: compare PKN vs. KGD geometry, calculate proppant settling velocity, dimensionless conductivity CfD, and production uplift ratio. Includes closure stress from poroelastic model.",
    requiredFunctions: ["FRAC.PKN.AverageWidth", "FRAC.KGD.Width", "FRAC.CfD", "FRAC.Skin.Fractured", "FRAC.Poroelastic.Closure"],
    tags: ["design", "screening", "pkn", "kgd", "cfd", "proppant", "closure stress"],
    rowCount: 40,
    colCount: 8,
  },
  {
    id: "frac-nolte-g-analysis",
    name: "Nolte-G Function Analysis",
    category: "FRAC",
    description:
      "Diagnostic analysis of fracture closure from step-rate test pressure falloff data using the Nolte G-function. Identifies closure pressure, fracture gradient, and fluid efficiency from G × dP/dG derivative plot.",
    requiredFunctions: ["FRAC.Nolte.G", "FRAC.Nolte.Closure", "FRAC.FluidEfficiency", "FRAC.ISIP"],
    tags: ["nolte", "g-function", "closure", "fluid efficiency", "step-rate", "isip"],
    rowCount: 45,
    colCount: 8,
  },

  // ── SCAL ───────────────────────────────────────────────────────────────────
  {
    id: "scal-kr-curves",
    name: "SCAL Kr Curve Builder",
    category: "SCAL",
    description:
      "Build and compare water-oil and gas-oil relative permeability curves using Corey, LET, Honarpour, and Brooks-Corey models. Export curves to Eclipse SWOF/SGOF INCLUDE format for direct simulator use.",
    requiredFunctions: ["SCAL.Corey.Krw", "SCAL.Corey.Krow", "SCAL.LET.Krw", "SIM.BuildSwofTable", "SIM.SWOF"],
    tags: ["kr", "relative permeability", "corey", "let", "brooks-corey", "scal", "swof"],
    rowCount: 50,
    colCount: 10,
  },
  {
    id: "scal-capillary-pressure",
    name: "Leverett J-Function & Capillary Pressure",
    category: "SCAL",
    description:
      "Convert core plug capillary pressure data to reservoir conditions using the Leverett J-function scaling. Normalize multiple plugs to a single Pc curve. Compute free water level (FWL) and height above FWL.",
    requiredFunctions: ["SCAL.LeverettJ", "SCAL.Pc.ToReservoir", "SCAL.FWL.Height"],
    tags: ["capillary pressure", "leverett j", "fwl", "transition zone", "scal"],
    rowCount: 40,
    colCount: 8,
  },

  // ── GEO ────────────────────────────────────────────────────────────────────
  {
    id: "geo-pore-pressure-prediction",
    name: "Pore Pressure Prediction (Eaton)",
    category: "GEO",
    description:
      "Predict pore pressure from sonic (DT) log data using the Eaton (1975) method. Compute overburden stress from density log, establish normal compaction trend, and plot EMW vs. depth.",
    requiredFunctions: ["GEO.PorePressure.Eaton", "GEO.Overburden.Stress", "GEO.NormalTransitTime"],
    tags: ["pore pressure", "eaton", "sonic", "dt log", "overburden", "emw"],
    rowCount: 45,
    colCount: 7,
  },
  {
    id: "geo-mud-weight-window",
    name: "Wellbore Stability — Mud Weight Window",
    category: "GEO",
    description:
      "Calculate the drilling mud weight window from pore pressure, fracture gradient, and collapse pressure at each depth. Plot safe mud weight window as band on depth chart with target EMW trajectory.",
    requiredFunctions: ["GEO.MudWindow", "GEO.FractureGradient.Eaton", "GEO.Collapse.Gradient"],
    tags: ["mud weight", "wellbore stability", "fracture gradient", "collapse", "window", "drilling"],
    rowCount: 50,
    colCount: 8,
  },

  // ── WBI ────────────────────────────────────────────────────────────────────
  {
    id: "wbi-casing-design",
    name: "Casing Design — Burst, Collapse, Tensile",
    category: "WBI",
    description:
      "API/ISO casing design check: burst rating (Barlow), collapse rating (elastic/yield regimes), and tensile check with buoyancy correction. Applies design factors and flags any over-stressed conditions.",
    requiredFunctions: ["WBI.Burst.Rating", "WBI.Collapse.Rating", "WBI.Tensile.Check", "WBI.Tensile.BuoyancyFactor"],
    tags: ["casing", "burst", "collapse", "tensile", "barlow", "design factor", "api"],
    rowCount: 40,
    colCount: 8,
  },
  {
    id: "wbi-cement-job",
    name: "Cement Job Design",
    category: "WBI",
    description:
      "Size a primary cement job: slurry volume, minimum cement top depth, slurry density from cement/additive mix, and return height calculation. Check against regulatory minimum cement requirements.",
    requiredFunctions: ["WBI.Cement.Volume", "WBI.Cement.MinTop", "WBI.Cement.SlurryDensity", "WBI.Cement.ReturnHeight"],
    tags: ["cement", "primary cement", "slurry", "volume", "top of cement", "wbi"],
    rowCount: 35,
    colCount: 6,
  },
  {
    id: "wbi-shoe-test",
    name: "FIT / LOT / XLOT Analysis",
    category: "WBI",
    description:
      "Analyze shoe integrity tests: FIT (formation integrity test), LOT (leak-off test), and XLOT (extended LOT). Compute equivalent mud weight at test pressure, evaluate test result, and derive closure stress from XLOT.",
    requiredFunctions: ["WBI.ShoeTest.FITEquivalentMW", "WBI.ShoeTest.Evaluate", "WBI.ShoeTest.XLOTClosureStress"],
    tags: ["fit", "lot", "xlot", "shoe test", "formation integrity", "closure stress"],
    rowCount: 35,
    colCount: 6,
  },

  // ── ESP ────────────────────────────────────────────────────────────────────
  {
    id: "esp-pump-sizing",
    name: "ESP Pump Sizing",
    category: "ESP",
    description:
      "Size an Electric Submersible Pump: calculate total dynamic head (TDH), number of pump stages, motor power requirement, and cable power loss. Includes gas separation efficiency and free gas check.",
    requiredFunctions: ["ESP.TDH", "ESP.Stages", "ESP.MotorPower", "ESP.CableLoss"],
    tags: ["esp", "pump", "tdh", "stages", "motor", "electric submersible"],
    rowCount: 40,
    colCount: 7,
  },

  // ── GL ─────────────────────────────────────────────────────────────────────
  {
    id: "gl-valve-design",
    name: "Gas Lift Valve Design",
    category: "GL",
    description:
      "Design a continuous gas lift system: Thornhill-Craver injection pressure, valve spacing, and operating valve selection. Calculate injection GLR, production increase, and net compression cost.",
    requiredFunctions: ["GL.ThornhillCraver", "GL.Valve.OpeningPressure", "GL.InjectionGLR"],
    tags: ["gas lift", "valve", "thornhill-craver", "injection", "artificial lift", "glr"],
    rowCount: 45,
    colCount: 8,
  },

  // ── CNG/LNG ────────────────────────────────────────────────────────────────
  {
    id: "cnglng-lng-bog-calculator",
    name: "LNG Tank BOG Calculator",
    category: "CNG/LNG",
    description:
      "Calculate daily boil-off gas (BOG) from an LNG storage tank. Inputs: tank volume, insulation U-value, ambient temperature, LNG composition and density. Output: daily BOG rate, BOG %, and heat ingress.",
    requiredFunctions: ["CNGLNG.BOG.DailyRate", "CNGLNG.LNG.Density"],
    tags: ["lng", "bog", "boil-off", "tank", "storage", "insulation"],
    rowCount: 30,
    colCount: 6,
  },
  {
    id: "cnglng-cng-station-sizing",
    name: "CNG Station Sizing — Fast-Fill Cascade",
    category: "CNG/LNG",
    description:
      "Size a CNG fast-fill station: cascade storage cascade (high/medium/low priority banks), compressor sizing, and fill-time calculation. Includes GGE capacity and pressure equalization sequence.",
    requiredFunctions: ["CNGLNG.CNG.FillTime", "CNGLNG.CNG.Capacity", "CNGLNG.GGE"],
    tags: ["cng", "station", "cascade", "fast-fill", "compressor", "gge"],
    rowCount: 35,
    colCount: 7,
  },

  // ── Spline ──────────────────────────────────────────────────────────────────
  {
    id: "spline-pvt-table-interpolation",
    name: "PVT Table Spline Interpolation",
    category: "Spline",
    description:
      "Interpolate fluid properties (Z-factor, viscosity, Bo, Rs) from a lab PVT table using monotone PCHIP spline interpolation. Avoids overshoot artifacts in saturated oil tables. Compare linear vs. cubic interpolation side-by-side.",
    requiredFunctions: ["Spline.PCHIP", "Spline.Cubic", "Spline.Linear"],
    tags: ["spline", "interpolation", "pvt", "pchip", "cubic", "z-factor", "viscosity"],
    rowCount: 40,
    colCount: 7,
  },
  {
    id: "spline-rel-perm-smoothing",
    name: "Relative Permeability Spline Smoothing",
    category: "Spline",
    description:
      "Smooth laboratory relative permeability data using monotone PCHIP to preserve endpoints (Kro at Swi, Krw at Sorw) without introducing non-physical overshoot. Outputs smooth kr curve ready for simulation input.",
    requiredFunctions: ["Spline.PCHIP", "Spline.PchipArray", "Spline.PchipInverse"],
    tags: ["spline", "pchip", "relative permeability", "scal", "simulation", "smoothing", "kr"],
    rowCount: 35,
    colCount: 6,
  },
  {
    id: "spline-decline-rate-lookup",
    name: "Decline Rate Lookup with Bilinear Interpolation",
    category: "Spline",
    description:
      "Two-dimensional lookup of type-curve decline rate from a reservoir parameter table (e.g., matrix permeability vs. fracture spacing). Applies bilinear interpolation between four corner cells.",
    requiredFunctions: ["Spline.Bilinear", "Spline.Lookup"],
    tags: ["spline", "bilinear", "type curve", "decline", "lookup", "2d table"],
    rowCount: 30,
    colCount: 8,
  },

  // ── ECO ─────────────────────────────────────────────────────────────────────
  {
    id: "eco-project-npv-irr",
    name: "Project NPV & IRR Analysis",
    category: "ECO",
    description:
      "Discounted cash flow analysis for an oil or gas project. Enter annual production volumes, commodity prices, OPEX, CAPEX, NRI, and discount rate to calculate NPV, IRR, payout period, and profitability index.",
    requiredFunctions: [
      "ECO.NPV", "ECO.IRR", "ECO.PayoutSimple", "ECO.PayoutDiscounted",
      "ECO.ProfitabilityIndex", "ECO.BuildCashFlows",
    ],
    tags: ["npv", "irr", "dcf", "cash flow", "payout", "economics", "project evaluation"],
    rowCount: 50,
    colCount: 8,
  },
  {
    id: "eco-economic-limit",
    name: "Economic Limit & EUR at Abandonment",
    category: "ECO",
    description:
      "Calculate the minimum economic production rate (the economic limit) where gross revenue equals lease operating expense. Integrates with Arps decline to determine EUR at economic limit and time to abandonment.",
    requiredFunctions: [
      "ECO.OilEconomicLimit", "ECO.GasEconomicLimit",
      "ECO.ArpsEURAtLimit", "ECO.TimeToEconomicLimit",
    ],
    tags: ["economic limit", "eur", "abandonment", "opex", "arps", "dca", "roi"],
    rowCount: 35,
    colCount: 7,
  },
  {
    id: "eco-wi-nri-royalty",
    name: "Working Interest / NRI / Royalty Stack",
    category: "ECO",
    description:
      "Calculate working interest revenue, net revenue interest (NRI), and stacked royalty deductions for oil or gas production. Supports multiple royalty owners (lessor royalty, ORRI, state royalty) with sequential royalty stacking.",
    requiredFunctions: [
      "ECO.WorkingInterest", "ECO.NetRevenueInterest", "ECO.RoyaltyStack",
    ],
    tags: ["wi", "nri", "royalty", "orri", "working interest", "lessor", "net revenue"],
    rowCount: 30,
    colCount: 6,
  },
  {
    id: "eco-sensitivity-tornado",
    name: "NPV Sensitivity Tornado Chart",
    category: "ECO",
    description:
      "One-at-a-time sensitivity analysis showing how NPV responds to ±20% changes in oil price, gas price, OPEX, CAPEX, production, and discount rate. Results are sorted by swing magnitude for a tornado-chart presentation.",
    requiredFunctions: ["ECO.NPV", "ECO.TornadoSensitivity", "ECO.IRR"],
    tags: ["sensitivity", "tornado", "npv", "risk", "monte carlo", "economics", "swing"],
    rowCount: 45,
    colCount: 8,
  },
  {
    id: "eco-gas-price-escalation",
    name: "Gas Price Escalation & After-Tax NPV",
    category: "ECO",
    description:
      "Build an escalated gas price schedule, compute nominal cash flows with inflation adjustment, and calculate after-tax NPV with UOP depletion shielding. Includes break-even price analysis.",
    requiredFunctions: [
      "ECO.GasPriceEscalation", "ECO.InflationAdjust", "ECO.AfterTaxNPV",
      "ECO.AfterTaxNPVWithDepletion", "ECO.BreakEvenPrice",
    ],
    tags: ["gas price", "escalation", "inflation", "after-tax", "npv", "depletion", "tax"],
    rowCount: 50,
    colCount: 8,
  },

  // ── WPA ─────────────────────────────────────────────────────────────────────
  {
    id: "wpa-proportional-proration",
    name: "Field Proration — Proportional Allocation",
    category: "WPA",
    description:
      "Allocate a measured field total to individual wells by proportional proration (well rate / field rate). Includes PI-weighted and AOF-weighted allocation methods for comparison. Handles shut-in wells and partial-month production.",
    requiredFunctions: [
      "WPA.Proportional", "WPA.PIWeighted", "WPA.AOFWeighted", "WPA.EqualShare",
    ],
    tags: ["proration", "allocation", "field", "wpa", "pi weighted", "aof", "well rates"],
    rowCount: 40,
    colCount: 9,
  },
  {
    id: "wpa-curtailment-vrr",
    name: "Capacity Curtailment & Voidage Replacement Ratio",
    category: "WPA",
    description:
      "Apply facility capacity constraints to a group of producing wells using iterative curtailment (cap-and-redistribute). Calculate required injection rate to achieve target voidage replacement ratio (VRR) for reservoir pressure maintenance.",
    requiredFunctions: [
      "WPA.CapacityCurtailment", "WPA.ActualVRR", "WPA.RequiredInjectionRate",
      "WPA.VoidageRate",
    ],
    tags: ["curtailment", "vrr", "voidage", "injection", "capacity", "wpa", "reservoir pressure"],
    rowCount: 45,
    colCount: 8,
  },
  {
    id: "wpa-field-summary",
    name: "Field Production Summary Dashboard",
    category: "WPA",
    description:
      "Aggregate individual well rates into a field-level production summary. Calculates total oil, gas, and water rates; field GOR; field WOR; field productivity index; and well-count by status. Also reconciles metered volumes to fiscal test separator data.",
    requiredFunctions: [
      "WPA.FieldSummary", "WPA.FieldPI", "WPA.Reconcile",
    ],
    tags: ["field summary", "wpa", "gor", "wor", "production", "dashboard", "reconcile"],
    rowCount: 50,
    colCount: 10,
  },

  // ── Utilities ───────────────────────────────────────────────────────────────
  {
    id: "utils-unit-converter",
    name: "Unit Converter Reference Sheet",
    category: "Utilities",
    description:
      "Quick-reference unit conversion sheet covering all P365 unit categories: pressure, temperature, length, volume, flow rate, energy, density, viscosity, permeability, torque, thermal conductivity, and specific heat. Use P365.UnitConverter() in any cell.",
    requiredFunctions: ["UnitConverter"],
    tags: ["units", "converter", "psi", "bar", "mpa", "stb", "m3", "bbl", "psia", "torque", "thermal"],
    rowCount: 50,
    colCount: 5,
  },

  // ── RTA — Rate-Transient Analysis ───────────────────────────────────────────
  {
    id: "rta-flowing-material-balance",
    name: "Flowing Material Balance (FMB)",
    category: "RTA",
    description:
      "Flowing material balance analysis for gas or oil wells. Computes material balance time, rate-normalized pressure (RNP), and performs linear regression to estimate OGIP (gas) or OOIP (oil) from the RNP vs. material balance time straight line. Includes recovery factor and FMB quality metrics (R²).",
    requiredFunctions: [
      "RTA.MaterialBalanceTime",
      "RTA.RNP",
      "RTA.FMBGas",
      "RTA.FMBOil",
      "RTA.RecoveryFactorFMB",
    ],
    tags: ["rta", "fmb", "flowing material balance", "ogip", "ooip", "recovery factor", "rnp", "gas", "oil"],
    rowCount: 55,
    colCount: 12,
  },
  {
    id: "rta-bplot-diagnostic",
    name: "RTA b-Plot Diagnostic",
    category: "RTA",
    description:
      "Rate-transient b-plot diagnostic for flow regime identification. Computes the Blasingame loss-ratio b = -q/(dq/dt) and its derivative bDot = db/dt at each time step. A constant b indicates boundary-dominated flow (BDF); increasing b indicates transient flow. Includes Arps b-exponent estimation and Blasingame dimensionless type-curve parameters.",
    requiredFunctions: [
      "RTA.BPlot",
      "RTA.BlassingameDimRate",
      "RTA.BlassingameDimTime",
      "RTA.ArpsBExponent",
    ],
    tags: ["rta", "b-plot", "blasingame", "loss ratio", "flow regime", "transient", "bdf", "decline"],
    rowCount: 60,
    colCount: 10,
  },
  {
    id: "rta-permeability-skin",
    name: "RTA Permeability and Skin from RNP",
    category: "RTA",
    description:
      "Estimate reservoir permeability and wellbore skin from rate-normalized pressure (RNP) vs. log(tc) straight-line analysis during infinite-acting radial flow (IARF). Uses the slope m* = 1637T/(kh) to compute k and the Horner-style equation for skin. Also includes PSS kh estimation and pseudo-time correction for gas wells.",
    requiredFunctions: [
      "RTA.PermeabilityFromRNP",
      "RTA.SkinFromRNP",
      "RTA.KhFromPSSRNP",
      "RTA.PseudoPressure",
      "RTA.PseudoTime",
    ],
    tags: ["rta", "permeability", "skin", "rnp", "iarf", "gas well", "pseudo-pressure", "pseudo-time"],
    rowCount: 45,
    colCount: 10,
  },

  // ── PTA extended — Interference and Pulse Tests ──────────────────────────────
  {
    id: "pta-interference-test",
    name: "Interference Test Analysis",
    category: "PTA",
    description:
      "Multi-well interference test analysis using the line-source Ei solution. Compute pressure response at an observation well due to production at an active well, estimate permeability and storativity from observed responses, and generate a pressure history match. Suitable for single-layer homogeneous reservoirs.",
    requiredFunctions: [
      "PTA.Interference.TransientPressure",
      "PTA.Interference.Permeability",
      "PTA.Interference.Storativity",
    ],
    tags: ["pta", "interference", "multi-well", "observation well", "permeability", "storativity", "ei"],
    rowCount: 50,
    colCount: 10,
  },
  {
    id: "pta-pulse-test",
    name: "Pulse Test Analysis",
    category: "PTA",
    description:
      "Pulse test design and analysis. Compute expected pulse response amplitudes, estimate permeability from observed amplitudes, and determine storativity from pulse lag times. Includes guidance on pulse period selection and dimensionless lag time x_L values for the first odd pulse (Johnson-Greenkorn-Woods method).",
    requiredFunctions: [
      "PTA.PulseTest.Amplitude",
      "PTA.PulseTest.Permeability",
      "PTA.PulseTest.Storativity",
    ],
    tags: ["pta", "pulse test", "inter-well", "permeability", "storativity", "lag time", "amplitude"],
    rowCount: 45,
    colCount: 10,
  },

  // ── EoS extended — Phase Stability ──────────────────────────────────────────
  {
    id: "eos-stability-flash",
    name: "EoS Phase Stability and Flash",
    category: "EoS",
    description:
      "Peng-Robinson EoS phase stability test (Michelsen 1982) followed by two-phase flash. Initialize K-values with Wilson's equation, run the tangent-plane distance (TPD) stability test to determine if the feed is stable or two-phase, then perform rigorous PT flash to get equilibrium compositions, K-values, and vapor fraction.",
    requiredFunctions: [
      "EoS.PR.WilsonK",
      "EoS.PR.StabilityTest",
      "EoS.PR.Flash",
      "EoS.PR.BubblePoint",
    ],
    tags: ["eos", "stability", "tpd", "michelsen", "flash", "k-values", "wilson", "phase equilibrium", "pr"],
    rowCount: 50,
    colCount: 12,
  },

  // ── EoS — Phase Envelope (Session 17) ──────────────────────────────────────
  {
    id: "eos-phase-envelope",
    name: "PR EoS Phase Envelope",
    category: "EoS",
    description:
      "Construct the full P-T phase envelope for a multicomponent mixture using the Peng-Robinson equation of state. Scans bubble-point and dew-point pressures across a temperature range to trace the phase boundary, then identifies the cricondentherm (maximum temperature on the envelope) and cricondenbar (maximum pressure on the envelope). Essential for gas condensate and retrograde-condensate reservoir characterization.",
    requiredFunctions: [
      "EoS.PR.PhaseEnvelope",
      "EoS.PR.Cricondentherm",
      "EoS.PR.Cricondenbar",
      "EoS.PR.PhaseEnvelopePoint",
      "EoS.PR.PhaseEnvelopeDewPoint",
    ],
    tags: ["eos", "phase envelope", "cricondentherm", "cricondenbar", "bubble point", "dew point", "pr", "p-t diagram", "gas condensate"],
    rowCount: 60,
    colCount: 10,
  },

  // ── FRAC — TSO Design (Session 17) ─────────────────────────────────────────
  {
    id: "frac-tso-design",
    name: "Tip Screen-Out (TSO) Fracture Design",
    category: "FRAC",
    description:
      "Design a hydraulic fracturing tip screen-out (TSO) treatment to maximize proppant packing and fracture conductivity. Uses PKN geometry with Carter fluid-loss model to predict fracture dimensions at screen-out, then evaluates proppant areal concentration and pack fill fraction. Also includes a refrac candidate scoring worksheet to assess whether the well is a good re-fracturing candidate based on productivity decline, pressure depletion, and skin damage.",
    requiredFunctions: [
      "FRAC.TSO.Design",
      "FRAC.ProppantConcentration",
      "FRAC.RefracScore",
      "FRAC.PKN.Length",
      "FRAC.PKN.Width",
    ],
    tags: ["frac", "tso", "tip screen-out", "proppant", "pkn", "fracture design", "conductivity", "refrac", "stimulation"],
    rowCount: 55,
    colCount: 10,
  },

  // ── WPA — Pattern Flood (Session 17) ───────────────────────────────────────
  {
    id: "wpa-pattern-flood",
    name: "Pattern Flood Analysis",
    category: "WPA",
    description:
      "Analyze waterflood or injection pattern efficiency using a suite of allocation and sweep methods. Computes kh-weighted injection allocation for a five-spot pattern, balances injector rates to achieve a target voidage replacement ratio (VRR), estimates volumetric sweep efficiency using the Dykstra-Parsons heterogeneity coefficient and the Koval mobility ratio method, and applies the Stiles (1949) layer-by-layer sweep model for stratified reservoirs. Use alongside the VRR and field production summary blueprints for a complete waterflood management workflow.",
    requiredFunctions: [
      "WPA.FiveSpotAllocation",
      "WPA.PatternFloodBalance",
      "WPA.DykstraParsonsMobility",
      "WPA.StilesSweep",
    ],
    tags: ["wpa", "waterflood", "pattern flood", "five-spot", "vrr", "voidage replacement", "dykstra-parsons", "stiles", "sweep efficiency", "injection"],
    rowCount: 50,
    colCount: 12,
  },
  {
    id: "pta-horner-buildup",
    name: "Horner Pressure Buildup Analysis",
    category: "PTA",
    description:
      "Analyze pressure buildup test data using the Horner method. Enter shut-in pressure vs. elapsed time, producing time (tp), and fluid/reservoir properties. The sheet computes the Horner time ratio (tp+Δt)/Δt, plots Pws on a semi-log Horner plot, extracts the slope m, then calculates permeability (k), skin factor (S), and extrapolated static reservoir pressure (p*) using the Miller-Dyes-Hutchinson (MDH) and Horner techniques. Includes a wellbore storage diagnostic (unit-slope log-log overlay) to identify the start of the semi-log straight line and a dual-porosity identification check (storativity ratio ω).",
    requiredFunctions: [
      "PTA.HornerAnalysis",
      "PTA.MDHAnalysis",
      "PTA.WellboreStorageDiagnostic",
      "PTA.DualPorosityPwf",
    ],
    tags: ["pta", "pressure buildup", "horner", "mdh", "skin", "permeability", "p*", "well test", "dual porosity", "wellbore storage"],
    rowCount: 60,
    colCount: 10,
  },
  {
    id: "eos-lk-mixture",
    name: "Lee-Kesler Mixture Properties",
    category: "EoS",
    description:
      "Calculate thermodynamic properties for a multi-component gas mixture using the Lee-Kesler (1975) corresponding-states correlation with Pitzer three-parameter extension. Enter component critical properties (Tc, Pc, ω) and mole fractions. The sheet computes Kay's rule pseudocritical properties (Tc_mix, Pc_mix, ω_mix), then evaluates the Lee-Kesler BWR equation of state for simple and reference (n-octane) fluids to obtain: compressibility factor Z, dimensionless departure enthalpy (H−H^ig)/(RTc), and departure entropy (S−S^ig)/R. Useful for custody-transfer gas metering, separator design, and pipeline flow simulation.",
    requiredFunctions: [
      "EoS.LKMixturePseudoCriticals",
      "EoS.LKMixtureZ",
      "EoS.LKMixtureProperties",
    ],
    tags: ["eos", "lee-kesler", "mixture", "pseudocriticals", "kay's rule", "z-factor", "departure enthalpy", "departure entropy", "thermodynamics", "gas properties"],
    rowCount: 35,
    colCount: 10,
  },
  {
    id: "geo-deviated-stability",
    name: "Deviated Wellbore Stability",
    category: "GEO",
    description:
      "Mud weight window for deviated wells combining Kirsch stress analysis with ECD. Computes breakdown and collapse pressures for an inclined wellbore using the Kirsch transformation of the in-situ stress tensor, converts to equivalent mud weight, and overlays the equivalent circulating density to flag whether the circulating mud weight falls within the stability window.",
    requiredFunctions: ["GEO.DeviatedKirsch", "GEO.ECD", "GEO.MudWeightWindowECD"],
    tags: ["geo", "deviated well", "kirsch", "stability", "mud weight", "ecd", "wellbore", "collapse", "breakdown"],
    rowCount: 45,
    colCount: 8,
  },
  {
    id: "sim-stars-deck",
    name: "STARS Simulation Deck",
    category: "SIM",
    description:
      "CMG STARS keyword generator for thermal simulation (GRID/PORO/PERM/TEMP). Generates the full set of CMG STARS include-file keywords for grid geometry, initial porosity, permeability tensor, and initial temperature distribution. Useful for heavy oil, SAGD, and steamflood simulation setups.",
    requiredFunctions: ["SIM.StarsGrid", "SIM.StarsPoro", "SIM.StarsPerm", "SIM.StarsTemp"],
    tags: ["sim", "cmg", "stars", "thermal", "sagd", "steam", "heavy oil", "grid", "porosity", "permeability", "temperature"],
    rowCount: 50,
    colCount: 8,
  },
];

// ─── Catalog Accessors ────────────────────────────────────────────────────────

/**
 * Get all blueprints in a given category.
 *
 * @param category   Engineering discipline category
 * @returns          Filtered array of Blueprint entries
 */
export function getBlueprintsByCategory(category: BlueprintCategory): Blueprint[] {
  return BLUEPRINT_CATALOG.filter(b => b.category === category);
}

/**
 * Search blueprints by keyword (matches name, description, or tags).
 *
 * @param keyword   Search string (case-insensitive)
 * @returns         Matching blueprints sorted by relevance (name match first)
 */
export function searchBlueprints(keyword: string): Blueprint[] {
  const kw = keyword.toLowerCase();
  const nameMatch: Blueprint[] = [];
  const otherMatch: Blueprint[] = [];
  for (const b of BLUEPRINT_CATALOG) {
    const inName = b.name.toLowerCase().includes(kw);
    const inDesc = b.description.toLowerCase().includes(kw);
    const inTags = b.tags.some(t => t.includes(kw));
    if (inName) {
      nameMatch.push(b);
    } else if (inDesc || inTags) {
      otherMatch.push(b);
    }
  }
  return [...nameMatch, ...otherMatch];
}

/**
 * Get a blueprint by its unique id slug.
 *
 * @param id   Blueprint id
 * @returns    Blueprint entry or undefined if not found
 */
export function getBlueprintById(id: string): Blueprint | undefined {
  return BLUEPRINT_CATALOG.find(b => b.id === id);
}

/**
 * Get all unique categories in the catalog.
 *
 * @returns  Array of BlueprintCategory values present in the catalog
 */
export function getBlueprintCategories(): BlueprintCategory[] {
  return [...new Set(BLUEPRINT_CATALOG.map(b => b.category))];
}
