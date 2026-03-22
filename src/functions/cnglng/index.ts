/**
 * P365 — CNG / LNG
 *
 * Compressed Natural Gas (CNG) storage and dispensing calculations,
 * and Liquefied Natural Gas (LNG) property and logistics calculations.
 *
 * Units: field/SI mixed as appropriate (scf, psia, °R, K, m³, kg, MMBtu).
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

const R_GAS_FT3   = 10.7316;  // psia·ft³/(lb-mol·°R)
const MW_AIR      = 28.97;    // lb/lb-mol
const SCF_PER_GGE = 126.67;   // scf per GGE at 3600 psi
const SCF_PER_DGE = 139.0;    // scf per DGE

// ─── CNG Functions ─────────────────────────────────────────────────────────────

/**
 * Real-gas density of compressed natural gas using the ideal-gas law corrected
 * by a compressibility factor Z.
 *
 * ρ = P·MW / (Z·R·T)
 *
 * @param P_psia    Absolute pressure (psia)
 * @param T_R       Absolute temperature (°R)
 * @param SG_gas    Specific gravity of natural gas relative to air (dimensionless)
 * @param Z         Gas compressibility factor (dimensionless)
 * @returns         Gas density (lb/ft³)
 */
export function cngDensity(
  P_psia: number,
  T_R: number,
  SG_gas: number,
  Z: number
): number {
  const MW = SG_gas * MW_AIR;
  const density_lb_ft3 = (P_psia * MW) / (Z * R_GAS_FT3 * T_R);
  return density_lb_ft3;
}

/**
 * Usable gas capacity of a CNG cylinder between working pressure and minimum
 * (residual) pressure, expressed in standard cubic feet.
 *
 * Converts pressure-volume to scf using the ideal-gas law at standard
 * conditions (14.696 psia, 520 °R), corrected for temperature and Z.
 *
 * @param volume_cf             Internal cylinder volume (ft³)
 * @param working_pressure_psia Maximum (working) pressure of cylinder (psia)
 * @param min_pressure_psia     Minimum usable pressure (psia)
 * @param T_R                   Gas temperature inside cylinder (°R)
 * @param SG_gas                Specific gravity of gas relative to air (dimensionless)
 * @param Z                     Gas compressibility factor at cylinder conditions (dimensionless)
 * @returns                     Usable gas capacity (scf)
 */
export function cngCylinderCapacity(
  volume_cf: number,
  working_pressure_psia: number,
  min_pressure_psia: number,
  T_R: number,
  SG_gas: number,
  Z: number
): number {
  const tempRatio = T_R / 520;
  const gas_at_working = (working_pressure_psia * volume_cf) / (Z * 14.696 * tempRatio);
  const gas_at_min     = (min_pressure_psia     * volume_cf) / (Z * 14.696 * tempRatio);
  const usable_scf = gas_at_working - gas_at_min;
  return usable_scf;
}

/**
 * Convert a volume of natural gas (scf) to Gasoline Gallon Equivalents (GGE).
 *
 * 1 GGE = 126.67 scf at 3600 psi.
 *
 * @param scf_natural_gas  Volume of natural gas (scf)
 * @returns                Equivalent volume in GGE
 */
export function cngGGE(scf_natural_gas: number): number {
  return scf_natural_gas / SCF_PER_GGE;
}

/**
 * Convert a volume of natural gas (scf) to Diesel Gallon Equivalents (DGE).
 *
 * 1 DGE = 139.0 scf.
 *
 * @param scf_natural_gas  Volume of natural gas (scf)
 * @returns                Equivalent volume in DGE
 */
export function cngDGE(scf_natural_gas: number): number {
  return scf_natural_gas / SCF_PER_DGE;
}

/**
 * Estimated fill time for a CNG vehicle or storage vessel.
 *
 * fill_time = scf_needed / compressor_capacity_scfm
 *
 * @param scf_needed                 Total gas volume required (scf)
 * @param compressor_capacity_scfm   Compressor output rate (scf/min)
 * @returns                          Fill time (minutes)
 */
export function cngFillTime(
  scf_needed: number,
  compressor_capacity_scfm: number
): number {
  return scf_needed / compressor_capacity_scfm;
}

