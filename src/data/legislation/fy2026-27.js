// FY 2026-27 — projected legislative parameters (indexed estimates from FY25-26 baseline).
// SG plateaus at 12% (final SG schedule complete). Caps and thresholds indexed at AWOTE/CPI defaults.

export const FY_LABEL = "FY26-27 (projected)";
export const FY_KEY = "fy2026-27";

export const TAX_BRACKETS = [
  { min: 0,       max: 18200,   rate: 0,    label: "$0 – $18,200" },
  { min: 18201,   max: 45000,   rate: 0.16, label: "$18,201 – $45,000" },
  { min: 45001,   max: 135000,  rate: 0.30, label: "$45,001 – $135,000" },
  { min: 135001,  max: 190000,  rate: 0.37, label: "$135,001 – $190,000" },
  { min: 190001,  max: Infinity,rate: 0.45, label: "$190,001+" },
];

export const LITO = {
  max: 700, fullThreshold: 37500, taper1Rate: 0.05, taper1Limit: 45000, taper2Rate: 0.015, cutoff: 66667,
};

export const SAPTO = {
  single: { max: 2310, shadeIn: 33410, cutoff: 51890, taperRate: 0.125 },
  couple: { max: 1658, shadeIn: 30000, cutoff: 43260, taperRate: 0.125 },
  illnessSeparated: { max: 2112, shadeIn: 32384, cutoff: 49266, taperRate: 0.125 },
};

export const MEDICARE = {
  levyRate: 0.02,
  shadeInSingle: 27950, shadeInFamily: 47132, shadeInDependentChild: 4332, shadeInRate: 0.10,
  shadeInSenior: 44175, shadeInSeniorFamily: 61490,
  surchargeBrackets: [
    { minSingle: 0,      maxSingle: 97000,   minFamily: 0,      maxFamily: 194000,  rate: 0.000 },
    { minSingle: 97001,  maxSingle: 113000,  minFamily: 194001, maxFamily: 226000,  rate: 0.010 },
    { minSingle: 113001, maxSingle: 151000,  minFamily: 226001, maxFamily: 302000,  rate: 0.0125 },
    { minSingle: 151001, maxSingle: Infinity,minFamily: 302001, maxFamily: Infinity,rate: 0.015 },
  ],
  familyThresholdPerChild: 1550,
  surchargeThresholdSingle: 97000, surchargeThresholdFamily: 194000, surchargeRate: 0.01,
};

export const SUPER_PARAMS = {
  sgRate: 0.12, maxSuperContribBase: 67350,
  concessionalCap: 30000, nonConcessionalCap: 120000, nonConcessionalBringForward3yr: 360000,
  carryForwardThreshold: 500000,
  taxRate: 0.15, pensionTaxRate: 0, ttrTaxRate: 0.15, divisionTaxRate: 0.15,
  div293Threshold: 250000, div293Rate: 0.15,
  transferBalanceCap: 2100000, totalSuperBalanceCap: 2100000,
  coContribMaxAmount: 500, coContribMatchRate: 0.50, coContribLowerThreshold: 49150, coContribUpperThreshold: 64150,
  spouseOffsetMax: 540, spouseOffsetMaxContrib: 3000, spouseOffsetLowerIncome: 37000, spouseOffsetUpperIncome: 40000,
  listoMax: 500, listoIncomeThreshold: 37000,
  preservationAge: 60, earliestSuperAccessAge: 60,
  lumpSumLowRateCap: 253000, lumpSumLowRateTax: 0.15,
  minPensionDrawdownRates: [
    { minAge: 0, maxAge: 64, rate: 0.04 }, { minAge: 65, maxAge: 74, rate: 0.05 },
    { minAge: 75, maxAge: 79, rate: 0.06 }, { minAge: 80, maxAge: 84, rate: 0.07 },
    { minAge: 85, maxAge: 89, rate: 0.09 }, { minAge: 90, maxAge: 94, rate: 0.11 },
    { minAge: 95, maxAge: Infinity, rate: 0.14 },
  ],
  redundancyBaseAmount: 12962, redundancyServiceAmount: 6483,
};

export const PRESERVATION_AGE_TABLE = [
  { bornFrom: "1964-07-01", age: 60 },
];

