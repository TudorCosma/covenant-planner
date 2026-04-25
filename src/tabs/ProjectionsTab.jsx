import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function ProjectionsTab({ state: nowState, setState: setNowState, setAfterState, projectionData: nowProjectionData, afterProjectionData, scenario, afterState, onActivateAfter, onActivateNow, onResetAfter, setTab }) {
  const [view, setView] = useState("chart");
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
    if (!data || data.length === 0) return null;
    const deficitRows = data.filter(r => (r.surplus || 0) < 0);
    if (deficitRows.length === 0) return null;
    const first = deficitRows[0];
    const firstIdx = data.indexOf(first);
    const prev = firstIdx > 0 ? data[firstIdx - 1] : null;
    // Run length: count consecutive deficit years from the first one
    let consecutive = 0;
    for (let i = firstIdx; i < data.length; i++) {
      if ((data[i].surplus || 0) < 0) consecutive++; else break;
    }
    // Income drop drivers (compare to previous year)
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
    // Expense drivers — items that start in this year (by startYear or saleYear)
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
    // Loan principal kicks in (e.g. interest-only ending) — flag big payment jump
    if (prev && (first.liabilityPayments || 0) - (prev.liabilityPayments || 0) > 2000) {
      expDrivers.push(`Loan repayments increase by ${fmt((first.liabilityPayments||0) - (prev.liabilityPayments||0))} this year`);
    }
    expDrivers.forEach(label => drivers.push({ label, kind: "expense" }));
    return {
      count: deficitRows.length,
      consecutive,
      first,
      drivers,
    };
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
      {showDeficitWarning && deficitInfo && (() => {
        const f = deficitInfo.first;
        const goTo = (t) => { setShowDeficitWarning(false); if (setTab) setTab(t); };
        const linkStyle = { color: COLORS.accent, textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit" };
        // Build income line items for the first deficit year
        const incomeLines = [
          f.p1Salary > 0 && [`${state.personal?.person1?.name || "Person 1"} salary`, f.p1Salary],
          state.personal?.isCouple && f.p2Salary > 0 && [`${state.personal?.person2?.name || "Person 2"} salary`, f.p2Salary],
          f.p1PensionDraw > 0 && [`${state.personal?.person1?.name || "Person 1"} super pension draw`, f.p1PensionDraw],
          state.personal?.isCouple && f.p2PensionDraw > 0 && [`${state.personal?.person2?.name || "Person 2"} super pension draw`, f.p2PensionDraw],
          f.agePension > 0 && ["Age Pension", f.agePension],
        ].filter(Boolean);
        return (
        <Modal title="Unsustainable cashflow detected" onClose={() => setShowDeficitWarning(false)} width={620}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.text, fontSize: 13, lineHeight: 1.55 }}>
            <div style={{ background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}50`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <strong style={{ color: COLORS.red, fontSize: 14 }}>Unsustainable spending based on income — reduce spending or increase income.</strong>
            </div>
            <p style={{ marginTop: 0 }}>
              The first deficit appears in <strong>{f.year}</strong>
              {state.personal?.isCouple
                ? ` (when ${state.personal?.person1?.name || "P1"} is ${f.age1} and ${state.personal?.person2?.name || "P2"} is ${f.age2})`
                : ` (when ${state.personal?.person1?.name || "P1"} is ${f.age1})`}
              , and continues for <strong>{deficitInfo.consecutive} consecutive year{deficitInfo.consecutive === 1 ? "" : "s"}</strong>{" "}
              (<strong>{deficitInfo.count}</strong> deficit year{deficitInfo.count === 1 ? "" : "s"} total across the projection).
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <button onClick={() => goTo("income")} style={linkStyle}>Income</button> — {f.year}
                </div>
                {incomeLines.length === 0 ? (
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" }}>No income sources active</div>
                ) : incomeLines.map(([label, amt]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: COLORS.textMuted }}>{label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(amt)}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 12 }}>
                  <span>Total income</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(f.totalIncome)}</span>
                </div>
              </div>
              <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <button onClick={() => goTo("expenses")} style={linkStyle}>Expenses</button> — {f.year}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: COLORS.textMuted }}>Living + recurring + one-off</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(f.totalExpenses - f.liabilityPayments)}</span>
                </div>
                {f.liabilityPayments > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: COLORS.textMuted }}>Loan repayments</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(f.liabilityPayments)}</span>
                  </div>
                )}
                <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 12 }}>
                  <span>Total expenses</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(f.totalExpenses)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}40`, borderRadius: 8, padding: 10, marginBottom: 14, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
              <span>Net (income − expenses) for {f.year}</span>
              <span style={{ color: COLORS.red, fontVariantNumeric: "tabular-nums" }}>{fmt(f.surplus)}</span>
            </div>

            {deficitInfo.drivers.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Likely contributors this year:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {deficitInfo.drivers.map((d, i) => (
                    <li key={i} style={{ fontSize: 12, marginBottom: 3 }}>
                      <button onClick={() => goTo(d.kind === "income" ? "income" : "expenses")} style={linkStyle}>
                        {d.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p style={{ marginTop: 0 }}>
              In real life a household cashflow deficit cannot be sustained for long — usually only weeks or months, not years —
              because no bank will lend money to fund ongoing living expenses. Most people can only cope with a very brief period
              of negative cashflow before savings run out.
            </p>
            <p>
              <strong>Years of deficits should be considered a failed plan</strong> that needs emergency restructuring. If this
              model reflects a real-life scenario, please seek professional financial advice immediately.
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 16 }}>
              Use the <button onClick={() => goTo("income")} style={linkStyle}>Income</button> tab to increase earnings, or the{" "}
              <button onClick={() => goTo("expenses")} style={linkStyle}>Expenses</button> tab to reduce spending.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowDeficitWarning(false)} color={COLORS.accent}>OK, I understand</Btn>
            </div>
          </div>
        </Modal>
      );})()}
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
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.red, fontWeight: 500, fontSize: 11 }} title="Existing loans + cashflow debt account">Debt</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500, fontSize: 11 }}>Surplus</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", color: COLORS.cyan, fontWeight: 500, fontSize: 11 }} title="Cash buffer account driven by Settings → Cashflow Management">Cash Acct</th>
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
                    <td style={{ padding: "6px", color: COLORS.red, textAlign: "right" }}>{fmt((r.totalDebtRemaining || 0) + (r.debtAccount || 0))}</td>
                    <td style={{ padding: "6px", color: r.surplus >= 0 ? COLORS.green : COLORS.red, textAlign: "right" }}>{fmt(r.surplus)}</td>
                    <td style={{ padding: "6px", color: COLORS.cyan, textAlign: "right" }}>{fmt(r.cashAccount || 0)}</td>
                    <td style={{ padding: "6px", color: COLORS.accent, textAlign: "right" }}>{fmt(r.p1Super + r.p2Super)}</td>
                    <td style={{ padding: "6px", color: COLORS.cyan, textAlign: "right" }}>{fmt(r.p1NonSuper + r.p2NonSuper + r.jointNonSuper)}</td>
                    <td style={{ padding: "6px", color: COLORS.text, textAlign: "right", fontWeight: 600 }}>{fmt(r.netAssets)}</td>
                    {afterProjectionData && (() => {
                      // Always compare After vs Now regardless of which scenario is being viewed
                      const ar = afterProjectionData[i];
                      const nr = nowProjectionData[i];
                      const diff = (ar && nr) ? (ar.netInvestmentAssets - nr.netInvestmentAssets) : 0;
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
