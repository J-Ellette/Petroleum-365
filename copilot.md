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
    utilities/      ← Unit converter, spline, math utils
    pipe/           ← Pipe sizing calculator
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

#### Next Session — Session 3 (Planned)
- [ ] VFP / Vertical Flow Performance (Beggs-Brill, Gray, Hagedorn-Brown)
- [ ] Surface Facilities (choke, compressor)
- [ ] Flow Assurance (hydrate prediction, MEG/methanol dosing, corrosion)
- [ ] Hydraulic Fracturing functions (PKN geometry, proppant settling)
- [ ] Field Production Profile templates (buildup-plateau-decline)
- [ ] Gas Flow equations (Panhandle A&B, AGA)
- [ ] CNG/LNG functions (density, BOG, storage)
- [ ] Office.js taskpane UI — Blueprint Manager, Function Browser
- [ ] Ribbon implementation (6 groups + Library + Unit Conversion)

#### Session 3 (Planned)
- [ ] VFP / multiphase vertical flow (Beggs-Brill, Gray, Hagedorn-Brown)
- [ ] Surface Facilities (choke sizing, compressor power)
- [ ] Flow Assurance (hydrate prediction/inhibitor, corrosion, erosion)
- [ ] Gas Flow (Panhandle A&B, AGA, non-Darcy)
- [ ] CNG/LNG thermodynamics (density, BOG, storage, regasification)
- [ ] Hydraulic Fracturing (PKN geometry, proppant settling, CfD, skin)
- [ ] Field Production Profile (buildup-plateau-decline model)
- [ ] EoS (Peng-Robinson flash, phase envelope)
- [ ] Blueprint templates (actual Excel sheet XML)
- [ ] Office.js taskpane UI — Blueprint Manager, Function Browser
- [ ] Ribbon implementation (6 groups + Library + Unit Conversion)
- [ ] Web deployment / Netlify/Azure manifest hosting

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

## Key Engineering Details (from P365.md)
- Pipe material roughness: Bare Steel 0.000150 ft · Coated Steel 0.000100 ft · PE 0.000005 ft
- Standard pipe sizes: ASME B36.10M (Sch 40 steel) and ASTM D2513 SDR-11 (PE)
- Weymouth equation for natural gas distribution
- Velocity check: < 40 ft/s recommended
- Blue cells = inputs · Green cells = results
