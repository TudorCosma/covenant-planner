// Australian financial year 2025-26 legislative parameters.
// All values reflect rules effective 1 July 2025. User-editable in the Legislation tab.
// Sources: ATO, Centrelink (Services Australia), APRA, ITAA 1936/1997, SIS Act/Reg, Health Insurance Act.

export const FY_LABEL = "FY25-26";
export const FY_KEY = "fy2025-26";

// ----- Income Tax (ITAA 1997 s.4-10, Sch 7) — Stage 3 (effective 1 Jul 2024 onward) -----
export const TAX_BRACKETS = [
  { min: 0,       max: 18200,   rate: 0,    label: "$0 – $18,200" },
  { min: 18201,   max: 45000,   rate: 0.16, label: "$18,201 – $45,000" },
  { min: 45001,   max: 135000,  rate: 0.30, label: "$45,001 – $135,000" },
  { min: 135001,  max: 190000,  rate: 0.37, label: "$135,001 – $190,000" },
  { min: 190001,  max: Infinity,rate: 0.45, label: "$190,001+" },
];

// ----- Low Income Tax Offset (LITO) — ITAA 1936 s.159N -----
export const LITO = {
  max: 700,
  fullThreshold: 37500,
  taper1Rate: 0.05,   // 5c per $1 above $37,500
  taper1Limit: 45000,
  taper2Rate: 0.015,  // 1.5c per $1 above $45,000
  cutoff: 66667,
};

// ----- Seniors & Pensioners Tax Offset (SAPTO) — ITAA 1936 s.160AAAA -----
export const SAPTO = {
  single: { max: 2230, shadeIn: 32279, cutoff: 50119, taperRate: 0.125 },
  couple: { max: 1602, shadeIn: 28974, cutoff: 41790, taperRate: 0.125 }, // per person
  illnessSeparated: { max: 2040, shadeIn: 31279, cutoff: 47599, taperRate: 0.125 },
};

// ----- Medicare Levy & Surcharge (Health Insurance Act 1973 s.8B; Medicare Levy Act 1986) -----
export const MEDICARE = {
  levyRate: 0.02,
  // Low-income shade-in (s.8) — levy is 0 below threshold, phases in at 10c/$ above to full rate.
  shadeInSingle: 27222,
  shadeInFamily: 45907,
  shadeInDependentChild: 4216, // extra per dependent
  shadeInRate: 0.10,
  // Seniors shade-in (higher thresholds for those eligible for SAPTO)
  shadeInSenior: 43020,
  shadeInSeniorFamily: 59886,
  // Medicare Levy Surcharge — tiered, only if no private hospital cover.
  surchargeBrackets: [
    { minSingle: 0,      maxSingle: 93000,   minFamily: 0,      maxFamily: 186000,  rate: 0.000 },
    { minSingle: 93001,  maxSingle: 108000,  minFamily: 186001, maxFamily: 216000,  rate: 0.010 },
    { minSingle: 108001, maxSingle: 144000,  minFamily: 216001, maxFamily: 288000,  rate: 0.0125 },
    { minSingle: 144001, maxSingle: Infinity,minFamily: 288001, maxFamily: Infinity,rate: 0.015 },
  ],
  familyThresholdPerChild: 1500, // family threshold raised by this per dependent child after the first
  // Legacy fields retained for backward compatibility
  surchargeThresholdSingle: 93000,
  surchargeThresholdFamily: 186000,
  surchargeRate: 0.01,
};

// ----- Superannuation parameters (SIS Act/Reg, ITAA 1997 Div 290-295) -----
export const SUPER_PARAMS = {
  sgRate: 0.12,                       // 1 Jul 2025: 12% (final SG step-up)
  maxSuperContribBase: 65070,         // quarterly equivalent; SG ceiling annual basis (FY25-26 indicative)
  concessionalCap: 30000,             // Div 291
  nonConcessionalCap: 120000,         // Div 292
  nonConcessionalBringForward3yr: 360000, // 3x bring-forward
  carryForwardThreshold: 500000,      // TSB threshold for carry-forward unused concessional cap
  taxRate: 0.15,                      // Contributions tax on concessional
  pensionTaxRate: 0.00,               // Earnings in retirement phase
  ttrTaxRate: 0.15,                   // TTR earnings taxed at 15% from 1 Jul 2017
  divisionTaxRate: 0.15,
  div293Threshold: 250000,
  div293Rate: 0.15,
  transferBalanceCap: 2000000,        // TBC indexed to $2.0m for FY25-26
  totalSuperBalanceCap: 2000000,      // general TSB cap matches TBC for NCC eligibility
  // Government super co-contribution (ITAA 1997 Div 290 Subdiv 290-D)
  coContribMaxAmount: 500,
  coContribMatchRate: 0.50,           // 50c per $1 of personal non-deductible contributions
  coContribLowerThreshold: 47488,
  coContribUpperThreshold: 62488,
  // Spouse contribution tax offset (ITAA 1997 s.290-235)
  spouseOffsetMax: 540,               // 18% of $3,000
  spouseOffsetMaxContrib: 3000,
  spouseOffsetLowerIncome: 37000,
  spouseOffsetUpperIncome: 40000,
  // Low Income Super Tax Offset (LISTO)
  listoMax: 500,
  listoIncomeThreshold: 37000,
  // Preservation age — anyone born on/after 1 Jul 1964 has age 60. Older cohorts in PRESERVATION_AGE_TABLE.
  preservationAge: 60,
  earliestSuperAccessAge: 60,
  // Lump sum low-rate cap (taxable component, age 55–59) — ITAA 1997 s.301-20
  lumpSumLowRateCap: 245000,
  lumpSumLowRateTax: 0.15,            // tax above low-rate cap up to untaxed-plan cap
  // ABP minimum drawdown schedule (SIS Reg 1.06(9A))
  minPensionDrawdownRates: [
    { minAge: 0,  maxAge: 64,        rate: 0.04 },
    { minAge: 65, maxAge: 74,        rate: 0.05 },
    { minAge: 75, maxAge: 79,        rate: 0.06 },
    { minAge: 80, maxAge: 84,        rate: 0.07 },
    { minAge: 85, maxAge: 89,        rate: 0.09 },
    { minAge: 90, maxAge: 94,        rate: 0.11 },
    { minAge: 95, maxAge: Infinity,  rate: 0.14 },
  ],
  // Genuine redundancy tax-free amount (ITAA 1997 s.83-170)
  redundancyBaseAmount: 12524,
  redundancyServiceAmount: 6264,      // per completed year of service
};

