import { loadLegislation, DEFAULT_FY } from "./legislation";
import { DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "./returnProfiles";

const CURRENT_YEAR = new Date().getFullYear();

// Seed legislation snapshot from the FY registry (deep-cloned so user edits stay local).
const seedLegislation = loadLegislation(DEFAULT_FY);

// DEFAULT_STATE is intentionally BLANK of personal data — no sample client.
// Previously this held Michael & Sarah with $215k/$158k super, a $380k mortgage,
// $95k expenses etc. That demo data was confusing first-time users (Dashboard
// cards showed numbers that weren't theirs) and the wizard's whole point is to
// gather the user's real numbers, so a sample-client baseline is counter-productive.
//
// What's preserved here:
// - App config (legislationFY, proMode, agedCareModel, wizardCompleted=false).
// - Empty skeleton arrays for goals / loans / baseExpenses / futureExpenses / gifts /
//   lifetime income streams / investment bonds / reverse mortgages.
// - ONE placeholder row in lifestyleExpenses and lifestyleAssets — the wizard
//   writes into row index 0 of each, so they must exist (otherwise: crash).
// - Both person1 and person2 with blank names and birthYear undefined; isCouple
//   defaults to false (single is more common for a "fresh start" and the wizard
//   asks about partners on step 2 anyway).
// - Super + non-super buckets with zero balances (kept structurally so the
//   projection engine and tabs don't have to special-case missing keys).
// - Tax settings, return profiles, asset returns, cashflow rules — these are
//   sensible app-wide defaults, not client data.
export const DEFAULT_STATE = {
  // ----- Top-level config -----
  legislationFY: DEFAULT_FY,
  proMode: false,
  agedCareModel: "act2024",
  wizardCompleted: false,           // false → wizard auto-launches on first run

  // ----- User-set goals (V2) -----
  goals: [],

  personal: {
    isCouple: false,
    isHomeowner: false,
    hasPrivateHealth: false,
    illnessSeparated: false,
    dependentChildren: 0,
    inflationRate: 2.5,
    salaryGrowth: 3.0,
    projectionYears: 45,
    // birthYear default: 50yo today (a reasonable "I'm planning retirement" anchor).
    // The wizard asks for actual age on step 3; no name is set so the UI shows "You" / "Partner".
    person1: { name: "", birthYear: CURRENT_YEAR - 50, dob: "", gender: "M", employmentStatus: "employed", retirementAge: 65, lifeExpectancy: 87, residencyStatus: "resident" },
    person2: { name: "", birthYear: CURRENT_YEAR - 50, dob: "", gender: "F", employmentStatus: "employed", retirementAge: 65, lifeExpectancy: 90, residencyStatus: "resident" },
  },

  income: {
    person1: { salary: 0, salarySacrifice: 0, otherTaxable: 0, frankedDividends: 0, frankingPct: 100, rentalIncome: 0, taxFreeIncome: 0, personalDeductibleSuper: 0, nonConcessionalSuper: 0, reportableFringeBenefits: 0, capitalLossesCarriedForward: 0 },
    person2: { salary: 0, salarySacrifice: 0, otherTaxable: 0, frankedDividends: 0, frankingPct: 100, rentalIncome: 0, taxFreeIncome: 0, personalDeductibleSuper: 0, nonConcessionalSuper: 0, reportableFringeBenefits: 0, capitalLossesCarriedForward: 0 },
  },

  // ----- Per-person tax settings (overrides applied during projection) -----
  taxSettings: {
    frankingRefundEnabled: true,
    applyLITO: true,
    applySAPTO: true,
    applyMedicareShadeIn: true,
    applyMLSTiered: true,
    capitalGainsDiscountAfter12m: true,
    payAsYouGoWithholding: true,
  },

  assets: {
    superAccounts: {
      p1Super:   { balance: 0, taxFree: 0, profile: "G60", type: "accumulation", drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p1Pension: { balance: 0, taxFree: 0, profile: "G60", type: "pension",      drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p2Super:   { balance: 0, taxFree: 0, profile: "G60", type: "accumulation", drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p2Pension: { balance: 0, taxFree: 0, profile: "G60", type: "pension",      drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p1Extra: [],
      p2Extra: [],
    },
    nonSuper: {
      p1NonSuper: { balance: 0, unrealisedGains: 0, profile: "G60", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false, owner: "p1" },
      p2NonSuper: { balance: 0, unrealisedGains: 0, profile: "G30", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false, owner: "p2" },
      joint:      { balance: 0, unrealisedGains: 0, profile: "G0",  adminFee: 0, managementCost: 0.10, adviceCost: 0.00, isDirectProperty: false, owner: "joint" },
    },
    // ONE placeholder row so the wizard's home step (writes to index 0) doesn't crash.
    // value: 0 + isPrimaryResidence: true matches what the wizard expects.
    lifestyleAssets: [
      { description: "Principal Residence", value: 0, growth: 4.0, isPrimaryResidence: true, downsizeYear: 0, downsizeProceeds: 0, downsizeAllocateTo: "joint" },
    ],
    loans: [],
    lifetimeIncomeStreams: [],
    investmentBonds: [],
    reverseMortgages: [],
  },

  expenses: {
    // ONE placeholder row so the wizard's expenses step (writes to index 0) doesn't crash.
    lifestyleExpenses: [
      { description: "Living Costs", amount: 0, indexation: 2.5, indexationBucket: "cpi", startYear: CURRENT_YEAR, endYear: CURRENT_YEAR + 45 },
    ],
    baseExpenses: [],
    futureExpenses: [],
    agedCareExpenses: [],
  },

  gifts: [],

  // ----- Active legislation snapshot — replaced when FY changes -----
  legislation: seedLegislation,

  // ----- Indexation overrides — start empty; user edits land in state.legislation.indexation -----
  indexationOverrides: {},

  returnProfiles: DEFAULT_RETURN_PROFILES,
  assetReturns: DEFAULT_ASSET_RETURNS,

  cashflowRules: {
    cashRate: 4.5,
    debtMargin: 3.0,
    openingCash: 0,
    openingDebt: 0,
    surplusDestination: "cash",
    deficitStep1: "cash",
    deficitStep2: "nonSuper",
    deficitStep3: "debt",
  },
};
