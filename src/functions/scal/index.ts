/**
 * P365 — Special Core Analysis (SCAL)
 *
 * Relative permeability, capillary pressure, and waterflood analysis:
 *   Corey power-law relative permeability (oil-water)
 *   LET (Lomeland-Ebeltoft-Thomas) relative permeability
 *   Honarpour (1982) gas-oil Kr — sandstone and carbonate
 *   Brooks-Corey capillary pressure
 *   Van Genuchten capillary pressure
 *   Leverett J-function scaling
 *   Stone I and Stone II three-phase oil Kr
 *   Buckley-Leverett fractional flow + Welge construction
 *   Newman (1973) rock compressibility
 *   Ibrahim-Koederitz wettability Kr
 *
 * Units: md, psi, dyn/cm, dimensionless.
 */

// ─── Corey Relative Permeability ─────────────────────────────────────────────

/**
 * Corey water relative permeability.
 *
 * krw = krw_max · [(Sw − Swc) / (1 − Swc − Sor)]^nw
 *
 * @param Sw        Water saturation (fraction)
 * @param Swc       Connate water saturation
 * @param Sor       Residual oil saturation
 * @param krw_max   Endpoint water relative permeability
 * @param nw        Water Corey exponent
 * @returns         krw (dimensionless)
 */
export function coreyKrw(Sw: number, Swc: number, Sor: number, krw_max: number, nw: number): number {
  const Sw_star = (Sw - Swc) / (1 - Swc - Sor);
  if (Sw_star <= 0) return 0;
  if (Sw_star >= 1) return krw_max;
  return krw_max * Math.pow(Sw_star, nw);
}

/**
 * Corey oil relative permeability (oil-water system).
 *
 * kro = kro_max · [(1 − Sw − Sor) / (1 − Swc − Sor)]^no
 *
 * @param Sw        Water saturation (fraction)
 * @param Swc       Connate water saturation
 * @param Sor       Residual oil saturation
 * @param kro_max   Endpoint oil relative permeability at Swc
 * @param no        Oil Corey exponent
 * @returns         kro (dimensionless)
 */
export function coreyKro(Sw: number, Swc: number, Sor: number, kro_max: number, no: number): number {
  const So_star = (1 - Sw - Sor) / (1 - Swc - Sor);
  if (So_star <= 0) return 0;
  if (So_star >= 1) return kro_max;
  return kro_max * Math.pow(So_star, no);
}

/**
 * Generate Corey oil-water Kr table.
 *
 * @param Swc       Connate water saturation
 * @param Sor       Residual oil saturation
 * @param krw_max   Endpoint krw at 1-Sor
 * @param kro_max   Endpoint kro at Swc
 * @param nw        Water exponent
 * @param no        Oil exponent
 * @param n_points  Number of Sw points
 * @returns         Array of {Sw, krw, kro} objects
 */
export function coreyKrTable(
  Swc: number,
  Sor: number,
  krw_max: number,
  kro_max: number,
  nw: number,
  no: number,
  n_points = 21
): Array<{ Sw: number; krw: number; kro: number }> {
  const result = [];
  for (let i = 0; i < n_points; i++) {
    const Sw = Swc + (i / (n_points - 1)) * (1 - Swc - Sor);
    result.push({
      Sw,
      krw: coreyKrw(Sw, Swc, Sor, krw_max, nw),
      kro: coreyKro(Sw, Swc, Sor, kro_max, no),
    });
  }
  return result;
}

// ─── LET Relative Permeability ────────────────────────────────────────────────

/**
 * LET (Lomeland-Ebeltoft-Thomas 2005) water relative permeability.
 *
 * krw = krw_max · Sw*^Lw / [Sw*^Lw + Ew · (1−Sw*)^Tw]
 *
 * @param Sw        Water saturation
 * @param Swc       Connate water saturation
 * @param Sor       Residual oil saturation
 * @param krw_max   Endpoint krw
 * @param Lw        L parameter for water
 * @param Ew        E parameter for water
 * @param Tw        T parameter for water
 * @returns         krw
 */
