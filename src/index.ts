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

import * as GasExports    from "./functions/pvt/gas";
import * as OilExports    from "./functions/pvt/oil";
import * as WaterExports  from "./functions/pvt/water";
import * as DCAExports    from "./functions/dca";
import { unitConverter, getUnitsForCategory, getCategories, listUnits } from "./functions/utilities/unitConverter";
import * as PipeExports   from "./functions/pipe";
import * as IPRExports    from "./functions/ipr";
import * as MBEExports    from "./functions/mbe";
import * as PTAExports    from "./functions/pta";
import * as VFPExports    from "./functions/vfp";
import * as SFExports     from "./functions/sf";
import * as FAExports     from "./functions/fa";
import * as FRACExports   from "./functions/frac";
import * as FPPExports    from "./functions/fpp";
import * as SCALExports   from "./functions/scal";
import * as EoSExports    from "./functions/eos";
import * as ESPExports    from "./functions/esp";
import * as GLExports     from "./functions/gl";
import * as RPExports     from "./functions/rp";
import * as CNGLNGExports from "./functions/cnglng";
import * as HVExports     from "./functions/hv";
import * as AGA8Exports   from "./functions/aga8";
import * as NodalExports  from "./functions/nodal";
import * as WHTExports    from "./functions/wht";
import * as GEOExports    from "./functions/geo";
import * as SKINExports   from "./functions/skin";
import * as WBIExports    from "./functions/wbi";
import * as SIMExports    from "./functions/sim";

