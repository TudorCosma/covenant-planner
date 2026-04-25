import { COVENANT_LOGO } from "../data/logo";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function SettingsTab({ theme, setTheme, state, setState }) {
  const cf = state?.cashflowRules || {};
  const updCF = (field, value) => setState(s => ({ ...s, cashflowRules: { ...(s.cashflowRules || {}), [field]: value } }));
  const sourceOptions = [
    { value: "cash", label: "Cash account" },
    { value: "nonSuper", label: "Non-super investments (proportional)" },
    { value: "debt", label: "Debt account" },
  ];
  const surplusOptions = [
    { value: "cash", label: "Add to cash account" },
    { value: "nonSuper", label: "Invest in non-super (proportional)" },
    { value: "debt", label: "Pay down debt account first" },
  ];
  const computedDebtRate = ((cf.cashRate ?? 4.5) + (cf.debtMargin ?? 3.0)).toFixed(2);
  return (
    <div>
      <Card title="Cashflow Management">
        <p style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", marginBottom: 14 }}>
          Controls how annual surpluses and deficits flow through the projection. By default surpluses build up a cash buffer
          (earning the cash interest rate when in credit), deficits drain that buffer first, then draw equally from non-super
          investments, and any final shortfall opens a debt account costing the cash rate plus a margin.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14, alignItems: "end" }}>
          <Input label="Cash interest rate (positive balance only)" value={cf.cashRate ?? 4.5} onChange={(v) => updCF("cashRate", parseFloat(v) || 0)} suffix="%" />
          <Input label="Debt margin over cash rate" value={cf.debtMargin ?? 3.0} onChange={(v) => updCF("debtMargin", parseFloat(v) || 0)} suffix="%" />
          <Input label="Opening cash account balance" value={cf.openingCash ?? 0} onChange={(v) => updCF("openingCash", parseFloat(v) || 0)} prefix="$" />
          <Input label="Opening debt account balance" value={cf.openingDebt ?? 0} onChange={(v) => updCF("openingDebt", parseFloat(v) || 0)} prefix="$" />
        </div>
        <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8, marginBottom: 14, fontSize: 12, color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
          Effective debt account interest rate: <strong style={{ color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>{computedDebtRate}%</strong> p.a.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 14, alignItems: "end" }}>
          <Select label="Where do surpluses go?" value={cf.surplusDestination || "cash"} onChange={(v) => updCF("surplusDestination", v)} options={surplusOptions} />
        </div>
        <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>Deficit funding order</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
          <Select label="1st source" value={cf.deficitStep1 || "cash"} onChange={(v) => updCF("deficitStep1", v)} options={sourceOptions} />
          <Select label="2nd source" value={cf.deficitStep2 || "nonSuper"} onChange={(v) => updCF("deficitStep2", v)} options={sourceOptions} />
          <Select label="3rd source" value={cf.deficitStep3 || "debt"} onChange={(v) => updCF("deficitStep3", v)} options={sourceOptions} />
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 12, fontFamily: "'DM Sans', sans-serif" }}>
          The Projections data table reflects these rules — see the <strong style={{ color: COLORS.text }}>Cash Acct</strong> column and the
          <strong style={{ color: COLORS.text }}> Debt</strong> column (which now combines existing loans with the cashflow debt account).
        </p>
      </Card>

      <Card title="Appearance">
        <p style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>Choose a theme to customise the look and feel of the application.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 , alignItems: "end" }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              style={{
                background: t.card, border: theme === key ? `3px solid ${t.accent}` : `1px solid ${t.border}`,
                borderRadius: 12, padding: 0, cursor: "pointer", overflow: "hidden", textAlign: "left", transition: "all 0.2s",
                boxShadow: theme === key ? `0 0 0 2px ${t.accent}40` : "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ background: t.headerBg, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${t.border}` }}>
                {key === "Covenant Wealth" ? (
                  <img src={COVENANT_LOGO} alt="Covenant Wealth" style={{ height: 24 }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${t.accent}, ${t.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>F</div>
                )}
                <span style={{ color: t.headerText || t.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{t.appTitle}</span>
              </div>
              <div style={{ background: t.bg, padding: 14 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[t.accent, t.green, t.orange, t.cyan, t.purple].map((c, i) => (
                    <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, height: 32, borderRadius: 6, background: t.card, border: `1px solid ${t.border}` }} />
                  <div style={{ flex: 1, height: 32, borderRadius: 6, background: t.card, border: `1px solid ${t.border}` }} />
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: t.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{t.name}</span>
                  {theme === key && <span style={{ color: t.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>✓ Active</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// AI FINANCIAL LITERACY ASSISTANT — Static Knowledge Base
// (API fetch is blocked in the Claude.ai artifact sandbox)
// ============================================================
