/**
 * P365 — Pipe Sizing Calculator
 *
 * Natural gas pipe sizing using the Weymouth equation.
 * Supports bare steel, coated steel, and polyethylene (PE) pipe.
 *
 * Reference: Weymouth equation (standard for natural gas distribution)
 * Pipe sizes: ASME B36.10M (Sch 40 steel), ASTM D2513 SDR-11 (polyethylene)
 *
 * Color convention (for spreadsheet use):
 *   Blue cells  = inputs
 *   Green cells = results
 *
 * Units:
 *   Pressure: psig or psia (as noted per function)
 *   Flow:     SCFH (standard cubic feet per hour)
 *   Length:   feet
 *   Diameter: inches
 *   HHV:      BTU/scf (typically ~1020 for natural gas)
 */

// ─── Pipe material data ────────────────────────────────────────────────────────

export type PipeMaterial = "bare_steel" | "coated_steel" | "PE";

/** Pipe roughness in feet by material (for Weymouth / Darcy-Weisbach) */
export const PIPE_ROUGHNESS_FT: Record<PipeMaterial, number> = {
  bare_steel:   0.000150, // ft
  coated_steel: 0.000100, // ft
  PE:           0.000005, // ft (polyethylene)
};

// ─── Standard pipe sizes ──────────────────────────────────────────────────────

/** Nominal Pipe Size (NPS) to inside diameter in inches — Schedule 40 Steel (ASME B36.10M) */
export const STEEL_SCH40_ID: Record<string, number> = {
  "1/2":  0.622,
  "3/4":  0.824,
  "1":    1.049,
  "1-1/4": 1.380,
  "1-1/2": 1.610,
  "2":    2.067,
  "2-1/2": 2.469,
  "3":    3.068,
  "4":    4.026,
  "6":    6.065,
  "8":    7.981,
  "10":   10.020,
  "12":   11.938,
};

/** Nominal Pipe Size (NPS) to inside diameter in inches — SDR-11 Polyethylene (ASTM D2513) */
export const PE_SDR11_ID: Record<string, number> = {
  "1/2":  0.660,
  "3/4":  0.860,
  "1":    1.077,
  "1-1/4": 1.328,
  "1-1/2": 1.554,
  "2":    1.943,
  "2-1/2": 2.405,
  "3":    2.864,
  "4":    3.682,
  "6":    5.395,
};

/** Get inside diameter from NPS and material */
export function getInsideDiameter(nps: string, material: PipeMaterial): number {
  if (material === "PE") {
    const id = PE_SDR11_ID[nps];
    if (id === undefined) throw new Error(`NPS "${nps}" not found for PE SDR-11`);
    return id;
  }
  const id = STEEL_SCH40_ID[nps];
  if (id === undefined) throw new Error(`NPS "${nps}" not found for Sch 40 steel`);
  return id;
}

/**
 * Recommend the next standard pipe size (steel Sch 40 or PE SDR-11) that meets
 * or exceeds the required inside diameter.
 *
 * @param requiredID_in Minimum required inside diameter (inches)
 * @param material Pipe material
 * @returns { nps, id_in } recommended NPS and actual ID
 */
export function recommendPipeSize(
  requiredID_in: number,
  material: PipeMaterial
): { nps: string; id_in: number } {
  const table = material === "PE" ? PE_SDR11_ID : STEEL_SCH40_ID;
  const entries = Object.entries(table).sort((a, b) => a[1] - b[1]);
  for (const [nps, id] of entries) {
    if (id >= requiredID_in) return { nps, id_in: id };
  }
  // Return largest if none found
  const last = entries[entries.length - 1];
  return { nps: last[0], id_in: last[1] };
}

// ─── Weymouth equation ────────────────────────────────────────────────────────