// Preservation age by date-of-birth band (kept for backward compat with older clients).
export const PRESERVATION_AGE_TABLE = [
  { bornBefore: "1960-07-01",                  age: 55 },
  { bornBefore: "1961-07-01", bornFrom: "1960-07-01", age: 56 },
  { bornBefore: "1962-07-01", bornFrom: "1961-07-01", age: 57 },
  { bornBefore: "1963-07-01", bornFrom: "1962-07-01", age: 58 },
  { bornBefore: "1964-07-01", bornFrom: "1963-07-01", age: 59 },
  { bornFrom:   "1964-07-01",                  age: 60 },
];

// ----- Centrelink (Social Security Act 1991) — Sep 2025 indexation -----
export const CENTRELINK = {
  ageQualifyingAge: 67,
  singleMaxPension: 29754,
  coupleMaxPension: 44862,
  illnessSeparatedMaxPension: 59508, // both members combined
  // Assets test thresholds (lower / disqualifying)
  singleAssetThresholdHomeowner:        314000,
  singleAssetThresholdNonHomeowner:     566000,
  coupleAssetThresholdHomeowner:        470000,
  coupleAssetThresholdNonHomeowner:     722000,
  illnessSepAssetThresholdHomeowner:    470000,
  illnessSepAssetThresholdNonHomeowner: 722000,
  // Cut-off (disqualifying) — needed for taper sanity checks
  singleAssetCutoffHomeowner:        697000,
  singleAssetCutoffNonHomeowner:     949000,
  coupleAssetCutoffHomeowner:       1047500,
  coupleAssetCutoffNonHomeowner:    1299500,
  assetTaperRate: 0.078,
  // Income test
  singleIncomeThreshold: 5512,
  coupleIncomeThreshold: 9776,
  illnessSepIncomeThreshold: 5512,    // applied per person
  incomeTaperRate: 0.50,
  // Work bonus (employment income only)
  workBonusFortnightlyExempt: 300,
  workBonusAnnualBank: 11800,
  // Deeming (frozen rates extended; reassessed by govt)
  deemingRateLower: 0.0025,
  deemingRateUpper: 0.0225,
  deemingThresholdSingle: 64200,
  deemingThresholdCouple: 106200,
  // Gifting (Social Security Act s.1123-1130)
  giftingFreeAreaPerYear: 10000,
  giftingFreeAreaFiveYear: 30000,
  giftingDeprivationPeriod: 5,
  // Rent assistance (single, no children, indicative; user-editable)
  rentAssistMaxSingle: 5598,
  rentAssistMaxCouple: 5273,          // combined
  rentAssistMinRentSingle: 3026,
  rentAssistMinRentCouple: 4894,
  rentAssistRate: 0.75,
};

// ----- JobSeeker / allowances (Social Security Act 1991 s.595-643) -----
export const ALLOWANCE = {
  jobSeekerSingleNoChildren: 20644,
  jobSeekerSingleWithChildren: 22217,
  jobSeekerCouplePerPerson: 18807,
  jobSeeker60Plus9Months: 22217,
  // Income tests
  jobSeekerIncomeFreeArea: 3380,      // annual
  jobSeekerIncomeTaperBand1: 5876,    // up to here, $0.50 in $1
  jobSeekerTaperBand1Rate: 0.50,
  jobSeekerTaperBand2Rate: 0.60,
  // Asset tests use same Centrelink thresholds (see CENTRELINK above)
};