// ─── Re-export raw modules ────────────────────────────────────────────────────
export * as P365_PVT_Gas   from "./functions/pvt/gas";
export * as P365_PVT_Oil   from "./functions/pvt/oil";
export * as P365_PVT_Water from "./functions/pvt/water";
export * as P365_DCA       from "./functions/dca";
export * as P365_Pipe      from "./functions/pipe";
export * as P365_IPR       from "./functions/ipr";
export * as P365_MBE       from "./functions/mbe";
export * as P365_PTA       from "./functions/pta";
export * as P365_VFP       from "./functions/vfp";
export * as P365_SF        from "./functions/sf";
export * as P365_FA        from "./functions/fa";
export * as P365_FRAC      from "./functions/frac";
export * as P365_FPP       from "./functions/fpp";
export * as P365_SCAL      from "./functions/scal";
export * as P365_EoS       from "./functions/eos";
export * as P365_ESP       from "./functions/esp";
export * as P365_GL        from "./functions/gl";
export * as P365_RP        from "./functions/rp";
export * as P365_CNGLNG    from "./functions/cnglng";
export * as P365_HV        from "./functions/hv";
export * as P365_AGA8      from "./functions/aga8";
export * as P365_Nodal     from "./functions/nodal";
export * as P365_WHT       from "./functions/wht";
export * as P365_GEO       from "./functions/geo";
export * as P365_SKIN      from "./functions/skin";
export * as P365_WBI       from "./functions/wbi";
export * as P365_SIM       from "./functions/sim";
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
    PLE: {
      Rate:       DCAExports.pleRate,
      Cumulative: DCAExports.pleCumulative,
    },
    SEPD: {
      Rate:       DCAExports.sepdRate,
      Cumulative: DCAExports.sepdCumulative,
    },
    LGM: {
      Rate:       DCAExports.lgmRate,
      Cumulative: DCAExports.lgmCumulative,
      EUR:        DCAExports.lgmEUR,
    },
    TransientHyperbolic: {
      Rate:        DCAExports.thRate,
      Cumulative:  DCAExports.thCumulative,
      SwitchTime:  DCAExports.thSwitchTime,
      EUR:         DCAExports.thEUR,
    },
    ExtendedExponential: {
      Rate:        DCAExports.eeRate,
      Cumulative:  DCAExports.eeCumulative,
      EUR:         DCAExports.eeEUR,
    },
    AKB: {
      Rate:        DCAExports.akbRate,
      Cumulative:  DCAExports.akbCumulative,
      EUR:         DCAExports.akbEUR,
    },
    Diagnostics: {
      DeclineRate:       DCAExports.dcaDeclineRate,
      BFactor:           DCAExports.dcaBFactor,
      LogLogDerivative:  DCAExports.dcaLogLogDerivative,
      FlowRegimeFromB:   DCAExports.dcaFlowRegimeFromB,
    },
    DataQC: {
      RollingZScore:    DCAExports.dcaRollingZScore,
      CleanProduction:  DCAExports.dcaCleanProduction,
      RateNormalize:    DCAExports.dcaRateNormalize,
    },
    Conversions: {
      ConvertNominalDecline:     DCAExports.dcaConvertNominalDecline,
      AnnualToMonthlyEffective:  DCAExports.dcaAnnualToMonthlyEffective,
      MonthlyToAnnualEffective:  DCAExports.dcaMonthlyToAnnualEffective,
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
      VEH: {
        QFunction:       MBEExports.vehQFunction,
        PD:              MBEExports.vehPD,
        AquiferConstant: MBEExports.vehAquiferConstant,
        TD:              MBEExports.vehTD,
        WaterInflux:     MBEExports.vehWaterInflux,
      },
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

  // ─── VFP — Vertical Flow Performance ──────────────────────────────────────
  VFP: {
    Liquid: {
      DeltaP: VFPExports.singlePhaseLiquidDeltaP,
      BHP:    VFPExports.singlePhaseLiquidBHP,
    },
    Gas: {
      BHP:      VFPExports.singlePhaseGasBHP,
      OutletP:  VFPExports.singlePhaseGasOutletP,
    },
    BeggsBrill: {
      Gradient: VFPExports.beggsBrillGradient,
      BHP:      VFPExports.beggsBrillBHP,
      VLPCurve: VFPExports.vlpCurveBeggsBrill,
    },
    Gray: {
      Gradient: VFPExports.grayGradient,
    },
    HagedornBrown: {
      Gradient: VFPExports.hagedornBrownGradient,
    },
    LiquidLoading: {
      TurnerCriticalVelocity:   VFPExports.turnerCriticalVelocity,
      MinimumGasRateForLiftoff: VFPExports.minimumGasRateForLiftoff,
    },
  },

  // ─── SF — Surface Facilities ───────────────────────────────────────────────
  SF: {
    Choke: {
      Rate:           SFExports.chokeRate,
      BeanSize:       SFExports.chokeBeanSize,
      IsCritical:     SFExports.isCriticalFlow,
      AllCorrelations: SFExports.chokeAllCorrelations,
    },
    Pipeline: {
      PanhandleA:         SFExports.panhandleA,
      PanhandleAOutletP:  SFExports.panhandleAOutletP,
      PanhandleB:         SFExports.panhandleB,
      PanhandleBOutletP:  SFExports.panhandleBOutletP,
      Comparison:         SFExports.gasPipelineComparison,
    },
    Compressor: {
      Power:           SFExports.compressorPower,
      Interstage:      SFExports.interstageCompression,
      DischargeTemp:   SFExports.compressorDischargeTemp,
    },
  },

  // ─── FA — Flow Assurance ───────────────────────────────────────────────────
  FA: {
    Hydrate: {
      HammerschmidtDepression:    FAExports.hammerschmidtDepression,
      HammerschmidtConcentration: FAExports.hammerschmidtConcentration,
      KatzTemp:                   FAExports.katzHydrateTemp,
      MethanolRate:               FAExports.methanolInjectionRate,
      MEGRate:                    FAExports.megInjectionRate,
    },
    Corrosion: {
      DeWaardMilliams:    FAExports.deWaardMilliamsCorrosion,
      Severity:           FAExports.corrosionSeverity,
      CO2PartialPressure: FAExports.co2PartialPressure,
      InhibitedRate:      FAExports.inhibitedCorrosionRate,
      Allowance:          FAExports.corrosionAllowance,
    },
    Erosion: {
      MixtureDensity:   FAExports.mixtureDensity,
      ErosionalVelocity: FAExports.erosionalVelocity,
      MixtureVelocity:  FAExports.mixtureVelocity,
      Ratio:            FAExports.erosionRatio,
      RiskClass:        FAExports.erosionRiskClass,
    },
    Assessment: FAExports.flowAssuranceAssessment,
  },

  // ─── FRAC — Hydraulic Fracturing ──────────────────────────────────────────
  FRAC: {
    PKN: {
      AverageWidth:   FRACExports.pknAverageWidth,
      MaxWidth:       FRACExports.pknMaxWidth,
      Volume:         FRACExports.pknFractureVolume,
      FluidEfficiency: FRACExports.pknFluidEfficiency,
      NetPressure:    FRACExports.pknNetPressure,
    },
    KGD: {
      AverageWidth:   FRACExports.kgdAverageWidth,
      Volume:         FRACExports.kgdFractureVolume,
    },
    Radial: {
      Radius:         FRACExports.radialFractureRadius,
    },
    Leakoff: {
      CartierCoeff:   FRACExports.carterLeakoffCoeff,
      CumulativeLoss: FRACExports.carterCumulativeLoss,
    },
    Proppant: {
      SettlingVelocity:       FRACExports.proppantSettlingVelocity,
      HinderedSettlingVelocity: FRACExports.hinderedSettlingVelocity,
    },
    CfD:                FRACExports.dimensionlessConductivity,
    FracturedWellSkin:  FRACExports.fracturedWellSkin,
    StimulationRatio:   FRACExports.fractureStimulationRatio,

    // Poroelastic closure stress and net pressure (Session 9)
    Poroelastic: {
      Closure:            FRACExports.fracPoroelasticClosure,
    },
    NetPressure:          FRACExports.fracNetPressure,
    FluidEfficiency:      FRACExports.fracFluidEfficiency,
    ISIP:                 FRACExports.fracISIP,
    SurfaceTreatingPressure: FRACExports.fracSurfaceTreatingPressure,
    BreakdownPressure:    FRACExports.fracBreakdownPressure,

    // Nolte G-function analysis
    Nolte: {
      G:             FRACExports.fracNolteG,
      Closure:       FRACExports.fracGDerivedClosure,
      Leakoff:       FRACExports.fracNolteLeakoff,
    },
  },

  // ─── FPP — Field Production Profile ───────────────────────────────────────
  FPP: {
    Rate:             FPPExports.fieldProductionRate,
    Cumulative:       FPPExports.fieldCumulativeProduction,
    RateProfile:      FPPExports.fieldRateProfile,
    EUR:              FPPExports.fieldEUR,
    ProfileStats:     FPPExports.profileStats,
    MultiWell: {
      Rate:           FPPExports.multiWellRate,
      RateProfile:    FPPExports.multiWellRateProfile,
    },
  },

  // ─── SCAL — Special Core Analysis ─────────────────────────────────────────
  SCAL: {
    Corey: {
      Krw:     SCALExports.coreyKrw,
      Kro:     SCALExports.coreyKro,
      KrTable: SCALExports.coreyKrTable,
    },
    LET: {
      Krw: SCALExports.letKrw,
      Kro: SCALExports.letKro,
    },
    Honarpour: {
      Krg: SCALExports.honarpourKrg,
      Kro: SCALExports.honarpourKro,
    },
    BrooksCorey: {
      Pc:         SCALExports.brooksCoreyPc,
      SwFromPc:   SCALExports.brooksCoreySwFromPc,
      PcToHeight: SCALExports.pcToHeight,
    },
    VanGenuchten: {
      Pc: SCALExports.vanGenuchtenPc,
    },
    Leverett: {
      J:  SCALExports.leverettJ,
      Pc: SCALExports.leverettPc,
    },
    BuckleyLeverett: {
      Fw:               SCALExports.buckleyLeverettFw,
      WelgeConstruction: SCALExports.welgeConstruction,
    },
    StoneKro: {
      StoneI:  SCALExports.stoneOneKro,
      StoneII: SCALExports.stoneTwoKro,
    },
    RockCompressibility: SCALExports.newmanRockCompressibility,

    // IFT-dependent capillary pressure (EOR / miscible flooding)
    IFT: {
      ScaledPc:           SCALExports.scalIFTScaledPc,
      CapillaryNumber:    SCALExports.scalCapillaryNumber,
      ResidualOilSat:     SCALExports.scalResidualOilSaturation,
      Endpoints:          SCALExports.scalIFTEndpoints,
    },

    // Wettability indices
    Wettability: {
      Amott:  SCALExports.scalAmottWettability,
      USBM:   SCALExports.scalUSBMWettability,
    },
  },

  // ─── EoS — Equation of State ───────────────────────────────────────────────
  EoS: {
    PR: {
      AB:                 EoSExports.prAB,
      CubicRoots:         EoSExports.prCubicRoots,
      ZFactor:            EoSExports.prZFactor,
      FugacityCoefficient: EoSExports.prFugacityCoefficient,
      MixAB:              EoSExports.prMixAB,
      BubblePoint:        EoSExports.prBubblePoint,
      DewPoint:           EoSExports.prDewPoint,
      Flash:              EoSExports.prFlash,
    },
  },

  // ─── ESP — Electric Submersible Pump ──────────────────────────────────────
  ESP: {
    TDH:            ESPExports.espTDH,
    HydraulicHP:    ESPExports.espHydraulicHP,
    BrakeHP:        ESPExports.espBrakeHP,
    PumpStages:     ESPExports.espPumpStages,
    MotorHP:        ESPExports.espMotorHP,
    MotorCurrent:   ESPExports.espMotorCurrent,
    CableVoltageDrop: ESPExports.espCableVoltageDrop,
    VoidFraction:   ESPExports.espVoidFraction,
    GasHandling:    ESPExports.espGasHandling,
    OperatingPoint: ESPExports.espOperatingPoint,
  },

  // ─── GL — Gas Lift ─────────────────────────────────────────────────────────
  GL: {
    TargetGLR:              GLExports.glTargetGLR,
    RequiredInjectionRate:  GLExports.glRequiredInjectionRate,
    TotalGLR:               GLExports.glTotalGLR,
    ThornhillCraver:        GLExports.thornhillCraver,
    ValveDomePressure:      GLExports.glValveDomePressure,
    ValveTRO:               GLExports.glValveTRO,
    ValveClosingPressure:   GLExports.glValveClosingPressure,
    InjectionPressureAtDepth: GLExports.glInjectionPressureAtDepth,
    CriticalFlowCheck:      GLExports.glCriticalFlowCheck,
    OptimalInjectionDepth:  GLExports.glOptimalInjectionDepth,
  },

  // ─── RP — Rod Pump ─────────────────────────────────────────────────────────
  RP: {
    PumpDisplacement:    RPExports.rpPumpDisplacement,
    FluidLoad:           RPExports.rpFluidLoad,
    RodWeight:           RPExports.rpRodWeight,
    PolishedRodLoadUp:   RPExports.rpPolishedRodLoadUp,
    PolishedRodLoadDown: RPExports.rpPolishedRodLoadDown,
    PeakTorque:          RPExports.rpPeakTorque,
    CounterbalanceEffect: RPExports.rpCounterbalanceEffect,
    MotorHP:             RPExports.rpMotorHP,
    StrokeLength:        RPExports.rpStrokeLength,
    PumpingUnitClass:    RPExports.rpPumpingUnitClass,
  },

  // ─── CNG / LNG ─────────────────────────────────────────────────────────────
  CNGLNG: {
    CNG: {
      Density:         CNGLNGExports.cngDensity,
      CylinderCapacity: CNGLNGExports.cngCylinderCapacity,
      GGE:             CNGLNGExports.cngGGE,
      DGE:             CNGLNGExports.cngDGE,
      FillTime:        CNGLNGExports.cngFillTime,
      CascadeDesign:   CNGLNGExports.cngCascadeDesign,
    },
    LNG: {
      DensityGIIGNL:        CNGLNGExports.lngDensityGIIGNL,
      DensityFromComposition: CNGLNGExports.lngDensityFromComposition,
      BOGRate:              CNGLNGExports.lngBOGRate,
      VaporizationEnthalpy: CNGLNGExports.lngVaporizationEnthalpy,
      HeelCalculation:      CNGLNGExports.lngHeelCalculation,
      ToMMBtu:              CNGLNGExports.lngToMMBtu,
      PriceToHenryHub:      CNGLNGExports.lngPriceToHenryHub,
      TonneToMMBtu:         CNGLNGExports.lngTonneToMMBtu,
    },
  },

  // ─── HV — Heating Value ────────────────────────────────────────────────────
  HV: {
    MolecularWeight: HVExports.hvMolecularWeight,
    SpecificGravity: HVExports.hvSpecificGravity,
    HHV:             HVExports.hvHHV,
    LHV:             HVExports.hvLHV,
    WobbeIndex:      HVExports.hvWobbeIndex,
    HHV_MJNm3:      HVExports.hvHHV_MJNm3,
    LHV_MJNm3:      HVExports.hvLHV_MJNm3,
    Analysis:        HVExports.hvAnalysis,
  },

  // ─── AGA8 — Compressibility Factor ────────────────────────────────────────
  AGA8: {
    CharProps:              AGA8Exports.aga8CharProps,
    MixProps:               AGA8Exports.aga8MixProps,
    Z:                      AGA8Exports.aga8Z,
    Density:                AGA8Exports.aga8Density,
    CompressibilityFactor:  AGA8Exports.aga8CompressibilityFactor,
  },

  // ─── Nodal — Nodal Analysis ────────────────────────────────────────────────
  Nodal: {
    Sweep:          NodalExports.nodalSweep,
    OperatingPoint: NodalExports.nodalOperatingPoint,
    IPRVogel:       NodalExports.nodalIPRVogel,
    GasWell:        NodalExports.nodalGasWell,
  },

  // ─── WHT — Wellbore Heat Transfer ─────────────────────────────────────────
  WHT: {
    GeothermalTemp:       WHTExports.whtGeothermalTemp,
    OHTC:                 WHTExports.whtOHTC,
    FluidTemp:            WHTExports.whtFluidTemp,
    InsulationThickness:  WHTExports.whtInsulationThickness,
    HeatLoss:             WHTExports.whtHeatLoss,
  },

  // ─── GEO — Geomechanics ────────────────────────────────────────────────────
  GEO: {
    // Unit helpers
    EMWToGradient:          GEOExports.geoEMWToGradient,
    GradientToEMW:          GEOExports.geoGradientToEMW,

    // Overburden
    OverburdenStress:       GEOExports.geoOverburdenStress,
    OverburdenGradient:     GEOExports.geoOverburdenGradient,
    BulkDensityFromSonic:   GEOExports.geoBulkDensityFromSonic,

    // Pore pressure
    NormalTransitTime:      GEOExports.geoNormalTransitTime,
    PorePressureEaton:      GEOExports.geoPorePressureEaton,
    NormalPorePressure:     GEOExports.geoNormalPorePressure,

    // Effective stress
    EffectiveVerticalStress: GEOExports.geoEffectiveVerticalStress,
    BiotCoefficient:        GEOExports.geoBiotCoefficient,

    // Horizontal stress
    MinHorizontalStress:    GEOExports.geoMinHorizontalStress,

    // Fracture gradient
    FractureGradient: {
      HubbertWillis:   GEOExports.geoFractureGradientHubbertWillis,
      MatthewsKelly:   GEOExports.geoFractureGradientMatthewsKelly,
      Eaton:           GEOExports.geoFractureGradientEaton,
    },
    FractureClosurePressure: GEOExports.geoFractureClosurePressure,

    // Mud window
    MudWindow:              GEOExports.geoMudWindow,

    // Rock strength
    UCSFromYoungsModulus:   GEOExports.geoUCSFromYoungsModulus,
    MohrCoulombShearStrength: GEOExports.geoMohrCoulombShearStrength,
    WellboreCollapseGradient: GEOExports.geoWellboreCollapseGradient,

    // Elastic properties
    StaticPoissonRatio:     GEOExports.geoStaticPoissonRatio,
    CastagnaVs:             GEOExports.geoCastagnaVs,
    DynamicElasticModuli:   GEOExports.geoDynamicElasticModuli,

    // Offshore
    OffshoreOverburden:     GEOExports.geoOffshoreOverburden,
  },

  // ─── SKIN — Composite Skin Factor ─────────────────────────────────────────
  SKIN: {
    // Hawkins damage skin
    Hawkins:               SKINExports.skinHawkins,
    EffectiveWellboreRadius: SKINExports.skinEffectiveWellboreRadius,
    FlowEfficiency:        SKINExports.skinFlowEfficiency,

    // Perforation skin
    Perforation: {
      KarakasTariq:  SKINExports.skinKarakasTariq,
      McLeod:        SKINExports.skinPerforation,
    },

    // Non-Darcy (turbulent) skin
    NonDarcy: {
      Beta:  SKINExports.skinNonDarcyBeta,
      D:     SKINExports.skinNonDarcyD,
      Skin:  SKINExports.skinNonDarcy,
    },

    // Partial penetration
    PartialPenetration:    SKINExports.skinPartialPenetration,

    // Gravel pack
    GravelPack:            SKINExports.skinGravelPack,

    // Composite / utilities
    Total:                 SKINExports.skinTotal,
    PressureDrop:          SKINExports.skinPressureDrop,
    ProductivityRatio:     SKINExports.skinProductivityRatio,
    StimulationRatio:      SKINExports.skinStimulationRatio,
  },

  // ─── WBI — Wellbore Integrity ──────────────────────────────────────────────
  WBI: {
    // Casing burst
    Burst: {
      Rating:         WBIExports.wbiCasingBurstRating,
      DesignFactor:   WBIExports.wbiDesignFactor,
      RequiredRating: WBIExports.wbiRequiredBurstRating,
    },
    // Casing collapse
    Collapse: {
      DtRatio:        WBIExports.wbiDtRatio,
      ElasticP:       WBIExports.wbiElasticCollapseP,
      YieldP:         WBIExports.wbiYieldCollapseP,
      Rating:         WBIExports.wbiCollapseRating,
      Regime:         WBIExports.wbiCollapseRegime,
    },
    // Tensile and buoyancy
    Tensile: {
      AirWeight:      WBIExports.wbiCasingAirWeight,
      BuoyancyFactor: WBIExports.wbiBuoyancyFactor,
      EffectiveWeight: WBIExports.wbiEffectiveWeight,
      Rating:         WBIExports.wbiTensileRating,
      Check:          WBIExports.wbiTensileCheck,
    },
    // Cement job
    Cement: {
      Volume:         WBIExports.wbiCementVolume,
      MinTop:         WBIExports.wbiMinCementTop,
      SlurryDensity:  WBIExports.wbiSlurryDensity,
      ReturnHeight:   WBIExports.wbiCementReturnHeight,
    },
    // Shoe test / FIT / LOT / XLOT
    ShoeTest: {
      FITEquivalentMW:   WBIExports.wbiFITEquivalentMW,
      FITSurfacePressure: WBIExports.wbiFITSurfacePressure,
      Evaluate:          WBIExports.wbiShoeTestEvaluation,
      XLOTClosureStress: WBIExports.wbiXLOTClosureStress,
      LOTBreakdownEMW:   WBIExports.wbiLOTBreakdownEMW,
    },
    // Mud weight window
    MudWindow:             WBIExports.wbiMudWeightWindow,
    // Hydrostatic helpers
    HydrostaticPressure:   WBIExports.wbiHydrostaticPressure,
    PressureToEMW:         WBIExports.wbiPressureToEMW,
  },

  // ─── SIM — Reservoir Simulation INCLUDE File Generator ────────────────────
  SIM: {
    // Eclipse keywords
    SWOF:              SIMExports.simSWOF,
    SGOF:              SIMExports.simSGOF,
    PVTO:              SIMExports.simPVTO,
    PVDG:              SIMExports.simPVDG,
    PVTW:              SIMExports.simPVTW,

    // CMG keywords
    WOTABLE:           SIMExports.simWOTABLE,
    GOTABLE:           SIMExports.simGOTABLE,

    // SCAL endpoint summary
    KrEndpointTable:   SIMExports.simKrEndpointTable,

    // Corey table builders
    BuildSwofTable:    SIMExports.simBuildSwofTable,
    BuildSgofTable:    SIMExports.simBuildSgofTable,

    // File generator
    GenerateFromTemplate: SIMExports.simGenerateFromTemplate,
    ValidateTokens:       SIMExports.simValidateTokens,
    BatchGenerate:        SIMExports.simBatchGenerate,
  },

} as const;