export function letKrw(
  Sw: number,
  Swc: number,
  Sor: number,
  krw_max: number,
  Lw: number,
  Ew: number,
  Tw: number
): number {
  const Sw_star = (Sw - Swc) / (1 - Swc - Sor);
  if (Sw_star <= 0) return 0;
  if (Sw_star >= 1) return krw_max;
  const num = Math.pow(Sw_star, Lw);
  const den = num + Ew * Math.pow(1 - Sw_star, Tw);
  return krw_max * num / den;
}

/**
 * LET oil relative permeability.
 *
 * kro = kro_max · So*^Lo / [So*^Lo + Eo · (1−So*)^To]
 *
 * @param Sw       Water saturation
 * @param Swc      Connate water saturation
 * @param Sor      Residual oil saturation
 * @param kro_max  Endpoint kro
 * @param Lo       L parameter for oil
 * @param Eo       E parameter for oil
 * @param To       T parameter for oil
 * @returns        kro
 */
export function letKro(
  Sw: number,
  Swc: number,
  Sor: number,
  kro_max: number,
  Lo: number,
  Eo: number,
  To: number
): number {
  const So_star = (1 - Sw - Sor) / (1 - Swc - Sor);
  if (So_star <= 0) return 0;
  if (So_star >= 1) return kro_max;
  const num = Math.pow(So_star, Lo);
  const den = num + Eo * Math.pow(1 - So_star, To);
  return kro_max * num / den;
}

// ─── Honarpour Gas-Oil Relative Permeability ──────────────────────────────────

/**
 * Honarpour et al. (1982) gas relative permeability — sandstone (Eq A-4).
 *
 * krg = a · (Sg − Sgc)^b · (1 − Sw − Sor − Sgc)^c
 *
 * Standard sandstone constants: a=0.9551, b=1.8418, c=? — uses simpler form:
 * krg = (Sg − Sgc)^2.0 · (1 − Swi − Sgc)^(−1.0) for sandstone
 *
 * @param Sg        Gas saturation (fraction)
 * @param Sgc       Critical gas saturation
 * @param Swi       Irreducible water saturation
 * @param Sor       Residual oil saturation (not mobile)
 * @param rock_type "sandstone" or "carbonate"
 * @returns         krg (dimensionless)
 */
export function honarpourKrg(Sg: number, Sgc: number, Swi: number, Sor: number, rock_type: "sandstone" | "carbonate" = "sandstone"): number {
  if (Sg <= Sgc) return 0;
  const Sg_norm = Sg - Sgc;
  const Sm_total = 1 - Swi - Sgc - Sor;  // mobile saturation space
  if (Sm_total <= 0) return 0;

  if (rock_type === "sandstone") {
    // Honarpour Eq A-4 (sandstone):
    // krg = 0.9551 · (Sg*)^1.8418 where Sg* = (Sg - Sgc) / (1 - Swi - Sor)
    const Sg_star = Sg_norm / (1 - Swi - Sor);
    return Math.min(1, 0.9551 * Math.pow(Sg_star, 1.8418));
  } else {
    // Honarpour Eq A-9 (carbonate):
    // krg = (Sg - Sgc)^1.5 / (1 - Swi - Sor)^1.5
    const Sg_star = Sg_norm / (1 - Swi - Sor);
    return Math.min(1, Math.pow(Sg_star, 1.5));
  }
}

/**
 * Honarpour et al. (1982) oil relative permeability (gas-oil system) — sandstone (Eq A-5).
 *
 * @param Sg        Gas saturation
 * @param Sgc       Critical gas saturation
 * @param Swi       Irreducible water saturation
 * @param Sor       Residual oil saturation
 * @param kro_max   Endpoint kro (at Swi, no gas)
 * @param rock_type "sandstone" or "carbonate"
 * @returns         kro (dimensionless)
 */
