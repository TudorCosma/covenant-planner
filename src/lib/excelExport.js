// Multi-sheet Excel (.xlsx) export for the Covenant Wealth Planner.
//
// Produces a real workbook (not a flat CSV) that a Certified Financial Planner
// can hand to a client or work in directly:
//   1. Summary           — headline outcomes + Value of Advice (Now vs After)
//   2. Assumptions       — every input that drives the projection
//   3. Projection (Now)  — full year-by-year cashflow table
//   4. Projection (After Advice) — same, only when an After scenario exists
//
// Every sheet leads with the educational-only disclaimer (compliance) and all
// dollar figures are in today's dollars (real terms), matching the rest of the app.
import * as XLSX from "xlsx";

const DISCLAIMER =
  "Educational tool only — not financial advice. All values in today's dollars (real terms). Estimates based on assumptions that will change over time.";

const CURRENT_YEAR = new Date().getFullYear();

// Apply a thousands-separator number format to every numeric cell so the
// workbook reads like a finance document rather than raw figures.
function formatNumbers(ws) {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "n") cell.z = "#,##0";
    }
  }
}

function autoWidth(aoa) {
  const widths = [];
  aoa.forEach((row) => {
    row.forEach((val, c) => {
      const len = val === null || val === undefined ? 0 : String(val).length;
      widths[c] = Math.max(widths[c] || 10, Math.min(len + 2, 46));
    });
  });
  return widths.map((w) => ({ wch: w }));
}

function makeSheet(aoa) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = autoWidth(aoa);
  formatNumbers(ws);
  return ws;
}

const round = (v) => (v === null || v === undefined || isNaN(v) ? "" : Math.round(v));

// ── Year-by-year projection table (mirrors the on-screen detail view) ──────────
function projectionAoA(state, data) {
  const isCouple = state?.personal?.isCouple;
  const n1 = state?.personal?.person1?.name || "Person 1";
  const n2 = state?.personal?.person2?.name || "Person 2";

  const headers = ["Year", "Age", `${n1} Salary`];
  if (isCouple) headers.push(`${n2} Salary`);
  headers.push(
    "Investment Returns",
    "Super Drawdown",
    "Age Pension",
    "Other Income",
    "Total Income",
    "Lifestyle Expenses",
    "Recurring Expenses",
    "One-off Expenses",
    "Loan Payments",
    "Total Expenses",
    "Income Tax",
    "Medicare",
    "Super Tax",
    "LITO",
    "SAPTO",
    "Div293",
    "Total Tax",
    "Debt Remaining",
    "Surplus / (Deficit)",
    "Cash Buffer",
    "Super Balance",
    "Non-Super Balance",
    "Net Assets",
  );

  const rows = (data || []).map((r) => {
    const otherInc =
      (r.p1Dividends || 0) + (r.p2Dividends || 0) +
      (r.p1RentalInc || 0) + (r.p2RentalInc || 0) +
      (r.p1OtherTaxable || 0) + (r.p2OtherTaxable || 0) +
      (r.p1TaxFreeInc || 0) + (r.p2TaxFreeInc || 0);
    const incTax = (r.p1IncomeTax || 0) + (isCouple ? r.p2IncomeTax || 0 : 0);
    const medicare = (r.p1Medicare || 0) + (isCouple ? r.p2Medicare || 0 : 0);
    const lito = (r.p1LITO || 0) + (r.p2LITO || 0);
    const sapto = (r.p1SAPTO || 0) + (r.p2SAPTO || 0);
    const div293 = (r.p1Div293 || 0) + (r.p2Div293 || 0);

    const cols = [r.year, isCouple ? `${r.age1}/${r.age2}` : r.age1, round(r.p1Salary)];
    if (isCouple) cols.push(round(r.p2Salary));
    cols.push(
      round(r.investEarnings),
      round((r.p1PensionDraw || 0) + (r.p2PensionDraw || 0)),
      round(r.agePension),
      round(otherInc),
      round(r.totalIncome),
      round(r.lifestyleExpTotal || 0),
      round(r.recurringExpTotal || 0),
      round(r.futureExpTotal || 0),
      round(r.liabilityPayments || 0),
      round(r.totalExpenses),
      round(incTax),
      round(medicare),
      round(r.totalSuperTax || 0),
      round(lito),
      round(sapto),
      round(div293),
      round((r.totalTax || 0) + (r.totalSuperTax || 0)),
      round((r.totalDebtRemaining || 0) + (r.debtAccount || 0)),
      round(r.surplus),
      round(r.cashAccount || 0),
      round((r.p1Super || 0) + (r.p2Super || 0)),
      round((r.p1NonSuper || 0) + (r.p2NonSuper || 0) + (r.jointNonSuper || 0)),
      round(r.netAssets),
    );
    return cols;
  });

  return [[DISCLAIMER], [], headers, ...rows];
}

