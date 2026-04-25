import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function AssetsTab({ state, setState, scenario, onActivateAfter, onActivateNow, onResetAfter, afterState }) {
  const { assets, personal } = state;
  const profiles = Object.keys(state.returnProfiles);
  const returnProfiles = state.returnProfiles;
  const assetReturns = state.assetReturns;

  const updSuper = (key, field, val) => setState(s => ({ ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: { ...s.assets.superAccounts[key], [field]: val } } } }));
  const updNonSuper = (key, field, val) => setState(s => ({ ...s, assets: { ...s.assets, nonSuper: { ...s.assets.nonSuper, [key]: { ...s.assets.nonSuper[key], [field]: val } } } }));

  const addLifestyle = () => setState(s => ({ ...s, assets: { ...s.assets, lifestyleAssets: [...s.assets.lifestyleAssets, { description: "", value: 0, growth: 2.5, isPrimaryResidence: false }] } }));
  const updLifestyle = (i, f, v) => setState(s => {
    const arr = [...s.assets.lifestyleAssets]; arr[i] = { ...arr[i], [f]: v }; return { ...s, assets: { ...s.assets, lifestyleAssets: arr } };
  });
  const rmLifestyle = (i) => setState(s => ({ ...s, assets: { ...s.assets, lifestyleAssets: s.assets.lifestyleAssets.filter((_, j) => j !== i) } }));

  const addLiability = () => {};
  const updLiability = () => {};
  const rmLiability = () => {};

  const SuperForm = ({ sKey, label }) => {
    const acc = assets.superAccounts[sKey];
    const isPension = acc.type === "pension";
    const isTTR = acc.type === "ttr";
    const isAccum = acc.type === "accumulation";
    const hasConversion = isAccum && acc.pensionConversionYear;
    const convYear = acc.pensionConversionYear || "";
    const currentYear = new Date().getFullYear();

    // Projected balance at conversion year (simple estimate for display)
    const yearsToConversion = convYear ? Math.max(0, parseInt(convYear) - currentYear) : 0;
    const projectedAtConversion = convYear && acc.balance > 0
      ? Math.round(acc.balance * Math.pow(1.065, yearsToConversion))
      : null;
    const retainAmount = acc.pensionRetainAmount ?? 5000;
    const projectedPension = projectedAtConversion != null
      ? (acc.pensionConversionType === "partial" ? Math.max(0, projectedAtConversion - retainAmount) : projectedAtConversion)
      : null;
    const projectedRemaining = acc.pensionConversionType === "partial" && projectedAtConversion != null
      ? Math.min(retainAmount, projectedAtConversion)
      : null;

    return (
      <Card title={label}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Balance" value={acc.balance} onChange={(v) => updSuper(sKey, "balance", v)} prefix="$" />
            <Input label="Tax-Free Component" value={acc.taxFree} onChange={(v) => updSuper(sKey, "taxFree", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Select label="Portfolio Profile" value={acc.profile} onChange={(v) => updSuper(sKey, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} />
            <Select label="Account Type" value={acc.type} onChange={(v) => updSuper(sKey, "type", v)}
              options={[
                { value: "accumulation", label: "Accumulation" },
                { value: "ttr", label: "Transition to Retirement" },
                { value: "pension", label: "Account-Based Pension" },
              ]} />
          </div>

          {/* Tax rate info banner */}
          <div style={{ padding: "6px 10px", background: isPension ? `${COLORS.green}15` : isTTR ? `${COLORS.orange}15` : `${COLORS.accent}12`, borderRadius: 6, fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: isPension ? COLORS.green : isTTR ? COLORS.orange : COLORS.accent }}>
            {isTTR && "⚠ Transition to Retirement — requires age 60+ (conditions of release). Income return taxed at 15%; capital gains 0% tax-free. Draws replace reduced work income: min 4%, max 10% pa. No lump sums permitted (SIS Reg 6.01)."}
            {isPension && "✓ Account-Based Pension — tax-free earnings and draws after age 60. No maximum drawdown. Lump sums permitted tax-free. Min 4% pa applies."}
            {isAccum && !hasConversion && "Accumulation — earnings taxed at 15%. Set a pension start date below to plan the conversion."}
            {isAccum && hasConversion && "Accumulation — pension conversion scheduled. Earnings taxed at 15% until conversion date, then 0%."}
          </div>

          {/* Pension drawdown - only for pension/TTR */}
          {(isPension || isTTR) && (
            <Input
              label={isTTR ? "TTR Income Draw (min 4%, max 10% pa)" : "Pension Drawdown — min 4% pa (no max)"}
              value={acc.drawdownPct}
              onChange={(v) => updSuper(sKey, "drawdownPct", isTTR ? Math.min(10, Math.max(4, v)) : Math.max(4, v))}
              suffix="%"
            />
          )}

          {/* Pension conversion for accumulation accounts */}
          {isAccum && (
            <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8, border: `1px solid ${hasConversion ? COLORS.green + "50" : COLORS.border}` }}>
              <div style={{ color: COLORS.text, fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
                Pension Conversion (Future Date)
              </div>
              <p style={{ color: COLORS.textDim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginBottom: 8 }}>
                From preservation age 60 you can convert to an Account-Based Pension. Earnings become tax-free and the account enters pension phase for Centrelink assessment.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <FYInput label="Pension Start FY" value={convYear} onChange={(v) => updSuper(sKey, "pensionConversionYear", v || null)} />
                <Select label="Conversion Type" value={acc.pensionConversionType || "full"}
                  onChange={(v) => updSuper(sKey, "pensionConversionType", v)}
                  options={[{ value: "full", label: "Full balance" }, { value: "partial", label: "Partial (keep some in accum)" }]} />
              </div>
              {hasConversion && acc.pensionConversionType === "partial" && (
                <div style={{ marginTop: 8 }}>
                  <Input label="Retain in Accumulation ($)" value={retainAmount} onChange={(v) => updSuper(sKey, "pensionRetainAmount", v)} prefix="$" />
                </div>
              )}
              {hasConversion && projectedAtConversion != null && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: COLORS.card, borderRadius: 6, border: `1px solid ${COLORS.green}40` }}>
                  <div style={{ color: COLORS.textDim, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Estimated balance at {convYear} (6.5% pa)</div>
                  <div style={{ display: "grid", gridTemplateColumns: acc.pensionConversionType === "partial" ? "1fr 1fr" : "1fr", gap: 8 }}>
                    <div>
                      <div style={{ color: COLORS.textDim, fontSize: 9 }}>→ Account-Based Pension</div>
                      <div style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{fmt(projectedPension)}</div>
                      <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 2 }}>0% tax on earnings</div>
                    </div>
                    {acc.pensionConversionType === "partial" && projectedRemaining != null && (
                      <div>
                        <div style={{ color: COLORS.textDim, fontSize: 9 }}>→ Stays in Accumulation</div>
                        <div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{fmt(projectedRemaining)}</div>
                        <div style={{ color: COLORS.textDim, fontSize: 9, marginTop: 2 }}>15% tax on earnings</div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Input label="Drawdown % (from conversion date)" value={acc.drawdownPct} onChange={(v) => updSuper(sKey, "drawdownPct", v)} suffix="%" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Investment Costs (% p.a.)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Admin Fee" value={acc.adminFee ?? 0.15} onChange={(v) => updSuper(sKey, "adminFee", v)} suffix="%" />
            <Input label="Management Cost" value={acc.managementCost ?? 0.60} onChange={(v) => updSuper(sKey, "managementCost", v)} suffix="%" />
            <Input label="Advice Cost" value={acc.adviceCost ?? 0.50} onChange={(v) => updSuper(sKey, "adviceCost", v)} suffix="%" />
          </div>
          <ReturnSummary profile={acc.profile} adminFee={acc.adminFee ?? 0.15} managementCost={acc.managementCost ?? 0.60} adviceCost={acc.adviceCost ?? 0.50} returnProfiles={returnProfiles} assetReturns={assetReturns} />
        </div>
      </Card>
    );
  };

  const NonSuperForm = ({ nKey, label }) => {
    const acc = assets.nonSuper[nKey];
    if (!acc) return null;
    return (
      <Card title={label}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Balance" value={acc.balance} onChange={(v) => updNonSuper(nKey, "balance", v)} prefix="$" />
            <Input label="Unrealised Gains" value={acc.unrealisedGains} onChange={(v) => updNonSuper(nKey, "unrealisedGains", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Select label="Portfolio Profile" value={acc.profile} onChange={(v) => updNonSuper(nKey, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} />
            <Select label="Owner" value={acc.owner || nKey.replace("NonSuper","").replace("p1","p1").replace("p2","p2")} onChange={(v) => updNonSuper(nKey, "owner", v)}
              options={[{ value: "p1", label: personal.person1.name || "Person 1" }, ...(personal.isCouple ? [{ value: "p2", label: personal.person2.name || "Person 2" }] : []), { value: "joint", label: "Joint" }]} />
          </div>

          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginTop: 4 }}>Investment Costs (% p.a.)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Admin Fee" value={acc.adminFee ?? 0} onChange={(v) => updNonSuper(nKey, "adminFee", v)} suffix="%" />
            <Input label="Management Cost" value={acc.managementCost ?? 0.60} onChange={(v) => updNonSuper(nKey, "managementCost", v)} suffix="%" />
            <Input label="Advice Cost" value={acc.adviceCost ?? 0.50} onChange={(v) => updNonSuper(nKey, "adviceCost", v)} suffix="%" />
          </div>
          <ReturnSummary profile={acc.profile} adminFee={acc.adminFee ?? 0} managementCost={acc.managementCost ?? 0.60} adviceCost={acc.adviceCost ?? 0.50} returnProfiles={returnProfiles} assetReturns={assetReturns} />

          <div style={{ marginTop: 4 }}>
            <label style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: 6 }}>Asset Type</label>
            <div className="flex gap-2">
              <Btn small active={!acc.isDirectProperty} onClick={() => updNonSuper(nKey, "isDirectProperty", false)} color={COLORS.accent}>Managed Portfolio</Btn>
              <Btn small active={!!acc.isDirectProperty} onClick={() => updNonSuper(nKey, "isDirectProperty", true)} color={COLORS.orange}>Direct Property</Btn>
            </div>
          </div>

          {acc.isDirectProperty && (
            <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>Property Running Costs (p.a.)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <Input label="Council Rates" value={acc.councilRates ?? 0} onChange={(v) => updNonSuper(nKey, "councilRates", v)} prefix="$" />
                <Input label="Insurance" value={acc.propertyInsurance ?? 0} onChange={(v) => updNonSuper(nKey, "propertyInsurance", v)} prefix="$" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end", marginTop: 8 }}>
                <Input label="Agent Management Fee" value={acc.agentFee ?? 0} onChange={(v) => updNonSuper(nKey, "agentFee", v)} suffix="%" />
                <Input label="Repairs & Maintenance" value={acc.repairs ?? 0} onChange={(v) => updNonSuper(nKey, "repairs", v)} prefix="$" />
              </div>
              {acc.balance > 0 && (
                <div style={{ marginTop: 8, padding: "6px 8px", background: COLORS.card, borderRadius: 6, fontSize: 11, color: COLORS.textDim, fontFamily: "'DM Sans', sans-serif" }}>
                  Est. annual running costs: <span style={{ color: COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {fmt(Math.round((acc.councilRates || 0) + (acc.propertyInsurance || 0) + (acc.balance * (acc.agentFee || 0) / 100) + (acc.repairs || 0)))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const newExtraAcct = (type) => ({ balance: 0, taxFree: 0, profile: "Balanced", type, drawdownPct: 5, adminFee: 0.15, managementCost: 0.60, adviceCost: 0.50, description: "" });
  const addExtraSuper = (person, type) => setState(s => {
    const key = `${person}Extra`;
    return { ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: [...(s.assets.superAccounts[key] || []), newExtraAcct(type)] } } };
  });
  const updExtraSuper = (person, i, field, val) => setState(s => {
    const key = `${person}Extra`;
    const arr = [...(s.assets.superAccounts[key] || [])];
    arr[i] = { ...arr[i], [field]: val };
    return { ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: arr } } };
  });
  const rmExtraSuper = (person, i) => setState(s => {
    const key = `${person}Extra`;
    return { ...s, assets: { ...s.assets, superAccounts: { ...s.assets.superAccounts, [key]: (s.assets.superAccounts[key] || []).filter((_, j) => j !== i) } } };
  });

  const ExtraSuper = ({ person, idx }) => {
    const key = `${person}Extra`;
    const acc = (assets.superAccounts[key] || [])[idx];
    if (!acc) return null;
    const isPension = acc.type === "pension";
    const isTTR = acc.type === "ttr";
    return (
      <Card title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>{acc.description || `Additional Account ${idx + 1}`}<span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: isPension ? `${COLORS.green}20` : isTTR ? `${COLORS.orange}20` : `${COLORS.accent}15`, color: isPension ? COLORS.green : isTTR ? COLORS.orange : COLORS.accent }}>{isPension ? "Pension" : isTTR ? "TTR" : "Accumulation"}</span></span>}
           actions={<button onClick={() => rmExtraSuper(person, idx)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 18 }}>×</button>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Input label="Account Description / Fund Name" value={acc.description} onChange={(v) => updExtraSuper(person, idx, "description", v)} type="text" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Input label="Balance" value={acc.balance} onChange={(v) => updExtraSuper(person, idx, "balance", v)} prefix="$" />
            <Input label="Tax-Free Component" value={acc.taxFree} onChange={(v) => updExtraSuper(person, idx, "taxFree", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <Select label="Portfolio Profile" value={acc.profile} onChange={(v) => updExtraSuper(person, idx, "profile", v)} options={profiles.map(p => ({ value: p, label: p }))} />
            <Select label="Account Type" value={acc.type} onChange={(v) => updExtraSuper(person, idx, "type", v)}
              options={[{ value: "accumulation", label: "Accumulation" }, { value: "ttr", label: "Transition to Retirement" }, { value: "pension", label: "Account-Based Pension" }]} />
          </div>
          {(isPension || isTTR) && <Input label={isTTR ? "TTR Drawdown (max 10% pa)" : "Pension Drawdown (% pa)"} value={acc.drawdownPct} onChange={(v) => updExtraSuper(person, idx, "drawdownPct", Math.min(isTTR ? 10 : 100, v))} suffix="%" />}
          <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700 }}>Investment Costs (% p.a.)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            <Input label="Admin Fee" value={acc.adminFee ?? 0.15} onChange={(v) => updExtraSuper(person, idx, "adminFee", v)} suffix="%" />
            <Input label="Management Cost" value={acc.managementCost ?? 0.60} onChange={(v) => updExtraSuper(person, idx, "managementCost", v)} suffix="%" />
            <Input label="Advice Cost" value={acc.adviceCost ?? 0.50} onChange={(v) => updExtraSuper(person, idx, "adviceCost", v)} suffix="%" />
          </div>
          <ReturnSummary profile={acc.profile} adminFee={acc.adminFee ?? 0.15} managementCost={acc.managementCost ?? 0.60} adviceCost={acc.adviceCost ?? 0.50} returnProfiles={returnProfiles} assetReturns={assetReturns} />
        </div>
      </Card>
    );
  };

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Assets" />


      {/* Person 1 Super */}
      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 10 }}>{personal.person1.name || "Person 1"} — Superannuation</h3>
      <SuperForm sKey="p1Super" label={`${personal.person1.name || "Person 1"} – Super`} />
      <SuperForm sKey="p1Pension" label={`${personal.person1.name || "Person 1"} – Pension`} />
      {(assets.superAccounts.p1Extra || []).map((_, i) => <ExtraSuper key={i} person="p1" idx={i} />)}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Btn onClick={() => addExtraSuper("p1", "accumulation")} color={COLORS.accent}>+ Add Accumulation Account</Btn>
        <Btn onClick={() => addExtraSuper("p1", "pension")} color={COLORS.green}>+ Add Pension Account</Btn>
      </div>

      {personal.isCouple && <>
        {/* Person 2 Super */}
        <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginTop: 20, marginBottom: 10 }}>{personal.person2.name || "Person 2"} — Superannuation</h3>
        <SuperForm sKey="p2Super" label={`${personal.person2.name || "Person 2"} – Super`} />
        <SuperForm sKey="p2Pension" label={`${personal.person2.name || "Person 2"} – Pension`} />
        {(assets.superAccounts.p2Extra || []).map((_, i) => <ExtraSuper key={i} person="p2" idx={i} />)}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Btn onClick={() => addExtraSuper("p2", "accumulation")} color={COLORS.accent}>+ Add Accumulation Account</Btn>
          <Btn onClick={() => addExtraSuper("p2", "pension")} color={COLORS.green}>+ Add Pension Account</Btn>
        </div>
      </>}

      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, marginTop: 8, fontWeight: 600 }}>Non-Superannuation Investments</h3>
      <NonSuperForm nKey="p1NonSuper" label={`${personal.person1.name || "Person 1"} – Non-Super`} />
      {assets.nonSuper.p1NonSuper2 && <NonSuperForm nKey="p1NonSuper2" label={`${personal.person1.name || "Person 1"} – Non-Super 2`} />}
      <div style={{ marginBottom: 16 }}>
        <Btn onClick={() => setState(s => ({ ...s, assets: { ...s.assets, nonSuper: { ...s.assets.nonSuper, p1NonSuper2: s.assets.nonSuper.p1NonSuper2 ? undefined : { balance: 0, unrealisedGains: 0, profile: "Balanced", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false } } } }))} color={COLORS.accent}>
          {assets.nonSuper.p1NonSuper2 ? `− Remove ${personal.person1.name || "Person 1"} Non-Super 2` : `+ Add ${personal.person1.name || "Person 1"} Non-Super Account`}
        </Btn>
      </div>

      {personal.isCouple && <>
        <NonSuperForm nKey="p2NonSuper" label={`${personal.person2.name || "Person 2"} – Non-Super`} />
        {assets.nonSuper.p2NonSuper2 && <NonSuperForm nKey="p2NonSuper2" label={`${personal.person2.name || "Person 2"} – Non-Super 2`} />}
        <div style={{ marginBottom: 16 }}>
          <Btn onClick={() => setState(s => ({ ...s, assets: { ...s.assets, nonSuper: { ...s.assets.nonSuper, p2NonSuper2: s.assets.nonSuper.p2NonSuper2 ? undefined : { balance: 0, unrealisedGains: 0, profile: "Balanced", adminFee: 0, managementCost: 0.60, adviceCost: 0.50, isDirectProperty: false } } } }))} color={COLORS.accent}>
            {assets.nonSuper.p2NonSuper2 ? `− Remove ${personal.person2.name || "Person 2"} Non-Super 2` : `+ Add ${personal.person2.name || "Person 2"} Non-Super Account`}
          </Btn>
        </div>
      </>}

      {/* ── Principal Place of Residence ─────────────────────── */}
      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 8, marginTop: 24, fontWeight: 600 }}>Family Home</h3>
      <div style={{ padding: "8px 12px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 10 }}>
        <p style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Your home is excluded from all net wealth calculations — you need somewhere to live. It is still counted as a homeowner asset for the Centrelink assets test threshold.
        </p>
      </div>
      {assets.lifestyleAssets.map((a, realIdx) => a.isPrimaryResidence ? (
        <Card key={realIdx} title={a.description || "Principal Residence"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Description" value={a.description} onChange={(v) => updLifestyle(realIdx, "description", v)} type="text" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 , alignItems: "end" }}>
              <Input label="Current Value" value={a.value} onChange={(v) => updLifestyle(realIdx, "value", v)} prefix="$" />
              <Input label="Growth p.a." value={a.growth} onChange={(v) => updLifestyle(realIdx, "growth", v)} suffix="%" />
            </div>
            <div style={{ padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ color: COLORS.textDim, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Downsize Event</div>
              <p style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
                Enter the year you plan to downsize and the net proceeds released. These will be automatically added to your chosen investment pool in that year.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 , alignItems: "end" }}>
                  <FYInput label="Downsize FY" value={a.downsizeYear || ""} onChange={(v) => updLifestyle(realIdx, "downsizeYear", v)} />
                  <Input label="Net Proceeds" value={a.downsizeProceeds || ""} onChange={(v) => updLifestyle(realIdx, "downsizeProceeds", v)} prefix="$" />
                </div>
                <Select label="Allocate Proceeds To" value={a.downsizeAllocateTo || "joint"}
                  onChange={(v) => updLifestyle(realIdx, "downsizeAllocateTo", v)}
                  options={[
                    { value: "joint", label: "Joint" },
                    { value: "p1NonSuper", label: `${personal.person1.name || "Person 1"} Non-Super` },
                    ...(personal.isCouple ? [{ value: "p2NonSuper", label: `${personal.person2.name || "Person 2"} Non-Super` }] : []),
                  ]}
                />
              </div>
              {(a.downsizeYear || 0) > 0 && (a.downsizeProceeds || 0) > 0 && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: `${COLORS.green}20`, border: `1px solid ${COLORS.green}40`, borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: COLORS.green, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                    ✓ In {a.downsizeYear}, {fmt(a.downsizeProceeds)} will flow into {a.downsizeAllocateTo === "joint" ? "Joint Investments" : a.downsizeAllocateTo === "p1NonSuper" ? (personal.person1.name || "Person 1") + " Non-Super" : (personal.person2.name || "Person 2") + " Non-Super"}.
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : null)}


      {/* ── Other Lifestyle Assets ────────────────────────────── */}
      <h3 style={{ color: COLORS.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 8, marginTop: 24, fontWeight: 600 }}>Other Lifestyle Assets</h3>
      <div style={{ padding: "8px 12px", background: `${COLORS.orange}15`, border: `1px solid ${COLORS.orange}40`, borderRadius: 8, marginBottom: 10 }}>
        <p style={{ color: COLORS.orange, fontSize: 11, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Cars, boats, art, jewellery etc. These appear in your Lifestyle Assets chart. You can record a planned sale with the proceeds going to investments or cash.
        </p>
      </div>
      {assets.lifestyleAssets.map((a, realIdx) => !a.isPrimaryResidence ? (
        <Card key={realIdx} title={a.description || `Asset ${realIdx+1}`} actions={<button onClick={() => rmLifestyle(realIdx)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 18 }}>×</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Description" value={a.description} onChange={(v) => updLifestyle(realIdx, "description", v)} type="text" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 , alignItems: "end" }}>
              <Input label="Current Value" value={a.value} onChange={(v) => updLifestyle(realIdx, "value", v)} prefix="$" />
              <Input label="Growth p.a." value={a.growth} onChange={(v) => updLifestyle(realIdx, "growth", v)} suffix="%" />
            </div>
            <div style={{ padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ color: COLORS.textDim, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Planned Sale</div>
              <p style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                Record a future sale of this asset. Proceeds will be redirected to investments in the sale year.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 , alignItems: "end" }}>
                  <FYInput label="Sale FY" value={a.saleYear || ""} onChange={(v) => updLifestyle(realIdx, "saleYear", v)} />
                  <Input label="Sale Proceeds" value={a.saleProceeds || ""} onChange={(v) => updLifestyle(realIdx, "saleProceeds", v)} prefix="$" />
                </div>
                <Select label="Allocate Proceeds To" value={a.saleAllocateTo || "joint"}
                  onChange={(v) => updLifestyle(realIdx, "saleAllocateTo", v)}
                  options={[
                    { value: "joint", label: "Joint" },
                    { value: "p1NonSuper", label: `${personal.person1.name || "Person 1"} Non-Super` },
                    ...(personal.isCouple ? [{ value: "p2NonSuper", label: `${personal.person2.name || "Person 2"} Non-Super` }] : []),
                  ]}
                />
              </div>
              {(a.saleYear || 0) > 0 && (a.saleProceeds || 0) > 0 && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: `${COLORS.green}20`, border: `1px solid ${COLORS.green}40`, borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: COLORS.green, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                    ✓ In {a.saleYear}, {fmt(a.saleProceeds)} will flow into {a.saleAllocateTo === "joint" ? "Joint Investments" : a.saleAllocateTo === "p1NonSuper" ? (personal.person1.name || "Person 1") + " Non-Super" : (personal.person2.name || "Person 2") + " Non-Super"}.
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : null)}
      <Btn onClick={addLifestyle} color={COLORS.green}>+ Add Lifestyle Asset</Btn>
    </div>
  );
}

// ============================================================
// EXPENSES TAB
// ============================================================
