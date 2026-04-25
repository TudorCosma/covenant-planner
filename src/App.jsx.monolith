import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";

// ============================================================
// AUSTRALIAN TAX & LEGISLATION DATA (Editable Page)
// ============================================================
const DEFAULT_TAX_BRACKETS_2024 = [
  // 2025-26 FY (Stage 3 tax cuts — effective 1 July 2024, s.8 ITAA1997)
  { min: 0, max: 18200, rate: 0, label: "$0 – $18,200" },
  { min: 18201, max: 45000, rate: 0.16, label: "$18,201 – $45,000" },
  { min: 45001, max: 135000, rate: 0.30, label: "$45,001 – $135,000" },
  { min: 135001, max: 190000, rate: 0.37, label: "$135,001 – $190,000" },
  { min: 190001, max: Infinity, rate: 0.45, label: "$190,001+" },
];

const DEFAULT_SUPER_PARAMS = {
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
};

const DEFAULT_CENTRELINK = {
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

const DEFAULT_MEDICARE = { levyRate: 0.02, surchargeThresholdSingle: 93000, surchargeThresholdFamily: 186000, surchargeRate: 0.01 };

const DEFAULT_RETURN_PROFILES = {
  "Cash":        { cash: 1.00, auFixedInt: 0.00, intFixedInt: 0.00, property: 0.00, auShares: 0.00, intShares: 0.00, emergingMkt: 0.00, other: 0.00 },
  "Defensive":   { cash: 0.10, auFixedInt: 0.25, intFixedInt: 0.15, property: 0.05, auShares: 0.20, intShares: 0.15, emergingMkt: 0.05, other: 0.05 },
  "Conservative":{ cash: 0.08, auFixedInt: 0.20, intFixedInt: 0.12, property: 0.10, auShares: 0.25, intShares: 0.15, emergingMkt: 0.05, other: 0.05 },
  "Balanced":    { cash: 0.05, auFixedInt: 0.15, intFixedInt: 0.10, property: 0.12, auShares: 0.28, intShares: 0.18, emergingMkt: 0.07, other: 0.05 },
  "Growth":      { cash: 0.03, auFixedInt: 0.10, intFixedInt: 0.07, property: 0.14, auShares: 0.32, intShares: 0.20, emergingMkt: 0.09, other: 0.05 },
  "Aggressive":  { cash: 0.02, auFixedInt: 0.05, intFixedInt: 0.03, property: 0.15, auShares: 0.35, intShares: 0.22, emergingMkt: 0.13, other: 0.05 },
};

const DEFAULT_ASSET_RETURNS = {
  cash: { income: 0.045, growth: 0.0, volatility: 0.005 },
  auFixedInt: { income: 0.04, growth: 0.015, volatility: 0.04 },
  intFixedInt: { income: 0.035, growth: 0.01, volatility: 0.05 },
  property: { income: 0.04, growth: 0.04, volatility: 0.10 },
  auShares: { income: 0.04, growth: 0.055, volatility: 0.15 },
  intShares: { income: 0.02, growth: 0.06, volatility: 0.16 },
  emergingMkt: { income: 0.015, growth: 0.07, volatility: 0.22 },
  other: { income: 0.03, growth: 0.04, volatility: 0.12 },
};

const ASSET_LABELS = { cash: "Cash", auFixedInt: "AU Fixed Interest", intFixedInt: "Int'l Fixed Interest", property: "Property", auShares: "AU Shares", intShares: "Int'l Shares", emergingMkt: "Emerging Markets", other: "Other" };

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const fmt = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v < 0 ? "-" : "") + "$" + (abs / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (v < 0 ? "-" : "") + "$" + Math.round(abs).toLocaleString();
  return (v < 0 ? "-" : "") + "$" + Math.round(abs);
};

const pct = (v) => (v * 100).toFixed(1) + "%";

function calcIncomeTax(taxableIncome, brackets) {
  let tax = 0;
  for (const b of brackets) {
    if (taxableIncome <= 0) break;
    const upper = b.max === Infinity ? taxableIncome : Math.min(taxableIncome, b.max) - b.min + 1;
    const inBracket = Math.min(Math.max(0, upper), taxableIncome - b.min + 1);
    if (inBracket > 0 && taxableIncome > b.min) {
      const amount = Math.min(inBracket, taxableIncome - b.min);
      tax += amount * b.rate;
    }
  }
  // Simplified progressive calc
  let remaining = taxableIncome;
  tax = 0;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const bracketWidth = b.max === Infinity ? remaining : b.max - b.min + 1;
    const taxable = Math.min(remaining, bracketWidth);
    tax += taxable * b.rate;
    remaining -= taxable;
  }
  return Math.max(0, tax);
}

function calcMedicare(income, params) {
  return income * params.levyRate;
}

function boxMullerRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Centrelink gifting deprivation: gifts over allowable amounts count as assets for 5 years
function calcDeprivedAssets(gifts, projectionYear, params) {
  if (!gifts || !gifts.length) return 0;
  const cl = params || DEFAULT_CENTRELINK;
  const freePerYear = cl.giftingFreeAreaPerYear || 10000;
  const freeOver5 = cl.giftingFreeAreaFiveYear || 30000;
  const deprivationYears = cl.giftingDeprivationPeriod || 5;

  const getGiftDate = (g) => {
    if (g.date) return new Date(g.date);
    return new Date(`${g.year || projectionYear}-07-01`);
  };

  // Current assessment date — start of the projection year's FY
  const assessDate = new Date(`${projectionYear}-07-01`);

  // Sort gifts by date
  const sorted = [...gifts].sort((a, b) => getGiftDate(a) - getGiftDate(b));

  // Group by financial year (FY starts 1 July)
  const byFY = {};
  sorted.forEach(g => {
    const d = getGiftDate(g);
    // FY key: the year July starts (e.g. July 2025 = FY2025)
    const fy = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
    byFY[fy] = (byFY[fy] || 0) + (g.amount || 0);
  });

  let totalDeprived = 0;
  let cumulativeAllowed5Yr = 0;

  Object.entries(byFY).sort(([a],[b]) => a-b).forEach(([fy, totalInFY]) => {
    const fyStartDate = new Date(`${parseInt(fy)}-07-01`);
    const expiryDate = new Date(fyStartDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + deprivationYears);

    // Gift has expired — no longer assessed
    if (assessDate >= expiryDate) return;

    // Annual allowance remaining within the 5-year rolling cap
    const annualAllowance = Math.min(freePerYear, Math.max(0, freeOver5 - cumulativeAllowed5Yr));
    const exempt = Math.min(totalInFY, annualAllowance);
    const deprived = Math.max(0, totalInFY - exempt);
    totalDeprived += deprived;
    cumulativeAllowed5Yr += exempt;
  });

  return totalDeprived;
}

function calcCentrelinkPension(financialAssets, deemedIncome, isCouple, isHomeowner, params, age1, age2, otherIncome, deprivedAssets) {
  const q = params.ageQualifyingAge || 67;

  // Determine who qualifies
  const p1Qualifies = age1 >= q;
  const p2Qualifies = isCouple && (age2 >= q);
  if (!p1Qualifies && !p2Qualifies) return 0;

  // If couple but only one partner qualifies, that person gets singles rate
  // (SSA 1991: each member assessed separately until partner qualifies)
  const bothQualify = isCouple && p1Qualifies && p2Qualifies;
  const effectiveCouple = bothQualify; // couple rate only when both qualify
  const maxPension = effectiveCouple ? params.coupleMaxPension : params.singleMaxPension;
  const assetThreshold = effectiveCouple
    ? (isHomeowner ? (params.coupleAssetThresholdHomeowner || 470000) : (params.coupleAssetThresholdNonHomeowner || 722000))
    : (isHomeowner ? (params.singleAssetThresholdHomeowner || 314000) : (params.singleAssetThresholdNonHomeowner || 566000));
  const incomeThreshold = effectiveCouple ? (params.coupleIncomeThreshold || 9752) : (params.singleIncomeThreshold || 5512);

  // Check if already on full pension WITHOUT deprivation (gifts irrelevant if so)
  const excessAssetsBase = Math.max(0, financialAssets - assetThreshold);
  const assetReductionBase = excessAssetsBase * (params.assetTaperRate || 0.03);
  const totalIncome = deemedIncome + (otherIncome || 0);
  const excessIncomeBase = Math.max(0, totalIncome - incomeThreshold);
  const incomeReductionBase = excessIncomeBase * (params.incomeTaperRate || 0.50);
  const isAlreadyFullPension = Math.max(assetReductionBase, incomeReductionBase) === 0;

  // Only add deprived assets if NOT already on full pension
  const totalAssets = isAlreadyFullPension ? financialAssets : financialAssets + (deprivedAssets || 0);

  // Assets test (SSA 1991 s.1118)
  const excessAssets = Math.max(0, totalAssets - assetThreshold);
  const assetReduction = excessAssets * (params.assetTaperRate || 0.03);

  // Income test (SSA 1991 s.1067) — lower of both tests applies
  const excessIncome = Math.max(0, totalIncome - incomeThreshold);
  const incomeReduction = excessIncome * (params.incomeTaperRate || 0.50);

  return Math.max(0, maxPension - Math.max(assetReduction, incomeReduction));
}

function calcDeemedIncome(financialAssets, isCouple, params) {
  const threshold = isCouple ? params.deemingThresholdCouple : params.deemingThresholdSingle;
  const lower = Math.min(financialAssets, threshold);
  const upper = Math.max(0, financialAssets - threshold);
  return lower * params.deemingRateLower + upper * params.deemingRateUpper;
}

// ============================================================
// COMPONENTS
// ============================================================
const COVENANT_LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAABNqgAwAEAAAAAQAAAbIAAAAA/8AAEQgBsgTaAwERAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAQEBAQEBAgEBAgMCAgIDBQMDAwMFBgUFBQUFBgcGBgYGBgYHBwcHBwcHBwgICAgICAoKCgoKCwsLCwsLCwsLC//bAEMBAgICAwMDBQMDBQwIBggMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDP/dAAQAnP/aAAwDAQACEQMRAD8A/D+v0w/jMKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD/0Pw/r9MP4zCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoA/9H8P6/TD+MwoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/S/D+v0w/jMKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD/0/w/r9MP4zCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoA/9T8P6/TD+MwoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/V/D+v0w/jMKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgDvtA+FvxC8UhT4e0m4u93TyxmuGvmWFo/xaiR6mFyTHYn/d6Ll6H0d4Q/Yc+M/ihVe8tW0zcM4nQ8fka+exfGmX0XaMub0Z9hgPDPN8SrzjyeqPoTw9/wTI8YvGJ9b1q1IbB2hXBH614NfxJw6fLTpP8AA+swfgvi2uatXj9zPcNG/wCCbfgG3ydcnaUbR9x2HPevGreIeJf8JW+R9Jh/B3BR1ryuvVnR6d+wX+zLao66287Op/hnYY/SuWpxznDf7tK3odlLwu4cimqzd/8A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aXztPlxDDNIc7FIxtx7k1+bcU8Ie1bxWDVpdT9o4F8Q/q8VgMwd4bJvp5HbftnfsWaZrmlSfGH4ORCSCRTLLFEOMY/qTXLwtxTOnNYHGvVbM7eOeBadam8zyxXi9Wkfi7d2txZXL2l0pSSNirA9iK/U4yUkmj8LnBxk4yVmivTJCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD//U/D+v0w/jMKACgAoAKACgAoAKACgAoA2vDvh/VPFGs2+g6PGZrm5cIiL1JNY168KNN1KjskdGEwtTEVo0aSvKWx+9nwJ+Evgj9lf4XHx3422R3zx+YTJ1BIzs5HWvxDO80xGdYz6th/h/rU/p/hnI8Hw1lv13GaTtfX8j8lv2lf2iNf8Ajh4zubzzHi0tHItoM9FPOGxwea/UuHsgpZdh1G15vdn4VxhxZiM4xcp3tTWy8j5ir6M+NCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAcjvG4kjJBU5BFG+g02tj9f/wBg39tSHw4IPhD8UJRLpsx8uGaYghM9S5OSRX5rxfws6qeMwqtJbpH7T4ecdKg45djneD0TfT1Jf2+f2NP7GQfGT4XxfaNOuwJJYohkqCNxkzwNpzxS4Q4n5/8AY8W7SWz/AEH4icEez/4UsArwerS++5+PTKVO1hX6WfiglABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFAH//1fw/r9MP4zCgAoAKACgAoAKACgAoAeiPK4jjGWJwAKHpqNK7sj9nP2Hf2b9P8HeHZPjP8QYhEdpMay8bNpyGwemQa/IuM+IJ16qy/Cu/ex/QfhtwlDCUHmuNVu1+lup8q/tmftNX/wAUvE0nhXQ5SmmWjbcLwGKnr6V9Nwhw5HBUVWqL32fE+IPGM8yxDw9F/u4/ofBVfbn5iFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFAEsM81tKJ4GKupyCOtJxTVmVGTi7o/d39g39qTSfif4Yl+BfxSlEkrRlI3l53KeAoJ74HSvyPi/IJYWqsdhVp5H9A+H3FlPH0HlWPevn+R8I/txfsu6n8DfHU2tafCTpF8xkR1Hyrk4C57H2r6/hTPo46goSfvo/PuPeFJ5XinVgv3ctV5HwXX1x+ehQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFAH/1vw/r9MP4zCgAoAKACgAoAKACgAoA+0P2MfgFP8AGH4hRXmpRk6ZYOGnLDg56fWvkuLc8WAwzjH45bH3/AHC7zXGqU1+7jufcH7eH7Q9n4I8PRfBrwTKFmEYjn2HA8sqAPUHp0r4zgnIZYiq8fiFp09bn6R4l8VRwdCOVYSWtrP0sfilJI8rmSQ5JOSTX7AlbRH88ttu7GUCCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoA6Lwp4n1bwdr9r4j0SUxXNrIJEZeORWOIw8K1N05rRnThMVUw1WNak7SWp/Rx8MfEvg39uz9m+Xwp4kKS6rZRANu5YyopIPJ9cc4r8Vx1CtkOY+1p6Rf5H9MZVisNxVkzoVtZxX42P57/AItfDXXPhN47v/BGvRlJrOQoSeh+h71+xZdjoYuhGvTejP5yzjK6uX4qeFqrWLPNa7jywoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/X/D+v0w/jMKACgAoAKACgAoAKANbQdIude1m10e0BL3EqxjH+0QP61lWqqnTlUl0RvhaEq1WNKO7aR/QL4Y03w/8Asc/s6HUdTCrqjQZfPBc9vyr8OxNSrnuackPgv9x/UOCo0OFsic6n8S33n4J+O/GGp+OPFF34i1aQyyTyMQT2XJIH4Cv2zBYWGHoxpQVkj+Zsyx1TF4ideq7tv8DkK6jgCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD6z/AGP/ANoLVPgJ8VrLWYyz2lw32eSPOB+8IUsfoDXz/EeTwx+FlB7rX7j6/g3iOplOPhUXwvRr10P1L/4KJ/ArRfip8Orb49eAUWQxRmSdoxnzN3f8K+B4MzWeExLwGI+Xkfq/iTkNPHYOOa4RbavzPwDdGjdo34ZTgiv165/PLVtGNoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/Q/D+v0w/jMKACgAoAKACgAoAKAP0g/wCCe/wRHjTxy/j3XIt2maYrK2RxvxuU/pXwHHOceww6w1N+/I/WvC3h361i3jay/dwv9/QX/goL8dZvG3jf/hAdLlzZaSxTKdGB+nWjgbJVh8P9ZmvekLxR4keLxn1Km/chp6n5vV9+fkwUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFADldkYOhII5BFFhpn9AH/BN/41ab8Vvhvc/APxqwmNvF5NsJOS+R75zivyTjTK3hcTHH0OurP6D8Ns8hj8FLKcS72Vl5n5Nfta/BK++Bnxh1HwtKh8h286N+37wlsDPpX6Bw/mccdhI1Vvt9x+R8XZHLK8xnQe2/3nzFXtny4UAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAf/9H8P6/TD+MwoAKACgAoAKACgDT0bSrnW9Vg0mzXdLcOEUe5rOrUVODnLZGtCjKrUjThu9D+g3R20b9lL9kf+17iNY7q+gVJlxz5jqyg461+H1YzzjOuRO6T09Fqf1Dh5UuHOGvaSVpSST9Wmj+fXXdXvNc1afVb9zJLM5Ys3U1+4UaUacFCKskfzBia8q1SVSbu2ZNaGAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQB73+zd8V7z4O/FjS/GEEjJHDJhwvfPFeVnOAWMws6L6nv8N5tLLsfTxCeiP2k/4KP/AAl034sfBbSvjP4YUSzW0X2i5kTn5RGOCRnoTX5rwZj5YXGTwdXRPRfeftXiTlEMfltPMaGrSu38j+eCv18/nYKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP//S/D+v0w/jMKACgAoAKACgAoA+xv2Ivha3xM+M1qCpKaYVujxx8pr5bi/MfqmAl/e0Pu/DzJ3j81h/ctI+q/8Agpp8WVutYsPhpoz5tUjLTKDwHRhgfrXzfh/lfLCWLnv09GfaeLme89WGX0n7vX1TPyOr9NPxAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAHIzRuJF4KnIoGnbU/pC/YE8Z2nx//Za1T4H+IHE1z5UiysxydjsAox+FfjfFmGeAzOGNhtof0hwBjVmuR1Msqu7s7+lz8CfjJ4Jn+H3xI1fwvLGY0tbp0j91BIFfq+XYlV8PCr3SPwHOMC8JjKtBrRNnmNdp5gUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQB//0/w/r9MP4zCgAoAKACgAoAKAP3F/4JxeDbbwl8KtU+Lmox7Hj81CT12rzmvyHjzFOvjIYKPkf0N4WYGOGy6rmU1qrn5S/tDeMpfHPxe1zXfM8yKW6ZovZTiv0nJMIsPgqVO2qR+L8T494zMq9ZvRt2PFK9U8EKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD9HP8Agmd8W5Ph58fLbw60hCeIGjtMZ44JavjuNMvWIwLn/Jdn6N4Z5u8HmsaV9Klkek/8FXPhQvhP4u2/irSottpdQAuwHV2OTXHwHj/a4R0pPVM9PxWyn2GPVeC91r8T8mq+9PyYKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAo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FABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFAH//Q/D+v0w/jMKACgAoAKACgAoAKACgAoAKAP0S/YE/bQ1z9mX4gQafqLNPoV/II5oieF3kAv+Ar5niPIoY6i3H40fdcF8WVMpxKjLWnLdevU/Tf/gpd+zH8PPjF8MB+1P8ABt4p2lUSy+V/y13k/N7YAr5ThXNq2FxH9n4lW/Q/Q/EDh7C47B/2xgXe+rt1ufzdSRvFI0UgwynBHuK/Ubn4G09iOgQUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQB6z8DvBukeP/irofhLXZxBa315FDIzejMARXLja0qVCdSK1SPQyrCwxGLp0ajsm0j+3TV/GP7On/BOH9nWG3sZraHybbbFtIzKwyAc9evFfjcKWKzbFNtH9R1MTl3DmXpRaVlp5n8cf7XX7VXjT9qf4n3vjTxBM4tXc+TATkKBkD25FfrWVZZTwdFU47n828RZ/WzTFSrVHp0R8nV6h88FABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQB//9H8P6/TD+MwoAKACgAoAKACgAoAKACgAoAUEqdycEd6APYLH47/ABOsPAs/w6i1SZtLuCuY2djjb0A5wBXFLL6EqqrOPvI9SGcYuOHeFU3yPoePsxYlm5J5Ndp5bYlABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFAFqyvbrTruO+snaKaJgyOpIII6EEUmk1ZlRm4tSi9Udj4q+Jvj3xtEkPijV7u9jjGFSaV3X8mYisaeHpU/gikdOIx2IrpKrNtebZwlbnIFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAf/0vw/r9MP4zCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoA/9P8P6/TD+MwoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/U/D+v0w/jMKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD/1fw/r9MP4zCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoA/9b8P6/TD+MwoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/X/D+v0w/jMKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD/0Pw/r9MP4zCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoA/9H8P6/TD+MwoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/S/D+v0w/jMKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD/0/w/r9MP4zCgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoA/9T8P6/TD+MwoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAP/V/D+v0w/jMKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD/2Q==";

const THEMES = {
  Default: {
    name: "Default",
    bg: "#f3f0eb",
    card: "#ffffff",
    cardHover: "#faf8f5",
    border: "#e0dbd4",
    borderLight: "#d4cfc7",
    text: "#1a1a1a",
    textMuted: "#5c5650",
    textDim: "#8a8279",
    accent: "#b5571e",
    accentLight: "#d4772e",
    accentDark: "#8f4416",
    green: "#1a7a4c",
    greenDark: "#145e3a",
    red: "#c53030",
    orange: "#c27803",
    purple: "#6d28d9",
    pink: "#be185d",
    cyan: "#0e7490",
    inputBg: "#ffffff",
    inputBorder: "#d4cfc7",
    chartColors: ["#b5571e", "#1a7a4c", "#c27803", "#c53030", "#6d28d9", "#be185d", "#0e7490", "#e67e22"],
    headerBg: "#ffffff",
    headerText: "#1a1a1a",
    navBg: "#ffffff",
    logoType: "icon",
    appTitle: "Australian Financial Planner",
    appSubtitle: "CASHFLOW · TAX · SUPER · CENTRELINK · MONTE CARLO",
    infoBg: "#ece8e1",
  },
  "Covenant Wealth": {
    name: "Covenant Wealth",
    bg: "#e8e1ca",
    card: "#ffffff",
    cardHover: "#f5f2ea",
    border: "#cfc090",
    borderLight: "#d6caa0",
    text: "#1a2e2e",
    textMuted: "#3e6b6a",
    textDim: "#6a9190",
    accent: "#00666a",
    accentLight: "#167377",
    accentDark: "#004d50",
    green: "#197777",
    greenDark: "#0f5e5e",
    red: "#c53030",
    orange: "#b8860b",
    purple: "#f3baa7",
    pink: "#a0456e",
    cyan: "#05696c",
    inputBg: "#ffffff",
    inputBorder: "#cfc090",
    inputText: "#1a2e2e",
    chartColors: ["#00666a", "#197777", "#b8860b", "#c53030", "#f3baa7", "#a0456e", "#05696c", "#d4772e"],
    headerBg: "#00666a",
    headerText: "#ffffff",
    navBg: "#f5f2ea",
    logoType: "covenant",
    appTitle: "Covenant Wealth",
    appSubtitle: "RETIREMENT PLANNING · TAX · SUPER · CENTRELINK",
    infoBg: "#d7e2e1",
  },
};

let COLORS = { ...THEMES["Covenant Wealth"] };

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "◉" },
  { id: "personal", label: "Personal", icon: "◈" },
  { id: "income", label: "Income", icon: "◆" },
  { id: "assets", label: "Assets", icon: "◇" },
  { id: "expenses", label: "Expenses", icon: "▣" },
  { id: "liabilities", label: "Liabilities", icon: "▤" },
  { id: "projections", label: "Projections", icon: "◐" },
  { id: "monte_carlo", label: "Stress Testing", icon: "◑" },
  { id: "tax_rates", label: "Legislation", icon: "◒" },
  { id: "returns", label: "Returns & Portfolios", icon: "◓" },
  { id: "settings", label: "Settings", icon: "◎" },
];

