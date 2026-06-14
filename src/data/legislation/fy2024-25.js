// FY 2024-25 — historical reference set (Stage 3 cuts effective 1 Jul 2024).
// Differences vs FY25-26: SG rate 11.5%, TBC $1.9m, lower SAPTO thresholds, Sep 2024 Centrelink rates.

export const FY_LABEL = "FY24-25";
export const FY_KEY = "fy2024-25";

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
  single: { max: 2230, shadeIn: 32279, cutoff: 50119, taperRate: 0.125 },
  couple: { max: 1602, shadeIn: 28974, cutoff: 41790, taperRate: 0.125 },
  illnessSeparated: { max: 2040, shadeIn: 31279, cutoff: 47599, taperRate: 0.125 },
};

export const MEDICARE = {
  levyRate: 0.02,
  shadeInSingle: 26000, shadeInFamily: 43846, shadeInDependentChild: 4027, shadeInRate: 0.10,
  shadeInSenior: 41089, shadeInSeniorFamily: 57198,
  surchargeBrackets: [
    { minSingle: 0,      maxSingle: 93000,   minFamily: 0,      maxFamily: 186000,  rate: 0.000 },
    { minSingle: 93001,  maxSingle: 108000,  minFamily: 186001, maxFamily: 216000,  rate: 0.010 },
    { minSingle: 108001, maxSingle: 144000,  minFamily: 216001, maxFamily: 288000,  rate: 0.0125 },
    { minSingle: 144001, maxSingle: Infinity,minFamily: 288001, maxFamily: Infinity,rate: 0.015 },
  ],
  familyThresholdPerChild: 1500,
  surchargeThresholdSingle: 93000, surchargeThresholdFamily: 186000, surchargeRate: 0.01,
};

export const SUPER_PARAMS = {
  sgRate: 0.115, maxSuperContribBase: 65070,
  concessionalCap: 30000, nonConcessionalCap: 120000, nonConcessionalBringForward3yr: 360000,
  carryForwardThreshold: 500000,
  taxRate: 0.15, pensionTaxRate: 0, ttrTaxRate: 0.15, divisionTaxRate: 0.15,
  div293Threshold: 250000, div293Rate: 0.15,
  transferBalanceCap: 1900000, totalSuperBalanceCap: 1900000,
  coContribMaxAmount: 500, coContribMatchRate: 0.50, coContribLowerThreshold: 45400, coContribUpperThreshold: 60400,
  spouseOffsetMax: 540, spouseOffsetMaxContrib: 3000, spouseOffsetLowerIncome: 37000, spouseOffsetUpperIncome: 40000,
  listoMax: 500, listoIncomeThreshold: 37000,
  preservationAge: 60, earliestSuperAccessAge: 60,
  lumpSumLowRateCap: 235000, lumpSumLowRateTax: 0.15,
  minPensionDrawdownRates: [
    { minAge: 0, maxAge: 64, rate: 0.04 }, { minAge: 65, maxAge: 74, rate: 0.05 },
    { minAge: 75, maxAge: 79, rate: 0.06 }, { minAge: 80, maxAge: 84, rate: 0.07 },
    { minAge: 85, maxAge: 89, rate: 0.09 }, { minAge: 90, maxAge: 94, rate: 0.11 },
    { minAge: 95, maxAge: Infinity, rate: 0.14 },
  ],
  redundancyBaseAmount: 12524, redundancyServiceAmount: 6264,
};

export const PRESERVATION_AGE_TABLE = [
  { bornBefore: "1960-07-01", age: 55 },
  { bornBefore: "1961-07-01", bornFrom: "1960-07-01", age: 56 },
  { bornBefore: "1962-07-01", bornFrom: "1961-07-01", age: 57 },
  { bornBefore: "1963-07-01", bornFrom: "1962-07-01", age: 58 },
  { bornBefore: "1964-07-01", bornFrom: "1963-07-01", age: 59 },
  { bornFrom: "1964-07-01", age: 60 },
];

