import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";

// ============================================================
// AUSTRALIAN TAX & LEGISLATION DATA (Editable Page)
// ============================================================
const DEFAULT_TAX_BRACKETS_2024 = [
  { min: 0, max: 18200, rate: 0, label: "$0 – $18,200" },
  { min: 18201, max: 45000, rate: 0.16, label: "$18,201 – $45,000" },
  { min: 45001, max: 135000, rate: 0.30, label: "$45,001 – $135,000" },
  { min: 135001, max: 190000, rate: 0.37, label: "$135,001 – $190,000" },
  { min: 190001, max: Infinity, rate: 0.45, label: "$190,001+" },
];

const DEFAULT_SUPER_PARAMS = {
  concessionalCap: 30000,
  nonConcessionalCap: 120000,
  sgRate: 0.12,
  preservationAge: 60,
  taxRate: 0.15,
  divisionTaxRate: 0.15,
  transferBalanceCap: 1900000,
};

const DEFAULT_CENTRELINK = {
  singleMaxPension: 28514,
  coupleMaxPension: 42988,
  singleAssetThresholdHomeowner: 301750,
  coupleAssetThresholdHomeowner: 451500,
  assetTaperRate: 0.03,
  singleIncomeThreshold: 5356,
  coupleIncomeThreshold: 9464,
  incomeTaperRate: 0.50,
  deemingRateLower: 0.0025,
  deemingRateUpper: 0.0225,
  deemingThresholdSingle: 62600,
  deemingThresholdCouple: 103800,
  ageQualifyingAge: 67,
};

const DEFAULT_MEDICARE = { levyRate: 0.02, surchargeThresholdSingle: 93000, surchargeThresholdFamily: 186000, surchargeRate: 0.01 };

const DEFAULT_RETURN_PROFILES = {
  "Defensive": { cash: 0.10, auFixedInt: 0.25, intFixedInt: 0.15, property: 0.05, auShares: 0.20, intShares: 0.15, emergingMkt: 0.05, other: 0.05 },
  "Conservative": { cash: 0.08, auFixedInt: 0.20, intFixedInt: 0.12, property: 0.10, auShares: 0.25, intShares: 0.15, emergingMkt: 0.05, other: 0.05 },
  "Balanced": { cash: 0.05, auFixedInt: 0.15, intFixedInt: 0.10, property: 0.12, auShares: 0.28, intShares: 0.18, emergingMkt: 0.07, other: 0.05 },
  "Growth": { cash: 0.03, auFixedInt: 0.10, intFixedInt: 0.07, property: 0.14, auShares: 0.32, intShares: 0.20, emergingMkt: 0.09, other: 0.05 },
  "Aggressive": { cash: 0.02, auFixedInt: 0.05, intFixedInt: 0.03, property: 0.15, auShares: 0.35, intShares: 0.22, emergingMkt: 0.13, other: 0.05 },
};

const DEFAULT_ASSET_RETURNS = {
  cash: { income: 0.045, growth: 0.0, volatility: 0.005 },
  auFixedInt: { income: 0.04, growth: 0.015, volatility: 0.04 },
  intFixedInt: { income: 0.035, growth: 0.01, volatility: 0.05 },
  property: { income: 0.04, growth: 0.04, volatility: 0.10 },
  auShares: { income: 0.04, growth: 0.055, volatility: 0.15 },
  intShares: { income: 0.02, growth: 0.06, volatility: 0.16 },
  emergingMkt: { income: 0.015, growth: 0.07, volatility: 0.22 },
  other: { income: 0.03, growth: 0.04, volatility: 0.12 },
};

const ASSET_LABELS = { cash: "Cash", auFixedInt: "AU Fixed Interest", intFixedInt: "Int'l Fixed Interest", property: "Property", auShares: "AU Shares", intShares: "Int'l Shares", emergingMkt: "Emerging Markets", other: "Other" };

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const fmt = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v < 0 ? "-" : "") + "$" + (abs / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (v < 0 ? "-" : "") + "$" + Math.round(abs).toLocaleString();
  return (v < 0 ? "-" : "") + "$" + Math.round(abs);
};

const pct = (v) => (v * 100).toFixed(1) + "%";

function calcIncomeTax(taxableIncome, brackets) {
  let tax = 0;
  for (const b of brackets) {
    if (taxableIncome <= 0) break;
    const upper = b.max === Infinity ? taxableIncome : Math.min(taxableIncome, b.max) - b.min + 1;
    const inBracket = Math.min(Math.max(0, upper), taxableIncome - b.min + 1);
    if (inBracket > 0 && taxableIncome > b.min) {
      const amount = Math.min(inBracket, taxableIncome - b.min);
      tax += amount * b.rate;
    }
  }
  // Simplified progressive calc
  let remaining = taxableIncome;
  tax = 0;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const bracketWidth = b.max === Infinity ? remaining : b.max - b.min + 1;
    const taxable = Math.min(remaining, bracketWidth);
    tax += taxable * b.rate;
    remaining -= taxable;
  }
  return Math.max(0, tax);
}

function calcMedicare(income, params) {
  return income * params.levyRate;
}

function boxMullerRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function calcCentrelinkPension(assets, deemedIncome, isCouple, isHomeowner, params, age1, age2) {
  if (isCouple && (age1 < params.ageQualifyingAge && age2 < params.ageQualifyingAge)) return 0;
  if (!isCouple && age1 < params.ageQualifyingAge) return 0;
  const maxPension = isCouple ? params.coupleMaxPension : params.singleMaxPension;
  const assetThreshold = isCouple
    ? (isHomeowner ? params.coupleAssetThresholdHomeowner : params.coupleAssetThresholdHomeowner + 224500)
    : (isHomeowner ? params.singleAssetThresholdHomeowner : params.singleAssetThresholdHomeowner + 224500);
  const excessAssets = Math.max(0, assets - assetThreshold);
  const assetReduction = excessAssets * params.assetTaperRate;
  const incomeThreshold = isCouple ? params.coupleIncomeThreshold : params.singleIncomeThreshold;
  const excessIncome = Math.max(0, deemedIncome - incomeThreshold);
  const incomeReduction = excessIncome * params.incomeTaperRate;
  const reduction = Math.max(assetReduction, incomeReduction);
  return Math.max(0, maxPension - reduction);
}

function calcDeemedIncome(financialAssets, isCouple, params) {
  const threshold = isCouple ? params.deemingThresholdCouple : params.deemingThresholdSingle;
  const lower = Math.min(financialAssets, threshold);
  const upper = Math.max(0, financialAssets - threshold);
  return lower * params.deemingRateLower + upper * params.deemingRateUpper;
}

// ============================================================
// COMPONENTS
// ============================================================
const COLORS = {
  bg: "#0a0f1a",
  card: "#111827",
  cardHover: "#1a2234",
  border: "#1e293b",
  borderLight: "#334155",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  accentDark: "#1d4ed8",
  green: "#10b981",
  greenDark: "#059669",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
  chartColors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"],
};

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "◉" },
  { id: "personal", label: "Personal", icon: "◈" },
  { id: "income", label: "Income", icon: "◆" },
  { id: "assets", label: "Assets", icon: "◇" },
  { id: "expenses", label: "Expenses", icon: "▣" },
  { id: "projections", label: "Projections", icon: "◐" },
  { id: "monte_carlo", label: "Monte Carlo", icon: "◑" },
  { id: "tax_rates", label: "Tax & Legislation", icon: "◒" },
  { id: "returns", label: "Returns & Portfolios", icon: "◓" },
];

