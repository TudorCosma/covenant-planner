// Financial year (1 July → 30 June) that a date falls in. We label an FY by
// the calendar year its July falls in, e.g. 5 Sep 2025 → FY 2025, 3 Mar 2026
// → FY 2025.
function fyOf(date) {
  return date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
}

// Parse a "YYYY-MM-DD" string as a LOCAL calendar date. `new Date("YYYY-MM-DD")`
// parses as UTC, which in negative timezones shifts a 1-Jul date back to 30-Jun
// and misclassifies the financial year across the 1 July boundary.
function parseLocalDate(str) {
  const [y, m, d] = String(str).split("-").map(Number);
  if (!y || !m || !d) return new Date(str);
  return new Date(y, m - 1, d);
}

function getGiftDate(g, fallbackYear) {
  if (g.date) return parseLocalDate(g.date);
  return new Date((g.year || fallbackYear), 6, 1); // 1 July, local
}

// The $30k cap is a fixed rolling 5-financial-year figure in legislation,
// independent of the (user-editable) deprivation/assessment period.
const ROLLING_WINDOW_FYS = 5;

// ---------------------------------------------------------------------------
// Gift deprivation ledger (SSA 1991 s.1123–1130)
// ---------------------------------------------------------------------------
// Centrelink gifting is governed by TWO caps that must be applied together:
//   1. Annual cap: $10,000 of gifts per financial year is exempt.
//   2. Rolling cap: only $30,000 of gifts across any rolling 5-FY window is
//      exempt.
// The exemption is decided AT THE TIME EACH GIFT IS MADE, processed in date
// order, and consumed from BOTH pools. The crucial consequence (and the bug
// this fixes): once the rolling $30k pool is exhausted, EVERY later gift is
// fully deprived — even gifts under $10k/yr — until each gift's own 5-year
// clock expires. The old per-gift `max(0, amount - 10000)` ignored the
// rolling pool, so a $10,500 gift made after the cap was already breached was
// wrongly shown as only $500 deprived instead of the full $10,500.
//
// Returns an array parallel to `gifts` (input order preserved) where each
// entry is:
//   { deprivedAtGrant, exempt, amount, date, fy, expiryDate }
// `deprivedAtGrant` is locked in when the gift is made and stays assessed
// until `expiryDate`.
export function computeGiftLedger(gifts, params, fallbackYear) {
  const cl = params || {};
  const freePerYear = cl.giftingFreeAreaPerYear || 10000;
  const freeOverWindow = cl.giftingFreeAreaFiveYear || 30000;
  const deprivationYears = cl.giftingDeprivationPeriod || 5;
  const list = gifts || [];

  // Decorate with date + original index, then sort chronologically so the
  // pools are consumed in the order the gifts were actually made.
  const decorated = list.map((g, idx) => {
    const date = getGiftDate(g, fallbackYear);
    return { g, idx, date, amount: g.amount || 0, fy: fyOf(date) };
  });
  decorated.sort((a, b) => a.date - b.date || a.idx - b.idx);

  const exemptByFY = {};            // exemption granted per FY (for both caps)
  const result = new Array(list.length);

  for (const item of decorated) {
    const { amount, fy } = item;

    // Annual room left this FY.
    const annualRoom = Math.max(0, freePerYear - (exemptByFY[fy] || 0));

    // Rolling-window room: sum exemption already granted in the fixed 5-FY
    // window ending at this gift's FY, i.e. [fy - 4 .. fy].
    let windowUsed = 0;
    for (let f = fy - (ROLLING_WINDOW_FYS - 1); f <= fy; f++) {
      windowUsed += exemptByFY[f] || 0;
    }
    const rollingRoom = Math.max(0, freeOverWindow - windowUsed);

    const exempt = Math.max(0, Math.min(amount, annualRoom, rollingRoom));
    const deprivedAtGrant = Math.max(0, amount - exempt);
    exemptByFY[fy] = (exemptByFY[fy] || 0) + exempt;

    const expiryDate = new Date(item.date);
    expiryDate.setFullYear(expiryDate.getFullYear() + deprivationYears);

    result[item.idx] = {
      amount,
      date: item.date,
      fy,
      exempt,
      deprivedAtGrant,
      expiryDate,
    };
  }

  return result;
}

