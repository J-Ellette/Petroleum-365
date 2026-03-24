# Petroleum 365 — Copilot Progress Log

## Project Overview
Building **Petroleum 365 (P365)** — an Excel/Office.js add-in for petroleum engineering.
Reference guide: [P365.md](./P365.md)

## Architecture Decision
**Office.js TypeScript Add-in** — cross-platform (Win/Mac/Web), modern API, TypeScript-first.

```
src/
  functions/        ← Pure engineering functions (TypeScript)
    pvt/            ← Pressure-Volume-Temperature correlations
    dca/            ← Decline Curve Analysis
    ipr/            ← Inflow Performance Relationship
    vfp/            ← Vertical Flow Performance
    mbe/            ← Material Balance Equation
    pta/            ← Pressure Transient Analysis
    sf/             ← Surface Facilities (choke, pipeline)
    fa/             ← Flow Assurance (hydrate, corrosion, erosion)
    esp/            ← Electric Submersible Pump
    gl/             ← Gas Lift
    rp/             ← Rod Pump
    scal/           ← Special Core Analysis
    eos/            ← Equation of State
    frac/           ← Hydraulic Fracturing
    fpp/            ← Field Production Profile
    cnglng/         ← CNG and LNG calculations
    hv/             ← Heating Value (GPA 2145)
    aga8/           ← AGA-8 Z-factor for custody transfer
    nodal/          ← Nodal Analysis (IPR + VLP)
    wht/            ← Wellbore Heat Transfer
    geo/            ← Geomechanics (pore pressure, fracture gradient, stability)
    skin/           ← Composite Skin Factor
    utilities/      ← Unit converter, spline, math utils
    pipe/           ← Pipe sizing calculator
  addins/           ← Office add-in planning and helpers
    word/           ← Word Document add-in (report templates)
    outlook/        ← Outlook MailApp add-in (email generation)
    teams/          ← Teams add-in (tab + bot + adaptive cards)
    powerpoint/     ← PowerPoint add-in (slide deck generation)
    onenote/        ← OneNote Notebook add-in (calculation notes)
    access/         ← Access Database schema + integration
  taskpane/         ← React UI (Blueprint Manager, Function Browser)
  commands/         ← Ribbon command handlers
test/               ← Jest unit tests (mirrors src/functions/)
manifest.xml        ← Office Add-in manifest
webpack.config.js   ← Build config
```

## Session Log

### Session 1 — Project Scaffold + Core PVT + Pipe Sizing
**Status:** In Progress

#### Completed
- [x] Read and understood full P365.md blueprint
- [x] Created copilot.md (this file)
- [x] Set up npm project (package.json, tsconfig.json, jest config, .gitignore)
- [x] Implemented PVT function library:
  - [x] Gas pseudo-critical properties: Lee-Kesler, Kay's mixing rule, Wichert-Aziz sour gas correction
  - [x] Gas Z-factor: Dranchuk-Abou-Kassem (DAK), Brill-Beggs, Hall-Yarborough
  - [x] Gas viscosity: Lee-Gonzalez-Eakin
  - [x] Gas density, compressibility (numerical), FVF (Bg)
  - [x] Oil API ↔ SG conversion
  - [x] Oil bubble point: Standing, Vasquez-Beggs
  - [x] Oil solution GOR: Standing, Vasquez-Beggs
  - [x] Oil FVF: Standing (saturated), Vasquez-Beggs (saturated), undersaturated (compressibility correction)
  - [x] Oil compressibility: Vasquez-Beggs
  - [x] Oil viscosity: Beal (dead), Egbogah (dead), Beggs-Robinson (saturated), Vasquez-Beggs (undersaturated)
  - [x] Water PVT: FVF, solution GOR, compressibility, viscosity, density (all McCain)
- [x] Implemented Pipe Sizing Calculator (P365.md §Pipe length/diameter/BTUh):
  - [x] Weymouth equation: flow, outlet pressure, max length
  - [x] Forward (flow → max length): BTUh/MBTUh/MMBTUh output
  - [x] Reverse (BTUh → diameter): standard pipe size recommendation
  - [x] Equivalent length fittings table (NFPA 54/AGA): 11 fitting types, NPS ½"–6"
  - [x] Multi-segment run (up to 15 segments, cascading pressure)
  - [x] Material roughness: bare steel 0.000150 ft, coated steel 0.000100 ft, PE 0.000005 ft
  - [x] Standard pipe sizes: ASME B36.10M (Sch 40 steel) and ASTM D2513 SDR-11 (PE)
  - [x] Gas velocity check (< 40 ft/s recommended)
- [x] Implemented Unit Converter (P365.UnitConverter):
  - [x] 60+ unit pairs: pressure, temperature, length, area, volume, mass, flow, energy, power, viscosity, density, permeability, time, heating value, molar
  - [x] Temperature offset handling (°F ↔ °C ↔ K ↔ °R)
  - [x] Scaled units: "640 acre", "1000 ft"
  - [x] Unit expressions: "bbl*psi/day"
- [x] Implemented DCA — Decline Curve Analysis:
  - [x] Arps: Rate, Cumulative (exponential, hyperbolic, harmonic)
  - [x] Arps Modified Hyperbolic (transitions to exponential at terminal decline rate)
  - [x] Duong: Rate, Cumulative (numerical integration for unconventional reservoirs)
  - [x] Curve fitting: Arps.Fit, Duong.Fit (gradient descent)
  - [x] EUR calculator (economic limit, with/without modified hyperbolic)
  - [x] Decline rate conversions (effective ↔ nominal)
- [x] Created Office.js manifest (manifest.xml) with ribbon, task pane, custom functions
- [x] Created custom functions metadata (src/functions.json) for Excel IntelliSense
- [x] Written 109 Jest unit tests — all passing
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] CodeQL scan: 0 alerts

### Session 2 — IPR + MBE + PTA Function Libraries
**Status:** Complete

#### Completed
- [x] Implemented IPR — Inflow Performance Relationship (src/functions/ipr/index.ts):
  - [x] Productivity Index (PI = q/(Pr-Pwf)), Darcy rate
  - [x] PSS PI: kh/[141.2·μ·Bo·(ln(re/rw)−0.75+S)]
  - [x] SS PI: kh/[141.2·μ·Bo·(ln(re/rw)+S)]
  - [x] Transient PI (time-dependent, Ei-function based)
  - [x] Vogel (1968) IPR: rate, Qmax back-calculation, AOF
  - [x] Composite IPR (Darcy above Pb, Vogel below Pb)
  - [x] Fetkovich empirical backpressure IPR: rate, AOF
  - [x] Klins-Clark (1993) modified Vogel with d-exponent
  - [x] Gas well Darcy deliverability (PSS, field units)
  - [x] Gas well non-Darcy deliverability (turbulence, iterative)
  - [x] Horizontal well PI: Joshi (1988) and Renard-Dupuy (1991) correlations
  - [x] Skin impact: PI ratio (J_damaged/J_ideal), skin pressure drop (ΔPs)
- [x] Implemented MBE — Material Balance Equation (src/functions/mbe/index.ts):
  - [x] Gas p/Z ratio, OGIP from two-point method, OGIP from linear regression
  - [x] Gas reservoir pressure forecast at Gp
  - [x] Oil expansion term Eo, gas-cap expansion Eg, formation/water expansion Efw
  - [x] Underground withdrawal F (reservoir voidage)
  - [x] Havlena-Odeh straight-line method (OOIP, mN, R²)
  - [x] Drive mechanism indices: solution gas, gas cap, water, compressibility
  - [x] Effective reservoir compressibility (ct)
  - [x] Fetkovich aquifer model: Wei, J, stepwise water influx
  - [x] Geopressured (modified) p/Z and OGIP correction
- [x] Implemented PTA — Pressure Transient Analysis (src/functions/pta/index.ts):
  - [x] Ei function (exponential integral, series expansion, accurate for all u > 0)
  - [x] Dimensionless time tD (at wellbore and at radius r)
  - [x] Dimensionless pressure PD (line-source solution via Ei)
  - [x] PD → actual pressure drop conversion
  - [x] Drawdown Pwf: semilog approximation (MDH) and exact Ei solution
  - [x] Horner time ratio, buildup pressure, permeability, skin, P* extrapolation
  - [x] MDH drawdown slope → permeability and skin
  - [x] Superposition (van Wijnen/multi-rate) for arbitrary rate history
  - [x] Fault buildup (image well method, sealing fault, includes tp)
  - [x] Bourdet pressure derivative (smoothed numerical)
  - [x] Wellbore storage coefficient C and CD
- [x] Updated src/index.ts to export IPR, MBE, PTA namespaces
- [x] Written 105 new Jest unit tests (214 total, all passing)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)

#### Stopping Point — Session 2
Good stopping point after IPR + MBE + PTA with 214 tests passing.

### Session 3 — VFP + SF + FA + FRAC + FPP + SCAL
**Status:** Complete

#### Completed
- [x] Implemented VFP — Vertical Flow Performance (src/functions/vfp/index.ts):
  - [x] Single-phase liquid: Fanning/Darcy-Weisbach (ΔP, BHP)
  - [x] Single-phase gas: average T-Z method (BHP, outlet pressure)
  - [x] Beggs & Brill (1973): gradient, BHP, VLP curve — any inclination
  - [x] Gray (1974): pressure gradient for gas-condensate wells
  - [x] Hagedorn & Brown (1965): oil well pressure gradient
  - [x] Turner et al. (1969) critical velocity + minimum gas rate for liftoff
  - [x] VLP curve generator for nodal analysis
- [x] Implemented SF — Surface Facilities (src/functions/sf/index.ts):
  - [x] Choke: Gilbert, Ros, Baxendell, Achong, Pilehvari critical flow correlations
  - [x] Choke rate, bean size, critical flow check, all-correlations comparison
  - [x] Gas pipeline: Panhandle A & B flow rate and outlet pressure
  - [x] Gas pipeline comparison function (all three correlations)
  - [x] Compressor: polytropic power (hp), interstage pressures, discharge temperature
- [x] Implemented FA — Flow Assurance (src/functions/fa/index.ts):
  - [x] Hammerschmidt (1934) hydrate temperature depression (methanol, MEG, DEG, TEG, CaCl₂)
  - [x] Hammerschmidt inverse: required inhibitor concentration
  - [x] Katz (1945) hydrate formation temperature from specific gravity
  - [x] Methanol injection rate (lb/d), MEG injection rate (bbl/d)
  - [x] de Waard-Milliams (1991) CO2 corrosion rate (mm/yr)
  - [x] CO2 partial pressure, corrosion severity, inhibited rate, corrosion allowance
  - [x] API RP 14E erosion: mixture density, erosional velocity, mixture velocity, ratio, risk
  - [x] Integrated flow assurance assessment (hydrate + corrosion + erosion)
- [x] Implemented FRAC — Hydraulic Fracturing (src/functions/frac/index.ts):
  - [x] PKN geometry: avg width, max width, volume, fluid efficiency, net pressure
  - [x] KGD geometry: avg width, volume
  - [x] Radial (penny-shaped) fracture radius
  - [x] Carter (1957) leakoff coefficient and cumulative fluid loss
  - [x] Stokes/modified proppant settling velocity (ft/min) + Walton hindered settling
  - [x] Dimensionless fracture conductivity CfD
  - [x] Cinco-Ley/Samaniego fractured well equivalent skin factor
  - [x] Fracture stimulation ratio (folds of increase)
  - [x] Proppant density and fracture permeability reference tables