/**
 * Weymouth equation — gas flow rate (SCFH) given pipe geometry and pressures.
 *
 * Q = 433.45 * (T_sc / P_sc) * [ (P1² - P2²) / (SG * T_avg * L * f_w) ]^0.5 * D^(8/3)
 *
 * Where f_w (Weymouth friction factor) = 0.032 / D^(1/3) (D in inches)
 *
 * Simplified Weymouth: Q = 18.062 * (T_sc/P_sc) * [(P1²-P2²)/(SG*T_avg*L)]^0.5 * D^(8/3)
 *
 * @param P1_psia   Inlet pressure (psia)
 * @param P2_psia   Outlet pressure (psia)
 * @param L_ft      Pipe length (feet)
 * @param D_in      Inside diameter (inches)
 * @param SG        Gas specific gravity (air = 1.0)
 * @param T_avg_F   Average gas temperature (°F)
 * @param Psc       Standard pressure (psia, default 14.73)
 * @param Tsc_F     Standard temperature (°F, default 60)
 * @returns Q (SCFH — standard cubic feet per hour)
 */
export function weymouthFlowSCFH(
  P1_psia: number,
  P2_psia: number,
  L_ft: number,
  D_in: number,
  SG: number,
  T_avg_F: number,
  Psc = 14.73,
  Tsc_F = 60
): number {
  const T_avg_R = T_avg_F + 459.67;
  const Tsc_R   = Tsc_F + 459.67;

  // Weymouth coefficient (constant form)
  const K = 18.062 * (Tsc_R / Psc);
  const pressureTerm = (P1_psia * P1_psia - P2_psia * P2_psia);
  if (pressureTerm <= 0) throw new Error("Inlet pressure must be greater than outlet pressure");

  return K * Math.sqrt(pressureTerm / (SG * T_avg_R * L_ft)) * Math.pow(D_in, 8 / 3);
}

/**
 * Weymouth equation — outlet pressure given flow rate.
 *
 * Rearranged: P2² = P1² - (Q / K / D^(8/3))² * SG * T_avg * L
 *
 * @param P1_psia   Inlet pressure (psia)
 * @param Q_SCFH    Flow rate (SCFH)
 * @param L_ft      Length (feet)
 * @param D_in      Inside diameter (inches)
 * @param SG        Gas specific gravity
 * @param T_avg_F   Average gas temperature (°F)
 * @param Psc       Standard pressure (psia)
 * @param Tsc_F     Standard temperature (°F)
 * @returns P2 (psia)
 */
export function weymouthOutletPressure(
  P1_psia: number,
  Q_SCFH: number,
  L_ft: number,
  D_in: number,
  SG: number,
  T_avg_F: number,
  Psc = 14.73,
  Tsc_F = 60
): number {
  const T_avg_R = T_avg_F + 459.67;
  const Tsc_R   = Tsc_F + 459.67;
  const K = 18.062 * (Tsc_R / Psc);
  const QoverK = Q_SCFH / (K * Math.pow(D_in, 8 / 3));
  const P2sq = P1_psia * P1_psia - QoverK * QoverK * SG * T_avg_R * L_ft;
  if (P2sq < 0) throw new Error("No valid outlet pressure — reduce flow rate or increase pipe size");
  return Math.sqrt(P2sq);
}

/**
 * Weymouth equation — maximum pipe length given pressures and flow.
 *
 * @param P1_psia   Inlet pressure (psia)
 * @param P2_psia   Minimum outlet pressure (psia)
 * @param Q_SCFH    Flow rate (SCFH)
 * @param D_in      Inside diameter (inches)
 * @param SG        Gas specific gravity
 * @param T_avg_F   Average gas temperature (°F)
 * @param Psc       Standard pressure (psia)
 * @param Tsc_F     Standard temperature (°F)
 * @returns Maximum pipe length (feet)
 */
export function weymouthMaxLength(
  P1_psia: number,
  P2_psia: number,
  Q_SCFH: number,
  D_in: number,
  SG: number,
  T_avg_F: number,
  Psc = 14.73,
  Tsc_F = 60
): number {
  const T_avg_R = T_avg_F + 459.67;
  const Tsc_R   = Tsc_F + 459.67;
  const K = 18.062 * (Tsc_R / Psc);
  const QoverK = Q_SCFH / (K * Math.pow(D_in, 8 / 3));
  return (P1_psia * P1_psia - P2_psia * P2_psia) / (QoverK * QoverK * SG * T_avg_R);
}

