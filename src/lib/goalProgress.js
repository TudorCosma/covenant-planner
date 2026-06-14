// Goal Progress — neutral % progress against the user's own stated goals.
// No composite "readiness score". No recommendation. One bar per goal.
//
// Each goal in state.goals is { id, kind, label, ... }. The `kind` field
// dispatches to a calculator below. Adding a new goal type = add a kind +
// add a calculator + add a wizard sub-form. That's it.
//
// Every calculator returns { pct: 0..1+, actual, goal, summary } where
// `summary` is the one-line plain-English fact rendered next to the bar.
// pct may exceed 1 (cap at 1 in the UI for the bar fill, but pass it through
// so callers can choose to show "120%").

import { findRuinAge, avgRetirementIncome, projectedBalanceInYear } from "./interpret";

const safeNum = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);

// ---- per-kind calculators ------------------------------------------------

function progressRetirement(goal, projectionData, state) {
  const sub = [];
  // a) retirement age — lower (earlier) actual vs goal = better. pct = goal/actual.
  const goalAge = safeNum(goal.targetRetirementAge?.p1, 65);
  const actualAge = safeNum(state.personal?.person1?.retirementAge, goalAge);
  sub.push({
    id: "retAge",
    label: `Retire by age ${goalAge}`,
    pct: actualAge > 0 ? Math.min(1, goalAge / actualAge) : 1,
    summary: actualAge <= goalAge
      ? `Plan retires at age ${actualAge} ✓`
      : `Plan retires at age ${actualAge}`,
    achieved: actualAge <= goalAge,
  });
  // b) retirement income vs target (today's $)
  if (goal.targetRetirementIncome) {
    const avg = safeNum(avgRetirementIncome(projectionData, state), 0);
    const goalInc = goal.targetRetirementIncome;
    sub.push({
      id: "retInc",
      label: `Retirement income of $${goalInc.toLocaleString()}/yr`,
      pct: goalInc > 0 ? avg / goalInc : 1,
      summary: avg >= goalInc
        ? `Plan delivers avg $${Math.round(avg).toLocaleString()}/yr ✓`
        : `Plan delivers avg $${Math.round(avg).toLocaleString()}/yr`,
      achieved: avg >= goalInc,
    });
  }
  // c) longevity vs target last-until age
  if (goal.targetLastUntilAge) {
    const ruin = findRuinAge(projectionData);
    const lastAge = ruin || projectionData[projectionData.length - 1]?.age1 || 0;
    const goalLast = goal.targetLastUntilAge;
    sub.push({
      id: "longevity",
      label: `Savings last to age ${goalLast}`,
      pct: goalLast > 0 ? Math.min(1.2, lastAge / goalLast) : 1,
      summary: lastAge >= goalLast
        ? `Plan lasts to age ${lastAge} ✓`
        : `Plan runs out at age ${lastAge}`,
      achieved: lastAge >= goalLast,
    });
  }
  // overall pct = average of sub-bars
  const pct = sub.length ? sub.reduce((s, x) => s + Math.min(1, x.pct), 0) / sub.length : 0;
  return { pct, sub };
}

function progressHouse(goal, projectionData, state) {
  // Deposit target by a given year. Estimate funds available = non-super liquid by that year.
  const goalYear = goal.targetYear || (new Date().getFullYear() + 5);
  const goalAmt = goal.targetDeposit || 0;
  const balance = projectedBalanceInYear(projectionData, goalYear, ["p1NonSuper", "p2NonSuper", "jointNonSuper"]);
  const pct = goalAmt > 0 ? balance / goalAmt : 1;
  return {
    pct,
    summary: balance >= goalAmt
      ? `On track for $${Math.round(balance).toLocaleString()} by ${goalYear} ✓`
      : `On track for $${Math.round(balance).toLocaleString()} by ${goalYear}`,
    achieved: balance >= goalAmt,
  };
}

function progressLumpsum(goal, projectionData, state) {
  // Generic "have $X by age Y" — sabbatical, big purchase, education etc.
  const targetAge = goal.targetAge || (safeNum(state.personal?.person1?.retirementAge, 65));
  const startYear = new Date().getFullYear();
  const currentAge = safeNum(state.personal?.person1?.birthYear, 1973);
  const goalYear = startYear + (targetAge - (startYear - currentAge));
  const goalAmt = goal.targetCost || goal.targetAmount || 0;
  const balance = projectedBalanceInYear(projectionData, goalYear, ["p1NonSuper", "p2NonSuper", "jointNonSuper"]);
  const pct = goalAmt > 0 ? balance / goalAmt : 1;
  return {
    pct,
    summary: balance >= goalAmt
      ? `Funded — $${Math.round(balance).toLocaleString()} available by age ${targetAge} ✓`
      : `Tracks $${Math.round(balance).toLocaleString()} vs $${goalAmt.toLocaleString()} needed`,
    achieved: balance >= goalAmt,
  };
}