// ── Summary sheet ──────────────────────────────────────────────────────────────
function summaryAoA(nowState, afterState, nowData, afterData) {
  const p = nowState?.personal || {};
  const n1 = p.person1?.name || "Person 1";
  const n2 = p.person2?.name || "Person 2";
  const names = p.isCouple ? `${n1} & ${n2}` : n1;
  const hasAfter = !!(afterState && afterData && afterData.length);

  const lastNow = nowData?.[nowData.length - 1] || {};
  const lastAfter = afterData?.[afterData.length - 1] || {};

  const sumTax = (data) =>
    (data || []).reduce((s, r) => s + (r.totalTax || 0) + (r.totalSuperTax || 0), 0);

  // First year investment assets are exhausted (money "runs out"), if at all.
  const depletionAge = (data, state) => {
    const isCouple = state?.personal?.isCouple;
    const row = (data || []).find((r) => (r.netInvestmentAssets || 0) <= 0);
    if (!row) return "Not within plan";
    return isCouple ? `${row.age1}/${row.age2}` : row.age1;
  };

  const aoa = [
    [DISCLAIMER],
    [],
    ["COVENANT WEALTH — FINANCIAL PLAN SUMMARY"],
    ["Prepared", new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })],
    ["Prepared for", names],
    ["Household", p.isCouple ? "Couple" : "Single"],
    [],
    ["HEADLINE OUTCOMES (today's dollars)"],
  ];

  const header = ["Measure", "Now"];
  if (hasAfter) header.push("After Advice", "Difference");
  aoa.push(header);

  const pushRow = (label, nowVal, afterVal) => {
    const row = [label, round(nowVal)];
    if (hasAfter) {
      row.push(round(afterVal), round((afterVal || 0) - (nowVal || 0)));
    }
    aoa.push(row);
  };

  pushRow("Net assets at end of plan", lastNow.netAssets, lastAfter.netAssets);
  pushRow("Net investment assets at end of plan", lastNow.netInvestmentAssets, lastAfter.netInvestmentAssets);

  const taxNow = sumTax(nowData);
  const taxAfter = sumTax(afterData);
  const taxRow = ["Total tax paid over plan", round(taxNow)];
  if (hasAfter) {
    taxRow.push(round(taxAfter), round(taxNow - taxAfter)); // positive = tax saved
  }
  aoa.push(taxRow);

  const depRow = ["Investment assets depleted (age)", depletionAge(nowData, nowState)];
  if (hasAfter) depRow.push(depletionAge(afterData, afterState), "");
  aoa.push(depRow);

  if (hasAfter) {
    aoa.push([]);
    aoa.push(["VALUE OF ADVICE (After Advice vs Now)"]);
    aoa.push([
      "Projected extra investment assets at end",
      round((lastAfter.netInvestmentAssets || 0) - (lastNow.netInvestmentAssets || 0)),
    ]);
    aoa.push(["Estimated lifetime tax saved", round(taxNow - taxAfter)]);
  }

  aoa.push([]);
  aoa.push([
    "Note",
    hasAfter
      ? "Difference = After Advice minus Now (for tax, a positive number is tax saved)."
      : "Create an 'After Advice' scenario in the app to see a side-by-side comparison here.",
  ]);

  return aoa;
}