// ─── BTUh conversions ─────────────────────────────────────────────────────────

/** Convert SCFH flow to BTU/hr given Higher Heating Value */
export function scfhToBtuh(Q_SCFH: number, HHV_BTUscf: number): number {
  return Q_SCFH * HHV_BTUscf;
}

/** Convert BTU/hr to SCFH */
export function btuhToScfh(BTUh: number, HHV_BTUscf: number): number {
  return BTUh / HHV_BTUscf;
}

// ─── Gas velocity check ────────────────────────────────────────────────────────

/**
 * Calculate gas velocity in a pipe.
 *
 * @param Q_SCFH   Flow rate (SCFH) at standard conditions
 * @param D_in     Inside diameter (inches)
 * @param P_psia   Operating pressure (psia)
 * @param T_F      Gas temperature (°F)
 * @param Z        Z-factor (default 1.0)
 * @param Psc      Standard pressure (psia)
 * @param Tsc_F    Standard temperature (°F)
 * @returns Gas velocity (ft/s)
 */
export function gasVelocity(
  Q_SCFH: number,
  D_in: number,
  P_psia: number,
  T_F: number,
  Z = 1.0,
  Psc = 14.73,
  Tsc_F = 60
): number {
  const T_R   = T_F + 459.67;
  const Tsc_R = Tsc_F + 459.67;
  const D_ft  = D_in / 12;
  const area  = Math.PI * D_ft * D_ft / 4; // ft²

  // Convert SCFH to actual ft³/hr at operating conditions
  const Q_actual_fthr = Q_SCFH * (Psc / P_psia) * (T_R / Tsc_R) * Z;
  const Q_actual_ftps = Q_actual_fthr / 3600; // ft³/s

  return Q_actual_ftps / area; // ft/s
}

// ─── Forward calculation: Flow → Pipe sizing ──────────────────────────────────

export interface PipeForwardResult {
  Q_SCFH: number;        // Flow rate (SCFH)
  Q_BTUh: number;        // Flow in BTU/hr
  Q_MBTUh: number;       // Flow in MBTU/hr (1000 BTU/hr)
  Q_MMBTUh: number;      // Flow in MMBTU/hr
  maxLength_ft: number;  // Maximum pipe length (ft)
  pressureDrop_psi: number; // Pressure drop (psi)
  velocity_fps: number;  // Gas velocity (ft/s)
  velocityOK: boolean;   // Velocity < 40 ft/s
}

/**
 * Forward calculation: Given inlet/outlet pressures, flow rate, pipe size, and material,
 * compute maximum pipe length and BTUh capacity.
 *
 * @param P1_psig       Inlet pressure (psig)
 * @param P2_psig       Minimum outlet pressure (psig)
 * @param Q_SCFH        Flow rate (SCFH)
 * @param D_in          Inside diameter (inches)
 * @param SG            Gas specific gravity (default 0.6 for natural gas)
 * @param T_avg_F       Average gas temperature (°F)
 * @param HHV_BTUscf    Higher Heating Value (BTU/scf, default 1020)
 * @param Patm          Atmospheric pressure (psia, default 14.73)
 */
export function pipeForward(
  P1_psig: number,
  P2_psig: number,
  Q_SCFH: number,
  D_in: number,
  SG = 0.60,
  T_avg_F = 60,
  HHV_BTUscf = 1020,
  Patm = 14.73
): PipeForwardResult {
  const P1_psia = P1_psig + Patm;
  const P2_psia = P2_psig + Patm;

  const maxLength_ft = weymouthMaxLength(P1_psia, P2_psia, Q_SCFH, D_in, SG, T_avg_F);
  const pressureDrop = P1_psig - P2_psig;
  const velocity = gasVelocity(Q_SCFH, D_in, P1_psia, T_avg_F);
  const Q_BTUh = scfhToBtuh(Q_SCFH, HHV_BTUscf);

  return {
    Q_SCFH,
    Q_BTUh,
    Q_MBTUh: Q_BTUh / 1000,
    Q_MMBTUh: Q_BTUh / 1e6,
    maxLength_ft,
    pressureDrop_psi: pressureDrop,
    velocity_fps: velocity,
    velocityOK: velocity < 40,
  };
}

