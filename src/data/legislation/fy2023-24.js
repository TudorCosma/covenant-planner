// FY 2023-24 — historical reference set (pre Stage 3, SG 11.0%, LITO at $700/$66,667).
export const FY_LABEL = "FY23-24";
export const FY_KEY = "fy2023-24";

export const TAX_BRACKETS = [
  { min: 0,       max: 18200,   rate: 0,    label: "$0 – $18,200" },
  { min: 18201,   max: 45000,   rate: 0.19, label: "$18,201 – $45,000" },
  { min: 45001,   max: 120000,  rate: 0.325,label: "$45,001 – $120,000" },
  { min: 120001,  max: 180000,  rate: 0.37, label: "$120,001 – $180,000" },
  { min: 180001,  max: Infinity,rate: 0.45, label: "$180,001+" },
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
  shadeInSingle: 24276, shadeInFamily: 40939, shadeInDependentChild: 3760, shadeInRate: 0.10,
  shadeInSenior: 38365, shadeInSeniorFamily: 53406,
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
  sgRate: 0.11, maxSuperContribBase: 62270,
  concessionalCap: 27500, nonConcessionalCap: 110000, nonConcessionalBringForward3yr: 330000,
  carryForwardThreshold: 500000,
  taxRate: 0.15, pensionTaxRate: 0, ttrTaxRate: 0.15, divisionTaxRate: 0.15,
  div293Threshold: 250000, div293Rate: 0.15,
  transferBalanceCap: 1900000, totalSuperBalanceCap: 1900000,
  coContribMaxAmount: 500, coContribMatchRate: 0.50, coContribLowerThreshold: 43445, coContribUpperThreshold: 58445,
  spouseOffsetMax: 540, spouseOffsetMaxContrib: 3000, spouseOffsetLowerIncome: 37000, spouseOffsetUpperIncome: 40000,
  listoMax: 500, listoIncomeThreshold: 37000,
  preservationAge: 59, earliestSuperAccessAge: 59,
  lumpSumLowRateCap: 235000, lumpSumLowRateTax: 0.15,
  minPensionDrawdownRates: [
    { minAge: 0, maxAge: 64, rate: 0.04 }, { minAge: 65, maxAge: 74, rate: 0.05 },
    { minAge: 75, maxAge: 79, rate: 0.06 }, { minAge: 80, maxAge: 84, rate: 0.07 },
    { minAge: 85, maxAge: 89, rate: 0.09 }, { minAge: 90, maxAge: 94, rate: 0.11 },
    { minAge: 95, maxAge: Infinity, rate: 0.14 },
  ],
  redundancyBaseAmount: 11985, redundancyServiceAmount: 5994,
};

export const PRESERVATION_AGE_TABLE = [
  { bornBefore: "1960-07-01", age: 55 }, { bornBefore: "1961-07-01", bornFrom: "1960-07-01", age: 56 },
  { bornBefore: "1962-07-01", bornFrom: "1961-07-01", age: 57 }, { bornBefore: "1963-07-01", bornFrom: "1962-07-01", age: 58 },
  { bornBefore: "1964-07-01", bornFrom: "1963-07-01", age: 59 }, { bornFrom: "1964-07-01", age: 60 },
];