/**
 * Cascade fill system design — available gas (scf) per bank.
 *
 * For each bank the available scf is computed from its rated pressure,
 * cylinder volume, and number of cylinders in that bank, using a Z = 1
 * approximation at standard conditions (14.696 psia, 520 °R).
 *
 * available_scf_i = (bank_pressure_i − 14.696) × V_cyl × n_banks / (14.696 × T_R/520)
 *
 * @param total_scf_needed        Total gas demand to be satisfied (scf) — informational
 * @param cascade_banks           Number of cylinders per bank
 * @param bank_pressures_psia     Array of maximum pressures for each bank (psia)
 * @param cylinder_volume_cf      Internal volume of a single cylinder (ft³)
 * @param T_R                     Gas temperature (°R)
 * @param SG                      Specific gravity of gas (dimensionless) — reserved for future use
 * @returns                       Array of available scf, one entry per bank
 */
export function cngCascadeDesign(
  total_scf_needed: number,
  cascade_banks: number,
  bank_pressures_psia: number[],
  cylinder_volume_cf: number,
  T_R: number,
  SG: number
): number[] {
  const tempRatio = T_R / 520;
  return bank_pressures_psia.map((P) => {
    const available_scf =
      ((P - 14.696) * cylinder_volume_cf * cascade_banks) / (14.696 * tempRatio);
    return available_scf;
  });
}

// ─── LNG Functions ─────────────────────────────────────────────────────────────

/**
 * Estimate LNG density using a simplified GIIGNL-style correlation.
 *
 * Anchored to pure methane at its normal boiling point (111.6 K, 422.5 kg/m³)
 * and corrected for temperature and average molecular weight deviations.
 *
 * ρ = ρ_ref × [1 + c1·(T − T_ref) + c2·(MW − MW_ref)/MW_ref]
 *
 * @param T_K         Liquid temperature (K)
 * @param MW_kg_kmol  Average molecular weight of the LNG mixture (kg/kmol)
 * @returns           LNG density (kg/m³)
 */
export function lngDensityGIIGNL(T_K: number, MW_kg_kmol: number): number {
  const rho_ref = 422.5;   // kg/m³  — methane at NBP 111.6 K
  const T_ref   = 111.6;   // K
  const MW_ref  = 16.04;   // kg/kmol
  const c1      = -0.003;
  const c2      =  0.8;

  const rho =
    rho_ref *
    (1 +
      c1 * (T_K - T_ref) +
      c2 * ((MW_kg_kmol - MW_ref) / MW_ref));

  return rho;
}

/**
 * Estimate LNG density from molar composition using a linear mixing rule.
 *
 * Supports up to six components (methane, ethane, propane, i-butane,
 * n-butane, i-pentane).  The mixture molecular weight is computed from the
 * supplied mole fractions; density is then derived via an approximate
 * temperature-MW correction anchored to pure methane at NBP.
 *
 * ρ ≈ 422.5 + (MW_mix − 16.04)·5.0 − (T_K − 111.6)·1.5
 *
 * @param y_arr  Mole fractions of each component (must sum to ≤ 1); up to 6 values
 * @param T_K    Liquid temperature (K)
 * @returns      Approximate LNG density (kg/m³)
 */
export function lngDensityFromComposition(y_arr: number[], T_K: number): number {
  const MW_arr = [16.04, 30.07, 44.10, 58.12, 58.12, 72.15];
  const n = Math.min(y_arr.length, MW_arr.length);

  let MW_mix = 0;
  for (let i = 0; i < n; i++) {
    MW_mix += y_arr[i] * MW_arr[i];
  }

  const rho = 422.5 + (MW_mix - 16.04) * 5.0 - (T_K - 111.6) * 1.5;
  return rho;
}

/**
 * Boil-Off Gas (BOG) rate for an LNG storage tank.
 *
 * @param tank_volume_m3       Total LNG volume in tank (m³)
 * @param bor_percent_per_day  Boil-off rate (%/day of total liquid mass)
 * @param density_kg_m3        LNG density (kg/m³)
 * @param HHV_MJ_kg            Higher heating value of the gas (MJ/kg)
 * @returns                    Object containing BOG mass and energy rates per day
 */
export function lngBOGRate(
  tank_volume_m3: number,
  bor_percent_per_day: number,
  density_kg_m3: number,
  HHV_MJ_kg: number
): { bog_kg_per_day: number; bog_MJ_per_day: number } {
  const total_mass_kg    = tank_volume_m3 * density_kg_m3;
  const bog_kg_per_day   = total_mass_kg * bor_percent_per_day / 100;
  const bog_MJ_per_day   = bog_kg_per_day * HHV_MJ_kg;
  return { bog_kg_per_day, bog_MJ_per_day };
}