// ─── Reverse calculation: BTUh → Diameter ─────────────────────────────────────

export interface PipeReverseResult {
  requiredID_in: number;        // Minimum required ID (inches)
  steel_nps: string;            // Recommended Sch 40 steel NPS
  steel_id_in: number;          // Recommended steel ID (inches)
  pe_nps: string;               // Recommended PE SDR-11 NPS
  pe_id_in: number;             // Recommended PE ID (inches)
  Q_SCFH: number;               // Flow rate (SCFH)
  velocity_fps_steel: number;   // Velocity in steel pipe (ft/s)
  velocity_fps_pe: number;      // Velocity in PE pipe (ft/s)
  velocityOK_steel: boolean;
  velocityOK_pe: boolean;
}

/**
 * Reverse calculation: Given required BTUh load, pressures, and pipe length,
 * solve for minimum required inside diameter and recommend standard pipe size.
 *
 * @param BTUh_required Required load (BTU/hr)
 * @param P1_psig       Inlet pressure (psig)
 * @param P2_min_psig   Minimum allowable outlet pressure (psig)
 * @param L_ft          Pipe length (feet)
 * @param SG            Gas specific gravity
 * @param T_avg_F       Average gas temperature (°F)
 * @param HHV_BTUscf    Higher Heating Value (BTU/scf)
 * @param diversityFactor Load diversity factor (0–1, default 1.0)
 * @param Patm          Atmospheric pressure (psia)
 */
export function pipeReverse(
  BTUh_required: number,
  P1_psig: number,
  P2_min_psig: number,
  L_ft: number,
  SG = 0.60,
  T_avg_F = 60,
  HHV_BTUscf = 1020,
  diversityFactor = 1.0,
  Patm = 14.73
): PipeReverseResult {
  const P1_psia = P1_psig + Patm;
  const P2_psia = P2_min_psig + Patm;
  const Q_SCFH = btuhToScfh(BTUh_required * diversityFactor, HHV_BTUscf);

  // Solve Weymouth for required D:
  // Q = K * sqrt( (P1²-P2²) / (SG * T * L) ) * D^(8/3)
  // D^(8/3) = Q / (K * sqrt( (P1²-P2²) / (SG * T * L) ))
  const T_avg_R = T_avg_F + 459.67;
  const K = 18.062 * (519.67 / 14.73); // at standard conditions (60°F, 14.73 psia)
  const sqrtTerm = Math.sqrt((P1_psia * P1_psia - P2_psia * P2_psia) / (SG * T_avg_R * L_ft));
  if (sqrtTerm <= 0) throw new Error("Invalid pressure conditions");

  const D83 = Q_SCFH / (K * sqrtTerm);
  const requiredID_in = Math.pow(D83, 3 / 8);

  const steel = recommendPipeSize(requiredID_in, "bare_steel");
  const pe    = recommendPipeSize(requiredID_in, "PE");

  const velSteel = gasVelocity(Q_SCFH, steel.id_in, P1_psia, T_avg_F);
  const velPE    = gasVelocity(Q_SCFH, pe.id_in, P1_psia, T_avg_F);

  return {
    requiredID_in,
    steel_nps: steel.nps,
    steel_id_in: steel.id_in,
    pe_nps: pe.nps,
    pe_id_in: pe.id_in,
    Q_SCFH,
    velocity_fps_steel: velSteel,
    velocity_fps_pe: velPE,
    velocityOK_steel: velSteel < 40,
    velocityOK_pe: velPE < 40,
  };
}

// ─── Equivalent Length — Fittings ─────────────────────────────────────────────

/**
 * Fitting equivalent lengths (feet) by NPS for natural gas systems.
 * Based on NFPA 54 / AGA values.
 * Index: [NPS_key] → { fitting_type → EL_ft }
 *
 * Fitting types:
 *  "elbow_90", "elbow_45", "tee_run", "tee_branch",
 *  "gate_valve", "globe_valve", "ball_valve", "check_valve",
 *  "reducer", "coupling", "meter_run"
 */
