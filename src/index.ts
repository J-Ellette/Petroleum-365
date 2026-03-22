/**
 * Petroleum 365 — Main Function Library
 *
 * All functions follow the naming convention:
 *   P365.[Category].[Property].[Qualifier].By[Author]
 *
 * Usage:
 *   import { P365 } from "petroleum-365";
 *   P365.PVT.Z.ByDAK(200, 3000, 400, 665)
 *   P365.UnitConverter(100, "psia", "bar")
 */

import * as GasExports   from "./functions/pvt/gas";
import * as OilExports   from "./functions/pvt/oil";
import * as WaterExports from "./functions/pvt/water";
import * as DCAExports   from "./functions/dca";
import { unitConverter, getUnitsForCategory, getCategories, listUnits } from "./functions/utilities/unitConverter";
import * as PipeExports  from "./functions/pipe";
import * as IPRExports   from "./functions/ipr";
import * as MBEExports   from "./functions/mbe";
import * as PTAExports   from "./functions/pta";

// ─── Re-export raw modules ────────────────────────────────────────────────────
export * as P365_PVT_Gas   from "./functions/pvt/gas";
export * as P365_PVT_Oil   from "./functions/pvt/oil";
export * as P365_PVT_Water from "./functions/pvt/water";
export * as P365_DCA       from "./functions/dca";
export * as P365_Pipe      from "./functions/pipe";
export * as P365_IPR       from "./functions/ipr";
export * as P365_MBE       from "./functions/mbe";
export * as P365_PTA       from "./functions/pta";
export { unitConverter, getUnitsForCategory, getCategories, listUnits } from "./functions/utilities/unitConverter";

// ─── P365 Namespace Object ────────────────────────────────────────────────────

