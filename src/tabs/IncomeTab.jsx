import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function IncomeTab({ state, setState, scenario, onActivateAfter, onActivateNow, onResetAfter, afterState }) {
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