export const FITTING_EL: Record<string, Record<string, number>> = {
  "1/2":   { elbow_90: 1.5,  elbow_45: 0.8,  tee_run: 0.5,  tee_branch: 4.0,  gate_valve: 0.4,  globe_valve: 21,  ball_valve: 0.4,  check_valve: 5.0,  reducer: 0.8,  coupling: 0.3,  meter_run: 3.0  },
  "3/4":   { elbow_90: 2.0,  elbow_45: 1.0,  tee_run: 0.7,  tee_branch: 5.0,  gate_valve: 0.5,  globe_valve: 29,  ball_valve: 0.5,  check_valve: 6.5,  reducer: 1.0,  coupling: 0.4,  meter_run: 4.0  },
  "1":     { elbow_90: 2.5,  elbow_45: 1.3,  tee_run: 0.9,  tee_branch: 6.5,  gate_valve: 0.6,  globe_valve: 37,  ball_valve: 0.6,  check_valve: 8.5,  reducer: 1.3,  coupling: 0.5,  meter_run: 5.5  },
  "1-1/4": { elbow_90: 3.5,  elbow_45: 1.7,  tee_run: 1.1,  tee_branch: 8.5,  gate_valve: 0.8,  globe_valve: 47,  ball_valve: 0.8,  check_valve: 11,   reducer: 1.7,  coupling: 0.7,  meter_run: 7.0  },
  "1-1/2": { elbow_90: 4.0,  elbow_45: 2.0,  tee_run: 1.3,  tee_branch: 10,   gate_valve: 0.9,  globe_valve: 56,  ball_valve: 0.9,  check_valve: 13,   reducer: 2.0,  coupling: 0.8,  meter_run: 8.5  },
  "2":     { elbow_90: 5.5,  elbow_45: 2.7,  tee_run: 1.8,  tee_branch: 13,   gate_valve: 1.3,  globe_valve: 75,  ball_valve: 1.3,  check_valve: 17,   reducer: 2.7,  coupling: 1.1,  meter_run: 11   },
  "2-1/2": { elbow_90: 6.5,  elbow_45: 3.3,  tee_run: 2.2,  tee_branch: 16,   gate_valve: 1.5,  globe_valve: 90,  ball_valve: 1.5,  check_valve: 21,   reducer: 3.3,  coupling: 1.3,  meter_run: 14   },
  "3":     { elbow_90: 8.0,  elbow_45: 4.0,  tee_run: 2.7,  tee_branch: 20,   gate_valve: 1.9,  globe_valve: 112, ball_valve: 1.9,  check_valve: 25,   reducer: 4.0,  coupling: 1.6,  meter_run: 17   },
  "4":     { elbow_90: 11,   elbow_45: 5.5,  tee_run: 3.5,  tee_branch: 26,   gate_valve: 2.5,  globe_valve: 148, ball_valve: 2.5,  check_valve: 34,   reducer: 5.5,  coupling: 2.2,  meter_run: 22   },
  "6":     { elbow_90: 16,   elbow_45: 8.0,  tee_run: 5.2,  tee_branch: 38,   gate_valve: 3.7,  globe_valve: 220, ball_valve: 3.7,  check_valve: 50,   reducer: 8.0,  coupling: 3.2,  meter_run: 34   },
};

export interface FittingELResult {
  fittingTotals: Record<string, number>; // fitting_type → total EL (ft)
  totalFittingEL_ft: number;             // Sum of all fitting EL
  actualLength_ft: number;
  totalEffectiveLength_ft: number;       // actual + fitting EL
  fittingPct: number;                    // % added by fittings
}

/**
 * Calculate equivalent lengths for a set of fittings.
 *
 * @param nps NPS string (e.g. "2", "1-1/2")
 * @param quantities Record of fitting_type → quantity
 * @param actualLength_ft Actual pipe run length (feet)
 */