export const P365 = {
  // ─── PVT — Pressure-Volume-Temperature ─────────────────────────────────────
  PVT: {
    Gas:   GasExports,
    Oil:   OilExports,
    Water: WaterExports,

    // Z-factor
    Z: {
      ByDAK:            GasExports.zFactorByDAK,
      ByBrillBeggs:     GasExports.zFactorByBrillBeggs,
      ByHallYarborough: GasExports.zFactorByHallYarborough,
    },

    // Pseudo-critical properties
    PseudoCritical: {
      ByLeeKesler: GasExports.pseudoCriticalByLeeKesler,
      ByKays:      GasExports.pseudoCriticalByKays,
      WichertAziz: GasExports.wichertAzizCorrection,
    },

    // Gas properties
    Bg:   GasExports.gasFVF,
    Ug:   GasExports.gasViscosityByLeeGonzalez,
    Cg:   GasExports.gasCompressibility,
    RhoG: GasExports.gasDensity,

    // Bubble point pressure
    Pb: {
      ByStanding:     OilExports.bubblePointByStanding,
      ByVasquezBeggs: OilExports.bubblePointByVasquezBeggs,
    },

    // Solution GOR
    Rs: {
      ByStanding:     OilExports.solutionGORByStanding,
      ByVasquezBeggs: OilExports.solutionGORByVasquezBeggs,
    },

    // Oil formation volume factor
    Bo: {
      Sat: {
        ByStanding:     OilExports.oilFVFSatByStanding,
        ByVasquezBeggs: OilExports.oilFVFSatByVasquezBeggs,
      },
      UnSat: OilExports.oilFVFUndersat,
    },

    // Oil compressibility
    Co: {
      ByVasquezBeggs: OilExports.oilCompressibilityByVasquezBeggs,
    },

    // Oil viscosity
    Uo: {
      Dead: {
        ByBeal:    OilExports.deadOilViscosityByBeal,
        ByEgbogah: OilExports.deadOilViscosityByEgbogah,
      },
      Sat: {
        ByBeggsRobinson: OilExports.saturatedOilViscosityByBeggsRobinson,
      },
      UnSat: {
        ByVasquezBeggs: OilExports.undersaturatedOilViscosityByVasquezBeggs,
      },
    },

    // Specific gravity / API
    SG: {
      Oil: {
        FromAPI: OilExports.sgFromAPI,
        ToAPI:   OilExports.apiFromSG,
      },
    },

    // Water properties
    Bw:   WaterExports.waterFVFByMcCain,
    Rsw:  WaterExports.solutionGasWaterByMcCain,
    Cw:   WaterExports.waterCompressibilityByMcCain,
    Uw:   WaterExports.waterViscosityByMcCain,
    RhoW: WaterExports.waterDensity,
  },

  // ─── DCA — Decline Curve Analysis ─────────────────────────────────────────
  DCA: {
    Arps: {
      Rate:       DCAExports.arpsRate,
      Cumulative: DCAExports.arpsCumulative,
      Fit:        DCAExports.arpsFit,
      EUR:        DCAExports.arpsEUR,
      EffectiveToNominal: DCAExports.effectiveToNominalDecline,
      NominalToEffective: DCAExports.nominalToEffectiveDecline,
    },
    ModifiedHyperbolic: {
      Rate:       DCAExports.modifiedHyperbolicRate,
      Cumulative: DCAExports.modifiedHyperbolicCumulative,
    },
    Duong: {
      Rate:       DCAExports.duongRate,
      Cumulative: DCAExports.duongCumulative,
      Fit:        DCAExports.duongFit,
    },
  },

  // ─── Unit Converter ────────────────────────────────────────────────────────
  UnitConverter: unitConverter,
  Units: {
    GetForCategory: getUnitsForCategory,
    GetCategories:  getCategories,
    List:           listUnits,
  },

  // ─── Pipe Sizing Calculator ────────────────────────────────────────────────
  Pipe: {
    Forward:      PipeExports.pipeForward,
    Reverse:      PipeExports.pipeReverse,
    MultiSegment: PipeExports.calcMultiSegment,
    FittingEL:    PipeExports.calcFittingEL,
    Velocity:     PipeExports.gasVelocity,
    GetID:        PipeExports.getInsideDiameter,
    RecommendSize: PipeExports.recommendPipeSize,
    Weymouth: {
      Flow:           PipeExports.weymouthFlowSCFH,
      OutletPressure: PipeExports.weymouthOutletPressure,
      MaxLength:      PipeExports.weymouthMaxLength,
    },
  },
  // ─── IPR — Inflow Performance Relationship ────────────────────────────────
  IPR: {
    PI:          IPRExports.productivityIndex,
    DarcyRate:   IPRExports.darcyRate,
    PSS:         IPRExports.pssProductivityIndex,
    SS:          IPRExports.ssProductivityIndex,
    Transient:   IPRExports.transientProductivityIndex,
    Vogel: {
      Rate:   IPRExports.vogelRate,
      Qmax:   IPRExports.vogelQmax,
      AOF:    IPRExports.vogelAOF,
    },
    Composite:    IPRExports.compositeIPRRate,
    Fetkovich: {
      Rate:   IPRExports.fetkovichIPRRate,
      AOF:    IPRExports.fetkovichAOF,
    },
    KlinsClarke:  IPRExports.klinsClarkeRate,
    Gas: {
      Darcy:    IPRExports.gasWellDarcyRate,
      NonDarcy: IPRExports.gasWellNonDarcyRate,
    },
    Horizontal: {
      PI_Joshi:  IPRExports.horizontalWellPI_Joshi,
      PI_Renard: IPRExports.horizontalWellPI_Renard,
    },
    Skin: {
      PIRatio:      IPRExports.skinPIRatio,
      PressureDrop: IPRExports.skinPressureDrop,
    },
  },

  // ─── MBE — Material Balance Equation ──────────────────────────────────────
  MBE: {
    Gas: {
      PZ:                 MBEExports.gasPZ,
      OGIPFromTwoPoints:  MBEExports.ogipFromTwoPoints,
      OGIPFromRegression: MBEExports.ogipFromRegression,
      PressureAtGp:       MBEExports.gasPressureAtGp,
      GeopressuredPZ:     MBEExports.geopressuredModifiedPZ,
      GeopressuredOGIP:   MBEExports.geopressuredOGIP,
    },
    Oil: {
      Eo:                    MBEExports.oilExpansionEo,
      Eg:                    MBEExports.gasCapExpansionEg,
      Efw:                   MBEExports.fwExpansionEfw,
      F:                     MBEExports.undergroundWithdrawal,
      HavlenaOdeh:           MBEExports.havlenaOdeh,
    },
    Drive: {
      SolutionGasIndex:      MBEExports.solutionGasDriveIndex,
      GasCapIndex:           MBEExports.gasCapDriveIndex,
      WaterIndex:            MBEExports.waterDriveIndex,
      CompressibilityIndex:  MBEExports.compressibilityDriveIndex,
    },
    EffectiveCompressibility: MBEExports.effectiveCompressibility,
    Aquifer: {
      FetkovichWei:        MBEExports.fetkovichWei,
      FetkovichJ:          MBEExports.fetkovichAquiferJ,
      FetkovichInfluxStep: MBEExports.fetkovichWaterInfluxStep,
    },
  },

  // ─── PTA — Pressure Transient Analysis ────────────────────────────────────
  PTA: {
    Ei:           PTAExports.ei,
    Dimensionless: {
      TD:           PTAExports.dimensionlessTimeTD,
      TDr:          PTAExports.dimensionlessTimeAtRadius,
      PD:           PTAExports.dimensionlessPressurePD,
      PDtoDeltaP:   PTAExports.pdToPressureDrop,
    },
    Drawdown: {
      Pwf:    PTAExports.drawdownPwf,
      PwfEi:  PTAExports.drawdownPwfEi,
    },
    Horner: {
      TimeRatio:    PTAExports.hornerTimeRatio,
      Permeability: PTAExports.hornerPermeability,
      Skin:         PTAExports.hornerSkin,
      Pstar:        PTAExports.hornerPstar,
      Pws:          PTAExports.hornerBuildupPressure,
    },
    MDH: {
      Permeability: PTAExports.mdhPermeability,
      Skin:         PTAExports.mdhSkin,
    },
    Superpose:        PTAExports.superposeWellborePressure,
    FaultBuildup:     PTAExports.faultBuildupPressure,
    BourdetDerivative: PTAExports.bourdetDerivative,
    WellboreStorage: {
      C:   PTAExports.wellboreStorageCoefficient,
      CD:  PTAExports.wellboreStorageCoefficientCD,
    },
  },
} as const;
