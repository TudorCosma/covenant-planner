import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, ReferenceLine } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS, profileDisplayLabel } from "../data/returnProfiles";
import { Input, DateInput, FYInput, YearSelect, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant, DeficitWarningModal, DeficitWarningBadge } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection, buildDeficitInfo } from "../lib";
export function ProjectionsTab({ state: nowState, setState: setNowState, setAfterState, projectionData: nowProjectionData, afterProjectionData, scenario, afterState, onActivateAfter, onActivateNow, onResetAfter, setTab }) {
  const [view, setView] = useState("chart");
  const [showDetail, setShowDetail] = useState(false);
  const [popup, setPopup] = useState(null); // null | "salaryP1" | "salaryP2" | "expenses" | "super" | "nonSuper" | "income"
  // Display the scenario the user is currently editing — Now or After Advice.
  // Edits made in After mode go to afterState (so the After Advice scenario stays separate).
  const state = scenario === "after" && afterState ? afterState : nowState;
  const setState = scenario === "after" && afterState ? setAfterState : setNowState;
  // ---- Cashflow sustainability warning ----
  // Build a rich diagnostic of the first deficit year so the user knows where to
  // start fixing the problem. Shown once each time the user opens this tab.
  const deficitInfo = useMemo(() => {
    const data = scenario === "after" && afterProjectionData ? afterProjectionData : nowProjectionData;
    return buildDeficitInfo(data, state);
  }, [nowProjectionData, afterProjectionData, scenario, state]);
  const [showDeficitWarning, setShowDeficitWarning] = useState(!!deficitInfo);
  // Re-show the warning when the user switches scenario (Now <-> After) within the
  // same tab visit if the newly-active projection has deficit years that the user
  // hasn't yet seen flagged for that scenario.
  const lastWarnedScenario = useRef(deficitInfo ? scenario : null);
  useEffect(() => {
    if (deficitInfo && lastWarnedScenario.current !== scenario) {
      setShowDeficitWarning(true);
      lastWarnedScenario.current = scenario;
    }
  }, [scenario, deficitInfo]);
  const projectionData = scenario === "after" && afterProjectionData ? afterProjectionData : nowProjectionData;
  const isCouple = state.personal.isCouple;
  const n1 = state.personal.person1.name || "Person 1";
  const n2 = state.personal.person2.name || "Person 2";
  const { income, expenses, assets, personal, legislation } = state;

  const updIncP1 = (f, v) => setState(s => ({ ...s, income: { ...s.income, person1: { ...s.income.person1, [f]: v } } }));
  const updIncP2 = (f, v) => setState(s => ({ ...s, income: { ...s.income, person2: { ...s.income.person2, [f]: v } } }));
  const updExp = (f, v) => setState(s => ({ ...s, expenses: { ...s.expenses, [f]: v } }));

  const exportCSV = () => {
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const num = (v) => (v === null || v === undefined ? "" : Math.round(v));

    const headers = ["Year", "Age", `${n1} Salary`];
    if (isCouple) headers.push(`${n2} Salary`);
    if (showDetail) headers.push("Inv Returns");
    headers.push("Super Draw");
    headers.push("Age Pension");
    if (showDetail) headers.push("Other Inc");
    headers.push("Total Income");
    if (showDetail) {
      headers.push("Lifestyle Exp");
      headers.push("Recurring Exp");
      headers.push("One-off Exp");
      headers.push("Loan Payments");
    }
    headers.push("Total Expenses");
    if (showDetail) {
      headers.push("Income Tax");
      if (isCouple) headers.push("Medicare");
      headers.push("Super Tax");
      headers.push("LITO");
      if (isCouple) headers.push("SAPTO");
      headers.push("Div293");
    }
    headers.push("Total Tax");
    headers.push("Debt");
    headers.push("Surplus");
    headers.push("Cash Buffer");
    headers.push("Super Balance");
    headers.push("Non-Super Balance");
    headers.push("Net Assets");
    if (afterProjectionData) headers.push("Delta After Advice");

    const rows = projectionData.map((r, i) => {
      const otherInc = (r.p1Dividends || 0) + (r.p2Dividends || 0)
        + (r.p1RentalInc || 0) + (r.p2RentalInc || 0)
        + (r.p1OtherTaxable || 0) + (r.p2OtherTaxable || 0)
        + (r.p1TaxFreeInc || 0) + (r.p2TaxFreeInc || 0);
      const totalLITO = (r.p1LITO || 0) + (r.p2LITO || 0);
      const totalSAPTO = (r.p1SAPTO || 0) + (r.p2SAPTO || 0);
      const totalDiv293 = (r.p1Div293 || 0) + (r.p2Div293 || 0);
      const totalIncTax = (r.p1IncomeTax || 0) + (isCouple ? (r.p2IncomeTax || 0) : 0);
      const totalMedicare = (r.p1Medicare || 0) + (isCouple ? (r.p2Medicare || 0) : 0);
      const ar = afterProjectionData ? afterProjectionData[i] : null;
      const nr = nowProjectionData[i];
      const diff = (ar && nr) ? (ar.netInvestmentAssets - nr.netInvestmentAssets) : null;

      const cols = [
        r.year,
        isCouple ? `${r.age1}/${r.age2}` : r.age1,
        num(r.p1Salary),
      ];
      if (isCouple) cols.push(num(r.p2Salary));
      if (showDetail) cols.push(num(r.investEarnings));
      cols.push(num((r.p1PensionDraw || 0) + (r.p2PensionDraw || 0)));
      cols.push(num(r.agePension));
      if (showDetail) cols.push(num(otherInc));
      cols.push(num(r.totalIncome));
      if (showDetail) {
        cols.push(num(r.lifestyleExpTotal || 0));
        cols.push(num(r.recurringExpTotal || 0));
        cols.push(num(r.futureExpTotal || 0));
        cols.push(num(r.liabilityPayments || 0));
      }
      cols.push(num(r.totalExpenses));
      if (showDetail) {
        cols.push(num(totalIncTax));
        if (isCouple) cols.push(num(totalMedicare));
        cols.push(num(r.totalSuperTax || 0));
        cols.push(num(totalLITO));
        if (isCouple) cols.push(num(totalSAPTO));
        cols.push(num(totalDiv293));
      }
      cols.push(num((r.totalTax || 0) + (r.totalSuperTax || 0)));
      cols.push(num((r.totalDebtRemaining || 0) + (r.debtAccount || 0)));
      cols.push(num(r.surplus));
      cols.push(num(r.cashAccount || 0));
      cols.push(num((r.p1Super || 0) + (r.p2Super || 0)));
      cols.push(num((r.p1NonSuper || 0) + (r.p2NonSuper || 0) + (r.jointNonSuper || 0)));
      cols.push(num(r.netAssets));
      if (afterProjectionData) cols.push(diff !== null ? num(diff) : "");
      return cols.map(esc).join(",");
    });

    const disclaimer = "Educational tool only - not financial advice. All values in today's dollars (real terms).";
    const csv = [disclaimer, headers.map(esc).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "covenant-projections.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
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
                <YearSelect label="From FY" value={e.startYear} onChange={(v) => updLE(i, "startYear", v)} personal={personal} small />
                <YearSelect label="To FY" value={e.endYear} onChange={(v) => updLE(i, "endYear", v)} personal={personal} small />
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
                <YearSelect label="From FY" value={e.startYear || new Date().getFullYear()} onChange={(v) => updBaseExp(i, "startYear", v)} personal={personal} small />
                <YearSelect label="To FY" value={e.endYear || 2065} onChange={(v) => updBaseExp(i, "endYear", v)} personal={personal} small />
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
              <YearSelect value={e.startYear} onChange={(v) => updFutureExp(i, "startYear", v)} personal={personal} small />
              <YearSelect value={e.endYear} onChange={(v) => updFutureExp(i, "endYear", v)} personal={personal} small />
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
              <Select label="Profile" value={acc.profile} onChange={(v) => updSuper(sKey, "profile", v)} options={profiles.map(p => ({ value: p, label: profileDisplayLabel(p, !!state.proMode) }))} small />
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
              <Select label="Profile" value={acc.profile} onChange={(v) => updNonSuper(nKey, "profile", v)} options={profiles.map(p => ({ value: p, label: profileDisplayLabel(p, !!state.proMode) }))} small />
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
      {showDeficitWarning && deficitInfo && (
        <DeficitWarningModal
          deficitInfo={deficitInfo}
          state={state}
          setTab={setTab}
          scenarioLabel={scenario === "after" ? "After Advice" : "Now"}
          onClose={() => setShowDeficitWarning(false)}
        />
      )}
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Projections" />
      {renderPopup()}
      <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Btn active={view === "chart"} onClick={() => setView("chart")}>Charts</Btn>
        <Btn active={view === "table"} onClick={() => setView("table")}>Data Table</Btn>
        {view === "table" && (
          <>
            <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />
            <Btn active={!showDetail} onClick={() => setShowDetail(false)} style={{ fontSize: 10 }}>Compact</Btn>
            <Btn active={showDetail} onClick={() => setShowDetail(true)} style={{ fontSize: 10 }}>Detail</Btn>
            <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />
            <Btn onClick={exportCSV} style={{ fontSize: 10 }}>⬇ Export CSV</Btn>
          </>
        )}
        {afterProjectionData && (
          <div style={{ marginLeft: "auto", padding: "4px 10px", background: `${COLORS.green}20`, border: `1px solid ${COLORS.green}40`, borderRadius: 6, fontSize: 10, color: COLORS.green, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            ✨ Showing Before vs After Advice
          </div>
        )}
      </div>

      {view === "chart" && (
        <div>
          <Card title="Income vs Expenses" actions={<DeficitWarningBadge deficitInfo={deficitInfo} state={state} setTab={setTab} scenarioLabel={scenario === "after" ? "After Advice" : "Now"} />}>
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

          <Card title="Cashflow Surplus / Deficit" actions={<DeficitWarningBadge deficitInfo={deficitInfo} state={state} setTab={setTab} scenarioLabel={scenario === "after" ? "After Advice" : "Now"} />}>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
              Green bars = surplus (income exceeds expenses). Red bars = deficit. Zero line marks breakeven.
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={projectionData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <ReferenceLine y={0} stroke={COLORS.textDim} strokeWidth={1.5} />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name]}
                  contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="totalIncome" fill={COLORS.green} name="Income (Now)" opacity={0.45} />
                <Bar dataKey="totalExpenses" fill={COLORS.orange} name="Expenses (Now)" opacity={0.45} />
                <Bar dataKey="surplus" name="Surplus / Deficit (Now)">
                  {projectionData.map((entry, i) => (
                    <Cell key={i} fill={entry.surplus >= 0 ? COLORS.green : COLORS.red} />
                  ))}
                </Bar>
                {afterProjectionData && (
                  <Line
                    type="monotone"
                    data={afterProjectionData}
                    dataKey="surplus"
                    stroke={COLORS.accent}
                    name="Surplus / Deficit (After)"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Asset Breakdown Over Time" actions={<DeficitWarningBadge deficitInfo={deficitInfo} state={state} setTab={setTab} scenarioLabel={scenario === "after" ? "After Advice" : "Now"} />}>
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

          <Card title="Centrelink Age Pension" actions={<DeficitWarningBadge deficitInfo={deficitInfo} state={state} setTab={setTab} scenarioLabel={scenario === "after" ? "After Advice" : "Now"} />}>
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

          <Card title="Tax Breakdown" actions={<DeficitWarningBadge deficitInfo={deficitInfo} state={state} setTab={setTab} scenarioLabel={scenario === "after" ? "After Advice" : "Now"} />}>
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

          <Card title="Debt Over Time" actions={<DeficitWarningBadge deficitInfo={deficitInfo} state={state} setTab={setTab} scenarioLabel={scenario === "after" ? "After Advice" : "Now"} />}>
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
                {/* Group header row — only shown in detail mode */}
                {showDetail && (() => {
                  const th = (label, span, color) => (
                    <th key={label} colSpan={span} style={{ padding: "4px 6px", textAlign: "center", fontSize: 10, fontWeight: 700, color, borderBottom: `2px solid ${color}50`, whiteSpace: "nowrap" }}>{label}</th>
                  );
                  return (
                    <tr>
                      <th colSpan={2} />
                      {th("── INCOME (gross) ──", isCouple ? 7 : 6, COLORS.green)}
                      {th("── EXPENSES ──", 5, COLORS.orange)}
                      {th("── TAX DETAIL ──", isCouple ? 7 : 5, COLORS.red)}
                      <th colSpan={afterProjectionData ? 6 : 5} style={{ padding: "4px 6px", textAlign: "center", fontSize: 10, color: COLORS.textDim }}>── BALANCES ──</th>
                    </tr>
                  );
                })()}
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {/* Year / Age */}
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Year</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Age</th>
                  {/* Income columns */}
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("salaryP1")} color={COLORS.text}>{`${n1} Salary`}</HeaderBtn></th>
                  {isCouple && <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("salaryP2")} color={COLORS.text}>{`${n2} Salary`}</HeaderBtn></th>}
                  {showDetail && <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.cyan, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Inv Returns</th>}
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("super")} color={COLORS.cyan}>Super Draw</HeaderBtn></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.purple, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Age Pension</th>
                  {showDetail && <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Other Inc</th>}
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("income")} color={COLORS.green}>Total Income</HeaderBtn></th>
                  {/* Expense columns */}
                  {showDetail && <>
                    <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.orange, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Lifestyle</th>
                    <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.orange, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Recurring</th>
                    <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.orange, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>One-offs</th>
                    <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.orange, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Loan Pmts</th>
                  </>}
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("expenses")} color={COLORS.orange}>Expenses</HeaderBtn></th>
                  {/* Tax detail columns */}
                  {showDetail && <>
                    <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.red, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Inc Tax</th>
                    {isCouple && <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.red, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Medicare</th>}
                    <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.orange, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Super Tax</th>
                    <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.green, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }} title="Low Income Tax Offset — reduces income tax">LITO</th>
                    {isCouple && <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.green, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }} title="Seniors & Pensioners Tax Offset">SAPTO</th>}
                    <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.red, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }} title="Division 293 — extra 15% tax for high earners">Div293</th>
                  </>}
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.red, fontWeight: showDetail ? 700 : 500, fontSize: 11, whiteSpace: "nowrap" }}>Tax</th>
                  {/* Balance/surplus columns */}
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.red, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }} title="Existing loans + cashflow debt account">Debt</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>Surplus</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.cyan, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }} title="Cash buffer account">Cash</th>
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("super")} color={COLORS.accent}>Super</HeaderBtn></th>
                  <th style={{ padding: 0 }}><HeaderBtn onClick={() => setPopup("nonSuper")} color={COLORS.cyan}>Non-Super</HeaderBtn></th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>Net Assets</th>
                  {afterProjectionData && <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.green, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>Δ After</th>}
                </tr>
              </thead>
              <tbody>
                {projectionData.map((r, i) => {
                  const rowHasDeficit = r.surplus < 0;
                  const td = (v, color, bold) => (
                    <td style={{ padding: "5px 6px", color: color || COLORS.text, textAlign: "right", fontWeight: bold ? 600 : 400 }}>{fmt(v)}</td>
                  );
                  const otherInc = (r.p1Dividends || 0) + (r.p2Dividends || 0)
                    + (r.p1RentalInc || 0) + (r.p2RentalInc || 0)
                    + (r.p1OtherTaxable || 0) + (r.p2OtherTaxable || 0)
                    + (r.p1TaxFreeInc || 0) + (r.p2TaxFreeInc || 0);
                  const totalLITO = (r.p1LITO || 0) + (r.p2LITO || 0);
                  const totalSAPTO = (r.p1SAPTO || 0) + (r.p2SAPTO || 0);
                  const totalDiv293 = (r.p1Div293 || 0) + (r.p2Div293 || 0);
                  const totalIncTax = (r.p1IncomeTax || 0) + (isCouple ? (r.p2IncomeTax || 0) : 0);
                  const totalMedicare = (r.p1Medicare || 0) + (isCouple ? (r.p2Medicare || 0) : 0);
                  const ar = afterProjectionData ? afterProjectionData[i] : null;
                  const nr = nowProjectionData[i];
                  const diff = (ar && nr) ? (ar.netInvestmentAssets - nr.netInvestmentAssets) : 0;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}12`, background: rowHasDeficit ? `${COLORS.red}06` : "transparent" }}>
                      <td style={{ padding: "5px 6px", color: COLORS.text }}>{r.year}</td>
                      <td style={{ padding: "5px 6px", color: COLORS.textDim, textAlign: "right" }}>{r.age1}{isCouple && `/${r.age2}`}</td>
                      {/* Income */}
                      {td(r.p1Salary)}
                      {isCouple && td(r.p2Salary)}
                      {showDetail && td(r.investEarnings, COLORS.cyan)}
                      {td(r.p1PensionDraw + r.p2PensionDraw, COLORS.cyan)}
                      {td(r.agePension, COLORS.purple)}
                      {showDetail && td(otherInc, COLORS.textDim)}
                      {td(r.totalIncome, COLORS.green, showDetail)}
                      {/* Expenses */}
                      {showDetail && <>
                        {td(r.lifestyleExpTotal || 0, COLORS.orange)}
                        {td(r.recurringExpTotal || 0, COLORS.orange)}
                        {td(r.futureExpTotal || 0, COLORS.orange)}
                        {td(r.liabilityPayments || 0, COLORS.orange)}
                      </>}
                      {td(r.totalExpenses, COLORS.orange, showDetail)}
                      {/* Tax detail */}
                      {showDetail && <>
                        {td(totalIncTax, COLORS.red)}
                        {isCouple && td(totalMedicare, `${COLORS.red}cc`)}
                        {td(r.totalSuperTax || 0, COLORS.orange)}
                        {td(totalLITO, COLORS.green)}
                        {isCouple && td(totalSAPTO, COLORS.green)}
                        {td(totalDiv293, totalDiv293 > 0 ? COLORS.red : COLORS.textDim)}
                      </>}
                      {td((r.totalTax || 0) + (r.totalSuperTax || 0), COLORS.red, showDetail)}
                      {/* Balances */}
                      {td((r.totalDebtRemaining || 0) + (r.debtAccount || 0), COLORS.red)}
                      <td style={{ padding: "5px 6px", color: rowHasDeficit ? COLORS.red : COLORS.green, textAlign: "right", fontWeight: 600 }}>{fmt(r.surplus)}</td>
                      {td(r.cashAccount || 0, COLORS.cyan)}
                      {td(r.p1Super + r.p2Super, COLORS.accent)}
                      {td(r.p1NonSuper + r.p2NonSuper + r.jointNonSuper, COLORS.cyan)}
                      {td(r.netAssets, COLORS.text, true)}
                      {afterProjectionData && (
                        <td style={{ padding: "5px 6px", color: diff >= 0 ? COLORS.green : COLORS.red, textAlign: "right", fontWeight: 600 }}>{diff >= 0 ? "+" : ""}{fmt(diff)}</td>
                      )}
                    </tr>
                  );
                })}
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
