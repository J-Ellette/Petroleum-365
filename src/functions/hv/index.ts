/**
 * P365 — Heating Value (HV)
 *
 * GPA 2145 standard volumetric heating values and mixture properties for
 * natural gas composition analysis.
 *
 * Units: BTU/scf at 60°F, 14.696 psia; MW in g/mol.
 */

// ─── Component Property Table ─────────────────────────────────────────────────

/** Air molecular weight (g/mol) for specific gravity calculations. */
const AIR_MW = 28.9625;

interface ComponentProps {
  MW:  number;   // g/mol
  HHV: number;   // BTU/scf
  LHV: number;   // BTU/scf
}

/** GPA 2145 component properties keyed by component symbol. */
const COMPONENT_PROPS: Record<string, ComponentProps> = {
  C1:  { MW: 16.043,  HHV: 1012.0, LHV:  909.4 },
  C2:  { MW: 30.070,  HHV: 1769.6, LHV: 1618.7 },
  C3:  { MW: 44.097,  HHV: 2516.1, LHV: 2315.0 },
  iC4: { MW: 58.124,  HHV: 3251.9, LHV: 2998.7 },
  nC4: { MW: 58.124,  HHV: 3262.3, LHV: 3009.2 },
  iC5: { MW: 72.151,  HHV: 4000.9, LHV: 3697.7 },
  nC5: { MW: 72.151,  HHV: 4008.7, LHV: 3705.5 },
  C6:  { MW: 86.178,  HHV: 4755.9, LHV: 4403.1 },
  C7:  { MW: 100.205, HHV: 5502.5, LHV: 5099.0 },
  N2:  { MW: 28.013,  HHV:    0.0, LHV:    0.0 },
  CO2: { MW: 44.010,  HHV:    0.0, LHV:    0.0 },
  H2S: { MW: 34.082,  HHV:  637.1, LHV:  586.6 },
  H2:  { MW:  2.016,  HHV:  325.0, LHV:  273.8 },
  CO:  { MW: 28.010,  HHV:  323.0, LHV:  321.4 },
  O2:  { MW: 31.999,  HHV:    0.0, LHV:    0.0 },
  He:  { MW:  4.003,  HHV:    0.0, LHV:    0.0 },
  H2O: { MW: 18.015,  HHV:    0.0, LHV:    0.0 },
  Ar:  { MW: 39.948,  HHV:    0.0, LHV:    0.0 },
};

/** Conversion factor from BTU/scf to MJ/Nm³. */
const BTU_SCF_TO_MJ_NM3 = 0.037259;

// ─── Helper ───────────────────────────────────────────────────────────────────

function getProps(component: string): ComponentProps {
  const p = COMPONENT_PROPS[component];
  if (!p) throw new Error(`Unknown component: ${component}`);
  return p;
}

// ─── Exported Functions ───────────────────────────────────────────────────────

/**
 * Mixture molecular weight from mole fractions (Kay's mixing rule).
 *
 * @param yi         Array of mole fractions (must sum to 1)
 * @param components Array of component symbols (e.g. "C1", "C2", "N2")
 * @returns          Molecular weight (g/mol)
 */
export function hvMolecularWeight(yi: number[], components: string[]): number {
  if (yi.length !== components.length) throw new Error("yi and components must have same length");
  return yi.reduce((sum, y, i) => sum + y * getProps(components[i]).MW, 0);
}

/**
 * Gas specific gravity relative to air (MW_mix / 28.9625).
 *
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          Specific gravity (dimensionless)
 */
export function hvSpecificGravity(yi: number[], components: string[]): number {
  return hvMolecularWeight(yi, components) / AIR_MW;
}

/**
 * Mixture higher heating value (HHV), mole-fraction weighted.
 *
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          HHV (BTU/scf)
 */
export function hvHHV(yi: number[], components: string[]): number {
  if (yi.length !== components.length) throw new Error("yi and components must have same length");
  return yi.reduce((sum, y, i) => sum + y * getProps(components[i]).HHV, 0);
}

/**
 * Mixture lower heating value (LHV), mole-fraction weighted.
 *
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          LHV (BTU/scf)
 */
export function hvLHV(yi: number[], components: string[]): number {
  if (yi.length !== components.length) throw new Error("yi and components must have same length");
  return yi.reduce((sum, y, i) => sum + y * getProps(components[i]).LHV, 0);
}

/**
 * Wobbe Index — a measure of interchangeability for combustion equipment.
 *
 * WI = HHV / sqrt(SG)
 *
 * @param hhv_BTUscf Higher heating value (BTU/scf)
 * @param sg         Specific gravity
 * @returns          Wobbe Index (BTU/scf)
 */
export function hvWobbeIndex(hhv_BTUscf: number, sg: number): number {
  if (sg <= 0) throw new Error("Specific gravity must be positive");
  return hhv_BTUscf / Math.sqrt(sg);
}

/**
 * Mixture HHV in MJ/Nm³ (SI units).
 *
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          HHV (MJ/Nm³)
 */
export function hvHHV_MJNm3(yi: number[], components: string[]): number {
  return hvHHV(yi, components) * BTU_SCF_TO_MJ_NM3;
}

/**
 * Mixture LHV in MJ/Nm³ (SI units).
 *
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          LHV (MJ/Nm³)
 */
export function hvLHV_MJNm3(yi: number[], components: string[]): number {
  return hvLHV(yi, components) * BTU_SCF_TO_MJ_NM3;
}

/**
 * Complete heating value analysis for a gas mixture.
 *
 * @param yi         Mole fractions
 * @param components Component symbols
 * @returns          Object containing MW, SG, HHV/LHV in both BTU/scf and MJ/Nm³, Wobbe Index
 */
export function hvAnalysis(
  yi: number[],
  components: string[]
): {
  mw:          number;
  sg:          number;
  hhv_BTUscf:  number;
  lhv_BTUscf:  number;
  hhv_MJNm3:   number;
  lhv_MJNm3:   number;
  wobbeIndex:  number;
} {
  const mw         = hvMolecularWeight(yi, components);
  const sg         = mw / AIR_MW;
  const hhv_BTUscf = hvHHV(yi, components);
  const lhv_BTUscf = hvLHV(yi, components);
  return {
    mw,
    sg,
    hhv_BTUscf,
    lhv_BTUscf,
    hhv_MJNm3:  hhv_BTUscf * BTU_SCF_TO_MJ_NM3,
    lhv_MJNm3:  lhv_BTUscf * BTU_SCF_TO_MJ_NM3,
    wobbeIndex: hvWobbeIndex(hhv_BTUscf, sg),
  };
}