- [x] Implemented FPP — Field Production Profile (src/functions/fpp/index.ts):
  - [x] Buildup-Plateau-Decline (BPD) model: rate at time t, cumulative production
  - [x] Rate profile generator (time series array), economic limit cutoff
  - [x] EUR calculation (analytical Arps decline, economic limit search)
  - [x] Profile statistics: peak rate, peak time, plateau average, EUR
  - [x] Multi-well schedule aggregation: rate, full time-series profile
- [x] Implemented SCAL — Special Core Analysis (src/functions/scal/index.ts):
  - [x] Corey power-law Kr: krw, kro, table generator (oil-water)
  - [x] LET (Lomeland-Ebeltoft-Thomas 2005): krw, kro
  - [x] Honarpour (1982) gas-oil Kr: sandstone and carbonate
  - [x] Brooks-Corey capillary pressure (Pc, Sw from Pc, height above FWL)
  - [x] Van Genuchten (1980) capillary pressure model
  - [x] Leverett J-function: J calculation and Pc from J (cross-rock scaling)
  - [x] Stone I (1970) and Stone II (1973) three-phase oil Kr
  - [x] Buckley-Leverett (1942) fractional flow + Welge (1952) tangent construction
  - [x] Newman (1973) rock compressibility (sandstone, limestone, chalk)
- [x] Updated src/index.ts with VFP, SF, FA, FRAC, FPP, SCAL namespaces
- [x] Written 161 new Jest unit tests (375 total, all passing)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)

#### Stopping Point — Session 3
Good stopping point after VFP + SF + FA + FRAC + FPP + SCAL with 375 tests passing.

### Session 4 — EoS + ESP + GL + RP + CNG/LNG + VEH + DCA Extensions
**Status:** Complete

#### Completed
- [x] Implemented EoS — Equation of State (src/functions/eos/index.ts):
  - [x] PR cubic roots solver (Cardano's method for all 3 roots)
  - [x] Peng-Robinson A, B parameters (kappa, alpha, a(T), b)
  - [x] PR Z-factor for vapor (max root) and liquid (min root)
  - [x] Fugacity coefficient ln(φ) from PR EoS
  - [x] Multi-component mixing rules (van der Waals, binary interaction kij)
  - [x] Bubble point pressure (successive substitution, Wilson K-values)
  - [x] Dew point pressure (successive substitution, Wilson K-values)
  - [x] Two-phase flash (Rachford-Rice, up to 200 iterations, tol 1e-8)
- [x] Implemented ESP — Electric Submersible Pump (src/functions/esp/index.ts):
  - [x] Total Dynamic Head (TDH): static + friction + backpressure
  - [x] Hydraulic HP and Brake HP
  - [x] Number of pump stages (ceiling of TDH / head per stage)
  - [x] Motor HP (with service factor), motor current (3-phase)
  - [x] Cable voltage drop (resistance × current × depth)
  - [x] Void fraction at pump intake (free gas fraction)
  - [x] Gas handling risk classification (low/moderate/severe)
  - [x] Operating point: pump curve vs TDH intersection by linear interpolation
- [x] Implemented GL — Gas Lift (src/functions/gl/index.ts):
  - [x] Current GLR, required injection rate, total GLR
  - [x] Thornhill-Craver orifice throughput (critical and subcritical flow)
  - [x] Valve dome pressure at depth, TRO (test rack opening) pressure
  - [x] Valve closing pressure, spread, injection pressure at depth
  - [x] Critical flow check (Pdown/Pup < 0.55)
  - [x] Optimal injection depth (tubing vs casing pressure crossover)
- [x] Implemented RP — Rod Pump (src/functions/rp/index.ts):
  - [x] Pump displacement (bore, stroke, SPM, efficiency → bbl/d)
  - [x] Fluid load and rod weight calculations
  - [x] PPRL (peak polished rod load) and MPRL (minimum polished rod load)
  - [x] Peak torque at gear reducer
  - [x] Counterbalance effect at crank angle
  - [x] Motor HP requirement
  - [x] Stroke length from crank geometry
  - [x] API pumping unit class designation
- [x] Implemented CNG/LNG (src/functions/cnglng/index.ts):
  - [x] CNG density (ideal-gas law with Z-factor correction)
  - [x] CNG cylinder usable capacity (scf), GGE, DGE conversions
  - [x] Fill time calculation, cascade bank design (3-bank system)
  - [x] LNG density: GIIGNL-style correlation (T_K, MW dependent)
  - [x] LNG density from mole composition (additive volumes)
  - [x] BOG rate (kg/d and MJ/d), vaporization enthalpy (Watson correlation)
  - [x] LNG heel calculation (voyage BOG), MMBtu conversion, tonne conversion
  - [x] LNG price to Henry Hub equivalent
- [x] Extended MBE with Van Everdingen-Hurst aquifer model:
  - [x] vehQFunction(tD): dimensionless cumulative influx (3-range polynomial fit)
  - [x] vehPD(tD, rD): dimensionless pressure (Ei-function based)
  - [x] vehAquiferConstant(phi, ct, h, ri, theta): B' (bbl/psi, field units)
  - [x] vehTD(t_days, k, phi, mu_w, ct, ri): dimensionless time
  - [x] vehWaterInflux(B_prime, deltaP_arr, Q_arr, tD_arr): superposition We (bbl)
- [x] Extended DCA with 3 new models:
  - [x] PLE (Power Law Exponential): rate and cumulative (pleRate, pleCumulative)
  - [x] SEPD (Stretched Exponential): rate and cumulative (sepdRate, sepdCumulative)
  - [x] LGM (Logistic Growth Model): rate, cumulative, EUR (lgmRate, lgmCumulative, lgmEUR)
- [x] Updated src/index.ts with EoS, ESP, GL, RP, CNGLNG namespaces and DCA/MBE extensions
- [x] Written 164 new Jest unit tests (539 total, all passing)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)

#### Stopping Point — Session 4
Good stopping point after EoS + ESP + GL + RP + CNG/LNG + VEH + DCA extensions with 539 tests passing.

### Session 5 — HV + AGA-8 + Nodal + WHT + README
**Status:** Complete

#### Completed
- [x] Implemented HV — Heating Value (src/functions/hv/index.ts):
  - [x] `hvMolecularWeight`: mixture MW from composition (GPA 2145)
  - [x] `hvSpecificGravity`: gas SG from composition
  - [x] `hvHHV`: Higher Heating Value (BTU/scf)
  - [x] `hvLHV`: Lower Heating Value (BTU/scf)
  - [x] `hvWobbeIndex`: Wobbe Index = HHV / √SG
  - [x] `hvHHV_MJNm3`, `hvLHV_MJNm3`: SI heating values
  - [x] `hvAnalysis`: complete composition analysis (MW, SG, HHV, LHV, Wobbe)
  - [x] 18 supported components: C1–C7, iC4, nC4, iC5, nC5, N2, CO2, H2S, H2, CO, O2, He, H2O, Ar
- [x] Implemented AGA-8 Z-factor (src/functions/aga8/index.ts):
  - [x] `aga8CharProps`: critical properties for 15 standard gas components
  - [x] `aga8MixProps`: mixture Tc/Pc/MW/ω via Kay's mixing rule
  - [x] `aga8Z`: Z-factor (SI: MPa, K) via Hall-Yarborough on mixture pseudo-criticals
  - [x] `aga8Density`: molar density (mol/L) from Z
  - [x] `aga8CompressibilityFactor`: field-unit wrapper (psia, °F)
- [x] Implemented Nodal Analysis (src/functions/nodal/index.ts):
  - [x] `nodalOperatingPoint`: generic IPR + VLP bisection solver
  - [x] `nodalIPRVogel`: oil well nodal (Vogel IPR + Beggs-Brill VLP)
  - [x] `nodalGasWell`: gas well nodal (Darcy IPR + single-phase avg T-Z)
  - [x] `nodalSweep`: evaluate function over rate range (returns curve data)
  - [x] Self-contained — no circular imports from ipr/vfp modules
- [x] Implemented WHT — Wellbore Heat Transfer (src/functions/wht/index.ts):
  - [x] `whtGeothermalTemp`: formation temperature at depth (geothermal gradient)
  - [x] `whtOHTC`: overall heat transfer coefficient (cylindrical coordinates)
  - [x] `whtFluidTemp`: Ramey (1962) fluid temperature profile along wellbore
  - [x] `whtInsulationThickness`: required insulation for target U (BTU/hr/ft²/°F)
  - [x] `whtHeatLoss`: total wellbore heat loss rate (BTU/hr)
- [x] Built out README.md with full documentation:
  - [x] Purpose, target audience, features overview
  - [x] Complete function reference for all 22 modules (650+ functions)
  - [x] Installation, usage (TypeScript + Excel), naming convention
  - [x] Development guide, project structure, coding conventions
  - [x] Unit converter reference, blueprints list, Excel add-in guide
- [x] Updated src/index.ts with HV, AGA8, Nodal, WHT namespaces and re-exports
- [x] Written 89 new Jest unit tests (628 total, all passing)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)

#### Stopping Point — Session 5
Good stopping point after HV + AGA-8 + Nodal + WHT + README with 628 tests passing.

### Session 6 — GEO + SKIN + SCAL Extensions + Office Add-in Planning
**Status:** Complete

#### Completed
- [x] Implemented GEO — Geomechanics (src/functions/geo/index.ts):
  - [x] `geoEMWToGradient`, `geoGradientToEMW`: mud weight unit conversions
  - [x] `geoOverburdenStress`, `geoOverburdenGradient`: total vertical stress
  - [x] `geoBulkDensityFromSonic`: Gardner (1974) acoustic density correlation
  - [x] `geoNormalPorePressure`, `geoNormalTransitTime`: hydrostatic baseline
  - [x] `geoPorePressureEaton`: Eaton (1975) sonic pore pressure prediction
  - [x] `geoEffectiveVerticalStress`: Terzaghi / Biot effective stress
  - [x] `geoBiotCoefficient`: poroelastic Biot coefficient from bulk moduli
  - [x] `geoMinHorizontalStress`: Eaton minimum horizontal stress
  - [x] `geoFractureGradientHubbertWillis`: Hubbert-Willis (1957) method
  - [x] `geoFractureGradientMatthewsKelly`: Matthews-Kelly (1967) method
  - [x] `geoFractureGradientEaton`: Eaton (1975) fracture gradient (most used)
  - [x] `geoFractureClosurePressure`: FCP from min horizontal stress
  - [x] `geoMudWindow`: drilling mud weight window (min/lower/upper/max ppg)
  - [x] `geoUCSFromYoungsModulus`: Chang et al. UCS from dynamic E
  - [x] `geoMohrCoulombShearStrength`: Mohr-Coulomb failure criterion
  - [x] `geoWellboreCollapseGradient`: minimum mud weight for wellbore stability
  - [x] `geoStaticPoissonRatio`: Eissa-Kazi dynamic-to-static conversion
  - [x] `geoCastagnaVs`: Castagna mudrock line (Vp → Vs)
  - [x] `geoDynamicElasticModuli`: Young's modulus + Poisson's ratio from sonic
  - [x] `geoOffshoreOverburden`: offshore overburden with seawater column