export function calcDeprivedAssets(gifts, projectionYear, params) {
  if (!gifts || !gifts.length) return 0;
  const ledger = computeGiftLedger(gifts, params, projectionYear);

  // Assessment date — start of the projection year's FY. A gift's deprived
  // amount is assessed until its individual 5-year clock expires.
  const assessDate = new Date(`${projectionYear}-07-01`);

  let totalDeprived = 0;
  for (const entry of ledger) {
    if (!entry) continue;
    if (assessDate >= entry.expiryDate) continue; // expired — drops off
    totalDeprived += entry.deprivedAtGrant;
  }
  return totalDeprived;
}

export function calcCentrelinkPension(financialAssets, deemedIncome, isCouple, isHomeowner, params, age1, age2, otherIncome, deprivedAssets) {
  const q = params.ageQualifyingAge || 67;

  // Determine who qualifies
  const p1Qualifies = age1 >= q;
  const p2Qualifies = isCouple && (age2 >= q);
  if (!p1Qualifies && !p2Qualifies) return 0;
  const numQualify = (p1Qualifies ? 1 : 0) + (p2Qualifies ? 1 : 0);

  // A member of a couple is means-tested on the household's COMBINED finances
  // under the couple thresholds + couple taper, even when only one partner has
  // reached qualifying age (SSA 1991 — partnered rate applies to each member).
  // The non-qualifying partner's super still in accumulation phase is excluded
  // upstream (not present in `financialAssets`) until they reach qualifying age,
  // so the combined assessable figure passed in is already correct.
  const maxPension = isCouple ? params.coupleMaxPension : params.singleMaxPension;
  const assetThreshold = isCouple
    ? (isHomeowner ? (params.coupleAssetThresholdHomeowner || 470000) : (params.coupleAssetThresholdNonHomeowner || 722000))
    : (isHomeowner ? (params.singleAssetThresholdHomeowner || 314000) : (params.singleAssetThresholdNonHomeowner || 566000));
  const incomeThreshold = isCouple ? (params.coupleIncomeThreshold || 9776) : (params.singleIncomeThreshold || 5512);

  // Check if already on full pension WITHOUT deprivation (gifts irrelevant if so)
  const excessAssetsBase = Math.max(0, financialAssets - assetThreshold);
  const assetReductionBase = excessAssetsBase * (params.assetTaperRate || 0.078);
  const totalIncome = deemedIncome + (otherIncome || 0);
  const excessIncomeBase = Math.max(0, totalIncome - incomeThreshold);
  const incomeReductionBase = excessIncomeBase * (params.incomeTaperRate || 0.50);
  const isAlreadyFullPension = Math.max(assetReductionBase, incomeReductionBase) === 0;

  // Only add deprived assets if NOT already on full pension
  const totalAssets = isAlreadyFullPension ? financialAssets : financialAssets + (deprivedAssets || 0);

  // Assets test (SSA 1991 s.1118)
  const excessAssets = Math.max(0, totalAssets - assetThreshold);
  const assetReduction = excessAssets * (params.assetTaperRate || 0.078);

  // Income test (SSA 1991 s.1067) — lower of both tests applies
  const excessIncome = Math.max(0, totalIncome - incomeThreshold);
  const incomeReduction = excessIncome * (params.incomeTaperRate || 0.50);

  // Household entitlement under the applicable (single or couple) rate.
  const householdPension = Math.max(0, maxPension - Math.max(assetReduction, incomeReduction));

  // When a couple has only one qualifying partner, that partner receives the
  // member-of-a-couple share — half the combined couple entitlement.
  if (isCouple && numQualify === 1) return householdPension / 2;
  return householdPension;
}

export function calcDeemedIncome(financialAssets, isCouple, params) {
  const threshold = isCouple ? params.deemingThresholdCouple : params.deemingThresholdSingle;
  const lower = Math.min(financialAssets, threshold);
  const upper = Math.max(0, financialAssets - threshold);
  return lower * params.deemingRateLower + upper * params.deemingRateUpper;
}
