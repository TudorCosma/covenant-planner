import { useMemo, useState } from "react";
import { COLORS } from "../data/themes";
import { Card, Select } from "../components";
import { fmt } from "../lib";

// ============================================================
// CASHFLOW LEDGER TAB — year-by-year cashflow waterfall
// Reads from projectionData and presents an itemised ledger:
// inflows (salaries, pensions, dividends, age pension, draws) → outflows
// (expenses, tax, super tax, loan payments) → surplus → balances.
// ============================================================

export function CashflowLedgerTab({ state, projectionData, afterState, afterProjectionData, scenario }) {
  const data = (scenario === "after" && afterProjectionData?.length) ? afterProjectionData : projectionData;
  const personal = (scenario === "after" && afterState) ? afterState.personal : state.personal;
  const isCouple = personal?.isCouple;
  const p1Name = personal?.person1?.name || "Person 1";
  const p2Name = personal?.person2?.name || "Person 2";

  const yearOptions = useMemo(() => (data || []).map(r => ({ value: String(r.year), label: `FY${String(r.year).slice(-2)}-${String(r.year + 1).slice(-2)} (age ${r.age1}${isCouple ? "/" + r.age2 : ""})` })), [data, isCouple]);
  const [selectedYear, setSelectedYear] = useState(() => (data && data[0] ? String(data[0].year) : ""));

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 24, color: COLORS.textDim, fontFamily: "'DM Sans', sans-serif" }}>
        No projection data available yet. Fill in Personal, Income, and Assets to generate a cashflow projection.
      </div>
    );
  }

  const row = data.find(r => String(r.year) === selectedYear) || data[0];

  // Build inflow / outflow line items from the projection row.
  const inflows = [
    { label: `${p1Name} — Salary`,        amount: row.p1Salary },
    isCouple && { label: `${p2Name} — Salary`, amount: row.p2Salary },
    { label: `${p1Name} — Pension Draw`, amount: row.p1PensionDraw },
    isCouple && { label: `${p2Name} — Pension Draw`, amount: row.p2PensionDraw },
    { label: "Age Pension",              amount: row.agePension },
    { label: "Investment Earnings",      amount: row.investEarnings },
  ].filter(Boolean).filter(i => (i.amount || 0) !== 0);

  const outflows = [
    { label: `${p1Name} — Income Tax`,           amount: row.p1IncomeTax },
    isCouple && { label: `${p2Name} — Income Tax`,    amount: row.p2IncomeTax },
    { label: `${p1Name} — Medicare`,             amount: row.p1Medicare },
    isCouple && { label: `${p2Name} — Medicare`,      amount: row.p2Medicare },
    { label: "Super Contribution Tax (P1)",      amount: row.p1SuperContribTax },
    isCouple && { label: "Super Contribution Tax (P2)", amount: row.p2SuperContribTax },
    { label: "Loan Payments",                    amount: row.liabilityPayments },
    { label: "Living Expenses",                  amount: Math.max(0, (row.totalExpenses || 0) - (row.liabilityPayments || 0)) },
  ].filter(Boolean).filter(i => (i.amount || 0) !== 0);

  const totalIn = inflows.reduce((s, i) => s + (i.amount || 0), 0);
  const totalOut = outflows.reduce((s, i) => s + (i.amount || 0), 0);
  const surplus = totalIn - totalOut;

  return (
    <div>
      <div style={{ padding: "10px 14px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 12 }}>
        <p style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Per-year cashflow breakdown — see exactly where money came in and where it went out.
        </p>
      </div>

      <Card title="Select Financial Year">
        <Select label="Year" value={selectedYear} onChange={setSelectedYear} options={yearOptions} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card title={<span style={{ color: COLORS.green }}>Inflows</span>}>
          <Ledger items={inflows} colorAccent={COLORS.green} />
          <Total label="Total Inflows" amount={totalIn} color={COLORS.green} />
        </Card>

        <Card title={<span style={{ color: COLORS.red }}>Outflows</span>}>
          <Ledger items={outflows} colorAccent={COLORS.red} />
          <Total label="Total Outflows" amount={totalOut} color={COLORS.red} />
        </Card>
      </div>

      <Card title="Result">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <StatBlock label="Net Surplus / (Deficit)" value={fmt(surplus)} positive={surplus >= 0} />
          <StatBlock label="Cash Account Balance" value={fmt(row.cashAccount || 0)} positive />
          <StatBlock label="Debt Account Balance" value={fmt(row.debtAccount || 0)} positive={!row.debtAccount} />
        </div>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginTop: 14, fontFamily: "'DM Sans', sans-serif" }}>
          A surplus flows into your cash buffer (then debt offset) per your Settings rules. A deficit is funded by drawing from investment pools in the waterfall order set in Settings.
        </p>
      </Card>

      <Card title="Wealth Snapshot at End of Year">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <StatBlock label={`${p1Name} — Super`} value={fmt(row.p1Super || 0)} positive />
          {isCouple && <StatBlock label={`${p2Name} — Super`} value={fmt(row.p2Super || 0)} positive />}
          <StatBlock label={`${p1Name} — Non-Super`} value={fmt(row.p1NonSuper || 0)} positive />
          {isCouple && <StatBlock label={`${p2Name} — Non-Super`} value={fmt(row.p2NonSuper || 0)} positive />}
          <StatBlock label="Joint Non-Super" value={fmt(row.jointNonSuper || 0)} positive />
          <StatBlock label="Total Liabilities" value={fmt(row.totalLiabilities || 0)} positive={(row.totalLiabilities || 0) === 0} />
          <StatBlock label="Net Investment Assets" value={fmt(row.netInvestmentAssets || 0)} positive />
          <StatBlock label="Lifestyle Assets" value={fmt(row.lifestyleAssets || 0)} positive />
        </div>
      </Card>
    </div>
  );
}

function Ledger({ items, colorAccent }) {
  if (items.length === 0) {
    return <p style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>No items.</p>;
  }
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ color: COLORS.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{it.label}</span>
          <span style={{ color: colorAccent, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(it.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function Total({ label, amount, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", marginTop: 6, borderTop: `2px solid ${color}` }}>
      <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      <span style={{ color, fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(amount)}</span>
    </div>
  );
}

function StatBlock({ label, value, positive }) {
  return (
    <div style={{ padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
      <div style={{ color: COLORS.textDim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{label}</div>
      <div style={{ color: positive ? COLORS.text : COLORS.red, fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}