export const CENTRELINK = {
  ageQualifyingAge: 67,
  singleMaxPension: 29023, coupleMaxPension: 43752, illnessSeparatedMaxPension: 58046,
  singleAssetThresholdHomeowner: 301750, singleAssetThresholdNonHomeowner: 543750,
  coupleAssetThresholdHomeowner: 451500, coupleAssetThresholdNonHomeowner: 693500,
  illnessSepAssetThresholdHomeowner: 451500, illnessSepAssetThresholdNonHomeowner: 693500,
  singleAssetCutoffHomeowner: 672500, singleAssetCutoffNonHomeowner: 914500,
  coupleAssetCutoffHomeowner: 1012500, coupleAssetCutoffNonHomeowner: 1254500,
  assetTaperRate: 0.078,
  singleIncomeThreshold: 5512, coupleIncomeThreshold: 9776, illnessSepIncomeThreshold: 5512,
  incomeTaperRate: 0.50,
  workBonusFortnightlyExempt: 300, workBonusAnnualBank: 11800,
  deemingRateLower: 0.0025, deemingRateUpper: 0.0225,
  deemingThresholdSingle: 62600, deemingThresholdCouple: 103800,
  giftingFreeAreaPerYear: 10000, giftingFreeAreaFiveYear: 30000, giftingDeprivationPeriod: 5,
  rentAssistMaxSingle: 5443, rentAssistMaxCouple: 5126, rentAssistMinRentSingle: 2882, rentAssistMinRentCouple: 4665, rentAssistRate: 0.75,
};

export const ALLOWANCE = {
  jobSeekerSingleNoChildren: 20203, jobSeekerSingleWithChildren: 21717, jobSeekerCouplePerPerson: 18398,
  jobSeeker60Plus9Months: 21717,
  jobSeekerIncomeFreeArea: 3380, jobSeekerIncomeTaperBand1: 5876,
  jobSeekerTaperBand1Rate: 0.50, jobSeekerTaperBand2Rate: 0.60,
};

export const CSHC = {
  singleIncomeLimit: 95437, coupleIncomeLimit: 152696, illnessSeparatedLimit: 190874,
  perChildAdjustment: 639.60, deemingApplies: true,
};

export const AGED_CARE = {
  mpir: 0.0857,
  bill2013: {
    basicDailyFee: 21801, meansTestedCareFeeAnnualCap: 32718, meansTestedCareFeeLifetimeCap: 78524,
    incomeFreeAreaSingle: 32331, incomeFreeAreaCouple: 31694, incomeTaperRate: 0.50,
    assetFirstThreshold: 58500, assetSecondThreshold: 197735, assetThirdThreshold: 478239,
    assetTaperRate1: 0.175 / 1000, assetTaperRate2: 0.010, assetTaperRate3: 0.020,
    accommodationSupplementMax: 67.49 * 365, homeValueCapForAssetTest: 201231,
  },
  act2024: {
    basicDailyFee: 21801, hotelingSupplementMax: 12.55 * 365,
    nonClinicalCareContributionRate: 0.075, nonClinicalCareCap: 130000,
    accommodationContributionDailyMax: 152.03, accommodationSupplementMax: 67.49 * 365,
    incomeFreeAreaSingle: 32331, incomeFreeAreaCouple: 31694, incomeTaperRate: 0.50,
    assetFreeArea: 201231, assetTaperRate: 0.001, homeValueCapForAssetTest: 201231,
    rentDerivedFromHomeAssessable: true,
  },
  homeCarePackages: {
    levels: [10000, 17000, 37500, 56750], basicDailyFeeRate: 0.175,
    incomeTestedFeeMax: 17820, incomeTestedFeeAnnualCap: 17820, incomeTestedFeeLifetimeCap: 78524,
  },
};

export const INDEXATION = {
  CPI: 0.026, AWE: 0.035, PBLCI: 0.029,
  agePensionIndexation: 0.035, taxThresholdIndexation: 0,
  superCapIndexation: 0.035, centrelinkThresholdIndexation: 0.026,
  agedCareIndexation: 0.026, privateHealthIndexation: 0.05, utilitiesIndexation: 0.04,
  medicalIndexation: 0.045, educationIndexation: 0.04, travelIndexation: 0.025,
};

export const LIFE_EXPECTANCY = {
  male:   { 60: 84.3, 65: 84.9, 70: 85.7, 75: 86.7, 80: 88.0, 85: 89.6, 90: 91.6, 95: 93.9 },
  female: { 60: 87.3, 65: 87.7, 70: 88.2, 75: 88.9, 80: 89.9, 85: 91.2, 90: 92.9, 95: 95.0 },
};

export default {
  fyKey: FY_KEY, fyLabel: FY_LABEL, taxBrackets: TAX_BRACKETS, lito: LITO, sapto: SAPTO, medicare: MEDICARE,
  superParams: SUPER_PARAMS, preservationAgeTable: PRESERVATION_AGE_TABLE, centrelink: CENTRELINK,
  allowance: ALLOWANCE, cshc: CSHC, agedCare: AGED_CARE, indexation: INDEXATION, lifeExpectancy: LIFE_EXPECTANCY,
};