export const CENTRELINK = {
  ageQualifyingAge: 67,
  singleMaxPension: 28514, coupleMaxPension: 42988, illnessSeparatedMaxPension: 57027,
  singleAssetThresholdHomeowner: 301750, singleAssetThresholdNonHomeowner: 543750,
  coupleAssetThresholdHomeowner: 451500, coupleAssetThresholdNonHomeowner: 693500,
  illnessSepAssetThresholdHomeowner: 451500, illnessSepAssetThresholdNonHomeowner: 693500,
  singleAssetCutoffHomeowner: 656500, singleAssetCutoffNonHomeowner: 898500,
  coupleAssetCutoffHomeowner: 988000, coupleAssetCutoffNonHomeowner: 1230000,
  assetTaperRate: 0.078,
  singleIncomeThreshold: 5304, coupleIncomeThreshold: 9412, illnessSepIncomeThreshold: 5304,
  incomeTaperRate: 0.50,
  workBonusFortnightlyExempt: 300, workBonusAnnualBank: 11800,
  deemingRateLower: 0.0025, deemingRateUpper: 0.0225,
  deemingThresholdSingle: 60400, deemingThresholdCouple: 100200,
  giftingFreeAreaPerYear: 10000, giftingFreeAreaFiveYear: 30000, giftingDeprivationPeriod: 5,
  rentAssistMaxSingle: 5275, rentAssistMaxCouple: 4970, rentAssistMinRentSingle: 2796, rentAssistMinRentCouple: 4527, rentAssistRate: 0.75,
};

export const ALLOWANCE = {
  jobSeekerSingleNoChildren: 19560, jobSeekerSingleWithChildren: 21029, jobSeekerCouplePerPerson: 17813,
  jobSeeker60Plus9Months: 21029,
  jobSeekerIncomeFreeArea: 3380, jobSeekerIncomeTaperBand1: 5876,
  jobSeekerTaperBand1Rate: 0.50, jobSeekerTaperBand2Rate: 0.60,
};

export const CSHC = {
  singleIncomeLimit: 95437, coupleIncomeLimit: 152696, illnessSeparatedLimit: 190874,
  perChildAdjustment: 639.60, deemingApplies: true,
};

export const AGED_CARE = {
  mpir: 0.0838,
  bill2013: {
    basicDailyFee: 21193, meansTestedCareFeeAnnualCap: 32718, meansTestedCareFeeLifetimeCap: 78524,
    incomeFreeAreaSingle: 31479, incomeFreeAreaCouple: 30852, incomeTaperRate: 0.50,
    assetFirstThreshold: 57000, assetSecondThreshold: 193219, assetThirdThreshold: 467117,
    assetTaperRate1: 0.175 / 1000, assetTaperRate2: 0.010, assetTaperRate3: 0.020,
    accommodationSupplementMax: 65.49 * 365, homeValueCapForAssetTest: 197735,
  },
  act2024: null, // Act 2024 not yet in force during FY23-24
  homeCarePackages: {
    levels: [10000, 17000, 37500, 56750], basicDailyFeeRate: 0.175,
    incomeTestedFeeMax: 17453, incomeTestedFeeAnnualCap: 17453, incomeTestedFeeLifetimeCap: 78524,
  },
};

export const INDEXATION = {
  CPI: 0.036, AWE: 0.035, PBLCI: 0.038,
  agePensionIndexation: 0.038, taxThresholdIndexation: 0,
  superCapIndexation: 0.035, centrelinkThresholdIndexation: 0.036,
  agedCareIndexation: 0.036, privateHealthIndexation: 0.05, utilitiesIndexation: 0.05,
  medicalIndexation: 0.05, educationIndexation: 0.04, travelIndexation: 0.025,
};

export const LIFE_EXPECTANCY = {
  male:   { 60: 84.2, 65: 84.8, 70: 85.6, 75: 86.6, 80: 87.9, 85: 89.5, 90: 91.5, 95: 93.8 },
  female: { 60: 87.2, 65: 87.6, 70: 88.1, 75: 88.8, 80: 89.8, 85: 91.1, 90: 92.8, 95: 94.9 },
};

export default {
  fyKey: FY_KEY, fyLabel: FY_LABEL, taxBrackets: TAX_BRACKETS, lito: LITO, sapto: SAPTO, medicare: MEDICARE,
  superParams: SUPER_PARAMS, preservationAgeTable: PRESERVATION_AGE_TABLE, centrelink: CENTRELINK,
  allowance: ALLOWANCE, cshc: CSHC, agedCare: AGED_CARE, indexation: INDEXATION, lifeExpectancy: LIFE_EXPECTANCY,
};