// ----- Commonwealth Seniors Health Card (CSHC) — ITAA 1997 / Social Security Act -----
export const CSHC = {
  singleIncomeLimit: 99025,
  coupleIncomeLimit: 158440,           // combined
  illnessSeparatedLimit: 198050,       // combined
  perChildAdjustment: 639.60,
  // Income test uses adjusted taxable income + deemed income from account-based pensions started post 1/1/2015
  deemingApplies: true,
};

// ----- Aged Care — defaults for both the historical "Aged Care Act 1997 (Bill 2013 reforms)"
// and the new Aged Care Act 2024 (commenced 1 Jul 2025). User picks which model via toggle. -----
export const AGED_CARE = {
  // MPIR — Maximum Permissible Interest Rate (Sep 2025 indicative). Used to convert
  // a RAD ↔ DAP and to gross-up partial RAD payments.
  mpir: 0.0834,
  // ----- Aged Care Act 1997 (legacy "Bill 2013" reforms) -----
  bill2013: {
    basicDailyFee: 22360,             // 85% of single age pension (indicative annual)
    meansTestedCareFeeAnnualCap: 33309,
    meansTestedCareFeeLifetimeCap: 79942,
    // Means-tested amount formula: 50% × (income above threshold) + asset taper
    incomeFreeAreaSingle: 33735,
    incomeFreeAreaCouple: 33108,
    incomeTaperRate: 0.50,
    assetFirstThreshold: 61500,
    assetSecondThreshold: 197735,
    assetThirdThreshold: 478239,
    assetTaperRate1: 0.175 / 1000,    // applied per $1
    assetTaperRate2: 0.010,           // legacy fall-through
    assetTaperRate3: 0.020,
    accommodationSupplementMax: 70.94 * 365,
    homeValueCapForAssetTest: 206039, // capped value of former PPR
  },
  // ----- Aged Care Act 2024 (commenced 1 Jul 2025) -----
  act2024: {
    basicDailyFee: 22360,
    hotelingSupplementMax: 12.55 * 365,
    nonClinicalCareContributionRate: 0.075, // person contributes 7.5% of non-clinical care
    nonClinicalCareCap: 130000,        // lifetime cap
    accommodationContributionDailyMax: 152.03,
    accommodationSupplementMax: 70.94 * 365,
    incomeFreeAreaSingle: 33735,
    incomeFreeAreaCouple: 33108,
    incomeTaperRate: 0.50,
    assetFreeArea: 206039,
    assetTaperRate: 0.001,             // simplified single taper
    homeValueCapForAssetTest: 206039,
    rentDerivedFromHomeAssessable: true, // major change vs Bill 2013
  },
  homeCarePackages: {
    levels: [10000, 17000, 37500, 56750], // indicative annual subsidy per package level 1–4
    basicDailyFeeRate: 0.175,             // 17.5% of single basic age pension
    incomeTestedFeeMax: 18250,
    incomeTestedFeeAnnualCap: 18250,
    incomeTestedFeeLifetimeCap: 79942,
  },
};

// ----- Indexation defaults (used for the Indexation panel) -----
export const INDEXATION = {
  CPI: 0.025,
  AWE: 0.035,            // Average Weekly Earnings
  PBLCI: 0.028,          // Pensioner & Beneficiary Living Cost Index (Centrelink indexation reference)
  // Specific buckets
  agePensionIndexation: 0.035,   // greater of CPI / PBLCI then benchmarked to MTAWE
  taxThresholdIndexation: 0.0,   // brackets do not index automatically
  superCapIndexation: 0.035,     // AWOTE-linked
  centrelinkThresholdIndexation: 0.025,
  agedCareIndexation: 0.025,
  privateHealthIndexation: 0.05,
  utilitiesIndexation: 0.04,
  medicalIndexation: 0.045,
  educationIndexation: 0.040,
  travelIndexation: 0.025,
};

// ----- Life expectancy (ABS Life Tables 2020-22, projected to FY25-26) -----
// Used by Lifetime Income Stream valuation and Aged Care projections.
export const LIFE_EXPECTANCY = {
  male:   { 60: 84.3, 65: 84.9, 70: 85.7, 75: 86.7, 80: 88.0, 85: 89.6, 90: 91.6, 95: 93.9 },
  female: { 60: 87.3, 65: 87.7, 70: 88.2, 75: 88.9, 80: 89.9, 85: 91.2, 90: 92.9, 95: 95.0 },
};

// Convenience: full default legislation object used in defaultState and FY registry.
export default {
  fyKey: FY_KEY,
  fyLabel: FY_LABEL,
  taxBrackets: TAX_BRACKETS,
  lito: LITO,
  sapto: SAPTO,
  medicare: MEDICARE,
  superParams: SUPER_PARAMS,
  preservationAgeTable: PRESERVATION_AGE_TABLE,
  centrelink: CENTRELINK,
  allowance: ALLOWANCE,
  cshc: CSHC,
  agedCare: AGED_CARE,
  indexation: INDEXATION,
  lifeExpectancy: LIFE_EXPECTANCY,
};
