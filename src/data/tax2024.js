export const DEFAULT_TAX_BRACKETS_2024 = [
  // 2025-26 FY (Stage 3 tax cuts — effective 1 July 2024, s.8 ITAA1997)
  { min: 0, max: 18200, rate: 0, label: "$0 – $18,200" },
  { min: 18201, max: 45000, rate: 0.16, label: "$18,201 – $45,000" },
  { min: 45001, max: 135000, rate: 0.30, label: "$45,001 – $135,000" },
  { min: 135001, max: 190000, rate: 0.37, label: "$135,001 – $190,000" },
  { min: 190001, max: Infinity, rate: 0.45, label: "$190,001+" },
];

// SIS Reg 1.06(9A) — minimum annual drawdown percentages for Account-Based Pensions.
// Age bands are inclusive of both minAge and maxAge. Editable in TaxTab if regs change.
// (Note: COVID-19 50% halving of these rates ended 30 Jun 2023; rates below are the standard schedule.)
export const DEFAULT_MIN_PENSION_DRAWDOWN_RATES = [
  { minAge: 0,  maxAge: 64,  rate: 0.04 }, // Under 65
  { minAge: 65, maxAge: 74,  rate: 0.05 }, // 65–74
  { minAge: 75, maxAge: 79,  rate: 0.06 }, // 75–79
  { minAge: 80, maxAge: 84,  rate: 0.07 }, // 80–84
  { minAge: 85, maxAge: 89,  rate: 0.09 }, // 85–89
  { minAge: 90, maxAge: 94,  rate: 0.11 }, // 90–94
  { minAge: 95, maxAge: Infinity, rate: 0.14 }, // 95+
];

export const DEFAULT_SUPER_PARAMS = {
  concessionalCap: 30000,        // 2025-26 FY
  nonConcessionalCap: 120000,    // 2025-26 FY (3x bring-forward = $360k)
  sgRate: 0.12,                  // 2025-26 SG rate (rises to 12%)
  preservationAge: 60,           // Preservation age since 1 Jul 2024
  taxRate: 0.15,                 // Accumulation earnings tax rate
  pensionTaxRate: 0.0,           // Tax-exempt earnings in pension phase
  ttrTaxRate: 0.15,              // TTR earnings taxed at 15% (not exempt)
  divisionTaxRate: 0.15,         // Division 293 threshold triggers at $250k
  div293Threshold: 250000,       // Division 293 threshold 2025-26
  div293Rate: 0.15,              // Extra 15% on concessional contributions
  transferBalanceCap: 1900000,   // TBC 2024-25 (indexed, ~$2M by 2025-26)
  // SIS Reg 1.06(9A) age-based minimum pension drawdown schedule.
  // The projection enforces Math.max(minForAge, userDrawdownPct) for ABP draws.
  minPensionDrawdownRates: DEFAULT_MIN_PENSION_DRAWDOWN_RATES,
  // SIS Act condition of release: no super access before this age in the model
  // (real-world hardship/incapacity provisions are out of scope).
  earliestSuperAccessAge: 60,
};

export const DEFAULT_CENTRELINK = {
  // 2025-26 FY rates (September 2025 indexed — updated 20 Mar 2025)
  singleMaxPension: 29754,       // $1,144.40/fn single incl. pension supplement & energy
  coupleMaxPension: 44962,       // $1,729.30/fn combined
  singleAssetThresholdHomeowner: 314000,     // 2025-26 lower threshold single homeowner
  coupleAssetThresholdHomeowner: 470000,     // 2025-26 lower threshold couple homeowner
  singleAssetThresholdNonHomeowner: 566000, // single non-homeowner
  coupleAssetThresholdNonHomeowner: 722000, // couple non-homeowner
  assetTaperRate: 0.078,         // $3/fn per $1,000 = $78/yr per $1,000 = 7.8% annual
  // Income test
  singleIncomeThreshold: 5512,   // Free area single 2025-26
  coupleIncomeThreshold: 9752,   // Free area couple combined 2025-26
  incomeTaperRate: 0.50,         // $0.50 reduction per $1 income above free area
  // Deeming rates (frozen until 30 Jun 2025 then may change)
  deemingRateLower: 0.0025,      // 0.25% on assets up to threshold
  deemingRateUpper: 0.0225,      // 2.25% on assets above threshold
  deemingThresholdSingle: 62600,
  deemingThresholdCouple: 103800,
  ageQualifyingAge: 67,
  // Gifting rules (Social Security Act s.1123-1130)
  giftingFreeAreaPerYear: 10000, // $10,000 per financial year
  giftingFreeAreaFiveYear: 30000,// $30,000 over rolling 5 years
  giftingDeprivationPeriod: 5,   // Assets count for 5 years from date of gift
};

export const DEFAULT_MEDICARE = { levyRate: 0.02, surchargeThresholdSingle: 93000, surchargeThresholdFamily: 186000, surchargeRate: 0.01 };
