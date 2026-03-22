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

#### Next Session — Session 7 (Planned)
- [ ] Office.js taskpane UI — Blueprint Manager, Function Browser (React)
- [ ] Ribbon implementation (6 groups: PVT, IPR/VLP, MBE, PTA, FRAC, Lift)
- [ ] Custom Functions metadata (functions.json) — map all functions to Excel UDFs
- [ ] DCA extended models: Transient Hyperbolic, Extended Exponential, Ansah-Knowles-Buba
- [ ] FRAC extended: Uniaxial strain poroelastic closure stress model
- [ ] Wellbore integrity: production casing burst/collapse, cement top, shoe test
- [ ] Web deployment / Netlify/Azure manifest hosting for web calculator

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

## Key Engineering Details (from P365.md)
- Pipe material roughness: Bare Steel 0.000150 ft · Coated Steel 0.000100 ft · PE 0.000005 ft
- Standard pipe sizes: ASME B36.10M (Sch 40 steel) and ASTM D2513 SDR-11 (PE)
- Weymouth equation for natural gas distribution
- Velocity check: < 40 ft/s recommended
- Blue cells = inputs · Green cells = results
