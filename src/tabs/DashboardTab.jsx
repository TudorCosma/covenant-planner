import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function DashboardTab({ state: nowState, projectionData: nowProjectionData, afterProjectionData, afterState, scenario, setState: setNowState, setAfterState }) {
  // Display the scenario the user is currently editing — Now or After Advice.
  // The Value of Advice card below still compares Now vs After explicitly via nowState/nowProjectionData.
  const state = scenario === "after" && afterState ? afterState : nowState;
  const projectionData = scenario === "after" && afterProjectionData ? afterProjectionData : nowProjectionData;
  const setState = scenario === "after" && afterState ? setAfterState : setNowState;
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
  // Single-person scenarios exclude any P2-keyed account so stale couple-mode balances don't leak.
  const includeAcc = (k) => isCouple || !k.startsWith("p2");
  const sumAccounts = (obj) => Object.entries(obj).reduce((s, [k, a]) => s + (includeAcc(k) ? (a?.balance || 0) : 0), 0);
  const totalAssets = sumAccounts(assets.superAccounts) + sumAccounts(assets.nonSuper);
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
    { name: "Super", value: sumAccounts(assets.superAccounts) },
    { name: "Non-Super", value: sumAccounts(assets.nonSuper) },
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
    // Always compare the actual Now baseline vs After Advice, regardless of which scenario is being viewed.
    const now = nowState;
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
    // Super changes — skip P2 accounts entirely when scenario is single-person
    const superKeys = now.personal.isCouple ? ["p1Super","p1Pension","p2Super","p2Pension"] : ["p1Super","p1Pension"];
    superKeys.forEach(k => {
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

    // Build VoA metrics — use the actual Now baseline projection, not the active scenario.
    const lastNow = nowProjectionData[nowProjectionData.length - 1];
    const lastAfter = afterProjectionData[afterProjectionData.length - 1];
    const assetsDiff = (lastAfter?.netInvestmentAssets || 0) - (lastNow?.netInvestmentAssets || 0);
    const taxN = nowProjectionData.reduce((s, r) => s + (r.totalTax || 0) + (r.totalSuperTax || 0), 0);
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
        // Backward-compat: older saves may be missing newer legislation fields
        // (e.g. minPensionDrawdownRates, earliestSuperAccessAge added April 2026).
        // Merge each saved state with current defaults so projections always have the
        // full SIS Reg 1.06(9A) schedule and access-age gate.
        const mergeLegislation = (loaded) => ({
          ...loaded,
          legislation: {
            ...loaded.legislation,
            superParams: { ...DEFAULT_SUPER_PARAMS, ...(loaded.legislation?.superParams || {}) },
            centrelink: { ...DEFAULT_CENTRELINK, ...(loaded.legislation?.centrelink || {}) },
            medicare: { ...DEFAULT_MEDICARE, ...(loaded.legislation?.medicare || {}) },
          },
        });
        // Always write the Now portion to the Now baseline (not the scenario-routed setter),
        // otherwise loading while viewing After would write json.now into afterState.
        setNowState(mergeLegislation(json.now));
        if (json.after && setAfterState) {
          setAfterState(mergeLegislation(json.after));
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

        // After data exists — compute metrics. Always compare the actual Now baseline vs After,
        // regardless of which scenario the user is currently viewing.
        const nowLast = nowProjectionData[nowProjectionData.length - 1];
        const afterLast = afterProjectionData[afterProjectionData.length - 1];
        const nowTax = nowProjectionData.reduce((s, r) => s + (r.totalTax || 0) + (r.totalSuperTax || 0), 0);
        const afterTax = afterProjectionData.reduce((s, r) => s + (r.totalTax || 0) + (r.totalSuperTax || 0), 0);
        const taxSaved = nowTax - afterTax;
        const assetsDiff = (afterLast?.netInvestmentAssets || 0) - (nowLast?.netInvestmentAssets || 0);
        const nowDebtStart = nowProjectionData[0]?.totalDebtRemaining || 0;
        const afterDebtStart = afterProjectionData[0]?.totalDebtRemaining || 0;
        const nowDebtPayoff = nowDebtStart > 0 ? nowProjectionData.findIndex(r => r.totalDebtRemaining < Math.max(1, nowDebtStart * 0.01)) : -1;
        const afterDebtPayoff = afterDebtStart > 0 ? afterProjectionData.findIndex(r => r.totalDebtRemaining < Math.max(1, afterDebtStart * 0.01)) : -1;
        const debtYearsSaved = nowDebtPayoff > 0 && afterDebtPayoff > 0 ? Math.max(0, nowDebtPayoff - afterDebtPayoff) : 0;
        const nowDebtInterest = nowProjectionData.reduce((s, r) => s + (r.liabilityPayments || 0), 0) - (nowProjectionData[0]?.totalDebtRemaining || 0);
        const afterDebtInterest = afterProjectionData.reduce((s, r) => s + (r.liabilityPayments || 0), 0) - (afterProjectionData[0]?.totalDebtRemaining || 0);
        const interestSaved = Math.max(0, nowDebtInterest - afterDebtInterest);
        const calcStateFees = (stateData, stateObj) => {
          if (!stateObj) return 0;
          const sa = stateObj.assets?.superAccounts || {};
          const ns = stateObj.assets?.nonSuper || {};
          const costOf = (acc) => ((acc?.adminFee || 0) + (acc?.managementCost || 0) + (acc?.adviceCost || 0)) / 100;
          return stateData.reduce((s, r) => s + (r.p1Super || 0) * costOf(sa.p1Super) + (r.p2Super || 0) * costOf(sa.p2Super) + (r.p1NonSuper || 0) * costOf(ns.p1NonSuper) + (r.p2NonSuper || 0) * costOf(ns.p2NonSuper) + (r.jointNonSuper || 0) * costOf(ns.joint) + (r.p1NonSuper || 0) * costOf(ns.p1NonSuper2) + (r.p2NonSuper || 0) * costOf(ns.p2NonSuper2), 0);
        };
        const feesSaved = Math.max(0, calcStateFees(nowProjectionData, nowState) - calcStateFees(afterProjectionData, afterState));
        const nowTotalAgePension = nowProjectionData.reduce((s, r) => s + (r.agePension || 0), 0);
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
