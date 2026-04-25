import { fmt } from './format';

// Build a rich diagnostic of the first deficit year so the user knows where to start fixing
// the problem. Returns null when the projection has no deficit years. Shared by ProjectionsTab
// (full warning modal) and DashboardTab (clickable warning badges on cards/charts).
export function buildDeficitInfo(data, state) {
  if (!data || data.length === 0) return null;
  const deficitRows = data.filter(r => (r.surplus || 0) < 0);
  if (deficitRows.length === 0) return null;
  const first = deficitRows[0];
  const firstIdx = data.indexOf(first);
  const prev = firstIdx > 0 ? data[firstIdx - 1] : null;

  let consecutive = 0;
  for (let i = firstIdx; i < data.length; i++) {
    if ((data[i].surplus || 0) < 0) consecutive++; else break;
  }

  const drivers = [];
  if (prev) {
    const drop1 = (prev.p1Salary || 0) - (first.p1Salary || 0);
    const drop2 = (prev.p2Salary || 0) - (first.p2Salary || 0);
    const dropPension = (prev.agePension || 0) - (first.agePension || 0);
    const dropDraws = ((prev.p1PensionDraw || 0) + (prev.p2PensionDraw || 0))
                   - ((first.p1PensionDraw || 0) + (first.p2PensionDraw || 0));
    if (drop1 > 1000) {
      const retAge = state.personal?.person1?.retirementAge;
      const reason = first.age1 >= (retAge || 0) && (prev.age1 < (retAge || 0)) ? ` (retires at age ${retAge})` : "";
      drivers.push({ label: `${state.personal?.person1?.name || "Person 1"} salary drops by ${fmt(drop1)}${reason}`, kind: "income" });
    }
    if (state.personal?.isCouple && drop2 > 1000) {
      const retAge = state.personal?.person2?.retirementAge;
      const reason = first.age2 >= (retAge || 0) && (prev.age2 < (retAge || 0)) ? ` (retires at age ${retAge})` : "";
      drivers.push({ label: `${state.personal?.person2?.name || "Person 2"} salary drops by ${fmt(drop2)}${reason}`, kind: "income" });
    }
    if (dropPension > 1000) drivers.push({ label: `Age Pension drops by ${fmt(dropPension)}`, kind: "income" });
    if (dropDraws > 1000) drivers.push({ label: `Super pension drawdown drops by ${fmt(dropDraws)}`, kind: "income" });
  }

  const yr = first.year;
  const expDrivers = [];
  (state.expenses?.lifestyleExpenses || []).forEach(e => {
    if (e.startYear === yr) expDrivers.push(`Lifestyle phase "${e.description}" begins (${fmt(e.amount)}/yr)`);
  });
  (state.expenses?.baseExpenses || []).forEach(e => {
    if (e.startYear === yr) expDrivers.push(`Recurring expense "${e.description}" begins (${fmt(e.amount)}/yr)`);
  });
  (state.expenses?.futureExpenses || []).forEach(e => {
    if (yr >= (e.startYear || 0) && yr <= (e.endYear || 0)) {
      expDrivers.push(`One-off expense "${e.description}" hits this year (${fmt(e.amount)})`);
    }
  });
  if (prev && (first.liabilityPayments || 0) - (prev.liabilityPayments || 0) > 2000) {
    expDrivers.push(`Loan repayments increase by ${fmt((first.liabilityPayments||0) - (prev.liabilityPayments||0))} this year`);
  }
  expDrivers.forEach(label => drivers.push({ label, kind: "expense" }));

  return { count: deficitRows.length, consecutive, first, drivers };
}