// ── Assumptions sheet ───────────────────────────────────────────────────────────
function assumptionsAoA(state) {
  const p = state?.personal || {};
  const a = state?.assets || {};
  const cf = state?.cashflowRules || {};
  const n1 = p.person1?.name || "Person 1";
  const n2 = p.person2?.name || "Person 2";
  const isCouple = p.isCouple;
  const ageOf = (person) => (person?.birthYear ? CURRENT_YEAR - person.birthYear : "");

  const aoa = [
    [DISCLAIMER],
    [],
    ["PLAN ASSUMPTIONS"],
    ["Household", isCouple ? "Couple" : "Single"],
    ["Homeowner", p.isHomeowner ? "Yes" : "No"],
    ["Private health cover", p.hasPrivateHealth ? "Yes" : "No"],
    ["Inflation rate (CPI)", `${p.inflationRate ?? ""}%`],
    ["Salary growth", `${p.salaryGrowth ?? ""}%`],
    ["Projection length (years)", p.projectionYears ?? ""],
    ["Legislation financial year", state?.legislationFY ?? ""],
    [],
    ["PEOPLE", "Age now", "Retirement age", "Life expectancy", "Gender"],
    [n1, ageOf(p.person1), p.person1?.retirementAge ?? "", p.person1?.lifeExpectancy ?? "", p.person1?.gender ?? ""],
  ];
  if (isCouple) {
    aoa.push([n2, ageOf(p.person2), p.person2?.retirementAge ?? "", p.person2?.lifeExpectancy ?? "", p.person2?.gender ?? ""]);
  }

  aoa.push([]);
  aoa.push(["SUPER ACCOUNTS", "Balance", "Profile", "Type", "Drawdown %"]);
  const sa = a.superAccounts || {};
  const superRows = [
    [`${n1} Super`, sa.p1Super],
    [`${n1} Pension`, sa.p1Pension],
  ];
  if (isCouple) {
    superRows.push([`${n2} Super`, sa.p2Super], [`${n2} Pension`, sa.p2Pension]);
  }
  superRows.forEach(([label, acc]) => {
    if (!acc) return;
    if ((acc.balance || 0) <= 0 && acc.type === "pension") return; // hide empty legacy pension slots
    aoa.push([label, round(acc.balance), acc.profile ?? "", acc.type ?? "", acc.drawdownPct ?? ""]);
  });

  aoa.push([]);
  aoa.push(["NON-SUPER INVESTMENTS", "Balance", "Profile", "Owner"]);
  const ns = a.nonSuper || {};
  const nsRows = [
    [`${n1} Non-Super`, ns.p1NonSuper],
  ];
  if (isCouple) nsRows.push([`${n2} Non-Super`, ns.p2NonSuper]);
  nsRows.push(["Joint", ns.joint]);
  nsRows.forEach(([label, acc]) => {
    if (!acc || (acc.balance || 0) <= 0) return;
    aoa.push([label, round(acc.balance), acc.profile ?? "", acc.owner ?? ""]);
  });

  // Lifestyle assets (home etc.) + loans
  const lifestyle = (a.lifestyleAssets || []).filter((x) => (x.value || 0) > 0);
  if (lifestyle.length) {
    aoa.push([]);
    aoa.push(["LIFESTYLE ASSETS", "Value", "Growth %", "Primary residence"]);
    lifestyle.forEach((x) =>
      aoa.push([x.description || "Asset", round(x.value), x.growth ?? "", x.isPrimaryResidence ? "Yes" : "No"]),
    );
  }
  const loans = (a.loans || []).filter((l) => (l.balance || 0) > 0);
  if (loans.length) {
    aoa.push([]);
    aoa.push(["LOANS", "Balance", "Rate %", "Type"]);
    loans.forEach((l) => aoa.push([l.description || "Loan", round(l.balance), l.rate ?? "", l.type ?? ""]));
  }

  aoa.push([]);
  aoa.push(["CASHFLOW RULES"]);
  aoa.push(["Surplus goes to", cf.surplusDestination ?? ""]);
  aoa.push(["Shortfall drawn from (in order)", [cf.deficitStep1, cf.deficitStep2, cf.deficitStep3].filter(Boolean).join(" → ")]);

  return aoa;
}

/**
 * Build (but do not download) the multi-sheet workbook for the current plan.
 * Separated from the download wrapper so it can be unit-tested without disk IO.
 * @param {object} args
 * @param {object} args.nowState           — the "Now" plan state
 * @param {object|null} args.afterState    — the "After Advice" plan state (or null)
 * @param {Array} args.nowProjectionData   — year rows for Now
 * @param {Array} args.afterProjectionData — year rows for After Advice (may be empty)
 * @returns {object} a SheetJS workbook
 */
export function buildPlanWorkbook({ nowState, afterState, nowProjectionData, afterProjectionData }) {
  const wb = XLSX.utils.book_new();
  const hasAfter = !!(afterState && afterProjectionData && afterProjectionData.length);

  XLSX.utils.book_append_sheet(
    wb,
    makeSheet(summaryAoA(nowState, afterState, nowProjectionData, afterProjectionData)),
    "Summary",
  );
  XLSX.utils.book_append_sheet(wb, makeSheet(assumptionsAoA(nowState)), "Assumptions");
  XLSX.utils.book_append_sheet(wb, makeSheet(projectionAoA(nowState, nowProjectionData)), "Projection (Now)");
  if (hasAfter) {
    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(projectionAoA(afterState, afterProjectionData)),
      "Projection (After Advice)",
    );
  }
  return wb;
}

/**
 * Build and download a multi-sheet .xlsx workbook for the current plan.
 * @param {object} args — see {@link buildPlanWorkbook}
 */
export function exportPlanToExcel({ nowState, afterState, nowProjectionData, afterProjectionData }) {
  const wb = buildPlanWorkbook({ nowState, afterState, nowProjectionData, afterProjectionData });
  const who = (nowState?.personal?.person1?.name || "plan").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `covenant-plan-${who}-${stamp}.xlsx`);
}
