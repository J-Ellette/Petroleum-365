# Petroleum 365 (P365)

> **A comprehensive petroleum engineering function library and Excel add-in for natural gas, oil, CNG, and LNG calculations.**

[![Tests](https://img.shields.io/badge/tests-1238%20passing-brightgreen)](./test)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [What Is P365?](#what-is-p365)
- [Target Audience](#target-audience)
- [Features](#features)
- [Function Categories](#function-categories)
- [Installation](#installation)
- [Usage](#usage)
- [Function Naming Convention](#function-naming-convention)
- [Module Reference](#module-reference)
- [Excel Add-in](#excel-add-in)
- [Blueprints](#blueprints)
- [Unit Converter](#unit-converter)
- [Development](#development)
- [Contributing](#contributing)

---

## What Is P365?

**Petroleum 365** is a TypeScript function library and Microsoft Office.js Excel add-in built for petroleum and natural gas engineers. It provides **800+ engineering calculations** organized into 27 discipline-specific modules — covering everything from PVT correlations and decline curve analysis to hydraulic fracturing design (including poroelastic closure stress and Nolte G-function analysis), nodal analysis, LNG thermodynamics, wellbore heat transfer, geomechanics, composite skin factor analysis, wellbore integrity (casing design, cement jobs, shoe tests), and **reservoir simulation INCLUDE file generation** (Eclipse SWOF/SGOF/PVDG/PVTW, CMG WOTABLE/GOTABLE, and batch file generator).

P365 is designed to work **inside Microsoft Excel** as a custom function library (UDFs), letting engineers use familiar spreadsheet workflows backed by rigorous, well-tested engineering correlations. It is also available as a standalone TypeScript/Node.js library for integration into web applications, pipelines, or custom tooling. The full **Office 365 add-in suite** — Word, Outlook, Teams, PowerPoint, OneNote, and Access — extends P365 calculations into reports, emails, collaboration cards, presentations, field notes, and job databases.

---

## Target Audience

| Role | How P365 Helps |
|------|---------------|
| **Reservoir Engineers** | DCA, MBE, IPR, PTA, EoS, nodal analysis |
| **Production Engineers** | VFP, ESP, gas lift, rod pump, nodal analysis |
| **Facilities Engineers** | Surface facilities, flow assurance, pipe sizing |
| **Gas Engineers** | PVT, AGA-8, heating value, CNG/LNG, compressors |
| **Completions/Frac Engineers** | Hydraulic fracturing geometry, proppant, CfD, skin analysis |
| **Drilling Engineers** | Geomechanics: fracture gradient, mud window, wellbore stability |
| **Petrophysicists** | SCAL — relative permeability, capillary pressure, IFT, wettability |
| **Field Production Analysts** | Field production profiles, multi-well scheduling, EUR |
| **Consultants & Students** | Reference-quality correlations with clear naming |

---

## Features

- ✅ **723 passing unit tests** — every correlation is independently verified
- ✅ **27 engineering modules** covering the full production lifecycle
- ✅ **Field units throughout** — psi, °F, STB, scf, ft, cp, md
- ✅ **Named after correlation authors** — `P365.PVT.Z.ByDAK` is the Dranchuk-Abou-Kassem method
- ✅ **Pure functions** — no side effects, no global state, fully testable
- ✅ **TypeScript-first** — full type safety and IntelliSense in Excel and in code
- ✅ **Office.js compatible** — designed as Excel Custom Functions (UDFs)
- ✅ **No external runtime dependencies** — all math is self-contained

---

## Function Categories

| # | Module | Category | Key Capabilities |
|---|--------|----------|-----------------|
| 1 | **PVT** | Gas / Oil / Water | Z-factor, viscosity, FVF, density, bubble point, solution GOR |
| 2 | **DCA** | Decline Curve Analysis | Arps, Modified Hyperbolic, Duong, PLE, SEPD, LGM, Transient Hyperbolic, EE, AKB; diagnostics; EUR; data QC |
| 3 | **IPR** | Inflow Performance | Vogel, Fetkovich, composite, gas deliverability, horizontal PI, skin |
| 4 | **VFP** | Vertical Flow | Beggs-Brill, Gray, Hagedorn-Brown, Turner critical velocity, VLP curves |
| 5 | **MBE** | Material Balance | p/Z, OGIP, Havlena-Odeh, aquifer models (Fetkovich, Van Everdingen-Hurst) |
| 6 | **PTA** | Pressure Transient | Ei function, drawdown, Horner buildup, Bourdet derivative, fault image |
| 7 | **EoS** | Equation of State | Peng-Robinson flash, bubble/dew point, fugacity, K-values (Rachford-Rice) |
| 8 | **FRAC** | Hydraulic Fracturing | PKN/KGD geometry, Carter leakoff, proppant settling, CfD, skin |
| 9 | **ESP** | Electric Submersible Pump | TDH, stages, motor HP, cable voltage drop, gas handling |
| 10 | **GL** | Gas Lift | Thornhill-Craver valve, injection rate, optimal depth, critical flow |
| 11 | **RP** | Rod Pump | Displacement, PPRL/MPRL, torque, API unit class, stroke length |
| 12 | **SF** | Surface Facilities | Choke sizing (5 correlations), Panhandle A/B, compressor sizing |
| 13 | **FA** | Flow Assurance | Hydrate (Hammerschmidt/Katz), CO₂ corrosion, API RP 14E erosion |
| 14 | **SCAL** | Core Analysis | Corey/LET/Honarpour Kr, Brooks-Corey/van Genuchten Pc, Leverett J, B-L |
| 15 | **FPP** | Field Production Profile | Buildup-plateau-decline, multi-well schedule aggregation, EUR |
| 16 | **CNG/LNG** | Gas Monetization | CNG cylinder/GGE/cascade, LNG density/BOG/voyage heel, price equivalence |
| 17 | **Pipe** | Pipe Sizing | Weymouth forward/reverse, fittings EL, multi-segment, velocity check |
| 18 | **HV** | Heating Value | HHV, LHV, Wobbe Index, MW from composition (GPA 2145) |
| 19 | **AGA-8** | Custody Transfer | AGA-8 Z-factor by Hall-Yarborough on mixture pseudo-criticals |
| 20 | **Nodal** | Nodal Analysis | IPR + VLP intersection, oil well (Vogel+B&B), gas well operating point |
| 21 | **WHT** | Wellbore Heat Transfer | Ramey model, OHTC, geothermal profile, insulation sizing, heat loss |
| 22 | **GEO** | Geomechanics | Eaton pore pressure, fracture gradient (3 methods), mud window, wellbore stability |
| 23 | **SKIN** | Composite Skin Factor | Hawkins, Karakas-Tariq, non-Darcy, partial penetration, gravel pack |
| 24 | **WBI** | Wellbore Integrity | Casing burst/collapse, buoyancy, cement volume/density, FIT/LOT/XLOT, mud window |
| 25 | **SIM** | Sim INCLUDE Generator | Eclipse SWOF/SGOF/PVDG/PVTW, CMG WOTABLE/GOTABLE, Corey table builder, File Generator |
| 26 | **Blueprints** | Blueprint Manager Catalog | 35+ structured blueprint templates with category/search/install metadata |
| 27 | **Utilities** | Unit Conversion | 60+ categories, 1500+ unit pairs, temperature offsets, unit expressions |

---

## Installation

### As a TypeScript / Node.js Library

```bash
git clone https://github.com/J-Ellette/Petroleum-365.git
cd Petroleum-365
npm install
```

Run the test suite to verify:
```bash
npx jest --no-coverage
```

Type-check:
```bash
npx tsc --noEmit
```

### As an Excel Add-in

1. Clone the repository and install dependencies (see above)
2. Build the add-in:
   ```bash
   npm run build
   ```
3. Sideload the add-in in Excel:
   - Open Excel → **Insert** → **Get Add-ins** → **My Add-ins** → **Upload My Add-in**
   - Browse to `manifest.xml` in the project root
4. The **Petroleum 365** tab will appear in the Excel ribbon

> **Note:** For production deployment, host the built files on a web server (e.g., Azure Static Web Apps, Netlify) and update the `manifest.xml` source URLs.

---

## Usage

### In TypeScript / Node.js

```typescript
import { P365 } from "./src";

// ─── PVT: Gas Z-factor ────────────────────────────────────────────────────────
const z = P365.PVT.Z.ByDAK(0.65, 2000, 150, 665, 168);
// args: SG, P_psia, T_degF, Tpc_R, Ppc_psia
console.log(`Z = ${z.toFixed(4)}`);  // → Z = 0.8347

// ─── DCA: Arps rate forecast ─────────────────────────────────────────────────
const q = P365.DCA.Arps.Rate(1000, 0.15, 0.8, 12);
// args: qi (MCFD), Di (annual), b, t (months)
console.log(`Rate at 12 months = ${q.toFixed(1)} MCFD`);

// ─── IPR: Vogel IPR curve ─────────────────────────────────────────────────────
const qVogel = P365.IPR.Vogel.Rate(2500, 1200, 1500);
// args: Pr_psia, Pwf_psia, Qmax_STBd
console.log(`Vogel rate = ${qVogel.toFixed(0)} STB/d`);

// ─── HV: Gas composition heating value ───────────────────────────────────────
const analysis = P365.HV.hvAnalysis(
  [0.92, 0.05, 0.02, 0.01],
  ["C1", "C2", "C3", "N2"]
);
console.log(`HHV = ${analysis.hhv_BTUscf.toFixed(1)} BTU/scf`);  // → 1027.3
console.log(`Wobbe Index = ${analysis.wobbeIndex.toFixed(1)}`);

// ─── Nodal: Operating point ───────────────────────────────────────────────────
const result = P365.Nodal.nodalOperatingPoint(
  (q) => 3000 - q,       // IPR: Pwf = Pr - q/J
  (q) => 500 + 0.5 * q,  // VLP: Pwf rises with rate (friction)
  0, 3000
);
console.log(`Operating point: q = ${result.q_op.toFixed(0)} STB/d, Pwf = ${result.Pwf_op.toFixed(0)} psi`);

// ─── MBE: Gas p/Z plot ───────────────────────────────────────────────────────
const ogip = P365.MBE.ogipTwoPoint(
  [3000, 2000], [0.85, 0.92],    // P_arr, Z_arr
  [0, 500]                        // Gp_arr (MMscf)
);
console.log(`OGIP = ${ogip.toFixed(0)} MMscf`);

// ─── Unit Converter ───────────────────────────────────────────────────────────
const bar = P365.UnitConverter(1000, "psia", "bar");
console.log(`1000 psia = ${bar.toFixed(2)} bar`);  // → 68.95 bar
```

### In Excel (as UDFs)

After loading the add-in, use P365 functions directly in Excel cells:

```excel
=P365.PVT.Z.ByDAK(A1, B1, C1, 665, 168)     ← Gas Z-factor
=P365.DCA.Arps.Rate(A2, 0.15, 0.8, B2)       ← Arps decline rate
=P365.IPR.Vogel.Rate(3000, A3, 1500)          ← Vogel IPR
=P365.UnitConverter(A4, "psia", "MPa")        ← Unit conversion
=P365.HV.hvHHV({0.92,0.05,0.02,0.01}, {"C1","C2","C3","N2"})   ← HHV
```

---

## Function Naming Convention

All P365 functions follow a consistent hierarchical naming pattern:

```
P365.[Category].[Property].[Qualifier].By[Author]
```

| Part | Example | Meaning |
|------|---------|---------|
| `P365` | `P365` | Petroleum 365 namespace |
| `Category` | `PVT` | Engineering discipline |
| `Property` | `Z` | Calculated property |
| `Qualifier` | *(optional)* | Conditions or variant |
| `By[Author]` | `ByDAK` | Dranchuk-Abou-Kassem correlation |

**Examples:**

| Function | Description |
|----------|-------------|
| `P365.PVT.Z.ByDAK` | Gas Z-factor by Dranchuk-Abou-Kassem |
| `P365.PVT.Z.ByHallYarborough` | Gas Z-factor by Hall-Yarborough |
| `P365.IPR.Vogel.Rate` | Vogel IPR flow rate |
| `P365.DCA.Arps.Cumulative` | Arps decline cumulative production |
| `P365.MBE.pZPlot.OGIP` | Material balance OGIP from p/Z |
| `P365.EoS.Flash.RachfordRice` | Two-phase flash by Rachford-Rice |

---

## Module Reference

### PVT — Pressure-Volume-Temperature

**Gas Properties**
| Function | Description | Inputs | Output |
|----------|-------------|--------|--------|
| `P365.PVT.Z.ByDAK` | Z-factor (Dranchuk-Abou-Kassem) | SG, P_psia, T_degF, Tpc_R, Ppc_psia | Z (dimensionless) |
| `P365.PVT.Z.ByHallYarborough` | Z-factor (Hall-Yarborough) | Tpr, Ppr | Z |
| `P365.PVT.Z.ByBrillBeggs` | Z-factor (Brill-Beggs explicit) | Tpr, Ppr | Z |
| `P365.PVT.Viscosity.Gas.ByLeeGonzalez` | Gas viscosity | SG, P_psia, T_degF | μg (cp) |
| `P365.PVT.Density.Gas` | Gas density | P, T, Z, MW | ρ (lb/ft³) |
| `P365.PVT.FVF.Gas` | Gas FVF (Bg) | P_psia, T_degF, Z | Bg (cf/scf) |
| `P365.PVT.Compressibility.Gas` | Gas compressibility | SG, P, T, Tpc, Ppc | cg (1/psi) |
| `P365.PVT.Ppc.ByLeeKesler` | Pseudo-critical pressure | SG | Ppc_psia |
| `P365.PVT.Tpc.ByLeeKesler` | Pseudo-critical temperature | SG | Tpc_R |
| `P365.PVT.Ppc.ByKaysMixing` | Ppc from composition | yi[], Tc[], Pc[] | Ppc |
| `P365.PVT.Ppc.WichertAziz` | Sour gas Tpc/Ppc correction | Tpc, Ppc, H2S%, CO2% | [Tpc', Ppc'] |

**Oil Properties**
| Function | Description |
|----------|-------------|
| `P365.PVT.BubblePoint.ByStanding` | Bubble point pressure (Standing 1947) |
| `P365.PVT.BubblePoint.ByVasquezBeggs` | Bubble point (Vasquez-Beggs 1980) |
| `P365.PVT.Rs.ByStanding` | Solution GOR (Standing) |
| `P365.PVT.Bo.ByStanding` | Oil FVF saturated (Standing) |
| `P365.PVT.Bo.Undersaturated` | Oil FVF undersaturated (co correction) |
| `P365.PVT.Viscosity.Oil.Dead.ByBeal` | Dead oil viscosity (Beal) |
| `P365.PVT.Viscosity.Oil.Saturated.ByBeggsRobinson` | Saturated oil viscosity |
| `P365.PVT.Viscosity.Oil.Undersaturated.ByVasquezBeggs` | Undersaturated viscosity |

**Water Properties**
| Function | Description |
|----------|-------------|
| `P365.PVT.FVF.Water.ByMcCain` | Water FVF (McCain) |
| `P365.PVT.Viscosity.Water.ByMcCain` | Water viscosity (McCain) |
| `P365.PVT.Density.Water` | Water density at P, T |

---

### DCA — Decline Curve Analysis

| Function | Description |
|----------|-------------|
| `P365.DCA.Arps.Rate` | Arps rate at time t (exponential/hyperbolic/harmonic) |
| `P365.DCA.Arps.Cumulative` | Cumulative production (Arps) |
| `P365.DCA.Arps.ModifiedHyperbolic.Rate` | Modified hyperbolic (transitions to exponential) |
| `P365.DCA.Duong.Rate` | Duong rate (unconventional reservoirs) |
| `P365.DCA.Duong.Cumulative` | Duong cumulative |
| `P365.DCA.PLE.Rate` | Power Law Exponential rate |
| `P365.DCA.PLE.Cumulative` | PLE cumulative |
| `P365.DCA.SEPD.Rate` | Stretched Exponential rate |
| `P365.DCA.SEPD.Cumulative` | SEPD cumulative |
| `P365.DCA.LGM.Rate` | Logistic Growth Model rate |
| `P365.DCA.LGM.Cumulative` | LGM cumulative |
| `P365.DCA.LGM.EUR` | LGM EUR (carrying capacity K) |
| `P365.DCA.Arps.Fit` | Fit Arps parameters to production data |
| `P365.DCA.Duong.Fit` | Fit Duong parameters |
| `P365.DCA.EUR` | EUR at economic limit |
| `P365.DCA.DeclineConversion` | Effective ↔ nominal decline rate |

---

### IPR — Inflow Performance Relationship

| Function | Description |
|----------|-------------|
| `P365.IPR.PI.Darcy` | Productivity Index (Darcy, PSS) |
| `P365.IPR.PI.SS` | Steady-state PI |
| `P365.IPR.PI.Transient` | Transient PI (time-dependent) |
| `P365.IPR.Vogel.Rate` | Vogel IPR rate |
| `P365.IPR.Vogel.Qmax` | Back-calculate Qmax from test point |
| `P365.IPR.Vogel.AOF` | Absolute open flow |
| `P365.IPR.Composite.Rate` | Composite IPR (Darcy + Vogel) |
| `P365.IPR.Fetkovich.Rate` | Fetkovich backpressure IPR |
| `P365.IPR.Gas.Darcy.Rate` | Gas well Darcy deliverability |
| `P365.IPR.Gas.NonDarcy.Rate` | Gas well non-Darcy (turbulence) |
| `P365.IPR.Horizontal.Joshi` | Horizontal PI (Joshi 1988) |
| `P365.IPR.Horizontal.RenardDupuy` | Horizontal PI (Renard-Dupuy 1991) |
| `P365.IPR.Skin.PIRatio` | PI ratio with skin damage |
| `P365.IPR.Skin.PressureDrop` | Skin-induced pressure drop |

---

### VFP — Vertical Flow Performance

| Function | Description |
|----------|-------------|
| `P365.VFP.SinglePhase.Liquid.dP` | Single-phase liquid pressure drop (Fanning) |
| `P365.VFP.SinglePhase.Gas.BHP` | Single-phase gas BHP (avg T-Z) |
| `P365.VFP.BeggsBrill.Gradient` | Beggs-Brill pressure gradient (multiphase) |
| `P365.VFP.BeggsBrill.BHP` | Beggs-Brill BHP |
| `P365.VFP.Gray.Gradient` | Gray correlation pressure gradient |
| `P365.VFP.HagedornBrown.Gradient` | Hagedorn-Brown gradient |
| `P365.VFP.Turner.CriticalVelocity` | Turner critical velocity (gas lift-off) |
| `P365.VFP.Turner.MinRate` | Minimum gas rate for liquid lift |
| `P365.VFP.VLPCurve` | Generate VLP curve (rate array) |

---

### MBE — Material Balance Equation

| Function | Description |
|----------|-------------|
| `P365.MBE.pZ.Ratio` | p/Z at cumulative production |
| `P365.MBE.OGIP.TwoPoint` | OGIP from two p/Z points |
| `P365.MBE.OGIP.Regression` | OGIP from linear regression on p/Z data |
| `P365.MBE.Eo` | Oil expansion term |
| `P365.MBE.Eg` | Gas cap expansion term |
| `P365.MBE.Efw` | Formation/water compressibility expansion |
| `P365.MBE.F` | Reservoir voidage (underground withdrawal) |
| `P365.MBE.HavlenaOdeh` | Havlena-Odeh straight-line OOIP |
| `P365.MBE.DriveIndex` | Drive mechanism indices |
| `P365.MBE.Fetkovich.Aquifer` | Fetkovich pseudo-steady state aquifer |
| `P365.MBE.VEH.WaterInflux` | Van Everdingen-Hurst superposition |
| `P365.MBE.GeopressuredOGIP` | Geopressured reservoir correction |

---

### PTA — Pressure Transient Analysis

| Function | Description |
|----------|-------------|
| `P365.PTA.Ei` | Exponential integral function |
| `P365.PTA.tD` | Dimensionless time |
| `P365.PTA.PD` | Dimensionless pressure (line source) |
| `P365.PTA.Drawdown.MDH` | Drawdown Pwf (semilog/MDH) |
| `P365.PTA.Drawdown.Ei` | Drawdown Pwf (exact Ei solution) |
| `P365.PTA.Horner.Ratio` | Horner time ratio |
| `P365.PTA.Horner.Permeability` | Permeability from Horner slope |
| `P365.PTA.Horner.Skin` | Skin from Horner buildup |
| `P365.PTA.Horner.Pstar` | Extrapolated reservoir pressure |
| `P365.PTA.MDH.Slope` | MDH drawdown slope analysis |
| `P365.PTA.Superposition` | Multi-rate superposition |
| `P365.PTA.FaultBuildup` | Fault image well buildup |
| `P365.PTA.Bourdet.Derivative` | Bourdet pressure derivative |
| `P365.PTA.WellboreStorage` | Wellbore storage C and CD |

---

### EoS — Equation of State

| Function | Description |
|----------|-------------|
| `P365.EoS.PR.CubicRoots` | Peng-Robinson cubic roots (all 3) |
| `P365.EoS.PR.Z.Vapor` | PR Z-factor for vapor phase |
| `P365.EoS.PR.Z.Liquid` | PR Z-factor for liquid phase |
| `P365.EoS.PR.FugacityCoeff` | ln(φ) fugacity coefficient |
| `P365.EoS.MixingRules` | van der Waals mixing rules |
| `P365.EoS.BubblePoint.PR` | Bubble point pressure (successive substitution) |
| `P365.EoS.DewPoint.PR` | Dew point pressure |
| `P365.EoS.Flash.RachfordRice` | Two-phase flash (Rachford-Rice) |

---

### Artificial Lift

**ESP — Electric Submersible Pump**
| Function | Description |
|----------|-------------|
| `P365.ESP.TDH` | Total Dynamic Head |
| `P365.ESP.HydraulicHP` | Hydraulic horsepower |
| `P365.ESP.Stages` | Number of pump stages |
| `P365.ESP.MotorHP` | Motor horsepower (with service factor) |
| `P365.ESP.CableVoltageDrop` | Cable voltage drop |
| `P365.ESP.GasHandling` | Gas void fraction and risk classification |
| `P365.ESP.OperatingPoint` | Pump curve vs TDH intersection |

**Gas Lift**
| Function | Description |
|----------|-------------|
| `P365.GL.ThornhillCraver` | Orifice throughput (critical/subcritical) |
| `P365.GL.ValveDomePressure` | Dome pressure at depth |
| `P365.GL.TRO` | Test rack opening pressure |
| `P365.GL.OptimalDepth` | Optimal injection depth (crossover) |
| `P365.GL.InjectionRate` | Required gas injection rate |

**Rod Pump**
| Function | Description |
|----------|-------------|
| `P365.RP.Displacement` | Pump displacement (bbl/d) |
| `P365.RP.PPRL` | Peak polished rod load |
| `P365.RP.MPRL` | Minimum polished rod load |
| `P365.RP.Torque` | Peak gear reducer torque |
| `P365.RP.MotorHP` | Motor horsepower |
| `P365.RP.APIClass` | API pumping unit class designation |

---

### Surface Facilities & Flow Assurance

**Choke Sizing**
| Function | Correlation |
|----------|-------------|
| `P365.SF.Choke.Gilbert` | Gilbert (1954) |
| `P365.SF.Choke.Ros` | Ros (1960) |
| `P365.SF.Choke.Baxendell` | Baxendell (1957) |
| `P365.SF.Choke.Achong` | Achong (1961) |
| `P365.SF.Choke.Pilehvari` | Pilehvari (1980) |

**Pipeline**
| Function | Description |
|----------|-------------|
| `P365.SF.Pipeline.PanhandleA` | Panhandle A flow rate / outlet pressure |
| `P365.SF.Pipeline.PanhandleB` | Panhandle B flow rate / outlet pressure |
| `P365.SF.Compressor.Power` | Polytropic compression power (HP) |
| `P365.SF.Compressor.Stages` | Interstage pressures |

**Flow Assurance**
| Function | Description |
|----------|-------------|
| `P365.FA.Hydrate.Hammerschmidt` | Hydrate temperature depression (Hammerschmidt) |
| `P365.FA.Hydrate.Katz` | Hydrate formation temperature (Katz 1945) |
| `P365.FA.Hydrate.InhibitorRate.Methanol` | Methanol injection rate (lb/d) |
| `P365.FA.Hydrate.InhibitorRate.MEG` | MEG injection rate (bbl/d) |
| `P365.FA.Corrosion.deWaardMilliams` | CO₂ corrosion rate (mm/yr) |
| `P365.FA.Erosion.APIrp14E` | Erosional velocity limit |
| `P365.FA.Assessment` | Integrated flow assurance assessment |

---

### Subsurface Analysis

**SCAL — Special Core Analysis**
| Function | Description |
|----------|-------------|
| `P365.SCAL.Corey.krw` | Corey water relative permeability |
| `P365.SCAL.Corey.kro` | Corey oil relative permeability |
| `P365.SCAL.LET.krw` | LET water Kr |
| `P365.SCAL.LET.kro` | LET oil Kr |
| `P365.SCAL.Honarpour.krg` | Honarpour gas Kr (sandstone/carbonate) |
| `P365.SCAL.BrooksCorey.Pc` | Brooks-Corey capillary pressure |
| `P365.SCAL.Leverett.J` | Leverett J-function |
| `P365.SCAL.Stone.I` | Stone I three-phase oil Kr |
| `P365.SCAL.Stone.II` | Stone II three-phase oil Kr |
| `P365.SCAL.BuckleyLeverett.ff` | Buckley-Leverett fractional flow |
| `P365.SCAL.Newman.Compressibility` | Newman rock compressibility |

**Hydraulic Fracturing**
| Function | Description |
|----------|-------------|
| `P365.FRAC.PKN.Width` | PKN fracture average width |
| `P365.FRAC.KGD.Width` | KGD fracture width |
| `P365.FRAC.Carter.LeakoffCoeff` | Carter (1957) leakoff coefficient |
| `P365.FRAC.Proppant.SettlingVelocity` | Stokes/modified settling velocity |
| `P365.FRAC.CfD` | Dimensionless fracture conductivity |
| `P365.FRAC.Skin.FracturedWell` | Cinco-Ley/Samaniego equivalent skin |

---

### New in Session 5

**HV — Heating Value (GPA 2145)**
| Function | Description |
|----------|-------------|
| `P365.HV.hvMolecularWeight` | Mixture molecular weight from composition |
| `P365.HV.hvSpecificGravity` | Gas specific gravity from composition |
| `P365.HV.hvHHV` | Higher Heating Value (BTU/scf) |
| `P365.HV.hvLHV` | Lower Heating Value (BTU/scf) |
| `P365.HV.hvWobbeIndex` | Wobbe Index = HHV / √SG |
| `P365.HV.hvHHV_MJNm3` | HHV in MJ/Nm³ |
| `P365.HV.hvLHV_MJNm3` | LHV in MJ/Nm³ |
| `P365.HV.hvAnalysis` | Complete composition analysis |

Supported components: `C1, C2, C3, iC4, nC4, iC5, nC5, C6, C7, N2, CO2, H2S, H2, CO, O2, He, H2O, Ar`

**AGA-8 — Custody Transfer Z-factor**
| Function | Description |
|----------|-------------|
| `P365.AGA8.aga8CharProps` | Critical properties for AGA-8 components |
| `P365.AGA8.aga8MixProps` | Mixture properties (Kay's rule) |
| `P365.AGA8.aga8Z` | Z-factor (SI units: MPa, K) |
| `P365.AGA8.aga8Density` | Molar density (mol/L) |
| `P365.AGA8.aga8CompressibilityFactor` | Z-factor (field units: psia, °F) |

**Nodal — Nodal Analysis**
| Function | Description |
|----------|-------------|
| `P365.Nodal.nodalOperatingPoint` | Generic IPR+VLP intersection (bisection) |
| `P365.Nodal.nodalIPRVogel` | Oil well nodal: Vogel IPR + Beggs-Brill VLP |
| `P365.Nodal.nodalGasWell` | Gas well nodal: Darcy IPR + single-phase VLP |
| `P365.Nodal.nodalSweep` | Evaluate function over rate range |

**WHT — Wellbore Heat Transfer**
| Function | Description |
|----------|-------------|
| `P365.WHT.whtGeothermalTemp` | Temperature at depth (geothermal gradient) |
| `P365.WHT.whtOHTC` | Overall Heat Transfer Coefficient (cylindrical) |
| `P365.WHT.whtFluidTemp` | Ramey (1962) fluid temperature profile |
| `P365.WHT.whtInsulationThickness` | Required insulation thickness |
| `P365.WHT.whtHeatLoss` | Total wellbore heat loss rate (BTU/hr) |

---

### New in Session 6

**GEO — Geomechanics**
| Function | Description |
|----------|-------------|
| `P365.GEO.OverburdenStress` | Total vertical (overburden) stress (psi) |
| `P365.GEO.OverburdenGradient` | Overburden gradient (psi/ft) from bulk density |
| `P365.GEO.BulkDensityFromSonic` | Gardner (1974) bulk density from sonic log |
| `P365.GEO.NormalPorePressure` | Hydrostatic (normal) pore pressure at depth |
| `P365.GEO.NormalTransitTime` | Normal compaction trend transit time (Eaton) |
| `P365.GEO.PorePressureEaton` | Pore pressure from Eaton's sonic method |
| `P365.GEO.EffectiveVerticalStress` | Terzaghi/Biot effective vertical stress |
| `P365.GEO.BiotCoefficient` | Biot coefficient from bulk moduli |
| `P365.GEO.MinHorizontalStress` | Minimum horizontal stress (Eaton 1975) |
| `P365.GEO.FractureGradient.Eaton` | Fracture gradient — Eaton (1975) method |
| `P365.GEO.FractureGradient.HubbertWillis` | Fracture gradient — Hubbert-Willis (1957) |
| `P365.GEO.FractureGradient.MatthewsKelly` | Fracture gradient — Matthews-Kelly (1967) |
| `P365.GEO.FractureClosurePressure` | Fracture closure pressure (= min h-stress) |
| `P365.GEO.MudWindow` | Drilling mud weight window (min/max ppg) |
| `P365.GEO.UCSFromYoungsModulus` | UCS from dynamic Young's modulus (Chang) |
| `P365.GEO.MohrCoulombShearStrength` | Mohr-Coulomb shear strength |
| `P365.GEO.WellboreCollapseGradient` | Wellbore collapse pressure (minimum mud weight) |
| `P365.GEO.StaticPoissonRatio` | Dynamic-to-static Poisson's ratio (Eissa-Kazi) |
| `P365.GEO.CastagnaVs` | Shear wave velocity from Vp (Castagna mudrock line) |
| `P365.GEO.DynamicElasticModuli` | Young's modulus and Poisson's ratio from sonic |
| `P365.GEO.OffshoreOverburden` | Offshore overburden corrected for water depth |
| `P365.GEO.EMWToGradient` | Mud weight (ppg) to gradient (psi/ft) |
| `P365.GEO.GradientToEMW` | Gradient (psi/ft) to mud weight (ppg) |

**SKIN — Composite Skin Factor**
| Function | Description |
|----------|-------------|
| `P365.SKIN.Hawkins` | Hawkins (1956) damage skin factor |
| `P365.SKIN.EffectiveWellboreRadius` | Effective wellbore radius from skin |
| `P365.SKIN.FlowEfficiency` | Flow efficiency (PI ratio vs. undamaged well) |
| `P365.SKIN.Perforation.KarakasTariq` | Karakas-Tariq (1991) perforation skin |
| `P365.SKIN.Perforation.McLeod` | McLeod simplified perforation skin |
| `P365.SKIN.NonDarcy.Beta` | Non-Darcy β coefficient (Jones 1987) |
| `P365.SKIN.NonDarcy.D` | Non-Darcy rate coefficient D |
| `P365.SKIN.NonDarcy.Skin` | Rate-dependent skin (D × q) |
| `P365.SKIN.PartialPenetration` | Papatzacos (1987) partial penetration skin |
| `P365.SKIN.GravelPack` | Gravel pack skin factor |
| `P365.SKIN.Total` | Composite total skin (sum of all components) |
| `P365.SKIN.PressureDrop` | Additional ΔP due to skin (field units) |
| `P365.SKIN.ProductivityRatio` | Productivity ratio vs. ideal (S=0) |
| `P365.SKIN.StimulationRatio` | Post/pre-stimulation PI ratio |

**SCAL — Extensions (IFT + Wettability)**
| Function | Description |
|----------|-------------|
| `P365.SCAL.IFT.ScaledPc` | IFT-scaled capillary pressure (Stegemeier 1977) |
| `P365.SCAL.IFT.CapillaryNumber` | Capillary number Nc (viscous/capillary ratio) |
| `P365.SCAL.IFT.ResidualOilSat` | Residual oil saturation vs. Nc (Taber trapping) |
| `P365.SCAL.IFT.Endpoints` | IFT-adjusted Kr endpoints (miscible flooding) |
| `P365.SCAL.Wettability.Amott` | Amott wettability index (Iw, Io, WI_AH) |
| `P365.SCAL.Wettability.USBM` | USBM wettability index (Donaldson et al. 1969) |

---

### DCA — Extended Decline Models (Session 8)

**Transient Hyperbolic (TH)**
| Function | Description |
|----------|-------------|
| `P365.DCA.TransientHyperbolic.Rate` | Rate at time t (b > 1 allowed; switches to exponential at Dterm) |
| `P365.DCA.TransientHyperbolic.Cumulative` | Cumulative production from 0 to t |
| `P365.DCA.TransientHyperbolic.SwitchTime` | Time at which D(t) reaches terminal decline Dterm |
| `P365.DCA.TransientHyperbolic.EUR` | EUR to economic limit |

**Extended Exponential (EE — Biexponential)**
| Function | Description |
|----------|-------------|
| `P365.DCA.ExtendedExponential.Rate` | q = qi·[f·exp(−Dfast·t) + (1−f)·exp(−Dslow·t)] |
| `P365.DCA.ExtendedExponential.Cumulative` | Cumulative biexponential production |
| `P365.DCA.ExtendedExponential.EUR` | EUR to economic limit (bisection) |

**Ansah-Knowles-Buba (AKB)**
| Function | Description |
|----------|-------------|
| `P365.DCA.AKB.Rate` | q = qi·[1+(K−1)·Di·t]^(−1/(K−1)); K=1→exp, K=2→harmonic |
| `P365.DCA.AKB.Cumulative` | AKB cumulative production |
| `P365.DCA.AKB.EUR` | AKB EUR to economic limit |

**DCA Diagnostics**
| Function | Description |
|----------|-------------|
| `P365.DCA.Diagnostics.DeclineRate` | D(t) pairs from rate data (log-diff method) |
| `P365.DCA.Diagnostics.BFactor` | Instantaneous b-factor from rate data |
| `P365.DCA.Diagnostics.LogLogDerivative` | d(log q)/d(log t) — flow regime slope |
| `P365.DCA.Diagnostics.FlowRegimeFromB` | Classify flow regime from b-factor estimate |

**DCA Data QC**
| Function | Description |
|----------|-------------|
| `P365.DCA.DataQC.RollingZScore` | Leave-one-out rolling Z-score (outlier detection) |
| `P365.DCA.DataQC.CleanProduction` | Remove outliers above Z-score threshold |
| `P365.DCA.DataQC.RateNormalize` | Normalize rates by pressure drawdown |

**DCA Rate Conversions**
| Function | Description |
|----------|-------------|
| `P365.DCA.Conversions.ConvertNominalDecline` | Convert D between year/month/day |
| `P365.DCA.Conversions.AnnualToMonthlyEffective` | De_annual → De_monthly |
| `P365.DCA.Conversions.MonthlyToAnnualEffective` | De_monthly → De_annual |

---

### WBI — Wellbore Integrity

**Casing Burst**
| Function | Description |
|----------|-------------|
| `P365.WBI.Burst.Rating` | API Barlow internal-yield pressure = 0.875 × 2 × Yp × t / OD (psi) |
| `P365.WBI.Burst.DesignFactor` | DF = P_rating / P_applied |
| `P365.WBI.Burst.RequiredRating` | Minimum burst rating from operating pressure × DF |

**Casing Collapse**
| Function | Description |
|----------|-------------|
| `P365.WBI.Collapse.DtRatio` | D/t ratio (OD / wall thickness) |
| `P365.WBI.Collapse.ElasticP` | Elastic collapse pressure (thin-wall, Lamé) |
| `P365.WBI.Collapse.YieldP` | Yield collapse pressure (thick-wall) |
| `P365.WBI.Collapse.Rating` | Conservative collapse rating (min of elastic, yield) |
| `P365.WBI.Collapse.Regime` | Collapse regime classification (Yield/Plastic/Transition/Elastic) |

**Tensile and Buoyancy**
| Function | Description |
|----------|-------------|
| `P365.WBI.Tensile.AirWeight` | Air weight of casing section (lbf) |
| `P365.WBI.Tensile.BuoyancyFactor` | BF = 1 − ρ_fluid / ρ_steel |
| `P365.WBI.Tensile.EffectiveWeight` | In-fluid weight = air_weight × BF |
| `P365.WBI.Tensile.Rating` | Pipe body tensile capacity (lbf) |
| `P365.WBI.Tensile.Check` | Tensile design factor check (df, pass) |

**Cement Job**
| Function | Description |
|----------|-------------|
| `P365.WBI.Cement.Volume` | Annular cement volume (bbl) with excess factor |
| `P365.WBI.Cement.MinTop` | Minimum top-of-cement depth from pressure balance |
| `P365.WBI.Cement.SlurryDensity` | Class G neat cement slurry density (ppg) |
| `P365.WBI.Cement.ReturnHeight` | Cement column height from placed volume |

**Shoe Test / FIT / LOT / XLOT**
| Function | Description |
|----------|-------------|
| `P365.WBI.ShoeTest.FITEquivalentMW` | EMW = MW + P_surface/(0.052 × TVD) |
| `P365.WBI.ShoeTest.FITSurfacePressure` | Surface pressure to reach target FIT EMW |
| `P365.WBI.ShoeTest.Evaluate` | Pass/fail + assessment against required EMW |
| `P365.WBI.ShoeTest.XLOTClosureStress` | Min horizontal stress from ISIP |
| `P365.WBI.ShoeTest.LOTBreakdownEMW` | Breakdown EMW from peak LOT pressure |

**Mud Weight Window and Hydrostatics**
| Function | Description |
|----------|-------------|
| `P365.WBI.MudWindow` | Drilling mud weight window (MW_min, MW_max, window_ppg, adequate) |
| `P365.WBI.HydrostaticPressure` | P = 0.052 × MW × TVD (psia) |
| `P365.WBI.PressureToEMW` | EMW = P / (0.052 × TVD) (ppg) |

---

## Office Add-in Suite

P365 is designed to span the full Microsoft 365 application suite. Each add-in uses the same underlying engineering function library.

| App | Status | What It Does |
|-----|--------|--------------|
| **Excel** | ✅ Core (Sessions 1–6) | UDF functions, ribbon tab, blueprints — the full product |
| **Word** | ✅ Implemented (Session 7) | Report templates for PVT, well test, DCA, nodal, MBE, gas composition; Markdown table builder; full document skeleton generator |
| **Outlook** | ✅ Implemented (Session 7) | Email builders for pipe sizing, well performance, gas composition, RFI response, DCA forecast; smart unit system detection (field/metric); unit conversion helpers |
| **Teams** | ✅ Implemented (Session 7) | Adaptive Cards for pipe sizing (with velocity warning), well performance, gas composition; FAQ bot (7 topics); calculator result cards |
| **PowerPoint** | ✅ Implemented (Session 7) | `PptxSlide` interface; slide builders for results, pipe schedule, DCA forecast, p/z plot, MBE summary, gas composition; full deck assemblers |
| **OneNote** | ✅ Implemented (Session 7) | HTML note block builders for PVT, gas composition, well test, well performance, DCA forecast; full job summary page assembler |
| **Access** | ✅ Implemented (Session 7) | Job/snapshot record validation; SQL INSERT formatters; dynamic query builder; form layout definitions |

See `src/addins/` for the full implementation of each add-in.

### Word Add-in Functions

| Function | Description |
|----------|-------------|
| `buildPvtReportData` | PVT report key-value dict (Z, Bg, Rs, Bo, viscosity) |
| `buildWellTestReportData` | PTA interpretation report (k, S, P*, WBS, ROI) |
| `buildDcaReportData` | Decline curve report (model, qi, Di, b, EUR) |
| `buildNodalReportData` | Nodal analysis report (operating point, PI, Qmax) |
| `buildMbeReportData` | Material balance report (OGIP/OOIP, drive indices) |
| `buildGasCompositionReportData` | Gas composition report (MW, SG, HHV, LHV, Wobbe) |
| `buildWordTable` | Markdown pipe-delimited table builder |
| `buildWordDocumentContent` | Full document skeleton for any template |

### Outlook Add-in Functions

| Function | Description |
|----------|-------------|
| `buildPipeSizingEmailBody` | Pipe sizing result email (HTML table body) |
| `buildWellPerformanceEmailBody` | Well performance email |
| `buildGasCompositionEmailBody` | Gas analysis report email |
| `buildRfiResponseEmailBody` | RFI response with embedded calculation table |
| `buildDcaForecastEmailBody` | DCA forecast summary email |
| `detectUnitSystem` | Auto-detect field vs metric from email domain |
| `convertValueForEmail` | Unit conversion (psia→kPa, ft→m, STBd→m³/d) |

### Teams Add-in Functions

| Function | Description |
|----------|-------------|
| `buildPipeSizingCard` | Adaptive Card with velocity warning |
| `buildWellPerformanceCard` | Well performance Adaptive Card |
| `buildGasCompositionCard` | Gas composition Adaptive Card |
| `buildBotFaqResponse` | FAQ bot (Weymouth, Z-factor, Vogel, Arps, skin, OGIP, HHV) |
| `buildCalculatorCard` | Generic inputs + results Adaptive Card |
| `buildTeamsAdaptiveCard` | Generic key-value Adaptive Card |

### PowerPoint Add-in Functions

| Function | Description |
|----------|-------------|
| `buildPipeSizingTitleSlide` | Title slide data |
| `buildPipeSizingResultsSlide` | Results table slide |
| `buildPipeSizingScheduleSlide` | Pipe schedule table slide |
| `buildDcaForecastSlide` | DCA forecast chart slide |
| `buildMbeSummarySlide` | Two-column MBE summary slide |
| `buildGasCompositionSlide` | Gas composition table slide |
| `assemblePipeSizingDeck` | 3-slide pipe sizing deck |
| `assembleDcaDeck` | 2-slide DCA deck |

### OneNote Add-in Functions

| Function | Description |
|----------|-------------|
| `buildOneNoteBlock` | Generic HTML note block |
| `buildFieldMeasurementLog` | Timestamped field measurement log |
| `buildPvtDataBlock` | PVT data note (Z, Bg, Bo, HHV) |
| `buildGasCompositionBlock` | Gas composition note |
| `buildWellTestBlock` | PTA interpretation note |
| `buildWellPerformanceBlock` | Well performance note |
| `buildDcaForecastBlock` | DCA forecast note |
| `buildJobSummaryPage` | Full job summary page |

### Access Add-in Functions

| Function | Description |
|----------|-------------|
| `validateJobRecord` | Validate job number, fields, status enum |
| `formatJobForInsert` | SQL INSERT for tblJobs |
| `formatCalcSnapshotForInsert` | SQL INSERT for tblCalcSnapshots |
| `buildJobFilterQuery` | Dynamic job query with WHERE clauses |
| `FORM_DEFINITIONS` | Access form layout definitions |



When loaded in Excel, P365 functions appear as **Custom Functions (UDFs)** with full IntelliSense support.

### Ribbon Groups

| Group | Description |
|-------|-------------|
| **PVT** | Gas/Oil/Water property lookups |
| **IPR / VLP** | Inflow and vertical lift performance |
| **MBE / PTA** | Material balance and pressure transient |
| **FRAC** | Hydraulic fracturing design |
| **Lift** | ESP, gas lift, rod pump |
| **Utilities** | Unit converter, blueprints |

### Using Array Functions

Some P365 functions return arrays (VLP curves, IPR curves, production profiles). Excel 365 dynamic arrays handle these automatically — the results spill into adjacent cells.

```excel
=P365.VFP.VLPCurve(...)    → spills rate/BHP pairs down a column
=P365.DCA.Arps.Rate(...)   → used as array formula for multiple time steps
```

---

## Blueprints

Blueprints are pre-built Excel worksheet templates you can insert at any cell. The **Blueprint Manager** (available in the Petroleum 365 ribbon) provides:

- **Search** by keyword or category
- **Preview** of each blueprint's purpose and inputs
- **Insert** at any selected cell

Available blueprints cover:
- Gas Well IPR Analysis
- p/Z Material Balance (OGIP)
- Pipeline Pressure Drop (Weymouth / Panhandle)
- CNG Station Sizing
- LNG BOG Calculator
- Hydrate Inhibitor Dosing
- Gas Composition Analyzer (HHV, LHV, Wobbe, MW)
- Arps Decline Forecast
- DCA Auto-Fit Model Comparison
- Field Production Profile
- Fracture Design Screening
- Nodal Analysis (IPR + VLP)
- ESP Design Sheet
- Gas Lift Valve Sizing

---

## Unit Converter

```excel
=P365.UnitConverter(value, "from_unit", "to_unit")
```

**Examples:**
```excel
=P365.UnitConverter(1000, "psia", "bar")    → 68.95
=P365.UnitConverter(100, "degF", "degC")    → 37.78
=P365.UnitConverter(1, "MMBtu", "GJ")       → 1.0551
=P365.UnitConverter(1, "bbl", "m3")         → 0.15899
=P365.UnitConverter(1, "md", "m2")          → 9.869e-16
=P365.UnitConverter(1, "scf/STB", "Nm3/m3") → 0.17811
```

Supports **60+ categories** and **1,500+ unit pairs** including pressure, temperature, length, area, volume, mass, flow, energy, power, viscosity, density, permeability, heating value, and molar units. Also supports **scaled units** (e.g., `"640 acre"`) and **unit expressions** (e.g., `"bbl*psi/day"`).

---

### FRAC Extended — Poroelastic Closure & Nolte-G Analysis (Session 9)

**Closure Stress & Net Pressure**
| Function | Description |
|----------|-------------|
| `P365.FRAC.Poroelastic.Closure` | σ_h from uniaxial strain model: [ν/(1-ν)]·(σ_v − α·Pp) + α·Pp + Δσ_tect |
| `P365.FRAC.NetPressure` | Net pressure: P_net = P_treating − σ_closure − P_friction |
| `P365.FRAC.FluidEfficiency` | Fluid efficiency η = V_frac / V_injected (0–1) |
| `P365.FRAC.ISIP` | Bottomhole ISIP from surface pressure + hydrostatic head |
| `P365.FRAC.SurfaceTreatingPressure` | Wellhead STP = P_BH − hydrostatic + pipe friction + perf friction |
| `P365.FRAC.BreakdownPressure` | Fracture initiation: P_bd = σ_h + T₀ − P_pore (Hubbert-Willis) |

**Nolte G-Function Analysis**
| Function | Description |
|----------|-------------|
| `P365.FRAC.Nolte.G` | G(ΔtD) = (4/3)·[(1+ΔtD)^1.5 − ΔtD^1.5 − 1] — step-rate test diagnostic |
| `P365.FRAC.Nolte.Closure` | P_closure = P_ISIP − (dP/dG) × G_closure from G-function plot |
| `P365.FRAC.Nolte.Leakoff` | Carter leakoff coefficient from G-function slope |

---

### SIM — Reservoir Simulation INCLUDE File Generator (Session 9)

**Eclipse Keywords**
| Function | Description |
|----------|-------------|
| `P365.SIM.SWOF` | Generate Eclipse SWOF keyword text from water-oil Kr table (Sw, krw, krow, Pcow) |
| `P365.SIM.SGOF` | Generate Eclipse SGOF keyword text from gas-oil Kr table (Sg, krg, krog, Pcgo) |
| `P365.SIM.PVTO` | Generate Eclipse PVTO (live oil) PVT table text with undersaturated branches |
| `P365.SIM.PVDG` | Generate Eclipse PVDG (dry gas) PVT table text |
| `P365.SIM.PVTW` | Generate Eclipse PVTW (water PVT) single-line keyword |

**CMG Keywords**
| Function | Description |
|----------|-------------|
| `P365.SIM.WOTABLE` | Generate CMG STARS/GEM WOTABLE (water-oil Kr) keyword |
| `P365.SIM.GOTABLE` | Generate CMG STARS/GEM GOTABLE (gas-oil Kr) keyword |

**Table Builders**
| Function | Description |
|----------|-------------|
| `P365.SIM.BuildSwofTable` | Build SWOF table array from Corey kr parameters (N evenly-spaced points) |
| `P365.SIM.BuildSgofTable` | Build SGOF table array from Corey kr parameters |
| `P365.SIM.KrEndpointTable` | Formatted SCAL endpoint summary table for Eclipse comment block |

**File Generator**
| Function | Description |
|----------|-------------|
| `P365.SIM.GenerateFromTemplate` | Render simulation input file from template with @TOKEN substitution |
| `P365.SIM.ValidateTokens` | Validate token map against template — returns missing token names |
| `P365.SIM.BatchGenerate` | Generate multiple output files from one template + case table |

---

## Development

### Project Structure

```
Petroleum-365/
├── src/
│   ├── index.ts                  ← P365 namespace (all exports)
│   ├── functions.json            ← UDF registrations (62 entries)
│   └── functions/
│       ├── pvt/                  ← PVT: gas.ts, oil.ts, water.ts
│       ├── dca/                  ← Decline curve analysis
│       ├── ipr/                  ← Inflow performance
│       ├── vfp/                  ← Vertical flow performance
│       ├── mbe/                  ← Material balance
│       ├── pta/                  ← Pressure transient analysis
│       ├── eos/                  ← Equation of state (PR)
│       ├── frac/                 ← Hydraulic fracturing (+ poroelastic, Nolte-G)
│       ├── esp/                  ← Electric submersible pump
│       ├── gl/                   ← Gas lift
│       ├── rp/                   ← Rod pump
│       ├── sf/                   ← Surface facilities
│       ├── fa/                   ← Flow assurance
│       ├── scal/                 ← Special core analysis
│       ├── fpp/                  ← Field production profile
│       ├── cnglng/               ← CNG and LNG calculations
│       ├── hv/                   ← Heating value (GPA 2145)
│       ├── aga8/                 ← AGA-8 Z-factor
│       ├── nodal/                ← Nodal analysis
│       ├── wht/                  ← Wellbore heat transfer
│       ├── geo/                  ← Geomechanics
│       ├── skin/                 ← Composite skin factor
│       ├── wbi/                  ← Wellbore integrity
│       ├── sim/                  ← Sim INCLUDE file generator (Session 9)
│       ├── pipe/                 ← Pipe sizing
│       └── utilities/            ← Unit converter
├── src/addins/
│   ├── blueprints/               ← Blueprint Manager catalog (Session 9)
│   ├── browser/                  ← Function Browser catalog (Session 9)
│   ├── word/                     ← Word add-in helpers
│   ├── outlook/                  ← Outlook add-in helpers
│   ├── teams/                    ← Teams Adaptive Card builders
│   ├── powerpoint/               ← PowerPoint slide builders
│   ├── onenote/                  ← OneNote note builders
│   └── access/                   ← Access database schema + queries
├── test/                         ← Jest tests (mirrors src/functions)
├── manifest.xml                  ← Office Add-in manifest
├── package.json
├── tsconfig.json
├── jest.config.json
└── P365.md                       ← Full project blueprint
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npx jest --no-coverage` | Run all 1238 unit tests |
| `npx tsc --noEmit` | TypeScript type-check (0 errors expected) |
| `npm run build` | Build for production |

### Adding a New Module

1. Create `src/functions/<module>/index.ts`
2. Create `test/<module>/<module>.test.ts`
3. Import and add to the `P365` namespace in `src/index.ts`
4. Add re-exports (`export * as P365_<Module>`) to `src/index.ts`
5. Run `npx tsc --noEmit && npx jest --no-coverage` — all tests must pass

### Coding Conventions

- **Pure functions only** — no classes, no global state, no side effects
- **Field units by default** — psia, °F, STB/d, scf, ft, cp, md
- **Named after authors** — `By[AuthorLastName]` suffix for correlation-specific functions
- **JSDoc every function** — units, valid ranges, and reference in the doc comment
- **Throw on invalid input** — use `throw new Error(...)` for out-of-range parameters
- **No `any` types** — use explicit TypeScript types throughout

---

## Contributing

This project follows the [P365.md](./P365.md) blueprint. Contributions should:

1. Follow the existing module structure and naming conventions
2. Include unit tests for every new function
3. Compile without TypeScript errors (`npx tsc --noEmit`)
4. Pass all existing tests (no regressions)
5. Document inputs, outputs, units, and correlation reference

---

## License

MIT © Petroleum 365 Contributors

---

*Petroleum 365 — Engineering calculations for the modern gas and oil industry.*