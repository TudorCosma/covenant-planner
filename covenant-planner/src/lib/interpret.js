// Facts + Lever-Nudge layer — every key projection number paired with a neutral
// statement of fact. NEVER tells the user what to do; only states facts and
// (when below goal) points at which inputs IN THIS APP tend to move the bar.
// This implements the "shape of an allowed nudge" template from V2_DESIGN.md.

const fmtMoney = (n) => `$${Math.round(n || 0).toLocaleString()}`;

// Find the first age where total invested + cash is effectively zero (< $5k).
export function findRuinAge(data) {
  if (!data || data.length === 0) return null;
  for (const row of data) {
    const total = (row.totalInvested ?? row.netInvestmentAssets ?? row.netAssets ?? 0);
    if (total < 5000 && row.age1 > 60) return row.age1;
  }
  return null;
}

// Average retirement-phase income across all years where person1 age >= retirementAge.
export function avgRetirementIncome(data, state) {
  if (!data || data.length === 0) return 0;
  const retAge = state?.personal?.person1?.retirementAge || 65;
  const retYears = data.filter(r => r.age1 >= retAge);
  if (retYears.length === 0) return 0;
  const totals = retYears.map(r => {
    const drawdown = (r.p1SuperDraw || 0) + (r.p2SuperDraw || 0) + (r.p1PensionDraw || 0) + (r.p2PensionDraw || 0);
    const pension  = r.agePensionTotal || r.agePension || 0;
    const other    = (r.nonSuperIncome || 0) + (r.rentalIncome || 0) + (r.otherTaxFree || 0);
    return drawdown + pension + other;
  });
  return totals.reduce((s, x) => s + x, 0) / totals.length;
}

// Projected balance across given keys in a given calendar year (today's $).
export function projectedBalanceInYear(data, year, keys) {
  const row = data.find(r => r.year === year) || data[data.length - 1];
  if (!row) return 0;
  return keys.reduce((s, k) => s + (row[k] || 0), 0);
}

// ---- Lever libraries -----------------------------------------------------
// Generic, education-grade — never personal-advice. Same shape per KPI.

const LEVERS = {
  longevity: [
    { label: "Working longer or semi-retiring",       principle: "delays drawing on savings and adds contributions — usually the highest-leverage single change" },
    { label: "Reducing regular ongoing expenses",     principle: "compounds over decades — typically more impact than cutting one-off expenses" },
    { label: "Reviewing your savings/investment mix", principle: "small return differences compound into large dollar differences over 20–30 years" },
    { label: "Adjusting the goal itself",             principle: "the goal you set might not be the one that matters to you most" },
  ],
  retirementIncome: [
    { label: "Adding to super while working",          principle: "concessional contributions reduce tax now and compound inside super" },
    { label: "Working longer or part-time",            principle: "extra working years stretch retirement income on both sides" },
    { label: "Reducing planned retirement expenses",   principle: "every $1 less spent in retirement is roughly $20 less needed in capital" },
    { label: "Reviewing your investment mix",          principle: "higher-growth allocations have larger drawdowns but more income over long horizons" },
  ],
  tax: [
    { label: "Concessional super contributions",       principle: "swap marginal-rate tax for 15% contributions tax inside super" },
    { label: "Moving accumulation super to pension phase at retirement", principle: "earnings in pension phase are tax-free" },
    { label: "Reviewing imputation credits",           principle: "Australian shares can refund franking credits in low-tax environments" },
  ],
  cashflow: [
    { label: "Phasing retirement expenses (go-go / slow-go / no-go)", principle: "spending usually falls in later retirement years" },
    { label: "Reducing or delaying one-off costs",     principle: "moves the deficit gap later, giving capital more time to compound" },
    { label: "Adjusting timing of large purchases",    principle: "concentration of one-offs is what creates the gap, not the totals" },
  ],
};

const DISCLAIMER = `Educational information about how to use this tool — not personal financial advice. A planner who knows your full situation can help you decide which (if any) of these makes sense for you. Nothing beats a good second opinion.`;

// Each interpreter returns:
//   { ok: bool, fact: string, levers?: [{label, principle}], disclaimer?: string }
// ok=true means the projection meets/exceeds whatever the relevant goal is —
// no lever-nudge needed.

export function interpretLongevity(data, state) {
  const goalAge = state.personal?.person1?.lifeExpectancy || 90;
  const ruin = findRuinAge(data);
  if (!ruin) {
    const lastAge = data[data.length - 1]?.age1 || goalAge;
    return { ok: true, fact: `Based on your selections, savings last the full plan (to age ${lastAge}).` };
  }
  if (ruin >= goalAge) {
    return { ok: true, fact: `Based on your selections, savings last to age ${ruin}, meeting your goal of ${goalAge}.` };
  }
  return {
    ok: false,
    fact: `Based on your selections, savings last to age ${ruin} vs your goal of ${goalAge}.`,
    levers: LEVERS.longevity,
    disclaimer: DISCLAIMER,
  };
}

export function interpretRetirementIncome(data, state) {
  const goal = state.goals?.find(g => g.kind === "retirement")?.targetRetirementIncome;
  const avg = avgRetirementIncome(data, state);
  if (!goal) {
    return { ok: true, fact: `Average retirement income in plan: ${fmtMoney(avg)}/yr.` };
  }
  if (avg >= goal) {
    return { ok: true, fact: `Plan delivers avg ${fmtMoney(avg)}/yr, meeting your goal of ${fmtMoney(goal)}/yr.` };
  }
  return {
    ok: false,
    fact: `Plan delivers avg ${fmtMoney(avg)}/yr vs your goal of ${fmtMoney(goal)}/yr.`,
    levers: LEVERS.retirementIncome,
    disclaimer: DISCLAIMER,
  };
}

export function interpretTax(data /*, state*/) {
  const totalTax = (data || []).reduce((s, r) => s + (r.totalTax || r.incomeTax || 0), 0);
  return { ok: true, fact: `Total tax paid across the plan: ${fmtMoney(totalTax)}.` };
}

export function interpretPension(data /*, state*/) {
  const firstPensionRow = (data || []).find(r => (r.agePensionTotal || r.agePension || 0) > 0);
  if (!firstPensionRow) return { ok: true, fact: `Plan does not draw age pension within the projection horizon.` };
  const total = (data || []).reduce((s, r) => s + (r.agePensionTotal || r.agePension || 0), 0);
  return { ok: true, fact: `Plan begins drawing age pension at age ${firstPensionRow.age1}. Total over plan: ${fmtMoney(total)}.` };
}
