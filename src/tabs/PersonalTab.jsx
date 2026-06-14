import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function PersonalTab({ state, setState }) {
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
        <div className="flex gap-3" style={{ marginBottom: 16 }}>
          <Btn active={personal.isHomeowner} onClick={() => upd("isHomeowner", !personal.isHomeowner)} color={COLORS.green}>
            {personal.isHomeowner ? "✓ Homeowner" : "Renter"}
          </Btn>
          <Btn active={personal.hasPrivateHealth} onClick={() => upd("hasPrivateHealth", !personal.hasPrivateHealth)} color={COLORS.cyan}>
            {personal.hasPrivateHealth ? "✓ Private Health" : "No Private Health"}
          </Btn>
          <Btn active={!!personal.illnessSeparated} onClick={() => upd("illnessSeparated", !personal.illnessSeparated)} color={COLORS.orange}>
            {personal.illnessSeparated ? "✓ Illness Separated" : "Illness Separated"}
          </Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end" }}>
          <Input
            label="Dependent Children (for Medicare levy threshold)"
            value={personal.dependentChildren || 0}
            onChange={(v) => upd("dependentChildren", Math.max(0, Math.round(v || 0)))}
          />
          <div style={{ paddingBottom: 4 }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>
              Private health cover exempts you from the Medicare Levy Surcharge (MLS). Each dependent child raises the MLS family threshold by $1,500.
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: personal.isCouple ? "1fr 1fr" : "1fr", gap: 16, alignItems: "start" }}>
        <Card title={personal.isCouple ? (personal.person1.name || "Person 1") : "Your Details"}>
          <div className="flex flex-col gap-3">
            <Input label="Name" value={personal.person1.name} onChange={(v) => updP1("name", v)} type="text" />
            <DateInput label="Date of Birth (DD/MM/YYYY)" value={personal.person1.dob || `${personal.person1.birthYear || 1965}-07-01`} onChange={(v) => { updP1("dob", v); const yr = v ? parseInt(v.split("-")[0]) : null; if (yr) updP1("birthYear", yr); }} />
            <Select label="Gender" value={personal.person1.gender} onChange={(v) => updP1("gender", v)} options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]} />
            <Select label="Employment Status" value={personal.person1.employmentStatus} onChange={(v) => updP1("employmentStatus", v)}
              options={[{ value: "employed", label: "Employed" }, { value: "selfEmployed", label: "Self-Employed" }, { value: "retired", label: "Retired" }, { value: "notWorking", label: "Not Working" }]} />
            <Input label="Retirement Age" value={personal.person1.retirementAge} onChange={(v) => updP1("retirementAge", v)} />
            <Input label="Life Expectancy" value={personal.person1.lifeExpectancy} onChange={(v) => updP1("lifeExpectancy", v)} />
          </div>
        </Card>

        {personal.isCouple && (
          <Card title={personal.person2.name || "Person 2"}>
            <div className="flex flex-col gap-3">
              <Input label="Name" value={personal.person2.name} onChange={(v) => updP2("name", v)} type="text" />
              <DateInput label="Date of Birth (DD/MM/YYYY)" value={personal.person2.dob || `${personal.person2.birthYear || 1970}-07-01`} onChange={(v) => { updP2("dob", v); const yr = v ? parseInt(v.split("-")[0]) : null; if (yr) updP2("birthYear", yr); }} />
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 , alignItems: "end" }}>
          <Input label="Inflation Rate (%)" value={personal.inflationRate} onChange={(v) => upd("inflationRate", v)} suffix="%" />
          <Input label="Salary Growth (%)" value={personal.salaryGrowth} onChange={(v) => upd("salaryGrowth", v)} suffix="%" />
          <Input label="Projection Years" value={personal.projectionYears} onChange={(v) => upd("projectionYears", v)} />
        </div>
      </Card>

      <Card title="Centrelink & Age Pension">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4, fontWeight: 600 }}>Assets Test (homeowners)</div>
            <div style={{ fontSize: 11, color: COLORS.text }}>
              Single: full pension below {fmt(321500)}, tapers to zero around {fmt(643750)}
            </div>
            <div style={{ fontSize: 11, color: COLORS.text }}>
              Couple: full pension below {fmt(481500)}, tapers to zero around {fmt(956500)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4, fontWeight: 600 }}>Income Test</div>
            <div style={{ fontSize: 11, color: COLORS.text }}>
              Single: full pension below {fmt(5668)}/yr, reduces 50¢ per $ above
            </div>
            <div style={{ fontSize: 11, color: COLORS.text }}>
              Couple: full pension below {fmt(9880)}/yr combined, reduces 50¢ per $ above
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 12px", background: COLORS.infoBg || "#ece8e1", borderRadius: 8, fontSize: 11, color: COLORS.textDim, lineHeight: 1.6 }}>
          <strong style={{ color: COLORS.text }}>Gifting rules</strong> — Centrelink allows up to {fmt(10000)} per year (max {fmt(30000)} over 5 years) without affecting your pension. Gifts above these limits are treated as <em>deprived assets</em> for 5 years.
          <br />
          <strong style={{ color: COLORS.accent }}>→ Record your gifts in the Legislation tab → Centrelink section</strong>. That is also where you can adjust the age pension thresholds, deeming rates, and asset taper rate if they've been updated by Services Australia.
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// INCOME TAB
// ============================================================
