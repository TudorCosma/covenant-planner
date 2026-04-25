import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from './tax2024';
import { DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from './returnProfiles';

const CURRENT_YEAR = new Date().getFullYear();

export const DEFAULT_STATE = {
  personal: {
    isCouple: true,
    isHomeowner: true,
    hasPrivateHealth: true,
    inflationRate: 2.5,
    salaryGrowth: 3.0,
    projectionYears: 45,
    person1: { name: "Michael", birthYear: 1973, dob: "1973-04-15", gender: "M", employmentStatus: "employed", retirementAge: 67, lifeExpectancy: 87 },
    person2: { name: "Sarah",   birthYear: 1975, dob: "1975-09-22", gender: "F", employmentStatus: "employed", retirementAge: 65, lifeExpectancy: 90 },
  },
  income: {
    person1: { salary: 105000, salarySacrifice: 6000, otherTaxable: 0, frankedDividends: 1200, rentalIncome: 0, taxFreeIncome: 0, personalDeductibleSuper: 0, nonConcessionalSuper: 0 },
    person2: { salary: 72000,  salarySacrifice: 3000, otherTaxable: 0, frankedDividends: 800,  rentalIncome: 0, taxFreeIncome: 0, personalDeductibleSuper: 0, nonConcessionalSuper: 0 },
  },
  assets: {
    superAccounts: {
      p1Super:   { balance: 215000, taxFree: 0, profile: "Balanced", type: "accumulation", drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p1Pension: { balance: 0,      taxFree: 0, profile: "Balanced", type: "pension",      drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p2Super:   { balance: 158000, taxFree: 0, profile: "Balanced", type: "accumulation", drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p2Pension: { balance: 0,      taxFree: 0, profile: "Balanced", type: "pension",      drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p1Extra: [],
      p2Extra: [],
    },
    nonSuper: {
      p1NonSuper: { balance: 18000, unrealisedGains: 2500, profile: "Balanced",     adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false, owner: "p1" },
      p2NonSuper: { balance: 12000, unrealisedGains: 1500, profile: "Conservative", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false, owner: "p2" },
      joint:      { balance: 35000, unrealisedGains: 0,    profile: "Cash",         adminFee: 0, managementCost: 0.10, adviceCost: 0.00, isDirectProperty: false, owner: "joint" },
    },
    lifestyleAssets: [
      { description: "Principal Residence", value: 950000, growth: 4.0, isPrimaryResidence: true,  downsizeYear: 0, downsizeProceeds: 0, downsizeAllocateTo: "joint" },
      { description: "Family Car (SUV)",    value: 38000,  growth: -8.0, isPrimaryResidence: false },
      { description: "Second Car",          value: 16000,  growth: -8.0, isPrimaryResidence: false },
      { description: "Contents & Furniture", value: 45000, growth: 0,    isPrimaryResidence: false },
    ],
    loans: [
      {
        description: "Home Mortgage",
        balance: 380000,
        variableRate: 6.24,
        fixedRate: 5.99,
        fixedTermMonths: 0,
        termMonths: 240,
        repaymentType: "pi",
        frequency: "monthly",
        extraRepayment: 0,
        deductible: false,
        owner: "joint",
        linkedAsset: "lifestyle_0",
        p1Pct: 50,
        p2Pct: 50,
      },
      {
        description: "Car Loan (SUV)",
        balance: 22000,
        variableRate: 8.49,
        fixedRate: 8.49,
        fixedTermMonths: 0,
        termMonths: 60,
        repaymentType: "pi",
        frequency: "monthly",
        extraRepayment: 0,
        deductible: false,
        owner: "joint",
        linkedAsset: "lifestyle_1",
        p1Pct: 50,
        p2Pct: 50,
      },
      {
        description: "Credit Card",
        balance: 4500,
        variableRate: 19.99,
        fixedRate: 19.99,
        fixedTermMonths: 0,
        termMonths: 36,
        repaymentType: "pi",
        frequency: "monthly",
        extraRepayment: 0,
        deductible: false,
        owner: "joint",
        linkedAsset: "",
        p1Pct: 50,
        p2Pct: 50,
      },
    ],
  },
  expenses: {
    lifestyleExpenses: [
      { description: "Pre-Retirement Living",       amount: 95000, indexation: 2.5, startYear: CURRENT_YEAR,     endYear: CURRENT_YEAR + 13 },
      { description: "Retirement — Go-Go Years",     amount: 75000, indexation: 2.5, startYear: CURRENT_YEAR + 14, endYear: CURRENT_YEAR + 24 },
      { description: "Retirement — Slow-Go Years",   amount: 58000, indexation: 2.0, startYear: CURRENT_YEAR + 25, endYear: CURRENT_YEAR + 35 },
      { description: "Retirement — No-Go Years",     amount: 45000, indexation: 1.5, startYear: CURRENT_YEAR + 36, endYear: CURRENT_YEAR + 45 },
    ],
    baseExpenses: [
      { description: "Council Rates",         amount: 3200, type: "essential",  indexation: 3.5, startYear: CURRENT_YEAR, endYear: CURRENT_YEAR + 45 },
      { description: "Home & Contents Insurance", amount: 2400, type: "essential", indexation: 5.0, startYear: CURRENT_YEAR, endYear: CURRENT_YEAR + 45 },
      { description: "Private Health Insurance", amount: 4800, type: "essential", indexation: 4.0, startYear: CURRENT_YEAR, endYear: CURRENT_YEAR + 45 },
      { description: "Utilities (Electricity, Gas, Water)", amount: 4200, type: "essential", indexation: 3.0, startYear: CURRENT_YEAR, endYear: CURRENT_YEAR + 45 },
      { description: "Annual Family Holiday", amount: 9000, type: "desirable", indexation: 2.5, startYear: CURRENT_YEAR, endYear: CURRENT_YEAR + 20 },
    ],
    futureExpenses: [
      { description: "Car Replacement",       amount: 45000, startYear: CURRENT_YEAR + 6,  endYear: CURRENT_YEAR + 6,  indexation: 2.5, type: "desirable" },
      { description: "Home Renovation",       amount: 60000, startYear: CURRENT_YEAR + 4,  endYear: CURRENT_YEAR + 4,  indexation: 2.5, type: "desirable" },
      { description: "Overseas Trip (Retirement)", amount: 25000, startYear: CURRENT_YEAR + 14, endYear: CURRENT_YEAR + 14, indexation: 2.5, type: "desirable" },
    ],
  },
  gifts: [{ description: "Gift to family", amount: 0, date: new Date().toISOString().split("T")[0], recipient: "Family" }],
  legislation: {
    taxBrackets: DEFAULT_TAX_BRACKETS_2024,
    superParams: DEFAULT_SUPER_PARAMS,
    centrelink: DEFAULT_CENTRELINK,
    medicare: DEFAULT_MEDICARE,
  },
  returnProfiles: DEFAULT_RETURN_PROFILES,
  assetReturns: DEFAULT_ASSET_RETURNS,
  cashflowRules: {
    cashRate: 4.5,             // % p.a. earned on POSITIVE cash account balance
    debtMargin: 3.0,           // % p.a. added to cash rate for the debt account
    openingCash: 15000,        // starting balance of the cash buffer account (emergency fund)
    openingDebt: 0,            // starting balance of the cashflow debt account
    surplusDestination: "cash", // "cash" | "nonSuper" | "debt" (pay down debt first)
    deficitStep1: "cash",      // first source for funding deficits
    deficitStep2: "nonSuper",  // second source (drawn proportionally across non-super pools)
    deficitStep3: "debt",      // last resort (creates / grows debt account)
  },
};