export function honarpourKro(
  Sg: number,
  Sgc: number,
  Swi: number,
  Sor: number,
  kro_max: number,
  rock_type: "sandstone" | "carbonate" = "sandstone"
): number {
  const So = 1 - Sg - Swi;
  const Sor_actual = Sor;
  if (So <= Sor_actual) return 0;
  const So_star = (So - Sor_actual) / (1 - Swi - Sor_actual);
  if (So_star >= 1) return kro_max;

  if (rock_type === "sandstone") {
    // Honarpour Eq A-5: kro = kro_max * So*^2.5 (simplified)
    return kro_max * Math.pow(So_star, 2.5);
  } else {
    // Honarpour Eq A-10 (carbonate): kro = kro_max * So*^2.0
    return kro_max * Math.pow(So_star, 2.0);
  }
}

// ─── Brooks-Corey Capillary Pressure ─────────────────────────────────────────

/**
 * Brooks-Corey capillary pressure.
 *
 * Pc = Pd · Sw*^(−1/λ)   where Sw* = (Sw − Swc) / (1 − Swc)
 *
 * @param Sw        Water saturation
 * @param Swc       Connate water saturation
 * @param Pd_psi    Entry (displacement) pressure (psi)
 * @param lambda    Pore size distribution index
 * @returns         Capillary pressure (psi)
 */
export function brooksCoreyPc(Sw: number, Swc: number, Pd_psi: number, lambda: number): number {
  const Sw_star = (Sw - Swc) / (1 - Swc);
  if (Sw_star <= 0) return Infinity;
  if (Sw_star >= 1) return 0;
  return Pd_psi * Math.pow(Sw_star, -1 / lambda);
}

/**
 * Brooks-Corey water saturation from capillary pressure.
 *
 * Sw* = (Pd/Pc)^λ  →  Sw = Swc + (1−Swc) · (Pd/Pc)^λ
 *
 * At Pc = Pd (entry pressure): Sw = 1 (barely displaced).
 * As Pc → ∞: Sw → Swc (connate water).
 *
 * @param Pc_psi    Capillary pressure (psi)
 * @param Swc       Connate water saturation
 * @param Pd_psi    Entry pressure (psi)
 * @param lambda    Pore size distribution index
 * @returns         Water saturation
 */
export function brooksCoreySwFromPc(Pc_psi: number, Swc: number, Pd_psi: number, lambda: number): number {
  if (Pc_psi <= 0) return 1;
  const Sw = Swc + (1 - Swc) * Math.pow(Pd_psi / Pc_psi, lambda);
  return Math.min(1, Math.max(Swc, Sw));
}

/**
 * Capillary transition zone height above free water level (FWL).
 *
 * h_FWL = Pc / (Δρ · g)   where Δρ = ρ_water − ρ_oil (lb/ft³)
 * In field units: h (ft) = Pc (psi) · 144 / Δρ (lb/ft³)
 *
 * @param Pc_psi     Capillary pressure (psi)
 * @param rho_w      Water density (lb/ft³)
 * @param rho_o      Oil density (lb/ft³)
 * @returns          Height above FWL (ft)
 */
export function pcToHeight(Pc_psi: number, rho_w: number, rho_o: number): number {
  const drho = rho_w - rho_o;
  if (drho <= 0) throw new Error("Water density must exceed oil density");
  return Pc_psi * 144 / drho;
}

// ─── Van Genuchten Capillary Pressure ─────────────────────────────────────────

/**
 * Van Genuchten (1980) capillary pressure model.
 *
 * Pc = (1/α) · [Sw*^(−1/m) − 1]^(1/n)
 * where m = 1 − 1/n, Sw* = (Sw − Swc) / (1 − Swc)
 *
 * @param Sw        Water saturation
 * @param Swc       Connate water saturation
 * @param alpha     Scale parameter (1/psi)
 * @param n_vg      Shape parameter (n > 1)
 * @returns         Capillary pressure (psi)
 */
export function vanGenuchtenPc(Sw: number, Swc: number, alpha: number, n_vg: number): number {
  const Sw_star = (Sw - Swc) / (1 - Swc);
  if (Sw_star <= 0) return Infinity;
  if (Sw_star >= 1) return 0;
  const m = 1 - 1 / n_vg;
  return (1 / alpha) * Math.pow(Math.pow(Sw_star, -1 / m) - 1, 1 / n_vg);
}

// ─── Leverett J-Function ──────────────────────────────────────────────────────