export const CENTRELINK = {
  ageQualifyingAge: 67,
  singleMaxPension: 30797, coupleMaxPension: 46434, illnessSeparatedMaxPension: 61594,
  singleAssetThresholdHomeowner: 324988, singleAssetThresholdNonHomeowner: 585810,
  coupleAssetThresholdHomeowner: 486545, coupleAssetThresholdNonHomeowner: 747367,
  illnessSepAssetThresholdHomeowner: 486545, illnessSepAssetThresholdNonHomeowner: 747367,
  singleAssetCutoffHomeowner: 721089, singleAssetCutoffNonHomeowner: 981911,
  coupleAssetCutoffHomeowner: 1084259, coupleAssetCutoffNonHomeowner: 1345081,
  assetTaperRate: 0.078,
  singleIncomeThreshold: 5705, coupleIncomeThreshold: 10118, illnessSepIncomeThreshold: 5705,
  incomeTaperRate: 0.50,
  workBonusFortnightlyExempt: 300, workBonusAnnualBank: 11800,
  deemingRateLower: 0.0050, deemingRateUpper: 0.0250, // assumed gradual unfreeze
  deemingThresholdSingle: 66448, deemingThresholdCouple: 109916,
  giftingFreeAreaPerYear: 10000, giftingFreeAreaFiveYear: 30000, giftingDeprivationPeriod: 5,
  rentAssistMaxSingle: 5793, rentAssistMaxCouple: 5458, rentAssistMinRentSingle: 3132, rentAssistMinRentCouple: 5066, rentAssistRate: 0.75,
};

export const ALLOWANCE = {
  jobSeekerSingleNoChildren: 21366, jobSeekerSingleWithChildren: 22995, jobSeekerCouplePerPerson: 19465,
  jobSeeker60Plus9Months: 22995,
  jobSeekerIncomeFreeArea: 3380, jobSeekerIncomeTaperBand1: 5876,
  jobSeekerTaperBand1Rate: 0.50, jobSeekerTaperBand2Rate: 0.60,
};

export const CSHC = {
  singleIncomeLimit: 102496, coupleIncomeLimit: 163985, illnessSeparatedLimit: 204992,
  perChildAdjustment: 661.99, deemingApplies: true,
};

export const AGED_CARE = {
  mpir: 0.0834,
  bill2013: null, // Bill 2013 superseded after 1 Jul 2025; legacy mode disabled in FY26-27
  act2024: {
    basicDailyFee: 23142, hotelingSupplementMax: 12.99 * 365,
    nonClinicalCareContributionRate: 0.075, nonClinicalCareCap: 134550,
    accommodationContributionDailyMax: 157.35, accommodationSupplementMax: 73.42 * 365,
    incomeFreeAreaSingle: 34916, incomeFreeAreaCouple: 34267, incomeTaperRate: 0.50,
    assetFreeArea: 213251, assetTaperRate: 0.001, homeValueCapForAssetTest: 213251,
    rentDerivedFromHomeAssessable: true,
  },
  homeCarePackages: {
    levels: [10350, 17595, 38813, 58736], basicDailyFeeRate: 0.175,
    incomeTestedFeeMax: 18889, incomeTestedFeeAnnualCap: 18889, incomeTestedFeeLifetimeCap: 82740,
  },
};

export const INDEXATION = {
  CPI: 0.025, AWE: 0.035, PBLCI: 0.027,
  agePensionIndexation: 0.035, taxThresholdIndexation: 0,
  superCapIndexation: 0.035, centrelinkThresholdIndexation: 0.025,
  agedCareIndexation: 0.025, privateHealthIndexation: 0.05, utilitiesIndexation: 0.04,
  medicalIndexation: 0.045, educationIndexation: 0.04, travelIndexation: 0.025,
};

export const LIFE_EXPECTANCY = {
  male:   { 60: 84.4, 65: 85.0, 70: 85.8, 75: 86.8, 80: 88.1, 85: 89.7, 90: 91.7, 95: 94.0 },
  female: { 60: 87.4, 65: 87.8, 70: 88.3, 75: 89.0, 80: 90.0, 85: 91.3, 90: 93.0, 95: 95.1 },
};

export default {
  fyKey: FY_KEY, fyLabel: FY_LABEL, taxBrackets: TAX_BRACKETS, lito: LITO, sapto: SAPTO, medicare: MEDICARE,
  superParams: SUPER_PARAMS, preservationAgeTable: PRESERVATION_AGE_TABLE, centrelink: CENTRELINK,
  allowance: ALLOWANCE, cshc: CSHC, agedCare: AGED_CARE, indexation: INDEXATION, lifeExpectancy: LIFE_EXPECTANCY,
};
