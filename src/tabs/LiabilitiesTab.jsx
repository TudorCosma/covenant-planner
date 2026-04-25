import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { COLORS, THEMES } from "../data/themes";
import { TABS } from "../data/tabs";
import { ASSET_LABELS, DEFAULT_RETURN_PROFILES, DEFAULT_ASSET_RETURNS } from "../data/returnProfiles";
import { DEFAULT_TAX_BRACKETS_2024, DEFAULT_SUPER_PARAMS, DEFAULT_CENTRELINK, DEFAULT_MEDICARE } from "../data/tax2024";
import { Input, DateInput, FYInput, Select, Card, StatCard, Btn, Modal, HeaderBtn, ScenarioToggle, ReturnSummary, FinancialAssistant } from "../components";
import { fmt, pct, calcIncomeTax, calcMedicare, boxMullerRandom, calcDeprivedAssets, calcCentrelinkPension, calcDeemedIncome, getMonthlyEquiv, calcLoanPayoff, runProjection } from "../lib";
export function LiabilitiesTab({ state, setState, scenario, onActivateAfter, onActivateNow, onResetAfter, afterState }) {
  const { assets, personal } = state;
  const loans = assets.loans || [];
  const n1 = personal.person1.name || "Person 1";
  const n2 = personal.person2.name || "Person 2";
  const isCouple = personal.isCouple;

  const allAssets = [
    { value: "", label: "— None —" },
    ...assets.lifestyleAssets.map((a, i) => ({ value: `lifestyle_${i}`, label: a.description || `Lifestyle ${i+1}` })),
    { value: "p1NonSuper", label: `${n1} Non-Super` },
    ...(isCouple ? [{ value: "p2NonSuper", label: `${n2} Non-Super` }] : []),
    { value: "joint", label: "Joint" },
  ];

  const addLoan = () => setState(s => ({ ...s, assets: { ...s.assets, loans: [...(s.assets.loans || []), {
    description: "", balance: 0, variableRate: 6.5, fixedRate: 6.0, fixedTermMonths: 0,
    termMonths: 360, repaymentType: "pi", frequency: "monthly", extraRepayment: 0,
    deductible: false, owner: "joint", linkedAsset: "",
  }] } }));

  const updLoan = (i, f, v) => setState(s => {
    const arr = [...(s.assets.loans || [])]; arr[i] = { ...arr[i], [f]: v };
    return { ...s, assets: { ...s.assets, loans: arr } };
  });

  const rmLoan = (i) => setState(s => ({ ...s, assets: { ...s.assets, loans: (s.assets.loans || []).filter((_, j) => j !== i) } }));

  return (
    <div>
      <ScenarioToggle scenario={scenario} onActivateAfter={onActivateAfter} onActivateNow={onActivateNow} onResetAfter={onResetAfter} afterState={afterState} tabName="Liabilities" />
      <div style={{ padding: "10px 14px", background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 8 }}>
        <p style={{ color: COLORS.accent, fontSize: 12, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Add loans and debts. Only tax-deductible interest reduces your taxable income. Link each loan to the asset it funds.</p>
      </div>

      {loans.map((loan, i) => {
        const minMonthlyPmt = loan.balance > 0 && loan.repaymentType === "pi" ? (() => {
          const r = (loan.fixedTermMonths > 0 && loan.fixedRate ? loan.fixedRate : loan.variableRate || 6) / 100 / 12;
          const n = loan.termMonths || 360;
          return r > 0 ? (loan.balance * r) / (1 - Math.pow(1 + r, -n)) : loan.balance / n;
        })() : (loan.balance || 0) * ((loan.variableRate || 6) / 100 / 12);

        const minByFreq = (freq) => {
          if (freq === "weekly") return minMonthlyPmt * 12 / 52;
          if (freq === "fortnightly") return minMonthlyPmt * 12 / 26;
          return minMonthlyPmt;
        };

        const totalRepayment = minByFreq(loan.frequency) + (loan.extraRepayment || 0);

        // Calculate per-period payment for current frequency
        const monthlyTotal = minMonthlyPmt + getMonthlyEquiv(loan.extraRepayment || 0, loan.frequency);
        let perPeriodPmt;
        if (loan.frequency === "weekly") perPeriodPmt = monthlyTotal / 4;
        else if (loan.frequency === "fortnightly") perPeriodPmt = monthlyTotal / 2;
        else perPeriodPmt = monthlyTotal;

        const payoff = calcLoanPayoff(loan.balance, loan.variableRate, perPeriodPmt, loan.frequency, loan.repaymentType, loan.fixedRate, loan.fixedTermMonths, loan.termMonths);
        const currentYear = new Date().getFullYear();
        const payoffDate = new Date(currentYear, payoff.payoffMonth);
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

        // Frequency comparison — split the SAME monthly amount into different frequencies
        // Weekly: monthly / (52/12) = monthly * 12/52 per week, but 52 payments = slightly more per year
        // The savings come from: monthly_pmt/4 * 52 = monthly_pmt * 13 (one extra month per year)
        const freqs = ["monthly", "fortnightly", "weekly"];
        const monthlyMinPmt = minMonthlyPmt + getMonthlyEquiv(loan.extraRepayment || 0, loan.frequency);
        const comparisons = freqs.map(freq => {
          // Convert the monthly payment to per-period: same $ per period as monthly/4 (weekly) or monthly/2 (fortnightly)
          let perPeriodPmt;
          if (freq === "weekly") perPeriodPmt = monthlyMinPmt / 4; // same fortnightly rhythm, 52 payments = 13 months
          else if (freq === "fortnightly") perPeriodPmt = monthlyMinPmt / 2; // 26 payments = 13 months
          else perPeriodPmt = monthlyMinPmt; // 12 payments = 12 months
          const pf = calcLoanPayoff(loan.balance, loan.variableRate, perPeriodPmt, freq, loan.repaymentType, loan.fixedRate, loan.fixedTermMonths, loan.termMonths);
          return { freq, perPeriodPmt, ...pf };
        });
        const basePf = comparisons.find(c => c.freq === "monthly");
        
        return (
        <Card key={i} title={loan.description || `Loan ${i+1}`} actions={<button onClick={() => rmLoan(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 18 }}>×</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
            <Input label="Description" value={loan.description} onChange={(v) => updLoan(i, "description", v)} type="text" />
            <Input label="Loan Balance" value={loan.balance} onChange={(v) => updLoan(i, "balance", v)} prefix="$" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
            <Input label="Variable Rate" value={loan.variableRate} onChange={(v) => updLoan(i, "variableRate", v)} suffix="%" />
            <Input label="Fixed Rate" value={loan.fixedRate} onChange={(v) => updLoan(i, "fixedRate", v)} suffix="%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
            <Input label="Fixed Term (months)" value={loan.fixedTermMonths} onChange={(v) => updLoan(i, "fixedTermMonths", v)} />
            <Input label="Loan Term (months)" value={loan.termMonths} onChange={(v) => updLoan(i, "termMonths", v)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
            <Select label="Repayment Type" value={loan.repaymentType} onChange={(v) => updLoan(i, "repaymentType", v)}
              options={[{ value: "pi", label: "Principal & Interest" }, { value: "io", label: "Interest Only" }]} />
            <Select label="Frequency" value={loan.frequency} onChange={(v) => updLoan(i, "frequency", v)}
              options={[{ value: "monthly", label: "Monthly" }, { value: "fortnightly", label: "Fortnightly" }, { value: "weekly", label: "Weekly" }]} />
          </div>

          {loan.balance > 0 && (
            <div style={{ padding: 10, background: COLORS.infoBg || "#ece8e1", borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 , alignItems: "end" }}>
                <div>
                  <span style={{ color: COLORS.textDim, fontSize: 10 }}>Min. Repayment ({loan.frequency || "monthly"})</span>
                  <div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}>{fmt(Math.round(minByFreq(loan.frequency)))}</div>
                </div>
                <Input label={`Extra Repayment (${loan.frequency || "monthly"})`} value={loan.extraRepayment || 0} onChange={(v) => updLoan(i, "extraRepayment", v)} prefix="$" />
              </div>
              {(loan.extraRepayment || 0) > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: COLORS.green, fontFamily: "'DM Sans', sans-serif" }}>
                  Total repayment: {fmt(Math.round(totalRepayment))} per {loan.frequency || "month"}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, alignItems: "end" }}>
            <Select label="Owner" value={loan.owner} onChange={(v) => updLoan(i, "owner", v)}
              options={[{ value: "p1", label: n1 }, ...(isCouple ? [{ value: "p2", label: n2 }] : []), { value: "joint", label: "Joint" }]} />
            <Select label="Linked Asset" value={loan.linkedAsset} onChange={(v) => updLoan(i, "linkedAsset", v)} options={allAssets} />
          </div>

          {/* Ownership split — only for joint loans */}
          {loan.owner === "joint" && isCouple && (
            <div style={{ padding: "10px 12px", background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}30`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                Ownership Split {loan.deductible ? "— affects deductible interest per person" : ""}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                <Input label={`${n1} share`} value={loan.p1Pct ?? 50} onChange={(v) => { const p1 = Math.min(100, Math.max(0, Number(v))); updLoan(i, "p1Pct", p1); updLoan(i, "p2Pct", 100 - p1); }} suffix="%" />
                <Input label={`${n2} share`} value={loan.p2Pct ?? 50} onChange={(v) => { const p2 = Math.min(100, Math.max(0, Number(v))); updLoan(i, "p2Pct", p2); updLoan(i, "p1Pct", 100 - p2); }} suffix="%" />
              </div>
              {loan.deductible && loan.balance > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, color: COLORS.textDim, fontFamily: "'DM Sans', sans-serif" }}>
                  Deductible interest split: {n1} deducts {fmt(Math.round((loanData[i]?.interest || 0) * (loan.p1Pct ?? 50) / 100))}/yr, {n2} deducts {fmt(Math.round((loanData[i]?.interest || 0) * (loan.p2Pct ?? 50) / 100))}/yr
                </div>
              )}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: 6 }}>Tax Deductibility</label>
            <div className="flex gap-2">
              <Btn small active={!loan.deductible} onClick={() => updLoan(i, "deductible", false)} color={COLORS.red}>
                Non-Deductible
              </Btn>
              <Btn small active={loan.deductible} onClick={() => updLoan(i, "deductible", true)} color={COLORS.green}>
                Tax Deductible
              </Btn>
            </div>
          </div>

          {loan.balance > 0 && (
            <div style={{ padding: 12, background: COLORS.infoBg || "#ece8e1", borderRadius: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 , alignItems: "end" }}>
                <div><span style={{ color: COLORS.textDim, fontSize: 10 }}>Paid Off</span><div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{loan.repaymentType === "io" ? "Never (IO)" : `${monthNames[payoffDate.getMonth()]} ${payoffDate.getFullYear()}`}</div></div>
                <div><span style={{ color: COLORS.textDim, fontSize: 10 }}>Total Interest</span><div style={{ color: COLORS.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{fmt(payoff.totalInterest)}</div></div>
                <div><span style={{ color: COLORS.textDim, fontSize: 10 }}>Total Cost</span><div style={{ color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{fmt(payoff.totalPaid)}</div></div>
              </div>

              {loan.repaymentType !== "io" && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 6, fontWeight: 600 }}>Payment Frequency Comparison</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 , alignItems: "end" }}>
                  {comparisons.map(c => {
                    const timeSaved = basePf ? basePf.payoffMonth - c.payoffMonth : 0;
                    const intSaved = basePf ? basePf.totalInterest - c.totalInterest : 0;
                    const isActive = c.freq === loan.frequency;
                    return (
                      <button key={c.freq} onClick={() => updLoan(i, "frequency", c.freq)} style={{
                        background: isActive ? COLORS.accent : COLORS.card, border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                        borderRadius: 6, padding: 8, cursor: "pointer", textAlign: "left",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? "#fff" : COLORS.text, textTransform: "capitalize", marginBottom: 2 }}>{c.freq}</div>
                        <div style={{ fontSize: 10, color: isActive ? "#ffffffcc" : COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(Math.round(c.perPeriodPmt))}</div>
                        <div style={{ fontSize: 9, color: isActive ? "#ffffffcc" : COLORS.textDim, marginTop: 2 }}>{Math.floor(c.payoffMonth/12)}y {c.payoffMonth%12}m</div>
                        {timeSaved > 0 && <div style={{ fontSize: 9, color: isActive ? "#ffffffcc" : COLORS.green, marginTop: 2, fontWeight: 600 }}>Save {Math.floor(timeSaved/12)}y {timeSaved%12}m</div>}
                        {intSaved > 0 && <div style={{ fontSize: 9, color: isActive ? "#ffffffcc" : COLORS.green, fontWeight: 600 }}>Save {fmt(Math.round(intSaved))}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          )}
        </Card>
        );
      })}

      <Btn onClick={addLoan} color={COLORS.accent}>+ Add Loan</Btn>
    </div>
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