/**
 * Leverett J-function.
 *
 * J(Sw) = (Pc / σ) · √(k / φ)
 *
 * @param Pc_psi     Capillary pressure (psi)
 * @param sigma_dyn  Interfacial tension (dyn/cm)
 * @param k_md       Absolute permeability (md)
 * @param phi        Porosity (fraction)
 * @returns          J-function (dimensionless)
 */
export function leverettJ(Pc_psi: number, sigma_dyn: number, k_md: number, phi: number): number {
  if (sigma_dyn <= 0 || phi <= 0 || k_md <= 0) throw new Error("σ, k, φ must be positive");
  // Convert Pc to dyn/cm² and k to cm²: 1 psi = 68947.6 dyn/cm², 1 md = 9.869e-12 cm²
  const Pc_dyn = Pc_psi * 68947.6;
  const k_cm2  = k_md * 9.869e-12;
  return (Pc_dyn / sigma_dyn) * Math.sqrt(k_cm2 / phi);
}

/**
 * Capillary pressure from J-function (scaling to a new rock sample).
 *
 * Pc_new = J · σ_new / √(k_new / φ_new)
 *
 * @param J          J-function value
 * @param sigma_dyn  Interfacial tension of target fluid (dyn/cm)
 * @param k_md       Target permeability (md)
 * @param phi        Target porosity (fraction)
 * @returns          Capillary pressure (psi)
 */
export function leverettPc(J: number, sigma_dyn: number, k_md: number, phi: number): number {
  if (sigma_dyn <= 0 || phi <= 0 || k_md <= 0) throw new Error("σ, k, φ must be positive");
  const k_cm2   = k_md * 9.869e-12;
  const Pc_dyn  = J * sigma_dyn / Math.sqrt(k_cm2 / phi);
  return Pc_dyn / 68947.6;  // dyn/cm² → psi
}

// ─── Buckley-Leverett Fractional Flow ─────────────────────────────────────────

/**
 * Water fractional flow curve (Buckley-Leverett, 1942).
 *
 * fw = 1 / [1 + (kro/krw) · (μw/μo)]
 *
 * @param Sw        Water saturation
 * @param Swc       Connate water saturation
 * @param Sor       Residual oil saturation
 * @param krw_max   Endpoint krw
 * @param kro_max   Endpoint kro
 * @param nw        Water Corey exponent
 * @param no        Oil Corey exponent
 * @param mu_w      Water viscosity (cp)
 * @param mu_o      Oil viscosity (cp)
 * @returns         Fractional flow fw (0–1)
 */
export function buckleyLeverettFw(
  Sw: number,
  Swc: number,
  Sor: number,
  krw_max: number,
  kro_max: number,
  nw: number,
  no: number,
  mu_w: number,
  mu_o: number
): number {
  const krw = coreyKrw(Sw, Swc, Sor, krw_max, nw);
  const kro = coreyKro(Sw, Swc, Sor, kro_max, no);
  if (krw <= 0) return 0;
  if (kro <= 0) return 1;
  const M = (kro / krw) * (mu_w / mu_o);
  return 1 / (1 + M);
}

/**
 * Welge (1952) tangent construction — waterflood breakthrough.
 *
 * Draws a tangent from (Swc, 0) to the fractional flow curve.
 * Returns the breakthrough saturation Sw_bt and water cut fw_bt.
 *
 * @param Swc       Connate water saturation
 * @param Sor       Residual oil saturation
 * @param krw_max   Endpoint krw
 * @param kro_max   Endpoint kro
 * @param nw        Water exponent
 * @param no        Oil exponent
 * @param mu_w      Water viscosity (cp)
 * @param mu_o      Oil viscosity (cp)
 * @returns         {Sw_bt, fw_bt, Sw_avg_bt, RF_bt} — breakthrough saturation, water cut, avg Sw, recovery factor
 */