- [x] Implemented SKIN — Composite Skin Factor (src/functions/skin/index.ts):
  - [x] `skinHawkins`: Hawkins (1956) damage skin from altered permeability zone
  - [x] `skinEffectiveWellboreRadius`: r_w' = r_w × exp(−S)
  - [x] `skinFlowEfficiency`: PI ratio vs. undamaged well
  - [x] `skinKarakasTariq`: Karakas-Tariq (1991) perforation skin (phasing, SPF)
  - [x] `skinPerforation`: McLeod simplified perforation + damage skin
  - [x] `skinNonDarcyBeta`: Non-Darcy β coefficient (Jones 1987)
  - [x] `skinNonDarcyD`: Non-Darcy rate coefficient D ((Mscf/d)⁻¹)
  - [x] `skinNonDarcy`: Rate-dependent skin contribution D × q
  - [x] `skinPartialPenetration`: Papatzacos (1987) incomplete interval skin
  - [x] `skinGravelPack`: Gravel pack skin (Hawkins applied to GP zone)
  - [x] `skinTotal`: Composite sum of all skin components
  - [x] `skinPressureDrop`: ΔP due to skin (field units)
  - [x] `skinProductivityRatio`: PR = (ideal PI) / (actual PI)
  - [x] `skinStimulationRatio`: Post/pre-stimulation PI ratio
- [x] Extended SCAL with IFT-dependent capillary pressure (EOR):
  - [x] `scalIFTScaledPc`: Stegemeier (1977) IFT-scaled capillary pressure
  - [x] `scalCapillaryNumber`: Capillary number Nc (viscous/capillary forces)
  - [x] `scalResidualOilSaturation`: Sor vs. Nc trapping correlation (Taber 1969)
  - [x] `scalIFTEndpoints`: IFT-adjusted Kr endpoints (miscible flooding)
  - [x] `scalAmottWettability`: Amott (1959) wettability index (Iw, Io, WI_AH)
  - [x] `scalUSBMWettability`: USBM wettability index (Donaldson et al. 1969)
- [x] Planned Office add-ins for Word, Outlook, Teams, PowerPoint, OneNote, Access:
  - [x] `src/addins/word/index.ts`: template library, value injection helpers, pipe sizing formatter
  - [x] `src/addins/outlook/index.ts`: email template library, HTML table builder, pipe sizing email
  - [x] `src/addins/teams/index.ts`: Adaptive Card builder, bot EL lookup, quick Q&A database
  - [x] `src/addins/powerpoint/index.ts`: slide template library, brand colors, chart data builders
  - [x] `src/addins/onenote/index.ts`: note block builders, field measurement log, OneNote HTML
  - [x] `src/addins/access/index.ts`: database schema (tblJobs, tblClients, tblWells, tblPipeInventory, tblCalcSnapshots), standard queries, integration options
- [x] Updated src/index.ts with GEO, SKIN namespaces and SCAL IFT/Wettability extensions
- [x] Written 95 new Jest unit tests (723 total, all passing)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] README.md updated with new modules, 24-module count, 723 tests, Office add-in suite table

#### Stopping Point — Session 6
Good stopping point after GEO + SKIN + SCAL IFT/Wettability extensions + Office add-in planning with 723 tests passing.

### Session 7 — Office Add-in Full Implementation (Word/Outlook/Teams/PPT/OneNote/Access)
**Status:** Complete

#### Completed
- [x] Expanded Word add-in (src/addins/word/index.ts) — 8 new exported functions:
  - [x] `buildPvtReportData` — PVT fluid properties key-value dict (Z, Bg, Rs, Bo, viscosity)
  - [x] `buildWellTestReportData` — PTA interpretation report (k, S, P*, WBS, radius of investigation)
  - [x] `buildDcaReportData` — Decline curve report (model, qi, Di, b, EUR, economic limit)
  - [x] `buildNodalReportData` — Nodal analysis report (IPR/VLP, operating point, PI, Qmax)
  - [x] `buildMbeReportData` — Material balance report (OGIP/OOIP, pressures, drive indices)
  - [x] `buildGasCompositionReportData` — Gas composition report (MW, SG, HHV, LHV, Wobbe, sour gas)
  - [x] `buildWordTable` — Markdown pipe-delimited table builder (aligned column widths)
  - [x] `buildWordDocumentContent` — Full Word document skeleton (title, metadata, results table, footer)
- [x] Expanded Outlook add-in (src/addins/outlook/index.ts) — 6 new exported functions:
  - [x] `buildWellPerformanceEmailBody` — Well performance email with Vogel IPR note
  - [x] `buildGasCompositionEmailBody` — Gas analysis report email (HHV/LHV/Wobbe/SG)
  - [x] `buildRfiResponseEmailBody` — RFI response with embedded calculation table
  - [x] `buildDcaForecastEmailBody` — DCA forecast summary email
  - [x] `detectUnitSystem` — TLD heuristic for field vs metric unit auto-detection
  - [x] `convertValueForEmail` — Unit conversion for email (psia→kPa, ft→m, STBd→m³/d, etc.)
- [x] Expanded Teams add-in (src/addins/teams/index.ts) — 5 new exported functions:
  - [x] `buildPipeSizingCard` — Adaptive Card with velocity warning indicator (≥ 40 ft/s)
  - [x] `buildWellPerformanceCard` — Well performance Adaptive Card
  - [x] `buildGasCompositionCard` — Gas composition Adaptive Card
  - [x] `buildBotFaqResponse` — FAQ bot (7 topics: Weymouth, Z-factor, Vogel, Arps, skin, OGIP, HHV)
  - [x] `buildCalculatorCard` — Generic card with two FactSets (inputs / results)
- [x] Expanded PowerPoint add-in (src/addins/powerpoint/index.ts) — `PptxSlide` interface + 9 new functions:
  - [x] `buildPipeSizingResultsSlide` — Results table slide (content layout)
  - [x] `buildPipeSizingScheduleSlide` — Pipe schedule table slide
  - [x] `buildDcaChartData` — DCA rate + cumulative chart data builder
  - [x] `buildDcaForecastSlide` — DCA forecast chart slide with model parameter bullets
  - [x] `buildPzPlotData` — p/z plot data with Trend series and OGIP annotation
  - [x] `buildMbeSummarySlide` — Two-column MBE slide (bullets + drive indices table)
  - [x] `buildGasCompositionSlide` — Gas properties table slide
  - [x] `assemblePipeSizingDeck` — 3-slide deck assembler [title, results, schedule]
  - [x] `assembleDcaDeck` — 2-slide deck assembler [title, DCA forecast]
- [x] Expanded OneNote add-in (src/addins/onenote/index.ts) — 6 new exported functions:
  - [x] `buildPvtDataBlock` — PVT data note (Z, Bg, Bo, HHV)
  - [x] `buildGasCompositionBlock` — Gas composition note (MW, SG, HHV, LHV, Wobbe, optional sour gas)
  - [x] `buildWellTestBlock` — PTA interpretation note (k, S, P*, tp)
  - [x] `buildWellPerformanceBlock` — Well performance note (IPR operating point, PI)
  - [x] `buildDcaForecastBlock` — DCA forecast note (model, parameters, EUR)
  - [x] `buildJobSummaryPage` — Full OneNote page with job metadata + assembled note blocks
- [x] Expanded Access add-in (src/addins/access/index.ts) — 4 new functions + constant:
  - [x] `validateJobRecord` — validates job number (J-YYYY-NNN regex), required fields, status enum
  - [x] `formatJobForInsert` — SQL INSERT string for tblJobs (apostrophe-safe)
  - [x] `formatCalcSnapshotForInsert` — SQL INSERT string for tblCalcSnapshots
  - [x] `buildJobFilterQuery` — dynamic WHERE clause builder for job queries
  - [x] `FORM_DEFINITIONS` — Access form layout definitions (frmJobEntry, frmPipeInventory, frmWellEntry, frmCalcSnapshot)
- [x] Written 281 new Jest unit tests (1004 total, all passing — up from 723)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 7

#### Stopping Point — Session 7
Good stopping point after full Office add-in implementation (Word/Outlook/Teams/PPT/OneNote/Access) with 1004 tests passing.

### Session 8 — DCA Extended Models + Wellbore Integrity + functions.json Expansion
**Status:** Complete

#### Completed
- [x] Extended DCA module (src/functions/dca/index.ts) with 3 new decline models:
  - [x] **Transient Hyperbolic (TH)**: thRate, thCumulative, thSwitchTime, thEUR — Arps with b > 1 (transient linear flow b ≈ 2.0), switches to exponential at terminal decline Dterm
  - [x] **Extended Exponential (EE)**: eeRate, eeCumulative, eeEUR — biexponential model q = qi*[f*exp(-Dfast*t) + (1-f)*exp(-Dslow*t)], captures two-speed decline
  - [x] **Ansah-Knowles-Buba (AKB)**: akbRate, akbCumulative, akbEUR — generalized power-law q = qi*[1+(K-1)*Di*t]^(-1/(K-1)); K=1→exp, K=2→harmonic
- [x] Added DCA diagnostic utilities:
  - [x] `dcaDeclineRate(t, q)`: instantaneous D(t) from rate-time data (log-diff method)
  - [x] `dcaBFactor(t, q)`: instantaneous Arps b-factor from rate data
  - [x] `dcaLogLogDerivative(t, q)`: d(log q)/d(log t) for flow regime identification
  - [x] `dcaFlowRegimeFromB(b)`: classify flow regime (exponential/hyperbolic/harmonic/transient linear)
- [x] Added DCA data QC utilities:
  - [x] `dcaRollingZScore(q, half_window)`: leave-one-out rolling Z-score for outlier detection
  - [x] `dcaCleanProduction(t, q, threshold)`: remove outliers using rolling Z-score
  - [x] `dcaRateNormalize(q, bhp, bhp_i)`: normalize rates by pressure drawdown
- [x] Added DCA rate conversion utilities:
  - [x] `dcaConvertNominalDecline(D, from, to)`: convert nominal D between year/month/day
  - [x] `dcaAnnualToMonthlyEffective(De_annual)`: De_monthly = 1-(1-De_annual)^(1/12)
  - [x] `dcaMonthlyToAnnualEffective(De_monthly)`: De_annual = 1-(1-De_monthly)^12
- [x] Implemented WBI — Wellbore Integrity module (src/functions/wbi/index.ts):
  - [x] Casing burst: `wbiCasingBurstRating` (API Barlow), `wbiDesignFactor`, `wbiRequiredBurstRating`
  - [x] Casing collapse: `wbiDtRatio`, `wbiElasticCollapseP`, `wbiYieldCollapseP`, `wbiCollapseRating`, `wbiCollapseRegime`
  - [x] Tensile/buoyancy: `wbiCasingAirWeight`, `wbiBuoyancyFactor`, `wbiEffectiveWeight`, `wbiTensileRating`, `wbiTensileCheck`
  - [x] Cement job: `wbiCementVolume`, `wbiMinCementTop`, `wbiSlurryDensity`, `wbiCementReturnHeight`
  - [x] Shoe test/FIT/LOT/XLOT: `wbiFITEquivalentMW`, `wbiFITSurfacePressure`, `wbiShoeTestEvaluation`, `wbiXLOTClosureStress`, `wbiLOTBreakdownEMW`
  - [x] Mud weight window: `wbiMudWeightWindow`
  - [x] Hydrostatic helpers: `wbiHydrostaticPressure`, `wbiPressureToEMW`