export function calcFittingEL(
  nps: string,
  quantities: Record<string, number>,
  actualLength_ft: number
): FittingELResult {
  const elTable = FITTING_EL[nps];
  if (!elTable) throw new Error(`No fitting EL data for NPS ${nps}`);

  const fittingTotals: Record<string, number> = {};
  let totalFittingEL = 0;

  for (const [fitting, qty] of Object.entries(quantities)) {
    const elPerFitting = elTable[fitting] ?? 0;
    const total = elPerFitting * qty;
    fittingTotals[fitting] = total;
    totalFittingEL += total;
  }

  const totalEffectiveLength = actualLength_ft + totalFittingEL;

  return {
    fittingTotals,
    totalFittingEL_ft: totalFittingEL,
    actualLength_ft,
    totalEffectiveLength_ft: totalEffectiveLength,
    fittingPct: actualLength_ft > 0 ? (totalFittingEL / actualLength_ft) * 100 : 0,
  };
}

// ─── Multi-Segment Run ─────────────────────────────────────────────────────────

export interface PipeSegment {
  description: string;
  material: PipeMaterial;
  nps: string;
  actualLength_ft: number;
  fittingEL_ft: number;    // From fitting EL sheet
  Q_SCFH: number;
}

export interface PipeSegmentResult extends PipeSegment {
  id_in: number;
  totalEffectiveLength_ft: number;
  outletPressure_psia: number;
  outletPressure_psig: number;
  Q_BTUh: number;
}

export interface MultiSegmentResult {
  segments: PipeSegmentResult[];
  finalPressure_psia: number;
  finalPressure_psig: number;
  totalPressureDrop_psi: number;
  totalDropPct: number;
  pressureAdequate: boolean; // final > some minimum
  totalBTUh: number;
  totalMMBTUh: number;
}

/**
 * Calculate cascading multi-segment pipe run (up to 15 segments).
 * Outlet pressure of each segment feeds into the inlet of the next.
 *
 * @param inletPressure_psia  System inlet pressure (psia)
 * @param segments            Array of pipe segments (max 15)
 * @param SG                  Gas specific gravity
 * @param T_avg_F             Average gas temperature (°F)
 * @param HHV_BTUscf          Higher Heating Value (BTU/scf)
 * @param minOutletPressure_psia Minimum acceptable final pressure (psia)
 * @param Patm                Atmospheric pressure (psia)
 */
export function calcMultiSegment(
  inletPressure_psia: number,
  segments: PipeSegment[],
  SG = 0.60,
  T_avg_F = 60,
  HHV_BTUscf = 1020,
  minOutletPressure_psia = 14.73,
  Patm = 14.73
): MultiSegmentResult {
  if (segments.length > 15) throw new Error("Maximum 15 segments supported");

  const results: PipeSegmentResult[] = [];
  let currentPressure_psia = inletPressure_psia;
  let totalBTUh = 0;

  for (const seg of segments) {
    const id_in = getInsideDiameter(seg.nps, seg.material);
    const totalEL = seg.actualLength_ft + seg.fittingEL_ft;

    let outletPressure_psia: number;
    try {
      outletPressure_psia = weymouthOutletPressure(
        currentPressure_psia, seg.Q_SCFH, totalEL, id_in, SG, T_avg_F
      );
    } catch {
      outletPressure_psia = minOutletPressure_psia; // clamp on error
    }

    const Q_BTUh = scfhToBtuh(seg.Q_SCFH, HHV_BTUscf);
    totalBTUh += Q_BTUh;

    results.push({
      ...seg,
      id_in,
      totalEffectiveLength_ft: totalEL,
      outletPressure_psia,
      outletPressure_psig: outletPressure_psia - Patm,
      Q_BTUh,
    });

    currentPressure_psia = outletPressure_psia;
  }

  const initialPressure = inletPressure_psia;
  const finalPressure   = currentPressure_psia;
  const totalDrop       = initialPressure - finalPressure;

  return {
    segments: results,
    finalPressure_psia: finalPressure,
    finalPressure_psig: finalPressure - Patm,
    totalPressureDrop_psi: totalDrop,
    totalDropPct: (totalDrop / initialPressure) * 100,
    pressureAdequate: finalPressure >= minOutletPressure_psia,
    totalBTUh,
    totalMMBTUh: totalBTUh / 1e6,
  };
}