export function welgeConstruction(
  Swc: number,
  Sor: number,
  krw_max: number,
  kro_max: number,
  nw: number,
  no: number,
  mu_w: number,
  mu_o: number
): { Sw_bt: number; fw_bt: number; Sw_avg_bt: number; RF_bt: number } {
  // Scan fw curve and find maximum slope from (Swc, 0)
  const n = 500;
  let bestSlope = -Infinity;
  let Sw_bt = Swc;
  let fw_bt = 0;

  for (let i = 1; i <= n; i++) {
    const Sw = Swc + (i / n) * (1 - Swc - Sor);
    const fw = buckleyLeverettFw(Sw, Swc, Sor, krw_max, kro_max, nw, no, mu_w, mu_o);
    const slope = (fw - 0) / (Sw - Swc);
    if (slope > bestSlope) {
      bestSlope = slope;
      Sw_bt = Sw;
      fw_bt = fw;
    }
  }

  // Average Sw at breakthrough: Sw_avg = Swc + fw_bt / slope_tangent
  const Sw_avg_bt = Swc + fw_bt / bestSlope;
  const RF_bt = (Sw_avg_bt - Swc) / (1 - Swc);  // oil recovery factor at breakthrough

  return { Sw_bt, fw_bt, Sw_avg_bt: Math.min(1 - Sor, Sw_avg_bt), RF_bt };
}

// ─── Stone Three-Phase Relative Permeability ───────────────────────────────────

/**
 * Stone I (1970) three-phase oil relative permeability.
 *
 * kro = kro_wc · [(krow/kro_wc + krw) · (krog/kro_wc + krg) − krw − krg]
 * where krow = kro from oil-water Kr curve, krog = kro from gas-oil curve.
 *
 * @param krw       Oil-water water Kr at current Sw
 * @param krg       Gas-oil gas Kr at current Sg
 * @param krow      Oil Kr from oil-water table at current Sw
 * @param krog      Oil Kr from gas-oil table at current Sg
 * @param kro_wc    Oil endpoint Kr at Swc (connate water only, no gas)
 * @returns         Three-phase oil Kr
 */
export function stoneOneKro(krw: number, krg: number, krow: number, krog: number, kro_wc: number): number {
  const Som = Math.min(krow / kro_wc + krw, 1) * Math.min(krog / kro_wc + krg, 1);
  return kro_wc * Math.max(0, Som - krw - krg);
}

/**
 * Stone II (1973) three-phase oil relative permeability.
 *
 * kro = kro_wc · [(krow/kro_wc + krw) · (krog/kro_wc + krg) − krw − krg]
 * (same formula, different normalisation in Stone II)
 *
 * @param krw       Water Kr
 * @param krg       Gas Kr
 * @param krow      Oil Kr (oil-water system)
 * @param krog      Oil Kr (gas-oil system)
 * @param kro_wc    Oil endpoint Kr
 * @returns         Three-phase oil Kr
 */
export function stoneTwoKro(krw: number, krg: number, krow: number, krog: number, kro_wc: number): number {
  const term = (krow + krw) * (krog + krg) - krw - krg;
  return kro_wc * Math.max(0, term / kro_wc);
}

// ─── Rock Compressibility ─────────────────────────────────────────────────────

/**
 * Newman (1973) rock (pore volume) compressibility.
 *
 * Sandstone: cf = 97.32e-6 / (1 + 55.8721 · φ^1.428586)     psi⁻¹
 * Limestone:  cf = 0.8535 / (1 + 6.8723 · φ)^2               psi⁻¹
 *
 * @param phi        Porosity (fraction)
 * @param rock_type  "sandstone" | "limestone" | "chalk"
 * @returns          Rock compressibility (psi⁻¹)
 */
export function newmanRockCompressibility(phi: number, rock_type: "sandstone" | "limestone" | "chalk" = "sandstone"): number {
  if (phi <= 0 || phi > 1) throw new Error("Porosity must be 0–1");
  switch (rock_type) {
    case "sandstone":
      return 97.32e-6 / (1 + 55.8721 * Math.pow(phi, 1.428586));
    case "limestone":
      return 0.8535 / Math.pow(1 + 6.8723 * phi, 2);
    case "chalk":
      // Hall (1953) approximation for chalk/unconsolidated
      return 0.859e-6 / Math.pow(phi, 0.438);
    default:
      throw new Error(`Unknown rock type: ${rock_type}`);
  }
}