function progressDebtFree(goal, projectionData, state) {
  // "Pay off all debt by year/age Y". Look at total loan balance in target year.
  const targetYear = goal.targetYear || (new Date().getFullYear() + 10);
  const row = projectionData.find(r => r.year === targetYear);
  const debt = safeNum(row?.totalDebtRemaining ?? row?.totalLiabilities ?? 0, 0);
  const initialDebt = safeNum(state.assets?.loans?.reduce((s, l) => s + (l.balance || 0), 0), 1);
  const paidDown = Math.max(0, initialDebt - debt);
  const pct = initialDebt > 0 ? paidDown / initialDebt : 1;
  return {
    pct,
    summary: debt <= 0
      ? `Debt-free by ${targetYear} ✓`
      : `Approx $${Math.round(debt).toLocaleString()} debt remaining by ${targetYear}`,
    achieved: debt <= 0,
  };
}

function progressCustom(goal /*, projectionData, state */) {
  // Custom goals have no calculator — user tracks them manually.
  return {
    pct: 0,
    summary: `Tracked manually — edit on the Goals tab`,
    achieved: false,
    manual: true,
  };
}

const CALCULATORS = {
  retirement: progressRetirement,
  house:      progressHouse,
  sabbatical: progressLumpsum,
  education:  progressLumpsum,
  travel:     progressLumpsum,
  purchase:   progressLumpsum,
  debt:       progressDebtFree,
  custom:     progressCustom,
};

// ---- public API ----------------------------------------------------------

export function computeGoalProgress(projectionData, state) {
  const goals = Array.isArray(state.goals) ? state.goals : [];
  if (!projectionData || projectionData.length === 0) return [];
  return goals.map(g => {
    const calc = CALCULATORS[g.kind] || progressCustom;
    const result = calc(g, projectionData, state);
    return { goal: g, ...result };
  });
}

// Goal-kind metadata for the wizard's quick-pick chips and the Goals tab.
export const GOAL_KINDS = [
  { id: "retirement", label: "Retirement",        icon: "◉", needs: ["targetRetirementAge", "targetRetirementIncome", "targetLastUntilAge"] },
  { id: "house",      label: "Buy a house",       icon: "⌂", needs: ["targetYear", "targetDeposit"] },
  { id: "debt",       label: "Pay off debt",      icon: "▤", needs: ["targetYear"] },
  { id: "sabbatical", label: "Sabbatical",        icon: "☼", needs: ["targetAge", "targetCost"] },
  { id: "education",  label: "Kids' education",   icon: "✎", needs: ["targetYear", "targetCost"] },
  { id: "travel",     label: "Travel",            icon: "✈", needs: ["targetYear", "targetCost"] },
  { id: "purchase",   label: "Big purchase",      icon: "★", needs: ["targetYear", "targetCost"] },
  { id: "custom",     label: "Something else",    icon: "◌", needs: [] },
];

export function newGoal(kind, partial = {}) {
  const id = `g_${kind}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const base = { id, kind, label: "" };
  if (kind === "retirement") return { ...base, targetRetirementAge: { p1: 65, p2: 65 }, targetRetirementIncome: 80000, targetLastUntilAge: 90, label: "Retire at 65 with $80k/yr, last to 90", ...partial };
  if (kind === "house")      return { ...base, targetYear: new Date().getFullYear() + 5, targetDeposit: 200000, label: "Buy a house", ...partial };
  if (kind === "debt")       return { ...base, targetYear: new Date().getFullYear() + 10, label: "Pay off debt", ...partial };
  if (kind === "sabbatical") return { ...base, targetAge: 50, targetCost: 80000, label: "Take a year off", ...partial };
  if (kind === "education")  return { ...base, targetYear: new Date().getFullYear() + 10, targetCost: 150000, label: "Kids' education", ...partial };
  if (kind === "travel")     return { ...base, targetYear: new Date().getFullYear() + 3, targetCost: 30000, label: "Travel goal", ...partial };
  if (kind === "purchase")   return { ...base, targetYear: new Date().getFullYear() + 5, targetCost: 50000, label: "Big purchase", ...partial };
  return { ...base, targetAmount: 0, label: "Custom goal", ...partial };
}