- [x] Updated src/index.ts with DCA extended models (TH/EE/AKB/Diagnostics/DataQC/Conversions) and WBI namespace
- [x] Expanded functions.json from 15 → 48 UDF registrations (added DCA extended + WBI)
- [x] Written 112 new Jest unit tests (1116 total, all passing — up from 1004)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 8

#### Stopping Point — Session 8
Good stopping point after DCA extended models + Wellbore Integrity + functions.json expansion with 1116 tests passing.

#### Next Session — Session 9 (Planned)
- [ ] Office.js taskpane UI — Blueprint Manager, Function Browser (React)
- [ ] Ribbon implementation (6 groups: PVT, IPR/VLP, MBE, PTA, FRAC, Lift)
- [ ] Expand functions.json to full coverage of all 800+ UDFs
- [ ] FRAC extended: Uniaxial strain poroelastic closure stress model
- [ ] Web deployment / Netlify/Azure manifest hosting for web calculator
- [ ] Reservoir simulation tie-in: Eclipse/CMG INCLUDE file generator for kr curves

### Session 9 — FRAC Extended Models + SIM INCLUDE Generator + Blueprint/Browser Catalogs
**Status:** Complete

#### Completed
- [x] Extended FRAC module (src/functions/frac/index.ts) with 9 new functions:
  - [x] **Poroelastic Closure**: `fracPoroelasticClosure` — uniaxial strain σ_h = [ν/(1-ν)]·(σ_v − α·Pp) + α·Pp + Δσ_tect
  - [x] **Net Pressure**: `fracNetPressure` — P_net = P_treating − σ_closure − P_friction
  - [x] **Fluid Efficiency**: `fracFluidEfficiency` — η = V_frac / V_injected
  - [x] **ISIP**: `fracISIP` — bottomhole ISIP from surface pressure + hydrostatic column
  - [x] **Nolte G-Function**: `fracNolteG` — G(ΔtD) = (4/3)·[(1+ΔtD)^1.5 − ΔtD^1.5 − 1]
  - [x] **G-Derived Closure**: `fracGDerivedClosure` — P_closure = P_ISIP − (dP/dG) × G_closure
  - [x] **Nolte Leakoff**: `fracNolteLeakoff` — CL from G-function slope (Carter model)
  - [x] **Surface Treating Pressure**: `fracSurfaceTreatingPressure` — wellhead STP from BH pressure
  - [x] **Breakdown Pressure**: `fracBreakdownPressure` — Hubbert-Willis tensile failure criterion
- [x] New SIM module (src/functions/sim/index.ts) — 14 functions + interfaces:
  - [x] Eclipse keywords: `simSWOF`, `simSGOF`, `simPVTO`, `simPVDG`, `simPVTW`
  - [x] CMG keywords: `simWOTABLE`, `simGOTABLE`
  - [x] SCAL endpoint table: `simKrEndpointTable` — formatted comment block for Eclipse DATA
  - [x] Corey table builders: `simBuildSwofTable`, `simBuildSgofTable`
  - [x] File Generator: `simGenerateFromTemplate`, `simValidateTokens`, `simBatchGenerate`
  - [x] Type interfaces: `SwofRow`, `SgofRow`, `PvtoRow`, `PvtgRow`, `PvdgRow`, `KrEndpoints`
- [x] New Blueprint Manager catalog (src/addins/blueprints/index.ts):
  - [x] 35+ blueprint entries across PVT, DCA, IPR, MBE, PTA, VFP, SF, FA, FRAC, SCAL, GEO, WBI, ESP, GL, CNG/LNG, Utilities
  - [x] Accessor functions: `getBlueprintsByCategory`, `searchBlueprints`, `getBlueprintById`, `getBlueprintCategories`
- [x] New Function Browser catalog (src/addins/browser/index.ts):
  - [x] 20+ function entries with full documentation: syntax, params, returns, example formula, related functions
  - [x] Accessor functions: `searchFunctions`, `getFunctionsByCategory`, `getFunctionById`, `getFunctionCategories`, `getRelatedFunctions`
- [x] Updated src/index.ts with SIM namespace + FRAC extended (Poroelastic/Nolte groups)
- [x] Expanded functions.json from 48 → 62 UDF registrations (added FRAC extended + SIM module)
- [x] Written 122 new Jest unit tests (1238 total, all passing — up from 1116)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 9 (27 modules, 1238 tests, 62 UDFs)

#### Stopping Point — Session 9
Good stopping point after FRAC extended (poroelastic closure + Nolte-G analysis) + SIM INCLUDE file generator (Eclipse/CMG) + Blueprint Manager + Function Browser catalogs. 1238 tests passing.

---

### Session 10 — Taskpane UI + Eclipse Parser + Expanded UDFs
**Status:** Complete

#### Completed
- [x] Expand functions.json from 62 → 138 UDF registrations:
  - PVT: pseudoCriticalByKays, WichertAziz, Ug.ByLee, Density.Gas, Cg.Gas, SG.Oil.ToAPI, Rs.ByStanding, Rs.ByVasquezBeggs, Bo.Sat.ByStanding, Bo.Sat.ByVasquezBeggs, Bo.Undersat, Co.ByVasquezBeggs, Uo.Dead.ByBeal, Uo.Sat.ByBeggsRobinson, Bw, Uw, Cw (17 new PVT entries)
  - IPR: PI, Rate.Darcy, PI.PSS, Rate.Vogel, Qmax.Vogel, Rate.Composite, Rate.Fetkovich, Rate.GasDarcy, PI.Horizontal.Joshi (9 new IPR entries)
  - MBE: Gas.PZ, Gas.OGIP.TwoPoint, Gas.Pressure.Forecast, Oil.Eo, Oil.F, Oil.HavlenaOdeh, Oil.DriveIndices (7 new MBE entries)
  - PTA: Drawdown.Pwf, Horner.Permeability, Horner.Skin, Horner.Pstar, Bourdet.Derivative, WBS.Coefficient, Fault.Buildup (7 new PTA entries)
  - GEO: PorePressure.Eaton, FractureGradient.Eaton, MudWindow, MinHorizontalStress, UCS.FromYoungsModulus, MohrCoulomb (6 new GEO entries)
  - SKIN: Hawkins, Perforation.KarakasTariq, NonDarcyD, NonDarcySkin, PartialPenetration, Total, StimulationRatio (7 new SKIN entries)
  - HV: HHV, LHV, Wobbe, Analysis (4 new HV entries)
  - AGA8: Z, Z.FieldUnits (2 new AGA8 entries)
  - VFP: BeggsBrillBHP, Turner.CriticalVelocity, Turner.MinCriticalRate (3 new VFP entries)
  - SF: Choke.Rate, Compressor.Power (2 new SF entries)
  - SCAL: Corey.Krw, Corey.Kro, LeverettJ, BL.FractionalFlow (4 new SCAL entries)
  - DCA: Diagnostics.BFactor, Diagnostics.LogLogDeriv, Diagnostics.FlowRegime, PLE.Rate, SEPD.Rate, LGM.EUR (6 new DCA entries)
  - Eclipse: ParseSmspec, FormatResults (2 new Eclipse entries)
- [x] Eclipse SMSPEC/UNSMRY binary parser (src/functions/eclipse/index.ts):
  - parseSmspec() — Fortran unformatted binary reader with auto byte-order detection
  - parseUnsmry() — timestep data extraction (SEQHDR/MINISTEP/PARAMS records)
  - formatEclipseResults() — 2D table formatter for Excel worksheet output
  - buildSmspecHeader(), buildUnsmryData() — helpers for testing and demo
  - buildVectorLabel(), validateSmspecHeader(), listWellNames(), filterByTime(), extractTimeSeries()
- [x] Written 29 new Jest unit tests (test/eclipse/eclipse.test.ts — 1267 total, all passing)
- [x] Taskpane HTML UI (src/taskpane/taskpane.html) — full 4-tab single-page app:
  - Function Browser: searchable catalog with category filter chips, expandable cards, Insert into Cell
  - Blueprint Manager: searchable blueprint catalog with category filter, tag chips
  - Unit Converter: interactive category/from/to selection with result formula display
  - Eclipse Import: file drop zone + import workflow with status display
- [x] manifest.xml updated — full Petroleum 365 custom ribbon tab with 7 groups:
  - Group 1: Production (DCA menu: Arps/Duong/PLE/EUR; FRAC menu: PKN/Nolte-G)
  - Group 2: Reservoir (IPR menu: Vogel/Gas; MBE menu: Gas p/z/Oil H-O; PTA menu: Horner/Bourdet)
  - Group 3: Well Flow (VFP menu: Beggs-Brill/Nodal; SF menu: Choke/Pipeline)
  - Group 4: Artificial Lift (ESP menu: Sizing; GL menu: Injection Design)
  - Group 5: Fluids & Rock (PVT menu: Gas/Oil/HV; SCAL menu: Corey)
  - Group 6: Utilities (Unit Converter button; GEO menu: Mud Window)
  - Group 7: Library (Functions button, Blueprints button, Toolbox button)
- [x] Updated src/index.ts with Eclipse namespace (ParseSmspec, ParseUnsmry, FormatResults, helpers)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 10 (28 modules, 1267 tests, 138 UDFs)

#### Stopping Point — Session 10
Good stopping point: taskpane HTML UI complete (Function Browser + Blueprint Manager + Unit Converter + Eclipse Import), Eclipse SMSPEC binary parser module implemented, functions.json expanded from 62 → 138 UDFs, manifest updated with full 7-group custom ribbon tab, 1267 tests passing.

---

### Session 11 — Spline Interpolation + Economic Analysis + Well Production Allocation
**Status:** Complete

#### Completed
- [x] New Spline module (src/functions/spline/index.ts):
  - [x] **Linear**: `splineLinear`, `splineLinearArray` — piecewise linear with extrapolation
  - [x] **Natural Cubic Spline**: `splineCubicCoefficients`, `splineCubic`, `splineCubicArray` — Thomas algorithm tridiagonal system
  - [x] **Cubic Derivatives/Integrals**: `splineCubicDeriv`, `splineCubicIntegral` — exact antiderivative
  - [x] **Monotone PCHIP**: `splinePchipSlopes`, `splinePchip`, `splinePchipArray` — Fritsch-Carlson 1980, no overshoot
  - [x] **PCHIP Inverse**: `splinePchipInverse` — Brent's method root-finding
  - [x] **Table Helpers**: `splineLookup` (1-D), `splineBilinear` (2-D grid interpolation)