function Input({ label, value, onChange, type = "number", prefix, suffix, small, className = "", ...props }) {
  const [localVal, setLocalVal] = useState(() => (value === undefined || value === null) ? "" : String(value));
  const [focused, setFocused] = useState(false);

  // Sync from parent when not focused (external changes)
  useEffect(() => {
    if (!focused) {
      setLocalVal((value === undefined || value === null) ? "" : String(value));
    }
  }, [value, focused]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setLocalVal(raw);
    // For text fields, update parent immediately
    if (type === "text") {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (type === "number") {
      if (localVal === "" || localVal === "-") {
        onChange(0);
        setLocalVal("0");
      } else {
        const num = Number(localVal);
        onChange(isNaN(num) ? 0 : num);
        setLocalVal(String(isNaN(num) ? 0 : num));
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }} className={className}>
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
        {prefix && <span style={{ padding: "6px 0 6px 10px", color: COLORS.textDim, fontSize: small ? 12 : 13, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", flexShrink: 0 }}>{prefix}</span>}
        <input
          type={type === "number" ? "text" : type}
          inputMode={type === "number" ? "decimal" : undefined}
          value={localVal}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          style={{
            background: "transparent", border: "none", outline: "none", color: COLORS.inputText || COLORS.text,
            padding: prefix ? "6px 4px 6px 2px" : "6px 10px",
            fontSize: 13, width: "100%", minWidth: 0, fontFamily: "'JetBrains Mono', monospace", display: "block",
          }}
          {...props}
        />
        {suffix && <span style={{ padding: "6px 10px 6px 0", color: COLORS.textDim, fontSize: small ? 12 : 13, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// DateInput: displays and accepts DD/MM/YYYY, stores as YYYY-MM-DD internally
// Converts on blur so the stored value stays in ISO format for date math
function DateInput({ label, value, onChange, small }) {
  // Convert stored YYYY-MM-DD → DD/MM/YYYY for display
  const toDisplay = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    return iso; // already in display format or free text
  };
  // Convert entered DD/MM/YYYY → YYYY-MM-DD for storage
  const toISO = (display) => {
    const parts = display.split("/");
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return display; // pass through if can't parse
  };

  const [localVal, setLocalVal] = useState(() => toDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocalVal(toDisplay(value));
  }, [value, focused]);

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9/]/g, "");
    // Auto-insert slashes at positions 2 and 5
    if (raw.length === 2 && localVal.length === 1) raw = raw + "/";
    if (raw.length === 5 && localVal.length === 4) raw = raw + "/";
    setLocalVal(raw);
  };

  const handleBlur = () => {
    setFocused(false);
    const iso = toISO(localVal);
    onChange(iso);
    setLocalVal(toDisplay(iso));
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <div className="flex items-center" style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          value={localVal}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          maxLength={10}
          style={{ background: "transparent", border: "none", outline: "none", color: COLORS.inputText || COLORS.text, padding: "6px 10px", fontSize: 13, width: "100%", fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </div>
  );
}

// FYInput: displays as "FY 25/26" but stores the start calendar year (e.g. 2025)
// FY 25/26 starts 1 July 2025 — engine uses start year for comparisons
function FYInput({ label, value, onChange, small }) {
  // Convert stored calendar year → FY display e.g. 2025 → "FY 25/26"
  const toDisplay = (yr) => {
    const n = parseInt(yr);
    if (!n || isNaN(n)) return "";
    const short1 = String(n).slice(2);
    const short2 = String(n + 1).slice(2);
    return `FY ${short1}/${short2}`;
  };
  // Parse "FY 25/26" or "25/26" or "2025" → 2025
  const toYear = (display) => {
    if (!display) return null;
    // "FY 25/26" or "25/26"
    const match = display.replace(/FY\s*/i, "").trim().match(/^(\d{2})\/(\d{2})$/);
    if (match) {
      const century = parseInt(match[1]) >= 90 ? "19" : "20";
      return parseInt(century + match[1]);
    }
    // Plain 4-digit year
    const plain = parseInt(display);
    if (!isNaN(plain) && plain > 1900) return plain;
    return null;
  };

  const [localVal, setLocalVal] = useState(() => toDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocalVal(toDisplay(value));
  }, [value, focused]);

  const handleChange = (e) => {
    let raw = e.target.value;
    // Auto-format: strip non-digits/slash, insert FY prefix and slash
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length === 0) { setLocalVal(""); return; }
    if (digits.length <= 2) { setLocalVal(`FY ${digits}`); return; }
    if (digits.length <= 4) { setLocalVal(`FY ${digits.slice(0,2)}/${digits.slice(2)}`); return; }
    setLocalVal(`FY ${digits.slice(0,2)}/${digits.slice(2,4)}`);
  };

  const handleBlur = () => {
    setFocused(false);
    const yr = toYear(localVal);
    if (yr) {
      onChange(yr);
      setLocalVal(toDisplay(yr));
    } else {
      setLocalVal(toDisplay(value));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <div className="flex items-center" style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="FY 25/26"
          value={localVal}
          onChange={handleChange}
          onFocus={() => { setFocused(true); setLocalVal(""); }}
          onBlur={handleBlur}
          maxLength={8}
          style={{ background: "transparent", border: "none", outline: "none", color: COLORS.inputText || COLORS.text, padding: "6px 10px", fontSize: 13, width: "100%", fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </div>
  );
}


function Select({ label, value, onChange, options, small }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 6, color: COLORS.inputText || COLORS.text, padding: "6px 10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Card({ title, children, className = "", actions }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} className={className}>
      {(title || actions) && (
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          {title && <h3 style={{ color: COLORS.text, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color = COLORS.accent }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
    </div>
  );
}

function Btn({ children, onClick, active, small, color = COLORS.accent, variant = "default" }) {
  const bg = variant === "outline" ? "transparent" : (active ? color : COLORS.card);
  const border = variant === "outline" ? color : (active ? color : COLORS.border);
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, border: `1px solid ${border}`, borderRadius: 6, color: active ? "#fff" : COLORS.text, padding: small ? "4px 10px" : "7px 16px",
        fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 500, transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, width = 680 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "90%", maxWidth: width, maxHeight: "80vh", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textDim, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function HeaderBtn({ children, onClick, color = COLORS.textDim }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", color, fontWeight: 500, fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", padding: "8px 6px", textAlign: "right",
        textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3, width: "100%",
      }}
      title="Click to edit"
    >
      {children}
    </button>
  );
}

// ============================================================
// DASHBOARD TAB
// ============================================================
function DashboardTab({ state, projectionData, afterProjectionData, afterState, scenario, setState, setAfterState }) {
  const { personal, income, assets, expenses } = state;
  const isCouple = personal.isCouple;
  const [showInvestment, setShowInvestment] = useState(true);
  const [showLifestyle, setShowLifestyle] = useState(false);
  const [showNominal, setShowNominal] = useState(false);
  const [chartPopup, setChartPopup] = useState(null);
  const [showReport, setShowReport] = useState(false); // false | true | "no-after" | "no-changes"
  const [showSaveLoad, setShowSaveLoad] = useState(null); // null | "save" | "load"
  const [copied, setCopied] = useState(false);
  const [loadText, setLoadText] = useState("");
  const [loadError, setLoadError] = useState("");
  const n1 = personal.person1.name || "Person 1";
  const n2 = personal.person2.name || "Person 2";
  const totalAssets = Object.values(assets.superAccounts).reduce((s, a) => s + (a.balance || 0), 0)
    + Object.values(assets.nonSuper).reduce((s, a) => s + (a.balance || 0), 0);
  const totalLifestyle = assets.lifestyleAssets.filter(a => !a.isPrimaryResidence).reduce((s, a) => s + (a.value || 0), 0);
  const totalLiabilities = (assets.loans || []).reduce((s, a) => s + (a.balance || 0), 0);
  const netInvestment = totalAssets - totalLiabilities;
  const netWealth = netInvestment + totalLifestyle;

  // Use first year of projection data for accurate income/expenses/surplus (includes all sources)
  const yr0 = projectionData.length > 0 ? projectionData[0] : null;
  const totalIncome = yr0 ? yr0.totalIncome : ((income.person1.salary || 0) + (isCouple ? (income.person2.salary || 0) : 0));
  const debtRepayments = yr0 ? (yr0.liabilityPayments || 0) : (assets.loans || []).reduce((s, l) => {
    if (!l.balance) return s;
    const r = (l.variableRate || 0) / 100 / 12;
    const n = l.termMonths || 360;
    return s + (r > 0 ? (l.balance * r) / (1 - Math.pow(1 + r, -n)) : l.balance / n) * 12;
  }, 0);
  const totalExpenses = yr0
    ? yr0.totalExpenses  // already includes lifestyle + recurring + future + loan repayments
    : (expenses.baseExpenses.reduce((s, e) => s + (e.amount || 0), 0) + ((expenses.lifestyleExpenses || []).find(e => new Date().getFullYear() >= (e.startYear || 0) && new Date().getFullYear() <= (e.endYear || 9999))?.amount || expenses.annualLiving || 0) + debtRepayments);
  const surplus = totalIncome - totalExpenses;

  const assetPie = [
    { name: "Super", value: Object.values(assets.superAccounts).reduce((s, a) => s + (a.balance || 0), 0) },
    { name: "Non-Super", value: Object.values(assets.nonSuper).reduce((s, a) => s + (a.balance || 0), 0) },
    { name: "Lifestyle", value: totalLifestyle },
  ].filter(d => d.value > 0);

  const last5 = projectionData.slice(0, 5);
  const forecastData = last5.map(p => ({
    year: p.year,
    salary: p.p1Salary + p.p2Salary,
    investEarnings: p.investEarnings || 0,
    pensionDraw: p.p1PensionDraw + p.p2PensionDraw,
    agePension: p.agePension,
    tax: p.totalTax + p.totalSuperTax,
    expenses: p.totalExpenses,
    surplus: p.totalIncome - p.totalExpenses,
    totalIncome: p.totalIncome,
    // Tax detail
    p1IncomeTax: p.p1IncomeTax, p2IncomeTax: p.p2IncomeTax,
    p1Medicare: p.p1Medicare, p2Medicare: p.p2Medicare,
    p1Tax: p.p1Tax, p2Tax: p.p2Tax,
    p1Taxable: p.p1Taxable, p2Taxable: p.p2Taxable,
    p1SuperContribTax: p.p1SuperContribTax, p2SuperContribTax: p.p2SuperContribTax,
    totalTax: p.totalTax, totalSuperTax: p.totalSuperTax,
  }));

  const [selectedYear, setSelectedYear] = useState(null);
  const selectedYearData = selectedYear ? forecastData.find(d => d.year === selectedYear) : null;

  // Shared chart renderers (used in both mini and full views)
  const renderIncomeVsExp = (height) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={projectionData}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 10 }} />
        <YAxis tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
        {height > 160 && <Legend />}
        <Bar dataKey="totalIncome" fill={COLORS.green} name="Net Income" opacity={0.7} />
        <Bar dataKey="totalExpenses" fill={COLORS.red} name="Expenses" opacity={0.7} />
        <Line type="monotone" dataKey="surplus" stroke={COLORS.accent} name="Surplus/Deficit" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderAssetBreakdown = (height) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={projectionData}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 10 }} />
        <YAxis tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
        {height > 160 && <Legend />}
        <Area type="monotone" dataKey="p1Super" stackId="1" fill={COLORS.chartColors[0]} stroke={COLORS.chartColors[0]} name={`${n1} Super`} />
        {isCouple && <Area type="monotone" dataKey="p2Super" stackId="1" fill={COLORS.chartColors[1]} stroke={COLORS.chartColors[1]} name={`${n2} Super`} />}
        <Area type="monotone" dataKey="jointNonSuper" stackId="1" fill={COLORS.chartColors[2]} stroke={COLORS.chartColors[2]} name="Joint Non-Super" />
        <Area type="monotone" dataKey="p1NonSuper" stackId="1" fill={COLORS.chartColors[3]} stroke={COLORS.chartColors[3]} name={`${n1} Non-Super`} />
        {isCouple && <Area type="monotone" dataKey="p2NonSuper" stackId="1" fill={COLORS.chartColors[4]} stroke={COLORS.chartColors[4]} name={`${n2} Non-Super`} />}
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderAgePension = (height) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={projectionData}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 10 }} />
        <YAxis tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
        <Area type="monotone" dataKey="agePension" fill={`${COLORS.purple}40`} stroke={COLORS.purple} strokeWidth={2} name="Age Pension" />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderTaxBreakdown = (data, height) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey={data === projectionData ? "age1" : "year"} tick={{ fill: COLORS.textDim, fontSize: 10 }} />
        <YAxis tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 10 }} />
        {height > 160 && <Legend wrapperStyle={{ fontSize: 9 }} />}
        <Bar dataKey="p1IncomeTax" stackId="t" fill={COLORS.red} name={`${n1} Income Tax`} />
        <Bar dataKey="p1Medicare" stackId="t" fill={COLORS.pink} name={`${n1} Medicare`} />
        <Bar dataKey="p1SuperContribTax" stackId="t" fill={COLORS.orange} name={`${n1} Super Tax`} />
        {isCouple && <Bar dataKey="p2IncomeTax" stackId="t" fill="#e07070" name={`${n2} Income Tax`} />}
        {isCouple && <Bar dataKey="p2Medicare" stackId="t" fill="#d4a0b0" name={`${n2} Medicare`} />}
        {isCouple && <Bar dataKey="p2SuperContribTax" stackId="t" fill="#d4a040" name={`${n2} Super Tax`} radius={[3, 3, 0, 0]} />}
        {!isCouple && <Bar dataKey="p1SuperContribTax" stackId="t_top" fill="transparent" radius={[3, 3, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPopup = () => {
    if (!chartPopup) return null;
    const configs = {
      incomeVsExp: { title: "Income vs Expenses", render: () => renderIncomeVsExp(400) },
      assetBreakdown: { title: "Asset Breakdown Over Time", render: () => renderAssetBreakdown(400) },
      agePension: { title: "Centrelink Age Pension", render: () => renderAgePension(350) },
      taxBreakdown: { title: "Tax Breakdown Over Time", render: () => renderTaxBreakdown(projectionData, 400) },
      debtChart: { title: "Debt Over Time", render: () => (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 10 }} />
            <YAxis tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
            <Legend />
            <Area type="monotone" dataKey="totalDebtRemaining" fill={COLORS.red + "30"} stroke={COLORS.red} strokeWidth={2} name="Debt Balance" />
            <Area type="monotone" dataKey="deductibleInterest" fill={COLORS.green + "30"} stroke={COLORS.green} strokeWidth={1.5} name="Deductible Interest (pa)" />
          </AreaChart>
        </ResponsiveContainer>
      ) },
    };
    const cfg = configs[chartPopup];
    if (!cfg) return null;
    return (
      <Modal title={cfg.title} onClose={() => setChartPopup(null)} width={900}>
        {cfg.render()}
      </Modal>
    );
  };

  // ── Action Plan Report Generator ──────────────────────────────
  const generateReport = () => {
    const now = state;
    const after = afterState;
    if (!after) return "No After Advice scenario created yet.";
    const n1 = now.personal.person1.name || "Person 1";
    const n2 = now.personal.person2.name || "Person 2";
    const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

    // Detect changes between Now and After
    const changes = [];
    // Income changes
    ["salary","salarySacrifice","otherTaxable","frankedDividends","rentalIncome","taxFreeIncome","personalDeductibleSuper","nonConcessionalSuper"].forEach(f => {
      const labels = { salary: "Salary", salarySacrifice: "Salary Sacrifice", otherTaxable: "Other Taxable Income", frankedDividends: "Franked Dividends", rentalIncome: "Rental Income", taxFreeIncome: "Tax-Free Income", personalDeductibleSuper: "Personal Deductible Super", nonConcessionalSuper: "Non-Concessional Super" };
      if ((now.income.person1[f] || 0) !== (after.income.person1[f] || 0)) {
        changes.push({ area: "Income", action: `Change ${n1} ${labels[f]} from ${fmt(now.income.person1[f] || 0)} to ${fmt(after.income.person1[f] || 0)}` });
      }
      if (now.personal.isCouple && (now.income.person2[f] || 0) !== (after.income.person2[f] || 0)) {
        changes.push({ area: "Income", action: `Change ${n2} ${labels[f]} from ${fmt(now.income.person2[f] || 0)} to ${fmt(after.income.person2[f] || 0)}` });
      }
    });
    // Super changes
    ["p1Super","p1Pension","p2Super","p2Pension"].forEach(k => {
      const nAcc = now.assets.superAccounts[k];
      const aAcc = after.assets.superAccounts[k];
      if (!nAcc || !aAcc) return;
      if (nAcc.profile !== aAcc.profile) changes.push({ area: "Super", action: `Change ${k} portfolio from ${nAcc.profile} to ${aAcc.profile}` });
      if ((nAcc.adminFee||0) !== (aAcc.adminFee||0) || (nAcc.managementCost||0) !== (aAcc.managementCost||0) || (nAcc.adviceCost||0) !== (aAcc.adviceCost||0)) {
        const nFee = ((nAcc.adminFee||0) + (nAcc.managementCost||0) + (nAcc.adviceCost||0)).toFixed(2);
        const aFee = ((aAcc.adminFee||0) + (aAcc.managementCost||0) + (aAcc.adviceCost||0)).toFixed(2);
        changes.push({ area: "Super", action: `Change ${k} total fees from ${nFee}% to ${aFee}%` });
      }
      if ((nAcc.pensionConversionYear||0) !== (aAcc.pensionConversionYear||0)) {
        changes.push({ area: "Super", action: `Set ${k} pension conversion to FY ${String(aAcc.pensionConversionYear).slice(2)}/${String(aAcc.pensionConversionYear+1).slice(2)}` });
      }
    });
    // Expense changes
    if (JSON.stringify(now.expenses) !== JSON.stringify(after.expenses)) {
      changes.push({ area: "Expenses", action: "Expense structure modified — review Expenses tab for details" });
    }
    // Loan changes
    if (JSON.stringify(now.assets.loans) !== JSON.stringify(after.assets.loans)) {
      changes.push({ area: "Liabilities", action: "Debt strategy modified — review Liabilities tab for details" });
    }

    // Build VoA metrics
    const lastNow = projectionData[projectionData.length - 1];
    const lastAfter = afterProjectionData[afterProjectionData.length - 1];
    const assetsDiff = (lastAfter?.netInvestmentAssets || 0) - (lastNow?.netInvestmentAssets || 0);
    const taxN = projectionData.reduce((s, r) => s + (r.totalTax || 0) + (r.totalSuperTax || 0), 0);
    const taxA = afterProjectionData.reduce((s, r) => s + (r.totalTax || 0) + (r.totalSuperTax || 0), 0);
    const taxSaved = taxN - taxA;

    let report = "";
    report += "═══════════════════════════════════════════════════\n";
    report += "   COVENANT WEALTH — YOUR FINANCIAL ACTION PLAN\n";
    report += "═══════════════════════════════════════════════════\n";
    report += `Prepared: ${date}\n`;
    report += `For: ${n1}${now.personal.isCouple ? ` & ${n2}` : ""}\n\n`;
    report += "───────────────────────────────────────────────────\n";
    report += "   VALUE OF ADVICE SUMMARY\n";
    report += "───────────────────────────────────────────────────\n";
    report += `Extra Assets at Retirement: ${fmt(assetsDiff)}\n`;
    report += `Tax Saved Over Life:        ${fmt(taxSaved)}\n\n`;
    report += "───────────────────────────────────────────────────\n";
    report += "   YOUR ACTION CHECKLIST\n";
    report += "───────────────────────────────────────────────────\n";
    if (changes.length === 0) {
      report += "No changes detected between Now and After scenarios.\n";
    } else {
      changes.forEach((c, i) => {
        report += `\n☐ ${i + 1}. [${c.area}] ${c.action}`;
      });
    }
    report += "\n\n───────────────────────────────────────────────────\n";
    report += "   NEXT STEPS\n";
    report += "───────────────────────────────────────────────────\n";
    report += "For help implementing these changes, contact:\n";
    report += "Tudor Cosma — Certified Financial Planner\n";
    report += "Covenant Wealth\n";
    report += "📞 03 9982 4484\n";
    report += "🌐 www.covenantwealth.com.au\n";
    report += "📍 Level 15, 28 Freshwater Place, Southbank VIC 3006\n";
    report += "100% remote — video calls & email, anywhere in Australia\n\n";
    report += "═══════════════════════════════════════════════════\n";
    report += "   YOUR SAVED DATA (paste into Load to restore)\n";
    report += "═══════════════════════════════════════════════════\n";
    report += "---BEGIN COVENANT DATA---\n";
    report += btoa(unescape(encodeURIComponent(JSON.stringify({ now: state, after: afterState }))));
    report += "\n---END COVENANT DATA---\n";
    return report;
  };

  const handleCopyReport = () => {
    const report = generateReport();
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleSave = () => {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify({ now: state, after: afterState }))));
    const text = "---BEGIN COVENANT DATA---\n" + data + "\n---END COVENANT DATA---";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowSaveLoad(null); }, 2000);
    });
  };

  const handleLoad = () => {
    try {
      setLoadError("");
      let raw = loadText.trim();
      // Extract from report format
      const match = raw.match(/---BEGIN COVENANT DATA---\s*([\s\S]*?)\s*---END COVENANT DATA---/);
      if (match) raw = match[1].trim();
      const json = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (json.now) {
        setState(json.now);
        if (json.after && setAfterState) {
          setAfterState(json.after);
        }
        setShowSaveLoad(null);
        setLoadText("");
        setLoadError("");
      } else {
        setLoadError("Invalid data format — no 'now' state found.");
      }
    } catch (e) {
      setLoadError("Could not parse the data. Make sure you copied the full text between ---BEGIN and ---END markers.");
    }
  };

  return (
    <div>
      {renderPopup()}

      {/* ── Report Modal ──────────────────────────────── */}
      {showReport && (
        <Modal title="📋 Your Financial Action Plan" onClose={() => setShowReport(false)} width={600}>
          <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {showReport === "no-after" ? (
              <div>
                <div style={{ textAlign: "center", padding: "20px 10px" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
                  <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Your Action Plan Starts Here</div>
                  <p style={{ color: COLORS.textDim, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                    The Action Plan is a personalised checklist of every change you model — showing exactly what to implement and the financial impact of each decision.
                  </p>
                  <div style={{ textAlign: "left", background: COLORS.infoBg || "#ece8e1", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>How it works:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>1️⃣</span>
                        <span style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.5 }}><strong>Enter your current situation</strong> in the Now scenario across Income, Assets, Expenses, and Liabilities tabs.</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>2️⃣</span>
                        <span style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.5 }}><strong>Switch to After Advice</strong> and model the changes you want to make — increase salary sacrifice, reduce fees, pay loans fortnightly, convert super to pension phase.</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>3️⃣</span>
                        <span style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.5 }}><strong>Come back here</strong> and your Action Plan will be ready — a checklist of every change with the dollar value of each improvement.</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ color: COLORS.accent, fontSize: 11, fontStyle: "italic" }}>
                    All the value is in the implementation, not the knowing. Your Action Plan turns insights into actions.
                  </p>
                </div>
              </div>
            ) : showReport === "no-changes" ? (
              <div style={{ textAlign: "center", padding: "20px 10px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
                <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Changes Detected Yet</div>
                <p style={{ color: COLORS.textDim, fontSize: 13, lineHeight: 1.6 }}>
                  You have created an After Advice scenario but haven't made any changes yet. Head to Income, Assets, Expenses or Liabilities tabs, switch to "After Advice", and start modelling improvements. Your changes will appear here as a ready-to-implement checklist.
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12 }}>
                  This is your personalised action checklist. Copy it and email it to yourself — it includes your implementation steps, the financial impact, and your saved plan data so you can reload next time.
                </p>
                <textarea
                  readOnly
                  value={generateReport()}
                  style={{
                    width: "100%", height: 350, padding: 12, borderRadius: 8,
                    border: `1px solid ${COLORS.border}`, background: COLORS.inputBg,
                    color: COLORS.text, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                    resize: "vertical", lineHeight: 1.5,
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={handleCopyReport} style={{
                    flex: 1, padding: "12px 16px", borderRadius: 8, border: "none",
                    background: copied ? COLORS.green : COLORS.accent, color: "#fff",
                    fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                  }}>
                    {copied ? "✓ Copied! Now email it to yourself" : "📋 Copy Full Report to Clipboard"}
                  </button>
                </div>
                <p style={{ color: COLORS.textDim, fontSize: 10, marginTop: 10, textAlign: "center" }}>
                  Tip: Paste into an email to yourself. The saved data at the bottom lets you reload your plan next time using the Load button.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Save Modal ──────────────────────────────── */}
      {showSaveLoad === "save" && (
        <Modal title="💾 Save Your Plan" onClose={() => { setShowSaveLoad(null); setCopied(false); }} width={500}>
          <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💾</div>
              <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Save Your Progress</div>
              <p style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.6 }}>
                Your data is never stored on any server — you own it completely. Click the button below to copy your plan to the clipboard, then paste it somewhere safe.
              </p>
            </div>
            <div style={{ background: COLORS.infoBg || "#ece8e1", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Where to save it:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ color: COLORS.textDim, fontSize: 11 }}>📧 <strong>Email it to yourself</strong> — open your email, compose a new message, paste, and send to yourself</div>
                <div style={{ color: COLORS.textDim, fontSize: 11 }}>📝 <strong>Notes app</strong> — paste into Apple Notes, Google Keep, or any note-taking app</div>
                <div style={{ color: COLORS.textDim, fontSize: 11 }}>📄 <strong>Document</strong> — paste into a Word doc or Google Doc for safekeeping</div>
              </div>
            </div>
            <button onClick={handleSave} style={{
              width: "100%", padding: "14px 16px", borderRadius: 8, border: "none",
              background: copied ? COLORS.green : COLORS.accent, color: "#fff",
              fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
            }}>
              {copied ? "✓ Copied to Clipboard! Now paste it somewhere safe" : "📋 Copy Plan Data to Clipboard"}
            </button>
            <p style={{ color: COLORS.textDim, fontSize: 10, marginTop: 10, textAlign: "center" }}>
              Next time, use the 📂 Load button and paste this data back in to pick up where you left off.
            </p>
          </div>
        </Modal>
      )}

      {/* ── Load Modal ──────────────────────────────── */}
      {showSaveLoad === "load" && (
        <Modal title="📂 Load a Previous Plan" onClose={() => { setShowSaveLoad(null); setLoadText(""); setLoadError(""); }} width={500}>
          <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
              <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Continue Where You Left Off</div>
              <p style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.6 }}>
                If you previously saved your plan (or received an Action Plan report), you can restore it here.
              </p>
            </div>
            <div style={{ background: COLORS.infoBg || "#ece8e1", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>How to load:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ color: COLORS.textDim, fontSize: 11 }}>1️⃣ Find the email or note where you saved your plan data</div>
                <div style={{ color: COLORS.textDim, fontSize: 11 }}>2️⃣ Copy the text that starts with <code style={{ background: COLORS.card, padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>---BEGIN COVENANT DATA---</code> and ends with <code style={{ background: COLORS.card, padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>---END COVENANT DATA---</code></div>
                <div style={{ color: COLORS.textDim, fontSize: 11 }}>3️⃣ Paste it into the box below and tap Load Plan</div>
              </div>
            </div>
            <textarea
              value={loadText}
              onChange={(e) => { setLoadText(e.target.value); setLoadError(""); }}
              placeholder="Paste your saved data here..."
              style={{
                width: "100%", height: 120, padding: 12, borderRadius: 8,
                border: `1px solid ${loadError ? COLORS.red : COLORS.border}`, background: COLORS.inputBg,
                color: COLORS.text, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                resize: "vertical",
              }}
            />
            {loadError && <p style={{ color: COLORS.red, fontSize: 11, marginTop: 6 }}>{loadError}</p>}
            <button onClick={handleLoad} disabled={!loadText.trim()} style={{
              width: "100%", padding: "14px 16px", borderRadius: 8, border: "none", marginTop: 10,
              background: loadText.trim() ? COLORS.accent : COLORS.border, color: "#fff",
              fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
              cursor: loadText.trim() ? "pointer" : "default",
            }}>
              📂 Load Plan
            </button>
            <p style={{ color: COLORS.textDim, fontSize: 10, marginTop: 10, textAlign: "center" }}>
              This will replace all current data with the saved plan. Your previous entries will be overwritten.
            </p>
          </div>
        </Modal>
      )}

      {/* ── Value of Advice Card — always at top ───────────────── */}
      {(() => {
        const hasAfter = !!afterProjectionData;

        // Zero-state card shown before After data exists
        if (!hasAfter) {
          return (
            <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.green}08)`, border: `2px solid ${COLORS.accent}30`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>✨</span>
                <div>
                  <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Value of Advice</div>
                  <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>See how much better your financial future could be</div>
                </div>
              </div>
              <div style={{ padding: "10px 12px", background: COLORS.card, borderRadius: 8, marginBottom: 10, border: `1px solid ${COLORS.border}` }}>
                <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>How it works</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, minWidth: 20 }}>📍</span>
                    <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}><strong style={{ color: COLORS.text }}>Now</strong> — Enter your current situation in the Income, Assets, Expenses and Liabilities tabs. This is your baseline.</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, minWidth: 20 }}>✨</span>
                    <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}><strong style={{ color: COLORS.text }}>After Advice</strong> — Switch to "After Advice" in any tab to model changes: restructure debt, optimise super, reduce fees, or adjust investments. The baseline stays untouched.</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, minWidth: 20 }}>📊</span>
                    <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}><strong style={{ color: COLORS.text }}>This card</strong> will show the dollar and year improvement across assets, tax, fees, and debt — the financial value of taking advice.</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {["Extra Assets at Retirement", "Tax Saved Over Life", "Investment Fees Saved", "Debt-Free Sooner", "Interest Saved on Debt", "Extra Age Pension"].map((label, i) => (
                  <div key={i} style={{ background: `${COLORS.border}60`, borderRadius: 8, padding: "10px 12px", border: `1px dashed ${COLORS.border}` }}>
                    <div style={{ color: COLORS.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: COLORS.textDim, fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>—</div>
                    <div style={{ color: COLORS.textDim, fontSize: 9, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Enter data to calculate</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => setShowReport("no-after")} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  📋 Action Plan
                </button>
                <button onClick={() => setShowSaveLoad("save")} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  💾 Save
                </button>
                <button onClick={() => setShowSaveLoad("load")} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  📂 Load
                </button>
              </div>
            </div>
          );
        }

        // After data exists — compute metrics
        const nowLast = projectionData[projectionData.length - 1];
        const afterLast = afterProjectionData[afterProjectionData.length - 1];
        const nowTax = projectionData.reduce((s, r) => s + (r.totalTax || 0) + (r.totalSuperTax || 0), 0);
        const afterTax = afterProjectionData.reduce((s, r) => s + (r.totalTax || 0) + (r.totalSuperTax || 0), 0);
        const taxSaved = nowTax - afterTax;
        const assetsDiff = (afterLast?.netInvestmentAssets || 0) - (nowLast?.netInvestmentAssets || 0);
        const nowDebtStart = projectionData[0]?.totalDebtRemaining || 0;
        const afterDebtStart = afterProjectionData[0]?.totalDebtRemaining || 0;
        const nowDebtPayoff = nowDebtStart > 0 ? projectionData.findIndex(r => r.totalDebtRemaining < Math.max(1, nowDebtStart * 0.01)) : -1;
        const afterDebtPayoff = afterDebtStart > 0 ? afterProjectionData.findIndex(r => r.totalDebtRemaining < Math.max(1, afterDebtStart * 0.01)) : -1;
        const debtYearsSaved = nowDebtPayoff > 0 && afterDebtPayoff > 0 ? Math.max(0, nowDebtPayoff - afterDebtPayoff) : 0;
        const nowDebtInterest = projectionData.reduce((s, r) => s + (r.liabilityPayments || 0), 0) - (projectionData[0]?.totalDebtRemaining || 0);
        const afterDebtInterest = afterProjectionData.reduce((s, r) => s + (r.liabilityPayments || 0), 0) - (afterProjectionData[0]?.totalDebtRemaining || 0);
        const interestSaved = Math.max(0, nowDebtInterest - afterDebtInterest);
        const calcStateFees = (stateData, stateObj) => {
          if (!stateObj) return 0;
          const sa = stateObj.assets?.superAccounts || {};
          const ns = stateObj.assets?.nonSuper || {};
          const costOf = (acc) => ((acc?.adminFee || 0) + (acc?.managementCost || 0) + (acc?.adviceCost || 0)) / 100;
          return stateData.reduce((s, r) => s + (r.p1Super || 0) * costOf(sa.p1Super) + (r.p2Super || 0) * costOf(sa.p2Super) + (r.p1NonSuper || 0) * costOf(ns.p1NonSuper) + (r.p2NonSuper || 0) * costOf(ns.p2NonSuper) + (r.jointNonSuper || 0) * costOf(ns.joint) + (r.p1NonSuper || 0) * costOf(ns.p1NonSuper2) + (r.p2NonSuper || 0) * costOf(ns.p2NonSuper2), 0);
        };
        const feesSaved = Math.max(0, calcStateFees(projectionData, state) - calcStateFees(afterProjectionData, afterState));
        const nowTotalAgePension = projectionData.reduce((s, r) => s + (r.agePension || 0), 0);
        const afterTotalAgePension = afterProjectionData.reduce((s, r) => s + (r.agePension || 0), 0);
        const agePensionGain = afterTotalAgePension - nowTotalAgePension;

        // Work out who is on pension in the After scenario (look at first year they appear)
        const n1 = state.personal.person1.name || "Person 1";
        const n2 = state.personal.person2.name || "Person 2";
        const q = state.legislation?.centrelink?.ageQualifyingAge || 67;
        const p1Age = state.personal.person1.dob
          ? Math.floor((new Date() - new Date(state.personal.person1.dob)) / (365.25 * 24 * 3600 * 1000))
          : new Date().getFullYear() - (state.personal.person1.birthYear || 1960);
        const p2Age = isCouple ? (state.personal.person2.dob
          ? Math.floor((new Date() - new Date(state.personal.person2.dob)) / (365.25 * 24 * 3600 * 1000))
          : new Date().getFullYear() - (state.personal.person2.birthYear || 1965)) : null;
        const p1OnPension = p1Age >= q || afterProjectionData.some(r => r.agePension > 0 && r.age1 >= q);
        const p2OnPension = isCouple && (p2Age >= q || afterProjectionData.some(r => r.agePension > 0 && r.age2 >= q));
        const numOnPension = (p1OnPension ? 1 : 0) + (p2OnPension ? 1 : 0);

        // Per fortnight per person: asset diff / 1000 * $3/fn
        // Cumulative gain = fortnightly improvement * 26 * pension years
        const pensionYears = Math.max(1, afterProjectionData.filter(r => (r.agePension || 0) > 0).length);
        const annualGainPerPerson = agePensionGain > 0 ? (agePensionGain / pensionYears) / Math.max(1, numOnPension) : 0;
        const fnGainPerPerson = annualGainPerPerson / 26;

        // Sub-text: name the person(s) receiving the benefit
        let pensionSubText = "No change yet";
        if (agePensionGain > 100) {
          if (!isCouple || (p1OnPension && !p2OnPension)) {
            pensionSubText = `+${fmt(Math.round(fnGainPerPerson))}/fn for ${n1}`;
          } else if (isCouple && p2OnPension && !p1OnPension) {
            pensionSubText = `+${fmt(Math.round(fnGainPerPerson))}/fn for ${n2}`;
          } else {
            pensionSubText = `+${fmt(Math.round(fnGainPerPerson))}/fn for ${n1} & +${fmt(Math.round(fnGainPerPerson))}/fn for ${n2}`;
          }
        } else if (agePensionGain < -100) {
          pensionSubText = "Higher assets = lower pension (expected)";
        }

        const allMetrics = [
          {
            label: "Extra Assets at Retirement",
            value: assetsDiff,
            display: Math.abs(assetsDiff) > 100 ? `${assetsDiff >= 0 ? "+" : ""}${fmt(assetsDiff)}` : null,
            color: assetsDiff >= 0 ? COLORS.green : COLORS.red,
            sub: assetsDiff < -100 ? "After has lower assets (gifting / restructure)" : "Net investment assets difference",
            isGood: assetsDiff >= 0,
          },
          {
            label: "Tax Saved Over Life",
            value: taxSaved,
            display: Math.abs(taxSaved) > 100 ? `${taxSaved >= 0 ? "+" : ""}${fmt(taxSaved)}` : null,
            color: taxSaved >= 0 ? COLORS.green : COLORS.red,
            sub: taxSaved >= 0 ? "Income tax + super contributions tax" : "After scenario has higher tax",
            isGood: taxSaved >= 0,
          },
          {
            label: "Investment Fees Saved",
            value: feesSaved,
            display: feesSaved > 100 ? `+${fmt(feesSaved)}` : null,
            color: COLORS.green,
            sub: "Lower cost investment strategy",
            isGood: feesSaved > 0,
          },
          {
            label: "Debt-Free Sooner",
            value: debtYearsSaved,
            display: debtYearsSaved > 0 ? `${debtYearsSaved} yr${debtYearsSaved !== 1 ? "s" : ""} earlier` : null,
            color: COLORS.green,
            sub: "Debt paid off sooner",
            isGood: debtYearsSaved > 0,
          },
          {
            label: "Interest Saved on Debt",
            value: interestSaved,
            display: interestSaved > 100 ? `+${fmt(interestSaved)}` : null,
            color: COLORS.green,
            sub: "Smarter debt repayment strategy",
            isGood: interestSaved > 0,
          },
          {
            label: "Extra Age Pension",
            value: agePensionGain,
            display: agePensionGain > 100 ? `+${fmt(Math.round(agePensionGain))}` : null,
            color: COLORS.green,
            sub: pensionSubText,
            isGood: agePensionGain > 100,
          },
        ];

        const hasChange = allMetrics.some(m => m.display !== null && m.display !== undefined);
        return (
          <div style={{ background: `linear-gradient(135deg, ${COLORS.green}15, ${COLORS.accent}10)`, border: `2px solid ${COLORS.green}50`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: hasChange ? 12 : 8 }}>
              <span style={{ fontSize: 22 }}>✨</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Value of Advice</div>
                <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                  {hasChange ? "How much better is your financial future with advice?" : "After scenario created — make changes in Income, Assets, Expenses or Liabilities tabs to see improvements here."}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {allMetrics.map((m, i) => (
                <div key={i} style={{ background: COLORS.card, borderRadius: 8, padding: "10px 12px", border: `1px solid ${m.display && m.isGood ? COLORS.green + "50" : m.display && !m.isGood ? COLORS.red + "40" : COLORS.border}` }}>
                  <div style={{ color: COLORS.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{m.label}</div>
                  <div style={{ color: m.display ? m.color : COLORS.textDim, fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>
                    {m.display || "—"}
                  </div>
                  <div style={{ color: COLORS.textDim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", marginTop: 3 }}>
                    {m.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Action Plan & Save/Load Buttons ─────────────── */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowReport(hasChange ? true : "no-changes")} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                📋 Action Plan
              </button>
              <button onClick={() => setShowSaveLoad("save")} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                💾 Save
              </button>
              <button onClick={() => setShowSaveLoad("load")} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                📂 Load
              </button>
            </div>
          </div>
        );
      })()}
      {selectedYearData && (() => {
        const grossIncome = selectedYearData.salary + selectedYearData.investEarnings + selectedYearData.pensionDraw + selectedYearData.agePension;
        const totalTaxBill = selectedYearData.totalTax + selectedYearData.totalSuperTax;
        const netResult = grossIncome - totalTaxBill - selectedYearData.expenses;
        return (
        <Modal title={`${selectedYearData.year} — Income & Expenses Breakdown`} onClose={() => setSelectedYear(null)} width={500}>
          <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.accent, marginBottom: 8 }}>Income Sources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <div className="flex justify-between" style={{ padding: "8px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 13 }}>Employment Salary</span>
                <span style={{ color: COLORS.accent, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.salary)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "8px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 13 }}>Investment Earnings</span>
                <span style={{ color: COLORS.orange, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.investEarnings)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "8px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 13 }}>Super Pension Drawdown</span>
                <span style={{ color: COLORS.cyan, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.pensionDraw)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "8px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 13 }}>Age Pension (Centrelink)</span>
                <span style={{ color: COLORS.purple, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.agePension)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "8px 12px", background: COLORS.card, border: `2px solid ${COLORS.accent}`, borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>Total Income</span>
                <span style={{ color: COLORS.accent, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(grossIncome)}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.red, marginBottom: 8 }}>Tax</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{n1}</div>
              <div className="flex justify-between" style={{ padding: "6px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 12 }}>Income Tax (on {fmt(selectedYearData.p1Taxable)})</span>
                <span style={{ color: COLORS.red, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.p1IncomeTax)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "6px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 12 }}>Medicare Levy</span>
                <span style={{ color: COLORS.red, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.p1Medicare)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "6px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 12 }}>Super Contributions Tax (15%)</span>
                <span style={{ color: COLORS.red, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.p1SuperContribTax)}</span>
              </div>
              {isCouple && <>
                <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, marginTop: 6, marginBottom: 2 }}>{n2}</div>
                <div className="flex justify-between" style={{ padding: "6px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                  <span style={{ color: COLORS.text, fontSize: 12 }}>Income Tax (on {fmt(selectedYearData.p2Taxable)})</span>
                  <span style={{ color: COLORS.red, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.p2IncomeTax)}</span>
                </div>
                <div className="flex justify-between" style={{ padding: "6px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                  <span style={{ color: COLORS.text, fontSize: 12 }}>Medicare Levy</span>
                  <span style={{ color: COLORS.red, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.p2Medicare)}</span>
                </div>
                <div className="flex justify-between" style={{ padding: "6px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                  <span style={{ color: COLORS.text, fontSize: 12 }}>Super Contributions Tax (15%)</span>
                  <span style={{ color: COLORS.red, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.p2SuperContribTax)}</span>
                </div>
              </>}
              <div className="flex justify-between" style={{ padding: "8px 12px", background: COLORS.card, border: `2px solid ${COLORS.red}40`, borderRadius: 6, marginTop: 4 }}>
                <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 700 }}>Total Tax</span>
                <span style={{ color: COLORS.red, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(selectedYearData.totalTax + selectedYearData.totalSuperTax)}</span>
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.orange, marginBottom: 8 }}>Expenses</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <div className="flex justify-between" style={{ padding: "8px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 13 }}>Living & Recurring Expenses</span>
                <span style={{ color: COLORS.orange, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(selectedYearData.expenses)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "8px 12px", background: COLORS.card, border: `2px solid ${COLORS.orange}40`, borderRadius: 6 }}>
                <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>Total Outgoings (Tax + Expenses)</span>
                <span style={{ color: COLORS.red, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(selectedYearData.expenses + selectedYearData.totalTax + selectedYearData.totalSuperTax)}</span>
              </div>
            </div>
            <div style={{ padding: "12px 16px", background: netResult >= 0 ? `${COLORS.green}15` : `${COLORS.red}15`, border: `2px solid ${netResult >= 0 ? COLORS.green : COLORS.red}`, borderRadius: 8 }}>
              <div className="flex justify-between items-center">
                <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 700 }}>Net Result</span>
                <span style={{ color: netResult >= 0 ? COLORS.green : COLORS.red, fontSize: 20, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(netResult)}</span>
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{fmt(grossIncome)} income − {fmt(selectedYearData.totalTax + selectedYearData.totalSuperTax)} tax − {fmt(selectedYearData.expenses)} expenses</div>
            </div>
          </div>
        </Modal>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[
          { label: "Annual Surplus", value: fmt(surplus), color: surplus >= 0 ? COLORS.green : COLORS.red, sub: "Income minus all expenses" },
          { label: "Net Wealth", value: fmt(netWealth), color: COLORS.green, sub: "Investments + lifestyle assets" },
          { label: "Annual Income", value: fmt(totalIncome), color: COLORS.cyan, sub: "Salary, pension & other sources" },
          { label: "Annual Expenses", value: fmt(totalExpenses), color: COLORS.accent, sub: "Inc. debt repayments" },
          { label: "Net Investment Assets", value: fmt(netInvestment), color: COLORS.accent, sub: "Super + non-super minus debt" },
          { label: "Liabilities", value: fmt(totalLiabilities), color: totalLiabilities > 0 ? COLORS.red : COLORS.green, sub: totalAssets > 0 ? `Debt ratio: ${pct(totalLiabilities / (totalAssets + totalLifestyle))}` : "No debt recorded" },
        ].map((item, i) => (
          <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ color: COLORS.textMuted, fontSize: 10, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{item.label}</div>
            <div style={{ color: item.color, fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{item.value}</div>
            {item.sub && <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{item.sub}</div>}
          </div>
        ))}
      </div>

      <Card title="Asset Composition">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={assetPie} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={28} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true} fontSize={10}>
              {assetPie.map((_, i) => <Cell key={i} fill={COLORS.chartColors[i]} />)}
            </Pie>
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Income Forecast">
        <p style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 6, marginTop: -4, fontFamily: "'DM Sans', sans-serif" }}>Tap any bar to see the full breakdown.</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={forecastData} onClick={(e) => { if (e && e.activePayload) setSelectedYear(e.activePayload[0]?.payload?.year); }} style={{ cursor: "pointer" }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="year" tick={{ fill: COLORS.textDim, fontSize: 10 }} />
            <YAxis tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="salary" stackId="a" fill={COLORS.accent} name="Salary" />
            <Bar dataKey="investEarnings" stackId="a" fill={COLORS.orange} name="Invest. Earnings" />
            <Bar dataKey="pensionDraw" stackId="a" fill={COLORS.cyan} name="Pension Draw" />
            <Bar dataKey="agePension" stackId="a" fill={COLORS.purple} name="Age Pension" radius={[3, 3, 0, 0]} />
            <Bar dataKey="tax" fill={COLORS.red} name="Tax" opacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 5-year mini chart previews with expand to full projection */}
      {projectionData.length > 0 && (() => {
        const d5 = projectionData.slice(0, 5);
        const expandIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>;
        return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
          <Card title="Income vs Expenses" actions={<button onClick={() => setChartPopup("incomeVsExp")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>{expandIcon}</button>}>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={d5}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="year" tick={{ fill: COLORS.textDim, fontSize: 9 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 9 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="totalIncome" fill={COLORS.green} name="Income" opacity={0.8} />
                <Bar dataKey="totalExpenses" fill={COLORS.red} name="Expenses" opacity={0.6} />
                <Line type="monotone" dataKey="surplus" stroke={COLORS.accent} strokeWidth={2} dot={false} name="Surplus" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Asset Breakdown" actions={<button onClick={() => setChartPopup("assetBreakdown")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>{expandIcon}</button>}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={d5}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="year" tick={{ fill: COLORS.textDim, fontSize: 9 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 9 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Area type="monotone" dataKey="p1Super" stackId="1" fill={COLORS.chartColors[0]} stroke={COLORS.chartColors[0]} name={`${n1} Super`} />
                {isCouple && <Area type="monotone" dataKey="p2Super" stackId="1" fill={COLORS.chartColors[1]} stroke={COLORS.chartColors[1]} name={`${n2} Super`} />}
                <Area type="monotone" dataKey="jointNonSuper" stackId="1" fill={COLORS.chartColors[2]} stroke={COLORS.chartColors[2]} name="Joint" />
                <Area type="monotone" dataKey="p1NonSuper" stackId="1" fill={COLORS.chartColors[3]} stroke={COLORS.chartColors[3]} name={`${n1} Non-Super`} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Centrelink Age Pension" actions={<button onClick={() => setChartPopup("agePension")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>{expandIcon}</button>}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={d5}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="year" tick={{ fill: COLORS.textDim, fontSize: 9 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 9 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Area type="monotone" dataKey="agePension" fill={`${COLORS.purple}40`} stroke={COLORS.purple} strokeWidth={2} name="Age Pension" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Tax Breakdown" actions={<button onClick={() => setChartPopup("taxBreakdown")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>{expandIcon}</button>}>
            {renderTaxBreakdown(d5, 170)}
          </Card>

          <Card title="Debt" actions={<button onClick={() => setChartPopup("debtChart")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>{expandIcon}</button>}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={d5}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="year" tick={{ fill: COLORS.textDim, fontSize: 9 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 9 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Area type="monotone" dataKey="totalDebtRemaining" fill={COLORS.red + "30"} stroke={COLORS.red} strokeWidth={2} name="Debt" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Loan payoff summaries */}
          {(assets.loans || []).filter(l => l.balance > 0).map((loan, li) => {
            const r = (loan.fixedTermMonths > 0 && loan.fixedRate ? loan.fixedRate : loan.variableRate || 6) / 100 / 12;
            const n = loan.termMonths || 360;
            const minMo = loan.repaymentType === "pi" ? (r > 0 ? (loan.balance * r) / (1 - Math.pow(1 + r, -n)) : loan.balance / n) : loan.balance * r;
            const extraMo = getMonthlyEquiv(loan.extraRepayment || 0, loan.frequency);
            const totalMo = minMo + extraMo;
            const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const cy = new Date().getFullYear();

            const freqCalc = (freq) => {
              let pp;
              if (freq === "weekly") pp = totalMo / 4;
              else if (freq === "fortnightly") pp = totalMo / 2;
              else pp = totalMo;
              const pf = calcLoanPayoff(loan.balance, loan.variableRate, pp, freq, loan.repaymentType, loan.fixedRate, loan.fixedTermMonths, loan.termMonths);
              return { freq, perPeriod: pp, ...pf };
            };

            const monthly = freqCalc("monthly");
            const fortnightly = freqCalc("fortnightly");
            const weekly = freqCalc("weekly");
            const pd = new Date(cy, monthly.payoffMonth);

            return (
              <Card key={li} title={loan.description || `Loan ${li+1}`}>
                <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 , alignItems: "end" }}>
                    <div><div style={{ color: COLORS.textDim, fontSize: 9 }}>Paid Off</div><div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{loan.repaymentType === "io" ? "N/A" : `${monthNames[pd.getMonth()]} ${pd.getFullYear()}`}</div></div>
                    <div><div style={{ color: COLORS.textDim, fontSize: 9 }}>Total Interest</div><div style={{ color: COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{fmt(monthly.totalInterest)}</div></div>
                    <div><div style={{ color: COLORS.textDim, fontSize: 9 }}>Total Cost</div><div style={{ color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{fmt(monthly.totalPaid)}</div></div>
                  </div>
                </div>
                {loan.repaymentType !== "io" && (
                  <div>
                    <div style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 6, fontWeight: 600 }}>Payment Frequency Comparison</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 , alignItems: "end" }}>
                      {[monthly, fortnightly, weekly].map(c => {
                        const timeSaved = monthly.payoffMonth - c.payoffMonth;
                        const intSaved = monthly.totalInterest - c.totalInterest;
                        const isActive = c.freq === (loan.frequency || "monthly");
                        return (
                          <div key={c.freq} style={{
                            background: isActive ? COLORS.accent : COLORS.card, border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                            borderRadius: 6, padding: 8,
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#fff" : COLORS.text, textTransform: "capitalize", marginBottom: 2 }}>{c.freq}</div>
                            <div style={{ fontSize: 13, color: isActive ? "#fff" : COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(Math.round(c.perPeriod))}</div>
                            <div style={{ fontSize: 10, color: isActive ? "#ffffffcc" : COLORS.textDim, marginTop: 2 }}>{Math.floor(c.payoffMonth/12)}y {c.payoffMonth%12}m</div>
                            {timeSaved > 0 && <div style={{ fontSize: 10, color: isActive ? "#ffffffcc" : COLORS.green, marginTop: 2, fontWeight: 700 }}>Save {Math.floor(timeSaved/12)}y {timeSaved%12}m</div>}
                            {intSaved > 0 && <div style={{ fontSize: 10, color: isActive ? "#ffffffcc" : COLORS.green, fontWeight: 700 }}>Save {fmt(Math.round(intSaved))}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        );
      })()}

      {projectionData.length > 0 && (
        <Card title="Net Assets Over Time">
          <div className="flex gap-2" style={{ marginBottom: 14, flexWrap: "wrap" }}>
            <Btn small active={showInvestment} onClick={() => setShowInvestment(!showInvestment)} color={COLORS.green}>
              {showInvestment ? "✓" : ""} Net Investment Assets
            </Btn>
            <Btn small active={showLifestyle} onClick={() => setShowLifestyle(!showLifestyle)} color={COLORS.orange}>
              {showLifestyle ? "✓" : ""} Lifestyle Assets
            </Btn>
            <span style={{ width: 1, background: COLORS.border, margin: "0 4px" }} />
            <Btn small active={!showNominal} onClick={() => setShowNominal(false)} color={COLORS.purple}>
              Real (today's $)
            </Btn>
            <Btn small active={showNominal} onClick={() => setShowNominal(true)} color={COLORS.purple}>
              Nominal
            </Btn>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={projectionData} margin={{ bottom: 20 }}>
              <defs>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} label={{ value: `Age (${n1})`, position: "insideBottom", offset: -10, fill: COLORS.textDim }} />
              <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} labelFormatter={(l) => `Age ${l}`} />
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey={showNominal ? "netAssetsNominal" : "netAssetsReal"} stroke={COLORS.accent} fill="url(#gNet)" strokeWidth={2.5} name="Total Net Assets" />
              {showInvestment && <Area type="monotone" dataKey={showNominal ? "netInvestmentNominal" : "netInvestmentReal"} stroke={COLORS.green} fill="url(#gInv)" strokeWidth={2} strokeDasharray="6 3" name="Net Investment Assets" />}
              {showLifestyle && <Line type="monotone" dataKey={showNominal ? "lifestyleNominal" : "lifestyleReal"} stroke={COLORS.orange} strokeWidth={2} strokeDasharray="4 4" dot={false} name="Lifestyle Assets" />}
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, padding: "10px 14px", background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
            <p style={{ color: COLORS.textDim, fontSize: 11, margin: 0, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              <strong style={{ color: COLORS.text }}>Net Investment Assets</strong> shows only financial assets (super, non-super, investments) minus liabilities — the funds actually available to fund your lifestyle.
              <strong style={{ color: COLORS.text }}> Lifestyle Assets</strong> (home, cars, contents) grow or depreciate at their individual rates. Portfolios are rebalanced to target allocations annually.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// PERSONAL TAB
// ============================================================
function PersonalTab({ state, setState }) {
  const { personal } = state;
  const upd = (field, val) => setState(s => ({ ...s, personal: { ...s.personal, [field]: val } }));
  const updP1 = (field, val) => setState(s => ({ ...s, personal: { ...s.personal, person1: { ...s.personal.person1, [field]: val } } }));
  const updP2 = (field, val) => setState(s => ({ ...s, personal: { ...s.personal, person2: { ...s.personal.person2, [field]: val } } }));

  return (
    <div>
      <Card title="Household Type">
        <div className="flex gap-3" style={{ marginBottom: 16 }}>
          <Btn active={!personal.isCouple} onClick={() => upd("isCouple", false)}>Single</Btn>
          <Btn active={personal.isCouple} onClick={() => upd("isCouple", true)}>Couple</Btn>
        </div>
        <div className="flex gap-3">
          <Btn active={personal.isHomeowner} onClick={() => upd("isHomeowner", !personal.isHomeowner)} color={COLORS.green}>
            {personal.isHomeowner ? "✓ Homeowner" : "Renter"}
          </Btn>
          <Btn active={personal.hasPrivateHealth} onClick={() => upd("hasPrivateHealth", !personal.hasPrivateHealth)} color={COLORS.cyan}>
            {personal.hasPrivateHealth ? "✓ Private Health" : "No Private Health"}
          </Btn>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: personal.isCouple ? "1fr 1fr" : "1fr", gap: 16, alignItems: "start" }}>
        <Card title={personal.isCouple ? (personal.person1.name || "Person 1") : "Your Details"}>
          <div className="flex flex-col gap-3">
            <Input label="Name" value={personal.person1.name} onChange={(v) => updP1("name", v)} type="text" />
            <DateInput label="Date of Birth (DD/MM/YYYY)" value={personal.person1.dob || `${personal.person1.birthYear || 1965}-07-01`} onChange={(v) => { updP1("dob", v); const yr = v ? parseInt(v.split("-")[0]) : null; if (yr) updP1("birthYear", yr); }} />
            <Select label="Gender" value={personal.person1.gender} onChange={(v) => updP1("gender", v)} options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]} />
            <Select label="Employment Status" value={personal.person1.employmentStatus} onChange={(v) => updP1("employmentStatus", v)}
              options={[{ value: "employed", label: "Employed" }, { value: "selfEmployed", label: "Self-Employed" }, { value: "retired", label: "Retired" }, { value: "notWorking", label: "Not Working" }]} />
            <Input label="Retirement Age" value={personal.person1.retirementAge} onChange={(v) => updP1("retirementAge", v)} />
            <Input label="Life Expectancy" value={personal.person1.lifeExpectancy} onChange={(v) => updP1("lifeExpectancy", v)} />
          </div>
        </Card>

        {personal.isCouple && (
          <Card title={personal.person2.name || "Person 2"}>
            <div className="flex flex-col gap-3">
              <Input label="Name" value={personal.person2.name} onChange={(v) => updP2("name", v)} type="text" />
              <DateInput label="Date of Birth (DD/MM/YYYY)" value={personal.person2.dob || `${personal.person2.birthYear || 1970}-07-01`} onChange={(v) => { updP2("dob", v); const yr = v ? parseInt(v.split("-")[0]) : null; if (yr) updP2("birthYear", yr); }} />
              <Select label="Gender" value={personal.person2.gender} onChange={(v) => updP2("gender", v)} options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]} />
              <Select label="Employment Status" value={personal.person2.employmentStatus} onChange={(v) => updP2("employmentStatus", v)}
                options={[{ value: "employed", label: "Employed" }, { value: "selfEmployed", label: "Self-Employed" }, { value: "retired", label: "Retired" }, { value: "notWorking", label: "Not Working" }]} />
              <Input label="Retirement Age" value={personal.person2.retirementAge} onChange={(v) => updP2("retirementAge", v)} />
              <Input label="Life Expectancy" value={personal.person2.lifeExpectancy} onChange={(v) => updP2("lifeExpectancy", v)} />
            </div>
          </Card>
        )}
      </div>

      <Card title="Assumptions">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 , alignItems: "end" }}>
          <Input label="Inflation Rate (%)" value={personal.inflationRate} onChange={(v) => upd("inflationRate", v)} suffix="%" />
          <Input label="Salary Growth (%)" value={personal.salaryGrowth} onChange={(v) => upd("salaryGrowth", v)} suffix="%" />
          <Input label="Projection Years" value={personal.projectionYears} onChange={(v) => upd("projectionYears", v)} />
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// INCOME TAB
// ============================================================
function IncomeTab({ state, setState, scenario, onActivateAfter, onActivateNow, onResetAfter, afterState }) {
  const { income, personal } = state;
  const updP1 = (f, v) => setState(s => ({ ...s, income: { ...s.income, person1: { ...s.income.person1, [f]: v } } }));
  const updP2 = (f, v) => setState(s => ({ ...s, income: { ...s.income, person2: { ...s.income.person2, [f]: v } } }));

  const IncomeForm = ({ data, upd, name }) => (
    <Card title={`${name} – Income`}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 , alignItems: "end" }}>
        <Input label="Gross Salary / Package (excl. SG)" value={data.salary} onChange={(v) => upd("salary", v)} prefix="$" />
        <Input label="Salary Sacrifice to Super" value={data.salarySacrifice} onChange={(v) => upd("salarySacrifice", v)} prefix="$" />
        <Input label="Other Taxable Income" value={data.otherTaxable} onChange={(v) => upd("otherTaxable", v)} prefix="$" />
        <Input label="Franked Dividends" value={data.frankedDividends} onChange={(v) => upd("frankedDividends", v)} prefix="$" />
        <Input label="Rental Income" value={data.rentalIncome} onChange={(v) => upd("rentalIncome", v)} prefix="$" />
        <Input label="Tax-Free Income" value={data.taxFreeIncome} onChange={(v) => upd("taxFreeIncome", v)} prefix="$" />
        <Input label="Personal Deductible Super Contrib." value={data.personalDeductibleSuper} onChange={(v) => upd("personalDeductibleSuper", v)} prefix="$" />
        <Input label="Non-Concessional Super Contrib." value={data.nonConcessionalSuper} onChange={(v) => upd("nonConcessionalSuper", v)} prefix="$" />
      </div>
      <div style={{ marginTop: 16, padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 , alignItems: "end" }}>
        <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>SG Contribution</span><div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt((data.salary || 0) * (state.legislation.superParams.sgRate))}</div></div>
        <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Total Concessional</span><div style={{ color: COLORS.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt((data.salary || 0) * state.legislation.superParams.sgRate + (data.salarySacrifice || 0) + (data.personalDeductibleSuper || 0))}</div></div>
        <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Concessional Cap</span><div style={{ color: COLORS.orange, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt(state.legislation.superParams.concessionalCap)}</div></div>
      </div>
    </Card>
  );

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Income" />
      <IncomeForm data={income.person1} upd={updP1} name={personal.person1.name || "Person 1"} />
      {personal.isCouple && <IncomeForm data={income.person2} upd={updP2} name={personal.person2.name || "Person 2"} />}
    </div>
  );
}

// ============================================================
// SCENARIO TOGGLE — "Now" / "After Advice" toggle bar
// ============================================================
function ScenarioToggle({ scenario, onActivateAfter, onActivateNow, onResetAfter, afterState, tabName, readOnly }) {
  return (
    <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden", border: `2px solid ${scenario === "after" ? COLORS.green : COLORS.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <button
          onClick={onActivateNow}
          style={{
            background: scenario === "now" ? COLORS.accent : COLORS.card,
            border: "none", padding: "12px 16px", cursor: "pointer", textAlign: "left",
            borderRight: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ color: scenario === "now" ? "#fff" : COLORS.text, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>📍 Now</div>
          <div style={{ color: scenario === "now" ? "#ffffffcc" : COLORS.textDim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Current situation — baseline</div>
        </button>
        <button
          onClick={onActivateAfter}
          style={{
            background: scenario === "after" ? COLORS.green : COLORS.card,
            border: "none", padding: "12px 16px", cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{ color: scenario === "after" ? "#fff" : COLORS.text, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>✨ After Advice</div>
          <div style={{ color: scenario === "after" ? "#ffffffcc" : COLORS.textDim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
            {afterState ? "Showing recommended changes" : "Tap to start modelling improvements"}
          </div>
        </button>
      </div>
      {scenario === "after" && !readOnly && (
        <div style={{ background: `${COLORS.green}15`, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: COLORS.green, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            ✨ You are editing the <strong>After Advice</strong> scenario for {tabName}. Changes here won't affect the baseline.
          </span>
          <button onClick={onResetAfter} style={{ background: "none", border: `1px solid ${COLORS.green}`, borderRadius: 6, color: COLORS.green, fontSize: 10, padding: "3px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", marginLeft: 8 }}>
            Reset to Now
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RETURN SUMMARY — reusable panel showing income/growth/costs/net
// ============================================================
function ReturnSummary({ profile, adminFee, managementCost, adviceCost, returnProfiles, assetReturns }) {
  const rp = returnProfiles?.[profile] || returnProfiles?.["Balanced"] || {};
  const ar = assetReturns || {};
  let income = 0, growth = 0;
  for (const [cls, weight] of Object.entries(rp)) {
    const r = ar[cls];
    if (r) { income += r.income * weight; growth += r.growth * weight; }
  }
  const totalReturn = income + growth;
  const totalCosts = ((adminFee || 0) + (managementCost || 0) + (adviceCost || 0)) / 100;
  const netReturn = totalReturn - totalCosts;
  return (
    <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
      <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>Portfolio Returns — {profile}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Income Return</div>
          <div style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{pct(income)}</div>
        </div>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Capital Growth</div>
          <div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{pct(growth)}</div>
        </div>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Gross Total</div>
          <div style={{ color: COLORS.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{pct(totalReturn)}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, borderTop: `1px solid ${COLORS.border}`, paddingTop: 8 }}>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Investment Costs</div>
          <div style={{ color: COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>−{pct(totalCosts)}</div>
        </div>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 9 }}>Net Return</div>
          <div style={{ color: netReturn >= 0 ? COLORS.green : COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{pct(netReturn)}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ASSETS TAB
// ============================================================
function AssetsTab({ state, setState, scenario, onActivateAfter, onActivateNow, onResetAfter, afterState }) {
  const { assets, personal } = state;
  const profiles = Object.keys(state.returnProfiles);
  const returnProfiles = state.returnProfiles;
  const assetReturns = state.assetReturns;

  const updSuper = (key, field, val) => setState(s => ({ ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: { ...s.assets.superAccounts[key], [field]: val } } } }));
  const updNonSuper = (key, field, val) => setState(s => ({ ...s, assets: { ...s.assets, nonSuper: { ...s.assets.nonSuper, [key]: { ...s.assets.nonSuper[key], [field]: val } } } }));

  const addLifestyle = () => setState(s => ({ ...s, assets: { ...s.assets, lifestyleAssets: [...s.assets.lifestyleAssets, { description: "", value: 0, growth: 2.5, isPrimaryResidence: false }] } }));
  const updLifestyle = (i, f, v) => setState(s => {
    const arr = [...s.assets.lifestyleAssets]; arr[i] = { ...arr[i], [f]: v }; return { ...s, assets: { ...s.assets, lifestyleAssets: arr } };
  });
  const rmLifestyle = (i) => setState(s => ({ ...s, assets: { ...s.assets, lifestyleAssets: s.assets.lifestyleAssets.filter((_, j) => j !== i) } }));

  const addLiability = () => {};
  const updLiability = () => {};
  const rmLiability = () => {};

  const SuperForm = ({ sKey, label }) => {
    const acc = assets.superAccounts[sKey];
    const isPension = acc.type === "pension";
    const isTTR = acc.type === "ttr";
    const isAccum = acc.type === "accumulation";
    const hasConversion = isAccum && acc.pensionConversionYear;
    const convYear = acc.pensionConversionYear || "";
    const currentYear = new Date().getFullYear();

    // Projected balance at conversion year (simple estimate for display)
    const yearsToConversion = convYear ? Math.max(0, parseInt(convYear) - currentYear) : 0;
    const projectedAtConversion = convYear && acc.balance > 0
      ? Math.round(acc.balance * Math.pow(1.065, yearsToConversion))
      : null;
    const retainAmount = acc.pensionRetainAmount ?? 5000;
    const projectedPension = projectedAtConversion != null
      ? (acc.pensionConversionType === "partial" ? Math.max(0, projectedAtConversion - retainAmount) : projectedAtConversion)
      : null;
    const projectedRemaining = acc.pensionConversionType === "partial" && projectedAtConversion != null
      ? Math.min(retainAmount, projectedAtConversion)
      : null;

    return (
      <Card title={label}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Balance" value={acc.balance} onChange={(v) => updSuper(sKey, "balance", v)} prefix="$" />
            <Input label="Tax-Free Component" value={acc.taxFree} onChange={(v) => updSuper(sKey, "taxFree", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Select label="Portfolio Profile" value={acc.profile} onChange={(v) => updSuper(sKey, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} />
            <Select label="Account Type" value={acc.type} onChange={(v) => updSuper(sKey, "type", v)}
              options={[
                { value: "accumulation", label: "Accumulation" },
                { value: "ttr", label: "Transition to Retirement" },
                { value: "pension", label: "Account-Based Pension" },
              ]} />
          </div>

          {/* Tax rate info banner */}
          <div style={{ padding: "6px 10px", background: isPension ? `${COLORS.green}15` : isTTR ? `${COLORS.orange}15` : `${COLORS.accent}12`, borderRadius: 6, fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: isPension ? COLORS.green : isTTR ? COLORS.orange : COLORS.accent }}>
            {isTTR && "⚠ Transition to Retirement — requires age 60+ (conditions of release). Income return taxed at 15%; capital gains 0% tax-free. Draws replace reduced work income: min 4%, max 10% pa. No lump sums permitted (SIS Reg 6.01)."}
            {isPension && "✓ Account-Based Pension — tax-free earnings and draws after age 60. No maximum drawdown. Lump sums permitted tax-free. Min 4% pa applies."}
            {isAccum && !hasConversion && "Accumulation — earnings taxed at 15%. Set a pension start date below to plan the conversion."}
            {isAccum && hasConversion && "Accumulation — pension conversion scheduled. Earnings taxed at 15% until conversion date, then 0%."}
          </div>

          {/* Pension drawdown - only for pension/TTR */}
          {(isPension || isTTR) && (
            <Input
              label={isTTR ? "TTR Income Draw (min 4%, max 10% pa)" : "Pension Drawdown — min 4% pa (no max)"}
              value={acc.drawdownPct}
              onChange={(v) => updSuper(sKey, "drawdownPct", isTTR ? Math.min(10, Math.max(4, v)) : Math.max(4, v))}
              suffix="%"
            />
          )}

          {/* Pension conversion for accumulation accounts */}
          {isAccum && (
            <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8, border: `1px solid ${hasConversion ? COLORS.green + "50" : COLORS.border}` }}>
              <div style={{ color: COLORS.text, fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
                Pension Conversion (Future Date)
              </div>
              <p style={{ color: COLORS.textDim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginBottom: 8 }}>
                From preservation age 60 you can convert to an Account-Based Pension. Earnings become tax-free and the account enters pension phase for Centrelink assessment.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <FYInput label="Pension Start FY" value={convYear} onChange={(v) => updSuper(sKey, "pensionConversionYear", v || null)} />
                <Select label="Conversion Type" value={acc.pensionConversionType || "full"}
                  onChange={(v) => updSuper(sKey, "pensionConversionType", v)}
                  options={[{ value: "full", label: "Full balance" }, { value: "partial", label: "Partial (keep some in accum)" }]} />
              </div>
              {hasConversion && acc.pensionConversionType === "partial" && (
                <div style={{ marginTop: 8 }}>
                  <Input label="Retain in Accumulation ($)" value={retainAmount} onChange={(v) => updSuper(sKey, "pensionRetainAmount", v)} prefix="$" />
                </div>
              )}
              {hasConversion && projectedAtConversion != null && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: COLORS.card, borderRadius: 6, border: `1px solid ${COLORS.green}40` }}>
                  <div style={{ color: COLORS.textDim, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Estimated balance at {convYear} (6.5% pa)</div>
                  <div style={{ display: "grid", gridTemplateColumns: acc.pensionConversionType === "partial" ? "1fr 1fr" : "1fr", gap: 8 }}>
                    <div>
                      <div style={{ color: COLORS.textDim, fontSize: 9 }}>→ Account-Based Pension</div>
                      <div style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{fmt(projectedPension)}</div>
                      <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 2 }}>0% tax on earnings</div>
                    </div>
                    {acc.pensionConversionType === "partial" && projectedRemaining != null && (
                      <div>
                        <div style={{ color: COLORS.textDim, fontSize: 9 }}>→ Stays in Accumulation</div>
                        <div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{fmt(projectedRemaining)}</div>
                        <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 2 }}>15% tax on earnings</div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Input label="Drawdown % (from conversion date)" value={acc.drawdownPct} onChange={(v) => updSuper(sKey, "drawdownPct", v)} suffix="%" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Investment Costs (% p.a.)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Admin Fee" value={acc.adminFee ?? 0.15} onChange={(v) => updSuper(sKey, "adminFee", v)} suffix="%" />
            <Input label="Management Cost" value={acc.managementCost ?? 0.60} onChange={(v) => updSuper(sKey, "managementCost", v)} suffix="%" />
            <Input label="Advice Cost" value={acc.adviceCost ?? 0.50} onChange={(v) => updSuper(sKey, "adviceCost", v)} suffix="%" />
          </div>
          <ReturnSummary profile={acc.profile} adminFee={acc.adminFee ?? 0.15} managementCost={acc.managementCost ?? 0.60} adviceCost={acc.adviceCost ?? 0.50} returnProfiles={returnProfiles} assetReturns={assetReturns} />
        </div>
      </Card>
    );
  };

  const NonSuperForm = ({ nKey, label }) => {
    const acc = assets.nonSuper[nKey];
    if (!acc) return null;
    return (
      <Card title={label}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Balance" value={acc.balance} onChange={(v) => updNonSuper(nKey, "balance", v)} prefix="$" />
            <Input label="Unrealised Gains" value={acc.unrealisedGains} onChange={(v) => updNonSuper(nKey, "unrealisedGains", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Select label="Portfolio Profile" value={acc.profile} onChange={(v) => updNonSuper(nKey, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} />
            <Select label="Owner" value={acc.owner || nKey.replace("NonSuper","").replace("p1","p1").replace("p2","p2")} onChange={(v) => updNonSuper(nKey, "owner", v)}
              options={[{ value: "p1", label: personal.person1.name || "Person 1" }, ...(personal.isCouple ? [{ value: "p2", label: personal.person2.name || "Person 2" }] : []), { value: "joint", label: "Joint" }]} />
          </div>

          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Investment Costs (% p.a.)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Admin Fee" value={acc.adminFee ?? 0} onChange={(v) => updNonSuper(nKey, "adminFee", v)} suffix="%" />
            <Input label="Management Cost" value={acc.managementCost ?? 0.60} onChange={(v) => updNonSuper(nKey, "managementCost", v)} suffix="%" />
            <Input label="Advice Cost" value={acc.adviceCost ?? 0.50} onChange={(v) => updNonSuper(nKey, "adviceCost", v)} suffix="%" />
          </div>
          <ReturnSummary profile={acc.profile} adminFee={acc.adminFee ?? 0} managementCost={acc.managementCost ?? 0.60} adviceCost={acc.adviceCost ?? 0.50} returnProfiles={returnProfiles} assetReturns={assetReturns} />

          <div style={{ marginTop: 4 }}>
            <label style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: 6 }}>Asset Type</label>
            <div className="flex gap-2">
              <Btn small active={!acc.isDirectProperty} onClick={() => updNonSuper(nKey, "isDirectProperty", false)} color={COLORS.accent}>Managed Portfolio</Btn>
              <Btn small active={!!acc.isDirectProperty} onClick={() => updNonSuper(nKey, "isDirectProperty", true)} color={COLORS.orange}>Direct Property</Btn>
            </div>
          </div>

          {acc.isDirectProperty && (
            <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>Property Running Costs (p.a.)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <Input label="Council Rates" value={acc.councilRates ?? 0} onChange={(v) => updNonSuper(nKey, "councilRates", v)} prefix="$" />
                <Input label="Insurance" value={acc.propertyInsurance ?? 0} onChange={(v) => updNonSuper(nKey, "propertyInsurance", v)} prefix="$" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end", marginTop: 8 }}>
                <Input label="Agent Management Fee" value={acc.agentFee ?? 0} onChange={(v) => updNonSuper(nKey, "agentFee", v)} suffix="%" />
                <Input label="Repairs & Maintenance" value={acc.repairs ?? 0} onChange={(v) => updNonSuper(nKey, "repairs", v)} prefix="$" />
              </div>
              {acc.balance > 0 && (
                <div style={{ marginTop: 8, padding: "6px 8px", background: COLORS.card, borderRadius: 6, fontSize: 11, color: COLORS.textDim, fontFamily: "'DM Sans', sans-serif" }}>
                  Est. annual running costs: <span style={{ color: COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {fmt(Math.round((acc.councilRates || 0) + (acc.propertyInsurance || 0) + (acc.balance * (acc.agentFee || 0) / 100) + (acc.repairs || 0)))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const newExtraAcct = (type) => ({ balance: 0, taxFree: 0, profile: "Balanced", type, drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50, description: "" });
  const addExtraSuper = (person, type) => setState(s => {
    const key = `${person}Extra`;
    return { ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: [...(s.assets.superAccounts[key] || []), newExtraAcct(type)] } } };
  });
  const updExtraSuper = (person, i, field, val) => setState(s => {
    const key = `${person}Extra`;
    const arr = [...(s.assets.superAccounts[key] || [])];
    arr[i] = { ...arr[i], [field]: val };
    return { ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: arr } } };
  });
  const rmExtraSuper = (person, i) => setState(s => {
    const key = `${person}Extra`;
    return { ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: (s.assets.superAccounts[key] || []).filter((_, j) => j !== i) } } };
  });

  const ExtraSuper = ({ person, idx }) => {
    const key = `${person}Extra`;
    const acc = (assets.superAccounts[key] || [])[idx];
    if (!acc) return null;
    const isPension = acc.type === "pension";
    const isTTR = acc.type === "ttr";
    return (
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>{acc.description || `Additional Account ${idx + 1}`}<span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: isPension ? `${COLORS.green}20` : isTTR ? `${COLORS.orange}20` : `${COLORS.accent}15`, color: isPension ? COLORS.green : isTTR ? COLORS.orange : COLORS.accent }}>{isPension ? "Pension" : isTTR ? "TTR" : "Accumulation"}</span></span>}
           actions={<button onClick={() => rmExtraSuper(person, idx)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 18 }}>×</button>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Input label="Account Description / Fund Name" value={acc.description} onChange={(v) => updExtraSuper(person, idx, "description", v)} type="text" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Balance" value={acc.balance} onChange={(v) => updExtraSuper(person, idx, "balance", v)} prefix="$" />
            <Input label="Tax-Free Component" value={acc.taxFree} onChange={(v) => updExtraSuper(person, idx, "taxFree", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Select label="Portfolio Profile" value={acc.profile} onChange={(v) => updExtraSuper(person, idx, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} />
            <Select label="Account Type" value={acc.type} onChange={(v) => updExtraSuper(person, idx, "type", v)}
              options={[{ value: "accumulation", label: "Accumulation" }, { value: "ttr", label: "Transition to Retirement" }, { value: "pension", label: "Account-Based Pension" }]} />
          </div>
          {(isPension || isTTR) && <Input label={isTTR ? "TTR Drawdown (max 10% pa)" : "Pension Drawdown (% pa)"} value={acc.drawdownPct} onChange={(v) => updExtraSuper(person, idx, "drawdownPct", Math.min(isTTR ? 10 : 100, v))} suffix="%" />}
          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700 }}>Investment Costs (% p.a.)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Admin Fee" value={acc.adminFee ?? 0.15} onChange={(v) => updExtraSuper(person, idx, "adminFee", v)} suffix="%" />
            <Input label="Management Cost" value={acc.managementCost ?? 0.60} onChange={(v) => updExtraSuper(person, idx, "managementCost", v)} suffix="%" />
            <Input label="Advice Cost" value={acc.adviceCost ?? 0.50} onChange={(v) => updExtraSuper(person, idx, "adviceCost", v)} suffix="%" />
          </div>
          <ReturnSummary profile={acc.profile} adminFee={acc.adminFee ?? 0.15} managementCost={acc.managementCost ?? 0.60} adviceCost={acc.adviceCost ?? 0.50} returnProfiles={returnProfiles} assetReturns={assetReturns} />
        </div>
      </Card>
    );
  };

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Assets" />


      {/* Person 1 Super */}
      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 10 }}>{personal.person1.name || "Person 1"} — Superannuation</h3>
      <SuperForm sKey="p1Super" label={`${personal.person1.name || "Person 1"} – Super`} />
      <SuperForm sKey="p1Pension" label={`${personal.person1.name || "Person 1"} – Pension`} />
      {(assets.superAccounts.p1Extra || []).map((_, i) => <ExtraSuper key={i} person="p1" idx={i} />)}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Btn onClick={() => addExtraSuper("p1", "accumulation")} color={COLORS.accent}>+ Add Accumulation Account</Btn>
        <Btn onClick={() => addExtraSuper("p1", "pension")} color={COLORS.green}>+ Add Pension Account</Btn>
      </div>

      {personal.isCouple && <>
        {/* Person 2 Super */}
        <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginTop: 20, marginBottom: 10 }}>{personal.person2.name || "Person 2"} — Superannuation</h3>
        <SuperForm sKey="p2Super" label={`${personal.person2.name || "Person 2"} – Super`} />
        <SuperForm sKey="p2Pension" label={`${personal.person2.name || "Person 2"} – Pension`} />
        {(assets.superAccounts.p2Extra || []).map((_, i) => <ExtraSuper key={i} person="p2" idx={i} />)}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Btn onClick={() => addExtraSuper("p2", "accumulation")} color={COLORS.accent}>+ Add Accumulation Account</Btn>
          <Btn onClick={() => addExtraSuper("p2", "pension")} color={COLORS.green}>+ Add Pension Account</Btn>
        </div>
      </>}

      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, marginTop: 8, fontWeight: 600 }}>Non-Superannuation Investments</h3>
      <NonSuperForm nKey="p1NonSuper" label={`${personal.person1.name || "Person 1"} – Non-Super`} />
      {assets.nonSuper.p1NonSuper2 && <NonSuperForm nKey="p1NonSuper2" label={`${personal.person1.name || "Person 1"} – Non-Super 2`} />}
      <div style={{ marginBottom: 16 }}>
        <Btn onClick={() => setState(s => ({ ...s, assets: { ...s.assets, nonSuper: { ...s.assets.nonSuper, p1NonSuper2: s.assets.nonSuper.p1NonSuper2 ? undefined : { balance: 0, unrealisedGains: 0, profile: "Balanced", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false } } } }))} color={COLORS.accent}>
          {assets.nonSuper.p1NonSuper2 ? `− Remove ${personal.person1.name || "Person 1"} Non-Super 2` : `+ Add ${personal.person1.name || "Person 1"} Non-Super Account`}
        </Btn>
      </div>

      {personal.isCouple && <>
        <NonSuperForm nKey="p2NonSuper" label={`${personal.person2.name || "Person 2"} – Non-Super`} />
        {assets.nonSuper.p2NonSuper2 && <NonSuperForm nKey="p2NonSuper2" label={`${personal.person2.name || "Person 2"} – Non-Super 2`} />}
        <div style={{ marginBottom: 16 }}>
          <Btn onClick={() => setState(s => ({ ...s, assets: { ...s.assets, nonSuper: { ...s.assets.nonSuper, p2NonSuper2: s.assets.nonSuper.p2NonSuper2 ? undefined : { balance: 0, unrealisedGains: 0, profile: "Balanced", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false } } } }))} color={COLORS.accent}>
            {assets.nonSuper.p2NonSuper2 ? `− Remove ${personal.person2.name || "Person 2"} Non-Super 2` : `+ Add ${personal.person2.name || "Person 2"} Non-Super Account`}
          </Btn>
        </div>
      </>}

      {/* ── Principal Place of Residence ─────────────────────── */}
      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 8, marginTop: 24, fontWeight: 600 }}>Family Home</h3>
      <div style={{ padding: "8px 12px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 10 }}>
        <p style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Your home is excluded from all net wealth calculations — you need somewhere to live. It is still counted as a homeowner asset for the Centrelink assets test threshold.
        </p>
      </div>
      {assets.lifestyleAssets.map((a, realIdx) => a.isPrimaryResidence ? (
        <Card key={realIdx} title={a.description || "Principal Residence"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Description" value={a.description} onChange={(v) => updLifestyle(realIdx, "description", v)} type="text" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 , alignItems: "end" }}>
              <Input label="Current Value" value={a.value} onChange={(v) => updLifestyle(realIdx, "value", v)} prefix="$" />
              <Input label="Growth p.a." value={a.growth} onChange={(v) => updLifestyle(realIdx, "growth", v)} suffix="%" />
            </div>
            <div style={{ padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ color: COLORS.textDim, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Downsize Event</div>
              <p style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
                Enter the year you plan to downsize and the net proceeds released. These will be automatically added to your chosen investment pool in that year.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 , alignItems: "end" }}>
                  <FYInput label="Downsize FY" value={a.downsizeYear || ""} onChange={(v) => updLifestyle(realIdx, "downsizeYear", v)} />
                  <Input label="Net Proceeds" value={a.downsizeProceeds || ""} onChange={(v) => updLifestyle(realIdx, "downsizeProceeds", v)} prefix="$" />
                </div>
                <Select label="Allocate Proceeds To" value={a.downsizeAllocateTo || "joint"}
                  onChange={(v) => updLifestyle(realIdx, "downsizeAllocateTo", v)}
                  options={[
                    { value: "joint", label: "Joint" },
                    { value: "p1NonSuper", label: `${personal.person1.name || "Person 1"} Non-Super` },
                    ...(personal.isCouple ? [{ value: "p2NonSuper", label: `${personal.person2.name || "Person 2"} Non-Super` }] : []),
                  ]}
                />
              </div>
              {(a.downsizeYear || 0) > 0 && (a.downsizeProceeds || 0) > 0 && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: `${COLORS.green}20`, border: `1px solid ${COLORS.green}40`, borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: COLORS.green, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                    ✓ In {a.downsizeYear}, {fmt(a.downsizeProceeds)} will flow into {a.downsizeAllocateTo === "joint" ? "Joint Investments" : a.downsizeAllocateTo === "p1NonSuper" ? (personal.person1.name || "Person 1") + " Non-Super" : (personal.person2.name || "Person 2") + " Non-Super"}.
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : null)}


      {/* ── Other Lifestyle Assets ────────────────────────────── */}
      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 8, marginTop: 24, fontWeight: 600 }}>Other Lifestyle Assets</h3>
      <div style={{ padding: "8px 12px", background: `${COLORS.orange}15`, border: `1px solid ${COLORS.orange}40`, borderRadius: 8, marginBottom: 10 }}>
        <p style={{ color: COLORS.orange, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Cars, boats, art, jewellery etc. These appear in your Lifestyle Assets chart. You can record a planned sale with the proceeds going to investments or cash.
        </p>
      </div>
      {assets.lifestyleAssets.map((a, realIdx) => !a.isPrimaryResidence ? (
        <Card key={realIdx} title={a.description || `Asset ${realIdx+1}`} actions={<button onClick={() => rmLifestyle(realIdx)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 18 }}>×</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Description" value={a.description} onChange={(v) => updLifestyle(realIdx, "description", v)} type="text" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 , alignItems: "end" }}>
              <Input label="Current Value" value={a.value} onChange={(v) => updLifestyle(realIdx, "value", v)} prefix="$" />
              <Input label="Growth p.a." value={a.growth} onChange={(v) => updLifestyle(realIdx, "growth", v)} suffix="%" />
            </div>
            <div style={{ padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ color: COLORS.textDim, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Planned Sale</div>
              <p style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                Record a future sale of this asset. Proceeds will be redirected to investments in the sale year.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 , alignItems: "end" }}>
                  <FYInput label="Sale FY" value={a.saleYear || ""} onChange={(v) => updLifestyle(realIdx, "saleYear", v)} />
                  <Input label="Sale Proceeds" value={a.saleProceeds || ""} onChange={(v) => updLifestyle(realIdx, "saleProceeds", v)} prefix="$" />
                </div>
                <Select label="Allocate Proceeds To" value={a.saleAllocateTo || "joint"}
                  onChange={(v) => updLifestyle(realIdx, "saleAllocateTo", v)}
                  options={[
                    { value: "joint", label: "Joint" },
                    { value: "p1NonSuper", label: `${personal.person1.name || "Person 1"} Non-Super` },
                    ...(personal.isCouple ? [{ value: "p2NonSuper", label: `${personal.person2.name || "Person 2"} Non-Super` }] : []),
                  ]}
                />
              </div>
              {(a.saleYear || 0) > 0 && (a.saleProceeds || 0) > 0 && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: `${COLORS.green}20`, border: `1px solid ${COLORS.green}40`, borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: COLORS.green, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                    ✓ In {a.saleYear}, {fmt(a.saleProceeds)} will flow into {a.saleAllocateTo === "joint" ? "Joint Investments" : a.saleAllocateTo === "p1NonSuper" ? (personal.person1.name || "Person 1") + " Non-Super" : (personal.person2.name || "Person 2") + " Non-Super"}.
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : null)}
      <Btn onClick={addLifestyle} color={COLORS.green}>+ Add Lifestyle Asset</Btn>
    </div>
  );
}

// ============================================================
// EXPENSES TAB
// ============================================================
function ExpensesTab({ state, setState, scenario, onActivateAfter, onActivateNow, onResetAfter, afterState }) {
  const { expenses, personal } = state;
  const currentYear = new Date().getFullYear();
  const upd = (f, v) => setState(s => ({ ...s, expenses: { ...s.expenses, [f]: v } }));

  // Lifestyle expense periods
  const lifestyleExpenses = expenses.lifestyleExpenses || [];
  const addLifestyleExp = () => upd("lifestyleExpenses", [...lifestyleExpenses, { description: "", amount: 0, indexation: 2.5, startYear: currentYear, endYear: currentYear + 10 }]);
  const updLifestyleExp = (i, f, v) => { const arr = [...lifestyleExpenses]; arr[i] = { ...arr[i], [f]: v }; upd("lifestyleExpenses", arr); };
  const rmLifestyleExp = (i) => upd("lifestyleExpenses", lifestyleExpenses.filter((_, j) => j !== i));

  // Recurring expenses
  const addBase = () => upd("baseExpenses", [...expenses.baseExpenses, { description: "", amount: 0, type: "essential", indexation: 2.5, startYear: currentYear, endYear: currentYear + 30 }]);
  const updBase = (i, f, v) => { const arr = [...expenses.baseExpenses]; arr[i] = { ...arr[i], [f]: v }; upd("baseExpenses", arr); };
  const rmBase = (i) => upd("baseExpenses", expenses.baseExpenses.filter((_, j) => j !== i));

  const addFuture = () => upd("futureExpenses", [...expenses.futureExpenses, { description: "", amount: 0, startYear: currentYear + 1, endYear: currentYear + 5, indexation: 2.5, type: "desirable" }]);
  const updFuture = (i, f, v) => { const arr = [...expenses.futureExpenses]; arr[i] = { ...arr[i], [f]: v }; upd("futureExpenses", arr); };
  const rmFuture = (i) => upd("futureExpenses", expenses.futureExpenses.filter((_, j) => j !== i));

  const totalRecurring = expenses.baseExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Gifting helpers (shares state.gifts with Legislation tab)
  const gifts = state.gifts || [];
  const addGift = () => setState(s => ({ ...s, gifts: [...(s.gifts || []), { description: "", amount: 0, date: new Date().toISOString().split("T")[0], recipient: "" }] }));
  const updGift = (i, f, v) => setState(s => { const arr = [...(s.gifts || [])]; arr[i] = { ...arr[i], [f]: v }; return { ...s, gifts: arr }; });
  const rmGift = (i) => setState(s => ({ ...s, gifts: (s.gifts || []).filter((_, j) => j !== i) }));
  const centrelink = state.legislation?.centrelink || {};
  const freePerYear = centrelink.giftingFreeAreaPerYear || 10000;

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Expenses" />
      {/* Lifestyle Expense Periods */}
      <Card title="Lifestyle Expenses" actions={<Btn small onClick={addLifestyleExp} color={COLORS.green}>+ Add Period</Btn>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Define your expected living expenses across different life phases. Each period uses its own amount and indexation rate.
          Positive indexation = expenses grow, negative = expenses reduce over time.
        </p>
        {lifestyleExpenses.map((e, i) => (
          <div key={i} style={{ background: COLORS.infoBg || "#ece8e1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{e.description || `Period ${i+1}`}</span>
              <button onClick={() => rmLifestyleExp(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 , alignItems: "end" }}>
              <Input label="Description" value={e.description} onChange={(v) => updLifestyleExp(i, "description", v)} type="text" />
              <Input label="Annual Amount" value={e.amount} onChange={(v) => updLifestyleExp(i, "amount", v)} prefix="$" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
              <FYInput label="From FY" value={e.startYear} onChange={(v) => updLifestyleExp(i, "startYear", v)} />
              <FYInput label="To FY" value={e.endYear} onChange={(v) => updLifestyleExp(i, "endYear", v)} />
            </div>
            <Input label="Indexation" value={e.indexation} onChange={(v) => updLifestyleExp(i, "indexation", v)} suffix="%" />
          </div>
        ))}
      </Card>

      {/* Recurring Expenses */}
      <Card title="Recurring Expenses" actions={<Btn small onClick={addBase} color={COLORS.green}>+ Add</Btn>}>
        {expenses.baseExpenses.map((e, i) => (
          <div key={i} style={{ background: COLORS.infoBg || "#ece8e1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{e.description || `Expense ${i+1}`}</span>
              <button onClick={() => rmBase(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 , alignItems: "end" }}>
              <Input label="Description" value={e.description} onChange={(v) => updBase(i, "description", v)} type="text" />
              <Input label="Annual Amount" value={e.amount} onChange={(v) => updBase(i, "amount", v)} prefix="$" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
              <FYInput label="From FY" value={e.startYear} onChange={(v) => updBase(i, "startYear", v)} />
              <FYInput label="To FY" value={e.endYear} onChange={(v) => updBase(i, "endYear", v)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
              <Select label="Type" value={e.type} onChange={(v) => updBase(i, "type", v)} small options={[{ value: "essential", label: "Essential" }, { value: "desirable", label: "Desirable" }]} />
              <Input label="Indexation" value={e.indexation} onChange={(v) => updBase(i, "indexation", v)} suffix="%" />
            </div>
          </div>
        ))}
        {expenses.baseExpenses.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 16, padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
            <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Recurring Total: </span><span style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{fmt(totalRecurring)}</span></div>
          </div>
        )}
      </Card>

      {/* One-Off / Future Expenses */}
      <Card title="Future / One-Off Expenses" actions={<Btn small onClick={addFuture} color={COLORS.green}>+ Add</Btn>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>Expenses that occur in specific years (e.g. car purchase, renovations, travel).</p>
        {expenses.futureExpenses.map((e, i) => (
          <div key={i} style={{ background: COLORS.infoBg || "#ece8e1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{e.description || `Expense ${i+1}`}</span>
              <button onClick={() => rmFuture(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 , alignItems: "end" }}>
              <Input label="Description" value={e.description} onChange={(v) => updFuture(i, "description", v)} type="text" />
              <Input label="Amount" value={e.amount} onChange={(v) => updFuture(i, "amount", v)} prefix="$" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
              <FYInput label="From FY" value={e.startYear} onChange={(v) => updFuture(i, "startYear", v)} />
              <FYInput label="To FY" value={e.endYear} onChange={(v) => updFuture(i, "endYear", v)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
              <Select label="Type" value={e.type} onChange={(v) => updFuture(i, "type", v)} small options={[{ value: "essential", label: "Essential" }, { value: "desirable", label: "Desirable" }]} />
              <Input label="Indexation" value={e.indexation} onChange={(v) => updFuture(i, "indexation", v)} suffix="%" />
            </div>
          </div>
        ))}
      </Card>

      {/* Centrelink Gifting */}
      <Card title="Centrelink Gifting Rules" actions={<Btn small onClick={addGift} color={COLORS.green}>+ Add Gift</Btn>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
          Gifts up to <strong style={{ color: COLORS.text }}>{fmt(freePerYear)}/year</strong> (max <strong style={{ color: COLORS.text }}>{fmt(centrelink.giftingFreeAreaFiveYear || 30000)} over 5 years</strong>) are exempt from Centrelink assessment and immediately benefit the Age Pension by reducing assessable assets. Gifting above these limits is <strong style={{ color: COLORS.text }}>not prohibited</strong> — only the <em>excess</em> is treated as a <strong style={{ color: COLORS.orange }}>deprived asset</strong> for <strong style={{ color: COLORS.text }}>5 years</strong>. Once the 5-year clock expires, those excess amounts drop off and the Age Pension improves.
        </p>
        <div style={{ padding: "8px 10px", background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}40`, borderRadius: 6, marginBottom: 10, fontSize: 11, color: COLORS.green, fontFamily: "'DM Sans', sans-serif" }}>
          💡 If already receiving the <strong>full Age Pension</strong>, deprivation rules are irrelevant — gifting of any amount cannot reduce the pension below the maximum rate.
        </div>
        {gifts.map((g, i) => {
          const giftDate = g.date ? new Date(g.date) : new Date(`${g.year || currentYear}-07-01`);
          const expiryDate = new Date(giftDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + 5);
          const expired = new Date() >= expiryDate;
          const daysLeft = Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)));
          const yearsLeft = Math.floor(daysLeft / 365);
          const monthsLeft = Math.ceil((daysLeft % 365) / 30);
          const deprived = Math.max(0, (g.amount || 0) - freePerYear);
          const expiryStr = expiryDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
          return (
            <div key={i} style={{
              background: expired ? `${COLORS.border}30` : COLORS.infoBg || "#ece8e1",
              borderRadius: 8, padding: 10, marginBottom: 8,
              border: `1px solid ${expired ? COLORS.border : deprived > 0 ? COLORS.orange + "60" : COLORS.green + "50"}`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: expired ? COLORS.textDim : deprived > 0 ? COLORS.orange : COLORS.green, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                  {expired ? "✓ Expired — no longer assessed" : deprived > 0 ? `⚠ Deprived: ${fmt(deprived)} — expires ${expiryStr}` : "✓ Within exempt limits"}
                </span>
                <button onClick={() => rmGift(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6, alignItems: "end" }}>
                <Input label="Description / Purpose" value={g.description} onChange={(v) => updGift(i, "description", v)} type="text" />
                <Input label="Amount" value={g.amount} onChange={(v) => updGift(i, "amount", v)} prefix="$" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <DateInput label="Date of Gift (DD/MM/YYYY)" value={g.date || `${currentYear}-01-01`} onChange={(v) => updGift(i, "date", v)} />
                <Input label="Recipient" value={g.recipient} onChange={(v) => updGift(i, "recipient", v)} type="text" />
              </div>
              {!expired && deprived > 0 && (
                <div style={{ marginTop: 6, padding: "6px 8px", background: `${COLORS.orange}15`, borderRadius: 6, fontSize: 10, color: COLORS.orange, fontFamily: "'DM Sans', sans-serif" }}>
                  {fmt(deprived)} counted as a deprived asset until <strong>{expiryStr}</strong>.
                  {(yearsLeft > 0 || monthsLeft > 0) && ` Clears in ${yearsLeft > 0 ? `${yearsLeft}y ` : ""}${monthsLeft > 0 ? `${monthsLeft}m` : ""}.`}
                </div>
              )}
              {!expired && deprived === 0 && (g.amount || 0) > 0 && (
                <div style={{ marginTop: 6, padding: "6px 8px", background: `${COLORS.green}15`, borderRadius: 6, fontSize: 10, color: COLORS.green, fontFamily: "'DM Sans', sans-serif" }}>
                  {fmt(g.amount)} is within the annual exempt limit — reduces assessable assets immediately.
                </div>
              )}
            </div>
          );
        })}
        {gifts.length === 0 && (
          <p style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>No gifts recorded. Add any gifts to check whether they affect Age Pension entitlement.</p>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// TAX & LEGISLATION TAB
// ============================================================
function TaxTab({ state, setState }) {
  const { legislation } = state;
  const gifts = state.gifts || [];
  const currentYear = new Date().getFullYear();

  const updBracket = (i, f, v) => {
    const arr = [...legislation.taxBrackets]; arr[i] = { ...arr[i], [f]: v };
    setState(s => ({ ...s, legislation: { ...s.legislation, taxBrackets: arr } }));
  };
  const updSuper = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, superParams: { ...s.legislation.superParams, [f]: v } } }));
  const updCL = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, centrelink: { ...s.legislation.centrelink, [f]: v } } }));
  const updMed = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, medicare: { ...s.legislation.medicare, [f]: v } } }));
  const addGift = () => setState(s => ({ ...s, gifts: [...(s.gifts || []), { description: "", amount: 0, date: new Date().toISOString().split("T")[0], recipient: "" }] }));
  const updGift = (i, f, v) => { const arr = [...gifts]; arr[i] = { ...arr[i], [f]: v }; setState(s => ({ ...s, gifts: arr })); };
  const rmGift = (i) => setState(s => ({ ...s, gifts: s.gifts.filter((_, j) => j !== i) }));

  const LegBadge = ({ text }) => (
    <span style={{ fontSize: 9, background: `${COLORS.accent}20`, color: COLORS.accent, padding: "2px 6px", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: 0.3 }}>{text}</span>
  );

  return (
    <div>
      <div style={{ padding: "10px 14px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 12 }}>
        <p style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Rates shown are <strong>2025–26 financial year</strong>. All projections recalculate automatically when values are changed.
        </p>
      </div>

      {/* Income Tax */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Income Tax Brackets <LegBadge text="ITAA 1997 — FY 2025–26" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Stage 3 tax cuts effective 1 July 2024. Low income tax offset (LITO) up to $700 applies below $37,500.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "end" }}>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Range</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Min ($)</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Max ($)</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Rate (%)</span>
        </div>
        {legislation.taxBrackets.map((b, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ color: COLORS.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{b.label}</span>
            <Input value={b.min} onChange={(v) => updBracket(i, "min", v)} small />
            <Input value={b.max === Infinity ? "∞" : b.max} onChange={(v) => updBracket(i, "max", v === "∞" ? Infinity : v)} small type="text" />
            <Input value={(b.rate * 100)} onChange={(v) => updBracket(i, "rate", v / 100)} suffix="%" small />
          </div>
        ))}
      </Card>

      {/* Medicare */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Medicare Levy <LegBadge text="MLAA 1986 — 2.0% from 2014" /></span>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Levy Rate" value={(legislation.medicare.levyRate * 100)} onChange={(v) => updMed("levyRate", v / 100)} suffix="%" />
            <Input label="Surcharge Rate (no private)" value={(legislation.medicare.surchargeRate * 100)} onChange={(v) => updMed("surchargeRate", v / 100)} suffix="%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Surcharge Threshold (Single)" value={legislation.medicare.surchargeThresholdSingle} onChange={(v) => updMed("surchargeThresholdSingle", v)} prefix="$" />
            <Input label="Surcharge Threshold (Family)" value={legislation.medicare.surchargeThresholdFamily} onChange={(v) => updMed("surchargeThresholdFamily", v)} prefix="$" />
          </div>
        </div>
      </Card>

      {/* Superannuation */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Superannuation <LegBadge text="SIS Act 1993 — FY 2025–26" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          SG rate 12% from 1 Jul 2025. Pension phase earnings tax-exempt. Division 293 applies above ${(legislation.superParams.div293Threshold || 250000).toLocaleString()}.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Concessional Cap" value={legislation.superParams.concessionalCap} onChange={(v) => updSuper("concessionalCap", v)} prefix="$" />
            <Input label="Non-Concessional Cap" value={legislation.superParams.nonConcessionalCap} onChange={(v) => updSuper("nonConcessionalCap", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="SG Rate" value={(legislation.superParams.sgRate * 100)} onChange={(v) => updSuper("sgRate", v / 100)} suffix="%" />
            <Input label="Preservation Age" value={legislation.superParams.preservationAge} onChange={(v) => updSuper("preservationAge", v)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Accumulation Tax Rate" value={(legislation.superParams.taxRate * 100)} onChange={(v) => updSuper("taxRate", v / 100)} suffix="%" />
            <Input label="Pension Phase Tax Rate" value={((legislation.superParams.pensionTaxRate || 0) * 100)} onChange={(v) => updSuper("pensionTaxRate", v / 100)} suffix="%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Div. 293 Threshold" value={legislation.superParams.div293Threshold || 250000} onChange={(v) => updSuper("div293Threshold", v)} prefix="$" />
            <Input label="Div. 293 Extra Tax Rate" value={((legislation.superParams.div293Rate || 0.15) * 100)} onChange={(v) => updSuper("div293Rate", v / 100)} suffix="%" />
          </div>
          <Input label="Transfer Balance Cap" value={legislation.superParams.transferBalanceCap} onChange={(v) => updSuper("transferBalanceCap", v)} prefix="$" />
        </div>
      </Card>

      {/* Centrelink */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Age Pension <LegBadge text="Social Security Act 1991 — Mar 2025 indexed" /></span>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Both assets test and income test are applied. The test yielding the <strong>lower pension</strong> applies. Super in accumulation phase is excluded from assets test until pension age.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Single Max Pension (pa)" value={legislation.centrelink.singleMaxPension} onChange={(v) => updCL("singleMaxPension", v)} prefix="$" />
            <Input label="Couple Max Pension (pa)" value={legislation.centrelink.coupleMaxPension} onChange={(v) => updCL("coupleMaxPension", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Age Qualifying Age" value={legislation.centrelink.ageQualifyingAge} onChange={(v) => updCL("ageQualifyingAge", v)} />
            <Input label="Asset Taper ($3/fn per $1,000 = 7.8% pa)" value={(legislation.centrelink.assetTaperRate * 100).toFixed(1)} onChange={(v) => updCL("assetTaperRate", v / 100)} suffix="%" />
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Assets Test Thresholds (lower threshold = full pension starts to reduce)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Single Homeowner" value={legislation.centrelink.singleAssetThresholdHomeowner} onChange={(v) => updCL("singleAssetThresholdHomeowner", v)} prefix="$" />
            <Input label="Couple Homeowner" value={legislation.centrelink.coupleAssetThresholdHomeowner} onChange={(v) => updCL("coupleAssetThresholdHomeowner", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Single Non-Homeowner" value={legislation.centrelink.singleAssetThresholdNonHomeowner || 566000} onChange={(v) => updCL("singleAssetThresholdNonHomeowner", v)} prefix="$" />
            <Input label="Couple Non-Homeowner" value={legislation.centrelink.coupleAssetThresholdNonHomeowner || 722000} onChange={(v) => updCL("coupleAssetThresholdNonHomeowner", v)} prefix="$" />
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Income Test</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Single Free Area (pa)" value={legislation.centrelink.singleIncomeThreshold} onChange={(v) => updCL("singleIncomeThreshold", v)} prefix="$" />
            <Input label="Couple Free Area (pa)" value={legislation.centrelink.coupleIncomeThreshold} onChange={(v) => updCL("coupleIncomeThreshold", v)} prefix="$" />
          </div>
          <Input label="Income Taper Rate" value={(legislation.centrelink.incomeTaperRate * 100)} onChange={(v) => updCL("incomeTaperRate", v / 100)} suffix="%" />
          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Deeming Rates (frozen until 30 Jun 2025)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Lower Deeming Rate" value={(legislation.centrelink.deemingRateLower * 100)} onChange={(v) => updCL("deemingRateLower", v / 100)} suffix="%" />
            <Input label="Upper Deeming Rate" value={(legislation.centrelink.deemingRateUpper * 100)} onChange={(v) => updCL("deemingRateUpper", v / 100)} suffix="%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Deeming Threshold (Single)" value={legislation.centrelink.deemingThresholdSingle} onChange={(v) => updCL("deemingThresholdSingle", v)} prefix="$" />
            <Input label="Deeming Threshold (Couple)" value={legislation.centrelink.deemingThresholdCouple} onChange={(v) => updCL("deemingThresholdCouple", v)} prefix="$" />
          </div>
        </div>
      </Card>

      {/* Gifting Rules */}
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>Centrelink Gifting & Asset Deprivation <LegBadge text="SSA 1991 s.1123–1130 — 5-year rule" /></span>}
            actions={<Btn small onClick={addGift} color={COLORS.green}>+ Add Gift</Btn>}>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
          Gifts up to <strong>$10,000/year</strong> (max $30,000 over 5 years) are exempt. Amounts above these limits are treated as <strong>deprived assets</strong> and continue to count in the assets test for <strong>5 years</strong> from the date of gift.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, alignItems: "end" }}>
          <Input label="Annual Gifting Allowance" value={legislation.centrelink.giftingFreeAreaPerYear || 10000} onChange={(v) => updCL("giftingFreeAreaPerYear", v)} prefix="$" />
          <Input label="5-Year Rolling Allowance" value={legislation.centrelink.giftingFreeAreaFiveYear || 30000} onChange={(v) => updCL("giftingFreeAreaFiveYear", v)} prefix="$" />
        </div>

        {gifts.map((g, i) => {
          const yearsAgo = currentYear - (g.year || currentYear);
          const expired = yearsAgo >= 5;
          const freeArea = legislation.centrelink.giftingFreeAreaPerYear || 10000;
          const deprived = Math.max(0, (g.amount || 0) - freeArea);
          return (
            <div key={i} style={{ background: expired ? `${COLORS.border}40` : COLORS.infoBg || "#ece8e1", borderRadius: 8, padding: 10, marginBottom: 8, border: `1px solid ${expired ? COLORS.border : deprived > 0 ? COLORS.orange + "60" : COLORS.green + "40"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: expired ? COLORS.textDim : deprived > 0 ? COLORS.orange : COLORS.green, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                    {expired ? "✓ Expired (5yr passed)" : deprived > 0 ? `⚠ Deprived: ${fmt(deprived)}` : "✓ Within limits"}
                  </span>
                </div>
                <button onClick={() => rmGift(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6, alignItems: "end" }}>
                <Input label="Description" value={g.description} onChange={(v) => updGift(i, "description", v)} type="text" />
                <Input label="Amount" value={g.amount} onChange={(v) => updGift(i, "amount", v)} prefix="$" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <DateInput label="Date of Gift (DD/MM/YYYY)" value={g.date || `${currentYear}-01-01`} onChange={(v) => updGift(i, "date", v)} />
                <Input label="Recipient" value={g.recipient} onChange={(v) => updGift(i, "recipient", v)} type="text" />
              </div>
              {!expired && deprived > 0 && (
                <div style={{ marginTop: 6, fontSize: 10, color: COLORS.orange, fontFamily: "'DM Sans', sans-serif" }}>
                  {fmt(deprived)} counts as a deprived asset until {(g.year || currentYear) + 5}
                </div>
              )}
            </div>
          );
        })}
        {gifts.length === 0 && (
          <p style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>No gifts recorded. Add gifts to track Centrelink deprivation rules.</p>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// RETURNS & PORTFOLIO TAB
// ============================================================
function ReturnsTab({ state, setState }) {
  const updReturn = (asset, field, val) => setState(s => ({ ...s, assetReturns: { ...s.assetReturns, [asset]: { ...s.assetReturns[asset], [field]: val } } }));
  const updProfile = (profile, asset, val) => setState(s => ({ ...s, returnProfiles: { ...s.returnProfiles, [profile]: { ...s.returnProfiles[profile], [asset]: val / 100 } } }));

  const selectedProfile = Object.keys(state.returnProfiles)[0];
  const [viewProfile, setViewProfile] = useState(selectedProfile);

  return (
    <div>
      <Card title="Asset Class Return Assumptions">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 , alignItems: "end" }}>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Asset Class</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Income Yield %</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Capital Growth %</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Volatility (σ) %</span>
        </div>
        {Object.entries(state.assetReturns).map(([key, r]) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ color: COLORS.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{ASSET_LABELS[key]}</span>
            <Input value={(r.income * 100)} onChange={(v) => updReturn(key, "income", v / 100)} suffix="%" small />
            <Input value={(r.growth * 100)} onChange={(v) => updReturn(key, "growth", v / 100)} suffix="%" small />
            <Input value={(r.volatility * 100)} onChange={(v) => updReturn(key, "volatility", v / 100)} suffix="%" small />
          </div>
        ))}
      </Card>

      <Card title="Portfolio Allocation Profiles">
        <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          {Object.keys(state.returnProfiles).map(p => (
            <Btn key={p} small active={viewProfile === p} onClick={() => setViewProfile(p)}>{p}</Btn>
          ))}
        </div>
        {viewProfile && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 , alignItems: "end" }}>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Asset Class</span>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Allocation %</span>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Expected Return</span>
            </div>
            {Object.entries(state.returnProfiles[viewProfile]).map(([asset, alloc]) => {
              const ret = state.assetReturns[asset];
              const totalReturn = ret ? (ret.income + ret.growth) : 0;
              return (
                <div key={asset} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ color: COLORS.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{ASSET_LABELS[asset]}</span>
                  <Input value={(alloc * 100).toFixed(0)} onChange={(v) => updProfile(viewProfile, asset, Number(v))} suffix="%" small />
                  <span style={{ color: COLORS.cyan, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{pct(totalReturn)}</span>
                </div>
              );
            })}
            <div style={{ marginTop: 12, padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Weighted Expected Return: </span>
              <span style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                {pct(Object.entries(state.returnProfiles[viewProfile]).reduce((s, [a, w]) => {
                  const r = state.assetReturns[a]; return s + (r ? (r.income + r.growth) * w : 0);
                }, 0))}
              </span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={Object.entries(state.returnProfiles[viewProfile] || {}).map(([k, v]) => ({ name: ASSET_LABELS[k], allocation: v * 100 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={{ fill: COLORS.textDim, fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
              <Bar dataKey="allocation" fill={COLORS.accent} radius={[4, 4, 0, 0]} name="Allocation %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function getMonthlyEquiv(amount, frequency) {
  if (frequency === "weekly") return amount * 52 / 12;
  if (frequency === "fortnightly") return amount * 26 / 12;
  return amount; // monthly
}

function calcLoanPayoff(balance, rate, repaymentAmount, frequency, repaymentType, fixedRate, fixedTermMonths, termMonths) {
  if (!balance || balance <= 0) return { payoffMonth: 0, totalInterest: 0, totalPaid: 0 };
  // Simulate at actual payment frequency to capture the benefit of more frequent payments
  const periodsPerYear = frequency === "weekly" ? 52 : frequency === "fortnightly" ? 26 : 12;
  const maxPeriods = (termMonths || 360) / 12 * periodsPerYear;
  const fixedPeriods = (fixedTermMonths || 0) / 12 * periodsPerYear;
  let rem = balance;
  let totalInt = 0;
  let period = 0;
  while (rem > 0.01 && period < maxPeriods) {
    const annualRate = (period < fixedPeriods && fixedRate) ? (fixedRate / 100) : (rate / 100);
    const periodRate = annualRate / periodsPerYear;
    const intPmt = rem * periodRate;
    totalInt += intPmt;
    if (repaymentType === "io") { period++; continue; }
    const pmt = repaymentAmount > 0 ? repaymentAmount : (periodRate > 0 ? (rem * periodRate) / (1 - Math.pow(1 + periodRate, -(maxPeriods - period))) : rem / (maxPeriods - period));
    const princ = Math.max(0, pmt - intPmt);
    rem = Math.max(0, rem - princ);
    period++;
    if (princ <= 0) break;
  }
  const payoffMonths = Math.ceil(period / periodsPerYear * 12);
  return { payoffMonth: payoffMonths, totalInterest: totalInt, totalPaid: totalInt + balance };
}

// ============================================================
// PROJECTION ENGINE
// ============================================================
function runProjection(state, useRandomReturns = false, seed = 0) {
  const { personal, income, assets, expenses, legislation, returnProfiles, assetReturns } = state;
  const currentYear = new Date().getFullYear();
  const years = personal.projectionYears || 30;
  const inflation = (personal.inflationRate || 2.5) / 100;
  const salaryGrowth = (personal.salaryGrowth || 3) / 100;
  const isCouple = personal.isCouple;

  // Age calculation — use full DOB if available for accuracy, fall back to birth year
  const calcAgeInYear = (dob, birthYear, targetYear) => {
    if (dob) {
      const d = new Date(dob);
      // Age at start of FY (1 July of target year)
      const fyStart = new Date(`${targetYear}-07-01`);
      let age = fyStart.getFullYear() - d.getFullYear();
      if (fyStart < new Date(`${fyStart.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)) age--;
      return age;
    }
    return targetYear - (birthYear || 1970);
  };
  const age1Start = calcAgeInYear(personal.person1.dob, personal.person1.birthYear, currentYear);
  const age2Start = isCouple ? calcAgeInYear(personal.person2.dob, personal.person2.birthYear, currentYear) : 0;
  const retAge1 = personal.person1.retirementAge || 67;
  const retAge2 = isCouple ? (personal.person2.retirementAge || 67) : 999;

  // Helper: generate per-asset-class random returns for a year
  const getAssetClassReturns = (random) => {
    const returns = {};
    for (const [key, r] of Object.entries(assetReturns)) {
      const base = r.income + r.growth;
      returns[key] = random ? base + r.volatility * boxMullerRandom() : base;
    }
    return returns;
  };

  // Helper: grow a pool by tracking each asset class separately, then rebalance annually
  // investmentCostRate: total annual % fee deducted from pool (admin + management + advice)
  const growPool = (holdings, profileName, classReturns, investmentCostRate = 0) => {
    const profile = returnProfiles[profileName] || returnProfiles["Balanced"];
    let newTotal = 0;

    // Apply each asset class's return to its portion
    for (const [assetClass] of Object.entries(profile)) {
      const currentValue = holdings[assetClass] || 0;
      const ret = classReturns[assetClass] || 0;
      newTotal += currentValue * (1 + ret);
    }

    // Deduct investment costs
    newTotal = newTotal * (1 - investmentCostRate);

    // Rebalance back to target weights annually
    const rebalancedHoldings = {};
    if (newTotal > 0) {
      for (const [assetClass, weight] of Object.entries(profile)) {
        rebalancedHoldings[assetClass] = newTotal * weight;
      }
    }

    return { holdings: rebalancedHoldings, total: newTotal };
  };

  // Initialise holdings for each pool based on their profile allocation
  const initHoldings = (balance, profileName) => {
    const profile = returnProfiles[profileName] || returnProfiles["Balanced"];
    const h = {};
    for (const [assetClass, weight] of Object.entries(profile)) {
      h[assetClass] = (balance || 0) * weight;
    }
    return h;
  };

  const superProfile = assets.superAccounts.p1Super?.profile || "Balanced";
  const nonSuperProfile = assets.nonSuper.joint?.profile || "Balanced";

  let p1SuperBal = (assets.superAccounts.p1Super?.balance || 0) + (assets.superAccounts.p1Pension?.balance || 0)
    + (assets.superAccounts.p1Extra || []).reduce((s, a) => s + (a.balance || 0), 0);
  let p2SuperBal = (assets.superAccounts.p2Super?.balance || 0) + (assets.superAccounts.p2Pension?.balance || 0)
    + (assets.superAccounts.p2Extra || []).reduce((s, a) => s + (a.balance || 0), 0);
  // Non-super balances: route by owner field. Joint-owned assets use the joint pool.
  const getOwner = (acc, defaultOwner) => acc?.owner || defaultOwner;
  const p1NSBases = [
    getOwner(assets.nonSuper.p1NonSuper, "p1") === "p1" ? (assets.nonSuper.p1NonSuper?.balance || 0) : 0,
    getOwner(assets.nonSuper.p1NonSuper2, "p1") === "p1" ? (assets.nonSuper.p1NonSuper2?.balance || 0) : 0,
  ];
  const p2NSBases = [
    getOwner(assets.nonSuper.p2NonSuper, "p2") === "p2" ? (assets.nonSuper.p2NonSuper?.balance || 0) : 0,
    getOwner(assets.nonSuper.p2NonSuper2, "p2") === "p2" ? (assets.nonSuper.p2NonSuper2?.balance || 0) : 0,
  ];
  const jointBases = [
    getOwner(assets.nonSuper.p1NonSuper, "p1") === "joint" ? (assets.nonSuper.p1NonSuper?.balance || 0) : 0,
    getOwner(assets.nonSuper.p2NonSuper, "p2") === "joint" ? (assets.nonSuper.p2NonSuper?.balance || 0) : 0,
    getOwner(assets.nonSuper.p1NonSuper2, "p1") === "joint" ? (assets.nonSuper.p1NonSuper2?.balance || 0) : 0,
    getOwner(assets.nonSuper.p2NonSuper2, "p2") === "joint" ? (assets.nonSuper.p2NonSuper2?.balance || 0) : 0,
    assets.nonSuper.joint?.balance || 0, // legacy joint pool
  ];
  let p1NonSuperBal = p1NSBases.reduce((a, b) => a + b, 0);
  let p2NonSuperBal = p2NSBases.reduce((a, b) => a + b, 0);
  let jointNonSuperBal = jointBases.reduce((a, b) => a + b, 0);

  let p1SuperH = initHoldings(p1SuperBal, superProfile);
  let p2SuperH = initHoldings(p2SuperBal, assets.superAccounts.p2Super?.profile || superProfile);
  let p1NonSuperH = initHoldings(p1NonSuperBal, assets.nonSuper.p1NonSuper?.profile || nonSuperProfile);
  let p2NonSuperH = initHoldings(p2NonSuperBal, assets.nonSuper.p2NonSuper?.profile || nonSuperProfile);
  let jointNonSuperH = initHoldings(jointNonSuperBal, nonSuperProfile);

  const data = [];

  for (let y = 0; y < years; y++) {
    const year = currentYear + y;
    const age1 = age1Start + y;
    const age2 = age2Start + y;
    const inflationFactor = Math.pow(1 + inflation, y);
    const isP1Working = age1 < retAge1;
    const isP2Working = age2 < retAge2;

    // Income
    const p1Salary = isP1Working ? (income.person1.salary || 0) * Math.pow(1 + salaryGrowth, y) : 0;
    const p2Salary = (isCouple && isP2Working) ? (income.person2.salary || 0) * Math.pow(1 + salaryGrowth, y) : 0;

    // Super contributions
    const p1SG = p1Salary * legislation.superParams.sgRate;
    const p2SG = p2Salary * legislation.superParams.sgRate;
    const p1SalSac = isP1Working ? (income.person1.salarySacrifice || 0) : 0;
    const p2SalSac = (isCouple && isP2Working) ? (income.person2.salarySacrifice || 0) : 0;

    // Generate this year's asset class returns (same across all pools for consistency)
    const classReturns = getAssetClassReturns(useRandomReturns);

    // Blended return for reporting
    const superReturnBlended = Object.entries(returnProfiles[superProfile] || {}).reduce((s, [k, w]) => s + (classReturns[k] || 0) * w, 0);

    // Determine effective account types this year (respect future conversion dates)
    const p1AccType = (() => {
      const acc = assets.superAccounts.p1Super;
      if (acc.type !== "accumulation") return acc.type;
      if (acc.pensionConversionYear && year >= parseInt(acc.pensionConversionYear)) return "pension";
      return "accumulation";
    })();
    const p2AccType = isCouple ? (() => {
      const acc = assets.superAccounts.p2Super;
      if (acc.type !== "accumulation") return acc.type;
      if (acc.pensionConversionYear && year >= parseInt(acc.pensionConversionYear)) return "pension";
      return "accumulation";
    })() : "accumulation";

    // Pension and TTR income draws
    // TTR: requires age 60+, min 4% pa, max 10% pa, no lump sums (SIS Reg 6.01)
    // ABP: requires preservation age (60), no max drawdown, lump sums tax-free after 60
    const p1DrawPct = (assets.superAccounts.p1Pension?.drawdownPct || assets.superAccounts.p1Super?.drawdownPct || 5) / 100;
    const p1TTRDrawPct = Math.min(0.10, Math.max(0.04, p1DrawPct)); // clamped 4–10%
    const p1PensionDraw = (() => {
      if (p1AccType === "ttr") {
        // TTR: must be 60+ in practice (conditions of release), and still working (income replacement)
        return age1 >= 60 ? p1SuperBal * p1TTRDrawPct : 0;
      }
      if (p1AccType === "pension" || (!isP1Working && age1 >= legislation.superParams.preservationAge)) {
        return p1SuperBal * Math.max(0.04, p1DrawPct); // ABP: min 4%, no max
      }
      return 0;
    })();

    const p2DrawPct = isCouple ? (assets.superAccounts.p2Pension?.drawdownPct || assets.superAccounts.p2Super?.drawdownPct || 5) / 100 : 0;
    const p2TTRDrawPct = Math.min(0.10, Math.max(0.04, p2DrawPct));
    const p2PensionDraw = isCouple ? (() => {
      if (p2AccType === "ttr") {
        return age2 >= 60 ? p2SuperBal * p2TTRDrawPct : 0;
      }
      if (p2AccType === "pension" || (!isP2Working && age2 >= legislation.superParams.preservationAge)) {
        return p2SuperBal * Math.max(0.04, p2DrawPct);
      }
      return 0;
    })() : 0;

    // Age pension — accumulation excluded from assets test until pension age OR in pension/TTR phase
    const p1InPensionPhase = p1AccType === "pension" || p1AccType === "ttr";
    const p2InPensionPhase = isCouple && (p2AccType === "pension" || p2AccType === "ttr");
    const p1SuperForAssetTest = (p1InPensionPhase || age1 >= legislation.centrelink.ageQualifyingAge) ? p1SuperBal : 0;
    const p2SuperForAssetTest = isCouple ? ((p2InPensionPhase || age2 >= legislation.centrelink.ageQualifyingAge) ? p2SuperBal : 0) : 0;
    const totalFinancialAssets = p1SuperForAssetTest + p2SuperForAssetTest + p1NonSuperBal + p2NonSuperBal + jointNonSuperBal;
    // Deprived assets from gifts (5-year rule)
    const deprivedAssets = calcDeprivedAssets(state?.gifts || [], year, legislation.centrelink);
    // Other income for income test (salary already net but we pass gross employment for deeming)
    const grossEmploymentIncome = Math.max(0, p1Salary - p1SalSac) + Math.max(0, p2Salary - p2SalSac);
    const deemedIncome = calcDeemedIncome(totalFinancialAssets, isCouple, legislation.centrelink);
    const agePension = calcCentrelinkPension(totalFinancialAssets, deemedIncome, isCouple, personal.isHomeowner, legislation.centrelink, age1, age2, grossEmploymentIncome, deprivedAssets);

    // Loan repayments — calculated BEFORE tax so deductible interest can reduce taxable income
    const loanData = (assets.loans || []).map(loan => {
      const bal = loan.balance || 0;
      if (bal <= 0) return { payment: 0, interest: 0, principal: 0, remaining: 0, deductible: loan.deductible, owner: loan.owner, p1Pct: loan.p1Pct ?? 50, p2Pct: loan.p2Pct ?? 50 };
      const monthsElapsed = y * 12;
      const fixedEnd = loan.fixedTermMonths || 0;
      const rate = (monthsElapsed < fixedEnd && loan.fixedRate) ? (loan.fixedRate || 0) / 100 : (loan.variableRate || 0) / 100;
      const monthlyRate = rate / 12;
      const termMonths = loan.termMonths || 360;
      const remainingMonths = Math.max(0, termMonths - monthsElapsed);
      if (remainingMonths <= 0) return { payment: 0, interest: 0, principal: 0, remaining: 0, deductible: loan.deductible, owner: loan.owner, p1Pct: loan.p1Pct ?? 50, p2Pct: loan.p2Pct ?? 50 };
      const initRate = (loan.fixedTermMonths > 0 && loan.fixedRate ? loan.fixedRate : loan.variableRate || 6) / 100 / 12;
      const minMonthly = loan.repaymentType === "pi" ? (initRate > 0 ? (bal * initRate) / (1 - Math.pow(1 + initRate, -termMonths)) : bal / termMonths) : bal * initRate;
      const extraMonthly = getMonthlyEquiv(loan.extraRepayment || 0, loan.frequency);
      const totalMonthlyPmt = minMonthly + extraMonthly;
      let remaining = bal;
      for (let m = 0; m < Math.min(monthsElapsed, termMonths); m++) {
        const mRate = (m < fixedEnd && loan.fixedRate) ? (loan.fixedRate || 0) / 100 / 12 : (loan.variableRate || 0) / 100 / 12;
        const intPmt = remaining * mRate;
        if (loan.repaymentType !== "io") {
          remaining = Math.max(0, remaining - Math.max(0, totalMonthlyPmt - intPmt));
        }
      }
      const annualInterest = remaining * rate;
      const annualPayment = loan.repaymentType === "io" ? annualInterest : Math.min(remaining + annualInterest, totalMonthlyPmt * 12);
      const annualPrincipal = Math.max(0, annualPayment - annualInterest);
      return { payment: annualPayment, interest: annualInterest, principal: annualPrincipal, remaining, deductible: loan.deductible, owner: loan.owner, p1Pct: loan.p1Pct ?? 50, p2Pct: loan.p2Pct ?? 50 };
    });
    const liabilityPayments = loanData.reduce((s, l) => s + l.payment, 0);
    const totalDebtRemaining = loanData.reduce((s, l) => s + l.remaining, 0);

    // Split deductible interest per person based on ownership %
    // p1 loans → 100% to p1; p2 loans → 100% to p2; joint → split by p1Pct/p2Pct
    const p1DeductibleInterest = loanData.filter(l => l.deductible).reduce((s, l) => {
      if (l.owner === "p1") return s + l.interest;
      if (l.owner === "joint") return s + l.interest * (l.p1Pct / 100);
      return s;
    }, 0);
    const p2DeductibleInterest = isCouple ? loanData.filter(l => l.deductible).reduce((s, l) => {
      if (l.owner === "p2") return s + l.interest;
      if (l.owner === "joint") return s + l.interest * (l.p2Pct / 100);
      return s;
    }, 0) : 0;
    const deductibleInterest = p1DeductibleInterest + p2DeductibleInterest;

    // Tax - detailed breakdown per person
    // ABP draws: tax-free after age 60 (ITAA 1997 s.303-10). TTR draws: assessable income.
    // Deductible investment loan interest reduces taxable income (ITAA 1997 s.8-1)
    const p1DrawTaxable = p1AccType === "ttr"
      ? p1PensionDraw
      : (age1 >= 60 ? 0 : p1PensionDraw * 0.85);
    const p1Taxable = Math.max(0, p1Salary - p1SalSac + (income.person1.otherTaxable || 0) + (income.person1.rentalIncome || 0) + p1DrawTaxable + (income.person1.frankedDividends || 0) * 1.3 - p1DeductibleInterest);
    const p1IncomeTax = calcIncomeTax(p1Taxable, legislation.taxBrackets);
    const p1Medicare = calcMedicare(p1Taxable, legislation.medicare);
    const p1Tax = p1IncomeTax + p1Medicare;
    const p1NetIncome = p1Salary - p1SalSac - p1Tax + (income.person1.taxFreeIncome || 0) + (income.person1.otherTaxable || 0) + (income.person1.rentalIncome || 0) + (income.person1.frankedDividends || 0);

    let p2NetIncome = 0;
    let p2IncomeTax = 0;
    let p2Medicare = 0;
    let p2Tax = 0;
    let p2Taxable = 0;
    if (isCouple) {
      const p2DrawTaxable = p2AccType === "ttr"
        ? p2PensionDraw
        : (age2 >= 60 ? 0 : p2PensionDraw * 0.85);
      p2Taxable = Math.max(0, p2Salary - p2SalSac + (income.person2.otherTaxable || 0) + (income.person2.rentalIncome || 0) + p2DrawTaxable + (income.person2.frankedDividends || 0) * 1.3 - p2DeductibleInterest);
      p2IncomeTax = calcIncomeTax(p2Taxable, legislation.taxBrackets);
      p2Medicare = calcMedicare(p2Taxable, legislation.medicare);
      p2Tax = p2IncomeTax + p2Medicare;
      p2NetIncome = p2Salary - p2SalSac - p2Tax + (income.person2.taxFreeIncome || 0) + (income.person2.otherTaxable || 0) + (income.person2.rentalIncome || 0) + (income.person2.frankedDividends || 0);
    }

    // Super tax on contributions (15% contributions tax)
    const p1SuperContribTax = (p1SG + p1SalSac + (income.person1.personalDeductibleSuper || 0)) * legislation.superParams.taxRate;
    const p2SuperContribTax = isCouple ? (p2SG + p2SalSac + (income.person2.personalDeductibleSuper || 0)) * legislation.superParams.taxRate : 0;
    const totalTax = p1Tax + p2Tax;
    const totalSuperTax = p1SuperContribTax + p2SuperContribTax;

    const totalNetIncome = p1NetIncome + p2NetIncome + p1PensionDraw + p2PensionDraw + agePension;

    // Expenses — lifestyle periods
    const lifestyleExp = (expenses.lifestyleExpenses || []).reduce((s, e) => {
      if (year >= (e.startYear || 0) && year <= (e.endYear || 9999)) {
        const yearsFromStart = year - (e.startYear || currentYear);
        return s + (e.amount || 0) * Math.pow(1 + (e.indexation || 2.5) / 100, yearsFromStart);
      }
      return s;
    }, 0);
    // Legacy support: fallback to annualLiving if no lifestyle periods
    const baseExp = lifestyleExp > 0 ? lifestyleExp : (expenses.annualLiving || 0) * Math.pow(1 + ((expenses.reducingIndex || 2.5) / 100), y);
    const recurringExp = (expenses.baseExpenses || []).reduce((s, e) => {
      if (year >= (e.startYear || 0) && year <= (e.endYear || 9999)) {
        const yearsFromStart = Math.max(0, year - (e.startYear || currentYear));
        return s + (e.amount || 0) * Math.pow(1 + (e.indexation || 2.5) / 100, yearsFromStart);
      }
      return s;
    }, 0);
    const futureExp = expenses.futureExpenses.filter(e => year >= e.startYear && year <= e.endYear).reduce((s, e) => s + (e.amount || 0) * Math.pow(1 + (e.indexation || 2.5) / 100, y - (e.startYear - currentYear)), 0);
    const totalExp = baseExp + recurringExp + futureExp;
    const surplus = totalNetIncome - totalExp - liabilityPayments;

    // === Grow assets using per-asset-class returns with annual rebalancing ===
    // Capture pre-growth balances for investment earnings calculation
    const preGrowthTotal = p1SuperBal + p2SuperBal + p1NonSuperBal + p2NonSuperBal + jointNonSuperBal;

    // Investment cost rates (admin + management + advice) / 100
    const p1SuperCostRate = ((assets.superAccounts.p1Super?.adminFee || 0) + (assets.superAccounts.p1Super?.managementCost || 0) + (assets.superAccounts.p1Super?.adviceCost || 0)) / 100;
    const p1PenCostRate = ((assets.superAccounts.p1Pension?.adminFee || 0) + (assets.superAccounts.p1Pension?.managementCost || 0) + (assets.superAccounts.p1Pension?.adviceCost || 0)) / 100;
    const p2SuperCostRate = ((assets.superAccounts.p2Super?.adminFee || 0) + (assets.superAccounts.p2Super?.managementCost || 0) + (assets.superAccounts.p2Super?.adviceCost || 0)) / 100;
    const p2PenCostRate = ((assets.superAccounts.p2Pension?.adminFee || 0) + (assets.superAccounts.p2Pension?.managementCost || 0) + (assets.superAccounts.p2Pension?.adviceCost || 0)) / 100;
    const p1NSCostRate = ((assets.nonSuper.p1NonSuper?.adminFee || 0) + (assets.nonSuper.p1NonSuper?.managementCost || 0) + (assets.nonSuper.p1NonSuper?.adviceCost || 0)) / 100;
    const p2NSCostRate = ((assets.nonSuper.p2NonSuper?.adminFee || 0) + (assets.nonSuper.p2NonSuper?.managementCost || 0) + (assets.nonSuper.p2NonSuper?.adviceCost || 0)) / 100;
    const jointCostRate = ((assets.nonSuper.joint?.adminFee || 0) + (assets.nonSuper.joint?.managementCost || 0) + (assets.nonSuper.joint?.adviceCost || 0)) / 100;

    // P1 Super
    const p1SuperGrown = growPool(p1SuperH, superProfile, classReturns, p1SuperCostRate);
    const p1SuperContribs = p1SG + p1SalSac + (income.person1.personalDeductibleSuper || 0) + (income.person1.nonConcessionalSuper || 0);
    p1SuperBal = p1SuperGrown.total + p1SuperContribs - p1PensionDraw;

    const p1ConvYear = assets.superAccounts.p1Super?.pensionConversionYear;
    const p1IsPartial = assets.superAccounts.p1Super?.pensionConversionType === "partial";
    const p1ConvActive = p1ConvYear && year >= parseInt(p1ConvYear);
    const p1IsConversionYear = p1ConvYear && year === parseInt(p1ConvYear);

    // Weighted income and growth returns for the profile
    const p1IncomeRet = Object.entries(returnProfiles[superProfile] || {}).reduce((s, [k, w]) => s + (assetReturns[k]?.income || 0) * w, 0);
    const p1GrowthRet = Object.entries(returnProfiles[superProfile] || {}).reduce((s, [k, w]) => s + (assetReturns[k]?.growth || 0) * w, 0);

    if (p1AccType === "pension" && !p1IsPartial) {
      // Full pension or full rollover: 0% tax on all earnings. Rollover itself is tax-free — no CGT.
    } else if (p1AccType === "pension" && p1IsPartial && p1ConvActive) {
      // Partial rollover: pension portion = 0% tax. Retained accumulation portion:
      //   - 15% on income return (distributions/interest — taxed as earned)
      //   - 10% CGT on rebalancing growth (15% rate × 2/3 after 1/3 CGT discount for assets held >12m)
      //   - NO CGT in the conversion year itself (rollover is tax-free event under SIS Act)
      const retainAmt = assets.superAccounts.p1Super?.pensionRetainAmount ?? 5000;
      const accumPortion = Math.min(retainAmt, p1SuperBal);
      const pensionPortion = Math.max(0, p1SuperBal - accumPortion);
      const accumIncomeTax = accumPortion * p1IncomeRet * 0.15;
      const accumCGT = p1IsConversionYear ? 0 : accumPortion * p1GrowthRet * 0.10;
      p1SuperBal = pensionPortion + (accumPortion - accumIncomeTax - accumCGT);
    } else {
      // Accumulation or TTR:
      //   - 15% on income return (always taxed as earned)
      //   - 15% on income return (distributions, interest — income tax exemption removed for TTR from 1 Jul 2017)
      //   - 0% CGT on rebalancing growth (TTR retains full CGT exemption — only income exemption was removed)
      //   - No CGT in conversion year (rollover to pension is tax-free under SIS Act)
      const incomeTax = p1SuperBal * p1IncomeRet * 0.15;
      const cgt = (p1IsConversionYear || p1AccType === "ttr") ? 0 : p1SuperBal * p1GrowthRet * 0.10;
      p1SuperBal -= (incomeTax + cgt);
    }

    // Division 293: extra 15% on concessional contributions if income > $250k
    const p1Div293 = (p1Salary + (income.person1.otherTaxable || 0)) > (legislation.superParams.div293Threshold || 250000)
      ? (p1SG + p1SalSac) * (legislation.superParams.div293Rate || 0.15) : 0;
    p1SuperBal -= p1Div293;
    p1SuperH = initHoldings(p1SuperBal, superProfile);

    // P2 Super
    let p2SuperGrown = { total: 0, holdings: {} };
    if (isCouple) {
      const p2Profile = assets.superAccounts.p2Super?.profile || superProfile;
      p2SuperGrown = growPool(p2SuperH, p2Profile, classReturns, p2SuperCostRate);
      const p2SuperContribs = p2SG + p2SalSac + (income.person2.personalDeductibleSuper || 0) + (income.person2.nonConcessionalSuper || 0);
      p2SuperBal = p2SuperGrown.total + p2SuperContribs - p2PensionDraw;

      const p2ConvYear = assets.superAccounts.p2Super?.pensionConversionYear;
      const p2IsPartial = assets.superAccounts.p2Super?.pensionConversionType === "partial";
      const p2ConvActive = p2ConvYear && year >= parseInt(p2ConvYear);
      const p2IsConversionYear = p2ConvYear && year === parseInt(p2ConvYear);

      const p2IncomeRet = Object.entries(returnProfiles[p2Profile] || {}).reduce((s, [k, w]) => s + (assetReturns[k]?.income || 0) * w, 0);
      const p2GrowthRet = Object.entries(returnProfiles[p2Profile] || {}).reduce((s, [k, w]) => s + (assetReturns[k]?.growth || 0) * w, 0);

      if (p2AccType === "pension" && !p2IsPartial) {
        // Full pension: 0% tax. Rollover tax-free.
      } else if (p2AccType === "pension" && p2IsPartial && p2ConvActive) {
        const retainAmt2 = assets.superAccounts.p2Super?.pensionRetainAmount ?? 5000;
        const accumPortion2 = Math.min(retainAmt2, p2SuperBal);
        const pensionPortion2 = Math.max(0, p2SuperBal - accumPortion2);
        const accumIncomeTax2 = accumPortion2 * p2IncomeRet * 0.15;
        const accumCGT2 = p2IsConversionYear ? 0 : accumPortion2 * p2GrowthRet * 0.10;
        p2SuperBal = pensionPortion2 + (accumPortion2 - accumIncomeTax2 - accumCGT2);
      } else {
        const incomeTax2 = p2SuperBal * p2IncomeRet * 0.15;
        const cgt2 = (p2IsConversionYear || p2AccType === "ttr") ? 0 : p2SuperBal * p2GrowthRet * 0.10;
        p2SuperBal -= (incomeTax2 + cgt2);
      }
      const p2Div293 = (p2Salary + (income.person2?.otherTaxable || 0)) > (legislation.superParams.div293Threshold || 250000)
        ? (p2SG + p2SalSac) * (legislation.superParams.div293Rate || 0.15) : 0;
      p2SuperBal -= p2Div293;
      p2SuperH = initHoldings(p2SuperBal, p2Profile);
    }

    // Non-super pools
    const p1NSProfile = assets.nonSuper.p1NonSuper?.profile || nonSuperProfile;
    const p2NSProfile = assets.nonSuper.p2NonSuper?.profile || nonSuperProfile;

    // Direct property running costs deducted from non-super pools
    const p1PropCosts = assets.nonSuper.p1NonSuper?.isDirectProperty ? ((assets.nonSuper.p1NonSuper?.councilRates || 0) + (assets.nonSuper.p1NonSuper?.propertyInsurance || 0) + (p1NonSuperBal * (assets.nonSuper.p1NonSuper?.agentFee || 0) / 100) + (assets.nonSuper.p1NonSuper?.repairs || 0)) : 0;
    const p2PropCosts = assets.nonSuper.p2NonSuper?.isDirectProperty ? ((assets.nonSuper.p2NonSuper?.councilRates || 0) + (assets.nonSuper.p2NonSuper?.propertyInsurance || 0) + (p2NonSuperBal * (assets.nonSuper.p2NonSuper?.agentFee || 0) / 100) + (assets.nonSuper.p2NonSuper?.repairs || 0)) : 0;
    const jointPropCosts = assets.nonSuper.joint?.isDirectProperty ? ((assets.nonSuper.joint?.councilRates || 0) + (assets.nonSuper.joint?.propertyInsurance || 0) + (jointNonSuperBal * (assets.nonSuper.joint?.agentFee || 0) / 100) + (assets.nonSuper.joint?.repairs || 0)) : 0;

    const p1NSGrown = growPool(p1NonSuperH, p1NSProfile, classReturns, p1NSCostRate);
    p1NonSuperBal = p1NSGrown.total - p1PropCosts;
    p1NonSuperH = initHoldings(Math.max(0, p1NonSuperBal), p1NSProfile);

    const p2NSGrown = growPool(p2NonSuperH, p2NSProfile, classReturns, p2NSCostRate);
    p2NonSuperBal = p2NSGrown.total - p2PropCosts;
    p2NonSuperH = initHoldings(Math.max(0, p2NonSuperBal), p2NSProfile);

    const jointGrown = growPool(jointNonSuperH, nonSuperProfile, classReturns, jointCostRate);
    jointNonSuperBal = jointGrown.total - jointPropCosts + Math.max(0, surplus);

    // Deficit drawdown
    if (surplus < 0) {
      jointNonSuperBal += surplus;
      if (jointNonSuperBal < 0) { p1NonSuperBal += jointNonSuperBal; jointNonSuperBal = 0; }
      if (p1NonSuperBal < 0) { p2NonSuperBal += p1NonSuperBal; p1NonSuperBal = 0; }
    }

    // Rebalance all holdings after cashflows
    jointNonSuperH = initHoldings(Math.max(0, jointNonSuperBal), nonSuperProfile);
    p1NonSuperH = initHoldings(Math.max(0, p1NonSuperBal), p1NSProfile);
    p2NonSuperH = initHoldings(Math.max(0, p2NonSuperBal), p2NSProfile);

    // Downsize (PPR) and non-PPR asset sale injection: inject proceeds BEFORE computing totalAssets
    assets.lifestyleAssets.forEach(a => {
      if (a.isPrimaryResidence && a.downsizeYear && year === a.downsizeYear && (a.downsizeProceeds || 0) > 0) {
        const proceeds = a.downsizeProceeds || 0;
        const dest = a.downsizeAllocateTo || "joint";
        if (dest === "p1NonSuper") { p1NonSuperBal += proceeds; p1NonSuperH = initHoldings(Math.max(0, p1NonSuperBal), p1NSProfile); }
        else if (dest === "p2NonSuper") { p2NonSuperBal += proceeds; p2NonSuperH = initHoldings(Math.max(0, p2NonSuperBal), p2NSProfile); }
        else { jointNonSuperBal += proceeds; jointNonSuperH = initHoldings(Math.max(0, jointNonSuperBal), nonSuperProfile); }
      }
      if (!a.isPrimaryResidence && a.saleYear && year === a.saleYear && (a.saleProceeds || 0) > 0) {
        const proceeds = a.saleProceeds || 0;
        const dest = a.saleAllocateTo || "joint";
        if (dest === "p1NonSuper") { p1NonSuperBal += proceeds; p1NonSuperH = initHoldings(Math.max(0, p1NonSuperBal), p1NSProfile); }
        else if (dest === "p2NonSuper") { p2NonSuperBal += proceeds; p2NonSuperH = initHoldings(Math.max(0, p2NonSuperBal), p2NSProfile); }
        else { jointNonSuperBal += proceeds; jointNonSuperH = initHoldings(Math.max(0, jointNonSuperBal), nonSuperProfile); }
      }
    });

    const totalAssets = Math.max(0, p1SuperBal) + Math.max(0, p2SuperBal) + Math.max(0, p1NonSuperBal) + Math.max(0, p2NonSuperBal) + Math.max(0, jointNonSuperBal);
    const totalLiab = totalDebtRemaining;

    // Investment earnings = growth from all pools
    const postGrowthTotal = p1SuperGrown.total + (isCouple ? p2SuperGrown.total : 0) + p1NSGrown.total + p2NSGrown.total + jointGrown.total;
    const investEarnings = Math.max(0, postGrowthTotal - preGrowthTotal);

    // Grow lifestyle assets individually — EXCLUDE primary residence from investment calculations
    let lifestyleTotal = 0;
    assets.lifestyleAssets.forEach(a => {
      if (a.isPrimaryResidence) return; // PPR excluded entirely
      if (a.saleYear && year >= a.saleYear) return; // sold — remove from lifestyle chart too
      const growthRate = (a.growth || 0) / 100;
      const grownValue = (a.value || 0) * Math.pow(1 + growthRate, y);
      lifestyleTotal += Math.max(0, grownValue);
    });
    const netInvestmentAssets = totalAssets - totalLiab;

    data.push({
      year, age1, age2, period: y + 1,
      p1Salary, p2Salary, p1SG, p2SG, p1PensionDraw, p2PensionDraw, agePension, investEarnings: Math.max(0, investEarnings),
      // Tax breakdown
      p1Taxable, p2Taxable, p1IncomeTax, p2IncomeTax, p1Medicare, p2Medicare, p1Tax, p2Tax,
      p1SuperContribTax, p2SuperContribTax, totalTax, totalSuperTax,
      totalIncome: totalNetIncome, totalExpenses: totalExp + liabilityPayments,
      surplus,
      p1Super: Math.max(0, p1SuperBal), p2Super: Math.max(0, p2SuperBal),
      p1NonSuper: Math.max(0, p1NonSuperBal), p2NonSuper: Math.max(0, p2NonSuperBal), jointNonSuper: Math.max(0, jointNonSuperBal),
      totalAssets, totalLiabilities: totalLiab, deductibleInterest, totalDebtRemaining, liabilityPayments,
      netAssets: netInvestmentAssets + lifestyleTotal,
      netInvestmentAssets,
      lifestyleAssets: lifestyleTotal,
      netAssetsNominal: netInvestmentAssets + lifestyleTotal,
      netInvestmentNominal: netInvestmentAssets,
      lifestyleNominal: lifestyleTotal,
      netAssetsReal: (netInvestmentAssets + lifestyleTotal) / inflationFactor,
      netInvestmentReal: netInvestmentAssets / inflationFactor,
      lifestyleReal: lifestyleTotal / inflationFactor,
      inflationFactor,
    });
  }
  return data;
}

// ============================================================
// PROJECTIONS TAB
// ============================================================
function ProjectionsTab({ state, setState, projectionData, afterProjectionData, scenario, afterState, onActivateAfter, onActivateNow, onResetAfter }) {
  const [view, setView] = useState("chart");
  const [popup, setPopup] = useState(null); // null | "salaryP1" | "salaryP2" | "expenses" | "super" | "nonSuper" | "income"
  const isCouple = state.personal.isCouple;
  const n1 = state.personal.person1.name || "Person 1";
  const n2 = state.personal.person2.name || "Person 2";
  const { income, expenses, assets, personal, legislation } = state;

  const updIncP1 = (f, v) => setState(s => ({ ...s, income: { ...s.income, person1: { ...s.income.person1, [f]: v } } }));
  const updIncP2 = (f, v) => setState(s => ({ ...s, income: { ...s.income, person2: { ...s.income.person2, [f]: v } } }));
  const updExp = (f, v) => setState(s => ({ ...s, expenses: { ...s.expenses, [f]: v } }));
  const updSuper = (key, field, val) => setState(s => ({ ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: { ...s.assets.superAccounts[key], [field]: val } } } }));
  const updNonSuper = (key, field, val) => setState(s => ({ ...s, assets: { ...s.assets, nonSuper: { ...s.assets.nonSuper, [key]: { ...s.assets.nonSuper[key], [field]: val } } } }));

  // Expense helpers
  const addBaseExp = () => updExp("baseExpenses", [...expenses.baseExpenses, { description: "", amount: 0, type: "essential", indexation: 2.5 }]);
  const updBaseExp = (i, f, v) => { const arr = [...expenses.baseExpenses]; arr[i] = { ...arr[i], [f]: v }; updExp("baseExpenses", arr); };
  const rmBaseExp = (i) => updExp("baseExpenses", expenses.baseExpenses.filter((_, j) => j !== i));
  const addFutureExp = () => updExp("futureExpenses", [...expenses.futureExpenses, { description: "", amount: 0, startYear: new Date().getFullYear() + 1, endYear: new Date().getFullYear() + 5, indexation: 2.5, type: "desirable" }]);
  const updFutureExp = (i, f, v) => { const arr = [...expenses.futureExpenses]; arr[i] = { ...arr[i], [f]: v }; updExp("futureExpenses", arr); };
  const rmFutureExp = (i) => updExp("futureExpenses", expenses.futureExpenses.filter((_, j) => j !== i));

  // Lifestyle helpers
  const addLifestyle = () => setState(s => ({ ...s, assets: { ...s.assets, lifestyleAssets: [...s.assets.lifestyleAssets, { description: "", value: 0, growth: 2.5, isPrimaryResidence: false }] } }));
  const updLifestyle = (i, f, v) => setState(s => { const arr = [...s.assets.lifestyleAssets]; arr[i] = { ...arr[i], [f]: v }; return { ...s, assets: { ...s.assets, lifestyleAssets: arr } }; });
  const rmLifestyle = (i) => setState(s => ({ ...s, assets: { ...s.assets, lifestyleAssets: s.assets.lifestyleAssets.filter((_, j) => j !== i) } }));

  const renderPopup = () => {
    if (!popup) return null;

    if (popup === "salaryP1" || popup === "salaryP2") {
      const isPerson1 = popup === "salaryP1";
      const data = isPerson1 ? income.person1 : income.person2;
      const upd = isPerson1 ? updIncP1 : updIncP2;
      const name = isPerson1 ? n1 : n2;
      return (
        <Modal title={`${name} – Income`} onClose={() => setPopup(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 , alignItems: "end" }}>
            <Input label="Gross Salary / Package (excl. SG)" value={data.salary} onChange={(v) => upd("salary", v)} prefix="$" />
            <Input label="Salary Sacrifice to Super" value={data.salarySacrifice} onChange={(v) => upd("salarySacrifice", v)} prefix="$" />
            <Input label="Other Taxable Income" value={data.otherTaxable} onChange={(v) => upd("otherTaxable", v)} prefix="$" />
            <Input label="Franked Dividends" value={data.frankedDividends} onChange={(v) => upd("frankedDividends", v)} prefix="$" />
            <Input label="Rental Income" value={data.rentalIncome} onChange={(v) => upd("rentalIncome", v)} prefix="$" />
            <Input label="Tax-Free Income" value={data.taxFreeIncome} onChange={(v) => upd("taxFreeIncome", v)} prefix="$" />
            <Input label="Personal Deductible Super Contrib." value={data.personalDeductibleSuper} onChange={(v) => upd("personalDeductibleSuper", v)} prefix="$" />
            <Input label="Non-Concessional Super Contrib." value={data.nonConcessionalSuper} onChange={(v) => upd("nonConcessionalSuper", v)} prefix="$" />
          </div>
          <div style={{ marginTop: 16, padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 , alignItems: "end" }}>
            <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>SG Contribution</span><div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt((data.salary || 0) * legislation.superParams.sgRate)}</div></div>
            <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Total Concessional</span><div style={{ color: COLORS.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt((data.salary || 0) * legislation.superParams.sgRate + (data.salarySacrifice || 0) + (data.personalDeductibleSuper || 0))}</div></div>
            <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Concessional Cap</span><div style={{ color: COLORS.orange, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt(legislation.superParams.concessionalCap)}</div></div>
          </div>
        </Modal>
      );
    }

    if (popup === "expenses") {
      const lifestyleExpenses = expenses.lifestyleExpenses || [];
      const addLE = () => updExp("lifestyleExpenses", [...lifestyleExpenses, { description: "", amount: 0, indexation: 2.5, startYear: new Date().getFullYear(), endYear: new Date().getFullYear() + 10 }]);
      const updLE = (i, f, v) => { const arr = [...lifestyleExpenses]; arr[i] = { ...arr[i], [f]: v }; updExp("lifestyleExpenses", arr); };
      const rmLE = (i) => updExp("lifestyleExpenses", lifestyleExpenses.filter((_, j) => j !== i));
      return (
        <Modal title="Expenses" onClose={() => setPopup(null)} width={780}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Lifestyle Expenses</span>
            <Btn small onClick={addLE} color={COLORS.green}>+ Add Period</Btn>
          </div>
          {lifestyleExpenses.map((e, i) => (
            <div key={i} style={{ background: COLORS.infoBg || "#ece8e1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 600 }}>{e.description || `Period ${i+1}`}</span>
                <button onClick={() => rmLE(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 14 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 , alignItems: "end" }}>
                <Input label="Description" value={e.description} onChange={(v) => updLE(i, "description", v)} type="text" small />
                <Input label="Amount" value={e.amount} onChange={(v) => updLE(i, "amount", v)} prefix="$" small />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 , alignItems: "end" }}>
                <FYInput label="From FY" value={e.startYear} onChange={(v) => updLE(i, "startYear", v)} small />
                <FYInput label="To FY" value={e.endYear} onChange={(v) => updLE(i, "endYear", v)} small />
                <Input label="Indexation" value={e.indexation} onChange={(v) => updLE(i, "indexation", v)} suffix="%" small />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 12 }}>
            <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Recurring Expenses</span>
            <Btn small onClick={addBaseExp} color={COLORS.green}>+ Add</Btn>
          </div>
          {expenses.baseExpenses.map((e, i) => (
            <div key={i} style={{ background: COLORS.infoBg || "#ece8e1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 600 }}>{e.description || `Expense ${i+1}`}</span>
                <button onClick={() => rmBaseExp(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 14 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 , alignItems: "end" }}>
                <Input label="Description" value={e.description} onChange={(v) => updBaseExp(i, "description", v)} type="text" small />
                <Input label="Amount" value={e.amount} onChange={(v) => updBaseExp(i, "amount", v)} prefix="$" small />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 , alignItems: "end" }}>
                <FYInput label="From FY" value={e.startYear || new Date().getFullYear()} onChange={(v) => updBaseExp(i, "startYear", v)} small />
                <FYInput label="To FY" value={e.endYear || 2065} onChange={(v) => updBaseExp(i, "endYear", v)} small />
                <Select value={e.type} onChange={(v) => updBaseExp(i, "type", v)} small options={[{ value: "essential", label: "Essential" }, { value: "desirable", label: "Desirable" }]} />
                <Input value={e.indexation} onChange={(v) => updBaseExp(i, "indexation", v)} suffix="%" small />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 12 }}>
            <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Future / One-Off Expenses</span>
            <Btn small onClick={addFutureExp} color={COLORS.green}>+ Add</Btn>
          </div>
          {expenses.futureExpenses.map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.7fr 0.7fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <Input value={e.description} onChange={(v) => updFutureExp(i, "description", v)} type="text" small />
              <Input value={e.amount} onChange={(v) => updFutureExp(i, "amount", v)} prefix="$" small />
              <FYInput value={e.startYear} onChange={(v) => updFutureExp(i, "startYear", v)} small />
              <FYInput value={e.endYear} onChange={(v) => updFutureExp(i, "endYear", v)} small />
              <Select value={e.type} onChange={(v) => updFutureExp(i, "type", v)} small options={[{ value: "essential", label: "Essential" }, { value: "desirable", label: "Desirable" }]} />
              <button onClick={() => rmFutureExp(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          ))}
        </Modal>
      );
    }

    if (popup === "super") {
      const profiles = Object.keys(state.returnProfiles);
      const SuperRow = ({ sKey, label }) => {
        const acc = assets.superAccounts[sKey];
        return (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>{label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 , alignItems: "end" }}>
              <Input label="Balance" value={acc.balance} onChange={(v) => updSuper(sKey, "balance", v)} prefix="$" small />
              <Input label="Tax-Free" value={acc.taxFree} onChange={(v) => updSuper(sKey, "taxFree", v)} prefix="$" small />
              <Select label="Profile" value={acc.profile} onChange={(v) => updSuper(sKey, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} small />
              <Select label="Type" value={acc.type} onChange={(v) => updSuper(sKey, "type", v)} small
                options={[{ value: "accumulation", label: "Accumulation" }, { value: "ttr", label: "TTR Pension" }, { value: "pension", label: "Pension" }]} />
            </div>
          </div>
        );
      };
      return (
        <Modal title="Superannuation Accounts" onClose={() => setPopup(null)}>
          <SuperRow sKey="p1Super" label={`${n1} – Super`} />
          <SuperRow sKey="p1Pension" label={`${n1} – Pension`} />
          {isCouple && <SuperRow sKey="p2Super" label={`${n2} – Super`} />}
          {isCouple && <SuperRow sKey="p2Pension" label={`${n2} – Pension`} />}
        </Modal>
      );
    }

    if (popup === "nonSuper") {
      const profiles = Object.keys(state.returnProfiles);
      const NSRow = ({ nKey, label }) => {
        const acc = assets.nonSuper[nKey];
        return (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>{label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 , alignItems: "end" }}>
              <Input label="Balance" value={acc.balance} onChange={(v) => updNonSuper(nKey, "balance", v)} prefix="$" small />
              <Input label="Unrealised Gains" value={acc.unrealisedGains} onChange={(v) => updNonSuper(nKey, "unrealisedGains", v)} prefix="$" small />
              <Select label="Profile" value={acc.profile} onChange={(v) => updNonSuper(nKey, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} small />
            </div>
          </div>
        );
      };
      return (
        <Modal title="Non-Super Investments" onClose={() => setPopup(null)}>
          <NSRow nKey="p1NonSuper" label={`${n1} – Non-Super`} />
          {isCouple && <NSRow nKey="p2NonSuper" label={`${n2} – Non-Super`} />}
          <NSRow nKey="joint" label="Joint Investments" />
          <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 12, paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Lifestyle Assets</span>
              <Btn small onClick={addLifestyle} color={COLORS.green}>+ Add</Btn>
            </div>
            {assets.lifestyleAssets.map((a, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginBottom: 8, alignItems: "center" }}>
                <Input value={a.description} onChange={(v) => updLifestyle(i, "description", v)} type="text" small />
                <Input value={a.value} onChange={(v) => updLifestyle(i, "value", v)} prefix="$" small />
                <Input value={a.growth} onChange={(v) => updLifestyle(i, "growth", v)} suffix="%" small />
                <button onClick={() => rmLifestyle(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        </Modal>
      );
    }

    return null;
  };

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Projections" />
      {renderPopup()}
      <div className="flex gap-2" style={{ marginBottom: 16 }}>
        <Btn active={view === "chart"} onClick={() => setView("chart")}>Charts</Btn>
        <Btn active={view === "table"} onClick={() => setView("table")}>Data Table</Btn>
        {afterProjectionData && (
          <div style={{ marginLeft: "auto", padding: "4px 10px", background: `${COLORS.green}20`, border: `1px solid ${COLORS.green}40`, borderRadius: 6, fontSize: 10, color: COLORS.green, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            ✨ Showing Before vs After Advice
          </div>
        )}
      </div>

      {view === "chart" && (
        <div>
          <Card title="Income vs Expenses">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="totalIncome" fill={COLORS.green} name="Net Income (Now)" opacity={0.7} />
                <Bar dataKey="totalExpenses" fill={COLORS.red} name="Expenses (Now)" opacity={0.7} />
                <Line type="monotone" dataKey="surplus" stroke={COLORS.accent} name="Surplus (Now)" strokeWidth={2} dot={false} />
                {afterProjectionData && <Line type="monotone" data={afterProjectionData} dataKey="surplus" stroke={COLORS.green} name="Surplus (After)" strokeWidth={2} strokeDasharray="5 3" dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Asset Breakdown Over Time">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="p1Super" stackId="1" fill={COLORS.chartColors[0]} stroke={COLORS.chartColors[0]} name={`${n1} Super`} />
                {isCouple && <Area type="monotone" dataKey="p2Super" stackId="1" fill={COLORS.chartColors[1]} stroke={COLORS.chartColors[1]} name={`${n2} Super`} />}
                <Area type="monotone" dataKey="jointNonSuper" stackId="1" fill={COLORS.chartColors[2]} stroke={COLORS.chartColors[2]} name="Joint Non-Super" />
                <Area type="monotone" dataKey="p1NonSuper" stackId="1" fill={COLORS.chartColors[3]} stroke={COLORS.chartColors[3]} name={`${n1} Non-Super`} />
                {isCouple && <Area type="monotone" dataKey="p2NonSuper" stackId="1" fill={COLORS.chartColors[4]} stroke={COLORS.chartColors[4]} name={`${n2} Non-Super`} />}
                {afterProjectionData && <Line type="monotone" data={afterProjectionData} dataKey="netInvestmentAssets" stroke={COLORS.green} name="Net Assets (After)" strokeWidth={2.5} strokeDasharray="6 3" dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Centrelink Age Pension">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="agePension" fill={`${COLORS.purple}40`} stroke={COLORS.purple} strokeWidth={2} name="Age Pension (Now)" />
                {afterProjectionData && <Line type="monotone" data={afterProjectionData} dataKey="agePension" stroke={COLORS.green} strokeWidth={2} strokeDasharray="5 3" dot={false} name="Age Pension (After)" />}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Tax Breakdown">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="p1IncomeTax" stackId="t" fill={COLORS.red} name={`${n1} Income Tax`} />
                <Bar dataKey="p1Medicare" stackId="t" fill={COLORS.pink} name={`${n1} Medicare`} />
                <Bar dataKey="p1SuperContribTax" stackId="t" fill={COLORS.orange} name={`${n1} Super Tax`} />
                {isCouple && <Bar dataKey="p2IncomeTax" stackId="t" fill="#e07070" name={`${n2} Income Tax`} />}
                {isCouple && <Bar dataKey="p2Medicare" stackId="t" fill="#d4a0b0" name={`${n2} Medicare`} />}
                {isCouple && <Bar dataKey="p2SuperContribTax" stackId="t" fill="#d4a040" name={`${n2} Super Tax`} radius={[3, 3, 0, 0]} />}
                {afterProjectionData && <Line type="monotone" data={afterProjectionData} dataKey={(r) => (r.totalTax || 0) + (r.totalSuperTax || 0)} stroke={COLORS.green} name="Total Tax (After)" strokeWidth={2} strokeDasharray="5 3" dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Debt Over Time">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="totalDebtRemaining" fill={COLORS.red + "30"} stroke={COLORS.red} strokeWidth={2} name="Debt (Now)" />
                {afterProjectionData && <Line type="monotone" data={afterProjectionData} dataKey="totalDebtRemaining" stroke={COLORS.green} name="Debt (After)" strokeWidth={2} strokeDasharray="5 3" dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {view === "table" && (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11 }}>Year</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11 }}>Age</th>
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("salaryP1")} color={COLORS.text}>{`Salary ${n1}`}</HeaderBtn></th>
                  {isCouple && <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("salaryP2")} color={COLORS.text}>{`Salary ${n2}`}</HeaderBtn></th>}
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("super")} color={COLORS.cyan}>Pension Draw</HeaderBtn></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11 }}>Age Pension</th>
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("salaryP1")} color={COLORS.green}>Total Income</HeaderBtn></th>
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("expenses")} color={COLORS.orange}>Expenses</HeaderBtn></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.red, fontWeight: 500, fontSize: 11 }}>Tax</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.red, fontWeight: 500, fontSize: 11 }}>Debt</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11 }}>Surplus</th>
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("super")} color={COLORS.accent}>Super</HeaderBtn></th>
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("nonSuper")} color={COLORS.cyan}>Non-Super</HeaderBtn></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11 }}>Net Assets</th>
                  {afterProjectionData && <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.green, fontWeight: 600, fontSize: 11 }}>Δ After</th>}
                </tr>
              </thead>
              <tbody>
                {projectionData.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}15` }}>
                    <td style={{ padding: "6px", color: COLORS.text }}>{r.year}</td>
                    <td style={{ padding: "6px", color: COLORS.textMuted, textAlign: "right" }}>{r.age1}{isCouple && `/${r.age2}`}</td>
                    <td style={{ padding: "6px", color: COLORS.text, textAlign: "right" }}>{fmt(r.p1Salary)}</td>
                    {isCouple && <td style={{ padding: "6px", color: COLORS.text, textAlign: "right" }}>{fmt(r.p2Salary)}</td>}
                    <td style={{ padding: "6px", color: COLORS.cyan, textAlign: "right" }}>{fmt(r.p1PensionDraw + r.p2PensionDraw)}</td>
                    <td style={{ padding: "6px", color: COLORS.purple, textAlign: "right" }}>{fmt(r.agePension)}</td>
                    <td style={{ padding: "6px", color: COLORS.green, textAlign: "right" }}>{fmt(r.totalIncome)}</td>
                    <td style={{ padding: "6px", color: COLORS.orange, textAlign: "right" }}>{fmt(r.totalExpenses)}</td>
                    <td style={{ padding: "6px", color: COLORS.red, textAlign: "right" }}>{fmt(r.totalTax + r.totalSuperTax)}</td>
                    <td style={{ padding: "6px", color: COLORS.red, textAlign: "right" }}>{fmt(r.totalDebtRemaining)}</td>
                    <td style={{ padding: "6px", color: r.surplus >= 0 ? COLORS.green : COLORS.red, textAlign: "right" }}>{fmt(r.surplus)}</td>
                    <td style={{ padding: "6px", color: COLORS.accent, textAlign: "right" }}>{fmt(r.p1Super + r.p2Super)}</td>
                    <td style={{ padding: "6px", color: COLORS.cyan, textAlign: "right" }}>{fmt(r.p1NonSuper + r.p2NonSuper + r.jointNonSuper)}</td>
                    <td style={{ padding: "6px", color: COLORS.text, textAlign: "right", fontWeight: 600 }}>{fmt(r.netAssets)}</td>
                    {afterProjectionData && (() => {
                      const ar = afterProjectionData[i];
                      const diff = ar ? (ar.netInvestmentAssets - r.netInvestmentAssets) : 0;
                      return <td style={{ padding: "6px", color: diff >= 0 ? COLORS.green : COLORS.red, textAlign: "right", fontWeight: 600 }}>{diff >= 0 ? "+" : ""}{fmt(diff)}</td>;
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// MONTE CARLO TAB
// ============================================================
function MonteCarloTab({ state, afterState, scenario, onActivateAfter, onActivateNow, onResetAfter }) {
  const [simulations, setSimulations] = useState(500);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const activeState = scenario === "after" && afterState ? afterState : state;

  const runSim = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const allRuns = [];
      const years = activeState.personal.projectionYears || 30;
      for (let i = 0; i < simulations; i++) {
        const data = runProjection(activeState, true, i);
        allRuns.push(data);
      }

      // Percentile calculations
      const percentileData = [];
      for (let y = 0; y < years; y++) {
        const netAssetsAtYear = allRuns.map(r => r[y]?.netAssets || 0).sort((a, b) => a - b);
        const p5 = netAssetsAtYear[Math.floor(simulations * 0.05)];
        const p25 = netAssetsAtYear[Math.floor(simulations * 0.25)];
        const p50 = netAssetsAtYear[Math.floor(simulations * 0.50)];
        const p75 = netAssetsAtYear[Math.floor(simulations * 0.75)];
        const p95 = netAssetsAtYear[Math.floor(simulations * 0.95)];
        const mean = netAssetsAtYear.reduce((s, v) => s + v, 0) / simulations;
        percentileData.push({
          year: allRuns[0][y]?.year, age1: allRuns[0][y]?.age1,
          p5, p25, p50, p75, p95, mean,
          range_5_95: p95 - p5, range_25_75: p75 - p25,
        });
      }

      const finalAssets = allRuns.map(r => r[r.length - 1]?.netAssets || 0);
      const successRate = finalAssets.filter(v => v > 0).length / simulations * 100;
      const exhaustionAges = allRuns.map(r => {
        const idx = r.findIndex(d => d.netAssets <= 0);
        return idx >= 0 ? r[idx].age1 : null;
      }).filter(v => v !== null);
      const avgExhaustion = exhaustionAges.length > 0 ? exhaustionAges.reduce((s, v) => s + v, 0) / exhaustionAges.length : null;

      // Distribution histogram
      const bins = 30;
      const minVal = Math.min(...finalAssets);
      const maxVal = Math.max(...finalAssets);
      const binWidth = (maxVal - minVal) / bins || 1;
      const histogram = Array(bins).fill(0);
      finalAssets.forEach(v => {
        const bin = Math.min(bins - 1, Math.floor((v - minVal) / binWidth));
        histogram[bin]++;
      });
      const histData = histogram.map((count, i) => ({ value: Math.round(minVal + i * binWidth), count, pct: (count / simulations * 100).toFixed(1) }));

      setResults({ percentileData, successRate, avgExhaustion, histData, finalAssets, simCount: simulations });
      setRunning(false);
    }, 100);
  }, [activeState, simulations]);

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Stress Testing" readOnly />

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
              {scenario === "after" && afterState ? "✨ After Advice Simulation" : "Probability Analysis"}
            </div>
            <p style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, margin: 0 }}>
              {scenario === "after" && afterState
                ? "Simulating the After Advice scenario with randomised returns. Compare the success rate and median outcome against your baseline."
                : "Models thousands of possible futures using randomised returns based on each asset class's volatility. Shows the range of outcomes from worst to best case."}
            </p>
          </div>
          <div className="flex gap-3 items-end">
            <Input label="Simulations" value={simulations} onChange={setSimulations} />
            <Btn onClick={runSim} color={COLORS.green}>{running ? "Running…" : "Run Simulation"}</Btn>
          </div>
        </div>
      </Card>

      {results && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Success Rate</div>
              <div style={{ color: results.successRate >= 90 ? COLORS.green : results.successRate >= 70 ? COLORS.orange : COLORS.red, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{results.successRate.toFixed(1)}%</div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Assets remain at end of plan</div>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Median Outcome</div>
              <div style={{ color: COLORS.accent, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.percentileData[results.percentileData.length - 1]?.p50)}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>50th percentile final assets</div>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Worst Case</div>
              <div style={{ color: COLORS.red, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.percentileData[results.percentileData.length - 1]?.p5)}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>5th percentile final assets</div>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Best Case</div>
              <div style={{ color: COLORS.green, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.percentileData[results.percentileData.length - 1]?.p95)}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>95th percentile final assets</div>
            </div>
            {results.avgExhaustion && (
              <div style={{ background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}30`, borderRadius: 10, padding: "14px 16px", gridColumn: "1 / -1" }}>
                <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Average Age Assets Run Out</div>
                <div style={{ color: COLORS.red, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(results.avgExhaustion)}</div>
                <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>In scenarios where assets are exhausted</div>
              </div>
            )}
          </div>

          <Card title="Net Assets – Percentile Bands">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={results.percentileData}>
                <defs>
                  <linearGradient id="gBand1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.1} /><stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.05} /></linearGradient>
                  <linearGradient id="gBand2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.2} /><stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.1} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Area type="monotone" dataKey="p95" stroke="none" fill="url(#gBand1)" name="95th" />
                <Area type="monotone" dataKey="p75" stroke="none" fill="url(#gBand2)" name="75th" />
                <Line type="monotone" dataKey="p50" stroke={COLORS.accent} strokeWidth={2.5} dot={false} name="Median" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="url(#gBand2)" name="25th" />
                <Area type="monotone" dataKey="p5" stroke="none" fill="url(#gBand1)" name="5th" />
                <Line type="monotone" dataKey="mean" stroke={COLORS.green} strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Mean" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Distribution of Final Net Assets">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={results.histData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="value" tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <Tooltip formatter={(v, name) => name === "count" ? v : `${v}%`} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} labelFormatter={(v) => `Net Assets: ${fmt(v)}`} />
                <Bar dataKey="count" fill={COLORS.accent} radius={[2, 2, 0, 0]} name="Simulations" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// LIABILITIES TAB
// ============================================================
function LiabilitiesTab({ state, setState, scenario, onActivateAfter, onActivateNow, onResetAfter, afterState }) {
  const { assets, personal } = state;
  const loans = assets.loans || [];
  const n1 = personal.person1.name || "Person 1";
  const n2 = personal.person2.name || "Person 2";
  const isCouple = personal.isCouple;

  const allAssets = [
    { value: "", label: "— None —" },
    ...assets.lifestyleAssets.map((a, i) => ({ value: `lifestyle_${i}`, label: a.description || `Lifestyle ${i+1}` })),
    { value: "p1NonSuper", label: `${n1} Non-Super` },
    ...(isCouple ? [{ value: "p2NonSuper", label: `${n2} Non-Super` }] : []),
    { value: "joint", label: "Joint" },
  ];

  const addLoan = () => setState(s => ({ ...s, assets: { ...s.assets, loans: [...(s.assets.loans || []), {
    description: "", balance: 0, variableRate: 6.5, fixedRate: 6.0, fixedTermMonths: 0,
    termMonths: 360, repaymentType: "pi", frequency: "monthly", extraRepayment: 0,
    deductible: false, owner: "joint", linkedAsset: "",
  }] } }));

  const updLoan = (i, f, v) => setState(s => {
    const arr = [...(s.assets.loans || [])]; arr[i] = { ...arr[i], [f]: v };
    return { ...s, assets: { ...s.assets, loans: arr } };
  });

  const rmLoan = (i) => setState(s => ({ ...s, assets: { ...s.assets, loans: (s.assets.loans || []).filter((_, j) => j !== i) } }));

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Liabilities" />
      <div style={{ padding: "10px 14px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 8 }}>
        <p style={{ color: COLORS.accent, fontSize: 12, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Add loans and debts. Only tax-deductible interest reduces your taxable income. Link each loan to the asset it funds.</p>
      </div>

      {loans.map((loan, i) => {
        const minMonthlyPmt = loan.balance > 0 && loan.repaymentType === "pi" ? (() => {
          const r = (loan.fixedTermMonths > 0 && loan.fixedRate ? loan.fixedRate : loan.variableRate || 6) / 100 / 12;
          const n = loan.termMonths || 360;
          return r > 0 ? (loan.balance * r) / (1 - Math.pow(1 + r, -n)) : loan.balance / n;
        })() : (loan.balance || 0) * ((loan.variableRate || 6) / 100 / 12);

        const minByFreq = (freq) => {
          if (freq === "weekly") return minMonthlyPmt * 12 / 52;
          if (freq === "fortnightly") return minMonthlyPmt * 12 / 26;
          return minMonthlyPmt;
        };

        const totalRepayment = minByFreq(loan.frequency) + (loan.extraRepayment || 0);

        // Calculate per-period payment for current frequency
        const monthlyTotal = minMonthlyPmt + getMonthlyEquiv(loan.extraRepayment || 0, loan.frequency);
        let perPeriodPmt;
        if (loan.frequency === "weekly") perPeriodPmt = monthlyTotal / 4;
        else if (loan.frequency === "fortnightly") perPeriodPmt = monthlyTotal / 2;
        else perPeriodPmt = monthlyTotal;

        const payoff = calcLoanPayoff(loan.balance, loan.variableRate, perPeriodPmt, loan.frequency, loan.repaymentType, loan.fixedRate, loan.fixedTermMonths, loan.termMonths);
        const currentYear = new Date().getFullYear();
        const payoffDate = new Date(currentYear, payoff.payoffMonth);
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

        // Frequency comparison — split the SAME monthly amount into different frequencies
        // Weekly: monthly / (52/12) = monthly * 12/52 per week, but 52 payments = slightly more per year
        // The savings come from: monthly_pmt/4 * 52 = monthly_pmt * 13 (one extra month per year)
        const freqs = ["monthly", "fortnightly", "weekly"];
        const monthlyMinPmt = minMonthlyPmt + getMonthlyEquiv(loan.extraRepayment || 0, loan.frequency);
        const comparisons = freqs.map(freq => {
          // Convert the monthly payment to per-period: same $ per period as monthly/4 (weekly) or monthly/2 (fortnightly)
          let perPeriodPmt;
          if (freq === "weekly") perPeriodPmt = monthlyMinPmt / 4; // same fortnightly rhythm, 52 payments = 13 months
          else if (freq === "fortnightly") perPeriodPmt = monthlyMinPmt / 2; // 26 payments = 13 months
          else perPeriodPmt = monthlyMinPmt; // 12 payments = 12 months
          const pf = calcLoanPayoff(loan.balance, loan.variableRate, perPeriodPmt, freq, loan.repaymentType, loan.fixedRate, loan.fixedTermMonths, loan.termMonths);
          return { freq, perPeriodPmt, ...pf };
        });
        const basePf = comparisons.find(c => c.freq === "monthly");
        
        return (
        <Card key={i} title={loan.description || `Loan ${i+1}`} actions={<button onClick={() => rmLoan(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 18 }}>×</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
            <Input label="Description" value={loan.description} onChange={(v) => updLoan(i, "description", v)} type="text" />
            <Input label="Loan Balance" value={loan.balance} onChange={(v) => updLoan(i, "balance", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
            <Input label="Variable Rate" value={loan.variableRate} onChange={(v) => updLoan(i, "variableRate", v)} suffix="%" />
            <Input label="Fixed Rate" value={loan.fixedRate} onChange={(v) => updLoan(i, "fixedRate", v)} suffix="%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
            <Input label="Fixed Term (months)" value={loan.fixedTermMonths} onChange={(v) => updLoan(i, "fixedTermMonths", v)} />
            <Input label="Loan Term (months)" value={loan.termMonths} onChange={(v) => updLoan(i, "termMonths", v)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
            <Select label="Repayment Type" value={loan.repaymentType} onChange={(v) => updLoan(i, "repaymentType", v)}
              options={[{ value: "pi", label: "Principal & Interest" }, { value: "io", label: "Interest Only" }]} />
            <Select label="Frequency" value={loan.frequency} onChange={(v) => updLoan(i, "frequency", v)}
              options={[{ value: "monthly", label: "Monthly" }, { value: "fortnightly", label: "Fortnightly" }, { value: "weekly", label: "Weekly" }]} />
          </div>

          {loan.balance > 0 && (
            <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 , alignItems: "end" }}>
                <div>
                  <span style={{ color: COLORS.textDim, fontSize: 10 }}>Min. Repayment ({loan.frequency || "monthly"})</span>
                  <div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}>{fmt(Math.round(minByFreq(loan.frequency)))}</div>
                </div>
                <Input label={`Extra Repayment (${loan.frequency || "monthly"})`} value={loan.extraRepayment || 0} onChange={(v) => updLoan(i, "extraRepayment", v)} prefix="$" />
              </div>
              {(loan.extraRepayment || 0) > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: COLORS.green, fontFamily: "'DM Sans', sans-serif" }}>
                  Total repayment: {fmt(Math.round(totalRepayment))} per {loan.frequency || "month"}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, alignItems: "end" }}>
            <Select label="Owner" value={loan.owner} onChange={(v) => updLoan(i, "owner", v)}
              options={[{ value: "p1", label: n1 }, ...(isCouple ? [{ value: "p2", label: n2 }] : []), { value: "joint", label: "Joint" }]} />
            <Select label="Linked Asset" value={loan.linkedAsset} onChange={(v) => updLoan(i, "linkedAsset", v)} options={allAssets} />
          </div>

          {/* Ownership split — only for joint loans */}
          {loan.owner === "joint" && isCouple && (
            <div style={{ padding: "10px 12px", background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                Ownership Split {loan.deductible ? "— affects deductible interest per person" : ""}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <Input label={`${n1} share`} value={loan.p1Pct ?? 50} onChange={(v) => { const p1 = Math.min(100, Math.max(0, Number(v))); updLoan(i, "p1Pct", p1); updLoan(i, "p2Pct", 100 - p1); }} suffix="%" />
                <Input label={`${n2} share`} value={loan.p2Pct ?? 50} onChange={(v) => { const p2 = Math.min(100, Math.max(0, Number(v))); updLoan(i, "p2Pct", p2); updLoan(i, "p1Pct", 100 - p2); }} suffix="%" />
              </div>
              {loan.deductible && loan.balance > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, color: COLORS.textDim, fontFamily: "'DM Sans', sans-serif" }}>
                  Deductible interest split: {n1} deducts {fmt(Math.round((loanData[i]?.interest || 0) * (loan.p1Pct ?? 50) / 100))}/yr, {n2} deducts {fmt(Math.round((loanData[i]?.interest || 0) * (loan.p2Pct ?? 50) / 100))}/yr
                </div>
              )}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: 6 }}>Tax Deductibility</label>
            <div className="flex gap-2">
              <Btn small active={!loan.deductible} onClick={() => updLoan(i, "deductible", false)} color={COLORS.red}>
                Non-Deductible
              </Btn>
              <Btn small active={loan.deductible} onClick={() => updLoan(i, "deductible", true)} color={COLORS.green}>
                Tax Deductible
              </Btn>
            </div>
          </div>

          {loan.balance > 0 && (
            <div style={{ padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
                <div><span style={{ color: COLORS.textDim, fontSize: 10 }}>Paid Off</span><div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{loan.repaymentType === "io" ? "Never (IO)" : `${monthNames[payoffDate.getMonth()]} ${payoffDate.getFullYear()}`}</div></div>
                <div><span style={{ color: COLORS.textDim, fontSize: 10 }}>Total Interest</span><div style={{ color: COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{fmt(payoff.totalInterest)}</div></div>
                <div><span style={{ color: COLORS.textDim, fontSize: 10 }}>Total Cost</span><div style={{ color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{fmt(payoff.totalPaid)}</div></div>
              </div>

              {loan.repaymentType !== "io" && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 6, fontWeight: 600 }}>Payment Frequency Comparison</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 , alignItems: "end" }}>
                  {comparisons.map(c => {
                    const timeSaved = basePf ? basePf.payoffMonth - c.payoffMonth : 0;
                    const intSaved = basePf ? basePf.totalInterest - c.totalInterest : 0;
                    const isActive = c.freq === loan.frequency;
                    return (
                      <button key={c.freq} onClick={() => updLoan(i, "frequency", c.freq)} style={{
                        background: isActive ? COLORS.accent : COLORS.card, border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                        borderRadius: 6, padding: 8, cursor: "pointer", textAlign: "left",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? "#fff" : COLORS.text, textTransform: "capitalize", marginBottom: 2 }}>{c.freq}</div>
                        <div style={{ fontSize: 10, color: isActive ? "#ffffffcc" : COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(Math.round(c.perPeriodPmt))}</div>
                        <div style={{ fontSize: 9, color: isActive ? "#ffffffcc" : COLORS.textDim, marginTop: 2 }}>{Math.floor(c.payoffMonth/12)}y {c.payoffMonth%12}m</div>
                        {timeSaved > 0 && <div style={{ fontSize: 9, color: isActive ? "#ffffffcc" : COLORS.green, marginTop: 2, fontWeight: 600 }}>Save {Math.floor(timeSaved/12)}y {timeSaved%12}m</div>}
                        {intSaved > 0 && <div style={{ fontSize: 9, color: isActive ? "#ffffffcc" : COLORS.green, fontWeight: 600 }}>Save {fmt(Math.round(intSaved))}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          )}
        </Card>
        );
      })}

      <Btn onClick={addLoan} color={COLORS.accent}>+ Add Loan</Btn>
    </div>
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
function SettingsTab({ theme, setTheme }) {
  return (
    <div>
      <Card title="Appearance">
        <p style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>Choose a theme to customise the look and feel of the application.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 , alignItems: "end" }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              style={{
                background: t.card, border: theme === key ? `3px solid ${t.accent}` : `1px solid ${t.border}`,
                borderRadius: 12, padding: 0, cursor: "pointer", overflow: "hidden", textAlign: "left", transition: "all 0.2s",
                boxShadow: theme === key ? `0 0 0 2px ${t.accent}40` : "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ background: t.headerBg, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${t.border}` }}>
                {key === "Covenant Wealth" ? (
                  <img src={COVENANT_LOGO} alt="Covenant Wealth" style={{ height: 24 }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${t.accent}, ${t.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>F</div>
                )}
                <span style={{ color: t.headerText || t.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{t.appTitle}</span>
              </div>
              <div style={{ background: t.bg, padding: 14 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[t.accent, t.green, t.orange, t.cyan, t.purple].map((c, i) => (
                    <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, height: 32, borderRadius: 6, background: t.card, border: `1px solid ${t.border}` }} />
                  <div style={{ flex: 1, height: 32, borderRadius: 6, background: t.card, border: `1px solid ${t.border}` }} />
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: t.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{t.name}</span>
                  {theme === key && <span style={{ color: t.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>✓ Active</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// AI FINANCIAL LITERACY ASSISTANT — Static Knowledge Base
// (API fetch is blocked in the Claude.ai artifact sandbox)
// ============================================================
const TAB_CONTEXTS = {
  dashboard: "the Dashboard",
  personal: "the Personal tab",
  income: "the Income tab",
  assets: "the Assets tab",
  expenses: "the Expenses tab",
  liabilities: "the Liabilities tab",
  projections: "the Projections tab",
  monte_carlo: "the Stress Testing tab",
  tax_rates: "the Legislation tab",
  returns: "the Returns & Portfolios tab",
  settings: "the Settings tab",
};

const ADVICE_REFERRAL = `That's a great question that really deserves personalised advice based on your full situation.

As a general rule, this tool is designed to educate and help you model scenarios — but turning that into a personal recommendation requires a licensed financial adviser who knows you.

If you don't have one, I'd encourage you to reach out to **Tudor Cosma** at Covenant Wealth — he's the Certified Financial Planner who built this tool. Tudor works with Australians Australia-wide entirely via video calls and email, so location is no barrier.

📞 **03 9982 4484**
🌐 **www.covenantwealth.com.au**
📍 Level 15, 28 Freshwater Place, Southbank VIC 3006

Tudor specialises in retirement planning for couples in their 60s and offers a no-pressure introductory workshop to see if it's a good fit.`;

const KNOWLEDGE_BASE = [
  // ─── WHY THIS TOOL EXISTS ────────────────────────────────────────────────
  { keys: ["why does this tool exist","what is this tool","what does this planner do","what is the covenant wealth planner","purpose of this app"],
    answer: `This tool was built by Tudor Cosma, a Certified Financial Planner at Covenant Wealth, to give ordinary Australians — especially couples in their 50s and 60s approaching retirement — a clear, honest, and comprehensive view of their financial life.

Most Australians arrive at retirement having saved diligently but without ever having their full financial picture modelled together in one place. This tool changes that. It models your actual situation, shows what the future might look like, and crucially, shows how financial advice and smart decisions can make that future meaningfully better.

It is not a marketing tool. It is a thinking tool.` },

  // ─── HOW TO USE THE TOOL ────────────────────────────────────────────────
  { keys: ["how do i use this","how to use","where do i start","getting started","first steps","what should i enter first"],
    answer: `Here is the recommended order for getting the most from this planner:

**Step 1 — Enter Now accurately.** Use your most recent super statement for balances, your last payslip for salary, and your best estimate of actual expenses. The projection is only as good as the inputs.

**Step 2 — Check the Dashboard.** Do the six stat cards (surplus, income, expenses, net wealth, net investment assets, liabilities) look right? If numbers seem off, revisit the relevant tab.

**Step 3 — Review the Projections.** Do the charts make sense? When does income drop at retirement? When does the age pension start? When does super peak then decline?

**Step 4 — Run the Stress Test.** What is your success rate? 95%+ is robust. 80–90% means some vulnerability. Below 80% means the plan needs adjustment.

**Step 5 — Activate After Advice.** Make changes — more salary sacrifice, earlier pension conversion, lower fees, fortnightly loan payments, a gift to the kids. Watch the Value of Advice card update.

**Step 6 — Stress test the After scenario.** Has success rate improved? Has the median outcome improved?` },

  // ─── PERSONAL TAB ────────────────────────────────────────────────────────
  { keys: ["why does date of birth matter","why dob","why age","life expectancy","planning horizon","how long will retirement last","retirement length"],
    answer: `Your date of birth lets the tool calculate your precise current age and project year by year to your life expectancy.

Life expectancy is your planning horizon — not a morbid concept but a practical one. A 65-year-old Australian woman has a statistical life expectancy of around 87, meaning retirement could last 22 years or more. A couple has an even longer joint horizon because the plan must survive as long as the longest-lived partner.

Retirement age determines how many years you have to accumulate before drawing down. Retiring at 60 might mean 30 years of retirement to fund. Retiring at 67 might mean only 20. The difference in required savings is dramatic.

Inflation (default 2.5%) means $80,000 of expenses today costs $133,000 in 20 years. Salary growth affects how much you earn and save before retirement.` },

  // ─── INCOME TAB ─────────────────────────────────────────────────────────
  { keys: ["income tab","what goes in income","income section","income types"],
    answer: `The Income tab captures every source of money flowing in:

• **Salary** — your gross wage before tax and super
• **Salary sacrifice** — pre-tax contributions to super that reduce taxable income
• **Other taxable income** — consulting, part-time work, business income
• **Rental income** — from investment properties
• **Franked dividends** — from Australian shares (with imputation credits)
• **Tax-free income** — like pension phase super draws after 60
• **Personal super contributions** — concessional (deductible) and non-concessional (after-tax)

Each is taxed differently. The tool applies the correct treatment to each, so your after-tax cashflow picture is accurate.` },

  { keys: ["salary sacrifice","what is salary sacrifice","how does salary sacrifice work","pre-tax super"],
    answer: `Salary sacrifice means directing part of your pre-tax salary into super instead of receiving it as cash. Because it goes in before income tax is applied, you only pay 15% contributions tax instead of your marginal rate (which could be 30%, 37%, or 45%).

**Example:** If you earn $100,000 and salary sacrifice $15,000 into super:
• You save tax at 30% minus 15% = 15% on $15,000 = **$2,250 per year in tax savings**
• Plus the $15,000 grows tax-advantaged inside super

There is a cap of $30,000 per year on all concessional (pre-tax) contributions combined — including your employer's super guarantee.` },

  { keys: ["super guarantee","sg rate","employer contributions","compulsory super","12 percent"],
    answer: `The Superannuation Guarantee (SG) is the compulsory super your employer must pay on top of your salary. From 1 July 2025 the rate is **12%** of your ordinary time earnings.

This counts toward your $30,000 concessional contributions cap. So if your employer pays $12,000 in SG, you only have $18,000 of cap remaining for salary sacrifice or personal deductible contributions.

The SG is not paid out of your salary — it is an additional cost to the employer on top of your salary package. Some employers quote salaries "inclusive of super" which means the 12% comes out of the package figure.` },

  { keys: ["concessional contributions","concessional cap","pre-tax contributions cap","contributions cap","30000"],
    answer: `Concessional contributions are pre-tax super contributions — employer SG, salary sacrifice, and personal deductible contributions all count.

The cap for 2025-26 is **$30,000 per year**. Going over this cap means the excess is taxed at your marginal rate (less a 15% tax offset), which largely defeats the purpose.

Under the carry-forward rule, if your total super balance is below $500,000, you can use unused cap amounts from the previous 5 years — allowing a larger catch-up contribution in one year.` },

  { keys: ["non concessional","after tax super","non concessional cap","120000"],
    answer: `Non-concessional contributions are after-tax money you voluntarily put into super. The cap is **$120,000 per year**.

Using the 3-year bring-forward rule, if you are under 75, you can contribute up to **$360,000** in one year. There is no tax on the way in (you have already paid income tax), and earnings in pension phase are also completely tax-free.

Non-concessional contributions make particular sense for people who have sold an asset (like a business or property) and want to get the proceeds into the tax-advantaged super environment.` },

  { keys: ["franking credit","franked dividend","imputation credit","dividend tax"],
    answer: `Franking credits (imputation credits) are attached to dividends paid by Australian companies. When a company pays a dividend, it has already paid 30% corporate tax on the profits. The franking credit represents that tax already paid.

When you receive a franked dividend, you declare the gross amount (dividend + credit) as income, then get the credit against your tax bill. If your marginal rate is lower than 30%, you receive a refund of the difference. If it is higher, you pay the shortfall.

In super pension phase (where tax rate is 0%), franking credits become a cash refund — the fund receives money back from the ATO. This makes Australian shares particularly attractive inside a pension account.` },

  { keys: ["rental income","investment property income","rental tax","negative gearing","deductible property expenses"],
    answer: `Rental income is fully taxable at your marginal rate. However, you can deduct:
• Loan interest (if the property is an investment, not your home)
• Council rates and land tax
• Insurance premiums
• Property management fees
• Repairs and maintenance
• Depreciation on the building and fittings

If expenses exceed income (negative gearing), the net loss can offset your other income, reducing your overall tax bill. This is the basis of the negative gearing strategy commonly used in Australian property investment.

This tool allows you to enter rental income in the Income tab and model the associated loan interest deduction in the Liabilities tab with the "Tax Deductible" option selected.` },

  // ─── ASSETS / SUPERANNUATION ─────────────────────────────────────────────
  { keys: ["accumulation phase","what is accumulation","accumulation super","accumulation account","super savings phase"],
    answer: `Accumulation phase is the saving stage of superannuation — you are working, contributing money in, and it is growing.

**Tax treatment:**
• Earnings taxed at **15% on income** (dividends, interest, rent from property within the fund)
• **10% on capital gains** from rebalancing (the fund gets the 1/3 CGT discount for assets held over 12 months)
• Contributions taxed at 15% (concessional) or 0% (non-concessional, after-tax)

You cannot generally access the money until you reach preservation age (60) and retire, or turn 65 regardless of work status. The balance is excluded from the Centrelink assets test until you reach pension age (67) or the account enters pension phase.` },

  { keys: ["account based pension","abp","pension phase","what is pension phase","pension super","0% tax super","tax free super"],
    answer: `Account-Based Pension (ABP) is when you convert your super into a retirement income stream. This is one of the most powerful tax concessions in the Australian system.

**Tax treatment:**
• **0% tax on all earnings** — income return, capital gains, everything
• **0% tax on pension draws** after age 60 (tax-free in your hands)
• No maximum drawdown — you can take as much as you need
• Lump sums are also tax-free after 60
• Minimum draw of 4% per year applies (government regulation to prevent super being used purely as a tax shelter)

The fund's earnings being completely tax-free means your balance grows faster, which means you have more to draw from, which makes the money last longer. The difference versus accumulation (15% tax) is substantial over 20+ years.` },

  { keys: ["transition to retirement","ttr","ttr pension","what is ttr","reduce working hours"],
    answer: `Transition to Retirement (TTR) allows you to start drawing from your super from age 60 while still working — useful for reducing hours without a big income drop.

**Key rules:**
• Must be 60+ (conditions of release in practice)
• Minimum draw: 4% per year
• Maximum draw: 10% per year
• No lump sums permitted (SIS Regulation 6.01)
• Draws are taxable income (assessable in your hands)

**Tax treatment of the TTR fund:**
• Income return: taxed at **15%** (income earnings tax exemption was removed 1 July 2017)
• Capital gains: **0% tax** — the CGT exemption was NOT removed in 2017, only the income exemption was
• So TTR is better for growth-oriented portfolios where most return is capital growth

TTR is best used to bridge the income gap when you step down from full-time work, not primarily as a tax strategy.` },

  { keys: ["pension conversion","convert to pension","when to convert super to pension","pension rollover","how does conversion work"],
    answer: `Converting from accumulation to Account-Based Pension is one of the most impactful decisions in retirement planning.

**When you can do it:** Once you meet a condition of release — usually turning 60 and retiring, or turning 65 regardless.

**The conversion process:** You roll your accumulation balance into a pension account. From that point, all earnings are tax-free. The rollover itself has no CGT — it is specifically a tax-free event under the SIS Act.

**This tool lets you model a future conversion date.** Set "Pension Start Year" on the super card and the engine automatically switches to 0% earnings tax from that year forward — showing you the full benefit of converting at different ages.

**Partial conversion:** You can convert most of the balance to pension (tax-free) while retaining a small amount in accumulation to allow continued concessional contributions. The tool models this — the pension portion earns 0%, the retained accumulation portion earns at 15% income / 10% CGT.

**Centrelink impact:** Once in pension phase, the super balance becomes assessable for the Centrelink assets test. This timing consideration — pension's tax benefits versus the Centrelink assets test impact — is one of the most important planning decisions for people approaching pension age.` },

  { keys: ["division 293","div 293","high income super tax","30 percent super tax","250000 super"],
    answer: `Division 293 is an additional 15% tax on concessional super contributions for high earners.

It applies when your income plus concessional contributions exceed **$250,000** in a financial year. So instead of the standard 15% contributions tax, you effectively pay 30%.

The ATO assesses this separately after you lodge your tax return and issues a Division 293 debt notice. You can pay it personally or have it deducted from your super fund.

Even with Division 293, concessional contributions to super can still be worthwhile if your marginal rate is 45% — you are still saving 15 cents in every dollar. But it eliminates the advantage for some income levels.` },

  { keys: ["transfer balance cap","tbc","1.9 million super","pension cap","too much super"],
    answer: `The Transfer Balance Cap (TBC) limits how much you can move into tax-free pension phase. For 2025-26 it is **$1.9 million** (indexed periodically).

If your super balance exceeds this amount, the excess must remain in accumulation and continues to be taxed at 15% on earnings.

For couples, each partner has their own separate cap — so a couple could potentially have up to $3.8 million in combined pension phase assets.

If you exceed the TBC, you receive an excess transfer balance determination from the ATO requiring you to commute (convert back) the excess to accumulation. Earnings on any excess are taxed at 15%, and there is an additional excess transfer balance tax.` },

  { keys: ["investment fees","fees compound","management cost","admin fee","advice cost","what do fees cost"],
    answer: `Investment fees are one of the most important and most overlooked aspects of retirement planning.

This tool separates fees into three components:
• **Admin fee** — the platform/account keeping fee (typically 0.1–0.3% pa)
• **Management cost** — the fund manager's investment fee (typically 0.3–1.5% pa)
• **Advice fee** — ongoing financial advice fee charged through the fund (typically 0.3–1.0% pa)

**Why fees matter so much:** They compound in the same way returns do, but in reverse. On a $500,000 super balance, a 1% annual fee over 20 years at 7% gross returns costs approximately **$380,000** in foregone wealth compared to a 0% fee scenario. Even a 0.5% fee difference compounds to roughly $190,000.

The tool shows the net return after fees on every account through the Portfolio Returns summary panel.` },

  { keys: ["portfolio profile","what is balanced","defensive portfolio","growth portfolio","aggressive portfolio","conservative portfolio","which portfolio"],
    answer: `Portfolio profiles represent different mixes of asset classes, balancing risk and return:

• **Cash** — 100% cash. Safe, no capital growth, but protected from market falls. Currently ~4.5% pa.
• **Defensive** — Mostly fixed interest and cash. Low volatility, lower returns (~4–5% pa gross).
• **Conservative** — Mix of defensive and growth assets. Moderate risk (~5–6% pa gross).
• **Balanced** — Roughly equal defensive and growth. Standard default for most super funds (~7% pa gross).
• **Growth** — Mostly shares and property. Higher volatility, higher long-term returns (~8% pa gross).
• **Aggressive** — Almost all shares including international and emerging markets. Highest volatility, highest long-term returns (~9% pa gross).

The "right" profile depends on your time horizon, risk tolerance, and whether you can psychologically handle seeing your balance drop 30–40% in a bad year (even if you know it will recover). A qualified adviser can help you find the right balance.` },

  { keys: ["what is volatility","investment risk","market risk","standard deviation","shares risk"],
    answer: `Volatility is how much an investment's return varies from year to year. It is measured as standard deviation — a mathematical measure of how widely actual returns spread around the average.

• Cash: volatility of ~0.5% — almost no variation
• Australian shares: volatility of ~15% — could return anywhere from -25% to +35% in a single year
• Emerging markets: volatility of ~22% — even wider range

Higher volatility is not inherently bad if you have a long time horizon, because you have time to recover from bad years. But it matters enormously in early retirement when a large market fall — before you have started drawing — can permanently impair the sustainability of your income (this is called "sequence of returns risk").

The Stress Testing tab models this explicitly.` },

  // ─── EXPENSES ───────────────────────────────────────────────────────────
  { keys: ["expenses tab","lifestyle expenses","spending in retirement","retirement spending","go-go years","slow-go years","smile curve"],
    answer: `Retirement spending is not constant. Research shows a "smile curve":

• **Go-go years (60s–70s):** Active, travelling, helping the kids — spending is high
• **Slow-go years (70s–80s):** Slower pace, less travel — spending reduces
• **No-go years (80s+):** Home-based living, potentially increasing healthcare costs

This tool pre-fills three lifestyle expense periods to reflect this pattern. You can adjust the amounts, dates, and indexation rates for each period.

Beyond lifestyle expenses, you can add:
• **Recurring expenses** — rates, insurance, holidays, subscriptions that persist year to year
• **One-off future expenses** — a car replacement in 2030, a kitchen renovation, a bucket-list trip

Each of these flows through the projection engine and affects the surplus or deficit in that year.` },

  // ─── LIABILITIES ────────────────────────────────────────────────────────
  { keys: ["home loan","mortgage","should i pay off mortgage","pay off home loan","debt in retirement","loan repayment"],
    answer: `Carrying debt into retirement is increasingly common — many Australians still have home loan balances in their late 50s and 60s.

The key question is whether to pay it off before retiring or carry it through retirement. Factors to consider:
• Home loan interest is NOT tax deductible (it is a personal expense)
• Every dollar used to pay off the home loan "earns" a risk-free return equal to the interest rate
• Super (especially in pension phase) may earn more than the loan rate after tax, suggesting keeping the loan and letting super grow
• Paying off the home loan reduces assessable assets to zero (the home is excluded from Centrelink), which can increase age pension entitlement

This tool models the loan repayments year by year, showing exactly when the debt is paid off and the cumulative interest paid under different strategies.` },

  { keys: ["fortnightly payments","pay fortnightly","fortnightly vs monthly","save on interest paying fortnightly"],
    answer: `Paying your home loan fortnightly instead of monthly genuinely saves money — and it is not just about paying more frequently.

The trick is that fortnightly payments are calculated as half the monthly payment. Over a year, 26 fortnightly half-payments equals 13 full monthly payments — one extra payment per year automatically.

On a $400,000 loan at 6.5% over 30 years:
• Monthly payments: loan paid off in 30 years
• Fortnightly payments: loan paid off approximately **4 years earlier**, saving roughly **$80,000–100,000** in interest

Weekly payments save slightly more again. The tool shows this comparison on every loan card.` },

  { keys: ["interest only loan","io loan","investment loan interest only","why interest only"],
    answer: `Interest-only (IO) loans are common for investment properties. You pay only the interest each period — the principal doesn't reduce. This keeps repayments lower in the short term.

For investment properties, this can make sense because:
• The interest is fully tax deductible
• The cash you are not using to repay principal can be invested elsewhere
• At sale, you repay the original principal from the proceeds

However, IO loans typically have higher interest rates than P&I loans, and at the end of the IO period (usually 5 years), repayments jump significantly when they revert to P&I.

This tool correctly models IO loans — interest is paid but the balance doesn't reduce during the IO period.` },

  { keys: ["deductible interest","tax deductible loan","investment loan deduction","split ownership","1% 99% loan split","ownership percentage loan"],
    answer: `Interest on money borrowed to earn income is tax deductible under ITAA 1997 s.8-1. For investment property loans or margin loans, this means the interest reduces your taxable income at your marginal rate.

For joint investment loans, the interest deduction can be split between partners by ownership percentage. A common strategy is a **1%/99% split** — the higher-earning partner claims 99% of the interest deduction, maximising the tax benefit because 99% of the interest is deducted at the higher marginal rate.

This is entirely legal and commonly used. The split must reflect the genuine legal ownership structure of the investment asset. This tool allows you to model different ownership splits and see the tax impact on both partners in the projection.` },

  // ─── AGE PENSION AND CENTRELINK ─────────────────────────────────────────
  { keys: ["age pension","centrelink","how does age pension work","what is age pension","am i eligible for age pension","qualifying for pension"],
    answer: `The Age Pension is a Centrelink payment for Australians who reach qualifying age (currently **67**) and pass both financial tests.

For 2025-26, the maximum pension is:
• **Single:** $29,754 per year (approx $1,144 per fortnight)
• **Couple:** $44,962 per year combined (approx $1,729 per fortnight combined)

Two tests determine your entitlement:
1. **Assets test** — your assessable assets must be below certain thresholds
2. **Income test** — your assessable income must be below the free area

The test that produces the **lower pension** is the one that counts. Both tests are run every year of this tool's projection.

The age pension is indexed twice yearly to keep pace with inflation and wages.` },

  { keys: ["assets test","asset threshold","centrelink assets test","how much can i have","home not counted","what assets counted","assessable assets"],
    answer: `The Centrelink assets test counts most of what you own, but not your family home.

**Not counted:**
• Your principal place of residence (no matter its value)
• Superannuation in accumulation phase (until you reach pension age 67 or it enters pension phase)
• Some personal items

**Counted:**
• Superannuation in pension phase or TTR phase
• Non-super investments (shares, managed funds, term deposits)
• Investment property (at market value)
• Vehicles (above modest personal use)
• Business assets

**2025-26 thresholds (homeowners):**
• Single: full pension below $314,000; zero pension above $674,000
• Couple: full pension below $470,000; zero pension above $1,012,500

The reduction rate is **$3 per fortnight for every $1,000 above the threshold** — equivalent to $78 per year per $1,000, or a 7.8% annual taper rate.` },

  { keys: ["income test centrelink","deeming","deemed income","deemed rate","how does deeming work","financial assets income"],
    answer: `The Centrelink income test uses "deeming" — it assumes your financial assets earn a set rate regardless of what they actually earn.

**2025-26 deeming rates:**
• **0.25% per year** on the first $62,600 (single) or $103,800 (couple) of financial assets
• **2.25% per year** on amounts above those thresholds

**Income free areas (2025-26):**
• Single: $5,512 per year
• Couple: $9,752 per year combined

For every dollar of income above the free area, the pension reduces by **$0.50 per year** (50 cents in the dollar taper rate).

The income test also counts actual income from employment and rental properties — not just deemed investment income.` },

  { keys: ["super centrelink","super assets test","accumulation centrelink","when does super count centrelink","super pension age centrelink"],
    answer: `Superannuation's treatment in the Centrelink assets test depends on phase and age:

**Accumulation phase:**
• Excluded from the assets test if the owner is **under pension age (67)**
• Included once the owner reaches 67, even if still in accumulation

**Pension phase (ABP or TTR):**
• Included in the assets test from the moment it enters pension phase, regardless of age

This creates an important planning consideration. Converting super to pension phase earlier brings the tax benefit of 0% earnings tax — but it also brings the super into the Centrelink assets test sooner. For someone under 67 with assets near the pension threshold, this timing decision can cost significant age pension entitlement.` },

  { keys: ["gifting centrelink","gift rules","gifts and pension","deprivation","deprived assets","give money children pension","how much can i gift"],
    answer: `Centrelink allows gifts of up to **$10,000 per financial year** (maximum **$30,000 over any 5-year period**) without affecting the age pension.

**Within these limits:** The gift immediately reduces your assessable assets — it is genuinely gone, and your pension improves right away.

**Above these limits:** The excess is a "deprived asset" — Centrelink adds it back to your assessable assets for **5 years** from the date of the gift, even though you no longer have the money.

**Important nuances:**
• Gifting is NOT illegal — just the pension impact is delayed
• If you are already on the **full pension**, deprivation rules are completely irrelevant — you cannot receive more than the maximum
• After 5 years, the deprived amount falls off and your pension improves
• The tool tracks each gift individually with its exact date so the 5-year clock is precise` },

  // ─── NOW vs AFTER ────────────────────────────────────────────────────────
  { keys: ["now vs after","before and after","value of advice card","after advice","how do scenarios work","comparison"],
    answer: `The Now vs After Advice comparison is the centrepiece of this tool — it shows the financial value of making better decisions.

**Now** = your current situation exactly as it is. Enter your real numbers. This is the baseline.

**After Advice** = an exact copy of Now that you modify to model improvements. What if you salary sacrificed more? Converted super to pension earlier? Paid loans fortnightly? Reduced investment fees? Gifted to the kids within the exempt limit?

Each change in the After scenario propagates through the entire 30-year projection — affecting tax, investment growth, Centrelink entitlements, and final wealth.

**The Value of Advice card shows six specific improvements:**
1. Extra assets at retirement
2. Tax saved over life
3. Investment fees saved
4. Debt-free sooner (years)
5. Interest saved on debt
6. Extra age pension (cumulative and per fortnight per person)

The goal is not to find a perfect number. It is to make the value of good decisions visible.` },

  { keys: ["extra assets retirement","retirement wealth difference","how much more will i have","value of advice metrics"],
    answer: `"Extra Assets at Retirement" is the headline metric on the Value of Advice card — the difference in net investment assets at the end of the projection period between the Now and After scenarios.

This captures the compound effect of every decision modelled in the After scenario. Better tax efficiency, lower fees, smarter debt management, and optimised Centrelink entitlements all contribute.

It is shown as a dollar figure at the end of the projection. For example, if the After scenario results in $150,000 more in net investment assets at age 90, that is $150,000 more available for aged care costs, for leaving to children, or simply for the confidence of knowing you will not run out.` },

  { keys: ["tax saved lifetime","cumulative tax saving","tax over retirement","how much tax will i save"],
    answer: `"Tax Saved Over Life" on the Value of Advice card shows the cumulative difference in income tax and super contributions tax across the entire projection period.

Common strategies that reduce lifetime tax:
• **Salary sacrifice** — pays 15% instead of marginal rate on contributions
• **Pension conversion** — 0% earnings tax instead of 15% accumulation tax
• **Income splitting** — directing investment income to the lower-earning partner
• **Deductible interest** — claiming investment loan interest at the higher marginal rate
• **Timing of asset sales** — CGT planning around retirement

Small annual tax savings compound significantly over 20–30 years. Saving $3,000 per year in tax, invested at 7%, amounts to over $150,000 over 25 years.` },

  { keys: ["fees saved","investment fees saved","cost of fees","impact of fees","lower cost investments"],
    answer: `"Investment Fees Saved" shows the cumulative impact of reducing annual fee rates across the projection.

The mathematics of compounding fees is confronting:
• On a $500,000 portfolio at 7% gross return
• A 1.0% annual fee versus a 0.5% annual fee
• Over 20 years: the difference in ending balance is approximately **$190,000**
• The fee does not just cost you the fee — it costs you the return you would have earned on the fee amount

This is why even small reductions in fee rates — from 1.3% to 0.8%, say — compound into very large differences over a retirement. The tool calculates this precisely using each account's actual fee rates applied to the projected balance each year.` },

  // ─── STRESS TESTING ─────────────────────────────────────────────────────
  { keys: ["stress test","monte carlo","probability","success rate","will i run out of money","sequence of returns","market crash retirement"],
    answer: `The Stress Testing tab runs Monte Carlo simulation — 500 different possible futures for your financial plan.

Instead of assuming a fixed 7% return every year, each simulation draws random returns for each asset class based on its historical volatility. Some simulations have markets booming in early retirement. Others have a major crash in year 2. The range of outcomes shows how robust your plan is.

**What the results mean:**
• **Success rate** — % of 500 simulations where you do not run out of money. 95%+ is considered robust. Below 80% needs attention.
• **Median outcome** — the most likely result (50th percentile)
• **Worst case** — only 5% of simulations produced a worse result
• **Best case** — only 5% produced a better result

The biggest risk in retirement is "sequence of returns risk" — a major market fall in the first 3–5 years of retirement, before you have had time to recover. Monte Carlo modelling captures this risk explicitly, which a simple average-return projection cannot.` },

  { keys: ["what is a good success rate","success rate percentage","how high should success rate be","95 percent","90 percent retirement"],
    answer: `A success rate of 95% or above is generally considered a robust retirement plan — in 475 out of 500 simulated futures, you do not run out of money before your life expectancy.

However, what counts as "good enough" depends on:
• **Your flexibility** — can you reduce spending if markets fall? If so, a lower success rate may be acceptable
• **Your assets** — if you own your home outright and could sell it as a last resort, a lower success rate matters less
• **Your temperament** — some people find anything below 99% uncomfortable; others are fine with 85%
• **Your legacy goals** — if leaving wealth to children is important, you want a higher success rate

A success rate of 80–90% is not alarming, but it suggests some vulnerability — perhaps to a prolonged period of poor returns in early retirement. The After Advice scenario should ideally bring this above 90%.` },

  // ─── PROJECTIONS TAB ─────────────────────────────────────────────────────
  { keys: ["how do projections work","projection engine","what does projection show","charts meaning","how is projection calculated"],
    answer: `The projection engine runs year by year from today to your life expectancy, modelling every aspect of your financial situation simultaneously:

• Salary growing at your assumed rate until retirement
• Super contributions (SG + salary sacrifice) going in each year
• Super earnings taxed at the correct rate for each account's phase
• Pension drawdowns starting when you retire
• Age pension tested against both assets and income tests every year
• Loan amortisation — each loan reducing on its actual schedule
• Investment pools growing at their blended portfolio returns after fees
• Expenses in each year (lifestyle periods, recurring costs, one-off expenses)
• Surplus cash flowing into the investment pool; deficits drawn from it

The result is a year-by-year picture of income, expenses, super balances, non-super balances, debt, and net wealth.

Charts show these over time; the data table shows every number for every year. The "Δ After" column shows the year-by-year difference between Now and After Advice.` },

  // ─── LEGISLATION ────────────────────────────────────────────────────────
  { keys: ["tax rates 2025","2025 2026 tax","stage 3 tax cuts","income tax brackets","marginal rate"],
    answer: `2025-26 income tax rates for Australian residents (Stage 3 cuts, effective 1 July 2024):

• $0 – $18,200: **0%**
• $18,201 – $45,000: **16%** (was 19%)
• $45,001 – $135,000: **30%** (was 32.5%)
• $135,001 – $190,000: **37%**
• $190,001+: **45%**

Plus 2% Medicare levy on top.

These are marginal rates — you only pay the higher rate on the dollars in that bracket. So someone earning $100,000 pays: 0% on first $18,200, 16% on next $26,800, and 30% on the remaining $55,000.

The Stage 3 cuts significantly reduced the rate on middle incomes ($45k–$135k) from 32.5% to 30%.` },

  { keys: ["medicare levy","2 percent medicare","medicare surcharge","private health insurance tax"],
    answer: `The Medicare levy is 2% of your taxable income, on top of income tax. It funds the public health system.

The Medicare Levy Surcharge (MLS) is an additional tax of 1% to 1.5% for people who earn above $93,000 (single) and do not have private hospital cover. Having hospital cover avoids this surcharge.

Both the levy and surcharge are included in this tool's tax calculations.` },

  { keys: ["legislation tab","what is in legislation tab","rules tab","how to update rates","future rates"],
    answer: `The Legislation tab shows all the key rules governing Australian retirement finances, updated to 2025-26. Each section references the relevant Act.

You can update any figure in the legislation tab and the projections will automatically recalculate. This means you can model:
• Future tax changes as they are announced
• Changes to Centrelink thresholds and deeming rates
• Adjustments to super contribution caps
• Changes to the age pension qualifying age

The legislation currently shown reflects:
• Income Tax Assessment Act 1997 (tax brackets)
• Superannuation Industry (Supervision) Act 1993 (super rules)
• Social Security Act 1991 (age pension rules)
• Medicare Levy Act 1986` },

  // ─── GENERAL FINANCIAL LITERACY ─────────────────────────────────────────
  { keys: ["what is compounding","compound interest","compound growth","why invest long term"],
    answer: `Compounding is the process of earning returns on your returns — and it is the most powerful force in long-term wealth building.

**Simple example:** $100,000 at 7% per year:
• Year 1: $107,000 (earned $7,000)
• Year 5: $140,255 (earned $40,255 total)
• Year 10: $196,715 (earned $96,715 total)
• Year 20: $386,968 (earned $286,968 total)
• Year 30: $761,226 (earned $661,226 total)

The returns in year 30 are enormous compared to year 1 — because you are now earning returns on a much larger base.

This is also why fees are so destructive — a 1% fee reduces every year's return, and you lose not just the fee but all the future compounding on that fee.

And it is why starting early matters so much. $10,000 invested at age 30 at 7% grows to $149,745 by age 70. The same $10,000 invested at age 40 grows to only $76,123 — half as much despite being invested for only 10 fewer years.` },

  { keys: ["what is inflation","how does inflation affect retirement","inflation retirement","real vs nominal"],
    answer: `Inflation is the gradual increase in prices over time. At 2.5% per year, something that costs $100 today costs $128 in 10 years, $163 in 20 years, and $208 in 30 years.

For retirement planning, this means:
• Your expenses will grow over time even if your lifestyle stays the same
• Investment returns need to exceed inflation just to maintain purchasing power
• An income of $70,000 today is worth only $43,000 in today's dollars in 20 years if not indexed

This tool shows projections in both **nominal** (future dollar) and **real** (today's dollar) terms. The real figures are more meaningful for planning because they show what the money will actually buy. A $1.5 million balance in 30 years sounds enormous but in today's dollars at 2.5% inflation it is equivalent to about $730,000.` },

  { keys: ["sequence of returns","bad timing","retiring in a crash","market falls at retirement","order of returns"],
    answer: `Sequence of returns risk is one of the most important and least understood risks in retirement planning.

It refers to the danger of experiencing poor investment returns in the early years of retirement — before you have had time for markets to recover — while simultaneously drawing an income from your portfolio.

**Why early losses are so damaging:** If you start retirement with $1 million and markets fall 30% in year 1, you have $700,000. Even if markets recover 30% in year 2, you now have $910,000 — not $1 million. Meanwhile, you have been drawing income throughout, accelerating the depletion.

Contrast this with experiencing the same average returns in a different order — good returns early, bad returns late — and you end up with far more money despite identical average returns.

This is why Monte Carlo simulation is valuable. A simple average-return projection assumes returns are smooth and predictable. They are not.` },

  { keys: ["net wealth","what is net wealth","how is net wealth calculated","total wealth"],
    answer: `Net wealth is everything you own minus everything you owe:

**Assets counted:**
• Superannuation balances (all phases)
• Non-super investments
• Lifestyle assets (home, vehicles, contents)

**Liabilities subtracted:**
• Home loans and investment loans
• Any other debts

**Net investment assets** (the more useful retirement planning figure) excludes lifestyle assets like your home and car — because you cannot easily spend them to fund living costs without major life disruption. This is the figure that tells you how much financial capital you have available to fund retirement.

The Dashboard shows both figures. Net wealth confirms your overall balance sheet. Net investment assets tells you how much your financial portfolio is actually worth.` },

  { keys: ["annual surplus","what is surplus","cashflow","income minus expenses","negative surplus","what does deficit mean"],
    answer: `Annual surplus is total net income minus total expenses (including all debt repayments).

**Positive surplus** = you are earning more than you are spending. This money flows into your investment pool, growing your wealth.

**Negative surplus (deficit)** = you are spending more than you earn. This is drawn from your investment pool — which is entirely normal in retirement when you are living off accumulated savings rather than active income.

The transition from surplus (working years) to deficit (retirement years) is one of the most significant inflection points in the projection. This is where the age pension, super pension drawdowns, and investment earnings from accumulated wealth take over from salary as your income sources.` },

  // ─── WHO BUILT THIS / COVENANT WEALTH ────────────────────────────────────
  { keys: ["who built this","who made this","tudor cosma","covenant wealth","about covenant wealth","about the planner","who is tudor"],
    answer: `This tool was built by **Tudor Cosma**, a Certified Financial Planner at Covenant Wealth.

Tudor specialises in retirement planning for couples and individuals approaching or in retirement. He works with clients across Australia entirely via video calls and email — no in-person meetings required, and no geographic limitations.

Covenant Wealth is fee-for-advice only — no product commissions, no kickbacks, no conflicts of interest. Any unavoidable commissions are refunded to clients 100%.

The firm's investment philosophy is grounded in Nobel Prize-winning academic research (Fama-French factor investing), focusing on science and evidence rather than speculation.

If this tool has raised questions you want to explore further:

📞 **03 9982 4484**
🌐 **www.covenantwealth.com.au**
📍 Level 15, 28 Freshwater Place, Southbank VIC 3006
🎥 100% remote — video calls and email anywhere in Australia` },

  { keys: ["value of financial planning","does advice help","is financial advice worth it","cost of advice","why see a financial advisor"],
    answer: `Research consistently shows that people with a written financial plan accumulate significantly more wealth than those without one — not because the plan predicts the future, but because having a plan changes behaviour and decisions.

This tool makes abstract financial concepts concrete. It turns "I should do something about super" into "I can see that salary sacrificing $15,000 this year will give me $180,000 more at retirement." It turns "I need to think about the age pension" into "I can see exactly when and how much I qualify for and what changes it."

The Value of Advice card is a direct attempt to quantify this — to show in dollars what smarter decisions produce over a lifetime.

Financial advice works the same way — a good financial adviser does not just pick investments. They coordinate the entire picture: tax, super, Centrelink, estate planning, risk protection, and cashflow — making sure all the pieces work together optimally.

If you would like to explore what that looks like for your specific situation, Tudor Cosma at Covenant Wealth offers an initial workshop — no pressure, no product sales. Just clarity.

📞 **03 9982 4484**
🌐 **www.covenantwealth.com.au**` },
];
;

function findAnswer(question) {
  const q = question.toLowerCase();
  // Check for advice-seeking questions
  const adviceWords = ["should i","should we","what should","recommend","advise","tell me what to do","is it worth","better off","best option for me","right for me"];
  if (adviceWords.some(w => q.includes(w))) return ADVICE_REFERRAL;
  // Search knowledge base
  const match = KNOWLEDGE_BASE.find(item => item.keys.some(k => q.includes(k)));
  if (match) return match.answer;
  // Fallback with referral
  return `Great question! That's a topic I'd encourage you to explore with a financial adviser who can look at your specific numbers.\n\nIf you don't have one, **Tudor Cosma** at Covenant Wealth built this tool and works with Australians Australia-wide via video call — no need to be in Melbourne.\n\n📞 **03 9982 4484**\n🌐 **www.covenantwealth.com.au**\n\nIn the meantime, try asking me about: super phases, salary sacrifice, age pension tests, tax rates, pension conversion, gifting rules, or how the projections work.`;
}

const QUICK_QUESTIONS = {
  dashboard: ["What is the Value of Advice?", "How does Now vs After work?", "What is net wealth?"],
  personal: ["Why does date of birth matter?", "What is life expectancy used for?", "What retirement age should I use?"],
  income: ["What is salary sacrifice?", "How do franking credits work?", "What is the super guarantee rate?"],
  assets: ["How does pension conversion work?", "What is a TTR pension?", "Accumulation vs pension phase?"],
  expenses: ["What are the gifting rules?", "How does indexation work?", "What is a lifestyle expense period?"],
  liabilities: ["Is my loan interest tax deductible?", "What is an ownership split?", "What is interest-only vs P&I?"],
  projections: ["How do projections work?", "What does the Δ After column mean?", "Why does age pension change over time?"],
  monte_carlo: ["What is stress testing?", "What does success rate mean?", "What's a good success rate?"],
  tax_rates: ["What are the 2025-26 tax rates?", "What is Division 293?", "How does the assets test work?"],
  returns: ["What is a balanced portfolio?", "What does volatility mean?", "What return should I expect?"],
};

const TAB_INTROS = {
  dashboard: "You're on the **Dashboard** — your financial snapshot and the Value of Advice comparison.",
  personal: "You're on the **Personal** tab — where dates of birth, retirement age, and life expectancy live.",
  income: "You're on the **Income** tab — salary, salary sacrifice, super contributions, dividends, and rental income.",
  assets: "You're on the **Assets** tab — super accounts, non-super investments, your family home, and lifestyle assets.",
  expenses: "You're on the **Expenses** tab — lifestyle spending, recurring costs, one-off future expenses, and gifting rules.",
  liabilities: "You're on the **Liabilities** tab — loans, repayment strategies, deductibility, and ownership splits.",
  projections: "You're on the **Projections** tab — your financial future modelled year by year, with Before vs After comparison.",
  monte_carlo: "You're on the **Stress Testing** tab — Monte Carlo simulations showing the probability of financial success.",
  tax_rates: "You're on the **Legislation** tab — 2025-26 tax rates, super rules, age pension thresholds, and gifting rules.",
  returns: "You're on the **Returns & Portfolios** tab — asset class returns and portfolio allocation profiles.",
  settings: "You're on the **Settings** tab — change the app theme here.",
};

function FinancialAssistant({ tab }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Reset messages when tab changes or panel opens on a new tab
  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (tab !== prevTabRef.current) {
      prevTabRef.current = tab;
      setMessages([]);
      // If panel is open, set new intro
      if (open) {
        setMessages([{ role: "assistant", content: `${TAB_INTROS[tab] || "You switched tabs."}\n\nWhat would you like to understand about this section?` }]);
      }
    }
  }, [tab]);

  // Show intro when panel opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hi! I'm your financial literacy guide 👋\n\n${TAB_INTROS[tab] || ""}\n\nI can explain how anything here works in plain English — no jargon. What would you like to understand?`,
      }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (userText) => {
    if (!userText?.trim()) return;
    setInput("");
    const answer = findAnswer(userText);
    setMessages(prev => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: answer },
    ]);
  };

  const renderText = (text) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part
      );
      return <span key={i}>{parts}{i < text.split("\n").length - 1 && <br />}</span>;
    });
  };

  const questions = QUICK_QUESTIONS[tab] || ["How does this section work?", "What should I enter here?"];

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 20, zIndex: 1000,
          width: 52, height: 52, borderRadius: "50%",
          background: open ? COLORS.textDim : COLORS.accent,
          border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, transition: "all 0.2s", color: "#fff",
        }}
      >{open ? "✕" : "?"}</button>

      {open && (
        <div style={{
          position: "fixed", bottom: 86, right: 12, left: 12, zIndex: 999,
          maxWidth: 480, margin: "0 auto",
          background: COLORS.card, borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.20)",
          border: `1px solid ${COLORS.border}`,
          display: "flex", flexDirection: "column", height: "70vh", maxHeight: 560,
        }}>
          <div style={{ background: COLORS.accent, borderRadius: "16px 16px 0 0", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✨</div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Financial Guide</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}>Plain-English financial literacy</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%", padding: "9px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? COLORS.accent : COLORS.infoBg || "#ece8e1",
                  color: m.role === "user" ? "#fff" : COLORS.text,
                  fontSize: 12, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
                }}>
                  {renderText(m.content)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {questions.map((q, i) => (
                <button key={i} onClick={() => send(q)} style={{
                  padding: "5px 10px", borderRadius: 20,
                  border: `1px solid ${COLORS.accent}50`,
                  background: `${COLORS.accent}10`, color: COLORS.accent,
                  fontSize: 10, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 600,
                }}>{q}</button>
              ))}
            </div>
          )}

          <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask anything about this section..."
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 20,
                border: `1px solid ${COLORS.inputBorder}`, background: COLORS.inputBg,
                color: COLORS.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", outline: "none",
              }}
            />
            <button onClick={() => send(input)} style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              background: input.trim() ? COLORS.accent : COLORS.border,
              color: "#fff", cursor: "pointer", fontSize: 16, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// DEFAULT STATE
// ============================================================
const DEFAULT_STATE = {
  personal: {
    isCouple: true,
    isHomeowner: true,
    hasPrivateHealth: false,
    inflationRate: 2.5,
    salaryGrowth: 3.0,
    projectionYears: 30,
    person1: { name: "Person 1", birthYear: 1965, dob: "1965-07-01", gender: "M", employmentStatus: "employed", retirementAge: 67, lifeExpectancy: 90 },
    person2: { name: "Person 2", birthYear: 1970, dob: "1970-07-01", gender: "F", employmentStatus: "employed", retirementAge: 67, lifeExpectancy: 92 },
  },
  income: {
    person1: { salary: 90000, salarySacrifice: 0, otherTaxable: 0, frankedDividends: 0, rentalIncome: 0, taxFreeIncome: 0, personalDeductibleSuper: 0, nonConcessionalSuper: 0 },
    person2: { salary: 60000, salarySacrifice: 0, otherTaxable: 0, frankedDividends: 0, rentalIncome: 0, taxFreeIncome: 0, personalDeductibleSuper: 0, nonConcessionalSuper: 0 },
  },
  assets: {
    superAccounts: {
      p1Super: { balance: 250000, taxFree: 0, profile: "Balanced", type: "accumulation", drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p1Pension: { balance: 0, taxFree: 0, profile: "Balanced", type: "pension", drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p2Super: { balance: 120000, taxFree: 0, profile: "Balanced", type: "accumulation", drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p2Pension: { balance: 0, taxFree: 0, profile: "Balanced", type: "pension", drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50 },
      p1Extra: [],
      p2Extra: [],
    },
    nonSuper: {
      p1NonSuper: { balance: 50000, unrealisedGains: 5000, profile: "Balanced", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false, owner: "p1" },
      p2NonSuper: { balance: 20000, unrealisedGains: 2000, profile: "Balanced", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false, owner: "p2" },
      joint: { balance: 80000, unrealisedGains: 10000, profile: "Balanced", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false, owner: "joint" },
    },
    lifestyleAssets: [
      { description: "Principal Residence", value: 650000, growth: 3.0, isPrimaryResidence: true, downsizeYear: 0, downsizeProceeds: 0, downsizeAllocateTo: "joint" },
      { description: "Motor Vehicle", value: 25000, growth: -5.0, isPrimaryResidence: false },
      { description: "Contents & Furniture", value: 30000, growth: 0, isPrimaryResidence: false },
    ],
    loans: [],
  },
  expenses: {
    lifestyleExpenses: [
      { description: "Pre-Retirement", amount: 80000, indexation: 2.5, startYear: new Date().getFullYear(), endYear: 2032 },
      { description: "Retirement — Go-Go Years", amount: 70000, indexation: 2.0, startYear: 2033, endYear: 2043 },
      { description: "Retirement — Slow-Go Years", amount: 50000, indexation: 1.5, startYear: 2044, endYear: 2065 },
    ],
    baseExpenses: [
      { description: "Rates & Insurance", amount: 5000, type: "essential", indexation: 3.0, startYear: new Date().getFullYear(), endYear: 2065 },
      { description: "Annual Holiday", amount: 8000, type: "desirable", indexation: 2.5, startYear: new Date().getFullYear(), endYear: 2065 },
    ],
    futureExpenses: [
      { description: "Car Replacement", amount: 35000, startYear: 2030, endYear: 2030, indexation: 2.5, type: "desirable" },
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
};

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [state, setState] = useState(DEFAULT_STATE);
  const [afterState, setAfterState] = useState(null); // null = not yet created
  const [scenario, setScenario] = useState("now"); // "now" | "after"
  const [theme, setThemeState] = useState("Covenant Wealth");

  // Apply theme globally whenever it changes
  const setTheme = (name) => {
    const t = THEMES[name] || THEMES["Covenant Wealth"];
    Object.assign(COLORS, t);
    setThemeState(name);
  };

  // Ensure COLORS is in sync on first render
  useEffect(() => { Object.assign(COLORS, THEMES[theme]); }, []);

  // Activate "After" scenario — deep copy current state if not yet created
  const activateAfter = () => {
    if (!afterState) {
      setAfterState(JSON.parse(JSON.stringify(state)));
    }
    setScenario("after");
  };
  const activateNow = () => setScenario("now");
  const resetAfter = () => {
    setAfterState(JSON.parse(JSON.stringify(state)));
    setScenario("after");
  };

  const activeState = scenario === "after" && afterState ? afterState : state;
  const setActiveState = scenario === "after" ? setAfterState : setState;

  const projectionData = useMemo(() => runProjection(state, false), [state]);
  const afterProjectionData = useMemo(() => afterState ? runProjection(afterState, false) : null, [afterState]);

  const isCovenant = theme === "Covenant Wealth";

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>{`
        /* Keep font-size at 16px to prevent iOS Safari zoom on focus.
           Use transform scale to visually reduce by 20% on touch devices.
           Width is compensated so inputs still fill their containers. */
        input, select, textarea {
          font-size: 16px !important;
          transform: scale(0.8);
          transform-origin: left center;
          width: 125% !important;
          margin-right: -25% !important;
        }
        /* On desktop (mouse + pointer) restore normal compact size, no transform */
        @media (hover: hover) and (pointer: fine) {
          input, select, textarea {
            font-size: 13px !important;
            transform: none !important;
            width: 100% !important;
            margin-right: 0 !important;
          }
        }
      `}</style>
      {/* Header */}
      <div style={{ background: COLORS.headerBg || COLORS.card, borderBottom: isCovenant ? `3px solid #cfc090` : `1px solid ${COLORS.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="flex items-center gap-3">
          {isCovenant ? (
            <img src={COVENANT_LOGO} alt="Covenant Wealth" style={{ height: 36 }} />
          ) : (
            <>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>F</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.5, color: COLORS.headerText || COLORS.text }}>{COLORS.appTitle || "Australian Financial Planner"}</div>
                <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 0.5 }}>{COLORS.appSubtitle || "CASHFLOW · TAX · SUPER · CENTRELINK · MONTE CARLO"}</div>
              </div>
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: isCovenant ? (COLORS.headerText || "#fff") : COLORS.textDim }}>
          {state.personal.person1.name}{state.personal.isCouple ? ` & ${state.personal.person2.name}` : ""}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ background: COLORS.navBg || COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "0 16px", display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
              color: tab === t.id ? COLORS.accent : COLORS.textDim, padding: "10px 14px", fontSize: 12, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: tab === t.id ? 600 : 400, whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >
            <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 60px" }}>
        {tab === "dashboard" && <DashboardTab state={state} projectionData={projectionData} afterProjectionData={afterProjectionData} afterState={afterState} scenario={scenario} setState={setState} setAfterState={setAfterState} />}
        {tab === "personal" && <PersonalTab state={state} setState={setState} />}
        {tab === "income" && <IncomeTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "assets" && <AssetsTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "expenses" && <ExpensesTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "liabilities" && <LiabilitiesTab state={activeState} setState={setActiveState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} afterState={afterState} />}
        {tab === "projections" && <ProjectionsTab state={state} setState={setState} projectionData={projectionData} afterProjectionData={afterProjectionData} scenario={scenario} afterState={afterState} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} />}
        {tab === "monte_carlo" && <MonteCarloTab state={state} afterState={afterState} scenario={scenario} onActivateAfter={activateAfter} onActivateNow={activateNow} onResetAfter={resetAfter} />}
        {tab === "tax_rates" && <TaxTab state={state} setState={setState} />}
        {tab === "returns" && <ReturnsTab state={state} setState={setState} />}
        {tab === "settings" && <SettingsTab theme={theme} setTheme={setTheme} />}
      </div>

      {/* AI Financial Literacy Assistant */}
      <FinancialAssistant tab={tab} />
    </div>
  );
}
