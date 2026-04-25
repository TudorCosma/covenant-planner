import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function ExpensesTab({ state, setState, scenario, onActivateAfter, onActivateNow, onResetAfter, afterState }) {
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