- [x] New ECO module (src/functions/eco/index.ts):
  - [x] **NPV/DCF**: `ecoNPV`, `ecoNPVContinuous`, `ecoPV`, `ecoFV`
  - [x] **Rate of Return**: `ecoIRR` (Brent's method, 200 iter), `ecoMIRR`
  - [x] **Payout**: `ecoPayoutSimple`, `ecoPayoutDiscounted` — interpolated period
  - [x] **Economic Limit**: `ecoOilEconomicLimit`, `ecoGasEconomicLimit` — min rate where revenue = OPEX
  - [x] **EUR at Limit**: `ecoArpsEURAtLimit`, `ecoTimeToEconomicLimit` — Arps hyperbolic to qEL
  - [x] **Profitability**: `ecoProfitabilityIndex`, `ecoBreakEvenPrice` (bisection on price space)
  - [x] **Depletion**: `ecoUOPDepletion` — unit-of-production method
  - [x] **Builders**: `ecoBuildCashFlows`, `ecoTornadoSensitivity`
- [x] New WPA module (src/functions/wpa/index.ts):
  - [x] **Proration**: `wpaProportional`, `wpaEqualShare`, `wpaPIWeighted`, `wpaAOFWeighted`
  - [x] **Curtailment**: `wpaCapacityCurtailment` — iterative cap-and-redistribute algorithm
  - [x] **Reconciliation**: `wpaReconcile` — scale meters to field-measured total
  - [x] **Injection**: `wpaInjectorsProportional`, `wpaVoidageRate`, `wpaRequiredInjectionRate`, `wpaActualVRR`
  - [x] **Field Summary**: `wpaFieldSummary`, `wpaFieldPI`
- [x] Updated src/index.ts: Spline, ECO, and WPA namespaces registered
- [x] Expanded functions.json from 138 → 161 UDF registrations (added Spline/ECO/WPA)
- [x] Written 118 new Jest unit tests (1385 total, all passing — up from 1267)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 11 (31 modules, 1385 tests, 161 UDFs)

#### Stopping Point — Session 11
Good stopping point: Spline interpolation module (cubic/PCHIP/bilinear), Economic Analysis module (NPV/IRR/payout/economic limit), and Well Production Allocation module (proration/VRR/field summary) fully implemented with 118 new tests. Total: 1385 tests, 161 UDFs, 31 modules.

---

### Session 12 — ECO Extensions + Unit Converter + DCA Diagnostics + Blueprint Expansion
**Status:** Complete

#### Completed
- [x] Extended ECO module (src/functions/eco/index.ts) with 11 new functions:
  - [x] **WI/NRI/Royalty**: `ecoWorkingInterest`, `ecoNetRevenueInterest`, `ecoRoyaltyStack` — WI revenue, NRI = WI × (1 − royalty), sequential royalty stacking
  - [x] **Price Escalation**: `ecoGasPriceEscalation` — price[t] = P0 × (1 + esc)^t; `ecoInflationAdjust` — nominal cash flows from real cash flows
  - [x] **After-Tax NPV**: `ecoAfterTaxNPV` — flat tax on positive CFs; `ecoAfterTaxNPVWithDepletion` — UOP depletion shield on taxable income
  - [x] **Revenue Builder**: `ecoBuildEscalatedRevenue` — time-varying price cash flow stream with escalation
  - [x] **Cost Metrics**: `ecoLOEPerBOE` — lease operating expense per BOE; `ecoRecycleRatio` — (Revenue − OPEX) / CAPEX; `ecoFindingCost` — F&D cost per BOE
- [x] Extended DCA module (src/functions/dca/index.ts) with 4 new functions:
  - [x] **SEPD Diagnostics**: `sepdCumShape(t, tau, n)` — dimensionless cumulative shape ratio [0,1)
  - [x] **LGM Diagnostics**: `lgmSatFraction(t, K, a, n)` — fraction of EUR produced at time t
  - [x] **Model Comparison**: `dcaModelComparison(times, rates)` — SSR for Arps/SEPD/LGM fitted models
  - [x] **EUR with Terminal Decline**: `arpsEURWithTerminalDecline(Qi, Di, b, Dterm, qEL)` — EUR accounting for hyperbolic→exponential switch
- [x] Extended Unit Converter (src/functions/utilities/unitConverter.ts) with 4 new categories:
  - [x] **Torque**: ft·lbf, in·lbf, N·m, kN·m, lbf·ft, lbf·in, kip·ft, dN·m
  - [x] **Thermal Conductivity**: BTU/(hr·ft·°F), W/(m·K), mW/(m·K), kW/(m·K), kcal/(hr·m·°C), cal/(s·cm·°C)
  - [x] **Specific Heat**: BTU/(lbm·°F), J/(kg·K), kJ/(kg·K), cal/(g·°C), kcal/(kg·°C)
  - [x] **Mass Flow Rate**: lbm/hr, lbm/s, lbm/min, kg/hr, kg/s, kg/min, g/s, tonne/hr, tonne/d, ton/hr
- [x] Expanded Blueprint Catalog (src/addins/blueprints/index.ts) with 10 new blueprints:
  - [x] **Spline** (3 blueprints): PVT Table Interpolation, Relative Permeability Smoothing, Decline Rate Bilinear Lookup
  - [x] **ECO** (5 blueprints): Project NPV/IRR, Economic Limit & EUR, WI/NRI/Royalty Stack, NPV Sensitivity Tornado, Gas Price Escalation & After-Tax NPV
  - [x] **WPA** (3 blueprints): Field Proration, Capacity Curtailment & VRR, Field Production Summary Dashboard
  - [x] Updated BlueprintCategory type to include "Spline", "ECO", "WPA"
  - [x] Updated Unit Converter blueprint description to include torque and thermal conductivity
- [x] Updated src/index.ts: ECO namespace +11 new functions; DCA namespace +4 new functions (SEPD/LGM/Diagnostics/Conversions)
- [x] Expanded functions.json from 161 → 176 UDF registrations (added ECO/DCA extensions)
- [x] Written 80 new Jest unit tests (1465 total, all passing — up from 1385)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 12 (31 modules, 1465 tests, 176 UDFs)

#### Stopping Point — Session 12
Good stopping point: ECO extended with WI/NRI/royalty stacking, price escalation, after-tax NPV, and cost metrics; DCA extended with SEPD/LGM saturation diagnostics and model comparison; unit converter expanded with torque/thermal conductivity/specific heat/mass flow rate categories; blueprint catalog expanded from 35 → 45 entries with Spline, ECO, WPA categories. 1465 tests passing.

### Session 13 — VFP Mechanistic + GEO 3D Stress + Nodal Lift + PVT IFT + ECO Monte Carlo + Web Deploy

#### Scope
- Nodal extended: multi-string VLP (parallel tubing strings) + artificial lift overlay (ESP/GL/RP comparison)
- VFP extended: Ansari (1994), Mukherjee-Brill (1985), Hasan-Kabir (1988) mechanistic correlations
- GEO extended: elastic moduli conversion (E/nu <-> K/G/lambda/M), static Young's modulus, 3D wellbore stress state (Kirsch), 3D collapse pressure
- Web deployment: netlify.toml for Office.js add-in hosting (headers, CSP, redirects)
- PVT extended: Baker-Swerdloff gas-oil IFT, Macleod-Sugden parachor IFT, Jennings-Patzek gas-brine IFT, Peneloux volume shift, EoS volume-shift regression, Chueh-Prausnitz kij
- ECO extended: LCG random, Latin hypercube sampling (LHSSingleVar, LHSample), inverse-transform (uniform/triangular/normal/lognormal/PERT), Monte Carlo NPV simulation

#### Deliverables
- [x] src/functions/vfp/index.ts — ansariGradient/BHP, mukherjeebrillGradient/BHP, hasanKabirGradient/BHP
- [x] src/functions/geo/index.ts — geoElasticModuliConvert, geoElasticModuliFromKG, geoStaticYoungsModulus, geo3DWellboreStress, geo3DCollapsePressure
- [x] src/functions/nodal/index.ts — nodalMultiStringVLP, nodalArtificialLiftOverlay
- [x] src/functions/pvt/ift.ts — pvtDeadOilIFT, pvtGasOilIFTByBakerSwerdloff, pvtGasOilIFTByMacleodSugden, pvtGasBrineIFT, pvtPenelouxShift, pvtEoSVolumeShiftRegress, pvtBinaryInteractionParam
- [x] src/functions/eco/index.ts — ecoLCGRandom, ecoLHSSingleVar, ecoLHSample, ecoInvTransform, ecoMonteCarloNPV
- [x] netlify.toml — web deployment manifest for Office.js add-in
- [x] src/index.ts — all new functions registered on P365 namespace + re-exports
- [x] src/functions.json — 20 new UDF registrations (176 -> 196)
- [x] test/vfp/vfp_extended.test.ts — Ansari/MB/HK gradient and BHP tests
- [x] test/geo/geo_extended.test.ts — elastic moduli + 3D stress tests
- [x] test/nodal/nodal_extended.test.ts — multi-string VLP + lift overlay tests
- [x] test/pvt/ift.test.ts — IFT + EoS tuning tests
- [x] test/eco/eco_extended.test.ts — LHS + Monte Carlo NPV tests
- [x] Updated copilot.md for Session 13 (31 modules, 1583 tests, 196 UDFs)

#### Stopping Point — Session 13
Good stopping point: VFP extended with three mechanistic correlations (Ansari/MB/HK); GEO extended with elastic moduli conversions and full Kirsch 3D wellbore stress state; Nodal extended with multi-string VLP and artificial lift overlay (ESP/GL/RP); PVT extended with gas-oil/brine IFT (Baker-Swerdloff/Macleod-Sugden/Jennings-Patzek) and EoS tuning helpers (Peneloux shift, volume-shift regression, Chueh-Prausnitz kij); ECO extended with Latin hypercube sampling and Monte Carlo NPV simulation; Netlify deployment manifest added. 1583 tests passing. 196 UDFs.

### Session 14 — RTA + EoS Stability + PTA Interference + Blueprint Expansion

#### Scope
- RTA module (new): material balance time, pseudo-pressure, pseudo-time, RNP, flowing material balance (FMB), Blasingame b-plot, type-curve parameters, permeability/skin from RNP, PSS kh estimation
- EoS extended: Wilson K-value initial guess, Michelsen (1982) tangent-plane distance (TPD) stability test
- PTA extended: multi-well interference test (line-source Ei), interference permeability/storativity inversion, pulse test amplitude/permeability/storativity
- Blueprints expanded: FMB, b-plot diagnostic, permeability/skin from RNP, interference test, pulse test, EoS stability+flash
- functions.json: 221 entries (196→221)
- Tests: 1655 total (1583→1655)

#### Deliverables
- [x] src/functions/rta/index.ts — full RTA module (17 functions)
- [x] src/functions/eos/index.ts — Wilson K-value + Michelsen stability test
- [x] src/functions/pta/index.ts — interference test + pulse test (6 functions)
- [x] src/addins/blueprints/index.ts — 6 new blueprints, RTA category added
- [x] src/index.ts — RTA namespace + EoS.PR.WilsonK/StabilityTest + PTA.Interference/PulseTest
- [x] src/functions.json — 25 new UDF registrations (196→221)
- [x] test/rta/rta.test.ts — 35 RTA tests
- [x] test/eos/eos_stability.test.ts — 13 EoS stability tests
- [x] test/pta/pta_interference.test.ts — 24 PTA interference/pulse tests
- [x] Updated copilot.md for Session 14 (32 modules, 1655 tests, 221 UDFs)

#### Stopping Point — Session 14
Good stopping point: new RTA module with complete rate-transient analysis toolkit (material balance time, pseudo-pressure/time, RNP, FMB for gas and oil, Blasingame b-plot diagnostic, type-curve normalization, permeability/skin from IARF slope, PSS kh estimation, Arps b-exponent); EoS extended with Wilson K-values and Michelsen (1982) stability test using successive substitution; PTA extended with multi-well interference test (line-source Ei) and pulse test analysis (amplitude, permeability inversion by bisection, storativity from lag time); 6 new blueprints added. 1655 tests passing. 221 UDFs. 32 modules.

#### Next Session — Session 15 (Planned)
- [x] Multiphase flow extended: Duns-Ros correlation, Orkiszewski, Poettmann-Carpenter
- [x] PVT extended: gas condensate properties, wet gas corrections, Whitson split
- [x] EoS: SRK equation of state, Peneloux volume shift
- [x] GitHub Pages deployment configuration (_config.yml)

---

### Session 15 — VFP Classic Correlations + SRK EoS + PVT Gas Condensate + GitHub Pages
**Status:** Complete

#### Completed
- [x] Extended VFP module (src/functions/vfp/index.ts) with 6 new functions:
  - [x] **Poettmann-Carpenter (1952)**: `poettmannCarpenterGradient`, `poettmannCarpenterBHP` — no-slip homogeneous model with empirical friction factor from chart-fit
  - [x] **Duns-Ros (1963)**: `dunsRosGradient`, `dunsRosBHP` — three-region flow (bubble/slug/mist) using dimensionless velocity/diameter/viscosity numbers (NLv, NGv, Nd, NL) and Duns-Ros F-coefficient slip correlation
  - [x] **Orkiszewski (1967)**: `orkiszewskiGradient`, `orkiszewskiBHP` — composite correlation using Griffith-Wallis (1961) bubble/slug flow and Duns-Ros mist flow; flow-regime map based on no-slip gas fraction λg
- [x] New SRK Equation of State (src/functions/eos/srk.ts) with 8 functions:
  - [x] `srkAB` — SRK pure-component a (psia·ft⁶/lbmol²) and b (ft³/lbmol): ΩA=0.42748, ΩB=0.08664, m=0.480+1.574ω−0.176ω², α(T)=[1+m(1−√(T/Tc))]²
  - [x] `srkZFactor` — pure-component Z-factor (vapor or liquid phase) via Cardano cubic solver
  - [x] `srkFugacityCoefficient` — φ = exp[(Z−1) − ln(Z−B) − (A/B)·ln(1+B/Z)]
  - [x] `srkMixAB` — mixture A, B with van der Waals mixing rules; returns a_i[], b_i[] per-component
  - [x] `srkBubblePoint` — bubble-point pressure (psia) via successive substitution with Wilson K initial guess
  - [x] `srkDewPoint` — dew-point pressure (psia) via successive substitution
  - [x] `srkFlash` — two-phase isothermal flash: V_frac, x[], y[], Z_liq, Z_vap (Rachford-Rice bisection + SS)
  - [x] `srkPenelouxShift` — Peneloux (1982) volume shift correction Σ zi·ci (ft³/lbmol); Yamada-Gunn ZRA estimate if not provided
- [x] New PVT Gas Condensate module (src/functions/pvt/condensate.ts) with 6 functions:
  - [x] `wellstreamGravity` — recombined wellstream specific gravity from separator gas γg, condensate γc, CGR (STB/MMscf); uses Eilerts (1957)/Standing (1977) correlation
  - [x] `wetGasCorrectedGravity` — correct separator gas gravity for NGL content: γgg = γg × (1 + 5.912e-5 × API × T_sp × log10(P_sp/114.7))
  - [x] `condensateFVF` — condensate FVF Bco (RB/STB): Standing (1947) F-factor correlation; F = Rsp × (γg/γc)^0.5 + 1.25×T_F
  - [x] `condensateDensity` — condensate density at reservoir conditions (lb/ft³)
  - [x] `condensateViscosity` — condensate viscosity (cp): Beggs-Robinson dead oil + Chew-Connally dissolved-gas correction
  - [x] `whitsonC7PlusSplit` — Whitson (1983) C7+ gamma-distribution characterization: nComp pseudocomponents with equal mole-fraction intervals; returns Mw, γ, Tc_R, Pc_psia, ω, z_frac; Riazi-Daubert (1987) Tc/Pc, Lee-Kesler (1975) ω
- [x] GitHub Pages configuration: _config.yml (jekyll-theme-minimal, baseurl=/Petroleum-365)
- [x] Updated src/functions/eos/index.ts — exports SRK via `export * from './srk'`
- [x] Updated src/functions/pvt/index.ts — exports condensate via `export * from './condensate'`
- [x] Updated src/index.ts:
  - VFP namespace: PoettmannCarpenter/DunsRos/Orkiszewski (Gradient + BHP)
  - EoS namespace: SRK sub-namespace (AB/ZFactor/FugacityCoefficient/MixAB/BubblePoint/DewPoint/Flash/PenelouxShift)
  - PVT namespace: Condensate sub-namespace (WellstreamGravity/WetGasCorrectedGravity/FVF/Density/Viscosity/WhitsonC7PlusSplit)
- [x] Expanded functions.json from 221 → 241 UDF registrations (+20 entries)
- [x] Written 80 new Jest unit tests (1735 total, all passing — up from 1655)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 15 (33 modules, 1735 tests, 241 UDFs)

#### Stopping Point — Session 15
Good stopping point: VFP extended with three classic empirical correlations (Poettmann-Carpenter, Duns-Ros, Orkiszewski) completing the P365.md VFP function library; SRK EoS implemented as a parallel EoS to Peng-Robinson with full flash/bubble/dew capabilities and Peneloux volume shift; gas condensate PVT module added (wellstream gravity, wet-gas correction, condensate FVF/density/viscosity, Whitson C7+ split). GitHub Pages _config.yml added. 1735 tests passing. 241 UDFs. 33 modules.

#### Next Session — Session 16 (Planned)
- [ ] PTA extended: deconvolution (von Schroeter-Hollender), multi-rate superposition, diagnostic log-log plot
- [ ] EoS: multi-component phase envelope tracing, cricondentherm/cricondenbar
- [ ] FRAC extended: proppant transport (settling velocity, terminal velocity), TSO design, refrac candidate selection
- [ ] WPA extended: injection allocation (pattern floods, 5-spot), balancing analysis
- [ ] Taskpane UI enhancements: SRK Flash calculator, gas condensate PVT panel

## Function Naming Convention
`P365.[Category].[Property].[Qualifier].By[Author]`

| Category | Description |
|----------|-------------|
| PVT | Pressure-Volume-Temperature |
| DCA | Decline Curve Analysis |
| VFP | Vertical Flow Performance |
| IPR | Inflow Performance Relationship |
| SCAL | Special Core Analysis |
| MBE | Material Balance Equation |
| PTA | Pressure Transient Analysis |
| EoS | Equation of State |
| ESP | Electric Submersible Pump |
| GL | Gas Lift |
| SF | Surface Facilities |
| FA | Flow Assurance |
| FRAC | Hydraulic Fracturing |
| FPP | Field Production Profile |
| RP | Rod Pump |
| CNG/LNG | Gas Monetization |
| HV | Heating Value (GPA 2145) |
| AGA8 | AGA-8 Custody Transfer Z-factor |
| Nodal | Nodal Analysis (IPR + VLP) |
| WHT | Wellbore Heat Transfer |
| GEO | Geomechanics (pore pressure, fracture gradient, wellbore stability) |
| SKIN | Composite Skin Factor (Hawkins, perforations, non-Darcy, partial penetration) |
| WBI | Wellbore Integrity (casing burst/collapse, cement, FIT/LOT/XLOT, mud window) |
| SIM | Reservoir Simulation INCLUDE Generator (Eclipse SWOF/SGOF/PVDG/PVTW, CMG WOTABLE/GOTABLE, file generator) |
| Eclipse | Eclipse Results Import (SMSPEC/UNSMRY binary parser, time-series extraction, Excel formatter) |
| Spline | Interpolation (linear, natural cubic spline, monotone PCHIP, 2-D bilinear, inverse lookup) |
| ECO | Economic Analysis (NPV, IRR, MIRR, payout, economic limit, EUR at limit, profitability index, break-even) |
| WPA | Well Production Allocation (proportional proration, PI/AOF-weighted, curtailment, VRR, field summary) |
| RTA | Rate-Transient Analysis (FMB, b-plot, material balance time, pseudo-pressure, pseudo-time, RNP, Blasingame type curves) |
| SRK | Soave-Redlich-Kwong Equation of State (flash, bubble/dew point, fugacity, Peneloux shift) |
| GC  | Gas Condensate PVT (wellstream gravity, wet-gas correction, condensate FVF/density/viscosity, Whitson C7+ split) |

## Key Engineering Details (from P365.md)
- Pipe material roughness: Bare Steel 0.000150 ft · Coated Steel 0.000100 ft · PE 0.000005 ft
- Standard pipe sizes: ASME B36.10M (Sch 40 steel) and ASTM D2513 SDR-11 (PE)
- Weymouth equation for natural gas distribution
- Velocity check: < 40 ft/s recommended
- Blue cells = inputs · Green cells = results

---

### Session 16 — EoS Phase Envelope + PTA Multi-Rate/Deconvolution + FRAC TSO + WPA Pattern Floods + Taskpane UI
**Status:** Complete

#### Scope
- EoS PR: Phase envelope tracing (bubble/dew scan), cricondentherm, cricondenbar
- PTA extended: Multi-rate superposition RNP, log-log diagnostic plot (Bourdet derivative), simplified deconvolution (von Schroeter-Hollender/Tikhonov regularization)
- FRAC extended: TSO design (tip screenout — fracture dimensions/packing at screenout), proppant concentration profile, refrac candidate scoring
- WPA extended: Five-spot pattern injection allocation (kh-weighted), pattern flood balancing (target VRR), Dykstra-Parsons mobility sweep, Stiles layer sweep
- Taskpane UI: Two new tabs — SRK Flash calculator (Wilson K / Rachford-Rice flash display), Gas Condensate PVT calculator (wellstream γ, Bco, density, viscosity)

#### Completed
- [x] Extended EoS module (src/functions/eos/index.ts) with 5 new functions:
  - [x] `prPhaseEnvelopePoint(T_R, Tc, Pc, omega, z, kij)` — bubble-point pressure at T for envelope scan
  - [x] `prPhaseEnvelopeDewPoint(T_R, ...)` — dew-point pressure at T for envelope scan
  - [x] `prPhaseEnvelope(T_min, T_max, nT, ...)` — full P-T phase envelope array ({T_R, Pb_psia, Pd_psia}×nT)
  - [x] `prCricondentherm(T_min, T_max, ...)` — maximum temperature on envelope (binary-search refinement)
  - [x] `prCricondenbar(T_min, T_max, ...)` — maximum pressure on envelope (golden-section search)
- [x] Extended PTA module (src/functions/pta/index.ts) with 3 new functions:
  - [x] `ptaMultiRateRNP(t_hrs, q_changes, k, h, phi, mu, ct, rw, Bo, S)` — rate-normalized pressure with superposition
  - [x] `ptaLogLogDiagnostic(dt_hrs, dp_psi, L)` — log-log ΔP and Bourdet derivative ΔP' (with optional L-smoothing)
  - [x] `ptaDeconvolution(dt_hrs, dp_psi, q_STBd, lambda)` — simplified deconvolution (rate-normalized + Tikhonov regularization)
- [x] Extended FRAC module (src/functions/frac/index.ts) with 3 new functions:
  - [x] `fracTSODesign(qi, h, E', mu, CL, Vpad, conc)` — TSO design: L_so, w_avg, A_so, t_so, packingFraction (PKN + Carter leakoff)
  - [x] `fracProppantConcentration(qi, conc, t_pump, L, h, rho_prop)` — Ca (lbm/ft²), mass pumped, fill fraction
  - [x] `fracRefracScore(PI_i, PI_c, P_si, P_i, skin, age)` — weighted score 0–100 with recommendation string
- [x] Extended WPA module (src/functions/wpa/index.ts) with 4 new functions:
  - [x] `wpaFiveSpotAllocation(q_inj, kh_prod)` — kh-weighted injection allocation for 5-spot pattern
  - [x] `wpaPatternFloodBalance(producers, injWeights, target_VRR, Bw)` — compute injector rates for target VRR
  - [x] `wpaDykstraParsonsMobility(M, V_DP)` — Koval/Stiles volumetric sweep (1−V_DP)/(1+V_DP(M−1))
  - [x] `wpaStilesSweep(k_arr, h_arr, M)` — layer-by-layer Stiles (1949) sweep efficiency
- [x] Taskpane UI (src/taskpane/taskpane.html) — 2 new tabs:
  - [x] **⚗ Flash** — SRK Flash calculator: T/P inputs, 3-component table (Tc/Pc/ω/z), Wilson K + Rachford-Rice flash, vapor/liquid fractions + compositions
  - [x] **🛢 GC PVT** — Gas Condensate PVT: wellstream γ, Standing FVF, Beggs-Robinson + Chew-Connally viscosity, condensate density
- [x] Updated src/index.ts: EoS.PR +5, PTA +3, FRAC +3, WPA +4 new namespace entries
- [x] Expanded functions.json from 241 → 256 UDF registrations (+15 entries)
- [x] Written 102 new Jest unit tests (1837 total, all passing — up from 1735)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 16 (33 modules, 1837 tests, 256 UDFs)

#### Stopping Point — Session 16
Good stopping point: EoS extended with full phase envelope tracing (bubble/dew scan, cricondentherm, cricondenbar); PTA extended with multi-rate superposition RNP, log-log diagnostic plot (centered Bourdet derivative with L-smoothing), and simplified Tikhonov deconvolution; FRAC extended with TSO design (PKN + Carter leakoff), proppant areal concentration, and refrac candidate scoring (weighted scorecard); WPA extended with five-spot kh-weighted allocation, pattern flood VRR balancing, Dykstra-Parsons sweep (Koval formula), and Stiles layer sweep; Taskpane UI gained two new interactive tabs (SRK Flash calculator, Gas Condensate PVT). 1837 tests passing. 256 UDFs. 33 modules.

### Session 17 — VFP AGF + PTA Buildup + EoS Lee-Kesler + GEO ECD/Mohr-Coulomb + Blueprints
**Status:** Complete

#### Scope
- VFP mechanistic: Aziz-Govier-Fogarasi (AGF 1972) two-phase gradient + BHP
- PTA extended: MDH/Horner pressure buildup p* analysis, wellbore storage log-log diagnostic
- EoS Lee-Kesler: BWR-type Z-factor, departure enthalpy and entropy for simple and reference fluids
- GEO extended: Mohr-Coulomb failure envelope, ECD (Bingham plastic), mud weight window with ECD check
- Blueprints: Phase Envelope (PR EoS), TSO Design (FRAC), Pattern Flood (WPA) — 3 new blueprints

#### Completed
- [x] Extended VFP module with 2 new functions (Aziz-Govier-Fogarasi):
  - [x] `azizGovierFogarasiGradient(...)` — AGF dimensionless velocity numbers (Ngv/Nlv/Nd/Nl), flow-pattern map (bubble/slug/churn/mist), two-phase pressure gradient (psi/ft)
  - [x] `azizGovierFogarasiBHP(...)` — BHP integration over 10 segments with linear temperature profile
- [x] Extended PTA module with 3 new functions:
  - [x] `ptaMDHAnalysis(dt, Pws, q, ...)` — MDH semi-log slope, k_md, skin S, P1hr from shut-in data
  - [x] `ptaHornerAnalysis(dt, Pws, tp, ...)` — Horner plot slope, k_md, skin S, p* (static reservoir pressure)
  - [x] `ptaWellboreStorageDiagnostic(dt, dp, ...)` — unit-slope C (bbl/psi), C_D, unitSlopeEnd_hrs
- [x] Extended EoS module with 5 new Lee-Kesler functions:
  - [x] `lkZFactor(Tr, Pr, ref)` — BWR-type Z-factor for simple fluid (ω=0) or reference fluid (n-octane, ωR=0.3978)
  - [x] `lkZFactorComponent(T_K, P_bar, Tc, Pc, omega)` — Pitzer three-parameter Z using simple + reference fluids
  - [x] `lkDepartureEnthalpy(Tr, Pr, ref)` — departure enthalpy (H−H^ig)/(R·Tc) dimensionless
  - [x] `lkDepartureEntropy(Tr, Pr, ref)` — departure entropy (S−S^ig)/R dimensionless
  - [x] `lkDepartureFunctions(T_K, P_bar, Tc, Pc, omega)` — full Pitzer: returns Z, H_dep_RTc, S_dep_R
- [x] Extended GEO module with 3 new functions:
  - [x] `geoMohrCoulombFailureEnvelope(σ_n, C0, φ, σ3)` — τ_f, θ_f, diff-stress at failure, UCS
  - [x] `geoECD(MW, TVD, Q, D_h, D_p, L, μ_p, τ_y)` — Bingham plastic ECD (ppg), annular ΔP (psi), ECD gradient (psi/ft)
  - [x] `geoMudWeightWindowECD(PP, FG, TVD, margin, ...)` — MW_min/max/recommended, ECD, stability flag
- [x] Added 3 new blueprints to catalog (src/addins/blueprints/index.ts):
  - [x] `eos-phase-envelope` — PR EoS phase envelope (bubble/dew scan, cricondentherm, cricondenbar)
  - [x] `frac-tso-design` — TSO fracture design + proppant concentration + refrac scoring
  - [x] `wpa-pattern-flood` — Five-spot allocation, VRR balancing, Dykstra-Parsons, Stiles sweep
- [x] Updated src/index.ts: VFP +2, PTA +3, EoS LeeKesler +5, GEO +3 new namespace entries
- [x] Expanded functions.json from 256 → 269 UDF registrations (+13 entries)
- [x] Written 67 new Jest unit tests (1904 total, all passing — up from 1837)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 17

#### Stopping Point — Session 17
Good stopping point: VFP extended with Aziz-Govier-Fogarasi (AGF 1972) mechanistic two-phase flow correlation (bubble/slug/churn/mist regime map using dimensionless Ngv, Nlv, Nd, Nl velocity numbers, gradient + BHP integration); PTA extended with classical pressure buildup analysis — MDH (semi-log slope → k, S, P1hr), Horner (Horner time ratio → k, S, p* extrapolation), and wellbore storage unit-slope diagnostic (C in bbl/psi, dimensionless CD); EoS extended with Lee-Kesler (1975) BWR reference fluid correlations for simple and reference (n-octane) fluids — Z-factor, departure enthalpy (H−H^ig)/(RTc), and departure entropy (S−S^ig)/R using the three-parameter Pitzer weighting; GEO extended with Mohr-Coulomb failure envelope (shear strength, failure angle, UCS, differential stress at failure), ECD (Bingham plastic annular pressure loss model), and mud weight window with ECD stability check; Blueprint catalog expanded with 3 new entries (PR Phase Envelope, TSO Design, Pattern Flood). 1904 tests passing. 269 UDFs. 33 modules.

#### Next Session — Session 18 (Planned)
- [ ] VFP: VLP/IPR system curve optimization (OPT module) — optimal tubing size, GLR, choke
- [ ] PTA: Composite reservoir model (dual-porosity, radial composite), pressure derivative type-curve matching
- [ ] EoS: Lee-Kesler mixing rules for mixtures (Kay's rule Tc/Pc, LK Z for gas mixtures)
- [ ] GEO: Wellbore trajectory stress analysis (deviated well Kirsch equations), fault reactivation pressure
- [ ] Blueprints: Horner buildup analysis blueprint, Lee-Kesler vapor-liquid blueprint
- [ ] SIM: CMG STARS format keyword generator (GRID, PORO, PERM, TEMP tables)

### Session 18 — VFP OPT + PTA Composite + EoS LK Mixing + GEO Deviated + SIM STARS + Blueprints
**Status:** Complete

#### Scope
- VFP system optimization: optimal tubing ID selection (Beggs & Brill BHP scan), optimal GLR scan, Gilbert choke pressure drop
- PTA composite reservoir models: dual-porosity (Warren-Root / Barenblatt-Kazemi), radial composite (two-zone Ei approximation), type-curve matching parameter extraction
- EoS Lee-Kesler mixing rules: Kay's rule mixture pseudocriticals (Tc_mix, Pc_mix, ω_mix), mixture Z-factor, mixture departure enthalpy + entropy
- GEO deviated wellbore: generalized Kirsch stress transformation (Fjaer et al. 2008) — hoop stresses, breakdown pressure, collapse pressure for any inclination/azimuth; fault reactivation critical pore pressure (Mohr-Coulomb on fault plane)
- SIM CMG STARS: GRID CART/DI/DJ/DK generator, PORO, PERMI/PERMJ/PERMK, TEMPI keyword block generators
- Blueprints: Horner pressure buildup analysis blueprint, Lee-Kesler mixture properties blueprint

#### Completed
- [x] Extended VFP module with 3 new functions (src/functions/vfp/index.ts):
  - [x] `vfpOptimalTubing(...)` — scans candidate tubing IDs, returns BHP for each + bestD_in
  - [x] `vfpGLROptimal(...)` — GLR scan from min to max, returns bhp_scan + optGLR_scf_bbl + minBHP_psia
  - [x] `vfpChokeDP(q_oil, q_gas, d_64ths, P_dn)` — Gilbert critical-flow choke: P_up, dP, GLR, critical flag
- [x] Extended PTA module with 3 new functions (src/functions/pta/index.ts):
  - [x] `ptaDualPorosityPwf(...)` — Warren-Root / Barenblatt-Kazemi dual-porosity drawdown (λ, ω)
  - [x] `ptaRadialComposite(r_f, M12, ...)` — two-zone composite reservoir Pwf (Ei-function approximation)
  - [x] `ptaTypeCurveMatch(...)` — Bourdet-Gringarten match-point extraction of k, S, C
- [x] Extended EoS module with 3 new Lee-Kesler mixing rule functions (src/functions/eos/index.ts):
  - [x] `lkMixturePseudoCriticals(Tc, Pc, omega, z)` — Kay's rule Tc_mix, Pc_mix, omega_mix
  - [x] `lkMixtureZ(T_K, P_bar, Tc, Pc, omega, z)` — Lee-Kesler Z for multi-component gas mixture
  - [x] `lkMixtureProperties(...)` — Z + H_dep_RTc + S_dep_R + pseudocriticals
- [x] Extended GEO module with 2 new functions (src/functions/geo/index.ts):
  - [x] `geoDeviatedKirsch(σ_h, σ_H, σ_v, Pp, Pw, inc, az, C0, φ, T0)` — min/max hoop stress, breakdown P, collapse P
  - [x] `geoFaultReactivation(σ_h, σ_H, σ_v, Pp, dip, az, μ_f, C_f)` — σ_n, τ, P_crit, safetyMargin, willReactivate
- [x] Extended SIM module with 4 CMG STARS keyword generators (src/functions/sim/index.ts):
  - [x] `simStarsGrid(nx, ny, nz, dx, dy, dz)` — GRID CART + DI/DJ/DK sections
  - [x] `simStarsPoro(nx, ny, nz, poro_arr)` — PORO CON keyword block
  - [x] `simStarsPerm(nx, ny, nz, perm_i, perm_j, perm_k)` — PERMI/PERMJ/PERMK keyword blocks
  - [x] `simStarsTemp(nx, ny, nz, temp_arr)` — TEMPI CON keyword block (thermal sim)
- [x] Added 2 new blueprints to catalog (src/addins/blueprints/index.ts):
  - [x] `pta-horner-buildup` — Horner/MDH pressure buildup analysis (Horner, MDH, dual-porosity diagnostic)
  - [x] `eos-lk-mixture` — Lee-Kesler mixture properties (Kay's rule, Z-factor, departure H/S)
- [x] Updated src/index.ts: VFP +3, PTA +3, EoS.LeeKesler +3, GEO +2, SIM +4 new namespace entries
- [x] Expanded functions.json from 269 → 284 UDF registrations (+15 entries)
- [x] Written 79 new Jest unit tests (1983 total, all passing — up from 1904)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 18

#### Stopping Point — Session 18
Good stopping point: VFP extended with three system optimization tools — optimal tubing ID selection (Beggs & Brill BHP scan across candidate diameters), optimal GLR scan (finds minimum BHP GLR for artificial lift design), and Gilbert (1954) choke critical-flow correlation (P_up, ΔP, GLR, critical flag); PTA extended with composite reservoir models — dual-porosity Warren-Root model (Ei-function PD with storativity ratio ω and interporosity coefficient λ), radial composite two-zone model (mobility ratio M12 = k1/k2, composite-front image contribution), and Bourdet-Gringarten type-curve match-point extraction (k, S, C from tD/CD and PD match); EoS extended with Lee-Kesler mixing rules — Kay's rule pseudocriticals (Tc_mix, Pc_mix, ω_mix) for N-component gas, mixture Z-factor, and mixture departure enthalpy/entropy for custody-transfer and process design; GEO extended with deviated wellbore Kirsch analysis (Fjaer et al. 2008 transformation to borehole frame — min/max hoop stress, tensile breakdown pressure, Mohr-Coulomb collapse pressure for any well inclination and azimuth) and fault reactivation (Mohr-Coulomb on fault plane resolved from principal stresses — critical pore pressure for slip, safety margin, reactivation flag); SIM extended with four CMG STARS thermal simulation keyword generators (GRID CART/DI/DJ/DK, PORO, PERMI/PERMJ/PERMK, TEMPI); Blueprint catalog expanded with 2 new entries (Horner Buildup Analysis, Lee-Kesler Mixture Properties). 1983 tests passing. 284 UDFs. 33 modules.

#### Next Session — Session 19 (Planned)
- [x] VFP: Nodal analysis intersection with IPR curve (gas and oil), choke sensitivity analysis
- [x] PTA: Bourdet pressure derivative algorithm + dual-porosity derivative type curves
- [x] EoS: Lee-Kesler VLE flash for multi-component systems (Wilson K + Rachford-Rice + LK Z)
- [x] GEO: Wellbore stability mud weight window for deviated wells (DeviatedKirsch + ECD)
- [x] WBI: Tubing design (burst/collapse/tension/triaxial) + casing wear assessment
- [x] Blueprints: Deviated wellbore stability blueprint, STARS simulation deck blueprint

### Session 19 — Nodal Analysis + Bourdet Derivative + LK VLE Flash + Deviated Stability + Tubing Design
**Status:** Complete

#### Scope
- VFP nodal analysis: gas well IPR (Darcy) × VLP (avg T-Z) intersection, oil well composite Vogel/Darcy IPR × Beggs-Brill VLP intersection, Gilbert choke sensitivity sweep
- PTA pressure derivatives: Bourdet (1989) L-point smoothing algorithm, Warren-Root dual-porosity dimensionless PD + log-log derivative
- EoS VLE flash: Wilson K-factor initialization, Rachford-Rice solver (Newton-bisection hybrid), full VLE flash with Lee-Kesler EoS successive substitution
- GEO deviated stability: integrated mud weight window combining DeviatedKirsch collapse/breakdown with ECD Bingham plastic annular pressure loss
- WBI tubing design: API 5C3 burst, API 5C3 simplified collapse (elastic/yield), axial tensile capacity, Von Mises triaxial stress (Lamé thick-wall), casing wear deration
- Blueprints: deviated wellbore stability, STARS simulation deck

#### Completed
- [x] Extended VFP module with 3 new functions (src/functions/vfp/index.ts):
  - [x] `vfpNodalIPRGasVLP(Pr, k, h, re, rw, S, T_R, gamma_g, q_arr, Pwh, D_in, L_ft, T_avg, SG_gas)` — gas IPR/VLP intersection + arrays
  - [x] `vfpNodalIPROilVLP(Pr, PI, Pb, q_arr, Pwh, D_in, L_ft, T_avg, SG_oil, SG_gas, GOR)` — composite oil IPR/VLP intersection
  - [x] `vfpChokeSensitivity(q_oil_arr, d_choke_64ths, P_dn_psia)` — Gilbert choke upstream pressure sweep
- [x] Extended PTA module with 2 new functions (src/functions/pta/index.ts):
  - [x] `ptaBourdetDerivative(t_arr, dP_arr, L?)` — Bourdet (1989) L-point pressure derivative (dP/d ln t)
  - [x] `ptaDualPorosityDerivative(tD_CD_arr, omega, lambda_D)` — Warren-Root dual-porosity PD + dPD arrays
- [x] Extended EoS module with 3 new VLE functions (src/functions/eos/index.ts):
  - [x] `lkWilsonK(T_K, P_bar, Tc_arr, Pc_arr, omega_arr)` — Wilson K-factor initialization array
  - [x] `lkRachfordRice(z_arr, K_arr, nMaxIter?)` — Rachford-Rice solver → {beta, x_arr, y_arr, converged}
  - [x] `lkVLEFlash(T_K, P_bar, z_arr, Tc_arr, Pc_arr, omega_arr, nMaxIter?)` — full LK VLE flash → {beta, x_arr, y_arr, K_arr, Z_L, Z_V, converged, iterations}
- [x] Extended GEO module with 1 new function (src/functions/geo/index.ts):
  - [x] `geoDeviatedStabilityWindow(σ_h, σ_H, σ_v, Pp, inc, az, C0, φ, T0, MW_ppg, TVD_ft, Q_gpm, D_h, D_p, L_ft, μ_p, τ_y)` — MW_min/max/recommended, ECD, BP, CP, stable
- [x] Extended WBI module with 5 new functions (src/functions/wbi/index.ts):
  - [x] `wbiTubingBurst(OD_in, wall_in, Fy_psi, SF?)` — API 5C3 burst, allowable with safety factor
  - [x] `wbiTubingCollapse(OD_in, wall_in, Fy_psi, E_psi?, nu?)` — API 5C3 collapse (elastic/yield min)
  - [x] `wbiTubingTension(OD_in, wall_in, Fy_psi, buoyancy_factor?, SF?)` — axial yield + allowable load
  - [x] `wbiTriaxial(P_i, P_o, OD_in, wall_in, F_axial, Fy_psi)` — Von Mises hoop/radial/axial + utilization
  - [x] `wbiCasingWear(OD_in, wall_in, Fy_psi, wear_pct)` — derated burst/collapse after wall wear
- [x] Added 2 new blueprints to catalog (src/addins/blueprints/index.ts):
  - [x] `geo-deviated-stability` — Deviated wellbore stability mud weight window (Kirsch + ECD)
  - [x] `sim-stars-deck` — CMG STARS thermal simulation deck (GRID/PORO/PERM/TEMP)
- [x] Updated src/index.ts: VFP +3, PTA +2, EoS.LeeKesler +3, GEO +1, WBI +5 new namespace entries
- [x] Expanded functions.json from 284 → 298 UDF registrations (+14 entries)
- [x] Written 78 new Jest unit tests (2061 total, all passing — up from 1983)
- [x] TypeScript compiles cleanly (tsc --noEmit: 0 errors)
- [x] Updated copilot.md and README.md for Session 19

#### Stopping Point — Session 19
Good stopping point: VFP extended with nodal analysis intersection tools — gas well IPR (Darcy linear) vs VLP (average T-Z Weymouth) with bisection-found operating point, oil well composite Vogel/Darcy IPR vs Beggs-Brill VLP with bisection intersection, and Gilbert choke sensitivity sweep across a range of oil rates; PTA extended with Bourdet (1989) L-point smoothed pressure derivative algorithm (dP/d ln t) for log-log diagnostic plots, and Warren-Root dual-porosity dimensionless PD/derivative arrays; EoS extended with full VLE flash capability — Wilson K-factor initialization, Rachford-Rice equation solver (Newton-Raphson with bisection fallback) for vapor fraction β and phase compositions, and full successive-substitution VLE flash with Lee-Kesler EoS (updates K-factors using lkZFactorComponent for both vapor and liquid phases until convergence); GEO extended with integrated deviated wellbore stability window combining Kirsch stress transformation (breakdown and collapse pressures for any well inclination/azimuth) with Bingham plastic ECD calculation into a single mud weight window (MW_min, MW_max, MW_recommended, ECD, stable flag); WBI extended with complete tubing/casing mechanical design suite — API 5C3 burst (0.875 × Barlow formula with safety factor), API 5C3 simplified collapse (minimum of elastic/yield regimes), axial tensile yield capacity with buoyancy factor, Von Mises triaxial stress check using thick-wall Lamé equations (hoop/radial/axial stresses + utilization ratio), and casing wear deration model (reduces wall by wear percentage, recomputes burst and collapse); Blueprint catalog expanded with 2 new entries (Deviated Wellbore Stability, STARS Simulation Deck). 2061 tests passing. 298 UDFs. 33 modules.

#### Next Session — Session 20 (Planned)
- [ ] VFP: Bean performance curve (choke vs rate), multi-phase metering correlation (Venturi/DP)
- [ ] PTA: Radial composite derivative type curves, deconvolution (von Schroeter/Bayesian)
- [ ] EoS: BWRS (Benedict-Webb-Rubin-Starling) Z-factor for dense-phase / supercritical gas
- [ ] GEO: Sand production prediction (sanding onset, critical drawdown pressure)
- [ ] WBI: Annular pressure buildup (thermal/gas migration), cement job quality (CBL interpretation)
- [ ] Blueprints: Tubing design worksheet blueprint, VLE flash composition blueprint