/**
 * Latent heat of vaporization for LNG using a Watson-correlation approximation.
 *
 * Anchored to methane at its normal boiling point (509 kJ/kg at 111.6 K) and
 * scaled to the critical temperature (190.6 K).  An empirical MW exponent
 * accounts for heavier mixtures.
 *
 * ΔHvap = 509 × [(1 − T/Tc) / (1 − T_NBP/Tc)]^0.38 × (MW/16.04)^0.1
 *
 * @param T_K  Liquid temperature (K); must be below Tc of methane (190.6 K)
 * @param MW   Average molecular weight of the LNG mixture (kg/kmol)
 * @returns    Latent heat of vaporization (kJ/kg), clamped to ≥ 0
 */
export function lngVaporizationEnthalpy(T_K: number, MW: number): number {
  const Tc_methane      = 190.6;   // K
  const Hvap_nbp        = 509;     // kJ/kg at NBP
  const T_nbp           = 111.6;   // K

  const delta_Hvap =
    Hvap_nbp *
    Math.pow(
      (1 - T_K / Tc_methane) / (1 - T_nbp / Tc_methane),
      0.38
    ) *
    Math.pow(MW / 16.04, 0.1);

  return Math.max(0, delta_Hvap);
}

/**
 * LNG heel remaining after a voyage, accounting for continuous boil-off.
 *
 * remaining_volume = initial_volume × (1 − BOR/100)^voyage_days
 *
 * @param initial_volume_m3       LNG volume at departure (m³)
 * @param voyage_days             Duration of voyage (days)
 * @param BOR_percent_per_day     Boil-off rate (%/day)
 * @returns                       Remaining LNG volume at arrival (m³)
 */
export function lngHeelCalculation(
  initial_volume_m3: number,
  voyage_days: number,
  BOR_percent_per_day: number
): number {
  const remaining_fraction = Math.pow(1 - BOR_percent_per_day / 100, voyage_days);
  return initial_volume_m3 * remaining_fraction;
}

/**
 * Convert an LNG volume to energy in MMBtu.
 *
 * 1 MMBtu = 1 055.06 MJ
 *
 * @param volume_m3      Volume of LNG (m³)
 * @param density_kg_m3  LNG density (kg/m³)
 * @param HHV_MJ_kg      Higher heating value of the LNG (MJ/kg)
 * @returns              Energy content (MMBtu)
 */
export function lngToMMBtu(
  volume_m3: number,
  density_kg_m3: number,
  HHV_MJ_kg: number
): number {
  const mass_kg   = volume_m3 * density_kg_m3;
  const energy_MJ = mass_kg * HHV_MJ_kg;
  return energy_MJ / 1055.06;
}

/**
 * Back-calculate the Henry Hub equivalent price from an LNG cargo price.
 *
 * Subtracts the chain costs (liquefaction, shipping, regasification) to
 * estimate the wellhead/hub-equivalent price.
 *
 * @param lng_price_per_mmbtu      Delivered LNG price ($/MMBtu)
 * @param liquefaction_cost        Liquefaction cost ($/MMBtu)
 * @param shipping_cost            Shipping/freight cost ($/MMBtu)
 * @param regasification_cost      Regasification cost ($/MMBtu)
 * @returns                        Implied Henry Hub equivalent price ($/MMBtu)
 */
export function lngPriceToHenryHub(
  lng_price_per_mmbtu: number,
  liquefaction_cost: number,
  shipping_cost: number,
  regasification_cost: number
): number {
  return lng_price_per_mmbtu - liquefaction_cost - shipping_cost - regasification_cost;
}

/**
 * Convert LNG mass in metric tonnes to energy in MMBtu.
 *
 * 1 MMBtu = 1 055.06 MJ; default HHV for LNG ≈ 54.0 MJ/kg.
 *
 * @param tonnes      LNG mass (metric tonnes)
 * @param HHV_MJ_kg   Higher heating value (MJ/kg); default 54.0
 * @returns           Energy content (MMBtu)
 */
export function lngTonneToMMBtu(tonnes: number, HHV_MJ_kg = 54.0): number {
  const mass_kg   = tonnes * 1000;
  const energy_MJ = mass_kg * HHV_MJ_kg;
  return energy_MJ / 1055.06;
}