function Input({ label, value, onChange, type = "number", prefix, suffix, small, className = "", ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <div className="flex items-center" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, overflow: "hidden" }}>
        {prefix && <span style={{ padding: "6px 0 6px 10px", color: COLORS.textDim, fontSize: small ? 12 : 13, fontFamily: "'JetBrains Mono', monospace" }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
          style={{
            background: "transparent", border: "none", outline: "none", color: COLORS.text, padding: prefix ? "6px 10px 6px 4px" : "6px 10px",
            fontSize: small ? 12 : 13, width: "100%", fontFamily: "'JetBrains Mono', monospace",
          }}
          {...props}
        />
        {suffix && <span style={{ padding: "6px 10px 6px 0", color: COLORS.textDim, fontSize: small ? 12 : 13, fontFamily: "'JetBrains Mono', monospace" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, small }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label style={{ color: COLORS.textMuted, fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, padding: "6px 10px", fontSize: small ? 12 : 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Card({ title, children, className = "", actions }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }} className={className}>
      {(title || actions) && (
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          {title && <h3 style={{ color: COLORS.text, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color = COLORS.accent }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
    </div>
  );
}

function Btn({ children, onClick, active, small, color = COLORS.accent, variant = "default" }) {
  const bg = variant === "outline" ? "transparent" : (active ? color : COLORS.bg);
  const border = variant === "outline" ? color : (active ? color : COLORS.border);
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, border: `1px solid ${border}`, borderRadius: 6, color: active ? "#fff" : COLORS.text, padding: small ? "4px 10px" : "7px 16px",
        fontSize: small ? 11 : 12, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 500, transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ============================================================
// DASHBOARD TAB
// ============================================================
function DashboardTab({ state, projectionData }) {
  const { personal, income, assets, expenses } = state;
  const isCouple = personal.isCouple;
  const totalAssets = Object.values(assets.superAccounts).reduce((s, a) => s + (a.balance || 0), 0)
    + Object.values(assets.nonSuper).reduce((s, a) => s + (a.balance || 0), 0);
  const totalLifestyle = assets.lifestyleAssets.reduce((s, a) => s + (a.value || 0), 0);
  const totalLiabilities = assets.liabilities.reduce((s, a) => s + (a.amount || 0), 0);
  const netInvestment = totalAssets - totalLiabilities;
  const netWealth = netInvestment + totalLifestyle;
  const totalIncome = (income.person1.salary || 0) + (isCouple ? (income.person2.salary || 0) : 0);
  const totalExpenses = expenses.baseExpenses.reduce((s, e) => s + (e.amount || 0), 0) + (expenses.annualLiving || 0);
  const surplus = totalIncome - totalExpenses;

  const assetPie = [
    { name: "Super", value: Object.values(assets.superAccounts).reduce((s, a) => s + (a.balance || 0), 0) },
    { name: "Non-Super", value: Object.values(assets.nonSuper).reduce((s, a) => s + (a.balance || 0), 0) },
    { name: "Lifestyle", value: totalLifestyle },
  ].filter(d => d.value > 0);

  const last5 = projectionData.slice(0, 5);
  const surplusData = last5.map(p => ({ year: p.year, surplus: p.totalIncome - p.totalExpenses }));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Net Investment Assets" value={fmt(netInvestment)} color={COLORS.accent} />
        <StatCard label="Net Wealth" value={fmt(netWealth)} color={COLORS.green} />
        <StatCard label="Annual Income" value={fmt(totalIncome)} color={COLORS.cyan} />
        <StatCard label="Annual Expenses" value={fmt(totalExpenses)} color={COLORS.orange} />
        <StatCard label="Annual Surplus" value={fmt(surplus)} color={surplus >= 0 ? COLORS.green : COLORS.red} />
        <StatCard label="Liabilities" value={fmt(totalLiabilities)} sub={totalAssets > 0 ? `Debt ratio: ${pct(totalLiabilities / (totalAssets + totalLifestyle))}` : ""} color={totalLiabilities > 0 ? COLORS.red : COLORS.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Asset Composition">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={assetPie} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {assetPie.map((_, i) => <Cell key={i} fill={COLORS.chartColors[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="5-Year Surplus Projection">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={surplusData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="year" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
              <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
              <Bar dataKey="surplus" fill={COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {projectionData.length > 0 && (
        <Card title="Net Assets Over Time (Inflation-Adjusted)">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} label={{ value: "Age (Person 1)", position: "insideBottom", offset: -5, fill: COLORS.textDim }} />
              <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} labelFormatter={(l) => `Age ${l}`} />
              <Area type="monotone" dataKey="netAssets" stroke={COLORS.accent} fill="url(#gNet)" strokeWidth={2} name="Net Assets" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// PERSONAL TAB
// ============================================================
function PersonalTab({ state, setState }) {
  const { personal } = state;
  const upd = (field, val) => setState(s => ({ ...s, personal: { ...s.personal, [field]: val } }));
  const updP1 = (field, val) => setState(s => ({ ...s, personal: { ...s.personal, person1: { ...s.personal.person1, [field]: val } } }));
  const updP2 = (field, val) => setState(s => ({ ...s, personal: { ...s.personal, person2: { ...s.personal.person2, [field]: val } } }));

  return (
    <div>
      <Card title="Household Type">
        <div className="flex gap-3" style={{ marginBottom: 16 }}>
          <Btn active={!personal.isCouple} onClick={() => upd("isCouple", false)}>Single</Btn>
          <Btn active={personal.isCouple} onClick={() => upd("isCouple", true)}>Couple</Btn>
        </div>
        <div className="flex gap-3">
          <Btn active={personal.isHomeowner} onClick={() => upd("isHomeowner", !personal.isHomeowner)} color={COLORS.green}>
            {personal.isHomeowner ? "✓ Homeowner" : "Renter"}
          </Btn>
          <Btn active={personal.hasPrivateHealth} onClick={() => upd("hasPrivateHealth", !personal.hasPrivateHealth)} color={COLORS.cyan}>
            {personal.hasPrivateHealth ? "✓ Private Health" : "No Private Health"}
          </Btn>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: personal.isCouple ? "1fr 1fr" : "1fr", gap: 16 }}>
        <Card title={personal.isCouple ? "Person 1" : "Your Details"}>
          <div className="flex flex-col gap-3">
            <Input label="Name" value={personal.person1.name} onChange={(v) => updP1("name", v)} type="text" />
            <Input label="Date of Birth (Year)" value={personal.person1.birthYear} onChange={(v) => updP1("birthYear", v)} />
            <Select label="Gender" value={personal.person1.gender} onChange={(v) => updP1("gender", v)} options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]} />
            <Select label="Employment Status" value={personal.person1.employmentStatus} onChange={(v) => updP1("employmentStatus", v)}
              options={[{ value: "employed", label: "Employed" }, { value: "selfEmployed", label: "Self-Employed" }, { value: "retired", label: "Retired" }, { value: "notWorking", label: "Not Working" }]} />
            <Input label="Retirement Age" value={personal.person1.retirementAge} onChange={(v) => updP1("retirementAge", v)} />
            <Input label="Life Expectancy" value={personal.person1.lifeExpectancy} onChange={(v) => updP1("lifeExpectancy", v)} />
          </div>
        </Card>

        {personal.isCouple && (
          <Card title="Person 2">
            <div className="flex flex-col gap-3">
              <Input label="Name" value={personal.person2.name} onChange={(v) => updP2("name", v)} type="text" />
              <Input label="Date of Birth (Year)" value={personal.person2.birthYear} onChange={(v) => updP2("birthYear", v)} />
              <Select label="Gender" value={personal.person2.gender} onChange={(v) => updP2("gender", v)} options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]} />
              <Select label="Employment Status" value={personal.person2.employmentStatus} onChange={(v) => updP2("employmentStatus", v)}
                options={[{ value: "employed", label: "Employed" }, { value: "selfEmployed", label: "Self-Employed" }, { value: "retired", label: "Retired" }, { value: "notWorking", label: "Not Working" }]} />
              <Input label="Retirement Age" value={personal.person2.retirementAge} onChange={(v) => updP2("retirementAge", v)} />
              <Input label="Life Expectancy" value={personal.person2.lifeExpectancy} onChange={(v) => updP2("lifeExpectancy", v)} />
            </div>
          </Card>
        )}
      </div>

      <Card title="Assumptions">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Input label="Inflation Rate (%)" value={personal.inflationRate} onChange={(v) => upd("inflationRate", v)} suffix="%" />
          <Input label="Salary Growth (%)" value={personal.salaryGrowth} onChange={(v) => upd("salaryGrowth", v)} suffix="%" />
          <Input label="Projection Years" value={personal.projectionYears} onChange={(v) => upd("projectionYears", v)} />
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// INCOME TAB
// ============================================================
function IncomeTab({ state, setState }) {
  const { income, personal } = state;
  const updP1 = (f, v) => setState(s => ({ ...s, income: { ...s.income, person1: { ...s.income.person1, [f]: v } } }));
  const updP2 = (f, v) => setState(s => ({ ...s, income: { ...s.income, person2: { ...s.income.person2, [f]: v } } }));

  const IncomeForm = ({ data, upd, name }) => (
    <Card title={`${name} – Income`}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Gross Salary / Package (excl. SG)" value={data.salary} onChange={(v) => upd("salary", v)} prefix="$" />
        <Input label="Salary Sacrifice to Super" value={data.salarySacrifice} onChange={(v) => upd("salarySacrifice", v)} prefix="$" />
        <Input label="Other Taxable Income" value={data.otherTaxable} onChange={(v) => upd("otherTaxable", v)} prefix="$" />
        <Input label="Franked Dividends" value={data.frankedDividends} onChange={(v) => upd("frankedDividends", v)} prefix="$" />
        <Input label="Rental Income" value={data.rentalIncome} onChange={(v) => upd("rentalIncome", v)} prefix="$" />
        <Input label="Tax-Free Income" value={data.taxFreeIncome} onChange={(v) => upd("taxFreeIncome", v)} prefix="$" />
        <Input label="Personal Deductible Super Contrib." value={data.personalDeductibleSuper} onChange={(v) => upd("personalDeductibleSuper", v)} prefix="$" />
        <Input label="Non-Concessional Super Contrib." value={data.nonConcessionalSuper} onChange={(v) => upd("nonConcessionalSuper", v)} prefix="$" />
      </div>
      <div style={{ marginTop: 16, padding: 12, background: COLORS.bg, borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>SG Contribution</span><div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt((data.salary || 0) * (state.legislation.superParams.sgRate))}</div></div>
        <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Total Concessional</span><div style={{ color: COLORS.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt((data.salary || 0) * state.legislation.superParams.sgRate + (data.salarySacrifice || 0) + (data.personalDeductibleSuper || 0))}</div></div>
        <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Concessional Cap</span><div style={{ color: COLORS.orange, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{fmt(state.legislation.superParams.concessionalCap)}</div></div>
      </div>
    </Card>
  );

  return (
    <div>
      <IncomeForm data={income.person1} upd={updP1} name={personal.person1.name || "Person 1"} />
      {personal.isCouple && <IncomeForm data={income.person2} upd={updP2} name={personal.person2.name || "Person 2"} />}
    </div>
  );
}

// ============================================================
// ASSETS TAB
// ============================================================
function AssetsTab({ state, setState }) {
  const { assets, personal } = state;
  const profiles = Object.keys(state.returnProfiles);

  const updSuper = (key, field, val) => setState(s => ({ ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: { ...s.assets.superAccounts[key], [field]: val } } } }));
  const updNonSuper = (key, field, val) => setState(s => ({ ...s, assets: { ...s.assets, nonSuper: { ...s.assets.nonSuper, [key]: { ...s.assets.nonSuper[key], [field]: val } } } }));

  const addLifestyle = () => setState(s => ({ ...s, assets: { ...s.assets, lifestyleAssets: [...s.assets.lifestyleAssets, { description: "", value: 0, growth: 2.5 }] } }));
  const updLifestyle = (i, f, v) => setState(s => {
    const arr = [...s.assets.lifestyleAssets]; arr[i] = { ...arr[i], [f]: v }; return { ...s, assets: { ...s.assets, lifestyleAssets: arr } };
  });
  const rmLifestyle = (i) => setState(s => ({ ...s, assets: { ...s.assets, lifestyleAssets: s.assets.lifestyleAssets.filter((_, j) => j !== i) } }));

  const addLiability = () => setState(s => ({ ...s, assets: { ...s.assets, liabilities: [...s.assets.liabilities, { description: "", amount: 0, rate: 6.0, deductible: false }] } }));
  const updLiability = (i, f, v) => setState(s => {
    const arr = [...s.assets.liabilities]; arr[i] = { ...arr[i], [f]: v }; return { ...s, assets: { ...s.assets, liabilities: arr } };
  });
  const rmLiability = (i) => setState(s => ({ ...s, assets: { ...s.assets, liabilities: s.assets.liabilities.filter((_, j) => j !== i) } }));

  const SuperForm = ({ sKey, label }) => {
    const acc = assets.superAccounts[sKey];
    return (
      <Card title={label}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Input label="Balance" value={acc.balance} onChange={(v) => updSuper(sKey, "balance", v)} prefix="$" />
          <Input label="Tax-Free Component" value={acc.taxFree} onChange={(v) => updSuper(sKey, "taxFree", v)} prefix="$" />
          <Select label="Portfolio Profile" value={acc.profile} onChange={(v) => updSuper(sKey, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <Select label="Account Type" value={acc.type} onChange={(v) => updSuper(sKey, "type", v)}
            options={[{ value: "accumulation", label: "Accumulation" }, { value: "ttr", label: "TTR Pension" }, { value: "pension", label: "Account-Based Pension" }]} />
          <Input label="Pension Drawdown %" value={acc.drawdownPct} onChange={(v) => updSuper(sKey, "drawdownPct", v)} suffix="%" />
        </div>
      </Card>
    );
  };

  const NonSuperForm = ({ nKey, label }) => {
    const acc = assets.nonSuper[nKey];
    return (
      <Card title={label}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Input label="Balance" value={acc.balance} onChange={(v) => updNonSuper(nKey, "balance", v)} prefix="$" />
          <Input label="Unrealised Gains" value={acc.unrealisedGains} onChange={(v) => updNonSuper(nKey, "unrealisedGains", v)} prefix="$" />
          <Select label="Portfolio Profile" value={acc.profile} onChange={(v) => updNonSuper(nKey, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} />
        </div>
      </Card>
    );
  };

  return (
    <div>
      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, fontWeight: 600 }}>Superannuation</h3>
      <SuperForm sKey="p1Super" label={`${personal.person1.name || "Person 1"} – Super`} />
      <SuperForm sKey="p1Pension" label={`${personal.person1.name || "Person 1"} – Pension`} />
      {personal.isCouple && <>
        <SuperForm sKey="p2Super" label={`${personal.person2.name || "Person 2"} – Super`} />
        <SuperForm sKey="p2Pension" label={`${personal.person2.name || "Person 2"} – Pension`} />
      </>}

      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, marginTop: 24, fontWeight: 600 }}>Non-Superannuation Investments</h3>
      <NonSuperForm nKey="p1NonSuper" label={`${personal.person1.name || "Person 1"} – Non-Super`} />
      {personal.isCouple && <NonSuperForm nKey="p2NonSuper" label={`${personal.person2.name || "Person 2"} – Non-Super`} />}
      <NonSuperForm nKey="joint" label="Joint Investments" />

      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, marginTop: 24, fontWeight: 600 }}>Lifestyle Assets</h3>
      {assets.lifestyleAssets.map((a, i) => (
        <Card key={i}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <Input label="Description" value={a.description} onChange={(v) => updLifestyle(i, "description", v)} type="text" />
            <Input label="Value" value={a.value} onChange={(v) => updLifestyle(i, "value", v)} prefix="$" />
            <Input label="Growth %" value={a.growth} onChange={(v) => updLifestyle(i, "growth", v)} suffix="%" />
            <button onClick={() => rmLifestyle(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 18, paddingBottom: 6 }}>×</button>
          </div>
        </Card>
      ))}
      <Btn onClick={addLifestyle} color={COLORS.green}>+ Add Lifestyle Asset</Btn>

      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, marginTop: 24, fontWeight: 600 }}>Liabilities</h3>
      {assets.liabilities.map((l, i) => (
        <Card key={i}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 12, alignItems: "end" }}>
            <Input label="Description" value={l.description} onChange={(v) => updLiability(i, "description", v)} type="text" />
            <Input label="Amount" value={l.amount} onChange={(v) => updLiability(i, "amount", v)} prefix="$" />
            <Input label="Interest Rate %" value={l.rate} onChange={(v) => updLiability(i, "rate", v)} suffix="%" />
            <Btn small active={l.deductible} onClick={() => updLiability(i, "deductible", !l.deductible)} color={COLORS.cyan}>{l.deductible ? "Deductible" : "Non-Ded."}</Btn>
            <button onClick={() => rmLiability(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 18, paddingBottom: 6 }}>×</button>
          </div>
        </Card>
      ))}
      <Btn onClick={addLiability} color={COLORS.orange}>+ Add Liability</Btn>
    </div>
  );
}

// ============================================================
// EXPENSES TAB
// ============================================================
function ExpensesTab({ state, setState }) {
  const { expenses, personal } = state;
  const currentYear = new Date().getFullYear();
  const upd = (f, v) => setState(s => ({ ...s, expenses: { ...s.expenses, [f]: v } }));

  const addBase = () => upd("baseExpenses", [...expenses.baseExpenses, { description: "", amount: 0, type: "essential", indexation: 2.5 }]);
  const updBase = (i, f, v) => {
    const arr = [...expenses.baseExpenses]; arr[i] = { ...arr[i], [f]: v };
    upd("baseExpenses", arr);
  };
  const rmBase = (i) => upd("baseExpenses", expenses.baseExpenses.filter((_, j) => j !== i));

  const addFuture = () => upd("futureExpenses", [...expenses.futureExpenses, { description: "", amount: 0, startYear: currentYear + 1, endYear: currentYear + 5, indexation: 2.5, type: "desirable" }]);
  const updFuture = (i, f, v) => {
    const arr = [...expenses.futureExpenses]; arr[i] = { ...arr[i], [f]: v };
    upd("futureExpenses", arr);
  };
  const rmFuture = (i) => upd("futureExpenses", expenses.futureExpenses.filter((_, j) => j !== i));

  const totalEssential = expenses.baseExpenses.filter(e => e.type === "essential").reduce((s, e) => s + (e.amount || 0), 0) + (expenses.annualLiving || 0);
  const totalDesirable = expenses.baseExpenses.filter(e => e.type === "desirable").reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <Card title="Annual Base Living Expenses">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Annual Living Expenses (today's $)" value={expenses.annualLiving} onChange={(v) => upd("annualLiving", v)} prefix="$" />
          <Input label="Reducing Indexation After Retirement (%)" value={expenses.reducingIndex} onChange={(v) => upd("reducingIndex", v)} suffix="%" />
        </div>
      </Card>

      <Card title="Recurring Expenses" actions={<Btn small onClick={addBase} color={COLORS.green}>+ Add</Btn>}>
        {expenses.baseExpenses.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Description</span>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Amount</span>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Type</span>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Indexation %</span>
            <span />
          </div>
        )}
        {expenses.baseExpenses.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <Input value={e.description} onChange={(v) => updBase(i, "description", v)} type="text" small />
            <Input value={e.amount} onChange={(v) => updBase(i, "amount", v)} prefix="$" small />
            <Select value={e.type} onChange={(v) => updBase(i, "type", v)} small options={[{ value: "essential", label: "Essential" }, { value: "desirable", label: "Desirable" }]} />
            <Input value={e.indexation} onChange={(v) => updBase(i, "indexation", v)} suffix="%" small />
            <button onClick={() => rmBase(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
        <div style={{ marginTop: 12, display: "flex", gap: 20, padding: 10, background: COLORS.bg, borderRadius: 8 }}>
          <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Essential: </span><span style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{fmt(totalEssential)}</span></div>
          <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Desirable: </span><span style={{ color: COLORS.orange, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{fmt(totalDesirable)}</span></div>
          <div><span style={{ color: COLORS.textDim, fontSize: 11 }}>Total: </span><span style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{fmt(totalEssential + totalDesirable)}</span></div>
        </div>
      </Card>

      <Card title="Future / One-Off Expenses" actions={<Btn small onClick={addFuture} color={COLORS.green}>+ Add</Btn>}>
        <p style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Add expenses that occur in specific future years (e.g. car purchase, renovations, travel).</p>
        {expenses.futureExpenses.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.8fr 1fr auto", gap: 8, marginBottom: 8 }}>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Description</span>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Amount</span>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Start Year</span>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>End Year</span>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Type</span>
            <span />
          </div>
        )}
        {expenses.futureExpenses.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.8fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <Input value={e.description} onChange={(v) => updFuture(i, "description", v)} type="text" small />
            <Input value={e.amount} onChange={(v) => updFuture(i, "amount", v)} prefix="$" small />
            <Input value={e.startYear} onChange={(v) => updFuture(i, "startYear", v)} small />
            <Input value={e.endYear} onChange={(v) => updFuture(i, "endYear", v)} small />
            <Select value={e.type} onChange={(v) => updFuture(i, "type", v)} small options={[{ value: "essential", label: "Essential" }, { value: "desirable", label: "Desirable" }]} />
            <button onClick={() => rmFuture(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ============================================================
// TAX & LEGISLATION TAB
// ============================================================
function TaxTab({ state, setState }) {
  const { legislation } = state;
  const updBracket = (i, f, v) => {
    const arr = [...legislation.taxBrackets]; arr[i] = { ...arr[i], [f]: v };
    setState(s => ({ ...s, legislation: { ...s.legislation, taxBrackets: arr } }));
  };
  const updSuper = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, superParams: { ...s.legislation.superParams, [f]: v } } }));
  const updCL = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, centrelink: { ...s.legislation.centrelink, [f]: v } } }));
  const updMed = (f, v) => setState(s => ({ ...s, legislation: { ...s.legislation, medicare: { ...s.legislation.medicare, [f]: v } } }));

  return (
    <div>
      <div style={{ padding: "12px 16px", background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 16 }}>
        <p style={{ color: COLORS.accentLight, fontSize: 12, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>These rates can be updated as legislation changes. All projections will recalculate automatically.</p>
      </div>

      <Card title="Income Tax Brackets (Resident Individual)">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Range</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Min ($)</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Max ($)</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Rate (%)</span>
        </div>
        {legislation.taxBrackets.map((b, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ color: COLORS.text, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{b.label}</span>
            <Input value={b.min} onChange={(v) => updBracket(i, "min", v)} small />
            <Input value={b.max === Infinity ? "∞" : b.max} onChange={(v) => updBracket(i, "max", v === "∞" ? Infinity : v)} small type="text" />
            <Input value={(b.rate * 100)} onChange={(v) => updBracket(i, "rate", v / 100)} suffix="%" small />
          </div>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Superannuation Parameters">
          <div className="flex flex-col gap-3">
            <Input label="Concessional Contributions Cap" value={legislation.superParams.concessionalCap} onChange={(v) => updSuper("concessionalCap", v)} prefix="$" />
            <Input label="Non-Concessional Cap" value={legislation.superParams.nonConcessionalCap} onChange={(v) => updSuper("nonConcessionalCap", v)} prefix="$" />
            <Input label="SG Rate" value={(legislation.superParams.sgRate * 100)} onChange={(v) => updSuper("sgRate", v / 100)} suffix="%" />
            <Input label="Preservation Age" value={legislation.superParams.preservationAge} onChange={(v) => updSuper("preservationAge", v)} />
            <Input label="Super Tax Rate" value={(legislation.superParams.taxRate * 100)} onChange={(v) => updSuper("taxRate", v / 100)} suffix="%" />
            <Input label="Transfer Balance Cap" value={legislation.superParams.transferBalanceCap} onChange={(v) => updSuper("transferBalanceCap", v)} prefix="$" />
          </div>
        </Card>

        <Card title="Medicare Levy">
          <div className="flex flex-col gap-3">
            <Input label="Levy Rate" value={(legislation.medicare.levyRate * 100)} onChange={(v) => updMed("levyRate", v / 100)} suffix="%" />
            <Input label="Surcharge Threshold (Single)" value={legislation.medicare.surchargeThresholdSingle} onChange={(v) => updMed("surchargeThresholdSingle", v)} prefix="$" />
            <Input label="Surcharge Threshold (Family)" value={legislation.medicare.surchargeThresholdFamily} onChange={(v) => updMed("surchargeThresholdFamily", v)} prefix="$" />
            <Input label="Surcharge Rate" value={(legislation.medicare.surchargeRate * 100)} onChange={(v) => updMed("surchargeRate", v / 100)} suffix="%" />
          </div>
        </Card>
      </div>

      <Card title="Centrelink / Age Pension Parameters">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Input label="Single Max Pension (pa)" value={legislation.centrelink.singleMaxPension} onChange={(v) => updCL("singleMaxPension", v)} prefix="$" />
          <Input label="Couple Max Pension (pa)" value={legislation.centrelink.coupleMaxPension} onChange={(v) => updCL("coupleMaxPension", v)} prefix="$" />
          <Input label="Age Qualifying Age" value={legislation.centrelink.ageQualifyingAge} onChange={(v) => updCL("ageQualifyingAge", v)} />
          <Input label="Single Asset Threshold (Homeowner)" value={legislation.centrelink.singleAssetThresholdHomeowner} onChange={(v) => updCL("singleAssetThresholdHomeowner", v)} prefix="$" />
          <Input label="Couple Asset Threshold (Homeowner)" value={legislation.centrelink.coupleAssetThresholdHomeowner} onChange={(v) => updCL("coupleAssetThresholdHomeowner", v)} prefix="$" />
          <Input label="Asset Taper Rate (per $1000 pa)" value={(legislation.centrelink.assetTaperRate * 100)} onChange={(v) => updCL("assetTaperRate", v / 100)} suffix="%" />
          <Input label="Deeming Rate Lower" value={(legislation.centrelink.deemingRateLower * 100)} onChange={(v) => updCL("deemingRateLower", v / 100)} suffix="%" />
          <Input label="Deeming Rate Upper" value={(legislation.centrelink.deemingRateUpper * 100)} onChange={(v) => updCL("deemingRateUpper", v / 100)} suffix="%" />
          <Input label="Deeming Threshold (Single)" value={legislation.centrelink.deemingThresholdSingle} onChange={(v) => updCL("deemingThresholdSingle", v)} prefix="$" />
          <Input label="Income Taper Rate" value={(legislation.centrelink.incomeTaperRate * 100)} onChange={(v) => updCL("incomeTaperRate", v / 100)} suffix="%" />
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// RETURNS & PORTFOLIO TAB
// ============================================================
function ReturnsTab({ state, setState }) {
  const updReturn = (asset, field, val) => setState(s => ({ ...s, assetReturns: { ...s.assetReturns, [asset]: { ...s.assetReturns[asset], [field]: val } } }));
  const updProfile = (profile, asset, val) => setState(s => ({ ...s, returnProfiles: { ...s.returnProfiles, [profile]: { ...s.returnProfiles[profile], [asset]: val / 100 } } }));

  const selectedProfile = Object.keys(state.returnProfiles)[0];
  const [viewProfile, setViewProfile] = useState(selectedProfile);

  return (
    <div>
      <Card title="Asset Class Return Assumptions">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Asset Class</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Income Yield %</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Capital Growth %</span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Volatility (σ) %</span>
        </div>
        {Object.entries(state.assetReturns).map(([key, r]) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ color: COLORS.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{ASSET_LABELS[key]}</span>
            <Input value={(r.income * 100)} onChange={(v) => updReturn(key, "income", v / 100)} suffix="%" small />
            <Input value={(r.growth * 100)} onChange={(v) => updReturn(key, "growth", v / 100)} suffix="%" small />
            <Input value={(r.volatility * 100)} onChange={(v) => updReturn(key, "volatility", v / 100)} suffix="%" small />
          </div>
        ))}
      </Card>

      <Card title="Portfolio Allocation Profiles">
        <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          {Object.keys(state.returnProfiles).map(p => (
            <Btn key={p} small active={viewProfile === p} onClick={() => setViewProfile(p)}>{p}</Btn>
          ))}
        </div>
        {viewProfile && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Asset Class</span>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Allocation %</span>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Expected Return</span>
            </div>
            {Object.entries(state.returnProfiles[viewProfile]).map(([asset, alloc]) => {
              const ret = state.assetReturns[asset];
              const totalReturn = ret ? (ret.income + ret.growth) : 0;
              return (
                <div key={asset} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ color: COLORS.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{ASSET_LABELS[asset]}</span>
                  <Input value={(alloc * 100).toFixed(0)} onChange={(v) => updProfile(viewProfile, asset, Number(v))} suffix="%" small />
                  <span style={{ color: COLORS.cyan, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{pct(totalReturn)}</span>
                </div>
              );
            })}
            <div style={{ marginTop: 12, padding: 10, background: COLORS.bg, borderRadius: 8 }}>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>Weighted Expected Return: </span>
              <span style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                {pct(Object.entries(state.returnProfiles[viewProfile]).reduce((s, [a, w]) => {
                  const r = state.assetReturns[a]; return s + (r ? (r.income + r.growth) * w : 0);
                }, 0))}
              </span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={Object.entries(state.returnProfiles[viewProfile] || {}).map(([k, v]) => ({ name: ASSET_LABELS[k], allocation: v * 100 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={{ fill: COLORS.textDim, fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
              <Bar dataKey="allocation" fill={COLORS.accent} radius={[4, 4, 0, 0]} name="Allocation %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// PROJECTION ENGINE
// ============================================================
function runProjection(state, useRandomReturns = false, seed = 0) {
  const { personal, income, assets, expenses, legislation, returnProfiles, assetReturns } = state;
  const currentYear = new Date().getFullYear();
  const years = personal.projectionYears || 30;
  const inflation = (personal.inflationRate || 2.5) / 100;
  const salaryGrowth = (personal.salaryGrowth || 3) / 100;
  const isCouple = personal.isCouple;

  const age1Start = currentYear - (personal.person1.birthYear || 1970);
  const age2Start = isCouple ? currentYear - (personal.person2.birthYear || 1975) : 0;
  const retAge1 = personal.person1.retirementAge || 67;
  const retAge2 = isCouple ? (personal.person2.retirementAge || 67) : 999;

  let p1Super = (assets.superAccounts.p1Super?.balance || 0) + (assets.superAccounts.p1Pension?.balance || 0);
  let p2Super = (assets.superAccounts.p2Super?.balance || 0) + (assets.superAccounts.p2Pension?.balance || 0);
  let p1NonSuper = assets.nonSuper.p1NonSuper?.balance || 0;
  let p2NonSuper = assets.nonSuper.p2NonSuper?.balance || 0;
  let jointNonSuper = assets.nonSuper.joint?.balance || 0;

  const getPortfolioReturn = (profileName, random = false) => {
    const profile = returnProfiles[profileName] || returnProfiles["Balanced"];
    let totalReturn = 0;
    let totalVol = 0;
    for (const [asset, weight] of Object.entries(profile)) {
      const r = assetReturns[asset];
      if (r) {
        totalReturn += (r.income + r.growth) * weight;
        totalVol += r.volatility * r.volatility * weight * weight;
      }
    }
    totalVol = Math.sqrt(totalVol);
    if (random) {
      return totalReturn + totalVol * boxMullerRandom();
    }
    return totalReturn;
  };

  const data = [];

  for (let y = 0; y < years; y++) {
    const year = currentYear + y;
    const age1 = age1Start + y;
    const age2 = age2Start + y;
    const inflationFactor = Math.pow(1 + inflation, y);
    const isP1Working = age1 < retAge1;
    const isP2Working = age2 < retAge2;

    // Income
    const p1Salary = isP1Working ? (income.person1.salary || 0) * Math.pow(1 + salaryGrowth, y) : 0;
    const p2Salary = (isCouple && isP2Working) ? (income.person2.salary || 0) * Math.pow(1 + salaryGrowth, y) : 0;

    // Super contributions
    const p1SG = p1Salary * legislation.superParams.sgRate;
    const p2SG = p2Salary * legislation.superParams.sgRate;
    const p1SalSac = isP1Working ? (income.person1.salarySacrifice || 0) : 0;
    const p2SalSac = (isCouple && isP2Working) ? (income.person2.salarySacrifice || 0) : 0;

    // Investment returns
    const superProfile = assets.superAccounts.p1Super?.profile || "Balanced";
    const nonSuperProfile = assets.nonSuper.joint?.profile || "Balanced";
    const superReturn = getPortfolioReturn(superProfile, useRandomReturns);
    const nonSuperReturn = getPortfolioReturn(nonSuperProfile, useRandomReturns);

    // Pension income
    const p1PensionDraw = !isP1Working && age1 >= legislation.superParams.preservationAge ? p1Super * ((assets.superAccounts.p1Pension?.drawdownPct || 5) / 100) : 0;
    const p2PensionDraw = (isCouple && !isP2Working && age2 >= legislation.superParams.preservationAge) ? p2Super * ((assets.superAccounts.p2Pension?.drawdownPct || 5) / 100) : 0;

    // Age pension
    const totalFinancialAssets = p1Super + p2Super + p1NonSuper + p2NonSuper + jointNonSuper;
    const deemedIncome = calcDeemedIncome(totalFinancialAssets, isCouple, legislation.centrelink);
    const agePension = calcCentrelinkPension(totalFinancialAssets, deemedIncome, isCouple, personal.isHomeowner, legislation.centrelink, age1, age2);

    // Tax
    const p1Taxable = p1Salary - p1SalSac + (income.person1.otherTaxable || 0) + (income.person1.rentalIncome || 0) + p1PensionDraw * 0.5 + (income.person1.frankedDividends || 0) * 1.3;
    const p1Tax = calcIncomeTax(p1Taxable, legislation.taxBrackets) + calcMedicare(p1Taxable, legislation.medicare);
    const p1NetIncome = p1Salary - p1SalSac - p1Tax + (income.person1.taxFreeIncome || 0) + (income.person1.otherTaxable || 0) + (income.person1.rentalIncome || 0) + (income.person1.frankedDividends || 0);

    let p2NetIncome = 0;
    if (isCouple) {
      const p2Taxable = p2Salary - p2SalSac + (income.person2.otherTaxable || 0) + (income.person2.rentalIncome || 0) + p2PensionDraw * 0.5 + (income.person2.frankedDividends || 0) * 1.3;
      const p2Tax = calcIncomeTax(p2Taxable, legislation.taxBrackets) + calcMedicare(p2Taxable, legislation.medicare);
      p2NetIncome = p2Salary - p2SalSac - p2Tax + (income.person2.taxFreeIncome || 0) + (income.person2.otherTaxable || 0) + (income.person2.rentalIncome || 0) + (income.person2.frankedDividends || 0);
    }

    const totalNetIncome = p1NetIncome + p2NetIncome + p1PensionDraw + p2PensionDraw + agePension;

    // Expenses
    const baseExp = (expenses.annualLiving || 0) * inflationFactor;
    const recurringExp = expenses.baseExpenses.reduce((s, e) => s + (e.amount || 0) * Math.pow(1 + (e.indexation || 2.5) / 100, y), 0);
    const futureExp = expenses.futureExpenses.filter(e => year >= e.startYear && year <= e.endYear).reduce((s, e) => s + (e.amount || 0) * Math.pow(1 + (e.indexation || 2.5) / 100, y - (e.startYear - currentYear)), 0);
    const totalExp = baseExp + recurringExp + futureExp;
    const liabilityPayments = assets.liabilities.reduce((s, l) => s + (l.amount || 0) * (l.rate || 0) / 100, 0);

    const surplus = totalNetIncome - totalExp - liabilityPayments;

    // Grow assets
    p1Super = p1Super * (1 + superReturn) + p1SG + p1SalSac + (income.person1.personalDeductibleSuper || 0) + (income.person1.nonConcessionalSuper || 0) - p1PensionDraw;
    p1Super -= p1Super * legislation.superParams.taxRate * Math.max(0, superReturn);
    if (isCouple) {
      p2Super = p2Super * (1 + superReturn) + p2SG + p2SalSac + (income.person2.personalDeductibleSuper || 0) + (income.person2.nonConcessionalSuper || 0) - p2PensionDraw;
      p2Super -= p2Super * legislation.superParams.taxRate * Math.max(0, superReturn);
    }

    const nonSuperGrowth = nonSuperReturn;
    p1NonSuper = p1NonSuper * (1 + nonSuperGrowth);
    p2NonSuper = p2NonSuper * (1 + nonSuperGrowth);
    jointNonSuper = jointNonSuper * (1 + nonSuperGrowth) + Math.max(0, surplus);

    if (surplus < 0) {
      jointNonSuper += surplus;
      if (jointNonSuper < 0) { p1NonSuper += jointNonSuper; jointNonSuper = 0; }
      if (p1NonSuper < 0) { p2NonSuper += p1NonSuper; p1NonSuper = 0; }
    }

    const totalAssets = Math.max(0, p1Super) + Math.max(0, p2Super) + Math.max(0, p1NonSuper) + Math.max(0, p2NonSuper) + Math.max(0, jointNonSuper);
    const totalLiab = assets.liabilities.reduce((s, l) => s + (l.amount || 0), 0);

    data.push({
      year, age1, age2, period: y + 1,
      p1Salary, p2Salary, p1SG, p2SG, p1PensionDraw, p2PensionDraw, agePension,
      totalIncome: totalNetIncome, totalExpenses: totalExp + liabilityPayments,
      surplus,
      p1Super: Math.max(0, p1Super), p2Super: Math.max(0, p2Super),
      p1NonSuper: Math.max(0, p1NonSuper), p2NonSuper: Math.max(0, p2NonSuper), jointNonSuper: Math.max(0, jointNonSuper),
      totalAssets, totalLiabilities: totalLiab,
      netAssets: totalAssets - totalLiab,
      netAssetsReal: (totalAssets - totalLiab) / inflationFactor,
      inflationFactor,
    });
  }
  return data;
}

// ============================================================
// PROJECTIONS TAB
// ============================================================
function ProjectionsTab({ state, projectionData }) {
  const [view, setView] = useState("chart");
  const isCouple = state.personal.isCouple;

  return (
    <div>
      <div className="flex gap-2" style={{ marginBottom: 16 }}>
        <Btn active={view === "chart"} onClick={() => setView("chart")}>Charts</Btn>
        <Btn active={view === "table"} onClick={() => setView("table")}>Data Table</Btn>
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
                <Bar dataKey="totalIncome" fill={COLORS.green} name="Net Income" opacity={0.7} />
                <Bar dataKey="totalExpenses" fill={COLORS.red} name="Expenses" opacity={0.7} />
                <Line type="monotone" dataKey="surplus" stroke={COLORS.accent} name="Surplus/Deficit" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Asset Breakdown Over Time">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="p1Super" stackId="1" fill={COLORS.chartColors[0]} stroke={COLORS.chartColors[0]} name="P1 Super" />
                {isCouple && <Area type="monotone" dataKey="p2Super" stackId="1" fill={COLORS.chartColors[1]} stroke={COLORS.chartColors[1]} name="P2 Super" />}
                <Area type="monotone" dataKey="jointNonSuper" stackId="1" fill={COLORS.chartColors[2]} stroke={COLORS.chartColors[2]} name="Joint Non-Super" />
                <Area type="monotone" dataKey="p1NonSuper" stackId="1" fill={COLORS.chartColors[3]} stroke={COLORS.chartColors[3]} name="P1 Non-Super" />
                {isCouple && <Area type="monotone" dataKey="p2NonSuper" stackId="1" fill={COLORS.chartColors[4]} stroke={COLORS.chartColors[4]} name="P2 Non-Super" />}
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Centrelink Age Pension">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Area type="monotone" dataKey="agePension" fill={`${COLORS.purple}40`} stroke={COLORS.purple} strokeWidth={2} name="Age Pension" />
              </AreaChart>
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
                  {["Year", "Age", "Salary P1", isCouple && "Salary P2", "Pension Draw", "Age Pension", "Total Income", "Expenses", "Surplus", "Super", "Non-Super", "Net Assets"].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: "8px 6px", textAlign: "right", color: COLORS.textDim, fontWeight: 500 }}>{h}</th>
                  ))}
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
                    <td style={{ padding: "6px", color: r.surplus >= 0 ? COLORS.green : COLORS.red, textAlign: "right" }}>{fmt(r.surplus)}</td>
                    <td style={{ padding: "6px", color: COLORS.accent, textAlign: "right" }}>{fmt(r.p1Super + r.p2Super)}</td>
                    <td style={{ padding: "6px", color: COLORS.cyan, textAlign: "right" }}>{fmt(r.p1NonSuper + r.p2NonSuper + r.jointNonSuper)}</td>
                    <td style={{ padding: "6px", color: COLORS.text, textAlign: "right", fontWeight: 600 }}>{fmt(r.netAssets)}</td>
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
function MonteCarloTab({ state }) {
  const [simulations, setSimulations] = useState(500);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const runSim = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const allRuns = [];
      const years = state.personal.projectionYears || 30;
      for (let i = 0; i < simulations; i++) {
        const data = runProjection(state, true, i);
        allRuns.push(data);
      }

      // Percentile calculations
      const percentileData = [];
      for (let y = 0; y < years; y++) {
        const netAssetsAtYear = allRuns.map(r => r[y]?.netAssets || 0).sort((a, b) => a - b);
        const p5 = netAssetsAtYear[Math.floor(simulations * 0.05)];
        const p25 = netAssetsAtYear[Math.floor(simulations * 0.25)];
        const p50 = netAssetsAtYear[Math.floor(simulations * 0.50)];
        const p75 = netAssetsAtYear[Math.floor(simulations * 0.75)];
        const p95 = netAssetsAtYear[Math.floor(simulations * 0.95)];
        const mean = netAssetsAtYear.reduce((s, v) => s + v, 0) / simulations;
        percentileData.push({
          year: allRuns[0][y]?.year, age1: allRuns[0][y]?.age1,
          p5, p25, p50, p75, p95, mean,
          range_5_95: p95 - p5, range_25_75: p75 - p25,
        });
      }

      const finalAssets = allRuns.map(r => r[r.length - 1]?.netAssets || 0);
      const successRate = finalAssets.filter(v => v > 0).length / simulations * 100;
      const exhaustionAges = allRuns.map(r => {
        const idx = r.findIndex(d => d.netAssets <= 0);
        return idx >= 0 ? r[idx].age1 : null;
      }).filter(v => v !== null);
      const avgExhaustion = exhaustionAges.length > 0 ? exhaustionAges.reduce((s, v) => s + v, 0) / exhaustionAges.length : null;

      // Distribution histogram
      const bins = 30;
      const minVal = Math.min(...finalAssets);
      const maxVal = Math.max(...finalAssets);
      const binWidth = (maxVal - minVal) / bins || 1;
      const histogram = Array(bins).fill(0);
      finalAssets.forEach(v => {
        const bin = Math.min(bins - 1, Math.floor((v - minVal) / binWidth));
        histogram[bin]++;
      });
      const histData = histogram.map((count, i) => ({ value: Math.round(minVal + i * binWidth), count, pct: (count / simulations * 100).toFixed(1) }));

      setResults({ percentileData, successRate, avgExhaustion, histData, finalAssets, simCount: simulations });
      setRunning(false);
    }, 100);
  }, [state, simulations]);

  return (
    <div>
      <Card title="Monte Carlo Simulation">
        <p style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
          Runs multiple simulations with randomized investment returns based on each asset class's volatility assumptions. This models a range of possible outcomes rather than a single deterministic projection.
        </p>
        <div className="flex gap-3 items-end">
          <Input label="Number of Simulations" value={simulations} onChange={setSimulations} />
          <Btn onClick={runSim} color={COLORS.green}>{running ? "Running..." : "Run Simulation"}</Btn>
        </div>
      </Card>

      {results && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <StatCard label="Success Rate" value={`${results.successRate.toFixed(1)}%`} sub="Assets remain at end" color={results.successRate >= 90 ? COLORS.green : results.successRate >= 70 ? COLORS.orange : COLORS.red} />
            <StatCard label="Median Final Assets" value={fmt(results.percentileData[results.percentileData.length - 1]?.p50)} color={COLORS.accent} />
            <StatCard label="5th Percentile (Worst Case)" value={fmt(results.percentileData[results.percentileData.length - 1]?.p5)} color={COLORS.red} />
            <StatCard label="95th Percentile (Best Case)" value={fmt(results.percentileData[results.percentileData.length - 1]?.p95)} color={COLORS.green} />
            {results.avgExhaustion && <StatCard label="Avg. Exhaustion Age" value={Math.round(results.avgExhaustion)} sub="When assets run out" color={COLORS.red} />}
          </div>

          <Card title="Net Assets – Percentile Bands">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={results.percentileData}>
                <defs>
                  <linearGradient id="gBand1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.1} /><stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.05} /></linearGradient>
                  <linearGradient id="gBand2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.2} /><stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.1} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="age1" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Area type="monotone" dataKey="p95" stroke="none" fill="url(#gBand1)" name="95th" />
                <Area type="monotone" dataKey="p75" stroke="none" fill="url(#gBand2)" name="75th" />
                <Line type="monotone" dataKey="p50" stroke={COLORS.accent} strokeWidth={2.5} dot={false} name="Median" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="url(#gBand2)" name="25th" />
                <Area type="monotone" dataKey="p5" stroke="none" fill="url(#gBand1)" name="5th" />
                <Line type="monotone" dataKey="mean" stroke={COLORS.green} strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Mean" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Distribution of Final Net Assets">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={results.histData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="value" tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={fmt} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11 }} />
                <Tooltip formatter={(v, name) => name === "count" ? v : `${v}%`} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} labelFormatter={(v) => `Net Assets: ${fmt(v)}`} />
                <Bar dataKey="count" fill={COLORS.accent} radius={[2, 2, 0, 0]} name="Simulations" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
const DEFAULT_STATE = {
  personal: {
    isCouple: true,
    isHomeowner: true,
    hasPrivateHealth: false,
    inflationRate: 2.5,
    salaryGrowth: 3.0,
    projectionYears: 30,
    person1: { name: "Person 1", birthYear: 1965, gender: "M", employmentStatus: "employed", retirementAge: 67, lifeExpectancy: 90 },
    person2: { name: "Person 2", birthYear: 1970, gender: "F", employmentStatus: "employed", retirementAge: 67, lifeExpectancy: 92 },
  },
  income: {
    person1: { salary: 90000, salarySacrifice: 0, otherTaxable: 0, frankedDividends: 0, rentalIncome: 0, taxFreeIncome: 0, personalDeductibleSuper: 0, nonConcessionalSuper: 0 },
    person2: { salary: 60000, salarySacrifice: 0, otherTaxable: 0, frankedDividends: 0, rentalIncome: 0, taxFreeIncome: 0, personalDeductibleSuper: 0, nonConcessionalSuper: 0 },
  },
  assets: {
    superAccounts: {
      p1Super: { balance: 250000, taxFree: 0, profile: "Balanced", type: "accumulation", drawdownPct: 5 },
      p1Pension: { balance: 0, taxFree: 0, profile: "Balanced", type: "pension", drawdownPct: 5 },
      p2Super: { balance: 120000, taxFree: 0, profile: "Balanced", type: "accumulation", drawdownPct: 5 },
      p2Pension: { balance: 0, taxFree: 0, profile: "Balanced", type: "pension", drawdownPct: 5 },
    },
    nonSuper: {
      p1NonSuper: { balance: 50000, unrealisedGains: 5000, profile: "Balanced" },
      p2NonSuper: { balance: 20000, unrealisedGains: 2000, profile: "Balanced" },
      joint: { balance: 80000, unrealisedGains: 10000, profile: "Balanced" },
    },
    lifestyleAssets: [
      { description: "Principal Residence", value: 650000, growth: 3.0 },
      { description: "Motor Vehicle", value: 25000, growth: -5.0 },
      { description: "Contents", value: 30000, growth: 0 },
    ],
    liabilities: [],
  },
  expenses: {
    annualLiving: 60000,
    reducingIndex: 1.5,
    baseExpenses: [
      { description: "Rates & Insurance", amount: 5000, type: "essential", indexation: 3.0 },
      { description: "Annual Holiday", amount: 8000, type: "desirable", indexation: 2.5 },
    ],
    futureExpenses: [
      { description: "Car Replacement", amount: 35000, startYear: 2030, endYear: 2030, indexation: 2.5, type: "desirable" },
    ],
  },
  legislation: {
    taxBrackets: DEFAULT_TAX_BRACKETS_2024,
    superParams: DEFAULT_SUPER_PARAMS,
    centrelink: DEFAULT_CENTRELINK,
    medicare: DEFAULT_MEDICARE,
  },
  returnProfiles: DEFAULT_RETURN_PROFILES,
  assetReturns: DEFAULT_ASSET_RETURNS,
};

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [state, setState] = useState(DEFAULT_STATE);

  const projectionData = useMemo(() => runProjection(state, false), [state]);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>F</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.5 }}>Australian Financial Planner</div>
            <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 0.5 }}>CASHFLOW · TAX · SUPER · CENTRELINK · MONTE CARLO</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: COLORS.textDim }}>
          {state.personal.person1.name}{state.personal.isCouple ? ` & ${state.personal.person2.name}` : ""}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "0 16px", display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
              color: tab === t.id ? COLORS.accent : COLORS.textDim, padding: "10px 14px", fontSize: 12, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: tab === t.id ? 600 : 400, whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >
            <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 60px" }}>
        {tab === "dashboard" && <DashboardTab state={state} projectionData={projectionData} />}
        {tab === "personal" && <PersonalTab state={state} setState={setState} />}
        {tab === "income" && <IncomeTab state={state} setState={setState} />}
        {tab === "assets" && <AssetsTab state={state} setState={setState} />}
        {tab === "expenses" && <ExpensesTab state={state} setState={setState} />}
        {tab === "projections" && <ProjectionsTab state={state} projectionData={projectionData} />}
        {tab === "monte_carlo" && <MonteCarloTab state={state} />}
        {tab === "tax_rates" && <TaxTab state={state} setState={setState} />}
        {tab === "returns" && <ReturnsTab state={state} setState={setState} />}
      </div>
    </div>
  );
}
